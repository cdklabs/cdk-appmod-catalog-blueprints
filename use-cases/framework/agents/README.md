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

All implementations share common infrastructure with flexible runtime options: Lambda functions or AWS AgentCore Runtime, IAM roles, KMS encryption, and built-in observability with AWS Lambda Powertools or AWS Distro for OpenTelemetry (ADOT).

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

## Runtime Selection

The framework supports two execution environments for agents, allowing you to choose the best fit for your use case:

### Lambda Runtime (Default)
Best for short-lived, stateless operations with event-driven invocation patterns.

**When to use:**
- Processing time < 15 minutes
- Stateless operations
- Event-driven workloads
- Cost-sensitive applications with sporadic usage
- Quick prototyping and development

### AgentCore Runtime
Best for long-running, stateful operations with enhanced orchestration capabilities.

**When to use:**
- Processing time > 15 minutes
- Stateful operations requiring session management
- Complex multi-step agent workflows
- Continuous or high-throughput workloads
- Advanced agent orchestration requirements

### Comparison Table

| Feature | Lambda Runtime | AgentCore Runtime |
|---------|---------------|-------------------|
| **Execution Time** | Max 15 minutes | Extended (hours) |
| **State Management** | Stateless | Stateful with session support |
| **Cold Start** | Yes (typically <1s) | Minimal (pre-warmed) |
| **Scaling** | Automatic (1-1000+ concurrent) | Configurable (min/max capacity) |
| **Cost Model** | Pay per invocation + duration | Pay for provisioned capacity |
| **Observability** | Lambda Powertools + CloudWatch | ADOT + CloudWatch GenAI Dashboard |
| **VPC Support** | Yes | Yes |
| **Deployment** | ZIP or Container | Direct code (ZIP) or Container |
| **Best For** | Event-driven, short tasks | Long-running, stateful workflows |
| **Typical Use Cases** | Document processing, data extraction | Complex analysis, multi-turn conversations |

### Runtime Configuration

Configure runtime type when creating an agent:

```typescript
import { BatchAgent, AgentRuntimeType } from '@cdklabs/cdk-appmod-catalog-blueprints';

// Lambda runtime (default)
const lambdaAgent = new BatchAgent(this, 'LambdaAgent', {
  agentName: 'LambdaAgent',
  agentDefinition: { /* ... */ },
  // No runtime specified = Lambda by default
});

// AgentCore runtime with direct code deployment
const agentCoreAgent = new BatchAgent(this, 'AgentCoreAgent', {
  agentName: 'AgentCoreAgent',
  agentDefinition: { /* ... */ },
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: {
      deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
      codeBucket: 'my-code-bucket',
      codeKey: 'agents/my-agent.zip',
      timeout: Duration.hours(2),
      memorySize: 2048,
      minCapacity: 1,
      maxCapacity: 10
    }
  }
});

// AgentCore runtime with container deployment
const containerAgent = new BatchAgent(this, 'ContainerAgent', {
  agentName: 'ContainerAgent',
  agentDefinition: { /* ... */ },
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: {
      deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
      imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
      timeout: Duration.hours(4),
      memorySize: 4096
    }
  }
});
```

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
- **Runtime Flexibility**: Choose between Lambda and AgentCore execution environments
- **Encryption**: KMS encryption for environment variables and data at rest
- **Networking**: Optional VPC deployment with subnet selection
- **Observability**: AWS Lambda Powertools (Lambda) or ADOT (AgentCore) integration
- **IAM Security**: Least-privilege access with automatic permission generation
- **Scalability**: Configurable memory allocation, timeout, and auto-scaling settings



## [`BaseAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/base-agent.ts) Construct

