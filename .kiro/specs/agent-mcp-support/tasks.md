# Implementation Plan: Agent MCP Support

## Overview

This plan implements MCP (Model Context Protocol) server support as a feature addition to the existing agent framework constructs. The implementation follows the data flow: TypeScript types define the contract, CDK constructs serialize configs to environment variables, and the Python runtime deserializes and connects to MCP servers.

The work is organized in phases:
1. **TypeScript types and enums** — Define the CDK-layer contract
2. **CDK construct changes** — BaseAgent, BatchAgent, InteractiveAgent modifications
3. **Python runtime** — Pydantic model, utility functions, handler integration
4. **Package dependencies** — Add `mcp` and `bedrock-agentcore-identity` packages
5. **Testing** — CDK unit tests, Python unit tests, property-based tests, CDK Nag tests
6. **Documentation** — JSDoc, README updates, usage examples

## Tasks

- [x] 1. Define TypeScript types and enums for MCP configuration
  - [x] 1.1 Add `McpTransportType` enum, `McpAuthFlow` enum, and `McpServerConfig` interface to `use-cases/framework/agents/base-agent.ts`
    - Define `McpTransportType` enum with `STREAMABLE_HTTP` and `SSE` values
    - Define `McpAuthFlow` enum with `M2M` and `USER_FEDERATION` values
    - Define `McpServerConfig` interface with fields: `name`, `url`, `transportType`, `headers?`, `credentialProviderName?`, `authScopes?`, `authFlow?`
    - Add comprehensive JSDoc comments with `@example` blocks for all three auth tiers (plain headers, Secrets Manager ARN, AgentCore Identity)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_
  - [x] 1.2 Add optional `mcpServers` field to `AgentDefinitionProps` interface
    - Add `readonly mcpServers?: McpServerConfig[]` field to `AgentDefinitionProps`
    - Add JSDoc comment explaining MCP server tool discovery and merging behavior
    - Add `@default - No MCP servers configured`
    - _Requirements: 1.1, 1.10_
  - [x] 1.3 Export new types from `use-cases/framework/agents/index.ts`
    - Export `McpTransportType`, `McpAuthFlow`, `McpServerConfig` from the agents index
    - Verify exports are available from the top-level `use-cases/index.ts`
    - _Requirements: 1.2, 1.4, 1.5_

- [x] 2. Implement BaseAgent MCP support
  - [x] 2.1 Add protected `mcpServerConfigs` field and `extractSecretArns` helper to `BaseAgent`
    - Add `protected readonly mcpServerConfigs: McpServerConfig[]` field
    - Initialize from `props.agentDefinition.mcpServers ?? []` in constructor
    - Add `private extractSecretArns(configs: McpServerConfig[]): string[]` method that scans header values for `arn:aws:secretsmanager:` prefixes
    - _Requirements: 2.1_
  - [x] 2.2 Grant Secrets Manager IAM permissions for detected ARN references
    - After extracting secret ARNs, add `secretsmanager:GetSecretValue` policy statement scoped to the specific ARNs
    - Only add the policy when ARNs are detected (no empty policy statements)
    - _Requirements: 3.1, 3.2_
  - [x] 2.3 Grant AgentCore Identity IAM permissions when credential providers are configured
    - Check if any MCP server config has `credentialProviderName` set
    - If so, add `bedrock-agentcore:*` policy statement with `*` resource
    - Only add the policy when credential providers are detected
    - _Requirements: 11.10_

- [x] 3. Implement BatchAgent MCP environment variables
  - [x] 3.1 Set `MCP_SERVERS_CONFIG` and `MCP_DEFAULT_AUTH_FLOW` environment variables in BatchAgent constructor
    - After the existing knowledge base env var block, add a conditional block: if `this.mcpServerConfigs.length > 0`, set `env.MCP_SERVERS_CONFIG = JSON.stringify(this.mcpServerConfigs)` and `env.MCP_DEFAULT_AUTH_FLOW = 'M2M'`
    - Ensure JSON serialization includes all fields (name, url, transportType, headers, credentialProviderName, authScopes, authFlow) with optional fields omitted when not set
    - _Requirements: 2.2, 2.4, 2.5, 11.7_

