# Phase 1: Agent Infrastructure + Script Generation - Research

**Researched:** 2026-03-02 (Updated)
**Domain:** CDK Example App with InteractiveAgent + BatchAgent Integration
**Confidence:** HIGH

## Summary

This phase implements a CDK example application that combines **InteractiveAgent** (chat) with **BatchAgent** (script generation) to create a synthetic dataset generator. The existing constructs in `use-cases/framework/agents/` provide all the infrastructure needed: Cognito authentication, API Gateway with SSE streaming, S3 session management, and Strands agent framework integration.

The key architectural pattern is **tool-based agent composition**: InteractiveAgent handles user conversation and has a `generate_script` tool that internally invokes BatchAgent's Lambda function to produce Python code. This pattern leverages the tool loading mechanism in `interactive-agent-handler/index.py` and BatchAgent's JSON extraction capability.

**Primary recommendation:** Create a self-contained example at `examples/synthetic-dataset-generator/` that:
1. Instantiates **BatchAgent** for Python script generation with a generation-focused system prompt
2. Instantiates **InteractiveAgent** with a conversation-focused system prompt and `generate_script` tool
3. The tool invokes BatchAgent's Lambda function via boto3 and returns the generated script

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **InteractiveAgent** handles real-time chat with user (Cognito auth, API Gateway, streaming SSE)
- **BatchAgent** generates Python scripts (invoked by InteractiveAgent via tool)
- **Tool invocation pattern**: InteractiveAgent has a `generate_script` tool that internally invokes BatchAgent
- **Separate Execution Lambda** (Phase 2): script execution isolated in dedicated Lambda with minimal IAM
- **Adaptive requirement gathering**: Agent decides when to ask follow-ups based on request specificity
- **Default row count**: 10,000 rows (user can override via conversation)
- **Tone**: Professional but friendly, like a data engineer colleague
- **Script presentation**: Full script in collapsible code block with download button
- **Example path**: `examples/synthetic-dataset-generator/`
- **Model**: Claude Sonnet for both conversation and script generation
- **No Bedrock Guardrails**: security handled at code level (input sanitization + AST validation)

### Claude's Discretion
- Exact system prompt wording and structure
- Input sanitization implementation details
- Lambda memory/timeout configuration
- Error message formatting
- How BatchAgent is invoked from the tool (Lambda invoke vs SDK)

### Deferred Ideas (OUT OF SCOPE)
- Script execution architecture (Phase 2): separate Lambda with minimal IAM, isolated from Bedrock/S3
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | User can send messages to AI agent through a chat interface | InteractiveAgent provides POST /chat endpoint via StreamingHttpAdapter |
| CHAT-02 | Agent responses stream in real-time (token-by-token via SSE) | InteractiveAgent uses FastAPI StreamingResponse with `stream_async()` |
| CHAT-03 | User authenticates via Cognito before accessing chat | CognitoAuthenticator creates User Pool + Client, REST API uses COGNITO_USER_POOLS authorizer |
| CHAT-04 | Conversation history persists within a session | S3SessionManager stores messages in S3, SlidingWindowConversationManager provides context |
| CHAT-05 | Agent iteratively gathers dataset requirements before generating | System prompt design defines adaptive conversation flow |
| GEN-01 | Agent generates Python DataGenerator class | BatchAgent invoked via tool returns generated script |
| GEN-02 | Generated script follows enforced template | BatchAgent system prompt enforces DataGenerator class structure with `generate_datasets()` and `generate_schema()` |
| GEN-03 | System prompt pins dependency versions matching Lambda layer | BatchAgent system prompt includes explicit version constraints for pandas, numpy, faker |
| GEN-04 | User inputs are sanitized before inclusion in generation prompt | Tool implementation sanitizes inputs before passing to BatchAgent |
| INFRA-01 | CDK example stack using InteractiveAgent construct | Example stack instantiates both InteractiveAgent and BatchAgent, wires via tool |
| INFRA-06 | Example includes cdk.json, package.json, tsconfig.json, app.ts | Standard example structure from example-development-guide.md |
</phase_requirements>