The [`BaseAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/base-agent.ts) construct is the foundational abstract class for all agent implementations. It provides complete serverless agent infrastructure with support for both Lambda and AgentCore runtimes, and takes care of the following:

- Initializes IAM roles with appropriate permissions for Bedrock and tools
- Configures runtime-specific execution environments (Lambda or AgentCore)
- Configures KMS encryption for secure environment variable storage
- Sets up observability with Lambda Powertools (Lambda) or ADOT (AgentCore)
- Manages tool asset permissions and S3 access
- Provides VPC networking support when required

### Implementation Requirements
If you're directly extending this abstract class, you must provide concrete implementations of:
- **`createRuntime()`**: Factory method that creates the appropriate runtime implementation

### Configuration Options
- **Agent Name**: Unique identifier for the agent
- **Agent Definition**: Core configuration including model, prompts, and tools
- **Runtime**: Optional runtime configuration (defaults to Lambda)
- **Network**: Optional VPC deployment with subnet selection
- **Encryption Key**: Custom KMS key or auto-generated
- **Observability**: Enable logging, tracing, and metrics
- **Removal Policy**: Resource cleanup behavior (default: DESTROY)

### Runtime Property
The `runtime` property provides access to the underlying runtime implementation:

```typescript
// Access runtime-specific properties
const executionRole = agent.runtime.executionRole;
const invocationArn = agent.runtime.invocationArn;

// Grant invoke permissions
agent.grantInvoke(myService);

// Add environment variables
agent.runtime.addEnvironment('MY_VAR', 'value');

// Add IAM permissions
agent.runtime.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: ['arn:aws:s3:::my-bucket/*']
}));
```

## [`BatchAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/batch-agent.ts) Construct

The [`BatchAgent`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/agents/batch-agent.ts) construct **extends BaseAgent** and provides a ready-to-use implementation for batch processing scenarios with support for both Lambda and AgentCore runtimes.

### Key Features
- **Inherits**: All base infrastructure (IAM, KMS, observability)
- **Implements**: Complete runtime with Strands agent framework
- **Supports**: Both Lambda and AgentCore execution environments
- **Adds**: Batch processing capabilities with configurable prompts
- **Includes**: JSON extraction and response formatting

### Configuration Options
You can customize the following:
- **Runtime**: Choose Lambda or AgentCore (default: Lambda)
- **Prompt**: Processing instructions for the agent
- **Expect JSON**: Enable automatic JSON extraction from responses
- **Memory Size**: Memory allocation (default: 1024MB)
- **Timeout**: Execution timeout (default: 10 minutes)
- **Architecture**: Lambda architecture (default: X86_64, Lambda only)

### Example Usage - Lambda Runtime

```typescript
import { BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

const lambdaAgent = new BatchAgent(this, 'DocumentAnalysisAgent', {
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
  // No runtime specified = Lambda by default
});
```

### Example Usage - AgentCore Runtime

```typescript
import { 
  BatchAgent, 
  AgentRuntimeType,
  AgentCoreDeploymentMethod 
} from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Duration } from 'aws-cdk-lib';

const agentCoreAgent = new BatchAgent(this, 'LongRunningAnalysisAgent', {
  agentName: 'LongRunningAnalysisAgent',
  agentDefinition: {
    bedrockModel: {
      useCrossRegionInference: true
    },
    systemPrompt: new Asset(this, 'SystemPrompt', {
      path: './prompts/deep_analysis.txt'
    }),
    tools: [
      new Asset(this, 'AnalysisTool', {
        path: './tools/deep_analysis.py'
      })
    ]
  },
  prompt: `
    Perform comprehensive analysis of the provided data.
    This may take extended time for large datasets.
    Return detailed results with insights and recommendations.
  `,
  expectJson: true,
  enableObservability: true,
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: {
      deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
      codeBucket: 'my-agent-code-bucket',
      codeKey: 'agents/analysis-agent.zip',
      timeout: Duration.hours(2),
      memorySize: 2048,
      minCapacity: 1,
      maxCapacity: 5
    }
  }
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

## AgentCore Deployment Methods

AgentCore supports two deployment methods for agent code:

### Direct Code Deployment (DIRECT_CODE)

Deploy Python code directly as a ZIP archive in S3. Best for:
- Standard Python dependencies
- Rapid iteration and prototyping
- Simpler deployment pipelines
- No Docker expertise required

**Setup:**

1. Package your agent code:
```bash
# Create a directory with your agent code
mkdir my-agent
cd my-agent

