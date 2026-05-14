# Requirements Document

## Introduction

This feature adds Model Context Protocol (MCP) server support to the existing agent constructs (BaseAgent, BatchAgent, InteractiveAgent). MCP is an open protocol that enables AI agents to connect to external tool servers over HTTP, expanding agent capabilities beyond locally-defined tools. This is a Type 3 construct feature addition — enhancing existing constructs with a new optional capability that follows established patterns (knowledge base integration, S3-based tools) while maintaining full backward compatibility.

The feature supports both Lambda-hosted agents (via PythonFunction) and AgentCore Runtime-hosted agents (via container), using the Strands SDK's first-class `MCPClient` support with `list_tools_sync()` and context manager patterns.

The feature provides a three-tier authentication model for MCP servers: (1) plain string headers for development and testing, (2) Secrets Manager ARN references for production static secrets, and (3) AgentCore Identity credential providers for OAuth-protected MCP servers with automatic token management and refresh.

## Glossary

- **MCP**: Model Context Protocol — an open standard for connecting AI agents to external tool servers over HTTP
- **MCP_Server**: A remote HTTP endpoint that exposes tools via the MCP protocol
- **MCPClient**: The Strands SDK class that connects to an MCP server, discovers tools, and manages the connection lifecycle
- **Streamable_HTTP**: The modern MCP transport using standard HTTP request/response with optional streaming
- **SSE**: Server-Sent Events — an older MCP transport using HTTP with event streaming, widely supported by existing MCP servers
- **BaseAgent**: The abstract CDK construct that provides common agent infrastructure (IAM role, encryption, tool management)
- **BatchAgent**: A concrete agent construct for single-invocation batch processing, hosted on Lambda
- **InteractiveAgent**: A concrete agent construct for real-time streaming conversations, hosted on Lambda or AgentCore Runtime
- **AgentCore_Runtime**: AWS Bedrock AgentCore managed container hosting for agents (microVM-based)
- **AgentDefinitionProps**: The TypeScript interface defining agent parameters (model, prompt, tools, knowledge bases)
- **McpServerConfig**: The new TypeScript interface defining MCP server connection parameters
- **MCP_SERVERS_CONFIG**: The environment variable containing JSON-serialized MCP server configurations passed to the runtime
- **Secrets_Manager**: AWS Secrets Manager service for storing and retrieving sensitive values like API keys
- **Context_Manager**: Python's `with` statement pattern for resource lifecycle management (connect on enter, disconnect on exit)
- **AgentCore_Identity**: AWS Bedrock AgentCore Identity service that provides OAuth token management for agents, including automatic token refresh and secure token vault storage
- **Credential_Provider**: A pre-configured AgentCore Identity resource that stores OAuth client credentials and authorization server details for obtaining access tokens
- **M2M_Auth_Flow**: Machine-to-machine authentication using OAuth 2.0 client credentials grant, where the agent authenticates as itself without user context
- **USER_FEDERATION_Auth_Flow**: User-delegated authentication using OAuth 2.0 authorization code grant, where the agent acts on behalf of a specific user
- **McpAuthFlow**: The TypeScript enum defining supported AgentCore Identity authentication flows for MCP servers (M2M, USER_FEDERATION)
- **MCP_DEFAULT_AUTH_FLOW**: The environment variable set by the agent construct (BatchAgent or InteractiveAgent) to communicate the agent-type-specific default auth flow to the Python runtime

## Requirements

### Requirement 1: MCP Server Configuration Interface

**User Story:** As a CDK developer, I want to define MCP server connections as typed configuration objects in my agent props, so that I get compile-time type safety and IDE autocompletion when configuring MCP servers.

#### Acceptance Criteria

