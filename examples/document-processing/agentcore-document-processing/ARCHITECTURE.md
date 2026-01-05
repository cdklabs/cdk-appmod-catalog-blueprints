# Architecture: Insurance Claims Processing with AgentCore Runtime

## Overview

This example demonstrates three different runtime approaches for the same insurance claims processing agent, showcasing the flexibility and scalability benefits of the AgentCore runtime compared to traditional Lambda functions.

## Architecture Patterns

### 1. Lambda Runtime (Baseline)

```
┌─────────────────────────────────────────────────────────────┐
│                    Lambda Runtime Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌─────────────────────────────┐  │
│  │   S3 Bucket  │────────▶│   Lambda Function           │  │
│  │  (Documents) │         │   - Agent Logic             │  │
│  └──────────────┘         │   - Tool Execution          │  │
│                            │   - Bedrock Integration     │  │
│  ┌──────────────┐         │   Max: 15 minutes           │  │
│  │   S3 Assets  │────────▶│   Memory: Up to 10GB        │  │
│  │  (Tools,     │         └─────────────────────────────┘  │
│  │   Prompts)   │                      │                    │
│  └──────────────┘                      │                    │
│                                         ▼                    │
│                            ┌─────────────────────────────┐  │
│                            │   Amazon Bedrock            │  │
│                            │   (Claude 3.5 Sonnet)       │  │
│                            │   Cross-Region Inference    │  │
│                            └─────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Characteristics:**
- **Execution Time**: Maximum 15 minutes
- **Memory**: Up to 10GB
- **Deployment**: Function code inline or via layers
- **Cold Start**: ~1-2 seconds
- **Cost Model**: Pay per invocation + duration
- **Use Cases**: Short-duration claims, simple validation

### 2. AgentCore Runtime - DIRECT_CODE Deployment

```
┌─────────────────────────────────────────────────────────────┐
│              AgentCore DIRECT_CODE Stack                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌─────────────────────────────┐  │
│  │   S3 Bucket  │         │   S3 Code Bucket            │  │
│  │  (Documents) │         │   - agent-code.zip          │  │
│  └──────────────┘         └─────────────────────────────┘  │
│         │                              │                     │
│         │                              ▼                     │
│         │                 ┌─────────────────────────────┐  │
│         └────────────────▶│   AgentCore Runtime         │  │
│                            │   - Loads code from S3      │  │
│  ┌──────────────┐         │   - Agent Logic             │  │
│  │   S3 Assets  │────────▶│   - Tool Execution          │  │
│  │  (Tools,     │         │   - Bedrock Integration     │  │
│  │   Prompts)   │         │   Max: 2 hours              │  │
│  └──────────────┘         │   Memory: Up to 30GB        │  │
│                            └─────────────────────────────┘  │
│                                         │                    │
│                                         ▼                    │
│                            ┌─────────────────────────────┐  │
│                            │   Amazon Bedrock            │  │
│                            │   (Claude 3.5 Sonnet)       │  │
│                            │   Cross-Region Inference    │  │
│                            └─────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Characteristics:**
- **Execution Time**: Up to 2 hours (configurable)
- **Memory**: Up to 30GB
- **Deployment**: ZIP archive in S3
- **Cold Start**: ~5-10 seconds
- **Cost Model**: Pay per execution time
- **Use Cases**: Complex claims requiring multiple document analysis, policy cross-referencing
- **Benefits**: No Docker required, easy CI/CD integration

### 3. AgentCore Runtime - CONTAINER Deployment

