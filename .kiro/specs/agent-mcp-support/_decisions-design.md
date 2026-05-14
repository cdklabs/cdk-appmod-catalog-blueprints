# Decisions: Design — Agent MCP Support

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## CDK Construct Architecture

### Props Extension Strategy

**Question:** How should `McpServerConfig` be added to the existing props hierarchy?

**Options:**
1. Add to `AgentDefinitionProps` (Kiro Recommended): Add an optional `mcpServers` field to `AgentDefinitionProps`, following the existing pattern where `tools`, `knowledgeBases`, and `lambdaLayers` live. BaseAgent stores configs as a protected field; BatchAgent and InteractiveAgent serialize to env vars. This mirrors the `knowledgeBases` pattern exactly.
2. Add to `BaseAgentProps`: Put MCP config at the top-level agent props rather than inside `agentDefinition`. Breaks the existing pattern where runtime capabilities live in `AgentDefinitionProps`.
3. Separate MCP props interface: Create a standalone `McpAgentProps` mixin. More flexible but adds complexity and diverges from existing patterns.
4. Other (please specify): _______________________

**Answer:** Option 1 — Add to `AgentDefinitionProps` following the existing `knowledgeBases` pattern.

---

### IAM Permission Granting

**Question:** How should IAM permissions for Secrets Manager and AgentCore Identity be granted?

**Options:**
1. BaseAgent constructor scans configs (Kiro Recommended): In the BaseAgent constructor, iterate over `mcpServers` to detect Secrets Manager ARN references in headers and `credentialProviderName` fields. Grant scoped `secretsmanager:GetSecretValue` for detected ARNs and `bedrock-agentcore:*` for AgentCore Identity. This follows the existing pattern where BaseAgent grants KB permissions in the constructor.
2. Subclass-level grants: Let BatchAgent and InteractiveAgent handle IAM grants. Duplicates logic across subclasses.
3. Explicit grant methods: Require developers to call `agent.grantMcpAccess()` manually. More control but breaks the "batteries included" pattern.
4. Other (please specify): _______________________

**Answer:** Option 1 — BaseAgent constructor scans configs and grants permissions automatically.

---

## Python Runtime Architecture

### MCP Config Parsing Location

**Question:** Where should MCP configuration parsing and MCPClient creation logic live?

**Options:**
1. New functions in `utils.py` + model in `models.py` (Kiro Recommended): Add `McpServerConfig` Pydantic model to `models.py`, add `parse_mcp_servers_config()`, `resolve_secrets_manager_headers()`, and `create_mcp_clients()` functions to `utils.py`. This follows the existing pattern where `convert_tools_config_into_model()` and `download_tools()` live in `utils.py`.
2. New dedicated `mcp_utils.py` module: Separate MCP logic into its own file. Cleaner separation but adds a new module to maintain.
3. Inline in handler files: Put MCP logic directly in `batch.py` and `main.py`. Duplicates code between Lambda and AgentCore handlers.
4. Other (please specify): _______________________

**Answer:** Option 1 — New functions in `utils.py` + Pydantic model in `models.py`. Follows existing patterns.

---

### MCP Client Lifecycle in Handlers

**Question:** How should MCP clients be managed within the Lambda handler and AgentCore handler?

**Options:**
1. Nested context managers in handler (Kiro Recommended): Use `contextlib.ExitStack` to manage multiple MCPClient context managers. Create clients, call `list_tools_sync()`, merge tools, create Agent, invoke, then ExitStack closes all clients on exit. This handles both success and failure paths cleanly.
2. Manual try/finally: Manually track and close each MCPClient in a try/finally block. More verbose but explicit.
3. Wrapper class: Create an `McpToolLoader` class that encapsulates the lifecycle. Cleaner API but adds abstraction.
4. Other (please specify): _______________________

**Answer:** Option 1 — `contextlib.ExitStack` for clean multi-client lifecycle management.

---

### AgentCore Identity Token Injection

**Question:** How should OAuth tokens from AgentCore Identity be injected into MCP connections?

**Options:**
1. Pre-resolve tokens before creating MCPClient (Kiro Recommended): Before creating each MCPClient, check if `credentialProviderName` is set. If so, call the `bedrock-agentcore-identity` SDK to get an access token, then inject it as an `Authorization: Bearer <token>` header. This keeps the MCPClient creation simple — it just sees headers.
2. Custom transport wrapper: Wrap the MCP transport to inject tokens on each request. More dynamic (handles token refresh mid-connection) but adds complexity.
3. Lazy token resolution: Resolve tokens only when the first MCP tool is called. Delays errors but reduces startup time when MCP tools aren't used.
4. Other (please specify): _______________________

**Answer:** Option 1 — Pre-resolve tokens before creating MCPClient. Simple and follows the pattern of resolving Secrets Manager values before connection.

---

## Default Auth Flow Strategy

### Agent-Type Default Auth Flow

**Question:** How should the default auth flow be communicated from CDK to the Python runtime?

**Options:**
1. `MCP_DEFAULT_AUTH_FLOW` env var (Kiro Recommended): BatchAgent sets `MCP_DEFAULT_AUTH_FLOW=M2M`, InteractiveAgent sets `MCP_DEFAULT_AUTH_FLOW=USER_FEDERATION`. The Python runtime reads this env var as the fallback when a server config doesn't specify `authFlow`. This follows the pattern of agent-type-specific env vars like `INVOKE_TYPE`.
2. Embed default in each server config: The CDK construct fills in the default `authFlow` on each McpServerConfig before serialization. Simpler runtime logic but mixes CDK defaults with user config.
3. Runtime auto-detection: The Python runtime infers the agent type from other env vars (e.g., `INVOKE_TYPE`). Fragile coupling between unrelated env vars.
4. Other (please specify): _______________________

**Answer:** Option 1 — `MCP_DEFAULT_AUTH_FLOW` env var set by each concrete agent class.

---

## Correctness Properties Strategy

### Property-Based Testing

**Question:** Should the design document include formal correctness properties for property-based testing?

**Options:**
1. Essential properties only (Kiro Recommended): Include properties for the core serialization round-trip (CDK → JSON → Python), config validation, and graceful degradation. These are pure-function properties that benefit from PBT. Skip properties for CDK resource creation (use snapshot/unit tests) and MCP connection lifecycle (use integration tests).
2. Skip correctness properties: Focus on architecture and implementation only. Faster but misses the serialization round-trip property which is high-value.
3. Comprehensive properties: Full prework analysis for all 11 requirements. Thorough but many requirements are CDK infrastructure (not suitable for PBT).
4. Other (please specify): _______________________

**Answer:** Option 1 — Essential properties for serialization round-trip, config validation, and graceful degradation.

---

## Error Handling Strategy

### Structured Logging for MCP Failures

**Question:** How should MCP connection failures be logged?

**Options:**
1. AWS Lambda Powertools Logger with structured fields (Kiro Recommended): Use the existing `Logger` instance with `extra` fields for server name, URL, error type, and error message. This follows the existing pattern in `batch.py` where all logging uses Powertools structured logging.
2. Standard Python logging: Use `logging.getLogger()` with formatted strings. Simpler but loses structured query capability.
3. Custom error event format: Define a specific error event schema for MCP failures. More structured but adds maintenance overhead.
4. Other (please specify): _______________________

**Answer:** Option 1 — AWS Lambda Powertools Logger with structured fields, following existing patterns.

---

**Reference:** Previous `_decisions-requirements.md` for alignment.
**After confirmation:** Generate `.kiro/specs/agent-mcp-support/design.md` from these decisions.
