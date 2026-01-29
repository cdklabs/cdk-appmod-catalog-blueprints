# RAG Customer Support Example

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples/document-processing/rag-customer-support)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/examples/document-processing/rag-customer-support/)
[![Construct](https://img.shields.io/badge/construct-BatchAgent-blueviolet)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/)
[![Construct](https://img.shields.io/badge/construct-BedrockKnowledgeBase-blueviolet)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/#knowledge-base-integration)

## Overview

This example demonstrates the **Knowledge Base integration** feature of the Agentic AI Framework. It creates a customer support agent for a fictional e-commerce platform (AcmeShop) that uses Amazon Bedrock Knowledge Bases with S3 Vectors for RAG-based question answering.

**Use Case**: Customer support chatbot, FAQ automation, documentation-based Q&A

**Key Features**:
- **RAG-Powered Responses**: Agent retrieves relevant documentation before answering
- **Zero Infrastructure Setup**: Single `cdk deploy` creates everything end-to-end
- **S3 Vectors Storage**: Bedrock automatically manages vector embeddings
- **Production-Ready**: Includes observability, cross-region inference, and proper IAM

## What This Example Demonstrates

The system automatically answers customer questions by:

1. **Retrieving Context**: Queries the knowledge base to find relevant documentation
2. **Generating Responses**: Uses Claude to synthesize helpful answers from retrieved content
3. **Handling Edge Cases**: Gracefully handles questions outside the knowledge base scope

**Topics the agent can help with:**
- Products & Catalog (pricing, availability, warranties)
- Orders & Shipping (tracking, delivery options, payment methods)
- Returns & Refunds (policy, process, timelines)
- Account Management (registration, password reset, settings)

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
│  │  ┌────────▼────────┐    ┌─────────────────┐                         │   │
│  │  │ BucketDeployment│    │ Custom Resource │                         │   │
│  │  │ (Sample Docs)   │───▶│ (Ingestion)     │                         │   │
│  │  └─────────────────┘    └─────────────────┘                         │   │
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

**Deployment Flow:**
1. CDK creates S3 bucket for source documents
2. Sample documentation is uploaded via BucketDeployment
3. Bedrock Knowledge Base is created with S3 Vectors storage
4. Custom resource triggers ingestion (documents → embeddings)
5. BatchAgent is created with knowledge base integration
6. Agent is ready to answer questions

**Query Flow:**
1. User invokes agent with a question
2. Agent queries knowledge base for relevant documentation
3. Bedrock returns top 5 matching document chunks
4. Agent generates response using Claude with retrieved context
5. User receives helpful, documentation-based answer


## Prerequisites

Before deploying this example, ensure you have:

- **AWS CLI**: Configured with appropriate credentials
  ```bash
  aws configure
  ```

- **CDK CLI**: AWS Cloud Development Kit CLI installed
  ```bash
  npm install -g aws-cdk
  ```

- **Node.js**: Version 18 or higher
  ```bash
  node --version
  ```

- **jq**: JSON processor for parsing responses (optional but recommended)
  ```bash
  # macOS
  brew install jq
  
  # Ubuntu/Debian
  sudo apt-get install jq
  ```

- **Amazon Bedrock Access**: Model access enabled for:
  - **Claude Sonnet 4** (default) - for agent responses
  - **Titan Embed Text v2** - for document embeddings
  
  To enable model access:
  1. Navigate to Amazon Bedrock console
  2. Go to "Model access" in the left navigation
  3. Request access to the required models
  4. Wait for access to be granted (usually immediate)

## Deployment

### Deploy Steps

1. **Navigate to the example directory**
   ```bash
   cd examples/document-processing/rag-customer-support
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Bootstrap CDK (if not already done)**
   ```bash
   npx cdk bootstrap
   ```

4. **Deploy the stack**
   ```bash
   npx cdk deploy --require-approval never
   ```
   
   Or with a specific AWS profile:
   ```bash
   AWS_PROFILE=your-profile npx cdk deploy --require-approval never
   ```

5. **Wait for deployment to complete**
   
   The deployment includes:
   - Creating S3 bucket and uploading sample documentation
   - Creating Bedrock Knowledge Base with S3 Vectors
   - Triggering initial document ingestion (may take 1-2 minutes)
   - Creating BatchAgent with knowledge base integration

6. **Note the stack outputs**
   
   After deployment, CDK will output:
   - `KnowledgeBaseId` - Bedrock Knowledge Base ID
   - `DataSourceBucket` - S3 bucket containing source documents
   - `AgentFunctionArn` - Lambda function ARN
   - `AgentFunctionName` - Lambda function name for invoke-agent.sh

### What Happens During Deployment

1. **S3 Bucket Creation**: Encrypted bucket for storing source documents
2. **Document Upload**: Sample e-commerce documentation deployed to S3
3. **Knowledge Base Creation**: Bedrock KB with S3 Vectors storage configuration
4. **Ingestion**: Custom resource triggers StartIngestionJob API
   - Bedrock fetches documents from S3
   - Converts content into text chunks
   - Generates embeddings using Titan Embed Text v2
   - Stores embeddings in managed S3 vector bucket
5. **Agent Creation**: BatchAgent configured with KB integration and system prompt


## Usage

### Invoke the Agent

Use the provided helper script to ask questions:

```bash
# Make the script executable (first time only)
chmod +x invoke-agent.sh

# Ask a question (default: "How do I track my order?")
./invoke-agent.sh

# Ask a specific question
./invoke-agent.sh "What is your return policy?"

# More example questions
./invoke-agent.sh "What shipping options do you offer?"
./invoke-agent.sh "How do I reset my password?"
./invoke-agent.sh "Do you have any laptops in stock?"
./invoke-agent.sh "What is AcmeRewards?"
```

**Manual invocation using AWS CLI:**

```bash
# Get function name from stack outputs
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentFunctionName`].OutputValue' \
  --output text)

# Invoke with a question
aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload '{"question": "How do I track my order?"}' \
  --cli-binary-format raw-in-base64-out \
  response.json

# View response
cat response.json | jq -r '.body'
```

### Expected Output

The agent provides natural language responses based on the knowledge base content:

**Example: Order Tracking Question**
```
Question: "How do I track my order?"

Response: "Great question! You can track your order in a few easy ways:

1. **My Orders Page**: Log into your AcmeShop account and go to 'My Orders' to see 
   real-time status updates for all your orders.

2. **Tracking Number**: Once your order ships, you'll receive an email with a 
   tracking number. Click the link or enter it on the carrier's website (UPS, 
   FedEx, or USPS).

3. **Order Confirmation Email**: Your confirmation email includes a 'Track Order' 
   button that takes you directly to the tracking page.

Is there anything else I can help you with?"
```

**Example: Return Policy Question**
```
Question: "What is your return policy?"

Response: "Our return policy is designed to make returns easy for you:

- **Standard Items**: 30-day return window from delivery date
- **Electronics**: 15-day return window (must be unopened or defective)
- **Condition**: Items must be unused and in original packaging

To start a return:
1. Go to 'My Orders' in your account
2. Select the item you want to return
3. Choose your reason and print the prepaid return label

Refunds are processed within 5-7 business days after we receive your return. 
Would you like help with anything else?"
```

**Example: Product Information Question**
```
Question: "What smartphones do you sell?"

Response: "We have two great smartphone options:

**AcmePhone Pro** - $899.99
- 6.7" OLED display, 256GB storage, 5G capable
- Available in Black, Silver, and Blue
- Currently in stock!

**AcmePhone Lite** - $499.99
- 6.1" LCD display, 128GB storage, 4G LTE
- Available in Black and White
- Currently in stock!

Both phones come with a 1-year manufacturer warranty. Would you like more 
details about either model?"
```

### Sample Questions

The `sample-questions/test-questions.json` file contains 25+ test questions covering:
- Product catalog (pricing, availability, warranties)
- Orders and shipping (tracking, delivery options, payment)
- Returns and refunds (policy, process, timelines)
- Account management (registration, password, settings)
- General FAQ (loyalty program, contact info)

### Adding Custom Documentation

To add your own documentation to the knowledge base:

1. **Add markdown files** to the `sample-docs/` directory
   ```bash
   # Example: Add a promotions document
   echo "# Current Promotions\n\n## Summer Sale\n- 20% off all electronics..." > sample-docs/promotions.md
   ```

2. **Re-sync the knowledge base** using the helper script
   ```bash
   chmod +x sync-kb.sh
   ./sync-kb.sh
   ```

3. **Wait for ingestion to complete** (check Bedrock console or use AWS CLI)
   ```bash
   # Check ingestion status
   KB_ID=$(aws cloudformation describe-stacks \
     --stack-name RagCustomerSupportStack \
     --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' \
     --output text)
   
   aws bedrock-agent list-ingestion-jobs --knowledge-base-id $KB_ID
   ```

4. **Test with relevant questions**
   ```bash
   ./invoke-agent.sh "What promotions do you have right now?"
   ```

**Best Practices for Knowledge Base Content:**
- Use clear headings and structure for better chunking
- Include specific details (prices, timeframes, steps)
- Write in a customer-friendly tone
- Keep related information together
- Use lists and tables for easy scanning


## Monitoring

### View Lambda Function Logs

Monitor agent execution through CloudWatch Logs:

```bash
# Get function name
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentFunctionName`].OutputValue' \
  --output text)

# Tail logs in real-time
aws logs tail /aws/lambda/$FUNCTION_NAME --follow

# View recent logs
aws logs tail /aws/lambda/$FUNCTION_NAME --since 1h
```

### View CloudWatch Metrics

The agent publishes metrics to the `rag-customer-support` namespace:

```bash
# View available metrics
aws cloudwatch list-metrics --namespace rag-customer-support

# Get invocation statistics
aws cloudwatch get-metric-statistics \
  --namespace rag-customer-support \
  --metric-name Duration \
  --dimensions Name=ServiceName,Value=customer-support-agent \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

### Check Knowledge Base Status

Monitor the knowledge base and ingestion jobs:

```bash
# Get Knowledge Base ID
KB_ID=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' \
  --output text)

# View knowledge base details
aws bedrock-agent get-knowledge-base --knowledge-base-id $KB_ID

# List ingestion jobs
aws bedrock-agent list-ingestion-jobs --knowledge-base-id $KB_ID

# Get specific ingestion job status
aws bedrock-agent get-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id <DATA_SOURCE_ID> \
  --ingestion-job-id <JOB_ID>
```

### View S3 Bucket Contents

Check uploaded documents:

```bash
# Get bucket name
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DataSourceBucket`].OutputValue' \
  --output text)

# List documents
aws s3 ls s3://$BUCKET_NAME/ --recursive
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Agent Returns Empty or Unhelpful Response

**Symptom**: Agent doesn't use knowledge base content in responses

**Possible Causes:**
- Ingestion not complete
- Question doesn't match any documents
- Knowledge base retrieval failing

**Solutions:**
```bash
# Check ingestion status
KB_ID=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' \
  --output text)

aws bedrock-agent list-ingestion-jobs --knowledge-base-id $KB_ID

# Verify documents are in S3
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DataSourceBucket`].OutputValue' \
  --output text)

aws s3 ls s3://$BUCKET_NAME/

# Re-trigger ingestion if needed
./sync-kb.sh
```

#### 2. Deployment Fails During Ingestion

**Symptom**: Stack deployment times out or fails at IngestionTrigger

**Possible Causes:**
- Bedrock service quota exceeded
- IAM permissions issue
- Network connectivity issue

**Solutions:**
```bash
# Check Lambda logs for ingestion handler
aws logs tail /aws/lambda/RagCustomerSupportStack-IngestionHandler --since 30m

# Verify Bedrock model access
aws bedrock list-foundation-models \
  --by-provider amazon \
  --query 'modelSummaries[?modelId==`amazon.titan-embed-text-v2:0`]'

# Retry deployment
npx cdk deploy --require-approval never
```

#### 3. "Model Access Denied" Error

**Symptom**: Agent invocation fails with access denied error

**Possible Causes:**
- Bedrock model access not enabled
- Cross-region inference not available

**Solutions:**
1. Navigate to Amazon Bedrock console
2. Go to "Model access" in the left navigation
3. Ensure access is granted for:
   - Anthropic Claude Sonnet 4 (default model)
   - Amazon Titan Embed Text v2
4. Wait for access to be granted (usually immediate)

#### 4. invoke-agent.sh Script Fails

**Symptom**: Script returns error about missing function name

**Possible Causes:**
- Stack not deployed
- Wrong stack name
- AWS CLI not configured

**Solutions:**
```bash
# Verify stack exists
aws cloudformation describe-stacks --stack-name RagCustomerSupportStack

# Check AWS CLI configuration
aws sts get-caller-identity

# Verify stack outputs
aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs'
```

#### 5. Knowledge Base Sync Fails

**Symptom**: sync-kb.sh returns error or ingestion job fails

**Possible Causes:**
- Invalid document format
- S3 permissions issue
- Document too large

**Solutions:**
```bash
# Check ingestion job details
KB_ID=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' \
  --output text)

# List data sources
aws bedrock-agent list-data-sources --knowledge-base-id $KB_ID

# Get detailed error from failed ingestion
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id $KB_ID \
  --query 'ingestionJobSummaries[?status==`FAILED`]'
```

### Debug Mode

Enable verbose logging for detailed troubleshooting:

```bash
# Update Lambda environment for debug logging
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentFunctionName`].OutputValue' \
  --output text)

aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --environment Variables={LOG_LEVEL=DEBUG}

# Invoke and check detailed logs
./invoke-agent.sh "Test question"
aws logs tail /aws/lambda/$FUNCTION_NAME --since 5m
```

## Cleanup

To remove all resources created by this example:

```bash
# Delete the CloudFormation stack
npx cdk destroy
```

**Confirm deletion when prompted.** This will delete:
- S3 bucket (and all uploaded documents)
- Bedrock Knowledge Base
- Data Source configuration
- Lambda functions (agent and ingestion handler)
- IAM roles and policies
- CloudWatch log groups

**Note**: The S3 bucket is configured with `autoDeleteObjects: true`, so it will be emptied automatically before deletion.

If you encounter errors during cleanup:

```bash
# Force empty the S3 bucket manually if needed
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name RagCustomerSupportStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DataSourceBucket`].OutputValue' \
  --output text)

aws s3 rm s3://$BUCKET_NAME --recursive

# Retry destroy
npx cdk destroy
```

## Sample Documentation

The `sample-docs/` directory contains realistic e-commerce documentation:

| Document | Description |
|----------|-------------|
| `product-catalog.md` | Product categories, pricing, availability, warranties |
| `orders-shipping.md` | Order process, shipping options, tracking, delivery issues |
| `returns-refunds.md` | Return policy, refund process, exchanges |
| `account-help.md` | Account registration, password reset, profile management |
| `faq.md` | Frequently asked questions across all topics |

## Additional Resources

- [BatchAgent Construct Documentation](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/)
- [BedrockKnowledgeBase Integration](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/#knowledge-base-integration)
- [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [Amazon Bedrock S3 Vectors](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-s3-vectors.html)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)

## License

This example is licensed under the Apache-2.0 License. See the LICENSE file in the repository root.
