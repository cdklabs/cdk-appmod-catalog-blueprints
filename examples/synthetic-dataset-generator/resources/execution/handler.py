"""
Execution Lambda Handler - Runs validated DataGenerator scripts in isolation.

This Lambda executes Python scripts that define a DataGenerator class,
generating a schema and preview data (up to 100 rows). It has minimal
IAM permissions (no S3/DynamoDB/Bedrock access) - it only runs code.

Security:
- Scripts are pre-validated by AST validator before reaching this handler
- Execution is isolated in a namespace
- No AWS SDK access (boto3 not imported)
- Hard row limit enforced to prevent memory exhaustion
"""
import json

# Constants
MAX_ROWS = 100000  # Hard limit per EXEC-04
PREVIEW_ROWS = 100  # Default preview size


def handler(event, context):
    """
    Execute validated DataGenerator script and return schema + preview.

    Args:
        event: {script: str, row_count: int}
        context: Lambda context

    Returns:
        {success: bool, schema: dict, preview: list, row_count: int}
        or {success: False, error: str}
    """
    # Extract and validate input
    script = event.get('script', '')
    requested_rows = event.get('row_count', PREVIEW_ROWS)

    if not script:
        return {
            'success': False,
            'error': 'No script provided'
        }

    # Enforce hard row limit
    if requested_rows > MAX_ROWS:
        return {
            'success': False,
            'error': f'Row count exceeds maximum limit of {MAX_ROWS}'
        }

    # Cap at preview rows for preview mode
    preview_count = min(requested_rows, PREVIEW_ROWS)

    try:
        # Create isolated execution namespace with standard library imports
        # that scripts expect to use
        import pandas as pd
        import numpy as np
        from faker import Faker
        import random
        import datetime
        import math
        import string
        from collections import defaultdict, Counter, OrderedDict

        namespace = {
            'pd': pd,
            'pandas': pd,
            'np': np,
            'numpy': np,
            'Faker': Faker,
            'faker': Faker,  # Allow both casing patterns
            'random': random,
            'datetime': datetime,
            'math': math,
            'string': string,
            'defaultdict': defaultdict,
            'Counter': Counter,
            'OrderedDict': OrderedDict,
            '__builtins__': __builtins__,
        }

        # Execute the script to define DataGenerator class
        exec(script, namespace)

        # Get the DataGenerator class
        if 'DataGenerator' not in namespace:
            return {
                'success': False,
                'error': 'Script must define a DataGenerator class'
            }

        DataGenerator = namespace['DataGenerator']

        # Instantiate with requested row count
        generator = DataGenerator(num_rows=requested_rows)

        # Generate datasets and schema
        datasets = generator.generate_datasets()
        schema = generator.generate_schema()

        # Convert first dataset to preview format
        if datasets and len(datasets) > 0:
            df = datasets[0]
            # Limit preview to PREVIEW_ROWS
            preview = df.head(preview_count).to_dict(orient='records')
            actual_rows = len(df)
        else:
            preview = []
            actual_rows = 0

        # Handle NaN/Inf values that can't be serialized to JSON
        def clean_for_json(obj):
            """Recursively clean values for JSON serialization."""
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
            elif isinstance(obj, (datetime.date, datetime.datetime)):
                return obj.isoformat()
            elif pd.isna(obj):
                return None
            return obj

        preview = clean_for_json(preview)
        schema = clean_for_json(schema)

        return {
            'success': True,
            'schema': schema,
            'preview': preview,
            'row_count': actual_rows,
            'preview_count': len(preview)
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
    except Exception as e:
        # Generic error handler - don't expose full stack trace for security
        error_type = type(e).__name__
        return {
            'success': False,
            'error': f'Script execution error ({error_type}): {str(e)}'
        }
