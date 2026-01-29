#!/bin/bash
# sync-kb.sh - Helper script to re-sync the Knowledge Base after document changes
#
# This script retrieves the Knowledge Base ID from CloudFormation stack outputs
# and triggers a new ingestion job to sync any document changes.
#
# Usage:
#   ./sync-kb.sh
#
# Use this script after:
#   - Adding new documents to the sample-docs/ directory
#   - Modifying existing documents
#   - Uploading documents directly to the S3 bucket
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Stack deployed: cdk deploy

set -e

STACK_NAME="RagCustomerSupportStack"

# Get Knowledge Base ID from CloudFormation stack outputs
KB_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$KB_ID" ] || [ "$KB_ID" == "None" ]; then
  echo "Error: Could not retrieve KnowledgeBaseId from stack '$STACK_NAME'"
  echo "Make sure the stack is deployed: cdk deploy"
  exit 1
fi

echo "Knowledge Base ID: $KB_ID"

# Get Data Source ID from Bedrock
DS_ID=$(aws bedrock-agent list-data-sources \
  --knowledge-base-id "$KB_ID" \
  --query 'dataSourceSummaries[0].dataSourceId' \
  --output text 2>/dev/null)

if [ -z "$DS_ID" ] || [ "$DS_ID" == "None" ]; then
  echo "Error: Could not retrieve Data Source ID for Knowledge Base '$KB_ID'"
  exit 1
fi

echo "Data Source ID: $DS_ID"
echo "---"

# Start ingestion job
echo "Starting ingestion job..."
RESPONSE=$(aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KB_ID" \
  --data-source-id "$DS_ID" \
  --output json 2>/dev/null)

# Extract job ID if jq is available
if command -v jq &> /dev/null; then
  JOB_ID=$(echo "$RESPONSE" | jq -r '.ingestionJob.ingestionJobId')
  STATUS=$(echo "$RESPONSE" | jq -r '.ingestionJob.status')
  echo "Ingestion Job ID: $JOB_ID"
  echo "Status: $STATUS"
else
  echo "$RESPONSE"
fi

echo "---"
echo "Ingestion job started successfully!"
echo "Check status in the Bedrock console or run:"
echo "  aws bedrock-agent get-ingestion-job --knowledge-base-id $KB_ID --data-source-id $DS_ID --ingestion-job-id <JOB_ID>"