# Add your agent code
cp ../batch_agentcore.py .
cp -r ../tools .

# Install dependencies
pip install -r requirements.txt -t .

# Create ZIP archive
zip -r ../my-agent.zip .
```

2. Upload to S3:
```bash
aws s3 cp my-agent.zip s3://my-code-bucket/agents/my-agent.zip
```

3. Configure in CDK:
```typescript
runtime: {
  type: AgentRuntimeType.AGENTCORE,
  config: {
    deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
    codeBucket: 'my-code-bucket',
    codeKey: 'agents/my-agent.zip',
    timeout: Duration.hours(1),
    memorySize: 2048
  }
}
```

### Container Deployment (CONTAINER)

Deploy as a Docker container in Amazon ECR. Best for:
- Complex dependencies or system libraries
- Custom runtime environments
- Multi-language support
- Full control over execution environment

**Setup:**

1. Create Dockerfile:
```dockerfile
FROM public.ecr.aws/lambda/python:3.11

# Copy agent code
COPY batch_agentcore.py ${LAMBDA_TASK_ROOT}/
COPY tools/ ${LAMBDA_TASK_ROOT}/tools/
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Install dependencies
RUN pip install -r requirements.txt

# Set entrypoint
CMD ["batch_agentcore.handler"]
```

2. Build and push to ECR:
```bash
# Build image
docker build -t my-agent:latest .

# Tag for ECR
docker tag my-agent:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest
```

3. Configure in CDK:
```typescript
runtime: {
  type: AgentRuntimeType.AGENTCORE,
  config: {
    deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
    imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
    timeout: Duration.hours(2),
    memorySize: 4096
  }
}
```

## Code Reuse Between Runtimes

The framework is designed to maximize code reuse between Lambda and AgentCore runtimes:

### Shared Agent Logic

Both runtimes use the same core agent logic with different entry points:

**Lambda Entry Point** (`batch.py`):
```python
def handler(event, context):
    """Lambda handler function"""
    return process_batch_request(event)
```

**AgentCore Entry Point** (`batch_agentcore.py`):
```python
from strands import app

@app.entrypoint
def handler(event):
    """AgentCore entrypoint"""
    return process_batch_request(event)
```

**Shared Logic** (`shared_agent_logic.py`):
```python
def process_batch_request(event):
    """Common processing logic used by both runtimes"""
    # Load system prompt
    system_prompt = load_system_prompt()
    
    # Load tools
    tools = load_tools()
    
    # Process with Bedrock
    result = invoke_bedrock(system_prompt, tools, event)
    
    return result
```

### Tool Compatibility

Tools work identically across both runtimes:

```python
# tools/data_processor.py
from strands import tool

@tool
def process_data(data: str) -> dict:
    """Process data - works in both Lambda and AgentCore"""
    # Implementation
    return result
```

### Environment Variables

Access environment variables consistently:

```python
import os

# Works in both Lambda and AgentCore
model_id = os.environ.get('MODEL_ID')
system_prompt_bucket = os.environ.get('SYSTEM_PROMPT_S3_BUCKET_NAME')
```

### AWS SDK Usage

AWS SDK authentication works automatically in both runtimes:

```python
import boto3

# Works in both Lambda and AgentCore
s3_client = boto3.client('s3')
bedrock_client = boto3.client('bedrock-runtime')
```

## Observability Differences

### Lambda Runtime Observability

Lambda agents use **AWS Lambda Powertools** for observability:

**Features:**
- Structured logging with JSON format
- Automatic request/response logging
- Custom metrics via CloudWatch Embedded Metric Format (EMF)
- X-Ray tracing integration
- Correlation IDs for request tracking

**Configuration:**
```typescript
const lambdaAgent = new BatchAgent(this, 'Agent', {
  enableObservability: true,
  metricNamespace: 'MyApp/Agents',
  metricServiceName: 'DocumentProcessor'
});
```

**In Agent Code:**
```python
from aws_lambda_powertools import Logger, Tracer, Metrics

