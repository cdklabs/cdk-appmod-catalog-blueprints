# Customer Support Chatbot Example

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples/chatbot/customer-service-chatbot)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/examples/chatbot/customer-service-chatbot/)
[![Construct](https://img.shields.io/badge/construct-InteractiveAgent-blueviolet)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/agents/)

## Overview

A production-ready customer support chatbot built with the [InteractiveAgent](../../../use-cases/framework/agents/) construct, demonstrating real-time SSE streaming, Cognito authentication, conversation context management, and a React frontend hosted on CloudFront.

## What This Example Does

- Real-time token-by-token streaming via REST API + SSE (Server-Sent Events)
- Secure authentication with Cognito User Pool (native JWT validation)
- Conversation context management (20-message sliding window)
- Session persistence with 24-hour TTL (S3-backed)
- React frontend with responsive chat UI
- Structured logging and distributed tracing via Lambda Powertools
- Single-stack deployment

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       User's Browser                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  React App (S3 + CloudFront)                               │ │
│  │  - Cognito authentication                                  │ │
│  │  - fetch + ReadableStream SSE client                       │ │
│  │  - Message history UI                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /chat (Bearer JWT)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │  Cognito          │         │  User Pool       │             │
│  │  User Pool        │◄────────│  Client          │             │
│  └──────────────────┘         └──────────────────┘             │
│           │                                                      │
│           │ JWT Validation (COGNITO_USER_POOLS authorizer)       │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Gateway REST API (responseTransferMode: STREAM)      │  │
│  │  - POST /chat with Lambda proxy integration               │  │
│  │  - InvokeWithResponseStream (15-min timeout)              │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Lambda (Python 3.13 + Lambda Web Adapter + FastAPI)      │  │
│  │  - strands.Agent with streaming                           │  │
│  │  - S3 session management                                  │  │
│  │  - Sliding window context (20 messages)                   │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│              ┌─────────────┼─────────────┐                      │
│              ▼             ▼             ▼                       │
│  ┌────────────────┐ ┌──────────┐ ┌──────────────┐             │
│  │ Amazon Bedrock  │ │ S3       │ │ CloudWatch   │             │
│  │ (Claude Haiku)  │ │ Sessions │ │ Logs/Metrics │             │
│  └────────────────┘ └──────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **AWS CLI** configured with credentials ([Setup Guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html))
- **AWS CDK** 2.218.0+ (`npm install -g aws-cdk`)
- **Bedrock model access** for Claude 3 Haiku in your region
  - AWS Console → Bedrock → Model access → Request access to Anthropic Claude models

Verify Bedrock access:
```bash
aws bedrock list-foundation-models --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `claude-3-haiku`)].modelId'
```

## Deployment

### Quick Deploy

```bash
cd examples/chatbot/customer-service-chatbot/infrastructure
npm install
npx cdk deploy --all --require-approval never --profile <your-profile>
```

Deployment time: ~5-8 minutes.

### Stack Outputs

After deployment, save `FrontendUrl` to access the app and the Cognito values for frontend configuration.

### Frontend Configuration

The frontend reads API endpoint and Cognito config from environment files. Update `frontend/.env.production` with the stack outputs:

```
REACT_APP_API_ENDPOINT=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/chat
REACT_APP_USER_POOL_ID=us-east-1_XXXXX
REACT_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxxx
REACT_APP_REGION=us-east-1
```

Then rebuild and redeploy:
```bash
cd ../frontend && npm run build
cd ../infrastructure && npx cdk deploy --all --require-approval never --profile <your-profile>
```

## Usage

### Accessing the Application

1. Open the `FrontendUrl` from CloudFormation outputs
2. Create an account (email + password, min 8 chars with uppercase, lowercase, number, symbol)
3. Sign in and start chatting

### Example Conversations

```
You: Hello
Agent: Hello! Welcome to our customer support. How can I assist you today?

You: What are your business hours?
Agent: Our business hours are Monday through Friday, 9 AM to 5 PM EST.

You: What about weekends?
Agent: We're closed on weekends, but you can leave a message and
       we'll respond on the next business day.
```

The agent maintains context across messages within the same session (up to 20 messages in the sliding window).

## Configuration

### System Prompt

Edit `resources/system_prompt.txt` to customize the agent's behavior, then redeploy:

```bash
cd infrastructure
npx cdk deploy --all --require-approval never --profile <your-profile>
```

### Bedrock Model

In `infrastructure/chatbot-stack.ts`:

```typescript
fmModelId: FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0,
```

Available models:
- `ANTHROPIC_CLAUDE_3_HAIKU_20240307_V1_0` (default — fast, cost-effective)
- `ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0` (balanced)
- `ANTHROPIC_CLAUDE_3_OPUS_20240229_V1_0` (most capable)

### Context Window Size

```typescript
messageHistoryLimit: 30,  // default: 20
```

### Session TTL

```typescript
sessionTTL: Duration.hours(48),  // default: 24 hours
```

### Disabling Authentication (Development Only)

In `frontend/src/App.tsx`, set `SKIP_AUTH = true` for quick UI testing without Cognito. Never deploy this to production.

## Monitoring

### Lambda Logs

```bash
aws logs tail /aws/lambda/CustomerSupportChatbotStack-ChatAgent --follow
```

### CloudWatch Metrics

Namespace: `customer-support-chatbot`

Metrics: `ChatRequests`, `ChatResponses`, `ChatErrors`

### CloudWatch Insights

Message volume:
```
fields @timestamp, @message
| filter @message like /Chat request/
| stats count() by bin(5m)
```

Error rate:
```
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as errors by bin(5m)
```

## Troubleshooting

### "Failed to connect" or CORS errors

1. Verify `ChatApiEndpoint` in frontend `.env.production` is correct
2. Rebuild frontend: `cd frontend && npm run build`
3. Redeploy: `cd infrastructure && npx cdk deploy --all --require-approval never`

### 401 Unauthorized

1. Verify `UserPoolId` and `UserPoolClientId` in frontend config match stack outputs
2. Try signing out and signing in again
3. Check that the JWT token is being sent in the `Authorization` header

### Agent not responding

1. Verify Bedrock model access is enabled (Console → Bedrock → Model access)
2. Check Lambda logs for errors
3. Verify Lambda has sufficient timeout (default: 15 minutes)

### CloudFront 403 error

CloudFront distribution takes 5-10 minutes to fully deploy. Check status:
```bash
aws cloudfront list-distributions --query 'DistributionList.Items[0].Status'
```

Wait until status is `Deployed`.

### Stream ends without response

1. Check Lambda logs for Bedrock throttling errors
2. Increase Lambda memory if seeing timeout issues
3. Verify the system prompt file exists in `resources/system_prompt.txt`

## Cleanup

```bash
cd infrastructure
npx cdk destroy --profile <your-profile>
```

This deletes all resources: Lambda, API Gateway, Cognito, S3 buckets, CloudFront distribution, and CloudWatch log groups.

If S3 buckets aren't empty:
```bash
aws s3 rm s3://BUCKET_NAME --recursive
npx cdk destroy --profile <your-profile>
```

## Cost Estimation

Monthly cost for ~1,000 messages/day:

| Service | Usage | Cost |
|---------|-------|------|
| Bedrock (Claude 3 Haiku) | 3M input tokens, 1M output tokens | ~$0.75 |
| Lambda | 30K invocations, 1024MB, 10s avg | ~$5.00 |
| API Gateway (REST API) | 30K requests | ~$0.10 |
| S3 (Sessions) | 10GB storage, 60K requests | ~$0.50 |
| CloudFront | 10GB transfer, 100K requests | ~$1.00 |
| CloudWatch Logs | 5GB logs | ~$2.50 |
| **Total** | | **~$10/month** |

Bedrock is the primary cost driver. Costs scale with usage.

## Architecture Decisions

- **Claude 3 Haiku**: Fastest response time (under 1s), most cost-effective for customer support
- **REST API + SSE** (not WebSocket): Simpler architecture, 15-minute timeout (vs 29s WebSocket idle timeout), native Cognito authorizer, no connection management
- **Lambda Web Adapter + FastAPI**: Enables Python response streaming in Lambda without custom runtime
- **20-message context window**: Balances context retention with token cost (~$0.0025 per conversation)
- **24-hour session TTL**: Allows users to return within a day; automatic S3 lifecycle cleanup
- **Single stack**: Simplifies deployment and management

## Additional Resources

- [InteractiveAgent Construct Documentation](../../../use-cases/framework/agents/README.md)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Amazon Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Repository](https://github.com/cdklabs/cdk-appmod-catalog-blueprints)

## License

Apache-2.0. See the LICENSE file in the repository root.