```
┌─────────────────────────────────────────────────────────────┐
│              AgentCore CONTAINER Stack                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌─────────────────────────────┐  │
│  │   S3 Bucket  │         │   ECR Repository            │  │
│  │  (Documents) │         │   - Docker Image            │  │
│  └──────────────┘         │   - Custom Dependencies     │  │
│         │                  └─────────────────────────────┘  │
│         │                              │                     │
│         │                              ▼                     │
│         │                 ┌─────────────────────────────┐  │
│         └────────────────▶│   AgentCore Runtime         │  │
│                            │   - Runs container          │  │
│  ┌──────────────┐         │   - Agent Logic             │  │
│  │   S3 Assets  │────────▶│   - Tool Execution          │  │
│  │  (Tools,     │         │   - Bedrock Integration     │  │
│  │   Prompts)   │         │   Max: 4 hours              │  │
│  └──────────────┘         │   Memory: Up to 120GB       │  │
│                            └─────────────────────────────┘  │
│                                         │                    │
│                                         ▼                    │
│                            ┌─────────────────────────────┐  │
│                            │   Amazon Bedrock            │  │
│                            │   (Claude 3.5 Sonnet)       │  │
│                            │   Cross-Region Inference    │  │
│                            └─────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Characteristics:**
- **Execution Time**: Up to 4 hours (configurable)
- **Memory**: Up to 120GB
- **Deployment**: Docker container in ECR
- **Cold Start**: ~10-20 seconds
- **Cost Model**: Pay per execution time
- **Use Cases**: Very complex claims, batch processing, custom ML models
- **Benefits**: Maximum flexibility, reproducible builds, custom dependencies

## Component Details

### Shared Components (All Stacks)

#### 1. Document Storage (S3)
- **Purpose**: Store insurance policies and supporting documents
- **Structure**:
  ```
  s3://bucket/
  ├── policies/
  │   └── {policy_number}.pdf
  └── supporting_documents/
      └── {policy_number}/
          ├── receipt1.pdf
          ├── receipt2.pdf
          └── ...
  ```
- **Encryption**: KMS encryption at rest
- **Access**: Agent role has read permissions

#### 2. Agent Tools (S3 Assets)
- **download_policy**: Downloads policy documents from S3
- **download_supporting_documents**: Downloads all supporting documents for a claim
- **Storage**: Deployed as S3 assets, loaded at runtime
- **Format**: Python files with `@tool` decorator

#### 3. System Prompt (S3 Asset)
- **Content**: "You're an insurance claims specialist..."
- **Purpose**: Defines agent behavior and expertise
- **Loading**: Downloaded from S3 at agent initialization

#### 4. Bedrock Integration
- **Model**: Claude 3.5 Sonnet (anthropic.claude-3-5-sonnet-20241022-v2:0)
- **Feature**: Cross-region inference for high availability
- **Tool Use**: Native Bedrock tool calling for agent tools
- **Streaming**: Supports streaming responses for long outputs

### Runtime-Specific Components

#### Lambda Runtime
- **Function**: Standard Lambda function with Python 3.12
- **Handler**: `batch.handler`
- **Layers**: Boto3, Strands SDK (if needed)
- **Timeout**: 15 minutes (Lambda maximum)
- **Memory**: 1024 MB (configurable up to 10GB)

#### AgentCore DIRECT_CODE
- **Code Bucket**: S3 bucket for agent code ZIP
- **Deployment**: BucketDeployment construct uploads code
- **Handler**: `batch_agentcore.process_batch_request`
- **Timeout**: 2 hours (configurable)
- **Memory**: 2048 MB (configurable up to 30GB)
- **Scaling**: Auto-scaling from 1 to 5 instances

#### AgentCore CONTAINER
- **ECR Repository**: Stores Docker images
- **Image Build**: DockerImageAsset builds and pushes
- **Base Image**: Python 3.12 with custom dependencies
- **Handler**: Entrypoint defined in Dockerfile
- **Timeout**: 4 hours (configurable)
- **Memory**: 4096 MB (configurable up to 120GB)
- **Scaling**: Auto-scaling from 2 to 10 instances

## Data Flow

### 1. Request Initiation
```
User/System → Invoke Agent → Runtime (Lambda/AgentCore)
```

### 2. Agent Processing
```
Runtime → Load System Prompt from S3
       → Load Tools from S3
       → Parse Request Event
       → Extract Claim Document
```

### 3. Tool Execution Loop
```
Agent → Bedrock (with tools) → Tool Use Response
     → Execute download_policy → Download from S3
     → Execute download_supporting_documents → Download from S3
     → Bedrock (with tool results) → Analysis Response
