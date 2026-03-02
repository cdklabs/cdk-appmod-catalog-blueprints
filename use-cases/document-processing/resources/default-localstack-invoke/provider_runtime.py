import json
import logging
import os
import re
from typing import Any, Dict, Optional
from urllib import error as urllib_error
from urllib import request as urllib_request

import boto3

MODEL_PROVIDER_BEDROCK = 'bedrock'
MODEL_PROVIDER_OLLAMA = 'ollama'
DEFAULT_MODEL_PROVIDER = MODEL_PROVIDER_BEDROCK
DEFAULT_OLLAMA_BASE_URL = 'http://host.docker.internal:11434'
OLLAMA_CHAT_PATH = '/api/chat'

JSON_CODE_BLOCK_PATTERN = re.compile(r'```(?:json)?\s*({.*?})\s*```', re.DOTALL)
JSON_OBJECT_PATTERN = re.compile(r'({[^{}]*(?:{[^{}]*}[^{}]*)*})', re.DOTALL)
MAX_OLLAMA_DOCUMENT_CONTEXT_CHARS = 12000
MAX_DEBUG_PAYLOAD_CHARS = int(os.getenv('DEBUG_OLLAMA_MAX_CHARS', '4000'))


def _resolve_endpoint_url(*service_env_keys: str) -> Optional[str]:
    for key in service_env_keys:
        endpoint = os.getenv(key)
        if endpoint:
            return endpoint
    return None


def create_boto3_client(service_name: str, *service_env_keys: str):
    endpoint_url = _resolve_endpoint_url(*service_env_keys, 'AWS_ENDPOINT_URL')
    if endpoint_url:
        return boto3.client(service_name, endpoint_url=endpoint_url)
    return boto3.client(service_name)


def _is_truthy_env(var_name: str) -> bool:
    return os.getenv(var_name, '').strip().lower() in {'1', 'true', 'yes', 'on'}


def _debug_ollama_enabled() -> bool:
    return _is_truthy_env('DEBUG_OLLAMA_PAYLOAD')


def _truncate_for_debug(text: str, max_chars: int = MAX_DEBUG_PAYLOAD_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    return f'{text[:max_chars]}...[truncated]'


def resolve_model_provider() -> str:
    provider = os.getenv('MODEL_PROVIDER', DEFAULT_MODEL_PROVIDER).strip().lower()
    if provider in {MODEL_PROVIDER_BEDROCK, MODEL_PROVIDER_OLLAMA}:
        return provider
    return DEFAULT_MODEL_PROVIDER


def _resolve_ollama_model_id(model_id: str) -> str:
    explicit_model = os.getenv('OLLAMA_MODEL_ID')
    if explicit_model:
        return explicit_model
    if model_id.startswith('ollama.'):
        return model_id.split('ollama.', 1)[1]
    if model_id.startswith('ollama/'):
        return model_id.split('ollama/', 1)[1]
    return model_id


def _extract_json_object(response_text: str) -> Optional[Dict[str, Any]]:
    text = response_text.strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    candidates: list[tuple[Dict[str, Any], int]] = []

    for json_code_block in JSON_CODE_BLOCK_PATTERN.finditer(response_text):
        try:
            parsed = json.loads(json_code_block.group(1))
            if isinstance(parsed, dict):
                candidates.append((parsed, json_code_block.end()))
        except json.JSONDecodeError:
            pass

    for raw_json in JSON_OBJECT_PATTERN.finditer(response_text):
        try:
            parsed = json.loads(raw_json.group(1))
            if isinstance(parsed, dict):
                candidates.append((parsed, raw_json.end()))
        except json.JSONDecodeError:
            pass

    if candidates:
        return max(candidates, key=lambda candidate: candidate[1])[0]

    return None


def normalize_model_response(response_text: str, invoke_type: str) -> Dict[str, Any]:
    parsed = _extract_json_object(response_text)
    if parsed is None:
        if invoke_type == 'classification':
            return {'documentClassification': 'UNKNOWN'}
        return {'raw_response': response_text}

    if invoke_type == 'classification' and 'documentClassification' not in parsed:
        classification = parsed.get('classification') or parsed.get('document_type') or parsed.get('type')
        parsed['documentClassification'] = classification or 'UNKNOWN'

    return parsed


def _build_ollama_prompt(content: list[Dict[str, Any]]) -> str:
    prompt_parts = []
    for item in content:
        item_type = item.get('type')
        if item_type == 'text':
            prompt_parts.append(item.get('text', ''))
            continue

        if item_type in {'document', 'image'}:
            source = item.get('source', {})
            media_type = source.get('media_type', 'application/octet-stream')
            prompt_parts.append(
                f"[Attached {item_type} with media type '{media_type}' omitted in direct Ollama mode.]",
            )

    return '\n\n'.join(part for part in prompt_parts if part)


def extract_pdf_text_for_ollama(local_path: str) -> str:
    """Extract text from a PDF file for direct Ollama prompt mode."""
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        return ''

    text_parts: list[str] = []
    try:
        reader = PdfReader(local_path)
        for page in reader.pages:
            page_text = page.extract_text() or ''
            if page_text:
                text_parts.append(page_text.strip())
            if sum(len(part) for part in text_parts) >= MAX_OLLAMA_DOCUMENT_CONTEXT_CHARS:
                break
    except Exception:
        return ''

    joined = '\n\n'.join(part for part in text_parts if part)
    if len(joined) > MAX_OLLAMA_DOCUMENT_CONTEXT_CHARS:
        return f'{joined[:MAX_OLLAMA_DOCUMENT_CONTEXT_CHARS]}\n\n[Document text truncated]'
    return joined


def _invoke_bedrock_model(content: list[Dict[str, Any]], max_tokens: int, model_id: str, bedrock_client) -> str:
    response = bedrock_client.invoke_model(
        modelId=model_id,
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': max_tokens,
            'messages': [{'role': 'user', 'content': content}],
        }),
    )
    response_payload = response['body'].read()
    parsed_response = json.loads(response_payload)
    return parsed_response['content'][0]['text']


