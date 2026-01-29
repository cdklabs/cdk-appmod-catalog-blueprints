# Design: RAG Customer Support Agent Example

## Overview

This document describes the technical design for a CDK example that demonstrates the Knowledge Base integration feature of the Agentic AI Framework. The example creates a customer support agent for a fictional e-commerce platform that uses Amazon Bedrock Knowledge Bases with S3 Vectors for RAG-based question answering.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RAG Customer Support Stack                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Knowledge Base Infrastructure                      │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │   │
│  │  │  S3 Bucket      │    │ CfnKnowledgeBase│    │  CfnDataSource  │   │   │
│  │  │  (Data Source)  │───▶│  (S3 Vectors)   │◀───│                 │   │   │
│  │  │                 │    │                 │    │                 │   │   │
│  │  │ sample-docs/    │    │ Titan Embeddings│    │ Points to S3    │   │   │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘   │   │
│  │           │                      │                                    │   │
│  │           │              ┌───────▼───────┐                           │   │
│  │           │              │ S3 Vector     │  (Auto-managed by Bedrock)│   │
│  │           │              │ Bucket        │                           │   │
│  │           │              └───────────────┘                           │   │
│  │           │                                                          │   │
│  │  ┌────────▼────────┐                                                 │   │
│  │  │ BucketDeployment│  Uploads sample docs on deploy                  │   │
│  │  └─────────────────┘                                                 │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐                                                 │   │
│  │  │ Custom Resource │  Triggers StartIngestionJob after deploy        │   │
│  │  │ (Ingestion)     │                                                 │   │
│  │  └─────────────────┘                                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Agent Infrastructure                          │   │
│  │  ┌─────────────────┐    ┌─────────────────┐                          │   │
│  │  │ BedrockKnowledge│    │   BatchAgent    │                          │   │
│  │  │ Base (construct)│───▶│                 │                          │   │
│  │  │                 │    │ - System Prompt │                          │   │
│  │  │ References KB   │    │ - KB Retrieval  │                          │   │
│  │  │ created above   │    │ - Observability │                          │   │
│  │  └─────────────────┘    └─────────────────┘                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Knowledge Base Infrastructure

#### 1.1 Data Source S3 Bucket

```typescript
const dataSourceBucket = new Bucket(this, 'DataSourceBucket', {
  encryption: BucketEncryption.S3_MANAGED,
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});
```

**Purpose:** Stores the sample e-commerce documentation that will be indexed by the knowledge base.

#### 1.2 IAM Role for Bedrock KB