logger = Logger()
tracer = Tracer()
metrics = Metrics()

@tracer.capture_method
def process_document(doc):
    logger.info("Processing document", extra={"doc_id": doc.id})
    metrics.add_metric(name="DocumentProcessed", unit="Count", value=1)
    # Processing logic
```

**Viewing Logs:**
- CloudWatch Logs: `/aws/lambda/<function-name>`
- X-Ray traces: AWS X-Ray console
- Metrics: CloudWatch Metrics under custom namespace

### AgentCore Runtime Observability

AgentCore agents use **AWS Distro for OpenTelemetry (ADOT)** for observability:

**Features:**
- OpenTelemetry-compatible structured logging
- Automatic runtime metrics (invocations, latency, errors)
- Resource usage metrics (CPU, memory)
- Distributed tracing with CloudWatch Transaction Search
- CloudWatch GenAI Observability dashboard integration

**Prerequisites:**
1. Enable CloudWatch Transaction Search (one-time account setup):
```bash
aws cloudwatch put-transaction-search-configuration \
  --region us-east-1 \
  --transaction-search-configuration enabled=true
```

**Configuration:**
```typescript
const agentCoreAgent = new BatchAgent(this, 'Agent', {
  enableObservability: true,
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: { /* ... */ }
  }
});
```

**In Agent Code:**
```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider

# ADOT automatically configured via environment variables
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

counter = meter.create_counter("documents_processed")

with tracer.start_as_current_span("process_document"):
    # Processing logic
    counter.add(1)
```

**Viewing Logs and Metrics:**
- Runtime logs: `/aws/bedrock-agentcore/runtimes/<runtime-id>-<endpoint-name>/runtime-logs`
- Span data: `/aws/spans/default` (via CloudWatch Transaction Search)
- Metrics: CloudWatch GenAI Observability dashboard
- Built-in metrics: `bedrock-agentcore` namespace

**Key Differences:**

| Aspect | Lambda (Powertools) | AgentCore (ADOT) |
|--------|---------------------|------------------|
| **Logging Format** | JSON (custom) | OpenTelemetry |
| **Tracing** | X-Ray | CloudWatch Transaction Search |
| **Metrics** | EMF + CloudWatch | OpenTelemetry + CloudWatch |
| **Dashboard** | Custom CloudWatch | GenAI Observability |
| **Setup Complexity** | Low | Medium (requires Transaction Search) |
| **Standards** | AWS-specific | OpenTelemetry (vendor-neutral) |

## Migration Guide

### Migrating from Lambda to AgentCore

**When to migrate:**
- Agent execution time approaching 15-minute Lambda limit
- Need for stateful operations or session management
- High-throughput continuous workloads
- Complex multi-step agent orchestration requirements

**Migration Steps:**

1. **Update Runtime Configuration:**
```typescript
// Before (Lambda)
const agent = new BatchAgent(this, 'Agent', {
  agentName: 'MyAgent',
  agentDefinition: { /* ... */ },
  enableObservability: true
});

// After (AgentCore)
const agent = new BatchAgent(this, 'Agent', {
  agentName: 'MyAgent',
  agentDefinition: { /* ... */ },
  enableObservability: true,
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: {
      deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
      codeBucket: 'my-code-bucket',
      codeKey: 'agents/my-agent.zip',
      timeout: Duration.hours(2),
      memorySize: 2048
    }
  }
});
```

2. **Enable CloudWatch Transaction Search** (one-time):
```bash
aws cloudwatch put-transaction-search-configuration \
  --region us-east-1 \
  --transaction-search-configuration enabled=true
```

3. **Update Observability Code** (if using Powertools directly):
```python
# Before (Lambda Powertools)
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

# After (ADOT)
from opentelemetry import trace
import logging

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)
```

4. **Package and Deploy Code:**
```bash
# Package agent code
cd my-agent
pip install -r requirements.txt -t .
zip -r ../my-agent.zip .

