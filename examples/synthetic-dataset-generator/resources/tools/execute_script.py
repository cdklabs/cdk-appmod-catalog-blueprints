"""
Execute Script Tool - Validates and executes Python DataGenerator scripts.

This tool is called by InteractiveAgent after a script has been generated.
It validates the script using AST parsing, implements a self-healing loop
that invokes BatchAgent to fix validation errors, and then invokes the
execution Lambda to run the validated script.

Security: Scripts are validated before execution to prevent unauthorized
operations. Only whitelisted imports and safe operations are allowed.
"""
from strands import tool
from typing import Dict, Any, List
import ast
import boto3
import json
import os

# Import SSE emitter from the interactive agent handler.
# This allows us to push events (schema, preview) directly into the SSE stream.
try:
    from index import emit_sse_event
except ImportError:
    # Fallback for testing or when not running in Lambda context
    def emit_sse_event(event_type: str, data: dict) -> None:
        pass

# =============================================================================
# AST Validator (inlined to avoid module dependency issues in Lambda tools)
# =============================================================================

# Whitelist of allowed imports for DataGenerator scripts
ALLOWED_IMPORTS = {
    'pandas', 'numpy', 'faker', 'random', 'datetime',
    'json', 'math', 'string', 'collections',
}

# Functions that are never allowed
FORBIDDEN_FUNCTIONS = {
    'open', 'exec', 'eval', 'compile', '__import__', 'input', 'breakpoint',
}

# Module prefixes that indicate forbidden attribute access
FORBIDDEN_MODULE_PREFIXES = {
    'os', 'subprocess', 'socket', 'urllib', 'requests', 'http', 'ftplib',
    'smtplib', 'telnetlib', 'shutil', 'pathlib', 'tempfile', 'glob', 'sys',
    'importlib', 'builtins', 'ctypes', 'multiprocessing', 'threading',
    'signal', 'pickle',
}


def _get_call_name(node: ast.Call) -> str:
    """Extract function name from a Call node."""
    if isinstance(node.func, ast.Name):
        return node.func.id
    elif isinstance(node.func, ast.Attribute):
        return node.func.attr
    return ''


def _get_attribute_chain(node: ast.Attribute) -> str:
    """Build full attribute chain from an Attribute node."""
    parts = []
    current = node
    while isinstance(current, ast.Attribute):
        parts.append(current.attr)
        current = current.value
    if isinstance(current, ast.Name):
        parts.append(current.id)
        return '.'.join(reversed(parts))
    return ''


def validate_script(code: str) -> Dict[str, Any]:
    """
    Validate a Python script for security using AST parsing.

    Returns dict with 'valid' (bool), 'errors' (list), 'warnings' (list).
    """
    errors: List[str] = []
    warnings: List[str] = []

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {'valid': False, 'errors': [f'Syntax error at line {e.lineno}: {e.msg}'], 'warnings': []}

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                module_name = alias.name.split('.')[0]
                if module_name not in ALLOWED_IMPORTS:
                    errors.append(f"Unauthorized import: '{alias.name}'. Use only: {', '.join(sorted(ALLOWED_IMPORTS))}")

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                module_name = node.module.split('.')[0]
                if module_name not in ALLOWED_IMPORTS:
                    errors.append(f"Unauthorized import: 'from {node.module}'. Use only: {', '.join(sorted(ALLOWED_IMPORTS))}")

        elif isinstance(node, ast.Call):
            func_name = _get_call_name(node)
            if func_name in FORBIDDEN_FUNCTIONS:
                errors.append(f"Forbidden function call: '{func_name}()'")

        elif isinstance(node, ast.Attribute):
            attr_chain = _get_attribute_chain(node)
            if attr_chain:
                root_module = attr_chain.split('.')[0]
                if root_module in FORBIDDEN_MODULE_PREFIXES:
                    errors.append(f"Forbidden module access: '{attr_chain}'")

    return {'valid': len(errors) == 0, 'errors': errors, 'warnings': warnings}

# =============================================================================
# End AST Validator
# =============================================================================

# Initialize Lambda client outside handler for connection reuse
lambda_client = boto3.client('lambda')

# Initialize S3 client for result persistence
s3_client = boto3.client('s3')

# Maximum number of fix attempts before giving up
MAX_FIX_ATTEMPTS = 3