```typescript
const kbRole = new Role(this, 'KnowledgeBaseRole', {
  assumedBy: new ServicePrincipal('bedrock.amazonaws.com'),
  inlinePolicies: {
    BedrockKBPolicy: new PolicyDocument({
      statements: [
        // S3 access for data source
        new PolicyStatement({
          actions: ['s3:GetObject', 's3:ListBucket'],
          resources: [dataSourceBucket.bucketArn, `${dataSourceBucket.bucketArn}/*`],
        }),
        // Bedrock foundation model access for embeddings
        new PolicyStatement({
          actions: ['bedrock:InvokeModel'],
          resources: ['arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0'],
        }),
      ],
    }),
  },
});
```

#### 1.3 Bedrock Knowledge Base (L1 Construct)

```typescript
const knowledgeBase = new CfnKnowledgeBase(this, 'KnowledgeBase', {
  name: 'rag-customer-support-kb',
  description: 'E-commerce customer support documentation',
  roleArn: kbRole.roleArn,
  knowledgeBaseConfiguration: {
    type: 'VECTOR',
    vectorKnowledgeBaseConfiguration: {
      embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
    },
  },
  storageConfiguration: {
    type: 'S3',
    // S3 Vectors - Bedrock auto-manages vector storage
  },
});
```

**Key Configuration:**
- `type: 'VECTOR'` - Standard vector knowledge base
- `storageConfiguration.type: 'S3'` - Uses S3 Vectors (Bedrock manages vector bucket)
- Titan Embed Text v2 for embeddings

#### 1.4 Data Source (L1 Construct)

```typescript
const dataSource = new CfnDataSource(this, 'DataSource', {
  knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
  name: 'ecommerce-docs',
  description: 'E-commerce platform documentation',
  dataSourceConfiguration: {
    type: 'S3',
    s3Configuration: {
      bucketArn: dataSourceBucket.bucketArn,
    },
  },
});
```

#### 1.5 Sample Documentation Deployment

```typescript
new BucketDeployment(this, 'DeploySampleDocs', {
  sources: [Source.asset('./sample-docs')],
  destinationBucket: dataSourceBucket,
});
```

**Sample docs deployed:**
- `product-catalog.md` - Product information, categories, pricing
- `orders-shipping.md` - Order process, shipping policies, tracking
- `returns-refunds.md` - Return policy, refund process
- `account-help.md` - Account management, password reset, profile
- `faq.md` - Frequently asked questions

#### 1.6 Ingestion Custom Resource

```typescript
const ingestionHandler = new Function(this, 'IngestionHandler', {
  runtime: Runtime.PYTHON_3_11,
  handler: 'index.handler',
  code: Code.fromAsset('./resources/ingestion-handler'),
  timeout: Duration.minutes(5),
});

// Grant permissions
ingestionHandler.addToRolePolicy(new PolicyStatement({
  actions: ['bedrock:StartIngestionJob', 'bedrock:GetIngestionJob'],
  resources: [knowledgeBase.attrKnowledgeBaseArn],
}));

const ingestionTrigger = new CustomResource(this, 'IngestionTrigger', {
  serviceToken: ingestionHandler.functionArn,
  properties: {
    KnowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
    DataSourceId: dataSource.attrDataSourceId,
  },
});

// Ensure docs are uploaded before ingestion
ingestionTrigger.node.addDependency(bucketDeployment);
```

**Ingestion Handler Logic:**
```python
def handler(event, context):
    if event['RequestType'] in ['Create', 'Update']:
        kb_id = event['ResourceProperties']['KnowledgeBaseId']
        ds_id = event['ResourceProperties']['DataSourceId']
        
        # Start ingestion job
        response = bedrock_agent.start_ingestion_job(
            knowledgeBaseId=kb_id,
            dataSourceId=ds_id
        )
        
        # Wait for completion (with timeout)
        job_id = response['ingestionJob']['ingestionJobId']
        wait_for_ingestion(kb_id, ds_id, job_id)
        
    return {'PhysicalResourceId': f'{kb_id}-ingestion'}
```

### 2. Agent Infrastructure

#### 2.1 BedrockKnowledgeBase Construct

```typescript
const kbConstruct = new BedrockKnowledgeBase(this, 'KBReference', {
  name: 'ecommerce-support',
  description: 'E-commerce customer support documentation including products, orders, shipping, returns, and account help. Use for answering customer questions.',
  knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
  retrieval: {
    numberOfResults: 5,
  },
});
```

**Purpose:** Wraps the L1 KB resource with the library's `BedrockKnowledgeBase` construct for use with `BatchAgent`.

#### 2.2 BatchAgent with Knowledge Base

```typescript
const supportAgent = new BatchAgent(this, 'CustomerSupportAgent', {
  agentName: 'EcommerceSupport',
  agentDefinition: {
    bedrockModel: {
      useCrossRegionInference: true,
    },
    systemPrompt: new Asset(this, 'SystemPrompt', {
      path: './resources/system_prompt.txt',
    }),
    knowledgeBases: [kbConstruct],
  },
  prompt: 'Answer the customer question using the knowledge base.',
  enableObservability: true,
  metricNamespace: 'rag-customer-support',
  metricServiceName: 'customer-support-agent',
});
```

### 3. System Prompt Design

```
You are a helpful customer support agent for AcmeShop, an e-commerce platform.

Your role is to assist customers with questions about:
- Products and catalog
- Orders and shipping
- Returns and refunds
- Account management

INSTRUCTIONS:
1. Use the knowledge base to find relevant information before answering
2. Provide accurate, helpful responses based on the documentation
3. If information is not in the knowledge base, politely say you don't have that information
4. Be friendly and professional in your responses
5. For complex issues, suggest contacting human support

RESPONSE STYLE:
- Clear and concise
- Use bullet points for lists
- Include relevant details from documentation
- Offer additional help if needed
```

### 4. Sample Documentation Structure

```
sample-docs/
├── product-catalog.md      # Products, categories, pricing, availability
├── orders-shipping.md      # Order process, shipping options, tracking
├── returns-refunds.md      # Return policy, refund timeline, process
├── account-help.md         # Registration, password, profile, preferences
└── faq.md                  # Common questions across all topics
```

**Example: orders-shipping.md**
```markdown
# Orders and Shipping Guide

## Placing an Order
1. Add items to your cart
2. Proceed to checkout
3. Enter shipping address
4. Select shipping method
5. Complete payment

## Shipping Options
- **Standard Shipping**: 5-7 business days, free on orders over $50
- **Express Shipping**: 2-3 business days, $9.99
- **Next Day Delivery**: Next business day, $19.99

## Order Tracking
Track your order at acmeshop.com/track or use the tracking number in your confirmation email.

## Delivery Issues
If your package is delayed or missing:
1. Check tracking status
2. Wait 2 business days past estimated delivery
3. Contact support with order number
```

## File Structure

```
examples/document-processing/rag-customer-support/
├── app.ts                              # CDK app entry point
├── rag-customer-support-stack.ts       # Main stack definition
├── cdk.json                            # CDK configuration
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── README.md                           # Documentation
├── invoke-agent.sh                     # Helper script to test agent
├── sync-kb.sh                          # Re-sync KB after doc changes
├── resources/
│   ├── system_prompt.txt               # Agent system prompt
│   └── ingestion-handler/
│       ├── index.py                    # Custom resource handler
│       └── requirements.txt            # Python dependencies
├── sample-docs/
│   ├── README.md                       # Docs overview
│   ├── product-catalog.md              # Product documentation
│   ├── orders-shipping.md              # Orders/shipping docs
│   ├── returns-refunds.md              # Returns policy
│   ├── account-help.md                 # Account management
│   └── faq.md                          # FAQ
└── sample-questions/
    └── test-questions.json             # Sample questions for testing
```

## Data Flow

### Deployment Flow

```
1. cdk deploy
   │
   ├─▶ Create S3 bucket (data source)
   │
   ├─▶ Create IAM role for KB
   │
   ├─▶ Create CfnKnowledgeBase (S3 Vectors)
   │
   ├─▶ Create CfnDataSource
   │
   ├─▶ BucketDeployment uploads sample-docs/
   │
   ├─▶ Custom Resource triggers StartIngestionJob
   │   └─▶ Bedrock: fetch docs → chunk → embed → store vectors
   │
   ├─▶ Create BedrockKnowledgeBase construct (reference)
   │
   └─▶ Create BatchAgent with KB integration
```

### Query Flow

```
1. User invokes agent (via invoke-agent.sh or direct Lambda call)
   │
   ├─▶ BatchAgent Lambda receives question
   │
   ├─▶ Agent uses retrieve_from_knowledge_base tool
   │   └─▶ Bedrock KB: query → vector search → return chunks
   │
   ├─▶ Agent generates response using retrieved context
   │
   └─▶ Return natural language response to user
```

## CloudFormation Outputs

```typescript
new CfnOutput(this, 'KnowledgeBaseId', {
  value: knowledgeBase.attrKnowledgeBaseId,
  description: 'Bedrock Knowledge Base ID',
});

new CfnOutput(this, 'DataSourceBucket', {
  value: dataSourceBucket.bucketName,
  description: 'S3 bucket containing source documents',
});

new CfnOutput(this, 'AgentFunctionArn', {
  value: supportAgent.agentFunction.functionArn,
  description: 'Lambda function ARN for invoking the agent',
});

new CfnOutput(this, 'AgentFunctionName', {
  value: supportAgent.agentFunction.functionName,
  description: 'Lambda function name for invoke-agent.sh',
});
```

## Helper Scripts

### invoke-agent.sh

```bash
#!/bin/bash
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentFunctionName`].OutputValue' \
  --output text)

QUESTION="${1:-How do I track my order?}"

aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload "$(echo -n "{\"question\": \"$QUESTION\"}" | base64)" \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json | jq -r '.body'
```

### sync-kb.sh

```bash
#!/bin/bash
KB_ID=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' \
  --output text)

DS_ID=$(aws bedrock-agent list-data-sources \
  --knowledge-base-id "$KB_ID" \
  --query 'dataSourceSummaries[0].dataSourceId' \
  --output text)

aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KB_ID" \
  --data-source-id "$DS_ID"

echo "Ingestion job started. Check status in Bedrock console."
```

## Security Considerations

1. **Least Privilege IAM**: KB role only has access to specific S3 bucket and embedding model
2. **Encryption**: S3 bucket uses S3-managed encryption
3. **Auto-cleanup**: `RemovalPolicy.DESTROY` and `autoDeleteObjects: true` for clean teardown
4. **Cross-region inference**: Enabled for high availability
5. **Observability**: PII masking available via log group data protection

## Testing Strategy

### Sample Questions

```json
{
  "questions": [
    {
      "question": "How do I track my order?",
      "expectedTopics": ["tracking", "order status"]
    },
    {
      "question": "What is your return policy?",
      "expectedTopics": ["returns", "refund", "30 days"]
    },
    {
      "question": "How do I reset my password?",
      "expectedTopics": ["password", "account", "reset"]
    },
    {
      "question": "What shipping options do you offer?",
      "expectedTopics": ["standard", "express", "next day"]
    }
  ]
}
```

### Validation

1. Deploy stack: `cdk deploy`
2. Wait for ingestion to complete (check Bedrock console)
3. Run test questions: `./invoke-agent.sh "How do I track my order?"`
4. Verify responses reference correct documentation
5. Check CloudWatch logs for observability data
