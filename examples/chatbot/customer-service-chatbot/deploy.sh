#!/bin/bash

set -e

echo "🚀 Deploying Customer Support Chatbot..."
echo ""

# Install infrastructure dependencies
echo "📦 Installing infrastructure dependencies..."
cd infrastructure
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Deploy CDK stack
echo "☁️  Deploying CDK stack..."
cd infrastructure
npx cdk deploy --require-approval never --outputs-file ../outputs.json
cd ..

# Extract outputs
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 CloudFormation Outputs:"
cat outputs.json | grep -E "(ChatApiEndpoint|UserPoolId|UserPoolClientId|Region|FrontendUrl)" || true

echo ""
echo "🌐 Frontend URL:"
cat outputs.json | grep "FrontendUrl" | awk -F'"' '{print $4}' || echo "Check outputs.json for FrontendUrl"

echo ""
echo "📝 Next steps:"
echo "1. Wait a few minutes for CloudFront distribution to deploy"
echo "2. Access the frontend URL above"
echo "3. Sign up for a new account"
echo "4. Start chatting!"
echo ""
echo "To destroy the stack:"
echo "  cd infrastructure && npx cdk destroy"
