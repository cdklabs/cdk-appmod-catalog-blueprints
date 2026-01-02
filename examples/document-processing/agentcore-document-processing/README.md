# Insurance Claims Processing with AgentCore Runtime

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples/document-processing/agentcore-document-processing)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/)
[![Construct](https://img.shields.io/badge/construct-BatchAgent-blueviolet)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/)

## Overview

This example demonstrates insurance claims processing using the `BatchAgent` construct with different runtime configurations:

1. **Lambda Runtime** - Traditional Lambda functions (baseline)
2. **AgentCore Runtime (CONTAINER)** - Docker container deployment to ECR

> **Note**: AgentCore Runtime with DIRECT_CODE deployment (ZIP-based S3 deployment) is not yet fully supported and is commented out in the example. It will be available in a future release.

Both implementations use the same agent logic and tools, showcasing how the AgentCore runtime enables longer execution times and more flexible deployment options compared to Lambda.

**Use Case**: Insurance claims validation, policy verification, document cross-referencing

## What This Example Does

The agent automatically analyzes insurance claims by:

- **Policy Verification**: Downloads and analyzes insurance policies from S3
- **Supporting Document Review**: Retrieves and validates receipts and supporting evidence
- **Cross-Reference Checking**: Ensures claim details match supporting documents
- **Decision Making**: Provides approval/denial with detailed justification

## Architecture Comparison

### Lambda Runtime (Baseline)
- **Max Execution Time**: 15 minutes
- **Deployment**: Lambda function with code inline
- **Best For**: Short-duration tasks, event-driven workloads, cost-sensitive applications
- **Limitations**: 15-minute timeout, 10GB memory limit

### AgentCore Runtime (DIRECT_CODE) - Coming Soon
- **Max Execution Time**: 2 hours (configurable)
- **Deployment**: ZIP archive uploaded to S3
- **Best For**: Long-running tasks, Python-based agents, teams without Docker expertise
- **Benefits**: Extended execution time, no Docker required
- **Status**: Not yet fully supported - use CONTAINER deployment instead

### AgentCore Runtime (CONTAINER)
- **Max Execution Time**: 4 hours (configurable)
- **Deployment**: Docker container in ECR (ARM64 architecture required)
- **Best For**: Complex dependencies, multi-language agents, production deployments
- **Benefits**: Maximum flexibility, custom dependencies, reproducible builds

## Key Features

- **Unified Agent Logic**: Same code works across all three runtimes
- **Tool Integration**: S3-based tool loading with runtime execution
- **Cross-Region Inference**: Uses Bedrock cross-region inference for availability
- **Observability**: Built-in CloudWatch metrics and logging
- **Flexible Deployment**: Choose runtime based on your requirements

## Deployment

### Prerequisites
- AWS CLI configured
- CDK CLI installed (`npm install -g aws-cdk`)
- Node.js 18+
- Amazon Bedrock model access (Claude 3.5 Sonnet)
- Docker (for CONTAINER deployment - must support ARM64/linux/arm64 builds)

### Deploy Stacks
```bash
cd examples/document-processing/agentcore-document-processing
npm install
npm run build

# Deploy all available stacks
npx cdk deploy --all --require-approval never

# Or deploy individually
npx cdk deploy DocumentProcessingLambdaStack
npx cdk deploy DocumentProcessingAgentCoreContainerStack

# Note: DocumentProcessingAgentCoreDirectStack is commented out (not yet supported)
```

## Usage Example

### 1. Upload Documents to S3

After deployment, upload documents to the DocumentBucket:

```bash
# Get bucket name from stack outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name DocumentProcessingLambdaStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DocumentBucketName`].OutputValue' \
  --output text)

# Upload policy
aws s3 cp sample-policy.pdf s3://$BUCKET_NAME/policies/GTI-2024-789456.pdf

# Upload supporting documents
aws s3 cp hotel_receipt.pdf s3://$BUCKET_NAME/supporting_documents/GTI-2024-789456/
aws s3 cp meal_receipts.pdf s3://$BUCKET_NAME/supporting_documents/GTI-2024-789456/
```

### 2. Invoke Agent

#### Lambda Runtime
```bash
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name DocumentProcessingLambdaStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentFunctionName`].OutputValue' \
  --output text)

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://sample-claim.json \
  response.json

cat response.json
```

#### AgentCore Runtime (DIRECT_CODE) - Not Yet Available
```bash
# This deployment method is not yet supported
# Use CONTAINER deployment instead
```

#### AgentCore Runtime (CONTAINER)
```bash
RUNTIME_ARN=$(aws cloudformation describe-stacks \
  --stack-name DocumentProcessingAgentCoreContainerStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentRuntimeArn`].OutputValue' \
  --output text)