def _invoke_ollama_model(content: list[Dict[str, Any]], max_tokens: int, model_id: str, logger: logging.Logger) -> str:
    ollama_base_url = os.getenv('OLLAMA_BASE_URL', DEFAULT_OLLAMA_BASE_URL).rstrip('/')
    ollama_model_id = _resolve_ollama_model_id(model_id)
    ollama_prompt = _build_ollama_prompt(content)
    ollama_num_ctx = os.getenv('OLLAMA_NUM_CTX')

    options: Dict[str, Any] = {
        'num_predict': max_tokens,
    }
    if ollama_num_ctx:
        try:
            options['num_ctx'] = int(ollama_num_ctx)
        except ValueError:
            logger.warning('Ignoring invalid OLLAMA_NUM_CTX value: %s', ollama_num_ctx)

    request_payload: Dict[str, Any] = {
        'model': ollama_model_id,
        'messages': [{'role': 'user', 'content': ollama_prompt}],
        'stream': False,
        'options': options,
    }
    request_body = json.dumps(request_payload).encode('utf-8')

    if _debug_ollama_enabled():
        logger.info(
            'Ollama request debug: model=%s base_url=%s prompt_len=%s request=%s',
            ollama_model_id,
            ollama_base_url,
            len(ollama_prompt),
            _truncate_for_debug(json.dumps(request_payload)),
        )

    request = urllib_request.Request(
        f'{ollama_base_url}{OLLAMA_CHAT_PATH}',
        data=request_body,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urllib_request.urlopen(request, timeout=120) as response:
            raw_payload = response.read().decode('utf-8')
    except urllib_error.HTTPError as error:
        error_payload = error.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Ollama HTTP error {error.code}: {error_payload}') from error
    except urllib_error.URLError as error:
        raise RuntimeError(f'Failed to connect to Ollama endpoint: {error}') from error

    if _debug_ollama_enabled():
        logger.info(
            'Ollama raw response debug: %s',
            _truncate_for_debug(raw_payload),
        )

    payload = json.loads(raw_payload)
    message = payload.get('message', {})
    if isinstance(message, dict) and isinstance(message.get('content'), str):
        return message['content']

    if isinstance(payload.get('response'), str):
        return payload['response']

    raise RuntimeError(f'Unexpected Ollama response format: {payload}')


def invoke_model(
    content: list[Dict[str, Any]],
    max_tokens: int,
    model_id: str,
    bedrock_client,
    logger: logging.Logger,
) -> str:
    if resolve_model_provider() == MODEL_PROVIDER_OLLAMA:
        return _invoke_ollama_model(content, max_tokens, model_id, logger)
    return _invoke_bedrock_model(content, max_tokens, model_id, bedrock_client)