# Upload to S3
aws s3 cp my-agent.zip s3://my-code-bucket/agents/my-agent.zip
```

5. **Update Invocation Code** (if invoking directly):
```typescript
// Lambda invocation
await lambda.invoke({
  FunctionName: 'my-agent',
  Payload: JSON.stringify(event)
}).promise();

// AgentCore invocation (via Step Functions or EventBridge)
// Use agent.createStepFunctionsTask() for workflow integration
```

6. **Test and Validate:**
- Verify agent executes correctly with extended timeout
- Check CloudWatch GenAI Observability dashboard for metrics
- Validate logs in `/aws/bedrock-agentcore/runtimes/` log group
- Test error handling and retry logic

**Configuration Changes:**

| Configuration | Lambda | AgentCore | Notes |
|---------------|--------|-----------|-------|
| **Timeout** | `Duration.minutes(10)` | `Duration.hours(2)` | Increase for long-running tasks |
| **Memory** | `1024` MB | `2048` MB | AgentCore may need more memory |
| **Architecture** | `X86_64` or `ARM64` | N/A | Not applicable to AgentCore |
| **Ephemeral Storage** | `512` MB | N/A | Not applicable to AgentCore |
| **Scaling** | Automatic | `minCapacity`/`maxCapacity` | Configure capacity explicitly |

### Migrating from AgentCore to Lambda

**When to migrate:**
- Agent execution time consistently < 10 minutes
- Stateless operations sufficient
- Cost optimization for sporadic workloads
- Simpler deployment and management preferred

**Migration Steps:**

1. **Update Runtime Configuration:**
```typescript
// Before (AgentCore)
const agent = new BatchAgent(this, 'Agent', {
  agentName: 'MyAgent',
  agentDefinition: { /* ... */ },
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: { /* ... */ }
  }
});

// After (Lambda)
const agent = new BatchAgent(this, 'Agent', {
  agentName: 'MyAgent',
  agentDefinition: { /* ... */ }
  // No runtime config = Lambda by default
});
```

2. **Update Observability Code** (if using ADOT directly):
```python
# Before (ADOT)
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

# After (Lambda Powertools)
from aws_lambda_powertools import Tracer

tracer = Tracer()
```

3. **Adjust Timeout and Memory:**
```typescript
const agent = new BatchAgent(this, 'Agent', {
  agentName: 'MyAgent',
  agentDefinition: { /* ... */ },
  timeout: Duration.minutes(10), // Lambda max: 15 minutes
  memorySize: 1024
});
```

4. **Deploy and Test:**
- Verify agent completes within Lambda timeout limits
- Check CloudWatch Logs for Lambda function
- Validate X-Ray traces if enabled
- Test concurrent execution scaling

## Troubleshooting

### Lambda Runtime Issues

**Issue: Lambda timeout errors**
```
Task timed out after 600.00 seconds
```
**Solution:**
- Increase timeout: `timeout: Duration.minutes(15)`
- Or migrate to AgentCore for longer execution times

**Issue: Out of memory errors**
```
Runtime exited with error: signal: killed Runtime.ExitError
```
**Solution:**
- Increase memory: `memorySize: 2048` or higher
- Lambda memory also affects CPU allocation

**Issue: Cold start latency**
```
First invocation takes 5-10 seconds
```
**Solution:**
- Use provisioned concurrency for consistent performance
- Or migrate to AgentCore for pre-warmed instances

**Issue: VPC connectivity issues**
```
Unable to connect to S3/Bedrock from Lambda
```
**Solution:**
- Ensure VPC has NAT Gateway or VPC endpoints
- Check security group rules allow outbound traffic
- Verify subnet routing tables

### AgentCore Runtime Issues

**Issue: CloudWatch Transaction Search not enabled**
```
Error: Transaction search is not enabled in this region
```
**Solution:**
```bash
aws cloudwatch put-transaction-search-configuration \
  --region us-east-1 \
  --transaction-search-configuration enabled=true