```

### 4. Response Generation
```
Agent → Parse Bedrock Response
     → Extract JSON Result
     → Return to Caller
```

## Observability

### CloudWatch Metrics
- **Namespace**: `insurance-claims`
- **Service Names**:
  - `claims-processing-lambda`
  - `claims-processing-agentcore-direct`
  - `claims-processing-agentcore-container`
- **Metrics**:
  - Processing duration
  - Success/failure rates
  - Token usage
  - Tool invocation counts

### CloudWatch Logs
- **Log Groups**: Auto-created per runtime
- **Log Retention**: 7 days (configurable)
- **Data Protection**: PII masking enabled
- **Structured Logging**: JSON format for easy parsing

## Security

### IAM Roles
- **Agent Role**: Assumed by runtime
  - Read access to document bucket
  - Read access to tool/prompt assets
  - Bedrock InvokeModel permissions
  - CloudWatch Logs write permissions

### Encryption
- **S3**: KMS encryption for document bucket
- **ECR**: Encryption at rest for container images
- **Logs**: Encrypted CloudWatch log groups

### Network
- **VPC**: Optional VPC deployment (commented out in example)
- **Security Groups**: Restrict outbound to AWS services only
- **Endpoints**: VPC endpoints for S3, Bedrock, CloudWatch

## Cost Optimization

### Lambda Runtime
- **Best For**: < 1000 invocations/day, < 5 min execution
- **Cost**: $0.20 per 1M requests + $0.0000166667 per GB-second
- **Example**: 100 invocations/day × 5 min × 1GB = ~$0.50/month

### AgentCore DIRECT_CODE
- **Best For**: 100-1000 invocations/day, 15 min - 2 hour execution
- **Cost**: Based on execution time and memory
- **Example**: 100 invocations/day × 30 min × 2GB = ~$15/month

### AgentCore CONTAINER
- **Best For**: < 100 invocations/day, > 1 hour execution
- **Cost**: Based on execution time and memory + ECR storage
- **Example**: 50 invocations/day × 2 hours × 4GB = ~$40/month

## Scaling Considerations

### Lambda Runtime
- **Concurrency**: Up to 1000 concurrent executions (default)
- **Burst**: 500-3000 per minute depending on region
- **Throttling**: Automatic with exponential backoff

### AgentCore Runtime
- **Min Capacity**: Configurable (1-2 instances)
- **Max Capacity**: Configurable (5-10 instances)
- **Scaling Metric**: Queue depth or custom metrics
- **Scale-up**: ~30 seconds to provision new instance
- **Scale-down**: Gradual based on idle time

## Migration Path

### From Lambda to AgentCore DIRECT_CODE
1. Package agent code as ZIP
2. Upload to S3 bucket
3. Update BatchAgent runtime configuration
4. Test with same inputs
5. Monitor performance and costs

### From DIRECT_CODE to CONTAINER
1. Create Dockerfile with dependencies
2. Build and test locally
3. Push to ECR via DockerImageAsset
4. Update BatchAgent runtime configuration
5. Validate container startup and execution

## Best Practices

1. **Start with Lambda**: Use Lambda runtime for initial development and testing
2. **Migrate to DIRECT_CODE**: When hitting 15-minute timeout or need more memory
3. **Use CONTAINER**: For production workloads with complex dependencies
4. **Monitor Costs**: Track execution time and memory usage across runtimes
5. **Optimize Tools**: Cache frequently accessed documents to reduce S3 calls
6. **Batch Processing**: Use AgentCore for batch processing multiple claims
7. **Error Handling**: Implement retry logic with exponential backoff
8. **Testing**: Test with representative claim documents before production

## Future Enhancements

- **VPC Integration**: Deploy in private subnets for enhanced security
- **Step Functions**: Orchestrate multi-step claim processing workflows
- **DynamoDB**: Store claim processing results and audit trail
- **EventBridge**: Trigger processing from S3 uploads or scheduled events
- **SQS**: Queue claims for batch processing
- **SNS**: Notify stakeholders of claim decisions
