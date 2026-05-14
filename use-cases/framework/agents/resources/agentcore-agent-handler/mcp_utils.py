# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
MCP (Model Context Protocol) utility functions for the AgentCore handler.

Provides parsing, secret resolution, token retrieval, and MCPClient creation
for MCP server configurations passed via the MCP_SERVERS_CONFIG env var.
"""

import asyncio
import json
import logging

import boto3

from models import McpServerConfig

logger = logging.getLogger(__name__)

SECRETS_MANAGER_ARN_PREFIX = 'arn:aws:secretsmanager:'


def parse_mcp_servers_config(config_json: str) -> list[McpServerConfig]:
    """Parse MCP_SERVERS_CONFIG JSON string into list of McpServerConfig objects.

    Returns an empty list for empty string, missing value, or invalid JSON.
    Skips individual entries missing required fields (name, url, transportType)
    with a logged warning.

    Args:
        config_json: JSON string from the MCP_SERVERS_CONFIG environment variable.

    Returns:
        List of validated McpServerConfig objects.
    """
    if not config_json:
        return []

    try:
        raw_configs = json.loads(config_json)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.error('Failed to parse MCP_SERVERS_CONFIG JSON', extra={
            'error': str(exc),
            'error_type': type(exc).__name__,
        })
        return []

    if not isinstance(raw_configs, list):
        logger.error('MCP_SERVERS_CONFIG is not a JSON array', extra={
            'actual_type': type(raw_configs).__name__,
        })
        return []

    configs: list[McpServerConfig] = []
    required_fields = ('name', 'url', 'transportType')

    for idx, entry in enumerate(raw_configs):
        if not isinstance(entry, dict):
            logger.warning('MCP server config entry is not a dict, skipping', extra={
                'index': idx,
                'actual_type': type(entry).__name__,
            })
            continue

        missing = [f for f in required_fields if f not in entry or not entry[f]]
        if missing:
            logger.warning('MCP server config entry missing required fields, skipping', extra={
                'index': idx,
                'missing_fields': missing,
                'entry_name': entry.get('name', '<unknown>'),
            })
            continue

        try:
            configs.append(McpServerConfig.model_validate(entry))
        except Exception as exc:
            logger.warning('MCP server config entry validation failed, skipping', extra={
                'index': idx,
                'entry_name': entry.get('name', '<unknown>'),
                'error': str(exc),
            })

    return configs


def resolve_secrets_manager_headers(
    headers: dict[str, str],
    secrets_client,
) -> dict[str, str]:
    """Resolve Secrets Manager ARN references in header values.

    For each header value starting with ``arn:aws:secretsmanager:``, calls
    ``GetSecretValue`` and replaces the value with the secret string.
    All other header values are passed through unchanged.

    If resolution fails for a specific header, a warning is logged and the
    header is omitted from the result.

    Args:
        headers: Header name-value mapping, potentially containing ARN references.
        secrets_client: A boto3 Secrets Manager client.

    Returns:
        A new dict with ARN references replaced by their resolved secret values.
        Headers whose resolution failed are omitted from the result.
    """
    resolved: dict[str, str] = {}

    for key, value in headers.items():
        if value.startswith(SECRETS_MANAGER_ARN_PREFIX):
            try:
                response = secrets_client.get_secret_value(SecretId=value)
                resolved[key] = response['SecretString']
            except Exception as exc:
                logger.warning('Failed to resolve Secrets Manager ARN for header', extra={
                    'header_name': key,
                    'secret_arn': value,
                    'error_type': type(exc).__name__,
                    'error': str(exc),
                })
        else:
            resolved[key] = value

    return resolved


def resolve_agentcore_identity_token(
    credential_provider_name: str,
    auth_flow: str,
    auth_scopes: list[str] | None = None,
) -> str:
    """Obtain an OAuth access token from AgentCore Identity.

    Uses the ``bedrock-agentcore-identity`` SDK's ``@requires_access_token``
    decorator pattern to retrieve a token from the named credential provider.

    Args:
        credential_provider_name: Name of the pre-configured AgentCore Identity
            credential provider.
        auth_flow: Authentication flow — ``'M2M'`` for client credentials or
            ``'USER_FEDERATION'`` for authorization code.
        auth_scopes: Optional list of OAuth scopes to request.

    Returns:
        The OAuth access token string.

    Raises:
        Exception: If token retrieval fails for any reason.
    """
    from bedrock_agentcore.identity.auth import requires_access_token

    scopes = auth_scopes or []

    @requires_access_token(
        provider_name=credential_provider_name,
        scopes=scopes,
        auth_flow=auth_flow,
    )
    async def _get_token(*, access_token: str) -> str:
        return access_token

    token = asyncio.get_event_loop().run_until_complete(_get_token())
    return token


def create_mcp_client_for_config(
    config: McpServerConfig,
    default_auth_flow: str,
    secrets_client=None,
) -> 'MCPClient | None':
    """Create an MCPClient instance for a single MCP server configuration.

    Resolves Secrets Manager ARN references in headers and, when a
    ``credentialProviderName`` is set, obtains an AgentCore Identity OAuth
    token that takes precedence over any ``Authorization`` header.

    Args:
        config: A validated MCP server configuration.
        default_auth_flow: The default auth flow (``'M2M'`` or
            ``'USER_FEDERATION'``) used when the config does not specify one.
        secrets_client: A boto3 Secrets Manager client. If ``None`` and
            headers contain ARN references, a default client is created.

    Returns:
        A configured ``MCPClient`` instance ready to be used as a context
        manager, or ``None`` if any resolution step fails.
    """
    from strands.tools.mcp import MCPClient

    try:
        # Start with a copy of the headers (or empty dict)
        headers: dict[str, str] = dict(config.headers) if config.headers else {}

        # Resolve Secrets Manager ARN references in headers
        has_secret_arns = any(
            v.startswith(SECRETS_MANAGER_ARN_PREFIX) for v in headers.values()
        )
        if has_secret_arns:
            if secrets_client is None:
                secrets_client = boto3.client('secretsmanager')
            headers = resolve_secrets_manager_headers(headers, secrets_client)

        # Resolve AgentCore Identity token if credential provider is configured
        if config.credentialProviderName:
            auth_flow = config.authFlow if config.authFlow else default_auth_flow
            try:
                token = resolve_agentcore_identity_token(
                    credential_provider_name=config.credentialProviderName,
                    auth_flow=auth_flow,
                    auth_scopes=config.authScopes,
                )
                # Credential provider token takes precedence over headers
                headers['Authorization'] = f'Bearer {token}'
            except Exception as exc:
                logger.warning('Failed to resolve AgentCore Identity token, skipping MCP server', extra={
                    'server_name': config.name,
                    'credential_provider_name': config.credentialProviderName,
                    'error_type': type(exc).__name__,
                    'error': str(exc),
                })
                return None

        # Build the transport factory based on transport type.
        resolved_headers = headers if headers else None
        server_url = config.url

        if config.transportType == 'STREAMABLE_HTTP':
            from mcp.client.streamable_http import streamablehttp_client
            transport_factory = lambda _u=server_url, _h=resolved_headers: streamablehttp_client(
                url=_u,
                headers=_h,
            )
        elif config.transportType == 'SSE':
            from mcp.client.sse import sse_client
            transport_factory = lambda _u=server_url, _h=resolved_headers: sse_client(
                url=_u,
                headers=_h,
            )
        else:
            logger.warning('Unsupported MCP transport type, skipping server', extra={
                'server_name': config.name,
                'transport_type': config.transportType,
            })
            return None

        return MCPClient(transport_factory)

    except Exception as exc:
        logger.warning('Failed to create MCP client, skipping server', extra={
            'server_name': config.name,
            'server_url': config.url,
            'error_type': type(exc).__name__,
            'error': str(exc),
        })
        return None
