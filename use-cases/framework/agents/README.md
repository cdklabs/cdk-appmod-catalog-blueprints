# Agents Framework

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/framework/agents)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/)
[![Example](https://img.shields.io/badge/example-deploy-orange)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples/chatbot/customer-service-chatbot)

## Overview

The Agents Framework provides composable building blocks for creating intelligent AI agents with Amazon Bedrock. It uses a two-layer architectural approach with an abstract base class and two concrete implementations:

- **BaseAgent**: Abstract foundation requiring custom Lambda function implementation
- **BatchAgent**: Asynchronous, one-at-a-time document/data processing with full context and reasoning
- **InteractiveAgent**: Real-time conversational AI with SSE streaming, session management, and Cognito authentication

All implementations share common infrastructure from `BaseAgent` and integrate with the [Strands agent framework](https://github.com/awslabs/strands-agents) for tool execution and model interaction.

## Components

### Bedrock Model Configuration

All agents accept a `bedrockModel` configuration that supports:
- Specific model IDs (e.g., Claude 3 Haiku, Claude 3.5 Sonnet)
- Cross-region inference for high availability
- Inference profile IDs for custom routing

### Tool Ecosystem

Agents can be extended with custom Python tools using the `@tool` decorator from the Strands framework. Tools are packaged as S3 Assets and dynamically loaded at runtime. Dependencies can be provided via Lambda Layers.

### Observability

When `enableObservability` is enabled, all agents automatically get:
- Lambda Powertools structured logging
- CloudWatch metrics with configurable namespace and service name
- X-Ray tracing
- Log group data protection for PII

## [`BaseAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/base-agent.ts) Construct

The `BaseAgent` construct is the abstract foundation for all agent implementations. It provides the common infrastructure that both `BatchAgent` and `InteractiveAgent` build upon.

### What It Provides
- IAM role with Bedrock model invocation permissions
- KMS encryption key for environment variables
- Tool asset management (S3 access grants for tool files)
- Additional IAM permissions for tools (via `additionalPolicyStatementsForTools`)
- VPC networking support (optional)
- Lambda Powertools observability integration (optional)

### Implementation Requirements

If you're directly extending this abstract class, you must provide a concrete `agentFunction` (Lambda function):

```typescript
class MyCustomAgent extends BaseAgent {
  public readonly agentFunction: IFunction;

  constructor(scope: Construct, id: string, props: MyCustomAgentProps) {
    super(scope, id, {
      agentName: props.agentName,
      agentDefinition: props.agentDefinition,
    });

    this.agentFunction = new PythonFunction(this, 'Function', {
      entry: './my-agent-implementation',
      runtime: Runtime.PYTHON_3_13,
      handler: 'handler',
      role: this.agentRole,
      environmentEncryption: this.encryptionKey,
    });
  }
}
```

### Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `agentName` | `string` | Required | Unique name for the agent |
| `agentDefinition` | `AgentDefinitionProps` | Required | Model, system prompt, tools, layers, and tool IAM permissions |
| `enableObservability` | `boolean` | `false` | Enable Lambda Powertools |
| `metricNamespace` | `string` | `'AppModCatalog'` | CloudWatch metrics namespace |
| `metricServiceName` | `string` | `'Agent'` | Service name for metrics |
| `network` | `Network` | `undefined` | VPC configuration |
| `encryptionKey` | `Key` | Auto-created | KMS key for encryption |
| `removalPolicy` | `RemovalPolicy` | `DESTROY` | Resource removal policy |

## [`BatchAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/batch-agent.ts) Construct

The `BatchAgent` construct **extends BaseAgent** and provides a ready-to-use Lambda function powered by the Strands agent framework for asynchronous, one-at-a-time processing.

### Key Features
- **Inherits**: All base infrastructure (IAM role, KMS encryption, tool management, observability)
- **Implements**: Complete Lambda function with Strands framework integration
- **Adds**: Task-specific prompt, JSON response extraction, tool loading and execution

### When to Use
- Processing documents, data files, or other items one at a time
- Each item needs full context and reasoning
- You need tool integration for specialized tasks (e.g., fraud detection, compliance analysis)
- Used by [AgenticDocumentProcessing](../../document-processing/) for the processing step

### Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `prompt` | `string` | Required | Task-specific instructions for the agent |
| `expectJson` | `boolean` | `false` | Enable automatic JSON extraction from responses |
| All `BaseAgentProps` | — | — | Inherited from BaseAgent |

Lambda defaults: 1024 MB memory, 10-minute timeout, X86_64 architecture.

### Example

```typescript
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';

const agent = new BatchAgent(this, 'DocumentAnalyzer', {
  agentName: 'DocumentAnalyzer',
  agentDefinition: {
    bedrockModel: { useCrossRegionInference: true },
    systemPrompt: new Asset(this, 'SystemPrompt', {
      path: './prompts/document_analysis.txt',
    }),
    tools: [
      new Asset(this, 'PDFTool', { path: './tools/pdf_processor.py' }),
      new Asset(this, 'OCRTool', { path: './tools/ocr_processor.py' }),
    ],
  },
  prompt: 'Analyze the provided document and extract key information',
  expectJson: true,
  enableObservability: true,
});
```

### Example Implementations
- [Fraud Detection](../../../examples/document-processing/fraud-detection/) — Multi-tool fraud detection with AgenticDocumentProcessing
- [Agentic Document Processing](../../../examples/document-processing/agentic-document-processing/) — Agent-powered document processing

## [`InteractiveAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/interactive-agent.ts) Construct

The `InteractiveAgent` construct **extends BaseAgent** to provide real-time conversational AI with SSE streaming, session management, and authentication.

### Key Features
- **Inherits**: All base infrastructure (IAM role, KMS encryption, tool management, observability)
- **Implements**: Lambda function with Lambda Web Adapter + FastAPI for Python response streaming
- **Adds**: API Gateway REST API with response streaming, S3 session management, sliding window context, Cognito authentication
- **Strategy Interfaces**: Pluggable adapters for communication, sessions, context, and authentication

### Architecture

```
Client (fetch + ReadableStream)
    ↓ POST /chat (Authorization: Bearer JWT)
API Gateway REST API (responseTransferMode: STREAM)
    ↓ InvokeWithResponseStream
Lambda (Python + Lambda Web Adapter + FastAPI)
    ↓ strands.Agent streaming
Amazon Bedrock (Claude)
```

The Lambda function runs a FastAPI application behind Lambda Web Adapter. When a chat request arrives:

1. API Gateway validates the JWT via native Cognito authorizer
2. API Gateway invokes Lambda using `InvokeWithResponseStream`
3. Lambda Web Adapter forwards the HTTP request to FastAPI on `localhost:8080`
4. FastAPI loads session history from S3, applies context windowing, creates a `strands.Agent`, and streams SSE events as the agent generates tokens
5. SSE chunks stream back through Lambda Web Adapter → API Gateway → Client

### Components

#### StreamingHttpAdapter (Default Communication Adapter)

Creates an API Gateway REST API with response streaming enabled. Supports 15-minute timeout, native Cognito JWT validation, CORS, and configurable throttling.

```typescript
const adapter = new StreamingHttpAdapter({
  stageName: 'prod',
  throttle: { rateLimit: 100, burstLimit: 200 },
});
```

#### S3SessionManager (Default Session Store)

Persists conversation state to S3 with automatic expiration via lifecycle policies. Each HTTP request loads/saves session state, enabling multi-turn conversations over stateless HTTP.

```typescript
const sessionStore = new S3SessionManager(this, 'SessionStore', {
  sessionTTL: Duration.hours(48),
  encryptionKey: myKmsKey,
});
```

#### SlidingWindowConversationManager (Default Context Strategy)

Maintains a fixed-size window of recent messages, automatically discarding older messages. Configurable window size (default: 20 messages).

```typescript
const contextStrategy = new SlidingWindowConversationManager({ windowSize: 50 });
```

#### NullConversationManager

Disables conversation history. Each message is processed independently.

#### CognitoAuthenticator (Default Authenticator)

Integrates with Amazon Cognito User Pools. API Gateway validates JWT tokens natively using the `COGNITO_USER_POOLS` authorizer type — no custom Lambda authorizer needed.

```typescript
const authenticator = new CognitoAuthenticator({
  removalPolicy: RemovalPolicy.RETAIN,
});
```

#### NoAuthenticator

Disables authentication entirely. Only use for development and testing.

### Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `communicationAdapter` | `ICommunicationAdapter` | `StreamingHttpAdapter` | Communication mechanism |
| `sessionStore` | `ISessionStore` | `S3SessionManager` | Session persistence (`undefined` for stateless) |
| `sessionBucket` | `IBucket` | Auto-created | Custom S3 bucket for sessions |
| `sessionTTL` | `Duration` | 24 hours | Session expiration time |
| `contextStrategy` | `IContextStrategy` | `SlidingWindowConversationManager(20)` | Context management strategy |
| `messageHistoryLimit` | `number` | 20 | Max messages in context window |
| `authenticator` | `IAuthenticator` | `CognitoAuthenticator` | Authentication mechanism |
| `memorySize` | `number` | 1024 MB | Lambda memory allocation |
| `timeout` | `Duration` | 15 minutes | Lambda timeout |
| `architecture` | `Architecture` | X86_64 | Lambda architecture |
| `reservedConcurrentExecutions` | `number` | `undefined` | Reserved Lambda concurrency |
| All `BaseAgentProps` | — | — | Inherited from BaseAgent |

### Outputs

```typescript
agent.apiEndpoint;      // REST API endpoint URL (POST /chat)
agent.adapter;          // ICommunicationAdapter instance
agent.sessionStore;     // ISessionStore instance
agent.sessionBucket;    // S3 bucket for sessions
agent.contextStrategy;  // IContextStrategy instance
agent.authenticator;    // IAuthenticator instance (access userPool, userPoolClient)
agent.agentFunction;    // Lambda function
agent.agentRole;        // IAM role (inherited from BaseAgent)
agent.encryptionKey;    // KMS key (inherited from BaseAgent)
```

### Usage Examples

#### Minimal Configuration

```typescript
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { InteractiveAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';

const systemPrompt = new Asset(this, 'SystemPrompt', {
  path: './prompts/chatbot_system_prompt.txt',
});

const agent = new InteractiveAgent(this, 'ChatAgent', {
  agentName: 'CustomerSupportBot',
  agentDefinition: {
    bedrockModel: { useCrossRegionInference: true },
    systemPrompt,
  },
});

// REST API endpoint for client connections
console.log('API Endpoint:', agent.apiEndpoint);
```

#### Full Configuration

```typescript
const agent = new InteractiveAgent(this, 'ChatAgent', {
  agentName: 'CustomerSupportBot',
  agentDefinition: {
    bedrockModel: {
      fmModelId: FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_HAIKU_20240307_V1_0,
    },
    systemPrompt,
    tools: [
      new Asset(this, 'KBTool', { path: './tools/knowledge_base_search.py' }),
    ],
  },
  communicationAdapter: new StreamingHttpAdapter({
    stageName: 'prod',
    throttle: { rateLimit: 1000, burstLimit: 2000 },
  }),
  sessionTTL: Duration.hours(24),
  contextStrategy: new SlidingWindowConversationManager({ windowSize: 50 }),
  authenticator: new CognitoAuthenticator(),
  memorySize: 2048,
  timeout: Duration.minutes(15),
  enableObservability: true,
  metricNamespace: 'my-app',
  metricServiceName: 'chatbot',
});
```

#### SSE Event Format

```
event: metadata
data: {"session_id": "uuid-string"}

data: {"text": "Hello"}
data: {"text": ", how can I help?"}

event: done
data: {}
```

### Example Implementations
- [Customer Support Chatbot](../../../examples/chatbot/customer-service-chatbot/) — Full-stack chatbot with React frontend, Cognito auth, and SSE streaming

## Tool Development

Tools extend agent capabilities with custom Python functions. Both BatchAgent and InteractiveAgent support tools.

```python
from strands import tool
from typing import Dict, Any

@tool
def search_knowledge_base(query: str, max_results: int = 5) -> Dict[str, Any]:
    """
    Search the company knowledge base for relevant articles.

    Use this tool when the user asks questions about products,
    policies, or procedures.

    Args:
        query: Search query string
        max_results: Maximum number of results to return

    Returns:
        Dictionary with search results and metadata
    """
    try:
        results = perform_search(query, max_results)
        return {
            'success': True,
            'results': results,
            'metadata': { 'query': query, 'result_count': len(results) },
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'recoverable': True,
        }
```

Tool best practices:
- Clear descriptions (agent uses these to decide when to call tools)
- Structured return values with `success`/`error` keys
- Error handling that returns data rather than raising exceptions
- Type hints for all parameters and returns
- Single responsibility per tool

## Troubleshooting

### Agent Not Using Tools

1. Verify tools are decorated with `@tool` from `strands`
2. Check system prompt mentions the tools
3. Check Lambda logs for tool loading errors from S3

### JSON Parsing Errors (BatchAgent)

1. Verify `expectJson: true` is set
2. Check system prompt specifies exact JSON output format
3. Review agent output in Step Functions execution

### Messages Not Streaming (InteractiveAgent)

1. Verify the REST API endpoint URL is correct (check CloudFormation outputs)
2. Confirm the `Authorization` header contains a valid Cognito JWT
3. Check Lambda logs: `aws logs tail /aws/lambda/<function-name> --follow`
4. Verify Bedrock model access is enabled in your region

### Session Data Not Persisting (InteractiveAgent)

1. Verify S3 bucket permissions (Lambda role needs read/write)
2. Check session TTL hasn't expired
3. Review Lambda logs for S3 errors

### High Latency

1. Increase Lambda memory (affects CPU allocation)
2. Enable cross-region inference for better availability
3. Reduce context window size (InteractiveAgent) to lower token count
4. Optimize tool implementations

## Additional Resources

- [Agentic Framework Guide](../../../.kiro/steering/agentic-framework-guide.md)
- [Strands Agent Framework](https://github.com/awslabs/strands-agents)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [API Reference](../../../API.md)
