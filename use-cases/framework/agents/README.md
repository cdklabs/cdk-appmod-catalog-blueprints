# Agentic AI Framework

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/framework/agents)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/)
[![Example](https://img.shields.io/badge/example-deploy-orange)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/examples/document-processing/agentic-document-processing/)

## Overview

The Agentic AI Framework is a composable enterprise framework for building intelligent AI agents with Amazon Bedrock that can be mixed and matched across diverse use cases - from document processing and conversational AI to data analysis and automated decision-making workflows.

Build sophisticated AI agents that go beyond simple text generation using this modular framework from AppMod Catalog Blueprints. Create intelligent agents for any use case by mixing and matching reusable components across different business domains and industries.

![Agentic AI Framework](./doc-img/agentic-ai-framework-appmod-catalog.png)

You can leverage the following constructs:
- **BaseAgent**: Abstract foundation requiring custom agent implementations
- **BatchAgent**: Ready-to-use agent for batch processing with Bedrock integration
- **InteractiveAgent**: Coming soon!

All implementations share common infrastructure: Lambda functions, IAM roles, KMS encryption, and built-in observability with AWS Lambda Powertools.

## Composable Architecture

**Mix & Match Components**
- **BaseAgent**: Foundation infrastructure that works across all use cases
- **BatchAgent**: Ready-to-use for document processing, data analysis, content generation
- **InteractiveAgent**: Coming soon for chatbots, customer service, real-time conversations
- **Tool Library**: Reusable capabilities that work across different agent types

**Multi-Use Case Support**

The same framework components power diverse applications:
- **Insurance Claims**: Document classification → data extraction → validation → approval workflows
- **Customer Service**: Query understanding → knowledge retrieval → response generation → escalation handling  
- **Content Operations**: Research → writing → fact-checking → publishing workflows
- **Data Analytics**: Data ingestion → analysis → insight generation → report creation
- **Manufacturing**: Quality control → defect analysis → predictive maintenance → process optimization

**Composability Benefits**
- **Reusable Infrastructure**: Deploy the same BaseAgent foundation across all your AI initiatives with consistent security, monitoring, and compliance
- **Flexible Scaling**: Start with BatchAgent for immediate value, add InteractiveAgent for customer-facing applications, combine multiple agents for complex workflows
- **Rapid Customization**: Swap AI models based on use case requirements, modify prompts and workflows without changing infrastructure, add new tools as business needs evolve

## Components

The following are the key components of this L3 Construct:

### Agent Definition
The agent definition encapsulates the core configuration that influences agent behavior:

```typescript
interface AgentDefinitionProps {
  // Bedrock model configuration
  readonly bedrockModel: BedrockModelProps;
  
  // System prompt stored as S3 asset
  readonly systemPrompt: Asset;
  
  // Optional tools for agent capabilities
  readonly tools?: Asset[];
  
  // Dependencies for tools
  readonly lambdaLayers?: LayerVersion[];
  
  // Additional IAM permissions for tools
  readonly additionalPolicyStatementsForTools?: PolicyStatement[];
}
```

### Tool Integration
Agents can be enhanced with custom tools stored as Python files in S3:

```typescript
const tools = [
  new Asset(this, 'DownloadPolicyTool', {
    path: './tools/download_policy.py'
  }),
  new Asset(this, 'DataAnalysisTool', {
    path: './tools/data_analysis.py'
  })
];
```

Tools are automatically loaded by the agent runtime and can include:
- File processing utilities
- API integrations
- Data analysis functions
- Specialized domain logic

### Infrastructure Features
- **Encryption**: KMS encryption for environment variables and data at rest
- **Networking**: Optional VPC deployment with subnet selection
- **Observability**: AWS Lambda Powertools integration for metrics, tracing, and logging
- **IAM Security**: Least-privilege access with automatic permission generation
- **Scalability**: Configurable memory allocation and timeout settings



## [`BaseAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/base-agent.ts) Construct

The [`BaseAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/base-agent.ts) construct is the foundational abstract class for all agent implementations. It provides complete serverless agent infrastructure and takes care of the following:

- Initializes IAM roles with appropriate permissions for Bedrock and tools
- Configures KMS encryption for secure environment variable storage
- Sets up observability with Lambda Powertools integration
- Manages tool asset permissions and S3 access
- Provides VPC networking support when required

### Implementation Requirements
If you're directly extending this abstract class, you must provide concrete implementations of:
- **`agentFunction`**: The Lambda function that executes the agent logic

### Configuration Options
- **Agent Name**: Unique identifier for the agent
- **Agent Definition**: Core configuration including model, prompts, and tools
- **Network**: Optional VPC deployment with subnet selection
- **Encryption Key**: Custom KMS key or auto-generated
- **Observability**: Enable logging, tracing, and metrics
- **Removal Policy**: Resource cleanup behavior (default: DESTROY)

## [`BatchAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/batch-agent.ts) Construct

The [`BatchAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/batch-agent.ts) construct **extends BaseAgent** and provides a ready-to-use implementation for batch processing scenarios.

### Key Features
- **Inherits**: All base infrastructure (IAM, KMS, observability)
- **Implements**: Complete Lambda function with Strands agent framework
- **Adds**: Batch processing capabilities with configurable prompts
- **Includes**: JSON extraction and response formatting

### Configuration Options
You can customize the following:
- **Prompt**: Processing instructions for the agent
- **Expect JSON**: Enable automatic JSON extraction from responses
- **Memory Size**: Lambda memory allocation (default: 1024MB)
- **Timeout**: Execution timeout (default: 10 minutes)
- **Architecture**: Lambda architecture (default: X86_64)

### Example Usage

```typescript
import { BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

const agent = new BatchAgent(this, 'DocumentAnalysisAgent', {
  agentName: 'DocumentAnalysisAgent',
  agentDefinition: {
    bedrockModel: {
      useCrossRegionInference: true
    },
    systemPrompt: new Asset(this, 'SystemPrompt', {
      path: './prompts/document_analysis.txt'
    }),
    tools: [
      new Asset(this, 'PDFTool', {
        path: './tools/pdf_processor.py'
      }),
      new Asset(this, 'OCRTool', {
        path: './tools/ocr_processor.py'
      })
    ]
  },
  prompt: `
    Analyze the provided document and extract key information.
    Use the available tools to process different document formats.
    Return results in JSON format with extracted data and confidence scores.
  `,
  expectJson: true,
  enableObservability: true
});
```

### Tool Development
Tools are Python files that extend agent capabilities:

```python
# tools/pdf_processor.py
from strands import tool

@tool
def extract_pdf_text(file_path: str) -> str:
    """Extract text content from PDF files."""
    # Implementation here
    return extracted_text

@tool  
def get_pdf_metadata(file_path: str) -> dict:
    """Extract metadata from PDF files."""
    # Implementation here
    return metadata
```

### Event Payload Structure
The agent expects input in the following format:

```json
{
  "contentType": "file",
  "content": {
    "bucket": "my-bucket",
    "key": "documents/report.pdf",
    "location": "s3"
  },
  "classificationResult": {
    "documentClassification": "compliance_report"
  }
}
```

### Response Format
With `expectJson: true`, responses are automatically parsed:

```json
{
  "result": {
    "compliance_status": "compliant",
    "issues_found": [],
    "confidence_score": 0.95,
    "recommendations": [
      "Review section 3.2 for clarity"
    ]
  }
}
```

## Security & Best Practices

IAM Permissions
- Agents automatically receive least-privilege access to required services
- Bedrock model permissions are generated based on model configuration
- Tool-specific permissions can be added via `additionalPolicyStatementsForTools`
- S3 access is granted only to tool assets and required buckets

Encryption
- Environment variables are encrypted using KMS
- Custom encryption keys can be provided or auto-generated
- Tool assets are encrypted at rest in S3

Observability
- AWS Lambda Powertools integration for structured logging
- X-Ray tracing for performance monitoring
- CloudWatch metrics for operational insights
- Configurable log group data protection

Network Security
- Optional VPC deployment for network isolation
- Configurable subnet selection for different security zones
- Security group management for controlled access

## Example Implementations
- [Agentic Document Processing](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples/document-processing/agentic-document-processing)
- [Full-Stack Insurance Claims Processing](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples/document-processing/doc-processing-fullstack-webapp)

## Roadmap

**InteractiveAgent (Coming Soon)**
Future release will include InteractiveAgent for conversational AI applications:
- **Real-time chat**: WebSocket and HTTP streaming support
- **Session management**: Conversation state and memory
- **Multi-turn conversations**: Context-aware interactions
- **Integration patterns**: API Gateway, AppSync, and direct Lambda invocation

**Enhanced Tool Ecosystem**
- **Pre-built tool library**: Common tools for file processing, APIs, and data analysis
- **Tool marketplace**: Community-contributed tools and integrations
- **Tool composition**: Combine multiple tools into complex workflows

## Advanced Patterns
**Multi-Agent Orchestration**

```typescript
const classificationAgent = new BatchAgent(this, 'ClassificationAgent', {
  // Configuration for document classification
});

const processingAgent = new BatchAgent(this, 'ProcessingAgent', {
  // Configuration for document processing
});

// Use Step Functions to orchestrate multiple agents
```

**Custom Tool Libraries**
Organize tools into reusable libraries:

```typescript
const toolLibrary = [
  new Asset(this, 'FileTools', { path: './tools/file_utils.py' }),
  new Asset(this, 'DataTools', { path: './tools/data_utils.py' }),
  new Asset(this, 'APITools', { path: './tools/api_utils.py' })
];

// Reuse across multiple agents
const agent1 = new BatchAgent(this, 'Agent1', {
  agentDefinition: { tools: toolLibrary }
});
```

**Environment-Specific Configuration**
Configure agents differently per environment:

```typescript
const isProduction = this.node.tryGetContext('environment') === 'production';

const agent = new BatchAgent(this, 'Agent', {
  agentDefinition: {
    bedrockModel: {
      useCrossRegionInference: isProduction
    }
  },
  enableObservability: isProduction
});
```
