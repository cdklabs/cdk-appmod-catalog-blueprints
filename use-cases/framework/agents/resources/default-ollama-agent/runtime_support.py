import json
import os
import re
from typing import Any, Dict, Optional

MODEL_PROVIDER_BEDROCK = 'bedrock'
MODEL_PROVIDER_OLLAMA = 'ollama'
OUTPUT_CONTRACT_NONE = 'none'
OUTPUT_CONTRACT_FRAUD_V1 = 'fraud_v1'
MAX_DEBUG_PAYLOAD_CHARS = int(os.getenv('DEBUG_AGENT_MAX_CHARS', '4000'))
REQUIRED_FRAUD_RESULT_KEYS = {'risk_score', 'risk_level', 'findings', 'indicators', 'recommended_actions'}
REQUIRED_FRAUD_FINDINGS_KEYS = {'metadata_analysis', 'pattern_matches', 'anomalies', 'database_checks'}


def _is_truthy_env(var_name: str) -> bool:
    return os.getenv(var_name, '').strip().lower() in {'1', 'true', 'yes', 'on'}


def debug_agent_payload_enabled() -> bool:
    return _is_truthy_env('DEBUG_AGENT_PAYLOAD')


def debug_agent_tool_flow_enabled() -> bool:
    return _is_truthy_env('DEBUG_AGENT_TOOL_FLOW')


