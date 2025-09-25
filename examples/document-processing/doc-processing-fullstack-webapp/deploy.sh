#!/bin/bash

echo "Deploying Insurance Claims Frontend to CloudFront + S3"

# Build React app
echo "Building React app..."
cd frontend-app
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: React build failed"
    exit 1
fi
cd ..

# Install CDK dependencies
echo "Installing CDK dependencies..."
cd infrastructure
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: CDK dependency installation failed"
    exit 1
fi

# Build CDK
echo "Building CDK..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: CDK build failed"
    exit 1
fi

# Deploy to AWS with specific profile
echo "Deploying to AWS..."
AWS_PROFILE=appmod-blueprints npx cdk deploy --require-approval never
if [ $? -ne 0 ]; then
    echo "ERROR: CDK deployment failed"
    exit 1
fi

echo "Deployment completed successfully"
echo "Your app is now live on CloudFront"
