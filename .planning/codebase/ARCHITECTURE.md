# Architecture

**Analysis Date:** 2026-03-01

## Pattern Overview

**Overall:** AWS CDK Construct Library with Layered Architecture and Template Method Pattern

**Key Characteristics:**
- **Construct-based design**: Built on AWS CDK's Construct library for composable infrastructure components
- **Use-case driven organization**: Four independent use-case modules (Framework, Document Processing, Webapp, Utilities) organized by business capability
- **Template method pattern**: Abstract base classes define extensible workflows that subclasses customize
- **Cross-cutting concerns via mixins**: Observability, networking, security, and encryption are injected as concerns across constructs
- **Interface-based extensibility**: Adapter pattern for pluggable implementations (communication adapters, knowledge bases, document processors)

## Layers

**Framework Layer (Core AI Infrastructure):**
- Purpose: Reusable components for building AI agents on AWS
- Location: `use-cases/framework/`
- Contains: Agent abstractions, knowledge bases, Bedrock integrations, networking foundations
- Depends on: AWS CDK, Utilities, Bedrock API
- Used by: Document Processing, Webapp, Examples

**Document Processing Layer (Domain-Specific Use Case):**
- Purpose: Serverless workflow for processing documents with AI
- Location: `use-cases/document-processing/`
- Contains: Base workflow orchestration, adapter implementations, concrete processing strategies
- Depends on: Framework, Utilities, Step Functions, Lambda, DynamoDB, S3
- Used by: Examples, end applications

**Webapp Layer (Frontend Infrastructure):**
- Purpose: Frontend hosting and deployment infrastructure
- Location: `use-cases/webapp/`
- Contains: CloudFront distribution, S3 hosting, build orchestration
- Depends on: Utilities
- Used by: Examples, interactive applications

**Utilities Layer (Cross-Cutting Concerns):**
- Purpose: Shared infrastructure concerns across all constructs
- Location: `use-cases/utilities/`
- Contains: Observability infrastructure, Lambda IAM utilities, data loaders, Lambda layers, test utilities
- Depends on: AWS CDK, CloudWatch, X-Ray, Lambda Powertools
- Used by: Framework, Document Processing, Webapp

**Foundation Layer (Infrastructure Primitives):**
- Purpose: Low-level AWS infrastructure building blocks
- Location: `use-cases/framework/foundation/`
- Contains: Network (VPC), EventBridge broker, Access logging
- Depends on: AWS CDK EC2, EventBridge
- Used by: All layers when optional infrastructure is needed

## Data Flow

**Agent Invocation Flow (Interactive Agent):**

1. Client → API Gateway REST API endpoint
2. API Gateway invokes Lambda function (FastAPI + LWA runtime)
3. Lambda calls Bedrock Agent API with system prompt and tools
4. Bedrock Agent orchestrates tool calls and reasoning
5. Tools (retrieval, Lambda invocations) execute and return results
6. Agent generates tokens, streamed back via SSE
7. Lambda streams response back to client

**Document Processing Flow (Batch Workflow):**

1. Document uploaded to S3 (raw/ prefix)
2. S3 event triggers SQS queue
3. Lambda consumer reads from SQS
4. Consumer invokes Step Functions state machine
5. Step Functions orchestrates pipeline:
   - Classification step (Lambda or Bedrock)
   - Extraction step (Lambda or Bedrock)
   - Enrichment step (optional, Lambda or Bedrock)
   - Post-processing step (optional, Lambda or Bedrock)
6. On success: File moved to processed/ and metadata stored in DynamoDB
7. On failure: File moved to failed/ with error details in DynamoDB

**Knowledge Base Retrieval Flow:**

1. Agent system prompt includes knowledge base descriptions
2. Agent reasoning determines relevant knowledge base
3. Agent invokes retrieval tool with query
4. Retrieval tool queries knowledge base (Bedrock KB)
5. Results returned to agent for synthesis into response

**State Management:**

- **Session State**: S3SessionManager stores conversation history in S3 buckets (optional SlidingWindowConversationManager for context windowing)
- **Metadata State**: DynamoDB tables store workflow state, document processing metadata, tracking information
- **Encryption State**: KMS keys manage encryption for environment variables and log groups
- **Observability State**: CloudWatch Logs, X-Ray traces, custom metrics

## Key Abstractions

**BaseAgent:**
- Purpose: Abstract base class for all agent types
- Examples: `use-cases/framework/agents/base-agent.ts`
- Pattern: Template method with protected methods for subclass customization
- Manages: IAM roles, encryption keys, tool permissions, knowledge base integration, observability

**InteractiveAgent:**
- Purpose: Real-time agent with streaming HTTP responses and session management
- Examples: `use-cases/framework/agents/interactive-agent.ts`
- Pattern: Extends BaseAgent, adds communication adapter and conversation manager interfaces
- Manages: FastAPI Lambda, API Gateway setup, session storage

**BatchAgent:**
- Purpose: Non-interactive agent for batch processing
- Examples: `use-cases/framework/agents/batch-agent.ts`
- Pattern: Extends BaseAgent, adds Python Lambda execution
- Manages: Python runtime, ADOT layer for observability