## Standard Stack

### Core Constructs
| Construct | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| InteractiveAgent | `use-cases/framework/agents/interactive-agent.ts` | Chat backend with Cognito, API Gateway, SSE streaming | Provides complete chat infrastructure out of the box |
| BatchAgent | `use-cases/framework/agents/batch-agent.ts` | Non-interactive agent for script generation | Strands framework with tool loading and JSON extraction |
| CognitoAuthenticator | `use-cases/framework/agents/interactive-agent.ts` | User authentication | Auto-creates User Pool with secure defaults |
| S3SessionManager | `use-cases/framework/agents/interactive-agent.ts` | Session persistence | S3-based with TTL lifecycle rules |
| StreamingHttpAdapter | `use-cases/framework/agents/interactive-agent.ts` | API Gateway REST API with response streaming | 15-minute timeout, CORS, SSE support |

### Supporting Libraries (Lambda Runtime)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| strands-agents | >=1.0.0 | Agent framework with tool support | Core agent runtime |
| boto3 | >=1.0.0 | AWS SDK for Python | S3, Bedrock, Lambda invocation |
| fastapi | >=0.100.0 | Web framework for interactive handler | POST /chat endpoint |
| uvicorn | >=0.20.0 | ASGI server | Lambda Web Adapter runtime |
| aws-lambda-powertools | >=2.0.0 | Observability (Logger, Tracer, Metrics) | Structured logging, tracing |
| pydantic | >=2.0.0 | Request validation | ChatRequest model |

### CDK Dependencies (Example App)
| Package | Version | Purpose |
|---------|---------|---------|
| aws-cdk-lib | ^2.218.0 | CDK core library |
| @cdklabs/cdk-appmod-catalog-blueprints | ^0.0.0 | This library's constructs |
| constructs | ^10.0.0 | CDK constructs base |

**Installation (Example App):**
```bash
cd examples/synthetic-dataset-generator
npm install
```

## Architecture Patterns

### Recommended Example Structure
```
examples/synthetic-dataset-generator/
├── app.ts                              # CDK app entry point
├── synthetic-dataset-generator-stack.ts # Stack definition
├── cdk.json                            # CDK configuration
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── README.md                           # Deployment instructions
└── resources/
    ├── system-prompt/
    │   └── conversation-prompt.txt     # InteractiveAgent system prompt
    ├── generation/
    │   └── script-generation-prompt.txt # BatchAgent system prompt
    └── tools/
        └── generate_script.py          # Tool that invokes BatchAgent
```

### Architecture Flow
```
User
  │
  └─► InteractiveAgent (Cognito Auth + SSE Streaming)
        │
        ├─► Conversation (Strands Agent)
        │     │
        │     └─► When requirements gathered:
        │           │
        │           └─► generate_script tool
        │                 │
        │                 └─► Lambda.invoke(BatchAgent)
        │                       │
        │                       └─► BatchAgent (Strands + Bedrock)
        │                             │
        │                             └─► Returns Python script
        │
        └─► Returns script to user in chat
```

