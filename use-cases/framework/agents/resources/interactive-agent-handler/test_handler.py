# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for Interactive Agent FastAPI Handler with Strands-native session/context.
"""

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock, MagicMock


# Fixtures

@pytest.fixture
def mock_s3_client():
    """Mock S3 client"""
    with patch('index.s3_client') as mock:
        yield mock


# Tests for load_system_prompt

def test_load_system_prompt_success(mock_s3_client):
    """Test successful system prompt loading from S3"""
    mock_s3_client.get_object.return_value = {
        'Body': Mock(read=Mock(return_value=b'You are a helpful assistant.'))
    }

    with patch.dict('os.environ', {
        'SYSTEM_PROMPT_S3_BUCKET_NAME': 'test-bucket',
        'SYSTEM_PROMPT_S3_KEY': 'prompts/system.txt'
    }):
        from index import load_system_prompt
        prompt = load_system_prompt()

    assert prompt == 'You are a helpful assistant.'
    mock_s3_client.get_object.assert_called_once_with(
        Bucket='test-bucket',
        Key='prompts/system.txt'
    )


def test_load_system_prompt_missing_config():
    """Test system prompt loading with missing configuration"""
    with patch.dict('os.environ', {}, clear=True):
        from index import load_system_prompt
        prompt = load_system_prompt()

    assert prompt == "You are a helpful AI assistant."


def test_load_system_prompt_s3_error(mock_s3_client):
    """Test system prompt loading with S3 error"""
    mock_s3_client.get_object.side_effect = Exception('S3 error')

    with patch.dict('os.environ', {
        'SYSTEM_PROMPT_S3_BUCKET_NAME': 'test-bucket',
        'SYSTEM_PROMPT_S3_KEY': 'prompts/system.txt'
    }):
        from index import load_system_prompt
        prompt = load_system_prompt()

    assert prompt == "You are a helpful AI assistant."


# Tests for load_tools_from_s3

def test_load_tools_from_s3_empty_config():
    """Test tool loading with empty config"""
    from index import load_tools_from_s3
    with patch.dict('os.environ', {'TOOLS_CONFIG': '[]'}):
        tools = load_tools_from_s3()
    assert tools == []


def test_load_tools_from_s3_invalid_json():
    """Test tool loading with invalid JSON config"""
    from index import load_tools_from_s3
    with patch.dict('os.environ', {'TOOLS_CONFIG': 'invalid'}):
        tools = load_tools_from_s3()
    assert tools == []


# Tests for SSE formatting

def test_format_sse_data_only():
    """Test SSE formatting with data only"""
    from index import format_sse
    result = format_sse('{"text": "hello"}')
    assert result == 'data: {"text": "hello"}\n\n'


def test_format_sse_with_event():
    """Test SSE formatting with event type"""
    from index import format_sse
    result = format_sse('{}', event='done')
    assert result == 'event: done\ndata: {}\n\n'


# Tests for chat endpoint

@pytest.mark.asyncio
async def test_chat_creates_strands_session_manager():
    """Test that chat creates Strands S3SessionManager when SESSION_BUCKET is set"""
    from index import app
    from httpx import AsyncClient, ASGITransport

    mock_agent_instance = MagicMock()

    # Mock stream_async to yield chunks and then return
    async def mock_stream_async(msg):
        yield {'data': 'Hello!'}

    mock_agent_instance.stream_async = mock_stream_async

    with patch('index.SESSION_BUCKET', 'test-bucket'), \
         patch('index.StrandsS3SessionManager') as mock_session_cls, \
         patch('index.SlidingWindowConversationManager') as mock_conv_cls, \
         patch('index.Agent', return_value=mock_agent_instance) as mock_agent_cls:

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url='http://test') as client:
            response = await client.post('/chat', json={
                'message': 'Hello',
                'session_id': 'test-session-123',
            })

        assert response.status_code == 200

        # Verify Strands S3SessionManager was created with correct params
        mock_session_cls.assert_called_once_with(
            session_id='test-session-123',
            bucket_name='test-bucket',
        )

        # Verify SlidingWindowConversationManager was created
        mock_conv_cls.assert_called_once_with(window_size=20)

        # Verify Agent was created with session_manager and conversation_manager
        mock_agent_cls.assert_called_once()
        call_kwargs = mock_agent_cls.call_args[1]
        assert 'session_manager' in call_kwargs
        assert 'conversation_manager' in call_kwargs
        assert call_kwargs['callback_handler'] is None


@pytest.mark.asyncio
async def test_chat_no_session_bucket():
    """Test that chat works without SESSION_BUCKET (no session persistence)"""
    from index import app
    from httpx import AsyncClient, ASGITransport

    mock_agent_instance = MagicMock()

    async def mock_stream_async(msg):
        yield {'data': 'Hello!'}

    mock_agent_instance.stream_async = mock_stream_async

    with patch('index.SESSION_BUCKET', None), \
         patch('index.Agent', return_value=mock_agent_instance) as mock_agent_cls:

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url='http://test') as client:
            response = await client.post('/chat', json={
                'message': 'Hello',
            })

        assert response.status_code == 200

        # Agent should be called with session_manager=None
        call_kwargs = mock_agent_cls.call_args[1]
        assert call_kwargs['session_manager'] is None


@pytest.mark.asyncio
async def test_chat_generates_session_id():
    """Test that chat generates a session_id when none provided"""
    from index import app
    from httpx import AsyncClient, ASGITransport

    mock_agent_instance = MagicMock()

    async def mock_stream_async(msg):
        yield {'data': 'Hi'}

    mock_agent_instance.stream_async = mock_stream_async

    with patch('index.SESSION_BUCKET', None), \
         patch('index.Agent', return_value=mock_agent_instance):

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url='http://test') as client:
            response = await client.post('/chat', json={
                'message': 'Hello',
            })

        assert response.status_code == 200
        # Parse SSE events to find metadata with session_id
        lines = response.text.strip().split('\n')
        metadata_data = None
        for i, line in enumerate(lines):
            if line.startswith('event: metadata'):
                # Next non-empty line should be data:
                for j in range(i + 1, len(lines)):
                    if lines[j].startswith('data: '):
                        metadata_data = json.loads(lines[j][6:])
                        break
                break
        assert metadata_data is not None
        assert 'session_id' in metadata_data
        assert len(metadata_data['session_id']) > 0


@pytest.mark.asyncio
async def test_chat_streams_sse_events():
    """Test that chat streams SSE events correctly"""
    from index import app
    from httpx import AsyncClient, ASGITransport

    mock_agent_instance = MagicMock()

    async def mock_stream_async(msg):
        yield {'data': 'Hello '}
        yield {'data': 'world!'}

    mock_agent_instance.stream_async = mock_stream_async

    with patch('index.SESSION_BUCKET', None), \
         patch('index.Agent', return_value=mock_agent_instance):

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url='http://test') as client:
            response = await client.post('/chat', json={
                'message': 'Hello',
                'session_id': 'test-session',
            })

        assert response.status_code == 200
        body = response.text

        # Should contain metadata, text chunks, and done events
        assert 'event: metadata' in body
        assert '"text": "Hello "' in body
        assert '"text": "world!"' in body
        assert 'event: done' in body


@pytest.mark.asyncio
async def test_chat_handles_agent_error():
    """Test that chat handles agent errors gracefully"""
    from index import app
    from httpx import AsyncClient, ASGITransport

    mock_agent_instance = MagicMock()

    async def mock_stream_async(msg):
        raise Exception('Agent error')
        yield  # Make it an async generator

    mock_agent_instance.stream_async = mock_stream_async

    with patch('index.SESSION_BUCKET', None), \
         patch('index.Agent', return_value=mock_agent_instance):

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url='http://test') as client:
            response = await client.post('/chat', json={
                'message': 'Hello',
                'session_id': 'test-session',
            })

        assert response.status_code == 200
        body = response.text
        assert 'event: error' in body
        assert 'internal error' in body.lower() or 'error' in body.lower()


# Tests for health endpoint

@pytest.mark.asyncio
async def test_health_endpoint():
    """Test health check endpoint"""
    from index import app
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        response = await client.get('/health')

    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


# Tests for handler function (Lambda compatibility)

def test_handler_returns_200():
    """Test Lambda handler fallback"""
    from index import handler
    result = handler({}, None)
    assert result['statusCode'] == 200
