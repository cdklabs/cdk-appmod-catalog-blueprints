# Stock Market Analysis Chatbot — Private VPC

A variant of the [Stock Market Analysis](../stockmarket-analysis/) chatbot that deploys the AgentCore Runtime inside a fully private VPC with no NAT gateway. All AWS service traffic is routed through VPC endpoints.

## What's Different from the Public Version

| Aspect | Public Version | This Version |
|--------|---------------|--------------|
| Network mode | `PUBLIC` | `VPC` (isolated subnets) |
| NAT gateway | None needed | None (no internet egress) |
| AWS service access | Via internet | Via VPC endpoints |
| AgentCore ENIs | Not in VPC | Placed in private isolated subnets |
| Cost | Lower | Higher (VPC endpoint hourly charges) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  VPC (10.0.0.0/16) — Isolated Subnets Only                 │
│                                                             │
│  ┌──────────────┐   ┌──────────────────────────────────┐    │
│  │ AgentCore    │──▶│ VPC Endpoints                    │    │
│  │ Runtime ENIs │   │  • S3 (gateway + interface)      │    │
│  └──────────────┘   │  • ECR / ECR Docker              │    │
│                     │  • Bedrock / Bedrock Runtime      │    │
│                     │  • CloudWatch Logs / Monitoring   │    │
│                     │  • STS, KMS                       │    │
│                     └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

CloudFront ──▶ S3 (Frontend)
User ──▶ AgentCore Endpoint (HTTPS) ──▶ Bedrock (via VPC endpoint)
```

## Prerequisites

- AWS CLI v2 configured with credentials
- Python 3.11+
- Node.js 18+
- CDK bootstrapped: `npx cdk bootstrap`

## Deployment

```bash
cd examples/chatbot/stockmarket-analysis-private-vpc
bash deploy.sh
```

Or step by step:

```bash
bash init.sh
source .venv/bin/activate
cd frontend && npm ci && npm run build && cd ..
cdk deploy --require-approval never --outputs-file cdk-outputs.json
```

## VPC Endpoints Created

| Endpoint | Purpose |
|----------|---------|
| S3 (gateway + interface) | Asset uploads, session storage, ECR image layers |
| ECR / ECR Docker | Pulling the AgentCore container image |
| Bedrock / Bedrock Runtime | Model invocation |
| CloudWatch Logs / Monitoring | Observability |
| STS | Role assumption |
| KMS | Encryption operations |

## Cleanup

```bash
cdk destroy
```
