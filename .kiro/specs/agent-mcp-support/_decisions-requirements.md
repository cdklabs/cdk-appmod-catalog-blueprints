# Decisions: Requirements — Agent MCP Support

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Construct Work Type

### Feature Addition Scope

**Question:** This is a feature addition to the existing agent constructs (BaseAgent, BatchAgent, InteractiveAgent). Which constructs should receive MCP support?

**Options:**
1. All agent constructs (Kiro Recommended): Add MCP server configuration to `AgentDefinitionProps` in BaseAgent, with runtime integration in both BatchAgent and InteractiveAgent. This follows the existing pattern where tools are defined at the base level and consumed by concrete implementations.
2. BatchAgent only: Start with BatchAgent since it has the simplest runtime (single invocation). Add InteractiveAgent later.
3. BatchAgent + InteractiveAgent separately: Add MCP support independently to each concrete agent, not through BaseAgent.
4. Other (please specify): _______________________

**Answer:** Option 1 — All agent constructs. MCP server configuration added to `AgentDefinitionProps` in BaseAgent, consumed by both BatchAgent and InteractiveAgent (Lambda and AgentCore Runtime hosting).

---

## MCP Transport Support

### Supported Transport Types

**Question:** MCP supports multiple transports (stdio, SSE, Streamable HTTP). Which transports should be supported for Lambda-hosted agents?

**Options:**
1. Streamable HTTP + SSE (Kiro Recommended): These are the practical transports for Lambda environments. Streamable HTTP is the modern standard; SSE is widely supported by existing MCP servers. Both connect to remote HTTP endpoints, which works well from Lambda.
2. Streamable HTTP only: The newest MCP transport, but some existing MCP servers only support SSE.
3. All transports (stdio + SSE + Streamable HTTP): Maximum flexibility, but stdio requires spawning subprocesses in Lambda which adds complexity and cold start time.
4. Other (please specify): _______________________

**Answer:** Option 1 — Streamable HTTP + SSE. These are the practical HTTP-based transports for both Lambda and AgentCore Runtime environments.

---

## MCP Server Configuration Model

### Configuration Approach

**Question:** How should developers specify MCP server connections in CDK props?

**Options:**
1. Typed configuration objects (Kiro Recommended): Define an `McpServerConfig` interface with typed fields for endpoint URL, transport type, optional auth headers, and optional name/description. This follows the existing pattern of `AgentDefinitionProps` with typed, documented fields. Example:
   ```typescript
   mcpServers: [{
     name: 'my-server',
     transportType: McpTransportType.STREAMABLE_HTTP,
     url: 'https://mcp.example.com/mcp',
     headers: { 'Authorization': 'Bearer token' }
   }]
   ```
2. Simple URL-based configuration: Just accept an array of URLs, auto-detect transport type. Simpler but less explicit.
3. Full MCP client configuration passthrough: Accept raw MCP client configuration JSON that gets passed directly to the Python runtime. Maximum flexibility but no type safety.
4. Other (please specify): _______________________

**Answer:** Option 1 — Typed configuration objects with `McpServerConfig` interface, `McpTransportType` enum, and typed fields for name, URL, transport type, and optional headers.

---

## Authentication and Secrets

### MCP Server Authentication

**Question:** MCP servers often require authentication (API keys, bearer tokens). How should secrets be handled?

**Options:**
1. Environment variables with optional Secrets Manager references (Kiro Recommended): Allow developers to pass auth headers as plain strings (for non-sensitive values) or as Secrets Manager ARNs that the runtime resolves. This follows AWS best practices for secret management in Lambda. The construct would grant the agent role read access to referenced secrets.
2. Plain environment variables only: Simple but secrets end up in CloudFormation templates and Lambda console. Acceptable for development but not production.
3. Secrets Manager only: All auth values must come from Secrets Manager. More secure but adds friction for development/testing.
4. Other (please specify): _______________________

**Answer:** Option 1 — Environment variables with optional Secrets Manager ARN references. The construct grants the agent role `secretsmanager:GetSecretValue` for referenced secrets.

---

## IAM and Networking

### Network Access for MCP Servers

**Question:** MCP servers are accessed over HTTP. Should the construct handle networking concerns?

**Options:**
1. Leverage existing Network prop (Kiro Recommended): The BaseAgent already accepts an optional `network: Network` prop for VPC configuration. MCP servers accessed over the internet work without VPC. MCP servers on private networks require the existing VPC support. No new networking infrastructure is needed — just document the pattern.
2. Add MCP-specific VPC endpoint support: Create dedicated VPC endpoints for MCP server access. Overkill for HTTP-based MCP servers.
3. Add outbound security group rules: Automatically create security group rules for MCP server endpoints. Too opinionated and hard to maintain.
4. Other (please specify): _______________________

