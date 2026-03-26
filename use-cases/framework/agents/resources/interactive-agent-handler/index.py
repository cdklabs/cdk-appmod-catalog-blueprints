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
import importlib
import sys
import tempfile
import zipfile
import base64
import asyncio
import contextvars
import time
import boto3
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

from strands import Agent
from strands.models import BedrockModel
from strands.agent.conversation_manager import SlidingWindowConversationManager
from strands.session.s3_session_manager import S3SessionManager as StrandsS3SessionManager
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Initialize observability
logger = Logger()
tracer = Tracer()
metrics = Metrics()

# =============================================================================
# SSE Event Queue for Tool-to-Handler Communication
# =============================================================================
# Context variable to hold an async queue for SSE events emitted by tools.
# This allows tools (like execute_script) to push events (schema, preview)
# directly into the SSE stream without relying on Strands' event types.
_sse_queue: contextvars.ContextVar[asyncio.Queue] = contextvars.ContextVar('sse_queue')


def emit_sse_event(event_type: str, data: dict) -> None:
    """
    Emit an SSE event from a tool function.

    This function is safe to call from any tool — it will silently do nothing
    if called outside of an SSE streaming context.

    Args:
        event_type: The SSE event type (e.g., 'schema', 'preview', 'download')
        data: The data payload to send with the event
    """
    try:
        queue = _sse_queue.get()
        queue.put_nowait({'event': event_type, 'data': data})
    except LookupError:
        # Not in SSE context (e.g., during testing), silently ignore
        pass

