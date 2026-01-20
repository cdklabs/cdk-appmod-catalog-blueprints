#!/bin/bash

# Script to upload financial documents to fraud detection pipeline
# Usage: ./upload-document.sh <file-path>
#
# Required .env variables:
# AWS_PROFILE - AWS profile to use for authentication
# S3_BUCKET - S3 bucket name for document processing

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    echo "Create .env file with:"
    echo "AWS_PROFILE=your-aws-profile"
    echo "S3_BUCKET=your-s3-bucket-name"
    echo ""
    echo "To get the bucket name from CloudFormation stack outputs:"
    echo "aws cloudformation describe-stacks --stack-name FraudDetectionStack --query 'Stacks[0].Outputs[?OutputKey==\`BucketName\`].OutputValue' --output text"
    exit 1
fi

if [ $# -eq 0 ]; then
    echo "Usage: $0 <file-path>"
    echo ""
    echo "Example:"
    echo "  $0 sample-files/legitimate_invoice_1.pdf"
    echo "  $0 sample-files/fraudulent_tampered_invoice.pdf"
    exit 1
fi

FILE_PATH="$1"

if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File '$FILE_PATH' not found"
    exit 1
fi

FILENAME=$(basename "$FILE_PATH")

# Upload to raw/ prefix to trigger fraud detection processing
S3_PATH="raw/$FILENAME"

echo "Uploading $FILENAME to fraud detection pipeline..."

AWS_PROFILE=$AWS_PROFILE aws s3 cp "$FILE_PATH" "s3://$S3_BUCKET/$S3_PATH"

if [ $? -eq 0 ]; then
    echo "Successfully uploaded $FILENAME to s3://$S3_BUCKET/$S3_PATH"
    echo "Fraud detection processing pipeline triggered"
    echo "Monitor progress in AWS Step Functions console"
else
    echo "Upload failed"
    exit 1
fi
