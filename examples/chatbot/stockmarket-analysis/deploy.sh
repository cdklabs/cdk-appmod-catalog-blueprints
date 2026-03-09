#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="StockmarketAnalysisStack"

cd "$(dirname "$0")"

# Initialize venv if it doesn't exist
if [ ! -d .venv ]; then
  echo "No .venv found, running init.sh..."
  bash init.sh
fi

source .venv/bin/activate

# Build frontend
echo "Building frontend..."
cd frontend
npm ci --silent
npm run build
cd ..

# Deploy
echo "Deploying CDK stack..."
cdk deploy --require-approval never --outputs-file cdk-outputs.json

# Extract outputs
echo "Deploying config.json to frontend bucket..."
API_ENDPOINT=$(jq -r ".${STACK_NAME}.AgentApiEndpoint" cdk-outputs.json)
USER_POOL_ID=$(jq -r ".${STACK_NAME}.UserPoolId" cdk-outputs.json)
CLIENT_ID=$(jq -r ".${STACK_NAME}.UserPoolClientId" cdk-outputs.json)
BUCKET_NAME=$(jq -r ".${STACK_NAME}.FrontendBucketName" cdk-outputs.json)
DISTRIBUTION_ID=$(jq -r ".${STACK_NAME}.DistributionId" cdk-outputs.json)
REGION=$(aws configure get region || echo "us-east-1")

# Write config.json to S3
echo "{\"apiEndpoint\":\"${API_ENDPOINT}\",\"userPoolId\":\"${USER_POOL_ID}\",\"userPoolClientId\":\"${CLIENT_ID}\",\"region\":\"${REGION}\"}" \
  | aws s3 cp - "s3://${BUCKET_NAME}/config.json" --content-type "application/json"

# Invalidate CloudFront cache for config.json
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/config.json" > /dev/null

FRONTEND_URL=$(jq -r ".${STACK_NAME}.FrontendUrl" cdk-outputs.json)
echo ""
echo "Deployment complete!"
echo "Frontend: ${FRONTEND_URL}"
