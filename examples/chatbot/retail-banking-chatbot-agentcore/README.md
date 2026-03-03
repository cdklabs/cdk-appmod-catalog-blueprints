# Retail Banking Chatbot

A retail banking assistant for **AWSome Bank**, powered by Amazon Bedrock with RAG-based knowledge retrieval and real-time transaction lookup. Demonstrates the InteractiveAgent construct with Knowledge Base integration, custom tools, and Cognito authentication.

## What This Example Demonstrates

- **InteractiveAgent** with real-time streaming responses (REST API + Server-Sent Events)
- **Knowledge Base (RAG)** using Amazon Bedrock KB with S3 Vectors for banking FAQ retrieval
- **Custom tool** (`lookup_transactions`) querying DynamoDB for customer transaction history
- **Cognito authentication** with user sign-up/sign-in
- **React frontend** with banking theme hosted on S3 + CloudFront
- **Automated KB provisioning** — Knowledge Base, vector store, data source, and ingestion all created in-stack

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────-───┐
│   React UI  │────▶│  CloudFront  │────▶│   API Gateway (REST) │
│  (S3 hosted)│     │     (CDN)    │     │  + Cognito Authorizer│
└─────────────┘     └──────────────┘     └──────────┬────-──────┘
                                                     │
                                                     ▼
                                          ┌────────────────────--------─┐
                                          │  Lambda (InteractiveAgent)  │
                                          │  - Strands Agent Framework  │
                                          │  - Lambda Web Adapter (SSE) │
                                          └──────┬──────┬────--------───┘
                                                 │      │
                              ┌──────────────────┘      └──────────────────┐
                              ▼                                            ▼
                   ┌─────────────────────┐                    ┌──────────────────┐
                   │  Bedrock Claude LLM │                    │   Agent Tools    │
                   │  (reasoning engine) │                    ├──────────────────┤
                   └─────────────────────┘                    │ retrieve_from_   │
                                                              │ knowledge_base() │
                              ┌───────────────────────-─┐     │                  │
                              │  Bedrock Knowledge Base │◀────│ lookup_          │
                              │  + S3 Vectors Index     │     │ transactions()   │
                              │  + Banking FAQ Docs     │     └────────┬─────── ─┘
                              └───────────────────────-─┘               │
                                                                       ▼
                                                              ┌──────────────────┐
                                                              │    DynamoDB      │
                                                              │  (Transactions)  │
                                                              └──────────────────┘
```

### Request Flow

1. User sends a message through the React frontend
2. Request is authenticated via Cognito JWT and routed through API Gateway REST API
3. API Gateway invokes Lambda using **response streaming mode** (`ResponseTransferMode: STREAM`) for real-time token-by-token delivery
4. Lambda runs a FastAPI server via **Lambda Web Adapter**, streaming SSE events back through API Gateway to the frontend
5. The Strands agent framework orchestrates the response:
   - For product/policy questions → calls `retrieve_from_knowledge_base` tool → queries Bedrock KB
   - For transaction queries → calls `lookup_transactions` tool → queries DynamoDB
   - For combined questions → uses both tools, then synthesizes a response
5. Response streams back to the frontend via Server-Sent Events (SSE)

### Components

| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend | S3 + CloudFront | React chat UI with banking theme |
| Auth | Cognito User Pool | User sign-up/sign-in with JWT tokens |
| API | API Gateway REST | Chat endpoint with Cognito authorizer and response streaming mode |
| Agent | Lambda + Strands | AI agent with tool orchestration, streamed via Lambda Web Adapter |
| LLM | Bedrock (Claude) | Reasoning, tool selection, response generation |
| Knowledge Base | Bedrock KB + S3 Vectors | RAG retrieval for banking FAQs |
| FAQ Storage | S3 | Source documents for KB ingestion |
| Embeddings | Titan Embed Text v2 | Converts FAQ text to vectors (1024 dimensions) |
| Transactions | DynamoDB | Customer transaction history (on-demand billing) |
| Sessions | S3 | Conversation history (24-hour TTL) |
| Observability | CloudWatch + X-Ray | Logs, metrics, and tracing |

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18+
- Python 3.11+
- CDK bootstrapped: `npx cdk bootstrap`
- Amazon Bedrock model access enabled for Claude and Titan Embed Text v2

## Deployment

```bash
# From the retail-banking-chatbot directory:

# 1. Build the library (from repo root, if not already done)
cd /path/to/repo/root
SKIP_DOCGEN=true npx projen build
npx projen package:js

# 2. Install and deploy infrastructure
cd examples/chatbot/retail-banking-chatbot/infrastructure
npm install
npx cdk deploy --profile <your-profile> --require-approval never --outputs-file ../outputs.json

# 3. Seed transaction data
cd ..
./seed-data.sh

# 4. Configure frontend (copy values from outputs.json)
cat > frontend/.env.production << EOF
REACT_APP_CHAT_API_ENDPOINT=<ChatApiEndpoint from outputs.json>
REACT_APP_USER_POOL_ID=<UserPoolId from outputs.json>
REACT_APP_USER_POOL_CLIENT_ID=<UserPoolClientId from outputs.json>
REACT_APP_REGION=<Region from outputs.json>
EOF

# 5. Build frontend and redeploy
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
- "Can you show me my recent transactions?" → Agent will ask for customer ID
- "Show me transactions for CUST-001"
- "Look up transactions for CUST-002"

**Combined (Tool + KB)**
- After viewing CUST-001 transactions: "I didn't make that suspicious purchase. What should I do?"
- After viewing CUST-002 transactions: "What home equity options does AWSome Bank offer?"
- After viewing CUST-003 transactions: "If I open a 12-month CD with $10,000, what would my return be?"

**Available Customers:** CUST-001 (Sarah Chen), CUST-002 (Marcus Johnson), CUST-003 (Dorothy Williams)

## Sample Data

- **FAQ Documents** (`sample-docs/`): Banking FAQ covering accounts, fees, transfers, cards, digital banking, loans
- **Transaction Data** (`sample-data/`): 34 sample transactions across 3 customer personas

## Monitoring

```bash
# View agent Lambda logs
aws logs tail /aws/lambda/<AgentFunctionName>-secured --follow --profile <your-profile>

# Check Knowledge Base ingestion status
aws bedrock-agent get-knowledge-base --knowledge-base-id <KnowledgeBaseId> --profile <your-profile>

# Query DynamoDB transactions
aws dynamodb query --table-name <TransactionsTableName> \
  --key-condition-expression "customerId = :id" \
  --expression-attribute-values '{":id":{"S":"CUST-001"}}' \
  --profile <your-profile>
```

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Agent not using latest features | Stale library tarball | Run `npx projen package:js`, reinstall, redeploy |
| Frontend shows old version | CloudFront cache | Invalidate: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"` |
| Auth error on frontend | Missing `.env.production` | Generate from `outputs.json` and rebuild frontend |
| Empty transaction results | Table not seeded | Run `./seed-data.sh` |

## Cleanup

```bash
cd infrastructure
npx cdk destroy --profile <your-profile>
```

This removes all resources including the DynamoDB table, Knowledge Base, S3 buckets, Lambda functions, and CloudFront distribution.

## Related Constructs

- [InteractiveAgent](../../../use-cases/framework/agents/) — Real-time streaming agent with auth and session management
- [BedrockKnowledgeBase](../../../use-cases/framework/agents/knowledge-base/) — Knowledge base integration for RAG
- [Frontend](../../../use-cases/webapp/) — Static web hosting with CloudFront