- [x] 4. Implement InteractiveAgent MCP environment variables
  - [x] 4.1 Set `MCP_SERVERS_CONFIG` and `MCP_DEFAULT_AUTH_FLOW` environment variables in InteractiveAgent
    - Add the same conditional block as BatchAgent but with `MCP_DEFAULT_AUTH_FLOW = 'USER_FEDERATION'`
    - Apply to both Lambda hosting path and AgentCore Runtime hosting path (container env vars)
    - _Requirements: 2.3, 2.4, 2.5, 11.7_

- [x] 5. Checkpoint — Verify CDK layer compiles and existing tests pass
  - Ensure all TypeScript changes compile without errors
  - Run existing agent tests: `npm test -- --testPathPattern="batch-agent"`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add Python package dependencies
  - [x] 6.1 Add `mcp` and `bedrock-agentcore-identity` to Lambda requirements.txt
    - Add `mcp` package to `use-cases/framework/agents/resources/default-strands-agent/requirements.txt`
    - Add `bedrock-agentcore-identity` package to the same file
    - _Requirements: 4.1, 11.11_
  - [x] 6.2 Add `mcp` and `bedrock-agentcore-identity` to AgentCore container requirements.txt
    - Add `mcp` package to `use-cases/framework/agents/resources/agentcore-agent-handler/requirements.txt`
    - Add `bedrock-agentcore-identity` package to the same file
    - _Requirements: 4.2, 11.11_

- [x] 7. Implement Python Pydantic model for MCP configuration
  - [x] 7.1 Add `McpServerConfig` Pydantic model to `models.py`
    - Add `McpServerConfig(BaseModel)` class to `use-cases/framework/agents/resources/default-strands-agent/models.py`
    - Fields: `name: str`, `url: str`, `transportType: str`, `headers: dict[str, str] | None = None`, `credentialProviderName: str | None = None`, `authScopes: list[str] | None = None`, `authFlow: str | None = None`
    - _Requirements: 10.1, 10.2_

- [x] 8. Implement Python MCP utility functions
  - [x] 8.1 Add `parse_mcp_servers_config()` function to `utils.py`
    - Parse `MCP_SERVERS_CONFIG` JSON string into list of `McpServerConfig` objects
    - Return empty list for empty string, missing value, or invalid JSON (log error for invalid JSON)
    - Skip individual entries missing required fields (`name`, `url`, `transportType`) with a logged warning
    - _Requirements: 5.1, 10.2, 10.4, 10.5_
  - [x] 8.2 Add `resolve_secrets_manager_headers()` function to `utils.py`
    - Accept a headers dict and a boto3 Secrets Manager client
    - For each header value starting with `arn:aws:secretsmanager:`, call `GetSecretValue` and replace with the secret string
    - Pass through all other header values unchanged
    - Return the resolved headers dict
    - Log warning and return `None` for the header if resolution fails
    - _Requirements: 3.3, 3.4, 3.5_
  - [x] 8.3 Add `resolve_agentcore_identity_token()` function to `utils.py`
    - Accept credential provider name, auth flow string, and optional auth scopes
    - Use the `bedrock-agentcore-identity` SDK to obtain an OAuth access token
    - Return the access token string
    - Raise exception on failure (caller handles logging and skipping)
    - _Requirements: 11.1, 11.2, 11.3, 11.8_
  - [x] 8.4 Add `create_mcp_client_for_config()` function to `utils.py`
    - Accept a single `McpServerConfig`, default auth flow string, and a boto3 Secrets Manager client
    - Resolve Secrets Manager ARN references in headers
    - If `credentialProviderName` is set, resolve AgentCore Identity token and set `Authorization: Bearer <token>` header (takes precedence over headers for auth)
    - Determine auth flow: use explicit `authFlow` if set, otherwise use default auth flow
    - Create and return an `MCPClient` instance configured with the resolved headers and transport type
    - Log warning and return `None` if any resolution step fails
    - _Requirements: 3.6, 5.2, 11.4, 11.5, 11.6, 11.9, 11.12_