def truncate_for_debug(text: str, max_chars: int = MAX_DEBUG_PAYLOAD_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    return f'{text[:max_chars]}...[truncated]'


def resolve_model_provider() -> str:
    provider = os.getenv('MODEL_PROVIDER', MODEL_PROVIDER_BEDROCK).strip().lower()
    if provider in {MODEL_PROVIDER_BEDROCK, MODEL_PROVIDER_OLLAMA}:
        return provider
    return MODEL_PROVIDER_BEDROCK


def resolve_output_contract() -> str:
    output_contract = os.getenv('AGENT_OUTPUT_CONTRACT', OUTPUT_CONTRACT_NONE).strip().lower()
    if output_contract == OUTPUT_CONTRACT_FRAUD_V1:
        return OUTPUT_CONTRACT_FRAUD_V1
    return OUTPUT_CONTRACT_NONE


def is_fraud_output_contract_enabled() -> bool:
    return resolve_output_contract() == OUTPUT_CONTRACT_FRAUD_V1


def resolve_ollama_model_name(model_id: Optional[str]) -> str:
    raw_model_id = model_id or ''
    explicit_ollama_model = os.getenv('OLLAMA_MODEL_ID')
    if explicit_ollama_model:
        return explicit_ollama_model

    if raw_model_id.startswith('ollama/'):
        return raw_model_id.split('ollama/', 1)[1]
    if raw_model_id.startswith('ollama.'):
        return raw_model_id.split('ollama.', 1)[1]
    return raw_model_id


def build_agent_model(model_id: Optional[str]) -> Any:
    resolved_provider = resolve_model_provider()
    resolved_model_id = model_id or ''

    if resolved_provider != MODEL_PROVIDER_OLLAMA:
        return resolved_model_id

    from strands.models import OllamaModel

    ollama_host = os.getenv('OLLAMA_BASE_URL') or os.getenv('OLLAMA_HOST')
    ollama_model_name = resolve_ollama_model_name(resolved_model_id)
    if not ollama_model_name:
        raise ValueError('OLLAMA model name is empty. Set MODEL_ID or OLLAMA_MODEL_ID.')

    return OllamaModel(
        host=ollama_host,
        model_id=ollama_model_name,
    )


def configure_provider_runtime() -> None:
    provider = resolve_model_provider()
    if provider != MODEL_PROVIDER_OLLAMA:
        return

    ollama_base_url = os.getenv('OLLAMA_BASE_URL')
    if ollama_base_url and not os.getenv('OLLAMA_HOST'):
        os.environ['OLLAMA_HOST'] = ollama_base_url


def extract_json_from_text(text: str, logger) -> Optional[Dict[str, Any]]:
    json_block_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
    if json_block_match:
        block_text = json_block_match.group(1).strip()
        try:
            parsed = json.loads(block_text)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError as error:
            logger.warning('Failed to parse JSON from code block', extra={'error': str(error)})

    decoder = json.JSONDecoder()
    candidates: list[tuple[Dict[str, Any], int]] = []
    for start_idx, char in enumerate(text):
        if char != '{':
            continue
        try:
            parsed, end_idx = decoder.raw_decode(text[start_idx:])
        except json.JSONDecodeError:
            continue

        if not isinstance(parsed, dict):
            continue

        candidates.append((parsed, end_idx))

    if candidates:
        if not is_fraud_output_contract_enabled():
            return max(candidates, key=lambda candidate: candidate[1])[0]

        schema_candidates = [
            candidate for candidate in candidates if REQUIRED_FRAUD_RESULT_KEYS.issubset(set(candidate[0].keys()))
        ]
        if schema_candidates:
            return max(schema_candidates, key=lambda candidate: candidate[1])[0]

        return max(candidates, key=lambda candidate: candidate[1])[0]

    logger.info('No valid JSON found in text')
    return None


def extract_response_text(response: Any) -> str:
    message = getattr(response, 'message', None)
    if not isinstance(message, dict):
        return str(response)

    content_blocks = message.get('content')
    if not isinstance(content_blocks, list):
        return json.dumps(message)

    text_parts = []
    for block in content_blocks:
        if isinstance(block, dict) and isinstance(block.get('text'), str):
            text_parts.append(block['text'])

    if text_parts:
        return '\n'.join(text_parts)

    return json.dumps(message)


def extract_response_message(response: Any) -> Dict[str, Any]:
    message = getattr(response, 'message', None)
    if isinstance(message, dict):
        return message
    return {'raw': str(response)}


def summarize_tool_usage_from_message(message: Dict[str, Any]) -> Dict[str, Any]:
    content_blocks = message.get('content', [])
    if not isinstance(content_blocks, list):
        return {'block_count': 0, 'tool_use_count': 0, 'tool_result_count': 0, 'tools': []}

    tool_names = []
    tool_result_count = 0
    for block in content_blocks:
        if not isinstance(block, dict):
            continue

        tool_use = block.get('toolUse') or block.get('tool_use')
        if isinstance(tool_use, dict):
            name = tool_use.get('name')
            if isinstance(name, str):
                tool_names.append(name)

        if block.get('toolResult') is not None or block.get('tool_result') is not None:
            tool_result_count += 1

    return {
        'block_count': len(content_blocks),
        'tool_use_count': len(tool_names),
        'tool_result_count': tool_result_count,
        'tools': tool_names,
    }


def is_empty_assistant_payload(payload: Any) -> bool:
    return (
        isinstance(payload, dict)
        and payload.get('role') == 'assistant'
        and isinstance(payload.get('content'), list)
        and len(payload.get('content', [])) == 0
    )


def build_final_json_retry_prompt() -> str:
    if is_fraud_output_contract_enabled():
        return (
            'Provide the final answer now as a single valid JSON object only. '
            'Do not call any tools. '
            'Use exactly these keys: risk_score, risk_level, findings, indicators, recommended_actions.'
        )

    return (
        'Provide the final answer now as a single valid JSON object only. '
        'Do not call any tools.'
    )


def is_complete_fraud_result(result: Dict[str, Any]) -> bool:
    if not isinstance(result, dict):
        return False
    if not REQUIRED_FRAUD_RESULT_KEYS.issubset(result.keys()):
        return False
    findings = result.get('findings')
    if not isinstance(findings, dict):
        return False
    return REQUIRED_FRAUD_FINDINGS_KEYS.issubset(findings.keys())


def build_required_tools_retry_prompt() -> str:
    return (
        'Your previous response was incomplete. '
        'You MUST run the full fraud tool sequence in this exact order: '
        '1) extract_document_fields, 2) analyze_metadata, 3) detect_anomalies, '
        '4) match_patterns, 5) lookup_vendor. '
        'After all tools complete, return ONLY valid JSON with keys: '
        'risk_score, risk_level, findings, indicators, recommended_actions. '
        'The findings object MUST include: metadata_analysis, pattern_matches, anomalies, database_checks.'
    )
