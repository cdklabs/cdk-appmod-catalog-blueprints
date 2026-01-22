#!/bin/bash

# Minimal script to upload documents for processing
# Usage: ./upload-document.sh <file-path>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <file-path>"
    echo "Example: $0 sample-invoice.pdf"
    exit 1
fi

FILE_PATH="$1"

if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File '$FILE_PATH' not found"
    exit 1
fi

# Get the S3 bucket name from CDK outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name MinimalBedrockDocProcessingStack \
    --query 'Stacks[0].Outputs[?OutputKey==`DocumentBucketName`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$BUCKET_NAME" ]; then
    echo "Error: Could not find S3 bucket. Make sure the stack is deployed."
    exit 1
fi

FILENAME=$(basename "$FILE_PATH")

echo "Uploading $FILENAME to trigger document processing..."

aws s3 cp "$FILE_PATH" "s3://$BUCKET_NAME/raw/$FILENAME"

if [ $? -eq 0 ]; then
    echo "✅ Successfully uploaded $FILENAME"
    echo "📄 Document processing started automatically"
    echo "🔍 Check results in DynamoDB or Step Functions console"
else
    echo "❌ Upload failed"
    exit 1
fi
