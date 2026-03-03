# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
AgentCore Runtime Handler for Strands Agent.

Uses the Bedrock AgentCore SDK to run as a managed container.
The SDK handles the HTTP server (port 8080), /invocations and /ping
endpoints, and SSE streaming.

Architecture:
    AgentCore Runtime → Container (port 8080) → AgentCore SDK → Strands Agent → Bedrock
"""

import os
import json
import uuid
import importlib
import sys
import tempfile
import zipfile
import base64
import logging
import traceback
import boto3
from opentelemetry import baggage
from opentelemetry import context as otel_context

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent
from strands.models import BedrockModel
from strands.agent.conversation_manager import SlidingWindowConversationManager
from strands.session.s3_session_manager import S3SessionManager as StrandsS3SessionManager

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

s3_client = boto3.client('s3')

# Configuration from environment variables
MODEL_ID = os.getenv('MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
SYSTEM_PROMPT_BUCKET = os.getenv('SYSTEM_PROMPT_S3_BUCKET_NAME')
SYSTEM_PROMPT_KEY = os.getenv('SYSTEM_PROMPT_S3_KEY')
TOOLS_CONFIG = os.getenv('TOOLS_CONFIG', '[]')
KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION = os.getenv('KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION', '')
SESSION_BUCKET = os.getenv('SESSION_BUCKET')


def load_system_prompt() -> str:
    """Load system prompt from S3 at cold start."""
    if not SYSTEM_PROMPT_BUCKET or not SYSTEM_PROMPT_KEY:
        return 'You are a helpful AI assistant.'

    try:
        response = s3_client.get_object(
            Bucket=SYSTEM_PROMPT_BUCKET,
            Key=SYSTEM_PROMPT_KEY
        )
        return response['Body'].read().decode('utf-8')
    except Exception as e:
        logger.error(f'Failed to load system prompt: {e}')
        return 'You are a helpful AI assistant.'


def load_tools_from_s3() -> list:
    """Load tool modules from S3 based on TOOLS_CONFIG env var."""
    tools = []
    try:
        tools_config = json.loads(TOOLS_CONFIG)
    except (json.JSONDecodeError, TypeError):
        logger.warning('Invalid TOOLS_CONFIG, no tools loaded')
        return tools

    for tool_def in tools_config:
        try:
            bucket_name = tool_def.get('bucketName')
            key = tool_def.get('key')
            is_zip = tool_def.get('isZipArchive', False)

            if not bucket_name or not key:
                continue

            tmp_dir = tempfile.mkdtemp()

            if is_zip:
                zip_path = os.path.join(tmp_dir, 'tools.zip')
                s3_client.download_file(bucket_name, key, zip_path)
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    zf.extractall(tmp_dir)
                os.remove(zip_path)
                sys.path.insert(0, tmp_dir)
                for fname in os.listdir(tmp_dir):
                    if fname.endswith('.py') and not fname.startswith('_'):
                        mod_name = fname[:-3]
                        mod = importlib.import_module(mod_name)
                        for attr_name in dir(mod):
                            attr = getattr(mod, attr_name)
                            if callable(attr) and hasattr(attr, '__wrapped__'):
                                tools.append(attr)
            else:
                file_path = os.path.join(tmp_dir, os.path.basename(key))
                s3_client.download_file(bucket_name, key, file_path)
                sys.path.insert(0, tmp_dir)
                mod_name = os.path.basename(key).replace('.py', '')
                mod = importlib.import_module(mod_name)
                for attr_name in dir(mod):
                    attr = getattr(mod, attr_name)
                    if callable(attr) and hasattr(attr, '__wrapped__'):
                        tools.append(attr)

        except Exception as e:
            logger.error(f'Failed to load tool from S3: {e}')
            continue

    logger.info(f'Loaded {len(tools)} tools from S3')
    return tools


def extract_user_id_from_headers(headers: dict) -> str | None:
    """Extract user sub from JWT Authorization header.

    AgentCore validates the JWT before forwarding the request,
    so we only need to decode the payload — no verification needed.
    """
    auth = headers.get('authorization', '')
    if not auth.lower().startswith('bearer '):
        return None
    token = auth[7:]
    try:
        payload_b64 = token.split('.')[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload.get('sub')
    except Exception:
        return None


# Cold start: load system prompt and tools
SYSTEM_PROMPT = load_system_prompt()
if KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION:
    SYSTEM_PROMPT = SYSTEM_PROMPT + '\n\n' + KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION
AGENT_TOOLS = load_tools_from_s3()

app = BedrockAgentCoreApp()


@app.entrypoint
async def handle_invocation(payload, context):
    """Handle agent invocation with streaming response.

    The SDK calls this for POST /invocations. Yielding dicts streams them
    as SSE events. The SDK handles serialization and transport.
    """
    user_message = payload.get('prompt') or payload.get('message', '')

    # Session ID from AgentCore header or generate new
    session_id = context.session_id or str(uuid.uuid4())

    # Propagate session ID in OTEL baggage so ADOT can correlate
    # traces/spans with the correct session in downstream headers.
    ctx = baggage.set_baggage('session.id', session_id)
    otel_context.attach(ctx)

    # Extract user identity from the raw Starlette request headers.
    # The SDK's context.request_headers may not include Authorization
    # (it extracts it into workload_access_token), so we read directly
    # from the underlying request object — same as the old FastAPI path.
    headers = dict(context.request.headers) if context.request else {}
    user_id = (
        headers.get('x-amzn-bedrock-agentcore-runtime-user-id')
        or extract_user_id_from_headers(headers)
    )

    logger.info('Invocation: session=%s, user=%s, message=%s...', session_id, user_id, user_message[:80])

    # Yield session metadata first so the frontend can track the session
    yield {'session_id': session_id}

    try:
        system_prompt = SYSTEM_PROMPT
        if user_id:
            system_prompt += (
                '\n\n## Authenticated User\n'
                f'The current authenticated user ID is: {user_id}\n'
                'Use this ID when looking up their transactions or other '
                'user specific information. Do not ask the user for their customer ID.'
            )

        session_manager = None
        if SESSION_BUCKET:
            session_manager = StrandsS3SessionManager(
                session_id=session_id,
                bucket=SESSION_BUCKET,
            )

        conversation_manager = SlidingWindowConversationManager(window_size=20)
        model = BedrockModel(model_id=MODEL_ID, streaming=True)

        agent = Agent(
            model=model,
            system_prompt=system_prompt,
            tools=AGENT_TOOLS if AGENT_TOOLS else None,
            session_manager=session_manager,
            conversation_manager=conversation_manager,
            callback_handler=None,
        )

        async for event in agent.stream_async(user_message):
            if 'data' in event:
                yield {'text': event['data']}

        yield {'done': True}

    except Exception as e:
        error_detail = f'{type(e).__name__}: {e}'
        logger.error('Error processing invocation: %s', error_detail)
        traceback.print_exc()
        yield {'error': error_detail}


if __name__ == '__main__':
    app.run()
