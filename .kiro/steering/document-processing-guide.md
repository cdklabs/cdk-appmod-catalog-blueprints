---
inclusion: fileMatch
fileMatchPattern: '**/document-processing/**'
---

# Document Processing Use Case Guide

## Overview

The Document Processing use case provides a layered architectural approach for intelligent document processing workflows. This guide helps you understand when to use each implementation level and how to extend them.

## Architecture Layers

### Layer 1: BaseDocumentProcessing (Abstract Foundation)

**When to use:**
- You need complete control over all processing steps
- You're integrating with non-Bedrock AI services
- You have custom processing logic that doesn't fit existing implementations

**What it provides:**
- S3 bucket with organized prefixes (raw/, processed/, failed/)
- SQS queue with dead letter queue
- DynamoDB table for metadata tracking
- Step Functions workflow scaffolding
- Ingress adapter integration (default: QueuedS3Adapter)
- EventBridge integration (optional)
- Built-in observability

**What you must implement:**
```typescript
abstract class BaseDocumentProcessing {
  // Required: Document type classification
  protected abstract classificationStep(): IChainable;
  
  // Required: Data extraction and processing
  protected abstract processingStep(): IChainable;
  
  // Optional: Data enrichment (return undefined to skip)
  protected abstract enrichmentStep(): IChainable | undefined;
  
  // Optional: Post-processing (return undefined to skip)
  protected abstract postProcessingStep(): IChainable | undefined;
}
```

**Step Requirements:**
- Each step must return `BedrockInvokeModel`, `LambdaInvoke`, or `StepFunctionsStartExecution`
- Classification step: `ResultPath` should be `$.classificationResult`
- Processing step: `ResultPath` should be `$.processingResult`
- Enrichment step: `ResultPath` should be `$.enrichedResult`
- Post-processing step: `ResultPath` should be `$.postProcessedResult`

### Layer 2: BedrockDocumentProcessing (Bedrock Implementation)

**When to use:**
- You want AI-powered document processing with Amazon Bedrock
- You need classification and extraction but not complex reasoning
- You want to customize prompts but use standard Bedrock models

**What it provides:**
- Everything from BaseDocumentProcessing
- Classification step using Bedrock InvokeModel
- Processing step using Bedrock InvokeModel
- Cross-region inference support
- Configurable prompts and models

**What you can customize:**
```typescript
interface BedrockDocumentProcessingProps {
  // Model configuration
  classificationModel?: BedrockModelProps;
  processingModel?: BedrockModelProps;
  
  // Custom prompts
  classificationPrompt?: string;
  processingPrompt?: string;
  
  // Optional Lambda functions for enrichment/post-processing
  enrichmentFunction?: IFunction;
  postProcessingFunction?: IFunction;
  
  // Step timeouts
  classificationStepTimeout?: Duration;
  processingStepTimeout?: Duration;
}
```

**Default Models:**
- Classification: Claude 3.5 Sonnet
- Processing: Claude 3.5 Sonnet

### Layer 3: AgenticDocumentProcessing (Agent-Powered)

**When to use:**
- You need complex reasoning and multi-step analysis
- You want to use custom tools for specialized tasks
- You need the agent to make decisions and take actions
- You're building sophisticated workflows (fraud detection, compliance analysis)

**What it provides:**
- Everything from BedrockDocumentProcessing
- Classification step unchanged (uses Bedrock)
- Processing step replaced with BatchAgent
- Full tool ecosystem with dynamic loading
- System prompt configuration
- JSON response parsing

**What you can customize:**
```typescript
interface AgenticDocumentProcessingProps extends BedrockDocumentProcessingProps {
  // Agent configuration replaces processingModel and processingPrompt
  processingAgentParameters: {
    agentName: string;
    agentDefinition: {
      bedrockModel: BedrockModelProps;
      systemPrompt: Asset;  // S3 asset with agent instructions
      tools?: Asset[];      // Python tool files
      lambdaLayers?: LayerVersion[];
      additionalPolicyStatementsForTools?: PolicyStatement[];
    };
    prompt: string;         // Task-specific instructions
    expectJson?: boolean;   // Enable JSON extraction
  };
}
```

## Workflow Structure

### Standard Workflow Flow

```
Upload → S3 (raw/) → SQS → Lambda Consumer → Step Functions
                                                    ↓
                                            Classification
                                                    ↓
                                              Processing
                                                    ↓
                                              Enrichment (optional)
                                                    ↓
                                           Post-Processing (optional)
                                                    ↓
                                    Success: Move to processed/
                                    Failure: Move to failed/
```

### Payload Structure

**File-based ingress (S3):**
```json
{
  "documentId": "auto-generated-id",
  "contentType": "file",
  "content": {
    "location": "s3",
    "bucket": "bucket-name",
    "key": "raw/document.pdf",
    "filename": "document.pdf"
  },
  "eventTime": "2024-01-01T00:00:00Z",
  "eventName": "ObjectCreated:Put",
  "source": "sqs-consumer"
}
```