# Load configuration from environment variables
MODEL_ID = os.getenv('MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
SYSTEM_PROMPT_BUCKET = os.getenv('SYSTEM_PROMPT_S3_BUCKET_NAME')
SYSTEM_PROMPT_KEY = os.getenv('SYSTEM_PROMPT_S3_KEY')
TOOLS_CONFIG = os.getenv('TOOLS_CONFIG', '[]')
KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION = os.getenv('KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION', '')
SESSION_BUCKET = os.getenv('SESSION_BUCKET')
SESSION_LOCK_TABLE = os.getenv('SESSION_LOCK_TABLE')
SESSION_INDEX_TABLE = os.environ.get('SESSION_INDEX_TABLE', '')


def validate_and_repair_session(session_id: str, bucket: str) -> bool:
    """
    Validate session history for corrupted toolUse/toolResult pairs.

    If corruption is detected (orphaned toolUse without matching toolResult),
    the entire session is deleted to allow a fresh start.

    Args:
        session_id: The session ID to validate
        bucket: S3 bucket containing session data

    Returns:
        True if session is valid or was repaired, False if session was deleted
    """
    try:
        # List all message files for this session
        prefix = f'/session_{session_id}/agents/agent_default/messages/'
        paginator = s3_client.get_paginator('list_objects_v2')

        messages = []
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get('Contents', []):
                if 'message_' in obj['Key'] and obj['Key'].endswith('.json'):
                    try:
                        response = s3_client.get_object(Bucket=bucket, Key=obj['Key'])
                        msg_data = json.loads(response['Body'].read().decode('utf-8'))
                        # Extract message index from filename
                        filename = obj['Key'].split('/')[-1]
                        msg_index = int(filename.replace('message_', '').replace('.json', ''))
                        messages.append((msg_index, msg_data))
                    except Exception as e:
                        logger.warning(f'Failed to read message file {obj["Key"]}: {e}')

        if not messages:
            # No messages yet, session is valid
            return True

        # Sort by message index
        messages.sort(key=lambda x: x[0])

        # Track pending toolUse IDs that need matching toolResult
        pending_tool_uses = set()

        for msg_index, msg_data in messages:
            message = msg_data.get('message', {})
            content_list = message.get('content', [])

            if isinstance(content_list, str):
                # Simple text message, no tools
                continue

            for content in content_list:
                if isinstance(content, dict):
                    # Check for toolUse
                    if 'toolUse' in content:
                        tool_use_id = content['toolUse'].get('toolUseId')
                        if tool_use_id:
                            pending_tool_uses.add(tool_use_id)

                    # Check for toolResult
                    if 'toolResult' in content:
                        tool_use_id = content['toolResult'].get('toolUseId')
                        if tool_use_id:
                            pending_tool_uses.discard(tool_use_id)

        if pending_tool_uses:
            # Session is corrupted - has toolUse without matching toolResult
            logger.warning(
                f'Session {session_id} is corrupted: {len(pending_tool_uses)} orphaned toolUse IDs. '
                f'Deleting session to allow fresh start.'
            )

            # Delete all session files
            delete_prefix = f'/session_{session_id}/'
            objects_to_delete = []
            for page in paginator.paginate(Bucket=bucket, Prefix=delete_prefix):
                for obj in page.get('Contents', []):
                    objects_to_delete.append({'Key': obj['Key']})

            if objects_to_delete:
                # Delete in batches of 1000 (S3 limit)
                for i in range(0, len(objects_to_delete), 1000):
                    batch = objects_to_delete[i:i + 1000]
                    s3_client.delete_objects(Bucket=bucket, Delete={'Objects': batch})
                logger.info(f'Deleted {len(objects_to_delete)} files from corrupted session {session_id}')

            return False  # Session was deleted

        return True  # Session is valid

    except Exception as e:
        logger.warning(f'Session validation failed for {session_id}: {e}. Continuing anyway.')
        return True  # Don't block on validation errors


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


def update_session_index(user_id: str, session_id: str, last_message: str = ''):
    """Update or create session index record in DynamoDB."""
    if not SESSION_INDEX_TABLE or not user_id or not session_id:
        return

    try:
        from datetime import datetime, timezone
        table = dynamodb.Table(SESSION_INDEX_TABLE)
        now = datetime.now(timezone.utc).isoformat()

        # Use update with SET to create or update
        table.update_item(
            Key={'user_id': user_id, 'session_id': session_id},
            UpdateExpression='SET updated_at = :updated_at, last_message = :last_message, created_at = if_not_exists(created_at, :now)',
            ExpressionAttributeValues={
                ':updated_at': now,
                ':last_message': last_message[:100] if last_message else '',  # Truncate preview
                ':now': now,
            }
        )
        logger.info(f'Updated session index in DynamoDB for user={user_id[:8]}..., session={session_id}')
    except Exception as e:
        logger.warning(f'Error updating session index: {e}')


# Cold start: load system prompt and tools
SYSTEM_PROMPT = load_system_prompt()
if KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION:
    SYSTEM_PROMPT = SYSTEM_PROMPT + '\n\n' + KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION
AGENT_TOOLS = load_tools_from_s3()

# Session locks to prevent concurrent request processing for the same session.
# This prevents race conditions in Strands S3SessionManager that can corrupt
# conversation history when multiple requests for the same session overlap.
_session_locks: Dict[str, asyncio.Lock] = {}
_session_locks_lock = asyncio.Lock()


async def get_session_lock(session_id: str) -> asyncio.Lock:
    """Get or create a lock for a specific session."""
    async with _session_locks_lock:
        if session_id not in _session_locks:
            _session_locks[session_id] = asyncio.Lock()
        return _session_locks[session_id]


# FastAPI app
app = FastAPI()

# CORS middleware — required for Lambda proxy integration
# API Gateway CORS config only handles OPTIONS preflight;
# the actual response headers must come from the application.
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['GET', 'POST', 'OPTIONS'],
    allow_headers=['Content-Type', 'Authorization'],
)


class ChatRequest(BaseModel):
    """Chat request body."""
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None  # Fallback if JWT extraction fails


