# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for Interactive Agent Lambda Handler
"""

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from index import (
    handler,
    handle_connect,
    handle_disconnect,
    handle_message,
    SessionManager,
    ContextManager,
    send_to_connection,
    load_system_prompt
)


# Fixtures

@pytest.fixture
def mock_s3_client():
    """Mock S3 client"""
    with patch('index.s3_client') as mock:
        yield mock


@pytest.fixture
def mock_apigateway_client():
    """Mock API Gateway Management API client"""
    with patch('index.apigateway_client') as mock:
        yield mock


@pytest.fixture
def connect_event():
    """Sample $connect event"""
    return {
        'requestContext': {
            'routeKey': '$connect',
            'connectionId': 'test-connection-123',
            'requestTimeEpoch': 1234567890,
            'authorizer': {
                'principalId': 'user-123'
            }
        }
    }


@pytest.fixture
def disconnect_event():
    """Sample $disconnect event"""
    return {
        'requestContext': {
            'routeKey': '$disconnect',
            'connectionId': 'test-connection-123',
            'authorizer': {
                'principalId': 'user-123'
            }
        }
    }


@pytest.fixture
def message_event():
    """Sample message event"""
    return {
        'requestContext': {
            'routeKey': '$default',
            'connectionId': 'test-connection-123',
            'domainName': 'test.execute-api.us-east-1.amazonaws.com',
            'stage': 'prod',
            'authorizer': {
                'principalId': 'user-123'
            }
        },
        'body': json.dumps({
            'message': 'Hello, agent!'
        })
    }


@pytest.fixture
def lambda_context():
    """Mock Lambda context"""
    context = Mock()
    context.function_name = 'test-function'
    context.memory_limit_in_mb = 1024
    context.invoked_function_arn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
    return context


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
        prompt = load_system_prompt()
    
    assert prompt == 'You are a helpful assistant.'
    mock_s3_client.get_object.assert_called_once_with(
        Bucket='test-bucket',
        Key='prompts/system.txt'
    )


def test_load_system_prompt_missing_config():
    """Test system prompt loading with missing configuration"""
    with patch.dict('os.environ', {}, clear=True):
        prompt = load_system_prompt()
    
    assert prompt == "You are a helpful AI assistant."


def test_load_system_prompt_s3_error(mock_s3_client):
    """Test system prompt loading with S3 error"""
    mock_s3_client.get_object.side_effect = Exception('S3 error')
    
    with patch.dict('os.environ', {
        'SYSTEM_PROMPT_S3_BUCKET_NAME': 'test-bucket',
        'SYSTEM_PROMPT_S3_KEY': 'prompts/system.txt'
    }):
        prompt = load_system_prompt()
    
    assert prompt == "You are a helpful AI assistant."


# Tests for SessionManager

def test_session_manager_disabled():
    """Test SessionManager with no bucket (disabled)"""
    manager = SessionManager(bucket=None)
    
    assert not manager.enabled
    assert manager.get_session('conn-123', 'user-123') == {'messages': [], 'metadata': {}}


def test_session_manager_get_session_success(mock_s3_client):
    """Test successful session retrieval"""
    session_data = {
        'messages': [{'role': 'user', 'content': 'Hello'}],
        'metadata': {'user_id': 'user-123'}
    }
    mock_s3_client.get_object.return_value = {
        'Body': Mock(read=Mock(return_value=json.dumps(session_data).encode('utf-8')))
    }
    
    manager = SessionManager(bucket='test-bucket')
    result = manager.get_session('conn-123', 'user-123')
    
    assert result == session_data
    mock_s3_client.get_object.assert_called_once_with(
        Bucket='test-bucket',
        Key='sessions/user-123/conn-123.json'
    )


def test_session_manager_get_session_not_found(mock_s3_client):
    """Test session retrieval when session doesn't exist"""
    mock_s3_client.get_object.side_effect = mock_s3_client.exceptions.NoSuchKey('Not found')
    mock_s3_client.exceptions = type('Exceptions', (), {'NoSuchKey': Exception})()
    
    manager = SessionManager(bucket='test-bucket')
    result = manager.get_session('conn-123', 'user-123')
    
    assert result == {'messages': [], 'metadata': {}}


def test_session_manager_save_session(mock_s3_client):
    """Test session saving"""
    session_data = {
        'messages': [{'role': 'user', 'content': 'Hello'}],
        'metadata': {'user_id': 'user-123'}
    }
    
    manager = SessionManager(bucket='test-bucket')
    manager.save_session('conn-123', 'user-123', session_data)
    
    mock_s3_client.put_object.assert_called_once()
    call_args = mock_s3_client.put_object.call_args
    assert call_args[1]['Bucket'] == 'test-bucket'
    assert call_args[1]['Key'] == 'sessions/user-123/conn-123.json'
    assert json.loads(call_args[1]['Body']) == session_data


