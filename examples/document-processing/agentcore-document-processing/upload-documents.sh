#!/bin/bash

# Upload Documents Script for Insurance Claims Processing
# This script uploads sample documents to the S3 bucket for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Get stack name from argument or use default
STACK_NAME="${1:-DocumentProcessingLambdaStack}"

print_info "Getting bucket name from stack: $STACK_NAME"

# Get bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`DocumentBucketName`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$BUCKET_NAME" ]; then
    print_error "Could not find DocumentBucketName output in stack $STACK_NAME"
    print_info "Available stacks:"
    aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query 'StackSummaries[?contains(StackName, `DocumentProcessing`)].StackName' \
        --output table
    exit 1
fi

print_info "Found bucket: $BUCKET_NAME"

# Check if sample files directory exists
if [ ! -d "sample-files" ]; then
    print_warning "sample-files directory not found. Creating it..."
    mkdir -p sample-files
    print_info "Please add your sample PDF files to the sample-files directory:"
    print_info "  - sample-files/GTI-2024-789456.pdf (policy)"
    print_info "  - sample-files/travel_claim.pdf (claim)"
    print_info "  - sample-files/hotel_receipt.pdf (supporting doc)"
    print_info "  - sample-files/meal_receipts.pdf (supporting doc)"
    exit 0
fi

# Upload policy document
if [ -f "sample-files/GTI-2024-789456.pdf" ]; then
    print_info "Uploading policy document..."
    aws s3 cp sample-files/GTI-2024-789456.pdf "s3://$BUCKET_NAME/policies/GTI-2024-789456.pdf"
    print_info "✓ Policy uploaded"
else
    print_warning "Policy file not found: sample-files/GTI-2024-789456.pdf"
fi

# Upload supporting documents
POLICY_NUMBER="GTI-2024-789456"
print_info "Uploading supporting documents for policy $POLICY_NUMBER..."

for file in sample-files/hotel_receipt.pdf sample-files/meal_receipts.pdf sample-files/airline_delay_notification.pdf; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        aws s3 cp "$file" "s3://$BUCKET_NAME/supporting_documents/$POLICY_NUMBER/$filename"
        print_info "✓ Uploaded $filename"
    else
        print_warning "File not found: $file"
    fi
done

print_info ""
print_info "Upload complete! Documents are now in S3:"
print_info "  Bucket: $BUCKET_NAME"
print_info "  Policy: policies/GTI-2024-789456.pdf"
print_info "  Supporting docs: supporting_documents/GTI-2024-789456/"
print_info ""
print_info "To invoke the agent, use the sample-claim.json file:"
print_info "  aws lambda invoke --function-name <FUNCTION_NAME> --payload file://sample-claim.json response.json"