1. THE AgentDefinitionProps interface SHALL include an optional `mcpServers` field that accepts an array of McpServerConfig objects
2. THE McpServerConfig interface SHALL include a required `name` field of type string to identify the MCP server
3. THE McpServerConfig interface SHALL include a required `url` field of type string for the MCP server endpoint URL
4. THE McpServerConfig interface SHALL include a required `transportType` field using the McpTransportType enum
5. THE McpTransportType enum SHALL define two values: `STREAMABLE_HTTP` and `SSE`
6. THE McpServerConfig interface SHALL include an optional `headers` field of type `Record<string, string>` for custom HTTP headers including authentication
7. THE McpServerConfig interface SHALL include an optional `credentialProviderName` field of type string for referencing a pre-configured AgentCore Identity credential provider
8. THE McpServerConfig interface SHALL include an optional `authScopes` field of type string array for specifying OAuth scopes when using AgentCore Identity
9. THE McpServerConfig interface SHALL include an optional `authFlow` field using the McpAuthFlow enum with values `M2M` (machine-to-machine client credentials) and `USER_FEDERATION` (user-delegated authorization code)
10. WHEN no `mcpServers` field is provided, THE BaseAgent SHALL behave identically to the current implementation with no MCP-related resources or environment variables created

### Requirement 2: MCP Configuration Serialization to Runtime

**User Story:** As a CDK developer, I want MCP server configurations to be automatically passed to the agent runtime as environment variables, so that the Python handler can discover and connect to MCP servers without manual wiring.

#### Acceptance Criteria

1. WHEN `mcpServers` is provided in AgentDefinitionProps, THE BaseAgent SHALL store the MCP server configurations as a protected field for subclass access
2. WHEN `mcpServers` is provided, THE BatchAgent SHALL set the `MCP_SERVERS_CONFIG` environment variable on the Lambda function with the JSON-serialized array of MCP server configurations
3. WHEN `mcpServers` is provided, THE InteractiveAgent SHALL set the `MCP_SERVERS_CONFIG` environment variable on the Lambda function or AgentCore Runtime container with the JSON-serialized array of MCP server configurations
4. THE JSON serialization SHALL include all McpServerConfig fields: name, url, transportType, headers (when present), credentialProviderName (when present), authScopes (when present), and authFlow (when present)
5. WHEN `mcpServers` is not provided or is an empty array, THE construct SHALL NOT set the `MCP_SERVERS_CONFIG` environment variable

### Requirement 3: Secrets Manager Integration for Static MCP Authentication

**User Story:** As a CDK developer, I want to reference Secrets Manager ARNs in MCP server header values, so that sensitive static credentials like API keys are not stored in plaintext in CloudFormation templates or Lambda environment variables. This covers Tier 1 (plain string headers for dev/testing) and Tier 2 (Secrets Manager ARN references for production static secrets) of the three-tier MCP authentication model.

#### Acceptance Criteria

1. WHEN a header value in McpServerConfig starts with `arn:aws:secretsmanager:`, THE construct SHALL treat it as a Secrets Manager ARN reference
2. WHEN Secrets Manager ARN references are detected, THE BaseAgent SHALL grant the agent IAM role `secretsmanager:GetSecretValue` permission scoped to the referenced secret ARNs
3. WHEN a header value does not start with `arn:aws:secretsmanager:`, THE construct SHALL pass it as a plain string value in the environment variable
4. THE Python runtime SHALL resolve Secrets Manager ARN references by calling `secretsmanager:GetSecretValue` at invocation time before establishing MCP connections
5. IF the Secrets Manager ARN resolution fails at runtime, THEN THE runtime SHALL log a warning and skip the MCP server that requires the unresolvable secret
6. WHEN `credentialProviderName` is set on the same McpServerConfig, THE construct SHALL ignore the `headers` field for authentication purposes, as AgentCore Identity (Requirement 11) takes precedence over static headers

### Requirement 4: Python MCP Package Dependency

**User Story:** As a CDK developer, I want the `mcp` Python package to be automatically available in the agent runtime, so that I do not need to manage MCP dependencies separately.

#### Acceptance Criteria

1. THE `mcp` package SHALL be listed in `resources/default-strands-agent/requirements.txt` for Lambda-hosted agents
2. THE `mcp` package SHALL be listed in `resources/agentcore-agent-handler/requirements.txt` for AgentCore Runtime-hosted agents
3. WHEN the agent Lambda function or container is built, THE bundling process SHALL install the `mcp` package alongside existing dependencies (strands-agents, boto3, etc.)