```

**Issue: Code deployment fails (DIRECT_CODE)**
```
Error: Unable to access code archive in S3
```
**Solution:**
- Verify S3 bucket and key exist
- Check execution role has `s3:GetObject` permission
- Ensure ZIP archive is valid and < 250 MB

**Issue: Container deployment fails**
```
Error: Unable to pull image from ECR
```
**Solution:**
- Verify ECR image URI is correct
- Check execution role has ECR pull permissions
- Ensure image exists in specified region

**Issue: Agent not scaling**
```
Requests queued, capacity not increasing
```
**Solution:**
- Check `maxCapacity` configuration
- Verify account limits for AgentCore capacity
- Monitor CloudWatch metrics for throttling

**Issue: Missing observability data**
```
No metrics appearing in GenAI dashboard
```
**Solution:**
- Verify `enableObservability: true` is set
- Check ADOT environment variables are configured
- Ensure CloudWatch Transaction Search is enabled
- Verify agent code includes ADOT instrumentation

**Issue: VPC connectivity issues**
```
Unable to access AWS services from AgentCore
```
**Solution:**
- Ensure VPC has VPC endpoints for required services
- Check security group allows outbound traffic
- Verify subnet has route to NAT Gateway or IGW
- Confirm execution role has VPC permissions

### Common Issues (Both Runtimes)

**Issue: Bedrock model access denied**
```
AccessDeniedException: User is not authorized to perform: bedrock:InvokeModel
```
**Solution:**
- Verify Bedrock model access in AWS console
- Check execution role has correct Bedrock permissions
- Ensure model ID is correct and available in region

**Issue: Tool loading failures**
```
Error: Unable to load tool from S3
```
**Solution:**
- Verify tool assets are uploaded to S3
- Check execution role has `s3:GetObject` permission
- Ensure tool Python files are valid

**Issue: Environment variable not found**
```
KeyError: 'MODEL_ID'
```
**Solution:**
- Verify environment variables are set in CDK
- Check `runtime.addEnvironment()` calls
- Ensure variable names match between CDK and code

**Issue: KMS encryption errors**
```
AccessDeniedException: User is not authorized to perform: kms:Decrypt
```
**Solution:**
- Verify execution role has KMS decrypt permissions
- Check KMS key policy allows role access
- Ensure encryption key is in same region

### Debugging Tips

**Enable Verbose Logging:**
```typescript
// Lambda
const agent = new BatchAgent(this, 'Agent', {
  enableObservability: true,
  environment: {
    LOG_LEVEL: 'DEBUG'
  }
});

// AgentCore
const agent = new BatchAgent(this, 'Agent', {
  enableObservability: true,
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: { /* ... */ }
  }
});
// ADOT automatically includes detailed logging
```

**Test Locally:**
```python
# Test agent logic locally before deploying
if __name__ == '__main__':
    test_event = {
        'contentType': 'data',
        'content': {'data': 'test input'}
    }
    result = handler(test_event, None)
    print(result)
```

**Check IAM Permissions:**
```bash
# Simulate IAM policy
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/AgentRole \
  --action-names bedrock:InvokeModel s3:GetObject \
  --resource-arns arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-v2
