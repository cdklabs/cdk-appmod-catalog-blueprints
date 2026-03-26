# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Simple Lambda handler for /history and /sessions endpoints.
Does NOT use Lambda Web Adapter - returns proper API Gateway proxy responses.
"""

import os
import json
import boto3
from typing import Any

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
SESSION_BUCKET = os.environ.get('SESSION_BUCKET', '')
SESSION_INDEX_TABLE = os.environ.get('SESSION_INDEX_TABLE', '')


def lambda_handler(event: dict, context: Any) -> dict:
    """Main Lambda handler for API Gateway proxy integration."""
    path = event.get('path', '')
    http_method = event.get('httpMethod', '')

    # Extract user ID from Cognito authorizer
    user_id = None
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    user_id = claims.get('sub')

    print(f'Request: {http_method} {path}, user_id={user_id}')

    try:
        if path.startswith('/history/') and http_method == 'GET':
            session_id = path.split('/history/')[-1]
            return get_history(session_id)
        elif path == '/sessions' and http_method == 'GET':
            return get_sessions(user_id)
        elif path.startswith('/sessions/') and http_method == 'DELETE':
            session_id = path.split('/sessions/')[-1]
            return delete_session(session_id, user_id)
        elif path.startswith('/sessions/') and http_method == 'PATCH':
            session_id = path.split('/sessions/')[-1]
            body = json.loads(event.get('body', '{}'))
            return rename_session(session_id, user_id, body.get('name', ''))
        else:
            return response(404, {'error': 'Not found'})
    except Exception as e:
        print(f'Error: {e}')
        return response(500, {'error': str(e)})


def get_history(session_id: str) -> dict:
    """Retrieve chat history for a session from S3, including metadata if available."""
    if not SESSION_BUCKET:
        print('SESSION_BUCKET not configured')
        return response(200, {'messages': []})

    try:
        # Strands stores messages with LEADING SLASH: /session_{id}/...
        prefix = f'/session_{session_id}/agents/agent_default/messages/'
        print(f'Looking for messages with prefix: {prefix} in bucket: {SESSION_BUCKET}')
        paginator = s3_client.get_paginator('list_objects_v2')

        messages = []
        for page in paginator.paginate(Bucket=SESSION_BUCKET, Prefix=prefix):
            print(f'Page contents: {len(page.get("Contents", []))} objects')
            for obj in page.get('Contents', []):
                print(f'Found object: {obj["Key"]}')
                if 'message_' in obj['Key'] and obj['Key'].endswith('.json'):
                    try:
                        resp = s3_client.get_object(Bucket=SESSION_BUCKET, Key=obj['Key'])
                        msg_data = json.loads(resp['Body'].read().decode('utf-8'))

                        # Extract message index for ordering
                        filename = obj['Key'].split('/')[-1]
                        msg_index = int(filename.replace('message_', '').replace('.json', ''))

                        # Extract message content
                        message = msg_data.get('message', {})
                        role = message.get('role')
                        content = message.get('content')
                        created_at = msg_data.get('created_at')  # Timestamp from Strands

                        # Only include user/assistant messages with text
                        if role in ('user', 'assistant'):
                            text_content = extract_text_content(content)
                            if text_content:
                                msg_dict = {
                                    'role': role,
                                    'content': text_content
                                }
                                # Include timestamp if available
                                if created_at:
                                    msg_dict['timestamp'] = created_at
                                messages.append((msg_index, msg_dict))
                    except Exception as e:
                        print(f'Failed to read {obj["Key"]}: {e}')
                        continue

        # Sort by index and extract messages
        messages.sort(key=lambda x: x[0])
        message_list = [msg for _, msg in messages]
        print(f'History for {session_id}: {len(message_list)} messages')

        # Try to fetch metadata (schema/preview) if available
        metadata_key = f'session-metadata/{session_id}/latest_result.json'
        print(f'Checking for metadata at: {metadata_key}')

        result = {'messages': message_list}

        try:
            metadata_resp = s3_client.get_object(Bucket=SESSION_BUCKET, Key=metadata_key)
            metadata = json.loads(metadata_resp['Body'].read().decode('utf-8'))
            print(f'Found metadata for session {session_id}')

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
            print(f'No metadata found for session {session_id} (backwards compatible)')
        except Exception as e:
            print(f'Error fetching metadata: {e}')

        return response(200, result)

    except Exception as e:
        print(f'Error getting history: {e}')
        return response(200, {'messages': []})


def get_sessions(user_id: str) -> dict:
    """List all sessions for a user from DynamoDB index."""
    if not SESSION_INDEX_TABLE or not user_id:
        print(f'SESSION_INDEX_TABLE={SESSION_INDEX_TABLE}, user_id={user_id}')
        return response(200, [])

    try:
        table = dynamodb.Table(SESSION_INDEX_TABLE)

        # Query by user_id (partition key)
        result = table.query(
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id},
            ScanIndexForward=False  # Newest first by sort key
        )

        sessions = []
        for item in result.get('Items', []):
            session_data = {
                'session_id': item.get('session_id'),
                'created_at': item.get('created_at'),
                'updated_at': item.get('updated_at'),
                'last_message': item.get('last_message', ''),
            }
            # Include name if it exists
            if 'name' in item:
                session_data['name'] = item.get('name')
            sessions.append(session_data)

        # Sort by updated_at descending
        sessions.sort(key=lambda x: x.get('updated_at', ''), reverse=True)

        print(f'Sessions for {user_id}: {len(sessions)}')
        return response(200, sessions)

    except Exception as e:
        print(f'Error querying session index: {e}')
        return response(200, [])


def delete_session(session_id: str, user_id: str) -> dict:
    """Delete a session, its metadata, and its index from S3."""
    if not SESSION_BUCKET or not user_id or not session_id:
        print(f'Missing required parameters: SESSION_BUCKET={SESSION_BUCKET}, user_id={user_id}, session_id={session_id}')
        return response(400, {'error': 'Missing required parameters'})

    try:
        deleted_objects = []
        paginator = s3_client.get_paginator('list_objects_v2')

        # 1. Delete ALL session data: /session_{session_id}/ (entire Strands tree)
        session_prefix = f'/session_{session_id}/'
        print(f'Deleting session data with prefix: {session_prefix}')

        for page in paginator.paginate(Bucket=SESSION_BUCKET, Prefix=session_prefix):
            objects_to_delete = []
            for obj in page.get('Contents', []):
                objects_to_delete.append({'Key': obj['Key']})
                print(f'Marking for deletion: {obj["Key"]}')

            if objects_to_delete:
                delete_response = s3_client.delete_objects(
                    Bucket=SESSION_BUCKET,
                    Delete={'Objects': objects_to_delete}
                )
                deleted_objects.extend(delete_response.get('Deleted', []))
                if delete_response.get('Errors'):
                    print(f'Errors during deletion: {delete_response["Errors"]}')

        # 2. Delete session metadata: session-metadata/{session_id}/
        metadata_prefix = f'session-metadata/{session_id}/'
        print(f'Deleting session metadata with prefix: {metadata_prefix}')

        for page in paginator.paginate(Bucket=SESSION_BUCKET, Prefix=metadata_prefix):
            objects_to_delete = []
            for obj in page.get('Contents', []):
                objects_to_delete.append({'Key': obj['Key']})
                print(f'Marking metadata for deletion: {obj["Key"]}')

            if objects_to_delete:
                delete_response = s3_client.delete_objects(
                    Bucket=SESSION_BUCKET,
                    Delete={'Objects': objects_to_delete}
                )
                deleted_objects.extend(delete_response.get('Deleted', []))
                if delete_response.get('Errors'):
                    print(f'Errors during metadata deletion: {delete_response["Errors"]}')

        # 3. Delete session index from DynamoDB
        if SESSION_INDEX_TABLE:
            try:
                table = dynamodb.Table(SESSION_INDEX_TABLE)
                table.delete_item(Key={'user_id': user_id, 'session_id': session_id})
                print(f'Deleted session index record: {user_id}/{session_id}')
            except Exception as e:
                print(f'Error deleting session index from DynamoDB: {e}')

        print(f'Successfully deleted session {session_id}: {len(deleted_objects)} objects')
        return response(200, {
            'message': 'Session deleted successfully',
            'sessionId': session_id,
            'deletedObjects': len(deleted_objects)
        })

    except Exception as e:
        print(f'Error deleting session: {e}')
        return response(500, {'error': f'Failed to delete session: {str(e)}'})


def rename_session(session_id: str, user_id: str, name: str) -> dict:
    """Rename a session by updating its name in DynamoDB."""
    if not SESSION_INDEX_TABLE or not user_id or not session_id:
        print(f'Missing required parameters: SESSION_INDEX_TABLE={SESSION_INDEX_TABLE}, user_id={user_id}, session_id={session_id}')
        return response(400, {'error': 'Missing required parameters'})

    if not name or not name.strip():
        return response(400, {'error': 'Name cannot be empty'})

    # Limit name length
    name = name.strip()[:100]

    try:
        table = dynamodb.Table(SESSION_INDEX_TABLE)

        # Update the session name
        table.update_item(
            Key={'user_id': user_id, 'session_id': session_id},
            UpdateExpression='SET #name = :name',
            ExpressionAttributeNames={'#name': 'name'},
            ExpressionAttributeValues={':name': name},
            ConditionExpression='attribute_exists(user_id)'  # Ensure session exists and belongs to user
        )

        print(f'Successfully renamed session {session_id} to "{name}"')
        return response(200, {
            'message': 'Session renamed successfully',
            'sessionId': session_id,
            'name': name
        })

    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        print(f'Session not found or not owned by user: {session_id}')
        return response(404, {'error': 'Session not found'})
    except Exception as e:
        print(f'Error renaming session: {e}')
        return response(500, {'error': f'Failed to rename session: {str(e)}'})


def extract_text_content(content: Any) -> str | None:
    """Extract text from various content formats."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = []
        for block in content:
            if isinstance(block, dict):
                # Handle both formats: {"text": "..."} and {"type": "text", "text": "..."}
                if 'text' in block:
                    text_parts.append(block['text'])
        return ''.join(text_parts) if text_parts else None
    return None


def response(status_code: int, body: Any) -> dict:
    """Create API Gateway proxy response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,OPTIONS',
        },
        'body': json.dumps(body)
    }