def test_session_manager_delete_session(mock_s3_client):
    """Test session deletion"""
    manager = SessionManager(bucket='test-bucket')
    manager.delete_session('conn-123', 'user-123')
    
    mock_s3_client.delete_object.assert_called_once_with(
        Bucket='test-bucket',
        Key='sessions/user-123/conn-123.json'
    )


# Tests for ContextManager

def test_context_manager_disabled():
    """Test ContextManager with context disabled"""
    with patch.dict('os.environ', {'CONTEXT_ENABLED': 'false'}):
        manager = ContextManager()
    
    messages = [{'role': 'user', 'content': 'Hello'}]
    assert manager.get_context(messages) == []
    assert manager.add_message(messages, 'assistant', 'Hi') == messages


def test_context_manager_sliding_window():
    """Test SlidingWindow context strategy"""
    manager = ContextManager(strategy='SlidingWindow', window_size=3)
    
    messages = [
        {'role': 'user', 'content': 'Message 1'},
        {'role': 'assistant', 'content': 'Response 1'},
        {'role': 'user', 'content': 'Message 2'},
        {'role': 'assistant', 'content': 'Response 2'},
        {'role': 'user', 'content': 'Message 3'},
    ]
    
    context = manager.get_context(messages)
    assert len(context) == 3
    assert context[0]['content'] == 'Message 2'


def test_context_manager_null_strategy():
    """Test Null context strategy"""
    manager = ContextManager(strategy='Null')
    
    messages = [{'role': 'user', 'content': 'Hello'}]
    assert manager.get_context(messages) == []


def test_context_manager_add_message():
    """Test adding message to context"""
    manager = ContextManager()
    
    messages = []
    messages = manager.add_message(messages, 'user', 'Hello')
    messages = manager.add_message(messages, 'assistant', 'Hi there!')
    
    assert len(messages) == 2
    assert messages[0] == {'role': 'user', 'content': 'Hello'}
    assert messages[1] == {'role': 'assistant', 'content': 'Hi there!'}


# Tests for send_to_connection

def test_send_to_connection_success():
    """Test successful message sending"""
    mock_client = Mock()
    
    with patch('boto3.client', return_value=mock_client):
        send_to_connection(
            'https://test.execute-api.us-east-1.amazonaws.com/prod',
            'conn-123',
            {'type': 'chunk', 'content': 'Hello'}
        )
    
    mock_client.post_to_connection.assert_called_once()
    call_args = mock_client.post_to_connection.call_args
    assert call_args[1]['ConnectionId'] == 'conn-123'
    assert json.loads(call_args[1]['Data']) == {'type': 'chunk', 'content': 'Hello'}


def test_send_to_connection_gone():
    """Test sending to gone connection"""
    mock_client = Mock()
    mock_client.post_to_connection.side_effect = mock_client.exceptions.GoneException('Gone')
    mock_client.exceptions = type('Exceptions', (), {'GoneException': Exception})()
    
    with patch('boto3.client', return_value=mock_client):
        # Should not raise exception
        send_to_connection(
            'https://test.execute-api.us-east-1.amazonaws.com/prod',
            'conn-123',
            {'type': 'chunk', 'content': 'Hello'}
        )


# Tests for handle_connect

def test_handle_connect_success(connect_event, mock_s3_client):
    """Test successful connection handling"""
    with patch.dict('os.environ', {'AUTH_TYPE': 'Cognito', 'SESSION_BUCKET': 'test-bucket'}):
        response = handle_connect(connect_event)
    
    assert response['statusCode'] == 200
    assert 'Connected' in response['body']
    mock_s3_client.put_object.assert_called_once()


def test_handle_connect_anonymous(connect_event, mock_s3_client):
    """Test connection handling without authentication"""
    event = connect_event.copy()
    del event['requestContext']['authorizer']
    
    with patch.dict('os.environ', {'AUTH_TYPE': 'None', 'SESSION_BUCKET': 'test-bucket'}):
        response = handle_connect(event)
    
    assert response['statusCode'] == 200


# Tests for handle_disconnect

def test_handle_disconnect_success(disconnect_event, mock_s3_client):
    """Test successful disconnection handling"""
    with patch.dict('os.environ', {'AUTH_TYPE': 'Cognito', 'SESSION_BUCKET': 'test-bucket'}):
        response = handle_disconnect(disconnect_event)
    
    assert response['statusCode'] == 200
    assert 'Disconnected' in response['body']
    mock_s3_client.delete_object.assert_called_once()


# Tests for handle_message