### Pattern 1: Dual-Agent Stack with Tool Wiring
**What:** Stack creates both InteractiveAgent and BatchAgent, passes BatchAgent function name to tool via environment
**When to use:** When chat agent needs to invoke backend agent for specialized tasks
**Example:**
```typescript
// synthetic-dataset-generator-stack.ts
import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { InteractiveAgent, BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Construct } from 'constructs';
import * as path from 'path';

export class SyntheticDatasetGeneratorStack extends Stack {
  public readonly chatAgent: InteractiveAgent;
  public readonly scriptGenerator: BatchAgent;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Load system prompts
    const conversationPrompt = new Asset(this, 'ConversationPrompt', {
      path: path.join(__dirname, './resources/system-prompt/conversation-prompt.txt'),
    });

    const generationPrompt = new Asset(this, 'GenerationPrompt', {
      path: path.join(__dirname, './resources/generation/script-generation-prompt.txt'),
    });

    const generateScriptTool = new Asset(this, 'GenerateScriptTool', {
      path: path.join(__dirname, './resources/tools/generate_script.py'),
    });

    // 1. Create BatchAgent for script generation
    this.scriptGenerator = new BatchAgent(this, 'ScriptGenerator', {
      agentName: 'DataSynthScriptGen',
      agentDefinition: {
        bedrockModel: { useCrossRegionInference: true },
        systemPrompt: generationPrompt,
      },
      prompt: 'Generate a Python DataGenerator class based on the provided requirements.',
      expectJson: true,  // Extract JSON from response
      enableObservability: true,
      metricNamespace: 'synthetic-dataset-generator',
      metricServiceName: 'script-generator',
    });

    // 2. Create InteractiveAgent for chat with tool that invokes BatchAgent
    this.chatAgent = new InteractiveAgent(this, 'ChatAgent', {
      agentName: 'DataSynthChat',
      agentDefinition: {
        bedrockModel: { useCrossRegionInference: true },
        systemPrompt: conversationPrompt,
        tools: [generateScriptTool],
        // Grant tool permission to invoke BatchAgent Lambda
        additionalPolicyStatementsForTools: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['lambda:InvokeFunction'],
            resources: [this.scriptGenerator.agentFunction.functionArn],
          }),
        ],
      },
      messageHistoryLimit: 20,
      sessionTTL: Duration.hours(24),
      memorySize: 1024,
      timeout: Duration.minutes(15),
      enableObservability: true,
      metricNamespace: 'synthetic-dataset-generator',
      metricServiceName: 'chat-agent',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // 3. Pass BatchAgent function name to tool via custom environment
    // Option A: Use CDK escape hatch to add env var
    const cfnFunction = this.chatAgent.agentFunction.node.defaultChild as any;
    cfnFunction.addPropertyOverride(
      'Environment.Variables.BATCH_AGENT_FUNCTION_NAME',
      this.scriptGenerator.agentFunction.functionName
    );

    // 4. Outputs for frontend integration (Phase 4)
    new CfnOutput(this, 'ApiEndpoint', {
      value: this.chatAgent.apiEndpoint,
      description: 'Chat API endpoint URL',
    });
    new CfnOutput(this, 'UserPoolId', {
      value: (this.chatAgent.authenticator as any)?.userPool?.userPoolId || '',
      description: 'Cognito User Pool ID',
    });
    new CfnOutput(this, 'UserPoolClientId', {
      value: (this.chatAgent.authenticator as any)?.userPoolClient?.userPoolClientId || '',
      description: 'Cognito User Pool Client ID',
    });
  }
}
```