def extract_user_from_jwt(authorization: Optional[str]) -> Dict[str, str]:
    """
    Extract user information from JWT token.

    Decodes the JWT payload (without verification - API Gateway already verified).
    Returns dict with user_id (sub) and other claims.
    """
    if not authorization:
        return {}

    try:
        # Remove 'Bearer ' prefix if present
        token = authorization.replace('Bearer ', '').strip()
        if not token:
            return {}

        # JWT format: header.payload.signature
        parts = token.split('.')
        if len(parts) != 3:
            return {}

        # Decode payload (middle part) - add padding if needed
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding

        payload_json = base64.urlsafe_b64decode(payload_b64).decode('utf-8')
        payload = json.loads(payload_json)

        return {
            'user_id': payload.get('sub', ''),
            'username': payload.get('cognito:username', payload.get('username', '')),
            'email': payload.get('email', ''),
        }
    except Exception as e:
        logger.warning(f'Failed to extract user from JWT: {e}')
        return {}


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
async def chat(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """Handle chat request with SSE streaming response."""
    session_id = request.session_id or str(uuid.uuid4())
    user_message = request.message

    # Extract user information from JWT for multi-tenant support
    # Fall back to request body user_id if JWT extraction fails
    user_info = extract_user_from_jwt(authorization)
    user_id = user_info.get('user_id', '') or request.user_id or ''

    logger.info(f'Chat request: session={session_id}, user={user_id[:8] if user_id else "anonymous"}, message={user_message[:80]}...')
    metrics.add_metric(name='ChatRequests', unit=MetricUnit.Count, value=1)

    # Get session lock to prevent concurrent request processing.
    # This prevents race conditions that can corrupt conversation history
    # when users send rapid retries or multiple messages simultaneously.
    session_lock = await get_session_lock(session_id)

    async def generate_sse():
        # Send session metadata first (include user_id for frontend reference)
        yield format_sse(json.dumps({'session_id': session_id, 'user_id': user_id}), event='metadata')

        # Acquire distributed DynamoDB lock to prevent concurrent Lambda instances
        # from processing the same session. This complements the in-memory asyncio.Lock
        # which only works within a single Lambda instance.
        ddb_lock_acquired = False
        dynamodb_client = None
        if SESSION_LOCK_TABLE:
            try:
                dynamodb_client = boto3.client('dynamodb')
                now = int(time.time())
                ttl = now + 300  # 5 minute lock TTL (tool executions can take a while)

                dynamodb_client.put_item(
                    TableName=SESSION_LOCK_TABLE,
                    Item={
                        'session_id': {'S': session_id},
                        'locked_at': {'N': str(now)},
                        'ttl': {'N': str(ttl)}
                    },
                    ConditionExpression='attribute_not_exists(session_id) OR #ttl < :now',
                    ExpressionAttributeNames={'#ttl': 'ttl'},
                    ExpressionAttributeValues={':now': {'N': str(now)}}
                )
                ddb_lock_acquired = True
                logger.info(f'Acquired distributed lock for session {session_id}')
            except dynamodb_client.exceptions.ConditionalCheckFailedException:
                logger.warning(f'Failed to acquire distributed lock for session {session_id} - already locked')
                yield format_sse(json.dumps({
                    'error': 'Another request is already processing this session. Please wait and try again.'
                }), event='error')
                return
            except Exception as e:
                # Log but continue - fall back to in-memory lock only
                logger.warning(f'DynamoDB lock acquisition failed, continuing with in-memory lock only: {e}')

        full_response = ''

        # Set up SSE event queue for tool-to-handler communication.
        # Tools can call emit_sse_event() to push events into this queue,
        # and we'll yield them to the client during the streaming loop.
        sse_event_queue: asyncio.Queue = asyncio.Queue()
        _sse_queue.set(sse_event_queue)

        # Acquire session lock to serialize requests for this session.
        # This ensures conversation history remains consistent.
        async with session_lock:
            try:
                # Validate session before loading - detect and clear corrupted sessions
                # that have orphaned toolUse without matching toolResult
                session_was_reset = False
                if SESSION_BUCKET:
                    if not validate_and_repair_session(session_id, SESSION_BUCKET):
                        # Session was corrupted and deleted, notify user
                        session_was_reset = True
                        yield format_sse(json.dumps({
                            'text': '⚠️ Previous session was corrupted and has been reset. Starting fresh.\n\n'
                        }))

                # Create Strands-native session manager (handles load/save automatically)
                session_manager = None
                if SESSION_BUCKET:
                    session_manager = StrandsS3SessionManager(
                        session_id=session_id,
                        bucket=SESSION_BUCKET,
                    )

                # Write session index EARLY (before streaming) so session appears in list immediately
                # This prevents race conditions where user reloads before streaming completes
                if user_id:
                    update_session_index(user_id, session_id, user_message)

                # Create Strands-native conversation manager for context windowing
                conversation_manager = SlidingWindowConversationManager(window_size=20)

                # Create Bedrock model
                model = BedrockModel(model_id=MODEL_ID, streaming=True)

                # Set session_id as environment variable for tools to access
                # This ensures tools like execute_script can persist data even if
                # the AI forgets to pass session_id as a parameter
                os.environ['CURRENT_SESSION_ID'] = session_id
                os.environ['CURRENT_USER_ID'] = user_id

                # Build runtime system prompt with user context for tools like export_dataset
                runtime_system_prompt = SYSTEM_PROMPT
                if user_id or session_id:
                    runtime_system_prompt += f'\n\n# User Context\n- user_id: {user_id}\n- session_id: {session_id}\n'

                # Create agent with Strands-native session and conversation management.
                # Strands handles session persistence and context windowing automatically.
                # Disable the default callback handler so stream_async yields all events.
                agent = Agent(
                    model=model,
                    system_prompt=runtime_system_prompt,
                    tools=AGENT_TOOLS if AGENT_TOOLS else None,
                    session_manager=session_manager,
                    conversation_manager=conversation_manager,
                    callback_handler=None,
                )

                # Use stream_async for true token-by-token streaming.
                # Each event with a "data" key contains a text chunk from the model.
                # Tool results are emitted via the SSE event queue (contextvars).
                async for event in agent.stream_async(user_message):
                    # Debug: log event keys to understand what Strands emits
                    event_keys = list(event.keys()) if isinstance(event, dict) else ['non-dict']
                    if event_keys != ['data']:  # Don't spam logs with text chunks
                        logger.debug(f'Stream event keys: {event_keys}')

                    # Text chunk from model — stream it to the client immediately
                    if 'data' in event:
                        chunk = event['data']
                        full_response += chunk
                        yield format_sse(json.dumps({'text': chunk}))

                    # Drain the SSE event queue — tools push events here via emit_sse_event()
                    while not sse_event_queue.empty():
                        try:
                            queued_event = sse_event_queue.get_nowait()
                            event_type = queued_event.get('event', 'message')
                            event_data = queued_event.get('data', {})
                            logger.info(f'Emitting queued SSE event: {event_type}')
                            yield format_sse(json.dumps(event_data), event=event_type)
                        except asyncio.QueueEmpty:
                            break

                # After streaming completes, drain any remaining events from the queue
                while not sse_event_queue.empty():
                    try:
                        queued_event = sse_event_queue.get_nowait()
                        event_type = queued_event.get('event', 'message')
                        event_data = queued_event.get('data', {})
                        logger.info(f'Emitting final queued SSE event: {event_type}')
                        yield format_sse(json.dumps(event_data), event=event_type)
                    except asyncio.QueueEmpty:
                        break

                # Session is saved automatically by Strands S3SessionManager

                # Update session index with final timestamp (early write already created it)
                if user_id:
                    update_session_index(user_id, session_id, user_message)

                metrics.add_metric(name='ChatResponses', unit=MetricUnit.Count, value=1)

                # Send done event
                yield format_sse('{}', event='done')

            except Exception as e:
                logger.error(f'Error processing chat: {e}', exc_info=True)
                metrics.add_metric(name='ChatErrors', unit=MetricUnit.Count, value=1)
                yield format_sse(json.dumps({'error': 'An internal error occurred. Check logs for details.'}), event='error')

            finally:
                # Release the distributed DynamoDB lock
                if ddb_lock_acquired and SESSION_LOCK_TABLE and dynamodb_client:
                    try:
                        dynamodb_client.delete_item(
                            TableName=SESSION_LOCK_TABLE,
                            Key={'session_id': {'S': session_id}}
                        )
                        logger.info(f'Released distributed lock for session {session_id}')
                    except Exception as e:
                        # Log but don't fail - TTL will clean up eventually
                        logger.warning(f'Failed to release distributed lock for session {session_id}: {e}')

    return StreamingResponse(
        generate_sse(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )


def extract_text_content(content: Any) -> Optional[str]:
    """
    Extract text content from Strands message content format.

    Strands messages can have content as:
    - A plain string
    - A list of content blocks: [{"text": "..."}, {"toolUse": {...}}, {"toolResult": {...}}]

    This function extracts only the text portions, ignoring tool use/result blocks.

    Args:
        content: The content field from a Strands message

    Returns:
        Extracted text content or None if no text found
    """
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts = []
        for block in content:
            if isinstance(block, dict) and 'text' in block:
                text_parts.append(block['text'])
        return ''.join(text_parts) if text_parts else None

    return None


@app.get('/history/{session_id}')
async def get_history(session_id: str, authorization: Optional[str] = Header(None)):
    """
    Retrieve chat history for a session.

    Reads message files from S3 and returns them as a JSON array
    in chronological order. Only returns user and assistant messages
    with text content (tool interactions are filtered out).

    Args:
        session_id: The session ID to retrieve history for
        authorization: Bearer token for authentication

    Returns:
        JSON array of messages: [{role: "user"|"assistant", content: string}]
    """
    logger.info(f'History request: session={session_id}')

    if not SESSION_BUCKET:
        logger.warning('SESSION_BUCKET not configured, returning empty history')
        return JSONResponse(content=[], status_code=200)

    try:
        # List all message files for this session
        prefix = f'/session_{session_id}/agents/agent_default/messages/'
        paginator = s3_client.get_paginator('list_objects_v2')

        messages = []
        for page in paginator.paginate(Bucket=SESSION_BUCKET, Prefix=prefix):
            for obj in page.get('Contents', []):
                if 'message_' in obj['Key'] and obj['Key'].endswith('.json'):
                    try:
                        response = s3_client.get_object(Bucket=SESSION_BUCKET, Key=obj['Key'])
                        msg_data = json.loads(response['Body'].read().decode('utf-8'))

                        # Extract message index from filename for ordering
                        filename = obj['Key'].split('/')[-1]
                        msg_index = int(filename.replace('message_', '').replace('.json', ''))

                        # Extract the message content
                        message = msg_data.get('message', {})
                        role = message.get('role')
                        content = message.get('content')

                        # Only include user and assistant messages with text content
                        if role in ('user', 'assistant'):
                            text_content = extract_text_content(content)
                            if text_content:
                                messages.append((msg_index, {
                                    'role': role,
                                    'content': text_content
                                }))

                    except Exception as e:
                        logger.warning(f'Failed to read message file {obj["Key"]}: {e}')
                        continue

        # Sort by message index and extract just the messages
        messages.sort(key=lambda x: x[0])
        message_list = [msg for _, msg in messages]

        # Build response with messages
        result = {'messages': message_list}

        # Try to fetch metadata (schema/preview) if available
        metadata_key = f'session-metadata/{session_id}/latest_result.json'
        try:
            metadata_resp = s3_client.get_object(Bucket=SESSION_BUCKET, Key=metadata_key)
            metadata = json.loads(metadata_resp['Body'].read().decode('utf-8'))
            logger.info(f'Found metadata for session {session_id}')

            # Include schema, preview, totalRows, and downloads if present
            if 'schema' in metadata:
                result['schema'] = metadata['schema']
            if 'preview' in metadata:
                result['preview'] = metadata['preview']
            if 'totalRows' in metadata:
                result['totalRows'] = metadata['totalRows']
            if 'downloads' in metadata:
                result['downloads'] = metadata['downloads']

        except s3_client.exceptions.NoSuchKey:
            logger.debug(f'No metadata found for session {session_id}')
        except Exception as e:
            logger.warning(f'Error fetching metadata for session {session_id}: {e}')

        logger.info(f'History request complete: session={session_id}, messages={len(message_list)}')
        return JSONResponse(content=result, status_code=200)

    except Exception as e:
        logger.error(f'Error retrieving history for session {session_id}: {e}', exc_info=True)
        # Return empty array on error for graceful handling
        return JSONResponse(content=[], status_code=200)


@app.get('/sessions')
async def list_sessions(authorization: Optional[str] = Header(None)):
    """
    List all sessions for the authenticated user.

    Queries session index from DynamoDB and returns them sorted by updated_at
    (newest first).

    Args:
        authorization: Bearer token for authentication

    Returns:
        JSON array of session metadata:
        [{"session_id": "...", "created_at": "...", "last_message": "...", "updated_at": "..."}]
    """
    user_info = extract_user_from_jwt(authorization)
    user_id = user_info.get('user_id', '')

    if not user_id:
        logger.info('List sessions request with no user_id, returning empty list')
        return []

    logger.info(f'List sessions request: user={user_id[:8]}...')

    if not SESSION_INDEX_TABLE:
        logger.warning('SESSION_INDEX_TABLE not configured, returning empty session list')
        return []

    try:
        # Query DynamoDB for all sessions belonging to this user
        table = dynamodb.Table(SESSION_INDEX_TABLE)
        response = table.query(
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )

        sessions = response.get('Items', [])

        # Sort by updated_at descending (newest first)
        sessions.sort(key=lambda x: x.get('updated_at', ''), reverse=True)

        logger.info(f'Returning {len(sessions)} sessions for user={user_id[:8]}...')
        return sessions

    except Exception as e:
        logger.error(f'Error listing sessions for user {user_id[:8]}...: {e}', exc_info=True)
        # Return empty array on error for graceful handling
        return []


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
