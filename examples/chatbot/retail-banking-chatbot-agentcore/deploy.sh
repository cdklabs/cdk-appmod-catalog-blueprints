#!/bin/bash
set -e

echo "🏦 Deploying Retail Banking Chatbot (AgentCore Runtime)..."
echo ""

# Install infrastructure dependencies
echo "📦 Installing infrastructure dependencies..."
cd infrastructure
npm install
cd ..

# Install and build frontend
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "🔨 Building frontend..."
npm run build
cd ..

# Deploy CDK stack
echo "☁️  Deploying CDK stack..."
cd infrastructure
npx cdk deploy --require-approval never --outputs-file ../outputs.json
cd ..

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Seed transaction data: ./seed-data.sh"
echo "2. Copy AgentCoreEndpoint, UserPoolId, UserPoolClientId, and Region"
echo "   from outputs.json into frontend/.env.production:"
echo "     REACT_APP_CHAT_API_ENDPOINT=<AgentCoreEndpoint value>"
echo "     REACT_APP_USER_POOL_ID=<UserPoolId value>"
echo "     REACT_APP_USER_POOL_CLIENT_ID=<UserPoolClientId value>"
echo "     REACT_APP_REGION=<Region value>"
echo "3. Rebuild frontend: cd frontend && npm run build"
echo "4. Redeploy: cd infrastructure && npx cdk deploy --require-approval never"
echo "5. Access the frontend URL from outputs.json"
