#!/bin/bash
set -e

echo "🏦 Deploying Retail Banking Chatbot..."
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
echo "2. Set frontend env vars in frontend/.env.production (see outputs.json)"
echo "3. Rebuild frontend: cd frontend && npm run build"
echo "4. Redeploy: cd infrastructure && npx cdk deploy --require-approval never"
echo "5. Access the frontend URL from outputs.json"