- [x] 9. Integrate MCP into batch handler (`batch.py`)
  - [x] 9.1 Add MCP client initialization with `contextlib.ExitStack` to `batch.py` handler
    - Import `contextlib` and new utility functions at module level
    - Read `MCP_SERVERS_CONFIG` and `MCP_DEFAULT_AUTH_FLOW` env vars at module level (cold start)
    - In the `handler` function, parse MCP configs, create MCPClient instances inside an `ExitStack`
    - Call `list_tools_sync()` on each successfully created client to discover tools
    - Merge MCP tools with existing `AGENT_TOOLS + [file_read]` when creating the Agent
    - Log warnings for failed MCP server connections with structured fields (server_name, server_url, error_type, error)
    - Ensure `ExitStack` closes all MCP clients on handler exit (success or failure)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4_

- [x] 10. Integrate MCP into AgentCore handler (`main.py`)
  - [x] 10.1 Add MCP client initialization to AgentCore handler `handle_invocation`
    - Apply the same MCP integration pattern as `batch.py` to `use-cases/framework/agents/resources/agentcore-agent-handler/main.py`
    - Read `MCP_SERVERS_CONFIG` and `MCP_DEFAULT_AUTH_FLOW` env vars at module level
    - In `handle_invocation`, parse configs, create MCPClient instances, discover tools, merge with existing tools
    - Use `contextlib.AsyncExitStack` (or `ExitStack` if MCPClient supports sync context manager) for async handler compatibility
    - Ensure all MCP clients are closed after the invocation completes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.2, 6.3, 6.4_

- [x] 11. Checkpoint — Verify Python changes and CDK compilation
  - Ensure all TypeScript changes still compile: `npx tsc --noEmit`
  - Verify Python files have no syntax errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Write CDK unit tests for MCP support
  - [x] 12.1 Add MCP-specific test cases to `use-cases/framework/tests/batch-agent.test.ts`
    - Test: BatchAgent sets `MCP_SERVERS_CONFIG` env var with correct JSON when `mcpServers` is provided
    - Test: BatchAgent sets `MCP_DEFAULT_AUTH_FLOW=M2M` when `mcpServers` is provided
    - Test: BatchAgent does NOT set `MCP_SERVERS_CONFIG` when `mcpServers` is absent
    - Test: BatchAgent does NOT set `MCP_SERVERS_CONFIG` when `mcpServers` is empty array
    - Test: `MCP_SERVERS_CONFIG` JSON contains all fields (name, url, transportType, headers, credentialProviderName, authScopes, authFlow)
    - Test: Secrets Manager IAM policy is scoped to specific ARNs detected in headers
    - Test: AgentCore Identity IAM policy (`bedrock-agentcore:*`) is granted when `credentialProviderName` is present
    - Test: No Secrets Manager or AgentCore Identity IAM policies when no MCP servers configured
    - Test: Backward compatibility — template output identical when `mcpServers` is not provided (compare with existing test baseline)
    - Test: MCP servers coexist with S3 tools and knowledge bases (all env vars present)
    - _Requirements: 2.2, 2.4, 2.5, 3.2, 7.1, 7.4, 11.7, 11.10_
  - [x] 12.2 Add MCP-specific test cases for InteractiveAgent
    - Test: InteractiveAgent sets `MCP_SERVERS_CONFIG` and `MCP_DEFAULT_AUTH_FLOW=USER_FEDERATION`
    - Test: InteractiveAgent does NOT set MCP env vars when `mcpServers` is absent
    - Test: MCP env vars are set on both Lambda and AgentCore Runtime hosting paths
    - _Requirements: 2.3, 11.7_

