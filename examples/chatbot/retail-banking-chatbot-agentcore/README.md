# Retail Banking Chatbot (AgentCore)

A retail banking assistant for **AWSome Bank**, powered by Amazon Bedrock AgentCore Runtime with RAG-based knowledge retrieval and real-time transaction lookup. Demonstrates the InteractiveAgent construct with `AgentCoreRuntimeHostingAdapter`, Knowledge Base integration, custom tools, Cognito JWT authentication, and CloudWatch observability.

## What This Example Demonstrates

- **InteractiveAgent** hosted on **AgentCore Runtime** (containerized Strands agent)
- **Bedrock AgentCore SDK** (`BedrockAgentCoreApp`) for the container handler
- **Knowledge Base (RAG)** using Amazon Bedrock KB with S3 Vectors for banking FAQ retrieval
- **Custom tool** (`lookup_transactions`) querying DynamoDB for customer transaction history
- **Cognito JWT authentication** with AgentCore's inbound JWT authorizer
- **Authenticated user identity** — JWT `sub` claim forwarded to the agent via `RequestHeaderConfiguration`
- **React frontend** with banking theme hosted on S3 + CloudFront
- **CloudWatch observability** via ADOT auto-instrumentation and Transaction Search

## Architecture

```
┌─────────────┐     ┌──────────────┐
│   React UI  │────▶│  CloudFront  │
│  (S3 hosted)│     │     (CDN)    │
└─────────────┘     └──────┬───────┘
                           │
                           ▼
              ┌─────────────────────────────┐
              │  AgentCore Runtime Endpoint  │
              │  + JWT Authorizer (Cognito)  │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌───────────────────────────────┐
              │  AgentCore Container (MicroVM) │
              │  - BedrockAgentCoreApp (SDK)   │
              │  - Strands Agent Framework     │
              │  - ADOT Auto-Instrumentation   │
              └──────┬──────┬─────────────────┘
                     │      │
  ┌──────────────────┘      └──────────────────┐
  ▼                                            ▼
┌─────────────────────┐           ┌──────────────────┐
│  Bedrock Claude LLM │           │   Agent Tools    │
│  (reasoning engine) │           ├──────────────────┤
└─────────────────────┘           │ retrieve_from_   │
                                  │ knowledge_base() │
           ┌────────────────────┐ │                  │
           │ Bedrock KB         │◀│ lookup_          │
           │ + S3 Vectors Index │ │ transactions()   │
           │ + Banking FAQ Docs │ └────────┬─────────┘
           └────────────────────┘          │
                                           ▼
                                  ┌──────────────────┐
                                  │    DynamoDB      │
                                  │  (Transactions)  │
                                  └──────────────────┘
```

### Request Flow

1. User sends a message through the React frontend
2. Frontend sends POST to the AgentCore Runtime endpoint with Cognito ID token (Bearer JWT)
3. AgentCore validates the JWT via the configured OIDC discovery URL and allowed audiences
4. AgentCore forwards the request to the container, including the `Authorization` header (via `RequestHeaderConfiguration`)
5. The container handler extracts the user's `sub` claim from the JWT and injects it into the agent's system prompt
6. The Strands agent orchestrates the response:
   - For product/policy questions: calls `retrieve_from_knowledge_base` tool, queries Bedrock KB
   - For transaction queries: calls `lookup_transactions` tool with the authenticated user's ID, queries DynamoDB
   - For combined questions: uses both tools, then synthesizes a response
7. Response streams back to the frontend via Server-Sent Events (SSE)

### Components

| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend | S3 + CloudFront | React chat UI with banking theme |
| Auth | Cognito User Pool | User sign-up/sign-in with JWT tokens |
| Runtime | AgentCore Runtime | Managed container hosting with JWT authorizer |
| Agent | BedrockAgentCoreApp + Strands | AI agent with streaming SSE responses |
| LLM | Bedrock (Claude) | Reasoning, tool selection, response generation |
| Knowledge Base | Bedrock KB + S3 Vectors | RAG retrieval for banking FAQs |
| FAQ Storage | S3 | Source documents for KB ingestion |
| Embeddings | Titan Embed Text v2 | Converts FAQ text to vectors (1024 dimensions) |
| Transactions | DynamoDB | Customer transaction history (on-demand billing) |
| Sessions | S3 | Conversation history via Strands S3SessionManager |
| Observability | CloudWatch + ADOT | Traces, spans, and GenAI observability via Transaction Search |

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18+
- Python 3.11+
- CDK bootstrapped: `npx cdk bootstrap`
- Amazon Bedrock model access enabled for Claude and Titan Embed Text v2
- CloudWatch Transaction Search enabled (see [Observability](#observability))

## Deployment

```bash
# From the retail-banking-chatbot-agentcore directory:

# 1. Install and deploy infrastructure
cd infrastructure
npm install
npx cdk deploy --profile <your-profile> --require-approval never --outputs-file ../outputs.json

# 2. Seed transaction data (creates Cognito user and links transactions)
cd ..
./seed-data.sh

# 3. Configure frontend (copy values from outputs.json)
cat > frontend/.env.production << EOF
REACT_APP_CHAT_API_ENDPOINT=<AgentCoreEndpoint from outputs.json>
REACT_APP_USER_POOL_ID=<UserPoolId from outputs.json>
REACT_APP_USER_POOL_CLIENT_ID=<UserPoolClientId from outputs.json>
REACT_APP_REGION=<Region from outputs.json>
EOF

# 4. Build frontend and redeploy
cd frontend && npm install && npm run build && cd ../infrastructure
npx cdk deploy --profile <your-profile> --require-approval never
```

## Sample Prompts

**Product & Policy Questions (KB Retrieval)**
- "What types of accounts does AWSome Bank offer?"
- "What are the overdraft fees? Is there any way to avoid them?"
- "Do you offer any credit cards with travel rewards?"
- "What CD rates do you currently offer?"
- "How do I send money using Zelle?"

**Transaction Lookup (DynamoDB Tool)**
- "Can you show me my recent transactions?" — Agent uses the authenticated user's ID automatically
- "What did I spend the most on last month?"

**Combined (Tool + KB)**
- After viewing transactions: "I didn't make that suspicious purchase. What should I do?"
- After viewing transactions: "What home equity options does AWSome Bank offer?"

## Observability

This example uses ADOT auto-instrumentation for CloudWatch GenAI observability.

### Enable CloudWatch Transaction Search (one-time setup)

1. Open the [CloudWatch console](https://console.aws.amazon.com/cloudwatch)
2. Navigate to **Application Signals (APM)** > **Transaction search**
3. Choose **Enable Transaction Search**
4. Select the checkbox to ingest spans as structured logs
5. (Optional) Increase the X-Ray sampling rate from the default 1%:
   ```bash
   aws xray update-indexing-rule --name "Default" \
     --rule '{"Probabilistic": {"DesiredSamplingPercentage": 100}}'
   ```

### View Observability Data

Open the [CloudWatch GenAI Observability](https://console.aws.amazon.com/cloudwatch/home#gen-ai-observability) page to view traces, spans, and metrics for your agent.

## Monitoring

```bash
# View AgentCore container logs
aws logs tail /aws/bedrock-agentcore/runtimes/<agent-runtime-id> --follow --profile <your-profile>

# Check Knowledge Base ingestion status
aws bedrock-agent get-knowledge-base --knowledge-base-id <KnowledgeBaseId> --profile <your-profile>

# Query DynamoDB transactions for a user
aws dynamodb query --table-name <TransactionsTableName> \
  --key-condition-expression "customerId = :id" \
  --expression-attribute-values '{":id":{"S":"<cognito-user-sub>"}}' \
  --profile <your-profile>
```

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Agent not using latest features | Stale dependency version | Run `npm update`, redeploy |
| Frontend shows old version | CloudFront cache | Invalidate: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"` |
| Auth error on frontend | Missing `.env.production` | Generate from `outputs.json` and rebuild frontend |
| Empty transaction results | Table not seeded | Run `./seed-data.sh` |
| Agent doesn't know user identity | Authorization header not forwarded | Verify `RequestHeaderConfiguration` on CfnRuntime |
| Observability dashboard empty | Transaction Search not enabled or low sampling rate | Enable Transaction Search and increase sampling percentage |
| Container build not updating | Docker layer cache | Run `npx cdk deploy --force` to force image rebuild |

## Cleanup

```bash
cd infrastructure
npx cdk destroy --profile <your-profile>
```

This removes all resources including the AgentCore Runtime, DynamoDB table, Knowledge Base, S3 buckets, Cognito User Pool, and CloudFront distribution.

## Related Constructs

- [InteractiveAgent](../../../use-cases/framework/agents/) — Real-time streaming agent with hosting adapters
- [AgentCoreRuntimeHostingAdapter](../../../use-cases/framework/agents/) — AgentCore Runtime hosting with JWT auth
- [BedrockKnowledgeBase](../../../use-cases/framework/agents/) — Knowledge base integration for RAG
- [Frontend](../../../use-cases/webapp/) — Static web hosting with CloudFront
- [CloudWatchTransactionSearch](../../../use-cases/framework/agents/) — One-click observability setup