### Pattern 2: Tool Implementation with Lambda Invoke
**What:** Python tool that invokes BatchAgent Lambda and returns generated script
**When to use:** When tool needs to delegate work to another agent
**Example:**
```python
# resources/tools/generate_script.py
from strands import tool
from typing import Dict, Any
import boto3
import json
import os
import re

lambda_client = boto3.client('lambda')

def sanitize_input(text: str, max_length: int = 2000) -> str:
    """
    Sanitize user input to prevent prompt injection.
    Strips control characters, injection patterns, and limits length.
    """
    if not text:
        return ''

    # Remove potential injection patterns
    patterns = [
        r'ignore\s*(all\s*)?(previous|prior)\s*instructions?',
        r'system\s*:',
        r'<\|.*?\|>',
        r'\[\[.*?\]\]',
        r'```.*?```',  # Remove code blocks from input
    ]

    result = text
    for pattern in patterns:
        result = re.sub(pattern, '', result, flags=re.IGNORECASE | re.DOTALL)

    # Strip control characters except newline/tab
    result = ''.join(char for char in result if char.isprintable() or char in '\n\t')

    return result[:max_length].strip()


@tool
def generate_script(
    use_case: str,
    fields: str,
    row_count: int = 10000
) -> Dict[str, Any]:
    """
    Generate a Python DataGenerator script for synthetic data creation.

    Call this tool when you have gathered sufficient requirements from the user.
    The tool invokes the script generation agent and returns the Python code.

    Args:
        use_case: Description of the dataset purpose and domain (e.g., "fraud detection training data")
        fields: JSON string with field definitions, each containing name, type, description, constraints
        row_count: Number of rows to generate (default 10000, max 100000)

    Returns:
        Dictionary with:
        - success: Boolean indicating if generation succeeded
        - script: Generated Python code as string
        - summary: Brief explanation of the generation approach
        - error: Error message if generation failed
    """
    try:
        # 1. Validate and sanitize inputs
        sanitized_use_case = sanitize_input(use_case, max_length=500)
        sanitized_fields = sanitize_input(fields, max_length=3000)

        if not sanitized_use_case:
            return {
                'success': False,
                'error': 'use_case cannot be empty after sanitization',
                'recoverable': True
            }

        if not sanitized_fields:
            return {
                'success': False,
                'error': 'fields cannot be empty after sanitization',
                'recoverable': True
            }

        # Enforce row count limits
        safe_row_count = min(max(int(row_count), 100), 100000)

        # 2. Get BatchAgent function name from environment
        function_name = os.environ.get('BATCH_AGENT_FUNCTION_NAME')
        if not function_name:
            return {
                'success': False,
                'error': 'Script generation service not configured',
                'recoverable': False
            }

        # 3. Build payload for BatchAgent
        # BatchAgent expects contentType='data' with content.data containing the prompt
        generation_request = json.dumps({
            'use_case': sanitized_use_case,
            'fields': sanitized_fields,
            'row_count': safe_row_count
        })

        payload = {
            'contentType': 'data',
            'content': {
                'data': f'Generate script for: {generation_request}'
            }
        }

        # 4. Invoke BatchAgent Lambda
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )

        # 5. Parse response
        response_payload = json.loads(response['Payload'].read().decode('utf-8'))

        if 'result' in response_payload:
            result = response_payload['result']
            # BatchAgent with expectJson=true returns parsed JSON in result
            return {
                'success': True,
                'script': result.get('script', ''),
                'summary': result.get('summary', f'Generated DataGenerator script for {sanitized_use_case}'),
                'row_count': safe_row_count
            }
        elif 'errorMessage' in response_payload:
            return {
                'success': False,
                'error': response_payload.get('errorMessage', 'Unknown error'),
                'recoverable': True
            }
        else:
            return {
                'success': False,
                'error': 'Unexpected response format from script generator',
                'recoverable': True
            }

    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f'Invalid JSON in fields parameter: {str(e)}',
            'recoverable': True
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Script generation failed: {str(e)}',
            'error_type': type(e).__name__,
            'recoverable': True
        }
```

### Pattern 3: BatchAgent System Prompt for Script Generation
**What:** System prompt that instructs BatchAgent to generate Python scripts following the template
**When to use:** BatchAgent needs clear template enforcement for downstream compatibility
**Example:**
```text
# resources/generation/script-generation-prompt.txt

You are a Python code generator specialized in creating synthetic data generation scripts.

# Output Format
Your response MUST be valid JSON with this structure:
{
  "script": "...full Python code...",
  "summary": "Brief 1-2 sentence explanation of approach"
}

# Script Template
The generated Python script MUST follow this exact structure:

```python
import pandas as pd
import numpy as np
from faker import Faker
import random
from datetime import datetime, timedelta

# Version constraints (DO NOT CHANGE):
# pandas==2.0.3
# numpy==1.24.3
# faker==18.13.0

