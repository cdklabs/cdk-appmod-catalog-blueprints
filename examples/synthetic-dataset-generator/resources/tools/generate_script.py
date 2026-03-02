"""
Generate Script Tool - Invokes BatchAgent to generate Python DataGenerator scripts.

This tool is called by InteractiveAgent when sufficient requirements have been gathered.
It sanitizes inputs, invokes the BatchAgent Lambda, and returns the generated script.
"""
from strands import tool
from typing import Dict, Any
import boto3
import json
import os
import re

# Initialize Lambda client outside handler for connection reuse
lambda_client = boto3.client('lambda')


def sanitize_input(text: str, max_length: int = 2000) -> str:
    """
    Sanitize user input to prevent prompt injection attacks.

    Strips:
    - Control characters (except newline/tab)
    - Known injection patterns
    - Excessive length

    Args:
        text: Raw user input
        max_length: Maximum allowed length

    Returns:
        Sanitized string safe for inclusion in prompts
    """
    if not text:
        return ''

    # Patterns that could indicate prompt injection attempts
    injection_patterns = [
        r'ignore\s*(all\s*)?(previous|prior)\s*instructions?',
        r'disregard\s*(all\s*)?(previous|prior|above)',
        r'forget\s*(everything|all|previous)',
        r'system\s*:\s*',
        r'<\|.*?\|>',  # Special tokens
        r'\[\[.*?\]\]',  # Bracketed commands
        r'```system',  # System code blocks
        r'ADMIN\s*MODE',
        r'DEBUG\s*MODE',
    ]

    result = text
    for pattern in injection_patterns:
        result = re.sub(pattern, '', result, flags=re.IGNORECASE | re.DOTALL)

    # Remove control characters except newline and tab
    result = ''.join(
        char for char in result
        if char.isprintable() or char in '\n\t'
    )

    # Truncate to max length
    return result[:max_length].strip()


@tool
def generate_script(
    use_case: str,
    fields: str,
    row_count: int = 10000
) -> Dict[str, Any]:
    """
    Generate a Python DataGenerator script for synthetic data creation.

    Call this tool when you have gathered sufficient requirements from the user.
    The tool invokes the script generation agent and returns the Python code.

    Args:
        use_case: Description of the dataset purpose and domain
                  (e.g., "fraud detection training data", "e-commerce customer analytics")
        fields: JSON string containing field definitions. Each field should have:
                - name: Field/column name
                - type: Data type (string, integer, float, datetime, boolean)
                - description: What this field represents
                - constraints: Value constraints, distributions, or valid values
        row_count: Number of rows to generate (default 10000, max 100000)

    Returns:
        Dictionary containing:
        - success: Boolean indicating if generation succeeded
        - script: Generated Python code as string (if success)
        - summary: Brief explanation of the generation approach (if success)
        - error: Error message (if not success)
        - recoverable: Boolean indicating if user can retry with different input
    """
    try:
        # 1. Validate and sanitize inputs
        sanitized_use_case = sanitize_input(use_case, max_length=500)
        sanitized_fields = sanitize_input(fields, max_length=5000)

        if not sanitized_use_case:
            return {
                'success': False,
                'error': 'Use case description is required. Please describe what the data will be used for.',
                'recoverable': True
            }

        if not sanitized_fields:
            return {
                'success': False,
                'error': 'Field definitions are required. Please specify the columns/fields you need.',
                'recoverable': True
            }

        # Validate fields is valid JSON
        try:
            fields_parsed = json.loads(sanitized_fields)
            if not isinstance(fields_parsed, list):
                return {
                    'success': False,
                    'error': 'Fields must be a JSON array of field definitions.',
                    'recoverable': True
                }
        except json.JSONDecodeError as e:
            return {
                'success': False,
                'error': f'Invalid JSON in fields parameter: {str(e)}',
                'recoverable': True
            }

        # Enforce row count limits (100 minimum, 100000 maximum)
        safe_row_count = min(max(int(row_count), 100), 100000)

        # 2. Get BatchAgent function name from environment
        function_name = os.environ.get('BATCH_AGENT_FUNCTION_NAME')
        if not function_name:
            return {
                'success': False,
                'error': 'Script generation service is not configured. Please contact support.',
                'recoverable': False
            }

        # 3. Build payload for BatchAgent
        # BatchAgent expects contentType='data' with content.data containing the prompt
        generation_request = {
            'use_case': sanitized_use_case,
            'fields': sanitized_fields,
            'row_count': safe_row_count
        }

        payload = {
            'contentType': 'data',
            'content': {
                'data': f'Generate a Python DataGenerator script with these requirements:\n{json.dumps(generation_request, indent=2)}'
            }
        }

        # 4. Invoke BatchAgent Lambda
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )

        # 5. Parse response
        response_payload = json.loads(response['Payload'].read().decode('utf-8'))

        # Check for Lambda execution errors
        if 'FunctionError' in response:
            error_msg = response_payload.get('errorMessage', 'Unknown error during script generation')
            return {
                'success': False,
                'error': f'Script generation failed: {error_msg}',
                'recoverable': True
            }

        # BatchAgent with expectJson=true returns parsed JSON in 'result'
        if 'result' in response_payload:
            result = response_payload['result']
            script = result.get('script', '')
            summary = result.get('summary', f'Generated DataGenerator script for {sanitized_use_case}')

            if not script:
                return {
                    'success': False,
                    'error': summary if summary else 'Script generation returned empty result',
                    'recoverable': True
                }

            return {
                'success': True,
                'script': script,
                'summary': summary,
                'row_count': safe_row_count
            }
        elif 'errorMessage' in response_payload:
            return {
                'success': False,
                'error': response_payload.get('errorMessage', 'Unknown error'),
                'recoverable': True
            }
        else:
            # Unexpected response format
            return {
                'success': False,
                'error': 'Unexpected response from script generator. Please try again.',
                'recoverable': True
            }

    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f'Failed to parse response: {str(e)}',
            'recoverable': True
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Script generation encountered an error: {str(e)}',
            'error_type': type(e).__name__,
            'recoverable': True
        }
