"""
Export Lambda Handler - Generates full datasets and uploads to S3.

This Lambda executes Python scripts that define a DataGenerator class,
generating full datasets (up to 100K rows) and uploading results to S3
as CSV, JSON, schema, and script files.

Architecture:
- Chunked generation: Creates data in batches of 10K rows to manage memory
- Parallel upload: Uses ThreadPoolExecutor to upload all 4 files concurrently
- S3 structure: exports/{user_id}/{session_id}/{timestamp}/{filename}
"""
import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import boto3

# Constants
MAX_ROWS = 100000  # Hard limit for export
CHUNK_SIZE = 10000  # Generate in chunks to manage memory
DEFAULT_ROWS = 10000  # Default export size

# S3 client
s3_client = boto3.client('s3')


def clean_for_json(obj):
    """Recursively clean values for JSON serialization."""
    import numpy as np
    import pandas as pd
    from datetime import date, datetime as dt

    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if pd.isna(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.integer, np.floating)):
        val = obj.item()
        if pd.isna(val) or (isinstance(val, float) and np.isinf(val)):
            return None
        return val
    elif isinstance(obj, np.ndarray):
        return clean_for_json(obj.tolist())
    elif isinstance(obj, (date, dt)):
        return obj.isoformat()
    elif pd.isna(obj):
        return None
    return obj


def generate_datasets_chunked(script: str, total_rows: int, namespace: dict):
    """
    Generate datasets in chunks to manage memory for large row counts.

    Args:
        script: Python script defining DataGenerator class
        total_rows: Total number of rows to generate
        namespace: Pre-populated namespace with allowed imports

    Returns:
        Tuple of (DataFrame, schema dict)
    """
    import pandas as pd

    # Execute the script to define DataGenerator class
    exec(script, namespace)

    if 'DataGenerator' not in namespace:
        raise ValueError('Script must define a DataGenerator class')

    DataGenerator = namespace['DataGenerator']

    # Generate in chunks
    all_data = []
    schema = None

    for chunk_start in range(0, total_rows, CHUNK_SIZE):
        chunk_size = min(CHUNK_SIZE, total_rows - chunk_start)
        generator = DataGenerator(num_rows=chunk_size)
        datasets = generator.generate_datasets()

        if datasets and len(datasets) > 0:
            all_data.append(datasets[0])

        # Get schema from first chunk only
        if schema is None:
            schema = generator.generate_schema()

    # Concatenate all chunks
    if all_data:
        full_df = pd.concat(all_data, ignore_index=True)
    else:
        full_df = pd.DataFrame()

    return full_df, schema or {}


def upload_to_s3_parallel(bucket: str, prefix: str, files_dict: dict) -> dict:
    """
    Upload multiple files to S3 in parallel using ThreadPoolExecutor.

    Args:
        bucket: S3 bucket name
        prefix: S3 key prefix (folder path)
        files_dict: Dict of {filename: (content, content_type)}

    Returns:
        Dict of {filename: s3_key}
    """
    def upload_file(args):
        filename, content, content_type = args
        key = f"{prefix}/{filename}"
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ContentType=content_type
        )
        return filename, key

    upload_tasks = [
        (filename, content, content_type)
        for filename, (content, content_type) in files_dict.items()
    ]

    results = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        for filename, key in executor.map(upload_file, upload_tasks):
            results[filename] = key

    return results


def handler(event, context):
    """
    Generate full datasets and upload to S3.

    Args:
        event: {
            script: str,           # DataGenerator script
            row_count: int,        # Number of rows to generate (default 10000)
            user_id: str,          # Cognito user sub for folder isolation
            session_id: str,       # Session ID for folder naming
            bucket_name: str       # S3 bucket name (optional, uses env var)
        }
        context: Lambda context

    Returns:
        {
            success: True,
            files: {csv: str, json: str, schema: str, script: str},
            row_count: int,
            summary: str
        }
        or {success: False, error: str}
    """
    import pandas as pd
    import numpy as np
    from faker import Faker
    import random
    import datetime
    import math
    import string
    from collections import defaultdict, Counter, OrderedDict

    # Extract input
    script = event.get('script', '')
    row_count = event.get('row_count', DEFAULT_ROWS)
    user_id = event.get('user_id', 'anonymous')
    session_id = event.get('session_id', 'default')
    bucket_name = event.get('bucket_name', os.environ.get('EXPORT_BUCKET_NAME', ''))

    # Validate input
    if not script:
        return {
            'success': False,
            'error': 'No script provided'
        }

    if not bucket_name:
        return {
            'success': False,
            'error': 'No bucket name provided (set EXPORT_BUCKET_NAME environment variable)'
        }

    if row_count <= 0:
        return {
            'success': False,
            'error': 'Row count must be positive'
        }

    if row_count > MAX_ROWS:
        return {
            'success': False,
            'error': f'Row count exceeds maximum limit of {MAX_ROWS}'
        }

    try:
        # Create isolated execution namespace with allowed imports
        namespace = {
            'pd': pd,
            'pandas': pd,
            'np': np,
            'numpy': np,
            'Faker': Faker,
            'faker': Faker,
            'random': random,
            'datetime': datetime,
            'math': math,
            'string': string,
            'defaultdict': defaultdict,
            'Counter': Counter,
            'OrderedDict': OrderedDict,
            '__builtins__': __builtins__,
        }

        # Generate data in chunks
        full_df, schema = generate_datasets_chunked(script, row_count, namespace)
        actual_rows = len(full_df)

        # Clean data for JSON serialization
        schema = clean_for_json(schema)

        # Prepare files for upload
        timestamp = datetime.datetime.utcnow().strftime('%Y%m%d-%H%M%S')
        prefix = f"exports/{user_id}/{session_id}/{timestamp}"

        # Generate file contents
        csv_content = full_df.to_csv(index=False)  # RFC 4180 compliant
        json_records = clean_for_json(full_df.to_dict(orient='records'))
        json_content = json.dumps(json_records, indent=2, default=str)
        schema_content = json.dumps(schema, indent=2, default=str)

        files_dict = {
            'data.csv': (csv_content, 'text/csv'),
            'data.json': (json_content, 'application/json'),
            'schema.json': (schema_content, 'application/json'),
            'script.py': (script, 'text/x-python'),
        }

        # Upload all files in parallel
        uploaded_files = upload_to_s3_parallel(bucket_name, prefix, files_dict)

        return {
            'success': True,
            'files': {
                'csv': uploaded_files.get('data.csv', ''),
                'json': uploaded_files.get('data.json', ''),
                'schema': uploaded_files.get('schema.json', ''),
                'script': uploaded_files.get('script.py', ''),
            },
            'row_count': actual_rows,
            'summary': f'Generated {actual_rows} rows and uploaded 4 files to s3://{bucket_name}/{prefix}/'
        }

    except SyntaxError as e:
        return {
            'success': False,
            'error': f'Script syntax error: {e.msg} at line {e.lineno}'
        }
    except AttributeError as e:
        return {
            'success': False,
            'error': f'Script missing required method: {str(e)}'
        }
    except TypeError as e:
        return {
            'success': False,
            'error': f'Type error in script: {str(e)}'
        }
    except ValueError as e:
        return {
            'success': False,
            'error': f'Validation error: {str(e)}'
        }
    except Exception as e:
        # Generic error handler - don't expose full stack trace for security
        error_type = type(e).__name__
        return {
            'success': False,
            'error': f'Export error ({error_type}): {str(e)}'
        }