```

**Monitor CloudWatch Metrics:**
- Lambda: Invocations, Duration, Errors, Throttles
- AgentCore: Runtime metrics in `bedrock-agentcore` namespace
- Custom metrics from Powertools or ADOT

## Security & Best Practices

### IAM Permissions
- Agents automatically receive least-privilege access to required services
- Bedrock model permissions are generated based on model configuration
- Tool-specific permissions can be added via `additionalPolicyStatementsForTools`
- S3 access is granted only to tool assets and required buckets
- Runtime-specific permissions are automatically configured:
  - Lambda: `lambda:InvokeFunction` for invocation
  - AgentCore: `bedrock-agentcore:InvokeAgentRuntime` for invocation

### Encryption
- Environment variables are encrypted using KMS
- Custom encryption keys can be provided or auto-generated
- Tool assets are encrypted at rest in S3
- Encryption works consistently across both Lambda and AgentCore runtimes

### Observability
- Lambda: AWS Lambda Powertools integration for structured logging
- AgentCore: AWS Distro for OpenTelemetry (ADOT) for observability
- X-Ray tracing (Lambda) or CloudWatch Transaction Search (AgentCore)
- CloudWatch metrics for operational insights
- Configurable log group data protection for both runtimes

### Network Security
- Optional VPC deployment for network isolation
- Configurable subnet selection for different security zones
- Security group management for controlled access
- VPC configuration works consistently across both runtimes
- AgentCore requires VPC endpoints or NAT Gateway for AWS service access

### Runtime Selection Best Practices

**Choose Lambda when:**
- Execution time < 10 minutes consistently
- Stateless operations are sufficient
- Cost optimization is priority for sporadic workloads
- Simpler deployment and management preferred
- Rapid prototyping and iteration needed

**Choose AgentCore when:**
- Execution time > 10 minutes or approaching Lambda limits
- Stateful operations or session management required
- Continuous or high-throughput workloads
- Complex multi-step agent orchestration needed
- Advanced agent capabilities required

### Cost Optimization

**Lambda:**
- Pay only for actual execution time
- No cost when idle
- Best for sporadic or event-driven workloads
- Consider provisioned concurrency for consistent performance (additional cost)

**AgentCore:**
- Pay for provisioned capacity (min/max)
- Cost incurred even when idle (based on minCapacity)
- Best for continuous or predictable workloads
- Configure minCapacity based on baseline load
- Set maxCapacity to handle peak load

### Deployment Best Practices

**Lambda:**
- Use Lambda layers for shared dependencies
- Keep deployment package < 50 MB (unzipped)
- Use environment variables for configuration
- Enable X-Ray tracing for debugging

**AgentCore:**
- Use DIRECT_CODE for simple Python agents
- Use CONTAINER for complex dependencies
- Keep ZIP archives < 250 MB
- Include ADOT dependencies in requirements.txt
- Test containers locally before deploying

### Monitoring and Alerting

**Set up CloudWatch alarms for:**
- Lambda: Errors, Throttles, Duration > threshold
- AgentCore: Runtime errors, capacity utilization, latency
- Both: Bedrock throttling, tool execution failures

**Create dashboards for:**
- Lambda: Invocation count, duration, error rate
- AgentCore: Use CloudWatch GenAI Observability dashboard
- Both: Custom business metrics, cost tracking

## Example Implementations
- [Agentic Document Processing](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples/document-processing/agentic-document-processing)
- [Full-Stack Insurance Claims Processing](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples/document-processing/doc-processing-fullstack-webapp)

## Roadmap

**AgentCore Runtime Support** ✅ **Available Now**
- Lambda and AgentCore runtime flexibility
- Direct code and container deployment methods
- Unified observability with Powertools and ADOT
- Seamless migration between runtimes
- Step Functions integration for both runtimes

**InteractiveAgent (Coming Soon)**
Future release will include InteractiveAgent for conversational AI applications:
- **Real-time chat**: WebSocket and HTTP streaming support
- **Session management**: Conversation state and memory
- **Multi-turn conversations**: Context-aware interactions
- **Integration patterns**: API Gateway, AppSync, and direct Lambda invocation
- **Runtime support**: Both Lambda and AgentCore runtimes

**Enhanced Tool Ecosystem**
- **Pre-built tool library**: Common tools for file processing, APIs, and data analysis
- **Tool marketplace**: Community-contributed tools and integrations
- **Tool composition**: Combine multiple tools into complex workflows
- **Cross-runtime compatibility**: Tools work seamlessly across Lambda and AgentCore

## Advanced Patterns

### Multi-Agent Orchestration with Mixed Runtimes

Combine Lambda and AgentCore agents in the same workflow:

```typescript
// Fast classification with Lambda
const classificationAgent = new BatchAgent(this, 'ClassificationAgent', {
  agentName: 'ClassificationAgent',
  agentDefinition: { /* ... */ },
  timeout: Duration.minutes(2)
  // Lambda runtime (default)
});

