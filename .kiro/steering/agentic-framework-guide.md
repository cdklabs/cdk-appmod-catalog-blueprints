---
inclusion: fileMatch
fileMatchPattern: '**/agents/**'
---

# Agentic AI Framework Guide

## Overview

The Agentic AI Framework provides composable building blocks for creating intelligent AI agents with Amazon Bedrock. This guide helps you understand when to use each agent type and how to build custom agents.

## Framework Architecture

### Core Concepts

**Agent**: An AI-powered component that can reason, make decisions, and use tools to accomplish tasks

**Tool**: A Python function that extends agent capabilities (file processing, API calls, data analysis)

**System Prompt**: Instructions that define the agent's role, behavior, and decision-making process

**Batch Processing**: Processing items one at a time with full context and reasoning

**Interactive Processing**: Real-time conversations with session management (coming soon)

### Agent Layers

```
┌─────────────────────────────────────┐
│         Your Application            │
│  (Document Processing, Analytics)   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      BatchAgent / InteractiveAgent  │
│   (Ready-to-use implementations)    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│          BaseAgent                  │
│  (Foundation infrastructure)        │
└─────────────────────────────────────┘
```

## BaseAgent (Foundation)

### When to Use

- You're building a custom agent type not covered by BatchAgent or InteractiveAgent
- You need complete control over the Lambda function implementation
- You're integrating with a custom agent framework (not Strands)

### What It Provides

- IAM role with Bedrock permissions
- KMS encryption for environment variables
- Lambda Powertools integration for observability
- Tool asset management and S3 access
- VPC networking support (optional)

### What You Must Implement

```typescript
class MyCustomAgent extends BaseAgent {
  constructor(scope: Construct, id: string, props: MyCustomAgentProps) {
    super(scope, id, {
      agentName: props.agentName,
      agentDefinition: props.agentDefinition,
      // ... other base props
    });
    
    // Create your custom Lambda function
    this.agentFunction = new PythonFunction(this, 'Function', {
      entry: './my-agent-implementation',
      runtime: Runtime.PYTHON_3_11,
      handler: 'handler',
      role: this.agentRole,
      environment: {
        // Your custom environment variables
      }
    });
  }
}
```

### Agent Definition Structure

```typescript
interface AgentDefinitionProps {
  // Bedrock model configuration
  bedrockModel: {
    modelId?: string;                    // Default: anthropic.claude-3-5-sonnet-20241022-v2:0
    useCrossRegionInference?: boolean;   // Default: false
    inferenceProfileId?: string;         // For cross-region inference
  };
  
  // System prompt as S3 asset
  systemPrompt: Asset;
  
  // Optional tools
  tools?: Asset[];
  
  // Dependencies for tools
  lambdaLayers?: LayerVersion[];
  
  // Additional IAM permissions for tools
  additionalPolicyStatementsForTools?: PolicyStatement[];
}
```

## BatchAgent (Batch Processing)

### When to Use

- Processing documents, data files, or other items one at a time
- Each item needs full context and reasoning
- You want to use the Strands agent framework
- You need tool integration for specialized tasks

### What It Provides

- Everything from BaseAgent
- Complete Lambda function with Strands framework
- Tool loading and execution
- JSON extraction from responses
- Configurable prompts and timeouts

### Configuration

```typescript
interface BatchAgentProps extends BaseAgentProps {
  // Task-specific instructions
  prompt: string;
  
  // Enable automatic JSON extraction
  expectJson?: boolean;  // Default: false
  
  // Lambda configuration
  memorySize?: number;        // Default: 1024 MB
  timeout?: Duration;         // Default: 10 minutes
  architecture?: Architecture; // Default: X86_64
}
```

### Example Usage

```typescript
const agent = new BatchAgent(this, 'DocumentAnalyzer', {
  agentName: 'DocumentAnalyzer',
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

### Input Event Structure

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

### Output Structure (with expectJson: true)

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

## Tool Development

### Tool Structure

```python
from strands import tool
from typing import Dict, Any, List

@tool
def my_tool(param1: str, param2: int) -> Dict[str, Any]:
    """
    Brief description of what the tool does.
    
    The agent will see this description and use it to decide
    when to call this tool. Be clear and specific.
    
    Args:
        param1: Description of parameter 1
        param2: Description of parameter 2
        
    Returns:
        Dictionary with structured results including:
        - success: Boolean indicating if operation succeeded
        - result: The actual result data
        - metadata: Additional information (confidence, timing, etc.)
    """
    try:
        # Tool implementation
        result = perform_operation(param1, param2)
        
        return {
            'success': True,
            'result': result,
            'metadata': {
                'confidence': 0.95,
                'processing_time': 1.2,
                'method': 'advanced_analysis'
            }
        }
    except Exception as e:
        # Always return structured errors
        return {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'recoverable': True,
            'partial_results': {}  # If any partial work was done
        }