### Requirement 5: Per-Invocation MCP Connection Lifecycle

**User Story:** As a CDK developer, I want MCP connections to be created and destroyed per invocation, so that connections are reliably managed in Lambda's freeze/thaw environment and AgentCore's per-request model.

#### Acceptance Criteria

1. WHEN the `MCP_SERVERS_CONFIG` environment variable is present, THE Python runtime SHALL parse the JSON configuration at invocation time
2. THE Python runtime SHALL create MCPClient instances using Python context managers (`with` statement) for each configured MCP server
3. THE Python runtime SHALL call `list_tools_sync()` on each MCPClient to discover available tools before creating the Agent
4. WHEN the invocation completes (success or failure), THE Python runtime SHALL close all MCP client connections via the context manager exit
5. THE MCP connection lifecycle SHALL work identically for Lambda-hosted agents (BatchAgent) and AgentCore Runtime-hosted agents (InteractiveAgent)

### Requirement 6: Multiple MCP Server Support

**User Story:** As a CDK developer, I want to configure multiple MCP servers for a single agent, so that the agent can access tools from several specialized MCP servers simultaneously.

#### Acceptance Criteria

1. THE `mcpServers` field SHALL accept an array of McpServerConfig objects with no upper limit enforced by the construct
2. WHEN multiple MCP servers are configured, THE Python runtime SHALL create separate MCPClient instances for each server
3. WHEN multiple MCP servers are configured, THE Python runtime SHALL merge tools from all successfully connected MCP servers into a single tool list
4. THE merged MCP tools SHALL be combined with any existing S3-based tools and knowledge base tools when creating the Agent instance

### Requirement 7: Backward Compatibility with Existing Tools

**User Story:** As a CDK developer with existing agents using S3-based tools, I want MCP support to be purely additive, so that my existing agent configurations continue to work without modification.

#### Acceptance Criteria

1. WHEN `mcpServers` is not provided in AgentDefinitionProps, THE agent construct SHALL produce identical CloudFormation output to the current implementation
2. WHEN both `tools` (S3 assets) and `mcpServers` are provided, THE agent SHALL load tools from both sources and combine them into a single tool list
3. WHEN both `knowledgeBases` and `mcpServers` are provided, THE agent SHALL load tools from all three sources (S3 tools, knowledge base retrieval tools, MCP tools) and combine them
4. THE `mcpServers` field SHALL have no default value and SHALL NOT affect existing props validation

### Requirement 8: Graceful Degradation on MCP Connection Failures

**User Story:** As a CDK developer, I want my agent to continue functioning when an MCP server is unreachable, so that a single MCP server outage does not break the entire agent.

#### Acceptance Criteria

1. IF an MCP server connection fails during invocation, THEN THE Python runtime SHALL log a warning message including the server name and error details
2. IF an MCP server connection fails, THEN THE Python runtime SHALL continue with tools from successfully connected MCP servers and S3-based tools
3. IF all MCP server connections fail, THEN THE Python runtime SHALL continue with only S3-based tools and knowledge base tools (if configured)
4. THE warning log message SHALL use structured logging via AWS Lambda Powertools Logger with the server name, URL, and error type as extra fields

### Requirement 9: Network Access for MCP Servers

**User Story:** As a CDK developer, I want to use the existing Network prop to enable my agent to reach MCP servers on private networks, so that I do not need separate networking configuration for MCP.

#### Acceptance Criteria

1. WHEN a Network prop is provided to the agent construct, THE agent Lambda function or AgentCore Runtime container SHALL have VPC access that enables connectivity to MCP servers on private networks
2. WHEN no Network prop is provided, THE agent SHALL access MCP servers over the public internet without additional configuration
3. THE construct SHALL NOT create any MCP-specific networking resources (VPC endpoints, security group rules)

### Requirement 10: MCP Configuration Parsing and Validation