class DataGenerator:
    def __init__(self, num_rows: int = 10000):
        self.num_rows = num_rows
        self.fake = Faker()
        random.seed(42)
        np.random.seed(42)
        Faker.seed(42)

    def generate_datasets(self) -> list:
        """
        Generate synthetic datasets.
        Returns: List of pandas DataFrames
        """
        # Implementation here
        data = []
        for _ in range(self.num_rows):
            record = {
                # Field generation logic
            }
            data.append(record)

        return [pd.DataFrame(data)]

    def generate_schema(self) -> dict:
        """
        Generate schema documentation.
        Returns: Dictionary with column definitions
        """
        return {
            "columns": [
                {
                    "columnName": "field_name",
                    "dataType": "string|integer|float|datetime",
                    "description": "Field description",
                    "constraint": "Any constraints or valid values"
                }
            ]
        }


if __name__ == "__main__":
    generator = DataGenerator()
    datasets = generator.generate_datasets()
    schema = generator.generate_schema()
    print(f"Generated {len(datasets[0])} rows")
```

# Requirements
1. Class MUST be named DataGenerator
2. Method generate_datasets() MUST return a list of pandas DataFrames
3. Method generate_schema() MUST return a dictionary with column definitions
4. Use appropriate Faker providers for realistic data
5. Use numpy for statistical distributions (normal, uniform, etc.)
6. Include random seeds for reproducibility
7. ONLY use pandas, numpy, faker, random, datetime - no other libraries

# Field Type Mappings
- Names: Faker.name(), Faker.first_name(), Faker.last_name()
- Emails: Faker.email()
- Addresses: Faker.address(), Faker.city(), Faker.country()
- Dates: Faker.date_between(), datetime.timedelta
- Numbers: numpy.random.normal(), numpy.random.uniform()
- Categories: random.choice() with predefined lists
- IDs: Faker.uuid4(), range-based integers
```

### Pattern 4: InteractiveAgent System Prompt for Conversation
**What:** System prompt that defines conversation flow for requirement gathering
**When to use:** InteractiveAgent needs clear instructions for adaptive conversation
**Example:**
```text
# resources/system-prompt/conversation-prompt.txt

You are DataSynth, an AI assistant that helps users create realistic synthetic datasets.
Your role is to understand their data generation needs through conversation and then generate Python scripts.

# Personality
Professional but friendly, like a knowledgeable data engineer colleague. Use domain terminology (distributions, correlations, Faker providers) but explain when helpful. Be concise and action-oriented.

# Conversation Strategy

## When user provides VAGUE request (e.g., "I need customer data"):
1. Ask about the use case: "What will you use this data for? (e.g., testing, ML training, demo)"
2. Ask about key fields: "What fields do you need? Give me a few examples."
3. Clarify any constraints: "Any specific requirements? (date ranges, value limits, correlations)"
4. Confirm row count (default 10,000): "How many rows? I'll default to 10,000 if not specified."

## When user provides DETAILED request (includes fields, types, constraints):
1. Briefly acknowledge: "Got it - I'll generate a script for [summary]"
2. Call generate_script tool immediately

## For complex requests (5+ fields with relationships):
1. Summarize the schema before generating
2. Ask for confirmation: "Does this look right before I generate?"

# Tool Usage
When you have sufficient requirements, call the generate_script tool with:
- use_case: Clear description of the data purpose
- fields: JSON array of field definitions with name, type, description, constraints
- row_count: Number of rows (default 10000)

Example fields JSON:
[
  {"name": "customer_id", "type": "integer", "description": "Unique identifier", "constraints": "1-1000000"},
  {"name": "name", "type": "string", "description": "Full customer name", "constraints": "realistic names"},
  {"name": "purchase_amount", "type": "float", "description": "Transaction amount", "constraints": "10-500, normal distribution"}
]

# Presenting Generated Scripts
After receiving the script from generate_script:
1. Provide a brief summary (1-2 sentences): "Here's your script using Faker for names and numpy normal distribution for amounts."
2. Present the full script in a code block
3. Mention the download option: "You can download this as a .py file."

# Constraints
- Default row count: 10,000 (max 100,000)
- Only use pandas, numpy, faker (pinned versions in generated scripts)
- All scripts must use the DataGenerator class template
- Keep explanations concise - users want code, not essays

# Error Handling
If generate_script fails:
1. Explain what went wrong simply
2. Suggest how to fix it (e.g., "Try providing more specific field definitions")
3. Offer to try again
```