```

### Tool Best Practices

1. **Clear Descriptions**: Agent uses these to decide when to call tools
   ```python
   @tool
   def extract_pdf_text(file_path: str) -> Dict[str, Any]:
       """
       Extract text content from PDF files.
       
       Use this tool when you need to read text from a PDF document.
       Works with both text-based PDFs and scanned PDFs (with OCR).
       """
   ```

2. **Structured Returns**: Always return dictionaries with consistent keys
   ```python
   return {
       'success': True,
       'result': extracted_text,
       'metadata': {
           'page_count': 5,
           'has_images': True,
           'confidence': 0.98
       }
   }
   ```

3. **Error Handling**: Return errors as data, don't raise exceptions
   ```python
   except FileNotFoundError as e:
       return {
           'success': False,
           'error': f'File not found: {file_path}',
           'error_type': 'FileNotFoundError',
           'recoverable': False
       }
   ```

4. **Type Hints**: Use type hints for all parameters and returns
   ```python
   def analyze_data(
       data: List[Dict[str, Any]],
       threshold: float = 0.5
   ) -> Dict[str, Any]:
   ```

5. **Single Responsibility**: One tool = one clear purpose
   ```python
   # Good: Focused tool
   @tool
   def extract_pdf_text(file_path: str) -> Dict[str, Any]:
       """Extract text from PDF"""
   
   # Avoid: Tool that does too much
   @tool
   def process_document(file_path: str) -> Dict[str, Any]:
       """Extract text, analyze sentiment, generate summary, and translate"""
   ```

6. **Include Metadata**: Provide context about the results
   ```python
   return {
       'success': True,
       'result': analysis_results,
       'metadata': {
           'confidence': 0.92,
           'processing_time': 2.3,
           'model_version': '2.0',
           'data_points_analyzed': 1500
       }
   }
   ```

### Tool Dependencies

If tools need external libraries:

```typescript
const toolLayer = new LayerVersion(this, 'ToolLayer', {
  code: Code.fromAsset('./layers/tool-dependencies'),
  compatibleRuntimes: [Runtime.PYTHON_3_11]
});

const agent = new BatchAgent(this, 'Agent', {
  agentDefinition: {
    tools: [myTool],
    lambdaLayers: [toolLayer]
  }
});
```

Layer structure:
```
layers/tool-dependencies/
└── python/
    └── lib/
        └── python3.11/
            └── site-packages/
                ├── pandas/
                ├── numpy/
                └── ...
```

### Tool Permissions

If tools need AWS service access:

```typescript
const agent = new BatchAgent(this, 'Agent', {
  agentDefinition: {
    tools: [myTool],
    additionalPolicyStatementsForTools: [
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: ['arn:aws:s3:::my-bucket/*']
      }),
      new PolicyStatement({
        actions: ['dynamodb:GetItem'],
        resources: [table.tableArn]
      })
    ]
  }
});
```

## System Prompt Design

### Structure Template

```
# Role Definition
You are a [role] specialized in [domain].
Your primary goal is to [objective].

# Available Tools
You have access to the following tools:

1. tool_name_1: [Brief description of when to use]
2. tool_name_2: [Brief description of when to use]
3. tool_name_3: [Brief description of when to use]

# Analysis Process
Follow these steps:

1. [First step with clear instructions]
2. [Second step with clear instructions]
3. [Third step with clear instructions]
4. [Final step with clear instructions]

# Decision Making
- [Guideline 1]
- [Guideline 2]
- [Guideline 3]

# Output Format
Provide your response in the following JSON format:

{
  "field1": "description",
  "field2": {
    "nested_field": "description"
  },
  "field3": ["list", "of", "items"]
}

# Quality Standards
- [Standard 1]
- [Standard 2]
- [Standard 3]

# Edge Cases
- If [condition], then [action]
- If [condition], then [action]
```

### Example: Fraud Detection Specialist

```
# Role Definition
You are a fraud detection specialist analyzing financial documents.
Your goal is to identify fraudulent activity and assess risk levels.

# Available Tools
You have access to these fraud detection tools:

1. metadata_analyzer: Examines document metadata for tampering indicators
2. pattern_matcher: Identifies known fraud patterns and suspicious formatting
3. anomaly_detector: Detects statistical outliers and unusual values
4. database_lookup: Verifies vendors and checks blacklists

# Analysis Process
Follow these steps in order:

1. Document Authenticity Verification
   - Use metadata_analyzer to check for tampering or forgery
   - Look for inconsistent timestamps, suspicious software signatures
   
