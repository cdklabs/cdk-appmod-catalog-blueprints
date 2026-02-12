# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Interactive Agent FastAPI Handler with SSE Streaming.

This handler runs as a FastAPI application behind Lambda Web Adapter,
providing real-time SSE streaming of Strands Agent responses over
API Gateway REST API with response streaming.

Architecture:
    Client → POST /chat → API Gateway (STREAM) → Lambda Web Adapter → FastAPI → Strands Agent → Bedrock
    Client ← SSE stream ← API Gateway ← Lambda response streaming ← FastAPI StreamingResponse
"""

import os
import json
import uuid
import time
import importlib
import sys
import tempfile
import zipfile
import boto3
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from strands import Agent
from strands.models import BedrockModel
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit

# Initialize AWS clients
s3_client = boto3.client('s3')

# Initialize observability
logger = Logger()
tracer = Tracer()
metrics = Metrics()

# Load configuration from environment variables
MODEL_ID = os.getenv('MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
SYSTEM_PROMPT_BUCKET = os.getenv('SYSTEM_PROMPT_S3_BUCKET_NAME')
SYSTEM_PROMPT_KEY = os.getenv('SYSTEM_PROMPT_S3_KEY')
TOOLS_CONFIG = os.getenv('TOOLS_CONFIG', '[]')
KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION = os.getenv('KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION', '')
SESSION_BUCKET = os.getenv('SESSION_BUCKET')
CONTEXT_ENABLED = os.getenv('CONTEXT_ENABLED', 'true').lower() == 'true'
CONTEXT_STRATEGY = os.getenv('CONTEXT_STRATEGY', 'SlidingWindow')
CONTEXT_WINDOW_SIZE = int(os.getenv('CONTEXT_WINDOW_SIZE', '20'))


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
                # Add extracted dir to path and import .py files
                sys.path.insert(0, tmp_dir)
                for fname in os.listdir(tmp_dir):
                    if fname.endswith('.py') and not fname.startswith('_'):
                        mod_name = fname[:-3]
                        mod = importlib.import_module(mod_name)
                        # Find @tool decorated functions
                        for attr_name in dir(mod):
                            attr = getattr(mod, attr_name)
                            if callable(attr) and hasattr(attr, '__wrapped__'):
                                tools.append(attr)
            else:
                # Single file
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


# Cold start: load system prompt and tools
SYSTEM_PROMPT = load_system_prompt()
if KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION:
    SYSTEM_PROMPT = SYSTEM_PROMPT + '\n\n' + KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION
AGENT_TOOLS = load_tools_from_s3()


class SessionManager:
    """Manages conversation sessions in S3."""

    def __init__(self, bucket: Optional[str] = None):
        self.bucket = bucket
        self.enabled = bucket is not None

    def get_session(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve message history from S3."""
        if not self.enabled:
            return []

        key = f'sessions/{session_id}.json'
        try:
            response = s3_client.get_object(Bucket=self.bucket, Key=key)
            data = json.loads(response['Body'].read().decode('utf-8'))
            return data.get('messages', [])
        except s3_client.exceptions.NoSuchKey:
            return []
        except Exception as e:
            logger.warning(f'Failed to load session {session_id}: {e}')
            return []

    def save_session(self, session_id: str, messages: List[Dict[str, Any]]) -> None:
        """Save message history to S3."""
        if not self.enabled:
            return

        key = f'sessions/{session_id}.json'
        data = {
            'session_id': session_id,
            'messages': messages,
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        }
        try:
            s3_client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=json.dumps(data),
                ContentType='application/json'
            )
        except Exception as e:
            logger.error(f'Failed to save session {session_id}: {e}')


