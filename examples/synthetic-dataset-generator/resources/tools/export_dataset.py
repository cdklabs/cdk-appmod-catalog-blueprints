"""
Export Dataset Tool - Exports full datasets to S3 and generates presigned download URLs.

This tool is called by InteractiveAgent when a user wants to export their complete
dataset. It invokes the export Lambda to generate the full dataset, then creates
presigned URLs for secure downloads.

Security: Uses presigned URLs with 24-hour expiry. Multi-tenant isolation is
enforced via the user_id prefix in S3 paths - users only receive URLs for their
own exports.
"""
from strands import tool
from typing import Dict, Any
import boto3
import json
import os
import uuid

# Initialize clients outside handler for connection reuse
lambda_client = boto3.client('lambda')
s3_client = boto3.client('s3')

# Presigned URL expiry time (24 hours in seconds)
PRESIGNED_URL_EXPIRY = 86400


def generate_presigned_url(bucket: str, key: str) -> str:
    """
    Generate a presigned URL for secure S3 object download.

    Args:
        bucket: S3 bucket name
        key: S3 object key

    Returns:
        Presigned URL string with 24-hour expiry
    """
    return s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': key},
        ExpiresIn=PRESIGNED_URL_EXPIRY
    )


@tool
def export_dataset(script: str, row_count: int = 10000, user_id: str = "", session_id: str = "") -> Dict[str, Any]:
    """
    Export a complete dataset to S3 and return presigned download URLs.

    This tool generates a full dataset from a validated DataGenerator script,
    uploads it to S3 in multiple formats (CSV, JSON, schema, script), and
    returns presigned URLs for secure downloads.

    Args:
        script: Python code containing a DataGenerator class with generate() method.
                This should be a validated script from a previous execute_script call.
        row_count: Number of rows to generate in the full dataset. Default is 10,000.
                   Larger datasets (e.g., 100,000) are supported but take longer.
        user_id: Cognito user sub for multi-tenant folder isolation. This is the
                 authenticated user's ID passed from the agent context.
        session_id: Optional session identifier for organizing exports. If not
                    provided, a short UUID will be generated.

    Returns:
        Dictionary containing:
        - success: Boolean indicating if export succeeded
        - downloads: Dict with presigned URLs for each file format (if success):
            - csv: URL for CSV data file
            - json: URL for JSON data file
            - schema: URL for schema definition file
            - script: URL for the Python script file
        - row_count: Number of rows generated (if success)
        - summary: User-friendly message about the export (if success)
        - error: Error message (if not success)
        - recoverable: Boolean indicating if user can retry (if not success)

    Example response on success:
        {
            'success': True,
            'downloads': {
                'csv': 'https://bucket.s3.amazonaws.com/exports/.../data.csv?...',
                'json': 'https://bucket.s3.amazonaws.com/exports/.../data.json?...',
                'schema': 'https://bucket.s3.amazonaws.com/exports/.../schema.json?...',
                'script': 'https://bucket.s3.amazonaws.com/exports/.../script.py?...'
            },
            'row_count': 10000,
            'summary': 'Your dataset is ready! Generated 10,000 rows. Download links expire in 24 hours.'
        }

    Example response on error:
        {
            'success': False,
            'error': 'user_id is required for export. The agent should pass the authenticated user ID.',
            'recoverable': False
        }

    Agent usage example:
        When user says "I'm happy with the data, export 50,000 rows", the agent should:
        1. Use the script from the most recent successful execute_script result
        2. Call export_dataset with that script and row_count=50000
        3. Present the download links to the user in a friendly format:
           "Your dataset is ready! Here are your download links (valid for 24 hours):
            - CSV: [link]
            - JSON: [link]
            - Schema: [link]
            - Python script: [link]"
    """
    # Get environment variables
    export_lambda_name = os.environ.get('EXPORT_LAMBDA_NAME')
    bucket_name = os.environ.get('EXPORT_BUCKET_NAME')

    # Validate environment configuration
    if not export_lambda_name:
        return {
            'success': False,
            'error': 'Export service is not configured. EXPORT_LAMBDA_NAME environment variable is missing.',
            'recoverable': False
        }

    if not bucket_name:
        return {
            'success': False,
            'error': 'Export storage is not configured. EXPORT_BUCKET_NAME environment variable is missing.',
            'recoverable': False
        }

    # Validate user_id (required for multi-tenant isolation)
    if not user_id:
        return {
            'success': False,
            'error': 'user_id is required for export. The agent should pass the authenticated user ID.',
            'recoverable': False
        }

    # Generate session_id if not provided
    if not session_id:
        session_id = str(uuid.uuid4())[:8]

    # Validate row_count
    safe_row_count = max(int(row_count), 1)

    # Prepare payload for export Lambda
    payload = {
        'script': script,
        'row_count': safe_row_count,
        'user_id': user_id,
        'session_id': session_id,
        'bucket_name': bucket_name
    }

    try:
        # Invoke export Lambda
        response = lambda_client.invoke(
            FunctionName=export_lambda_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )

        response_payload = json.loads(response['Payload'].read().decode('utf-8'))

        # Check for Lambda execution errors
        if 'FunctionError' in response:
            error_msg = response_payload.get('errorMessage', 'Unknown export error')
            return {
                'success': False,
                'error': f'Export failed: {error_msg}',
                'recoverable': True
            }

        # Handle export Lambda response
        if not response_payload.get('success', False):
            return {
                'success': False,
                'error': response_payload.get('error', 'Export failed with unknown error'),
                'recoverable': response_payload.get('recoverable', True)
            }

        # Get file paths from response
        files = response_payload.get('files', {})
        if not files:
            return {
                'success': False,
                'error': 'Export succeeded but no files were returned',
                'recoverable': True
            }

        # Generate presigned URLs for each file
        downloads = {}
        for file_type, s3_key in files.items():
            try:
                downloads[file_type] = generate_presigned_url(bucket_name, s3_key)
            except Exception as url_error:
                return {
                    'success': False,
                    'error': f'Failed to generate download URL for {file_type}: {str(url_error)}',
                    'recoverable': True
                }

        # Return success with download URLs
        actual_row_count = response_payload.get('row_count', safe_row_count)
        return {
            'success': True,
            'downloads': downloads,
            'row_count': actual_row_count,
            'summary': f"Your dataset is ready! Generated {actual_row_count:,} rows. Download links expire in 24 hours."
        }

    except Exception as e:
        return {
            'success': False,
            'error': f'Error invoking export service: {str(e)}',
            'recoverable': True
        }