### Anti-Patterns to Avoid
- **Hardcoding BatchAgent function ARN:** Use environment variable injection via CDK escape hatch
- **Direct Bedrock calls from tools:** Use BatchAgent construct for script generation
- **Synchronous Lambda invoke without error handling:** Always wrap in try/except, check for errorMessage
- **Mixing conversation logic with generation logic:** Keep conversation in InteractiveAgent, generation in BatchAgent
- **Skipping input sanitization:** Always sanitize before passing to BatchAgent
- **Using BatchAgent without expectJson:** Script output needs structured extraction

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cognito auth + API Gateway | Custom auth Lambda | CognitoAuthenticator | Handles User Pool, Client, authorizer integration |
| SSE streaming over HTTP | Custom streaming solution | StreamingHttpAdapter | Response streaming configured correctly |
| Session persistence | Custom DynamoDB table | S3SessionManager | Built-in lifecycle rules, encryption |
| Tool loading from S3 | Custom tool loader | InteractiveAgent tool mechanism | Already handles S3 download, module import |
| Script generation agent | Raw Bedrock invoke | BatchAgent with expectJson | JSON extraction, error handling, observability |
| Agent observability | Custom logging | enableObservability: true | Powertools + AgentCore integration |

**Key insight:** The framework provides battle-tested infrastructure. Focus on the unique parts: system prompts, tool logic, and wiring the two agents together.

## Common Pitfalls

### Pitfall 1: BatchAgent Function Name Not Available in Tool
**What goes wrong:** Tool cannot invoke BatchAgent because function name is unknown
**Why it happens:** CDK creates dynamic function names; tool file is static
**How to avoid:** Use CDK escape hatch to inject BATCH_AGENT_FUNCTION_NAME environment variable
**Warning signs:** Tool returns "Script generation service not configured"

```typescript
// Pass BatchAgent function name via environment variable
const cfnFunction = chatAgent.agentFunction.node.defaultChild as any;
cfnFunction.addPropertyOverride(
  'Environment.Variables.BATCH_AGENT_FUNCTION_NAME',
  scriptGenerator.agentFunction.functionName
);
```

### Pitfall 2: BatchAgent Response Format Mismatch
**What goes wrong:** Tool can't parse BatchAgent response
**Why it happens:** BatchAgent returns different structure than expected
**How to avoid:** Use `expectJson: true` on BatchAgent, ensure system prompt outputs JSON
**Warning signs:** "Unexpected response format" errors in tool

### Pitfall 3: Missing IAM Permission for Lambda Invoke
**What goes wrong:** Tool gets AccessDenied when invoking BatchAgent
**Why it happens:** InteractiveAgent Lambda doesn't have lambda:InvokeFunction permission
**How to avoid:** Add PolicyStatement in additionalPolicyStatementsForTools
**Warning signs:** AccessDeniedException in CloudWatch Logs

```typescript
additionalPolicyStatementsForTools: [
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['lambda:InvokeFunction'],
    resources: [scriptGenerator.agentFunction.functionArn],
  }),
],
```

### Pitfall 4: Script Template Not Enforced
**What goes wrong:** Generated script doesn't follow DataGenerator class structure
**Why it happens:** BatchAgent system prompt not explicit enough
**How to avoid:** Include exact template with MUST requirements in system prompt
**Warning signs:** Downstream tools fail expecting specific class/method names

### Pitfall 5: Input Sanitization Bypassed
**What goes wrong:** Malicious prompts pass through to script generation
**Why it happens:** Sanitization logic not implemented or incomplete
**How to avoid:** Implement sanitization in tool BEFORE invoking BatchAgent
**Warning signs:** Generated scripts contain unexpected instructions or code

### Pitfall 6: Asset Path Resolution Failures
**What goes wrong:** `new Asset()` fails with "file not found"
**Why it happens:** Relative paths resolve from cdk.out, not source directory
**How to avoid:** Use `path.join(__dirname, './relative/path')`
**Warning signs:** Local synth works but CI/CD fails