**IKnowledgeBase (Interface):**
- Purpose: Contract for knowledge base implementations
- Examples: `use-cases/framework/agents/knowledge-base/i-knowledge-base.ts`, `bedrock-knowledge-base.ts`
- Pattern: Strategy pattern for pluggable KB backends
- Methods: `generateIamPermissions()`, `exportConfiguration()`, `retrievalToolAsset()`, `retrievalToolLayers()`

**BaseDocumentProcessing:**
- Purpose: Abstract orchestrator for document processing workflows
- Examples: `use-cases/document-processing/base-document-processing.ts`
- Pattern: Template method with four required workflow steps
- Manages: Step Functions state machine, DynamoDB table, S3 document lifecycle

**IAdapter (Interface):**
- Purpose: Contract for ingress patterns (how workflows are triggered)
- Examples: `use-cases/document-processing/adapter/adapter.ts`, `queued-s3-adapter.ts`
- Pattern: Strategy pattern for pluggable ingress mechanisms
- Used by: BaseDocumentProcessing to decouple trigger mechanism

**ICommunicationAdapter (Interface):**
- Purpose: Contract for response mechanisms for interactive agents
- Examples: `StreamingHttpAdapter` in `use-cases/framework/agents/interactive-agent.ts`
- Pattern: Strategy pattern for different communication channels
- Methods: `attachToFunction()`, `grantInvoke()`

**IObservable (Interface):**
- Purpose: Marker interface for constructs supporting observability
- Examples: `use-cases/utilities/observability/observable.ts`
- Pattern: Mixin interface for cross-cutting concern injection
- Properties: `metricServiceName`, `metricNamespace`, `logGroupDataProtection`

## Entry Points

**Main Package Export:**
- Location: `use-cases/index.ts`
- Triggers: Package consumers importing the library
- Responsibilities: Re-exports all use-case modules for public API

**Framework Layer:**
- Location: `use-cases/framework/index.ts`
- Exports: All agent types, knowledge bases, foundation components
- Main constructs: BaseAgent, InteractiveAgent, BatchAgent, BedrockKnowledgeBase, Network

**Document Processing Layer:**
- Location: `use-cases/document-processing/index.ts`
- Exports: All document processing strategies and adapters
- Main constructs: BaseDocumentProcessing, BedrockDocumentProcessing, AgenticDocumentProcessing

**Compiled Output:**
- Location: `lib/index.js` (compiled from use-cases)
- Tsconfig setting: `"rootDir": "use-cases"` in `jsii` config points to source
- Distribution: Four subdirectories mirror source: `lib/framework/`, `lib/document-processing/`, `lib/utilities/`, `lib/webapp/`

## Error Handling

**Strategy:** Layered error handling with CDK assertions for construct-time validation

**Patterns:**

- **Construct-Time Validation**: CDK Template assertions validate infrastructure before synthesis
  - Test locations: `use-cases/framework/tests/framework-nag.test.ts`, `interactive-agent-nag.test.ts`
  - Uses: AWS CDK Assertions Template matching, cdk-nag for security policy checks

- **Configuration Validation**: Props interfaces enforce required fields via TypeScript
  - Required props marked without `?` operator
  - Optional behavior defaulted in construct body

- **Runtime Permission Grants**: IAM permission statements generated with precise ARNs
  - BedrockModelUtils: Generates model-specific ARNs based on cross-region configuration
  - Knowledge bases: Each implementation provides its specific permissions
  - Lambda VPC: Network.ts grants required execution role permissions

- **Error Propagation**: Layer throws on unsupported configurations
  - Example: `createADOTLayer()` in BaseAgent throws if region unsupported
  - Supported regions hardcoded with curated ARN map per AWS region

## Cross-Cutting Concerns

**Logging:**
- **Approach**: CloudWatch Logs with optional data protection masking
- **Implementation**: `LogGroupDataProtectionUtils` applies masking patterns to log groups
- **Configuration**: `LogGroupDataProtectionProps` interface in all Observable constructs
- **Observability Injector**: `LambdaObservabilityPropertyInjector` configures structured logging via Lambda Powertools

**Validation:**
- **Approach**: Type-driven via TypeScript interfaces and CDK assertions
- **Construct-Time**: cdk-nag validates against AWS best practices
- **Design-Time**: Props interfaces enforce correct configuration shapes

**Authentication:**
- **Agents**: CognitoAuthenticator (cognito-backed API auth) or NoAuthenticator for development
- **Knowledge Bases**: IAM-based (Bedrock KB permissions auto-generated)
- **System Prompt Assets**: S3 Assets with IAM read grants to agent role

**Observability (Cross-Layer):**
- **Lambda Powertools**: Structured logging, X-Ray tracing, custom metrics
- **AgentCore**: Bedrock agent-level tracing, token usage tracking, reasoning visibility
- **CloudWatch**: Central metric/log aggregation, dashboard-ready data
- **Property Injectors**: `PropertyInjectors.of(construct).add()` pattern injects observability without modifying construct internals
- **Metric Dimensions**: Service name and namespace standardized via `DefaultObservabilityConfig`

---

*Architecture analysis: 2026-03-01*