# Invoke via AWS SDK or API
# (AgentCore invocation API details depend on final implementation)
```

### 3. Sample Request Format

```json
{
  "contentType": "file",
  "content": {
    "bucket": "your-document-bucket",
    "key": "claims/travel_claim.pdf"
  }
}
```

### 4. Expected Response

```json
{
  "success": true,
  "result": {
    "claim_approved": false,
    "justification": "While most of the claim is valid and within policy limits, there is missing documentation for the ground transportation expenses ($25.00). The flight delay of 18 hours is covered under the policy and the hotel and meal expenses are properly documented."
  },
  "metadata": {
    "model_id": "anthropic.claude-3.5-sonnet-20241022-v2:0",
    "tokens_used": {
      "input_tokens": 1250,
      "output_tokens": 180
    }
  }
}
```

## Agent Tools

The agent uses two specialized tools:

### download_policy
Downloads insurance policies from S3 based on policy number.

```python
@tool
def download_policy(bucket_name: str, policy_number: str) -> str:
    """Download the insurance policy associated with the given policy number"""
```

### download_supporting_documents
Downloads all supporting documents for a claim.

```python
@tool
def download_supporting_documents(bucket_name: str, policy_number: str) -> list[str]:
    """Download all supporting documents for a policy number"""
```

## Runtime Comparison

| Feature | Lambda | AgentCore (DIRECT_CODE) | AgentCore (CONTAINER) |
|---------|--------|-------------------------|----------------------|
| Max Execution Time | 15 minutes | 2 hours | 4 hours |
| Memory | Up to 10GB | Up to 30GB | Up to 120GB |
| Deployment | Function code | ZIP in S3 | Container in ECR |
| Cold Start | ~1-2s | ~5-10s | ~10-20s |
| Cost | Pay per invocation | Pay per execution time | Pay per execution time |
| Dependencies | Lambda layers | Included in ZIP | Included in container |
| Best For | Short tasks | Medium tasks | Long/complex tasks |

## Configuration Options

### Lambda Runtime
```typescript
new BatchAgent(this, 'Agent', {
  agentName: 'InsuranceClaimsLambda',
  // ... agent definition
  // No runtime config = Lambda by default
});
```

### AgentCore Runtime (DIRECT_CODE) - Coming Soon
```typescript
// Not yet supported - use CONTAINER deployment instead
// new BatchAgent(this, 'Agent', {
//   agentName: 'InsuranceClaimsAgentCoreDirect',
//   // ... agent definition
//   runtime: {
//     type: AgentRuntimeType.AGENTCORE,
//     config: {
//       deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
//       codeBucket: 'my-code-bucket',
//       codeKey: 'agents/agent-code.zip',
//       timeout: Duration.hours(2),
//       memorySize: 2048,
//     },
//   },
// });
```

### AgentCore Runtime (CONTAINER)
```typescript
new BatchAgent(this, 'Agent', {
  agentName: 'InsuranceClaimsAgentCoreContainer',
  // ... agent definition
  runtime: {
    type: AgentRuntimeType.AGENTCORE,
    config: {
      deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
      imageUri: dockerImage.imageUri,
      timeout: Duration.hours(4),
      memorySize: 4096,
    },
  },
});
```

## Monitoring

All three stacks include observability:

```bash
# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace insurance-claims \
  --metric-name ProcessingDuration \
  --dimensions Name=ServiceName,Value=claims-processing-lambda \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average

# View logs
aws logs tail /aws/lambda/InsuranceClaimsLambda --follow
```

## Troubleshooting

**Common Issues:**

1. **Lambda timeout (15 min limit)**: Use AgentCore runtime for longer tasks
2. **Missing documents**: Ensure policies and supporting docs are uploaded to correct S3 paths
3. **Bedrock access denied**: Verify model access in Bedrock console
4. **Container build fails**: Check Docker is running and you have ECR permissions

**Debugging:**
- Check CloudWatch logs for detailed error messages
- Verify S3 bucket permissions for agent role
- Ensure Bedrock model is available in your region

## Cleanup

```bash
# Destroy all stacks
npx cdk destroy --all

# Or destroy individually
npx cdk destroy DocumentProcessingLambdaStack
npx cdk destroy DocumentProcessingAgentCoreContainerStack
```

**Note**: This will delete all resources including S3 buckets and any uploaded documents.

## Learn More

- [BatchAgent Construct Documentation](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/)
- [AgentCore Runtime Guide](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/#agentcore-runtime)
- [Agentic Document Processing Example](../agentic-document-processing/)