## Code Examples

### Complete App Entry Point
```typescript
// app.ts
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SyntheticDatasetGeneratorStack } from './synthetic-dataset-generator-stack';

const app = new cdk.App();
new SyntheticDatasetGeneratorStack(app, 'SyntheticDatasetGeneratorStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
```

### Example package.json
```json
{
  "name": "synthetic-dataset-generator",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "cdk": "cdk",
    "deploy": "cdk deploy --require-approval never"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "aws-cdk": "^2.218.0",
    "ts-node": "^10.9.1",
    "typescript": "~5.7.2"
  },
  "dependencies": {
    "@cdklabs/cdk-appmod-catalog-blueprints": "^0.0.0",
    "aws-cdk-lib": "^2.218.0",
    "constructs": "^10.0.0",
    "source-map-support": "^0.5.21"
  }
}
```

### Example cdk.json
```json
{
  "app": "npx ts-node --prefer-ts-exts app.ts",
  "context": {
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/aws-iam:minimizePolicies": true
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebSocket API for streaming | REST API response streaming | API Gateway 2023 | Simpler: no connection management |
| Single agent for all tasks | Dual-agent with tool composition | Architecture decision | Separation of concerns, specialized prompts |
| Custom session management | S3SessionManager | Framework v1 | Built-in TTL, encryption |
| Manual Bedrock invoke | BatchAgent construct | Framework v1 | JSON extraction, observability |

**Deprecated/outdated:**
- WebSocket API approach: Replaced by REST API streaming
- Direct Bedrock InvokeModel in tools: Use BatchAgent for structured generation

## Open Questions

1. **Environment Variable Injection Pattern**
   - What we know: Need to pass BatchAgent function name to tool
   - What's unclear: Best practice - CfnFunction escape hatch vs Lambda environment vs SSM Parameter
   - Recommendation: Use CfnFunction escape hatch (simplest, no extra resources)

2. **Lambda Layer Dependency Versions**
   - What we know: System prompt must pin versions matching Phase 2 Lambda layer
   - What's unclear: Exact versions not yet determined (Phase 2)
   - Recommendation: Use placeholder versions (pandas==2.0.3, numpy==1.24.3, faker==18.13.0), update in Phase 2

3. **Tool Timeout Configuration**
   - What we know: Script generation may take 30-60 seconds
   - What's unclear: Whether InteractiveAgent's timeout covers nested Lambda invoke
   - Recommendation: Start with defaults, BatchAgent has 10-minute timeout by default

## Sources

### Primary (HIGH confidence)
- `use-cases/framework/agents/interactive-agent.ts` - Complete InteractiveAgent implementation (lines 1-1099)
- `use-cases/framework/agents/batch-agent.ts` - BatchAgent implementation (lines 1-163)
- `use-cases/framework/agents/base-agent.ts` - Base class with IAM, encryption, tool loading
- `use-cases/framework/agents/resources/interactive-agent-handler/index.py` - FastAPI runtime with tool loading
- `use-cases/framework/agents/resources/default-strands-agent/batch.py` - BatchAgent Lambda handler
- `.kiro/steering/example-development-guide.md` - Example structure requirements
- `.kiro/steering/agentic-framework-guide.md` - Tool development patterns

### Secondary (MEDIUM confidence)
- `examples/document-processing/fraud-detection/` - Reference example with tools and layers
- `examples/rag-customer-support/` - BatchAgent usage pattern with InvokeType
- `data-generator-ref/datasynth-agent-action-group/generate_data.py` - Script generation prompt template

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All constructs exist and are well-documented
- Architecture patterns: HIGH - Dual-agent pattern verified in code
- Tool invocation: HIGH - Lambda invoke pattern is standard AWS pattern
- Pitfalls: MEDIUM-HIGH - Based on code analysis and common CDK patterns

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (30 days - stable constructs)