@pytest.mark.asyncio
async def test_handle_message_success(message_event, mock_s3_client):
    """Test successful message handling with BidiAgent"""
    # Mock session data
    mock_s3_client.get_object.return_value = {
        'Body': Mock(read=Mock(return_value=json.dumps({
            'messages': [],
            'metadata': {'user_id': 'user-123'}
        }).encode('utf-8')))
    }
    
    # Mock BidiAgent
    mock_agent = AsyncMock()
    mock_chunks = [
        {'content': 'Hello '},
        {'content': 'there! '},
        {'content': 'How can I help?'}
    ]
    
    async def mock_stream(*args, **kwargs):
        for chunk in mock_chunks:
            yield chunk
    
    mock_agent.stream = mock_stream
    
    # Mock send_to_connection
    with patch('index.BidiAgent', return_value=mock_agent), \
         patch('index.send_to_connection') as mock_send, \
         patch.dict('os.environ', {
             'SESSION_BUCKET': 'test-bucket',
             'CONTEXT_ENABLED': 'true',
             'AUTH_TYPE': 'Cognito'
         }):
        
        response = await handle_message(message_event)
    
    assert response['statusCode'] == 200
    assert 'Message processed' in response['body']
    
    # Verify chunks were sent
    assert mock_send.call_count >= 3  # At least 3 chunks + complete message
    
    # Verify session was saved
    mock_s3_client.put_object.assert_called_once()


@pytest.mark.asyncio
async def test_handle_message_invalid_json(message_event):
    """Test message handling with invalid JSON"""
    event = message_event.copy()
    event['body'] = 'invalid json'
    
    with patch('index.send_to_connection') as mock_send:
        response = await handle_message(event)
    
    assert response['statusCode'] == 400
    assert 'Invalid JSON' in response['body']
    
    # Verify error was sent to client
    mock_send.assert_called_once()
    call_args = mock_send.call_args[0]
    assert call_args[2]['type'] == 'error'


@pytest.mark.asyncio
async def test_handle_message_empty_message(message_event):
    """Test message handling with empty message"""
    event = message_event.copy()
    event['body'] = json.dumps({'message': ''})
    
    with patch('index.send_to_connection') as mock_send:
        response = await handle_message(event)
    
    assert response['statusCode'] == 400
    assert 'Message is required' in response['body']


@pytest.mark.asyncio
async def test_handle_message_agent_error(message_event, mock_s3_client):
    """Test message handling with agent error"""
    # Mock session data
    mock_s3_client.get_object.return_value = {
        'Body': Mock(read=Mock(return_value=json.dumps({
            'messages': [],
            'metadata': {'user_id': 'user-123'}
        }).encode('utf-8')))
    }
    
    # Mock BidiAgent to raise error
    mock_agent = AsyncMock()
    mock_agent.stream.side_effect = Exception('Agent error')
    
    with patch('index.BidiAgent', return_value=mock_agent), \
         patch('index.send_to_connection') as mock_send, \
         patch.dict('os.environ', {
             'SESSION_BUCKET': 'test-bucket',
             'CONTEXT_ENABLED': 'true',
             'AUTH_TYPE': 'Cognito'
         }):
        
        response = await handle_message(message_event)
    
    assert response['statusCode'] == 500
    assert 'Failed to process message' in response['body']
    
    # Verify error was sent to client
    error_calls = [call for call in mock_send.call_args_list 
                   if call[0][2].get('type') == 'error']
    assert len(error_calls) > 0


# Tests for main handler

def test_handler_connect_route(connect_event, lambda_context, mock_s3_client):
    """Test handler routing for $connect"""
    with patch.dict('os.environ', {'SESSION_BUCKET': 'test-bucket'}):
        response = handler(connect_event, lambda_context)
    
    assert response['statusCode'] == 200


def test_handler_disconnect_route(disconnect_event, lambda_context, mock_s3_client):
    """Test handler routing for $disconnect"""
    with patch.dict('os.environ', {'SESSION_BUCKET': 'test-bucket'}):
        response = handler(disconnect_event, lambda_context)
    
    assert response['statusCode'] == 200


def test_handler_message_route(message_event, lambda_context, mock_s3_client):
    """Test handler routing for message"""
    # Mock session data
    mock_s3_client.get_object.return_value = {
        'Body': Mock(read=Mock(return_value=json.dumps({
            'messages': [],
            'metadata': {'user_id': 'user-123'}
        }).encode('utf-8')))
    }
    
    # Mock BidiAgent
    mock_agent = AsyncMock()
    
    async def mock_stream(*args, **kwargs):
        yield {'content': 'Hello'}
    
    mock_agent.stream = mock_stream
    
    with patch('index.BidiAgent', return_value=mock_agent), \
         patch('index.send_to_connection'), \
         patch.dict('os.environ', {
             'SESSION_BUCKET': 'test-bucket',
             'CONTEXT_ENABLED': 'true',
             'AUTH_TYPE': 'Cognito'
         }):
        
        response = handler(message_event, lambda_context)
    
    assert response['statusCode'] == 200


def test_handler_unknown_route(lambda_context):
    """Test handler with unknown route"""
    event = {
        'requestContext': {
            'routeKey': 'unknown',
            'connectionId': 'test-connection-123'
        }
    }
    
    response = handler(event, lambda_context)
    
    assert response['statusCode'] == 400
    assert 'Unknown route' in response['body']