// Deep analysis with AgentCore
const analysisAgent = new BatchAgent(this, 'AnalysisAgent', {
  agentName: 'AnalysisAgent',
  agentDefinition: { /* ... */ },
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: {
      deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
      codeBucket: 'my-code-bucket',
      codeKey: 'agents/analysis.zip',
      timeout: Duration.hours(2)
    }
  }
});

// Orchestrate with Step Functions
const workflow = new StateMachine(this, 'Workflow', {
  definition: Chain
    .start(classificationAgent.createStepFunctionsTask())
    .next(new Choice(this, 'NeedsDeepAnalysis')
      .when(Condition.stringEquals('$.classification', 'complex'),
        analysisAgent.createStepFunctionsTask())
      .otherwise(new Succeed(this, 'Done')))
});
```

### Runtime-Specific Optimization

Optimize configuration based on runtime type:

```typescript
const runtimeType = this.node.tryGetContext('runtime') || 'lambda';

const agent = new BatchAgent(this, 'Agent', {
  agentName: 'OptimizedAgent',
  agentDefinition: { /* ... */ },
  ...(runtimeType === 'agentcore' ? {
    runtime: {
      type: AgentRuntimeType.AGENTCORE,
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
        codeBucket: 'my-code-bucket',
        codeKey: 'agents/agent.zip',
        timeout: Duration.hours(2),
        memorySize: 2048,
        minCapacity: 2,
        maxCapacity: 10
      }
    }
  } : {
    timeout: Duration.minutes(10),
    memorySize: 1024
  })
});
```

### Custom Tool Libraries
Organize tools into reusable libraries:

```typescript
const toolLibrary = [
  new Asset(this, 'FileTools', { path: './tools/file_utils.py' }),
  new Asset(this, 'DataTools', { path: './tools/data_utils.py' }),
  new Asset(this, 'APITools', { path: './tools/api_utils.py' })
];

// Reuse across multiple agents with different runtimes
const lambdaAgent = new BatchAgent(this, 'LambdaAgent', {
  agentDefinition: { tools: toolLibrary }
});

const agentCoreAgent = new BatchAgent(this, 'AgentCoreAgent', {
  agentDefinition: { tools: toolLibrary },
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: { /* ... */ }
  }
});
```

### Environment-Specific Configuration
Configure agents differently per environment:

```typescript
const environment = this.node.tryGetContext('environment') || 'development';
const isProduction = environment === 'production';

const agent = new BatchAgent(this, 'Agent', {
  agentDefinition: {
    bedrockModel: {
      useCrossRegionInference: isProduction
    }
  },
  enableObservability: isProduction,
  // Use AgentCore in production for better performance
  ...(isProduction ? {
    runtime: {
      type: AgentRuntimeType.AGENTCORE,
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
        codeBucket: 'prod-code-bucket',
        codeKey: 'agents/agent.zip',
        timeout: Duration.hours(1),
        minCapacity: 2,
        maxCapacity: 20
      }
    }
  } : {
    // Lambda for development
    timeout: Duration.minutes(10)
  })
});
```

### Gradual Migration Pattern

Migrate from Lambda to AgentCore gradually:

```typescript
// Phase 1: Deploy both runtimes
const lambdaAgent = new BatchAgent(this, 'LambdaAgent', {
  agentName: 'ProcessorLambda',
  agentDefinition: { /* ... */ }
});

const agentCoreAgent = new BatchAgent(this, 'AgentCoreAgent', {
  agentName: 'ProcessorAgentCore',
  agentDefinition: { /* ... */ },
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: { /* ... */ }
  }
});

// Phase 2: Route traffic based on criteria
const workflow = new StateMachine(this, 'Workflow', {
  definition: Chain.start(
    new Choice(this, 'SelectRuntime')
      .when(Condition.numberGreaterThan('$.estimatedDuration', 600),
        agentCoreAgent.createStepFunctionsTask())
      .otherwise(lambdaAgent.createStepFunctionsTask())
  )
});

// Phase 3: Fully migrate to AgentCore and remove Lambda agent
```