2. Content Anomaly Detection
   - Use anomaly_detector to identify statistical outliers
   - Check for unusual amounts, dates, or patterns
   
3. Pattern Matching
   - Use pattern_matcher to check against known fraud patterns
   - Look for duplicate invoices, rounded amounts, formatting issues
   
4. Cross-Reference Validation
   - Use database_lookup to verify vendors and check blacklists
   - Validate account numbers and business registrations
   
5. Risk Assessment
   - Calculate overall risk score (0-100)
   - Classify risk level (LOW/MEDIUM/HIGH/CRITICAL)
   - Provide detailed justification

# Decision Making
- Use ALL available tools for comprehensive analysis
- If a tool fails, note it and continue with others
- Higher risk scores require more detailed justification
- Flag any suspicious findings even if overall risk is low

# Output Format
{
  "risk_score": 0-100,
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "findings": {
    "metadata_analysis": {...},
    "pattern_matches": [...],
    "anomalies": [...],
    "database_checks": {...}
  },
  "indicators": ["list", "of", "specific", "fraud", "indicators"],
  "recommended_actions": ["list", "of", "recommended", "actions"]
}

# Quality Standards
- Provide specific evidence for all findings
- Include confidence scores where applicable
- Explain reasoning for risk score calculation
- Recommend concrete next steps

# Edge Cases
- If document cannot be parsed, return error with partial analysis
- If tools return errors, note which tools failed and why
- If vendor not found in database, flag as "unverified" not "fraudulent"
- If multiple fraud indicators found, escalate risk level appropriately
```

## Bedrock Model Configuration

### Model Selection

```typescript
// Default: Claude 3.5 Sonnet
bedrockModel: {
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
}

// Claude 3.7 Sonnet (newer)
bedrockModel: {
  modelId: 'anthropic.claude-3-7-sonnet-20250219-v1:0'
}

// Claude 3 Haiku (faster, cheaper)
bedrockModel: {
  modelId: 'anthropic.claude-3-haiku-20240307-v1:0'
}
```

### Cross-Region Inference

For high availability and better performance:

```typescript
bedrockModel: {
  useCrossRegionInference: true,
  inferenceProfileId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'
}
```

Benefits:
- Automatic failover across regions
- Better availability and throughput
- Reduced latency for some regions

### Model Parameters

Control model behavior through prompts:

```typescript
prompt: `
  Analyze the document with these parameters:
  - Temperature: 0.3 (more focused, less creative)
  - Max tokens: 4096
  - Top P: 0.9
  
  [Rest of prompt...]
`
```

## Integration Patterns

### Pattern 1: Document Processing Pipeline

```typescript
const agent = new BatchAgent(this, 'Processor', {
  agentName: 'DocumentProcessor',
  agentDefinition: {
    systemPrompt: processingPrompt,
    tools: [extractorTool, validatorTool]
  },
  prompt: 'Extract and validate document data',
  expectJson: true
});

new AgenticDocumentProcessing(this, 'Pipeline', {
  processingAgentParameters: {
    agentName: agent.agentName,
    agentDefinition: agent.agentDefinition,
    prompt: agent.prompt,
    expectJson: true
  }
});
```

### Pattern 2: Multi-Agent Workflow

```typescript
const classificationAgent = new BatchAgent(this, 'Classifier', {
  agentName: 'Classifier',
  agentDefinition: {
    systemPrompt: classificationPrompt,
    tools: []
  },
  prompt: 'Classify document type'
});

const processingAgent = new BatchAgent(this, 'Processor', {
  agentName: 'Processor',
  agentDefinition: {
    systemPrompt: processingPrompt,
    tools: [tool1, tool2, tool3]
  },
  prompt: 'Process classified document'
});

// Use Step Functions to orchestrate
const workflow = new StateMachine(this, 'Workflow', {
  definition: Chain.start(
    new LambdaInvoke(this, 'Classify', {
      lambdaFunction: classificationAgent.agentFunction
    })
  ).next(
    new LambdaInvoke(this, 'Process', {
      lambdaFunction: processingAgent.agentFunction
    })
  )
});
```

### Pattern 3: Reusable Tool Library

```typescript
// Create shared tool library
const toolLibrary = {
  fileTools: [
    new Asset(this, 'PDFTool', { path: './tools/pdf_utils.py' }),
    new Asset(this, 'ImageTool', { path: './tools/image_utils.py' })
  ],
  dataTools: [
    new Asset(this, 'AnalysisTool', { path: './tools/data_analysis.py' }),
    new Asset(this, 'ValidationTool', { path: './tools/validation.py' })
  ],
  apiTools: [
    new Asset(this, 'HTTPTool', { path: './tools/http_client.py' }),
    new Asset(this, 'DatabaseTool', { path: './tools/db_client.py' })
  ]
};