**User Story:** As a CDK developer, I want the Python runtime to parse MCP server configurations from the `MCP_SERVERS_CONFIG` environment variable, so that the runtime can create properly configured MCPClient instances.

#### Acceptance Criteria

1. THE Pretty_Printer (JSON serializer in the construct) SHALL format McpServerConfig objects into valid JSON strings containing name, url, transportType, headers, credentialProviderName, authScopes, and authFlow fields (optional fields omitted when not set)
2. THE Parser (JSON deserializer in the Python runtime) SHALL parse the `MCP_SERVERS_CONFIG` environment variable into a list of MCP server configuration dictionaries
3. FOR ALL valid McpServerConfig objects, serializing in the construct then parsing in the Python runtime SHALL produce an equivalent configuration (round-trip property)
4. IF the `MCP_SERVERS_CONFIG` environment variable contains invalid JSON, THEN THE Python runtime SHALL log an error and continue without MCP tools
5. IF a parsed MCP server configuration is missing required fields (name, url, transportType), THEN THE Python runtime SHALL log a warning for that entry and skip it

### Requirement 11: AgentCore Identity Integration for MCP Authentication

**User Story:** As a CDK developer, I want to use AgentCore Identity credential providers for MCP server authentication, so that my agent can obtain and refresh OAuth tokens automatically for OAuth-protected MCP servers without managing token lifecycle manually. This covers Tier 3 (OAuth-protected MCP servers with dynamic token management) of the three-tier MCP authentication model.

#### Acceptance Criteria

1. WHEN `credentialProviderName` is set on a McpServerConfig, THE Python runtime SHALL use the `bedrock-agentcore-identity` SDK to obtain an OAuth access token from the named credential provider
2. WHEN `credentialProviderName` is set and `authFlow` is `M2M`, THE Python runtime SHALL use the `@requires_access_token` decorator with `auth_flow='M2M'` (client credentials flow) to obtain a machine-to-machine token
3. WHEN `credentialProviderName` is set and `authFlow` is `USER_FEDERATION`, THE Python runtime SHALL use the `@requires_access_token` decorator with `auth_flow='USER_FEDERATION'` (authorization code flow) to obtain a user-delegated token
4. WHEN `credentialProviderName` is set and `authFlow` is not specified on a BatchAgent, THE Python runtime SHALL default to `M2M` auth flow, since batch processing operates without user context
5. WHEN `credentialProviderName` is set and `authFlow` is not specified on an InteractiveAgent, THE Python runtime SHALL default to `USER_FEDERATION` auth flow, since interactive agents operate within an authenticated user session
6. WHEN `authFlow` is explicitly specified on a McpServerConfig, THE Python runtime SHALL use the specified auth flow regardless of the agent type, allowing override of the agent-type defaults
7. THE BatchAgent SHALL set the `MCP_DEFAULT_AUTH_FLOW` environment variable to `M2M`, and THE InteractiveAgent SHALL set it to `USER_FEDERATION`, so the Python runtime knows which default to apply when `authFlow` is not specified per-server
8. WHEN `authScopes` is provided alongside `credentialProviderName`, THE Python runtime SHALL request the specified OAuth scopes when obtaining the access token
9. WHEN an OAuth access token is obtained, THE Python runtime SHALL inject it as an `Authorization: Bearer <token>` header on the MCP server HTTP connection
10. WHEN `credentialProviderName` is set on a McpServerConfig, THE BaseAgent construct SHALL grant the agent IAM role `bedrock-agentcore:*` identity permissions to enable token retrieval
11. THE `bedrock-agentcore-identity` Python package SHALL be listed in `resources/default-strands-agent/requirements.txt` for Lambda-hosted agents and `resources/agentcore-agent-handler/requirements.txt` for AgentCore Runtime-hosted agents
12. IF the AgentCore Identity token retrieval fails at runtime, THEN THE Python runtime SHALL log a warning including the credential provider name and error details, and skip the MCP server that requires the unresolvable token
13. THE credential provider referenced by `credentialProviderName` SHALL be pre-configured outside of CDK (via AWS API or console), as no L2 CDK constructs exist for credential provider management
