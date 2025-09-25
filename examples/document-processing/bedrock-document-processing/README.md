# Bedrock Document Processing Example

This example demonstrates how to use the BedrockDocumentProcessing construct to process documents using Amazon Bedrock.

## Architecture

The construct creates:
- S3 bucket for document storage
- SQS queue for processing workflow
- Step Functions workflow with Bedrock-powered classification and extraction
- Lambda functions that invoke Bedrock models

## Deployment

```bash
npm install
npm run build
npx cdk deploy
```

## Usage

1. Upload a document (JPG, PNG, or PDF) to the created S3 bucket
2. The workflow will automatically classify and extract entities from the document
3. Results are processed through the Step Functions workflow

## Clean up

```bash
npx cdk destroy
```