**Data-based ingress (streaming):**
```json
{
  "documentId": "auto-generated-id",
  "contentType": "data",
  "content": {
    "data": "<content>"
  },
  "eventTime": "2024-01-01T00:00:00Z",
  "eventName": "DataReceived",
  "source": "stream-consumer"
}
```

## Ingress Adapters

### QueuedS3Adapter (Default)

**What it provides:**
- S3 bucket (or uses provided bucket)
- SQS queue with DLQ
- S3 event notifications to SQS
- Lambda consumer to trigger Step Functions
- Success/failure chains for file movement

**Configuration:**
```typescript
const adapter = new QueuedS3Adapter(this, 'Adapter', {
  bucket: existingBucket,  // Optional: use existing bucket
  encryptionKey: kmsKey,
  queueVisibilityTimeout: Duration.minutes(30)
});
```

**File Organization:**
- `raw/`: Upload documents here to trigger processing
- `processed/`: Successfully processed documents moved here
- `failed/`: Failed documents moved here

### Custom Adapters

To support other ingress types (streaming, API, on-prem), implement the `IAdapter` interface:

```typescript
interface IAdapter {
  // Step Functions chain for success scenario
  successChain(scope: Construct, id: string): IChainable;
  
  // Step Functions chain for failure scenario
  failureChain(scope: Construct, id: string): IChainable;
  
  // IAM policy statements needed by workflow
  policyStatements(): PolicyStatement[];
  
  // KMS permissions needed by workflow
  kmsPermissions(): string[];
}
```

## Agent Tools Development

### Tool Structure

```python
from strands import tool
from typing import Dict, Any

@tool
def my_tool(param1: str, param2: int) -> Dict[str, Any]:
    """
    Brief description of what the tool does.
    The agent will see this description.
    
    Args:
        param1: Description of parameter 1
        param2: Description of parameter 2
        
    Returns:
        Dictionary with structured results
    """
    try:
        # Tool implementation
        result = perform_analysis(param1, param2)
        
        return {
            'success': True,
            'result': result,
            'metadata': {
                'confidence': 0.95,
                'processing_time': 1.2
            }
        }
    except Exception as e:
        # Always return structured errors
        return {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'recoverable': True
        }
```

### Tool Best Practices

1. **Always return structured data**: Use dictionaries with consistent keys
2. **Include success/error indicators**: Make it easy for agent to check results
3. **Provide detailed descriptions**: Agent uses these to decide when to call tools
4. **Handle errors gracefully**: Return error info rather than raising exceptions
5. **Include metadata**: Confidence scores, processing time, etc.
6. **Use type hints**: Helps with validation and documentation
7. **Keep tools focused**: One tool = one responsibility

### Tool Integration

```typescript
const tools = [
  new Asset(this, 'Tool1', {
    path: './resources/tools/metadata_analyzer.py'
  }),
  new Asset(this, 'Tool2', {
    path: './resources/tools/pattern_matcher.py'
  })
];

new AgenticDocumentProcessing(this, 'Processing', {
  processingAgentParameters: {
    agentName: 'DocumentAnalyzer',
    agentDefinition: {
      bedrockModel: { useCrossRegionInference: true },
      systemPrompt: new Asset(this, 'Prompt', {
        path: './resources/system_prompt.txt'
      }),
      tools: tools
    },
    prompt: 'Analyze the document and extract key information',
    expectJson: true
  }
});
```

## System Prompt Guidelines

### Structure

```
Role Definition:
- Define who the agent is
- State the agent's primary goal

Available Tools:
- List each tool with brief description
- Explain when to use each tool

Analysis Process:
1. Step 1: What to do first
2. Step 2: What to do next
3. Step 3: Final steps

Output Format:
- Specify exact JSON structure expected
- Include all required fields
- Provide example output

Guidelines:
- Any special instructions
- Edge cases to handle
- Quality standards
```

### Example System Prompt

```
You are a document analysis specialist. Your goal is to extract and validate information from financial documents.

Available Tools:
- extract_text: Extract text from PDF or image documents
- validate_format: Check if document follows expected format
- lookup_vendor: Verify vendor information against database

Analysis Process:
1. Extract text content using extract_text tool
2. Validate document format using validate_format tool
3. If vendor information present, verify using lookup_vendor tool
4. Compile findings into structured output

Output Format:
{
  "document_type": "invoice|receipt|statement",
  "extracted_data": {
    "vendor": "...",
    "amount": 0.00,
    "date": "YYYY-MM-DD"
  },
  "validation_results": {
    "format_valid": true|false,
    "vendor_verified": true|false
  },
  "confidence_score": 0.0-1.0
}

Guidelines:
- Always use all available tools
- If a tool fails, note it in the output
- Provide confidence scores for extracted data
- Flag any suspicious or unusual findings
```

## EventBridge Integration

### Enabling Events