- [ ] 13. Write Python unit tests for MCP utility functions
  - [ ] 13.1 Create `test_mcp_utils.py` in `use-cases/framework/agents/resources/default-strands-agent/`
    - Test `parse_mcp_servers_config()`: valid JSON, invalid JSON, empty string, missing required fields, mixed valid/invalid entries
    - Test `resolve_secrets_manager_headers()`: ARN values resolved, plain values passed through, resolution failure handling (mock boto3)
    - Test `resolve_agentcore_identity_token()`: M2M flow, USER_FEDERATION flow, with scopes, failure handling (mock SDK)
    - Test `create_mcp_client_for_config()`: plain headers, Secrets Manager headers, AgentCore Identity, credential provider precedence over headers, explicit auth flow override, default auth flow fallback (mock MCPClient)
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 5.1, 10.2, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.8, 11.9, 11.12_

- [ ] 14. Write property-based tests for MCP configuration
  - [ ]* 14.1 Write property test for serialization round-trip (Property 1)
    - **Property 1: Serialization Round-Trip**
    - Use Hypothesis to generate arbitrary valid `McpServerConfig` objects with random combinations of optional fields
    - Serialize to JSON via `json.dumps()`, then parse with `McpServerConfig.model_validate_json()`
    - Assert all fields are equivalent after round-trip
    - Minimum 100 iterations
    - **Validates: Requirements 2.4, 10.1, 10.2, 10.3**
  - [ ]* 14.2 Write property test for config validation skipping invalid entries (Property 4)
    - **Property 4: Config Validation Skips Invalid Entries**
    - Use Hypothesis to generate lists of config dicts with randomly missing required fields
    - Assert `parse_mcp_servers_config()` returns only entries with all required fields present
    - Assert skipped entries count matches entries with missing fields
    - Minimum 100 iterations
    - **Validates: Requirements 10.5**
  - [ ]* 14.3 Write property test for explicit auth flow override (Property 5)
    - **Property 5: Explicit Auth Flow Override**
    - Use Hypothesis to generate all combinations of explicit `authFlow` and `MCP_DEFAULT_AUTH_FLOW`
    - Assert explicit `authFlow` always wins over default
    - Assert default is used when `authFlow` is not specified
    - Minimum 100 iterations
    - **Validates: Requirements 11.6**

- [x] 15. Write CDK Nag tests for MCP-configured agents
  - [ ]* 15.1 Add CDK Nag test for BatchAgent with MCP servers
    - Create a BatchAgent with MCP servers configured (including Secrets Manager ARN and credentialProviderName)
    - Apply `AwsSolutionsChecks` and verify it passes with documented suppressions
    - Verify IAM permissions follow least-privilege (scoped Secrets Manager ARNs)
    - _Requirements: 3.2, 11.10_
  - [ ]* 15.2 Add CDK Nag test for InteractiveAgent with MCP servers
    - Same pattern as BatchAgent Nag test but for InteractiveAgent
    - _Requirements: 3.2, 11.10_

- [x] 16. Update documentation
  - [x] 16.1 Update agents README.md with MCP support section
    - Add "MCP Server Support" section to `use-cases/framework/agents/README.md`
    - Include usage examples for all three auth tiers: plain headers, Secrets Manager ARN, AgentCore Identity
    - Document the `McpTransportType` and `McpAuthFlow` enums
    - Document graceful degradation behavior
    - Document networking considerations (VPC for private MCP servers)
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 17. Final checkpoint — Full test suite
  - Run full CDK test suite: `npm test -- --testPathPattern="batch-agent|interactive-agent|agent-knowledge-base"`
  - Run CDK Nag tests: `npm test -- --testPathPattern="nag.test"`
  - Verify Python tests pass in virtual environment
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript for CDK constructs and Python for runtime — no language selection needed
- CDK unit tests use `createTestApp()` to skip bundling for fast execution
- Python tests use virtual environments with `hypothesis`, `moto`, and `pytest`
