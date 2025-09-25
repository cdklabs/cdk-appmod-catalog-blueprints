#!/bin/bash

# Enhanced script to upload documents to agentic document processing pipeline
# Usage: ./upload-document.sh <file-path> [document-type] [policy-number]
#
# Document types:
# - claim (default): Upload to raw/ folder to trigger processing
# - policy: Upload to policies/ folder  
# - supporting: Upload to supporting_documents/{policy-number}/ folder
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
    exit 1
fi

if [ $# -eq 0 ]; then
    echo "Usage: $0 <file-path> [document-type] [policy-number]"
    echo ""
    echo "Document types:"
    echo "  claim (default) - Upload to raw/ to trigger processing"
    echo "  policy          - Upload to policies/ folder"
    echo "  supporting      - Upload to supporting_documents/{policy-number}/"
    echo ""
    echo "Examples:"
    echo "  $0 sample-files/travel_claim.pdf"
    echo "  $0 policy-GTI-2024-789456.pdf policy"
    echo "  $0 hotel_receipt.pdf supporting GTI-2024-789456"
    exit 1
fi

FILE_PATH="$1"
DOC_TYPE="${2:-claim}"
POLICY_NUMBER="$3"

if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File '$FILE_PATH' not found"
    exit 1
fi

FILENAME=$(basename "$FILE_PATH")

# Determine S3 destination based on document type
case "$DOC_TYPE" in
    "claim")
        S3_PATH="raw/$FILENAME"
        echo "Uploading $FILENAME as claim document to trigger processing..."
        ;;
    "policy")
        S3_PATH="policies/$FILENAME"
        echo "Uploading $FILENAME as policy document..."
        ;;
    "supporting")
        if [ -z "$POLICY_NUMBER" ]; then
            echo "Error: Policy number required for supporting documents"
            echo "Usage: $0 <file-path> supporting <policy-number>"
            exit 1
        fi
        S3_PATH="supporting_documents/$POLICY_NUMBER/$FILENAME"
        echo "Uploading $FILENAME as supporting document for policy $POLICY_NUMBER..."
        ;;
    *)
        echo "Error: Invalid document type '$DOC_TYPE'"
        echo "Valid types: claim, policy, supporting"
        exit 1
        ;;
esac

AWS_PROFILE=$AWS_PROFILE aws s3 cp "$FILE_PATH" "s3://$S3_BUCKET/$S3_PATH"

if [ $? -eq 0 ]; then
    echo "Successfully uploaded $FILENAME to s3://$S3_BUCKET/$S3_PATH"
    if [ "$DOC_TYPE" = "claim" ]; then
        echo "Agentic document processing pipeline triggered"
        echo "Monitor progress in AWS Step Functions console"
    fi
else
    echo "Upload failed"
    exit 1
fi