```typescript
const eventBus = new EventBus(this, 'EventBus');

new AgenticDocumentProcessing(this, 'Processing', {
  eventBridgeBroker: {
    eventBus: eventBus,
    eventSource: 'document-processing'
  },
  // ... other props
});
```

### Event Structure

**Success Event:**
```json
{
  "DetailType": "document-processed-successful",
  "Source": "document-processing",
  "Detail": {
    "documentId": "doc-123",
    "classification": "INVOICE",
    "contentType": "file",
    "content": "{...}"
  }
}
```

**Failure Event:**
```json
{
  "DetailType": "document-processing-failed",
  "Source": "document-processing",
  "Detail": {
    "documentId": "doc-123",
    "contentType": "file",
    "content": "{...}",
    "error": "Processing failed: ..."
  }
}
```

## Observability

### Enabling Observability

```typescript
new AgenticDocumentProcessing(this, 'Processing', {
  enableObservability: true,
  metricNamespace: 'my-app',
  metricServiceName: 'document-processing',
  logGroupDataProtection: {
    identifiers: [
      DataIdentifier.EMAILADDRESS,
      DataIdentifier.CREDITCARDNUMBER
    ]
  }
});
```

### Monitoring Executions

```bash
# List recent executions
aws stepfunctions list-executions \
  --state-machine-arn <state-machine-arn> \
  --max-results 10

# Get execution details
aws stepfunctions describe-execution \
  --execution-arn <execution-arn>

# Get execution history
aws stepfunctions get-execution-history \
  --execution-arn <execution-arn>
```

### CloudWatch Metrics

The construct automatically publishes metrics:
- `DocumentsProcessed`: Count of processed documents
- `ProcessingDuration`: Time to process documents
- `ProcessingErrors`: Count of failed documents

## Common Patterns

### Pattern 1: Simple Document Extraction

Use `BedrockDocumentProcessing` with custom prompts:

```typescript
new BedrockDocumentProcessing(this, 'Processing', {
  classificationPrompt: 'Classify this document as invoice, receipt, or statement',
  processingPrompt: 'Extract vendor, amount, date, and line items from this document'
});
```

### Pattern 2: Multi-Tool Analysis

Use `AgenticDocumentProcessing` with specialized tools:

```typescript
new AgenticDocumentProcessing(this, 'Processing', {
  processingAgentParameters: {
    agentName: 'Analyzer',
    agentDefinition: {
      systemPrompt: systemPromptAsset,
      tools: [
        extractorTool,
        validatorTool,
        enrichmentTool
      ]
    },
    prompt: 'Perform comprehensive document analysis',
    expectJson: true
  }
});
```

### Pattern 3: Custom Enrichment

Use `BedrockDocumentProcessing` with enrichment Lambda:

```typescript
const enrichmentFunction = new Function(this, 'Enrichment', {
  runtime: Runtime.PYTHON_3_11,
  handler: 'index.handler',
  code: Code.fromAsset('./lambda/enrichment')
});

new BedrockDocumentProcessing(this, 'Processing', {
  enrichmentFunction: enrichmentFunction
});
```

### Pattern 4: Custom Ingress

Implement custom adapter for API-based ingress:

```typescript
class ApiAdapter implements IAdapter {
  successChain(scope: Construct, id: string): IChainable {
    return new LambdaInvoke(scope, id, {
      lambdaFunction: this.apiResponseFunction,
      resultPath: '$.apiResponse'
    });
  }
  
  failureChain(scope: Construct, id: string): IChainable {
    return new LambdaInvoke(scope, id, {
      lambdaFunction: this.errorHandlerFunction,
      resultPath: '$.error'
    });
  }
  
  // ... implement other methods
}
```

## Troubleshooting

### Documents Not Processing

1. Check S3 event notifications are configured
2. Verify SQS queue is receiving messages
3. Check Lambda consumer logs for errors
4. Verify Step Functions execution started

### Step Functions Failures

1. Check execution history in AWS Console
2. Look for specific step that failed
3. Check Lambda/Bedrock logs for that step
4. Verify IAM permissions are correct

### Agent Not Using Tools

1. Verify tools are properly formatted with `@tool` decorator
2. Check system prompt mentions the tools
3. Verify tool descriptions are clear
4. Check agent Lambda logs for tool loading errors

### JSON Parsing Errors

1. Verify `expectJson: true` is set
2. Check system prompt specifies JSON output format
3. Review agent output in Step Functions execution
4. Ensure JSON is valid (no trailing commas, proper quotes)

## Testing Strategies

### Unit Tests

Test individual components:
- CDK stack synthesis
- Resource creation
- IAM permissions
- Tool implementations

### Integration Tests

Test complete workflows:
- Upload document to S3
- Verify Step Functions execution
- Check output in DynamoDB
- Verify file moved to processed/

### Property-Based Tests

Test universal properties:
- Any valid document triggers processing
- Output always has required fields
- Errors are always handled gracefully
- Files always end up in processed/ or failed/
