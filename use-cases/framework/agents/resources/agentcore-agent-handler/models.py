# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from pydantic import BaseModel


class McpServerConfig(BaseModel):
    """MCP server configuration parsed from MCP_SERVERS_CONFIG env var."""
    name: str
    url: str
    transportType: str  # 'STREAMABLE_HTTP' or 'SSE'
    headers: dict[str, str] | None = None
    credentialProviderName: str | None = None
    authScopes: list[str] | None = None
    authFlow: str | None = None  # 'M2M' or 'USER_FEDERATION'
