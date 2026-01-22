---
inclusion: fileMatch
fileMatchPattern: 'examples/**'
---

# Deployment and Operations Guide

## Prerequisites

### Required Tools
- **Node.js**: Version 18.12.0 or higher
- **AWS CLI**: Version 2.x
- **AWS CDK**: Version 2.218.0 or higher
- **npm**: Version 8.x or higher

### AWS Account Setup
- AWS account with appropriate permissions
- AWS credentials configured (`aws configure`)
- CDK bootstrapped in target region

### Bootstrap CDK (One-time setup)
```bash
npx cdk bootstrap aws://ACCOUNT-ID/REGION
```

## Example Deployment

### Quick Deploy (3 Commands)
```bash
cd examples/document-processing/bedrock-document-processing
npm install
npm run deploy
```

### Manual Deployment Steps
```bash
# 1. Install dependencies
npm install

# 2. Synthesize CloudFormation template (optional, for review)
npx cdk synth

# 3. Deploy to AWS
npx cdk deploy

# 4. Deploy with auto-approval (CI/CD)
npx cdk deploy --require-approval never
```

### Deployment with Context Variables
```bash
# Deploy to specific environment
npx cdk deploy --context environment=production

# Deploy with custom parameters
npx cdk deploy --context bucketName=my-custom-bucket
```

## Stack Outputs

After deployment, CDK outputs important resource information:

```bash
# View stack outputs
aws cloudformation describe-stacks \
  --stack-name MyStack \
  --query 'Stacks[0].Outputs'

# Get specific output value
aws cloudformation describe-stacks \
  --stack-name MyStack \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text
```

## Monitoring Deployments

### CloudFormation Events
```bash
# Watch deployment progress
aws cloudformation describe-stack-events \
  --stack-name MyStack \
  --max-items 20
```

### Deployment Logs
```bash
# CDK deployment logs are in terminal output
# CloudFormation logs are in AWS Console
```

## Testing Deployed Resources

### Upload Test Document
```bash
# Using provided upload script
./upload-document.sh sample-files/test-document.pdf

# Using AWS CLI
aws s3 cp sample-files/test-document.pdf \
  s3://BUCKET-NAME/raw/test-document.pdf
```

### Monitor Processing
```bash
# List Step Functions executions
aws stepfunctions list-executions \
  --state-machine-arn STATE-MACHINE-ARN \
  --max-results 10

# Get execution details
aws stepfunctions describe-execution \
  --execution-arn EXECUTION-ARN

# Get execution history
aws stepfunctions get-execution-history \
  --execution-arn EXECUTION-ARN
```

### Check DynamoDB Records
```bash
# Scan table for recent documents
aws dynamodb scan \
  --table-name TABLE-NAME \
  --max-items 10

# Get specific document
aws dynamodb get-item \
  --table-name TABLE-NAME \
  --key '{"DocumentId":{"S":"doc-123"}}'
```

### View Lambda Logs
```bash
# Get recent logs
aws logs tail /aws/lambda/FUNCTION-NAME --follow

# Search logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/FUNCTION-NAME \
  --filter-pattern "ERROR"
```

## Cleanup

### Delete Stack
```bash
# Delete with CDK
npx cdk destroy

# Delete with CloudFormation
aws cloudformation delete-stack --stack-name MyStack

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete \
  --stack-name MyStack
```

### Manual Cleanup (if needed)
```bash
# Empty S3 buckets before deletion
aws s3 rm s3://BUCKET-NAME --recursive

# Delete log groups
aws logs delete-log-group \
  --log-group-name /aws/lambda/FUNCTION-NAME
```

## Troubleshooting Deployments

### Common Issues

**Issue**: CDK bootstrap required
```
Error: This stack uses assets, so the toolkit stack must be deployed
```
**Solution**: Run `npx cdk bootstrap`

**Issue**: Insufficient permissions
```
Error: User is not authorized to perform: cloudformation:CreateStack
```
**Solution**: Ensure AWS credentials have necessary permissions

**Issue**: Resource already exists
```
Error: Bucket already exists
```
**Solution**: Use unique names or delete existing resources

**Issue**: CDK version mismatch
```
Error: Cloud assembly schema version mismatch
```
**Solution**: Update CDK: `npm install -g aws-cdk@latest`

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Deploy
        run: npx cdk deploy --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: us-east-1
```

## Cost Optimization

### Resource Cleanup
- Delete unused stacks
- Set S3 lifecycle policies
- Use appropriate Lambda memory sizes
- Enable DynamoDB on-demand billing for variable workloads

### Monitoring Costs
```bash
# Get cost and usage
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

## Security Best Practices

### Secrets Management
- Never commit AWS credentials
- Use AWS Secrets Manager for sensitive data
- Rotate credentials regularly
- Use IAM roles for EC2/Lambda

### Network Security
- Deploy in VPC when needed
- Use security groups appropriately
- Enable VPC Flow Logs
- Use private subnets for sensitive resources
