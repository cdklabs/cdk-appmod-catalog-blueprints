# Minimal Bedrock Document Processing

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples/document-processing/minimal-bedrock-doc-processing)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/document-processing/#bedrockdocumentprocessing-construct)
[![Construct](https://img.shields.io/badge/construct-BedrockDocumentProcessing-blueviolet)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/document-processing/#bedrockdocumentprocessing-construct)

The absolute minimal document processing system using AppMod Catalog Blueprints. This example shows how to deploy a complete AI-powered document processing pipeline with zero configuration.

## What This Example Does

Deploy a complete document processing system with just one construct:

- **Document Upload**: S3 bucket automatically configured for document uploads
- **AI Classification**: Automatically identifies document types using Amazon Bedrock
- **Data Extraction**: Extracts key information from documents using Claude 3.5 Sonnet
- **Workflow Orchestration**: Step Functions manages the entire processing pipeline
- **Results Storage**: DynamoDB stores processing results and metadata

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   S3 Bucket     │    │   Step Functions│    │   Amazon        │
│   Document      │───▶│   Workflow      │───▶│   Bedrock       │
│   Upload        │    │                 │    │   (Claude 3.5)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   DynamoDB      │    │   CloudWatch    │
                       │   Results       │    │   Logs          │
                       └─────────────────┘    └─────────────────┘
```

## The Code

The entire system is deployed with just a few lines:

```typescript
// Create S3 bucket for document storage
const bucket = new Bucket(this, 'DocumentBucket', {
  encryption: BucketEncryption.KMS,
});

// Deploy complete document processing!
new BedrockDocumentProcessing(this, 'MinimalDocProcessor', {
  ingressAdapter: new QueuedS3Adapter({ bucket }),
  // Enable cross-region inference for Claude Sonnet 4
  classificationBedrockModel: {
    useCrossRegionInference: true,
  },
  processingBedrockModel: {
    useCrossRegionInference: true,
  },
});
```

This creates:
- S3 bucket with proper event notifications
- Step Functions workflow for processing orchestration
- Lambda functions for classification and extraction
- DynamoDB table for results storage
- IAM roles with least-privilege permissions
- CloudWatch logs for monitoring

## Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- CDK CLI installed: `npm install -g aws-cdk`
- Node.js 18+
- **Docker Desktop running** (required for Python Lambda bundling)
- Amazon Bedrock model access (Claude 3.5 Sonnet)

### Deploy

```bash
# Install dependencies
npm install

# Deploy the stack
npm run deploy
```

**Deployment time**: ~5 minutes

**Outputs**: After deployment, you'll see:
- `DocumentBucketName`: S3 bucket name for uploading documents
- `StateMachineArn`: Step Functions workflow ARN for monitoring
- `ProcessingTableName`: DynamoDB table name for results

### Test Document Processing

After deployment, upload a document to trigger processing:

**Option 1: Using the upload script (recommended)**
```bash
# Make the script executable
chmod +x upload-document.sh

# Upload a test document
./upload-document.sh sample-files/sample-invoice.jpg
```

**Option 2: Using AWS CLI directly**
```bash
# Get bucket name from deployment outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name MinimalBedrockDocProcessingStack \
    --query 'Stacks[0].Outputs[?OutputKey==`DocumentBucketName`].OutputValue' \
    --output text)

# Upload document to raw/ prefix to trigger processing
aws s3 cp sample-files/sample-invoice.jpg s3://$BUCKET_NAME/raw/
```

**View Results:**
- **Step Functions Console**: Search for "MinimalBedrockDocProcessingStack" to view workflow executions
- **DynamoDB Console**: Open the processing table (from outputs) to see extracted data
- **CloudWatch Logs**: Check `/aws/lambda/` log groups for detailed processing logs

## Default Capabilities

Out of the box, this system can process:

- **Invoices**: Invoice numbers, amounts, dates, vendor information
- **Receipts**: Purchase details, merchant info, totals
- **Contracts**: Parties, dates, key terms
- **Forms**: Field extraction based on document structure
- **Identity Documents**: Names, addresses, ID numbers

## What's Included

The `BedrockDocumentProcessing` construct provides:

- **Automatic retries** for transient failures
- **Error handling** with proper error states
- **Cost optimization** with appropriate resource sizing
- **Security** with encryption at rest and in transit
- **Monitoring** with CloudWatch metrics and logs
- **Scalability** with serverless auto-scaling

## Troubleshooting

### Docker Not Running
**Error**: `Cannot connect to the Docker daemon`

**Solution**: Start Docker Desktop on your machine. The construct uses Python Lambda functions that require Docker for bundling dependencies during CDK synthesis.

### Deployment Issues
- **Bedrock access denied**: Verify you have model access in the Bedrock console (us-east-1 or your deployment region)
- **No processing triggered**: Ensure documents are uploaded to the S3 bucket (check CloudFormation outputs for bucket name)
- **Processing timeout**: Check document size - very large documents may need timeout adjustments

### Monitoring
- **Step Functions Console**: View workflow execution progress and any errors
- **CloudWatch Logs**: Check Lambda function logs for detailed processing information
- **DynamoDB Console**: Query the table to see processing results

## Next Steps

This example demonstrates the power of AppMod Blueprints defaults. For more advanced features, see:

- [Bedrock Document Processing](../bedrock-document-processing/) - Add custom prompts and configuration
- [Agentic Document Processing](../agentic-document-processing/) - Advanced AI capabilities
- [Full-Stack Web App](../doc-processing-fullstack-webapp/) - Complete application with web interface


## Cleanup

```bash
npm run destroy
```