**Answer:** Option 1 — Leverage existing Network prop. No new networking infrastructure needed; document the VPC pattern for private MCP servers.

---

## Python Runtime Dependencies

### MCP Package Installation

**Question:** The Python `mcp` package needs to be available in the Lambda runtime. How should it be provided?

**Options:**
1. Add to requirements.txt (Kiro Recommended): Add `mcp` to the existing `requirements.txt` in `resources/default-strands-agent/`. The `PythonFunction` construct already handles pip install during bundling. This is the simplest approach and follows the existing pattern for `strands-agents`, `boto3`, etc.
2. Separate Lambda Layer: Package `mcp` as a Lambda Layer. Adds complexity but allows version pinning independent of the main package.
3. Conditional installation: Only install `mcp` when MCP servers are configured. Reduces cold start for agents that don't use MCP, but adds build complexity.
4. Other (please specify): _______________________

**Answer:** Option 1 — Add `mcp` to both `resources/default-strands-agent/requirements.txt` (Lambda) and `resources/agentcore-agent-handler/requirements.txt` (AgentCore container).

---

## MCP Connection Lifecycle

### Connection Management in Lambda

**Question:** MCP clients require proper lifecycle management (connect/disconnect). How should this be handled in the Lambda runtime?

**Options:**
1. Per-invocation connection with context manager (Kiro Recommended): Create MCP client connections at the start of each Lambda invocation and close them at the end, using Python's `with` statement. This is the safest approach for Lambda where the execution environment can be frozen/thawed unpredictably. Strands SDK's `MCPClient` supports this pattern natively.
2. Module-level persistent connections: Initialize MCP connections at module load (cold start) and reuse across invocations. Better performance but connections may go stale between invocations.
3. Hybrid approach: Try to reuse module-level connections, fall back to per-invocation if stale. More complex but optimal performance.
4. Other (please specify): _______________________

**Answer:** Option 1 — Per-invocation connection with context manager. Safest for both Lambda (freeze/thaw) and AgentCore Runtime (per-request isolation).

---

## Multiple MCP Servers

### Multi-Server Support

**Question:** Should agents support connecting to multiple MCP servers simultaneously?

**Options:**
1. Yes, multiple servers (Kiro Recommended): Accept an array of MCP server configurations. Each server's tools are collected and merged into the agent's tool set. This is the standard MCP pattern — agents typically connect to multiple specialized servers. The Strands SDK supports this via multiple `MCPClient` instances.
2. Single server only: Simpler implementation but limits real-world usefulness.
3. Multiple servers with namespacing: Prefix tool names with server name to avoid conflicts. Adds complexity but prevents tool name collisions.
4. Other (please specify): _______________________

**Answer:** Option 1 — Multiple servers via array of `McpServerConfig`. Each server's tools merged into the agent's tool set.

---

## Backward Compatibility

### Existing Agent Behavior

**Question:** How should MCP support interact with existing S3-based tools?

**Options:**
1. Additive and optional (Kiro Recommended): MCP servers are an optional addition alongside existing S3-based tools. When both are configured, the agent gets tools from both sources. When no MCP servers are configured, behavior is identical to today. The `mcpServers` prop is optional with no default.
2. Replace S3 tools: MCP servers replace the existing tool mechanism. Breaking change.
3. Mutually exclusive: Either S3 tools or MCP servers, not both. Simpler but limits flexibility.
4. Other (please specify): _______________________

**Answer:** Option 1 — Additive and optional. MCP servers coexist with existing S3-based tools. No breaking changes.

---

## Error Handling

### MCP Connection Failures

**Question:** How should the agent handle MCP server connection failures at runtime?

**Options:**
1. Fail gracefully with logging (Kiro Recommended): If an MCP server is unreachable, log a warning and continue with available tools (S3 tools + other MCP servers that connected successfully). This provides resilience — a single MCP server outage doesn't break the entire agent.
2. Fail fast: If any configured MCP server is unreachable, fail the Lambda invocation immediately. Strict but may cause unnecessary failures.
3. Configurable behavior: Let developers choose between fail-fast and graceful degradation per server. More flexible but adds configuration complexity.
4. Other (please specify): _______________________

**Answer:** Option 1 — Fail gracefully with logging. Log a warning for unreachable MCP servers and continue with available tools.

---
