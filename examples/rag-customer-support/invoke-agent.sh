#!/bin/bash
# invoke-agent.sh - Helper script to invoke the RAG Customer Support Agent
#
# This script retrieves the Lambda function name from CloudFormation stack outputs
# and invokes the agent with a customer question.
#
# Usage:
#   ./invoke-agent.sh "Your question here"
#   ./invoke-agent.sh  # Uses default question: "How do I track my order?"
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - jq installed for JSON parsing
#   - Stack deployed: cdk deploy

set -e

STACK_NAME="RagCustomerSupportStack"

# Get function name from CloudFormation stack outputs
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentFunctionName`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$FUNCTION_NAME" ] || [ "$FUNCTION_NAME" == "None" ]; then
  echo "Error: Could not retrieve AgentFunctionName from stack '$STACK_NAME'"
  echo "Make sure the stack is deployed: cdk deploy"
  exit 1
fi

# Accept question as command line argument or use default
QUESTION="${1:-How do I track my order?}"

echo "Invoking agent with question: $QUESTION"
echo "Function: $FUNCTION_NAME"
echo "---"

# Invoke Lambda function with correct event format for BatchAgent
# contentType: "data" means the content is inline text (not an S3 file)
aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload "{\"contentType\": \"data\", \"content\": {\"data\": \"Customer question: $QUESTION\"}}" \
  --cli-binary-format raw-in-base64-out \
  /tmp/response.json > /dev/null

# Display response in readable format
if command -v jq &> /dev/null; then
  # Try to parse as JSON and extract body, fallback to raw output
  BODY=$(jq -r '.body // .' /tmp/response.json 2>/dev/null)
  if [ "$BODY" != "null" ] && [ -n "$BODY" ]; then
    echo "$BODY"
  else
    cat /tmp/response.json
  fi
else
  cat /tmp/response.json
fi

# Cleanup
rm -f /tmp/response.json