class ContextManager:
    """Manages conversation context windowing."""

    def __init__(self, strategy: str = 'SlidingWindow', window_size: int = 20, enabled: bool = True):
        self.strategy = strategy
        self.window_size = window_size
        self.enabled = enabled

    def get_context(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply context windowing to message history."""
        if not self.enabled or self.strategy == 'Null':
            return []

        if self.strategy == 'SlidingWindow':
            return messages[-self.window_size:] if len(messages) > self.window_size else list(messages)

        return list(messages)


# Initialize managers
session_manager = SessionManager(SESSION_BUCKET)
context_manager = ContextManager(CONTEXT_STRATEGY, CONTEXT_WINDOW_SIZE, CONTEXT_ENABLED)

# FastAPI app
app = FastAPI()

# CORS middleware — required for Lambda proxy integration
# API Gateway CORS config only handles OPTIONS preflight;
# the actual response headers must come from the application.
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['POST', 'OPTIONS'],
    allow_headers=['Content-Type', 'Authorization'],
)


class ChatRequest(BaseModel):
    """Chat request body."""
    message: str
    session_id: Optional[str] = None


def format_sse(data: str, event: Optional[str] = None) -> str:
    """Format a Server-Sent Event string."""
    lines = []
    if event:
        lines.append(f'event: {event}')
    lines.append(f'data: {data}')
    lines.append('')
    lines.append('')
    return '\n'.join(lines)


@app.post('/chat')
async def chat(request: ChatRequest):
    """Handle chat request with SSE streaming response."""
    session_id = request.session_id or str(uuid.uuid4())
    user_message = request.message

    logger.info(f'Chat request: session={session_id}, message={user_message[:80]}...')
    metrics.add_metric(name='ChatRequests', unit=MetricUnit.Count, value=1)

    async def generate_sse():
        # Send session metadata first
        yield format_sse(json.dumps({'session_id': session_id}), event='metadata')

        full_response = ''
        try:
            # Load session history
            messages = session_manager.get_session(session_id)

            # Apply context windowing
            context = context_manager.get_context(messages)

            # Create Bedrock model
            model = BedrockModel(model_id=MODEL_ID, streaming=True)

            # Create agent with system prompt, tools, and conversation history.
            # Disable the default callback handler so stream_async yields all events.
            agent = Agent(
                model=model,
                system_prompt=SYSTEM_PROMPT,
                tools=AGENT_TOOLS if AGENT_TOOLS else None,
                messages=list(context) if context else None,
                callback_handler=None,
            )

            # Use stream_async for true token-by-token streaming.
            # Each event with a "data" key contains a text chunk from the model.
            result = None
            async for event in agent.stream_async(user_message):
                # Text chunk from model — stream it to the client immediately
                if 'data' in event:
                    chunk = event['data']
                    full_response += chunk
                    yield format_sse(json.dumps({'text': chunk}))

                # Capture the final result for session saving
                if 'result' in event:
                    result = event['result']

            # Save updated session with the agent's actual messages if available.
            # The agent maintains its own messages list during stream_async,
            # so we can use it directly for accurate conversation history.
            if hasattr(agent, 'messages') and agent.messages:
                session_manager.save_session(session_id, list(agent.messages))
            else:
                # Fallback: append manually
                messages.append({'role': 'user', 'content': [{'text': user_message}]})
                messages.append({'role': 'assistant', 'content': [{'text': full_response}]})
                session_manager.save_session(session_id, messages)

            metrics.add_metric(name='ChatResponses', unit=MetricUnit.Count, value=1)

            # Send done event
            yield format_sse('{}', event='done')

        except Exception as e:
            logger.error(f'Error processing chat: {e}', exc_info=True)
            metrics.add_metric(name='ChatErrors', unit=MetricUnit.Count, value=1)
            yield format_sse(json.dumps({'error': 'An internal error occurred. Check logs for details.'}), event='error')

    return StreamingResponse(
        generate_sse(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )


@app.get('/health')
async def health():
    """Health check endpoint for Lambda Web Adapter."""
    return {'status': 'ok'}


def handler(event, context):
    """
    Dummy handler for Lambda runtime compatibility.

    When using Lambda Web Adapter with run.sh as the handler,
    LWA starts uvicorn via run.sh and proxies requests to FastAPI.
    This function is not called in normal operation but exists
    as a fallback for the Lambda runtime.
    """
    return {'statusCode': 200, 'body': 'Lambda Web Adapter should handle this request'}


# For local development only
if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv('PORT', '8080')))