def invoke_batch_agent_for_fix(script: str, errors: list) -> Dict[str, Any]:
    """
    Invoke BatchAgent to fix validation errors in a script.

    Sends the script and specific errors to BatchAgent, which will
    generate a corrected version that complies with security requirements.

    Args:
        script: The Python script that failed validation
        errors: List of specific validation error messages

    Returns:
        Dictionary containing:
        - success: Boolean indicating if fix was successful
        - script: Corrected script (if success)
        - error: Error message (if not success)
    """
    function_name = os.environ.get('BATCH_AGENT_FUNCTION_NAME')
    if not function_name:
        return {
            'success': False,
            'error': 'Self-healing service is not configured. Please contact support.',
            'recoverable': False
        }

    # Build a clear prompt for BatchAgent to fix the script
    error_list = '\n'.join(f'- {e}' for e in errors)
    fix_prompt = f"""Fix the following Python DataGenerator script to resolve these validation errors:

VALIDATION ERRORS:
{error_list}

ORIGINAL SCRIPT:
```python
{script}
```

REQUIREMENTS:
1. Remove or replace any unauthorized imports - only use: pandas, numpy, faker, random, datetime, json, math, string, collections
2. Remove any file I/O operations (no open(), no file paths)
3. Remove any network calls
4. Remove any dynamic code execution (no eval, exec, compile)
5. Keep the DataGenerator class structure and generate() method intact
6. Return ONLY the corrected Python code, no explanations

Output the corrected script as valid Python code."""

    payload = {
        'contentType': 'data',
        'content': {
            'data': fix_prompt
        }
    }

    try:
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )

        response_payload = json.loads(response['Payload'].read().decode('utf-8'))

        # Check for Lambda execution errors
        if 'FunctionError' in response:
            error_msg = response_payload.get('errorMessage', 'Unknown error during script fix')
            return {
                'success': False,
                'error': f'Failed to fix script: {error_msg}',
                'recoverable': True
            }

        # BatchAgent returns result in 'result' field
        if 'result' in response_payload:
            result = response_payload['result']
            fixed_script = result.get('script', '')

            if not fixed_script:
                return {
                    'success': False,
                    'error': 'BatchAgent returned empty fix result',
                    'recoverable': True
                }

            return {
                'success': True,
                'script': fixed_script
            }
        elif 'errorMessage' in response_payload:
            return {
                'success': False,
                'error': response_payload.get('errorMessage', 'Unknown error'),
                'recoverable': True
            }
        else:
            return {
                'success': False,
                'error': 'Unexpected response from fix service',
                'recoverable': True
            }

    except Exception as e:
        return {
            'success': False,
            'error': f'Error invoking fix service: {str(e)}',
            'recoverable': True
        }


def save_result_to_s3(session_id: str, schema: dict, preview: list, total_rows: int) -> None:
    """
    Save execution result (schema and preview) to S3 for frontend retrieval.

    Saves the schema and preview data to a predictable S3 location that
    the frontend can fetch to populate the data preview panel.

    Args:
        session_id: The session ID for organizing results
        schema: Column definitions with types and descriptions
        preview: List of generated data rows
        total_rows: Number of rows in the preview

    Location:
        s3://{SESSION_BUCKET}/session-metadata/{session_id}/latest_result.json
    """
    session_bucket = os.environ.get('SESSION_BUCKET')
    if not session_bucket:
        # SESSION_BUCKET not configured, skip persistence
        return

    if not session_id:
        # No session_id, skip persistence
        return

    try:
        result_data = {
            'schema': schema,
            'preview': preview,
            'totalRows': total_rows
        }

        key = f'session-metadata/{session_id}/latest_result.json'

        s3_client.put_object(
            Bucket=session_bucket,
            Key=key,
            Body=json.dumps(result_data),
            ContentType='application/json'
        )

        # Log success but don't fail the execution if S3 write fails
    except Exception as e:
        # Silent failure - don't break the execution flow
        # The SSE events already delivered the data to the frontend
        pass


def invoke_execution_lambda(script: str, row_count: int) -> Dict[str, Any]:
    """
    Invoke the execution Lambda to run a validated script.

    The execution Lambda runs the DataGenerator class in a sandboxed
    environment and returns the schema and preview data.

    Args:
        script: Validated Python script containing DataGenerator class
        row_count: Number of preview rows to generate

    Returns:
        Dictionary containing execution results or error details
    """
    function_name = os.environ.get('EXECUTION_LAMBDA_NAME')
    if not function_name:
        return {
            'success': False,
            'error': 'Execution service is not yet configured. Script validation passed but execution Lambda is not available.',
            'recoverable': False,
            'validation_passed': True
        }

    payload = {
        'script': script,
        'row_count': row_count
    }

    try:
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )

        response_payload = json.loads(response['Payload'].read().decode('utf-8'))

        # Check for Lambda execution errors
        if 'FunctionError' in response:
            error_msg = response_payload.get('errorMessage', 'Unknown execution error')
            return {
                'success': False,
                'error': f'Script execution failed: {error_msg}',
                'recoverable': True
            }

        # Handle successful execution
        if 'schema' in response_payload and 'preview' in response_payload:
            return {
                'success': True,
                'schema': response_payload['schema'],
                'preview': response_payload['preview'],
                'row_count': response_payload.get('row_count', row_count),
                'summary': response_payload.get(
                    'summary',
                    f'Generated {len(response_payload.get("schema", {}))} column dataset preview with {row_count} rows'
                )
            }
        elif 'error' in response_payload:
            return {
                'success': False,
                'error': response_payload['error'],
                'recoverable': response_payload.get('recoverable', True)
            }
        else:
            return {
                'success': False,
                'error': 'Unexpected response from execution service',
                'recoverable': True
            }

    except Exception as e:
        return {
            'success': False,
            'error': f'Error invoking execution service: {str(e)}',
            'recoverable': True
        }