// Reuse across multiple agents
const agent1 = new BatchAgent(this, 'Agent1', {
  agentDefinition: {
    tools: [...toolLibrary.fileTools, ...toolLibrary.dataTools]
  }
});

const agent2 = new BatchAgent(this, 'Agent2', {
  agentDefinition: {
    tools: [...toolLibrary.dataTools, ...toolLibrary.apiTools]
  }
});
```

## Observability

### Structured Logging

```python
from aws_lambda_powertools import Logger

logger = Logger(service="document-analyzer")

@tool
def my_tool(param: str) -> Dict[str, Any]:
    """Tool with structured logging"""
    logger.info("Tool invoked", extra={
        "tool_name": "my_tool",
        "param": param
    })
    
    try:
        result = process(param)
        logger.info("Tool completed", extra={
            "success": True,
            "result_size": len(result)
        })
        return {'success': True, 'result': result}
    except Exception as e:
        logger.error("Tool failed", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        return {'success': False, 'error': str(e)}
```

### Metrics

```python
from aws_lambda_powertools import Metrics
from aws_lambda_powertools.metrics import MetricUnit

metrics = Metrics(namespace="AgenticFramework", service="document-analyzer")

@tool
def my_tool(param: str) -> Dict[str, Any]:
    """Tool with metrics"""
    metrics.add_metric(name="ToolInvocations", unit=MetricUnit.Count, value=1)
    
    start_time = time.time()
    result = process(param)
    duration = time.time() - start_time
    
    metrics.add_metric(name="ToolDuration", unit=MetricUnit.Seconds, value=duration)
    metrics.add_dimension(name="ToolName", value="my_tool")
    
    return {'success': True, 'result': result}
```

### Tracing

```python
from aws_lambda_powertools import Tracer

tracer = Tracer(service="document-analyzer")

@tracer.capture_method
def process_document(document: Dict) -> Dict:
    """Function with tracing"""
    # Automatically traced
    return analyze(document)
```

## Testing Strategies

### Unit Testing Tools

```python
import pytest
from my_tool import analyze_metadata

def test_analyze_metadata_success():
    """Test successful metadata analysis"""
    result = analyze_metadata('/path/to/document.pdf')
    
    assert result['success'] is True
    assert 'metadata' in result['result']
    assert 'suspicious_indicators' in result['result']

def test_analyze_metadata_file_not_found():
    """Test error handling for missing file"""
    result = analyze_metadata('/nonexistent/file.pdf')
    
    assert result['success'] is False
    assert result['error_type'] == 'FileNotFoundError'
    assert result['recoverable'] is False
```

### Integration Testing Agents

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BatchAgent } from '../batch-agent';

describe('BatchAgent Integration', () => {
  test('creates Lambda function with correct configuration', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    
    new BatchAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      agentDefinition: {
        bedrockModel: {},
        systemPrompt: mockAsset,
        tools: [mockTool]
      },
      prompt: 'Test prompt'
    });
    
    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.11',
      MemorySize: 1024,
      Timeout: 600
    });
  });
});
```

## Troubleshooting

### Agent Not Using Tools

**Symptoms**: Agent responds without calling any tools

**Causes**:
1. Tools not properly loaded
2. System prompt doesn't mention tools
3. Tool descriptions unclear
4. Agent thinks it can answer without tools

**Solutions**:
1. Check Lambda logs for tool loading errors
2. Verify system prompt lists all tools
3. Improve tool descriptions to be more specific
4. Add explicit instruction to use tools in prompt

### JSON Parsing Errors

**Symptoms**: `expectJson: true` but parsing fails

**Causes**:
1. Agent not following JSON format
2. Extra text before/after JSON
3. Invalid JSON syntax

**Solutions**:
1. Verify system prompt specifies exact JSON format
2. Provide example JSON in prompt
3. Check agent output in CloudWatch logs
4. Consider using JSON schema validation

### Tool Execution Failures

**Symptoms**: Tools return errors or don't execute

**Causes**:
1. Missing dependencies
2. Insufficient IAM permissions
3. File not found (for file-based tools)
4. Timeout issues

**Solutions**:
1. Add required libraries to Lambda layer
2. Add necessary IAM permissions
3. Verify file paths and S3 access
4. Increase Lambda timeout if needed

### High Latency

**Symptoms**: Agent takes too long to respond

**Causes**:
1. Large documents
2. Many tool calls
3. Complex reasoning
4. Insufficient Lambda memory

**Solutions**:
1. Increase Lambda memory (affects CPU)
2. Use cross-region inference for better availability
3. Optimize tool implementations
4. Consider breaking into smaller tasks