@tool
def execute_script(script: str, row_count: int = 100, session_id: str = "") -> Dict[str, Any]:
    """
    Validate and execute a Python DataGenerator script.

    This tool validates the script for security using AST parsing, then
    executes it in a sandboxed Lambda environment. If validation fails,
    it attempts to fix the script using BatchAgent (self-healing loop).

    Args:
        script: Python code containing a DataGenerator class with generate() method
        row_count: Number of preview rows to generate (default 100, max 100 for preview)
        session_id: Optional session identifier for persisting results to S3. This is the
                    session ID passed from the agent context.

    Returns:
        Dictionary containing:
        - success: Boolean indicating if execution succeeded
        - schema: Column definitions with types and descriptions (if success)
        - preview: List of generated data rows (if success)
        - row_count: Number of rows in preview (if success)
        - summary: Brief description of the result
        - error: Error message (if not success)
        - validation_errors: List of validation failures (if validation failed)
        - recoverable: Boolean indicating if user can retry

    Example response on success:
        {
            'success': True,
            'schema': {
                'customer_id': {'type': 'integer', 'description': 'Unique customer ID'},
                'name': {'type': 'string', 'description': 'Customer full name'},
                ...
            },
            'preview': [
                {'customer_id': 1, 'name': 'John Smith', ...},
                ...
            ],
            'row_count': 100,
            'summary': 'Generated 6-column dataset preview with 100 rows'
        }
    """
    # Enforce preview row limit
    safe_row_count = min(max(int(row_count), 1), 100)

    current_script = script
    fix_attempts = 0

    # Self-healing loop: validate and fix up to MAX_FIX_ATTEMPTS times
    for attempt in range(MAX_FIX_ATTEMPTS + 1):
        validation = validate_script(current_script)

        if validation['valid']:
            # Script passed validation, proceed to execution
            break

        # Script failed validation
        if attempt == MAX_FIX_ATTEMPTS:
            # Exhausted fix attempts
            return {
                'success': False,
                'error': 'Script validation failed after 3 fix attempts. Please rephrase your request with simpler requirements.',
                'validation_errors': validation['errors'],
                'recoverable': True,
                'summary': 'The generated script could not be made compliant with security requirements'
            }

        # Attempt to fix the script
        fix_attempts += 1
        fix_result = invoke_batch_agent_for_fix(current_script, validation['errors'])

        if not fix_result['success']:
            # Fix attempt failed
            return {
                'success': False,
                'error': fix_result.get('error', 'Failed to fix script'),
                'validation_errors': validation['errors'],
                'recoverable': fix_result.get('recoverable', True),
                'summary': f'Self-healing failed on attempt {fix_attempts}'
            }

        # Update script with fixed version
        current_script = fix_result['script']

    # Script is valid, invoke execution Lambda
    result = invoke_execution_lambda(current_script, safe_row_count)

    # Add fix attempt info if any fixes were made
    if fix_attempts > 0:
        result['fix_attempts'] = fix_attempts
        if result['success']:
            result['summary'] = f"{result.get('summary', '')} (auto-fixed {fix_attempts} validation issue{'s' if fix_attempts > 1 else ''})"

    # Emit SSE events for schema and preview data so frontend panels update immediately.
    # This uses the contextvars-based queue to push events into the SSE stream.
    if result.get('success'):
        if 'schema' in result:
            emit_sse_event('schema', {'data': result['schema']})
        if 'preview' in result:
            emit_sse_event('preview', {
                'rows': result['preview'],
                'totalRows': result.get('row_count', len(result['preview']))
            })

        # Persist result to S3 for frontend retrieval (e.g., on page refresh)
        # This ensures the preview panel can display data even if SSE was missed
        # Use session_id from parameter or fall back to environment variable
        effective_session_id = session_id or os.environ.get('CURRENT_SESSION_ID', '')
        if effective_session_id and 'schema' in result and 'preview' in result:
            save_result_to_s3(
                session_id=effective_session_id,
                schema=result['schema'],
                preview=result['preview'],
                total_rows=result.get('row_count', len(result['preview']))
            )

    # Emit tool_end event to stop frontend loading spinners (always, not just on success)
    emit_sse_event('tool_end', {'tool': 'execute_script'})

    return result
