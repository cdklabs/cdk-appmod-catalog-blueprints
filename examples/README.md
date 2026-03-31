# Ready-to-Deploy Solutions

> **Deploy well-architected applications in 3 commands.**

[![GitHub](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/)

Each solution is a complete CDK application. Clone, install, deploy.

## Quick Start

```bash
cd examples/<category>/<solution>
npm install
npm run deploy
```

---

## AI Chatbots & Assistants

| Solution | What It Does | Constructs Used |
|----------|--------------|-----------------|
| [**Customer Service Chatbot**](./chatbot/customer-service-chatbot/) | Real-time chatbot with streaming and session management | [InteractiveAgent](../use-cases/framework/agents/), [Frontend](../use-cases/webapp/) |
| [**Retail Banking Chatbot**](./chatbot/retail-banking-chatbot/) | Banking chatbot with RAG knowledge base and transaction lookup | [InteractiveAgent](../use-cases/framework/agents/), [BedrockKnowledgeBase](../use-cases/framework/agents/knowledge-base/), [Frontend](../use-cases/webapp/) |
| [**Retail Banking Chatbot (AgentCore)**](./chatbot/retail-banking-chatbot-agentcore/) | High-availability banking bot on AgentCore Runtime | [InteractiveAgent](../use-cases/framework/agents/), [BedrockKnowledgeBase](../use-cases/framework/agents/knowledge-base/) |
| [**RAG Customer Support**](./rag-customer-support/) | Knowledge-powered Q&A for e-commerce support | [BatchAgent](../use-cases/framework/agents/), [BedrockKnowledgeBase](../use-cases/framework/agents/knowledge-base/) |

---

## Intelligent Document Processing

| Solution | What It Does | Constructs Used |
|----------|--------------|-----------------|
| [**Insurance Claims Portal**](./document-processing/doc-processing-fullstack-webapp/) | End-to-end claims processing with web UI | [AgenticDocumentProcessing](../use-cases/document-processing/), [Frontend](../use-cases/webapp/) |
| [**Fraud Detection**](./document-processing/fraud-detection/) | AI-powered document fraud analysis with risk scoring | [AgenticDocumentProcessing](../use-cases/document-processing/) |
| [**Document Summarization**](./document-processing/summarization-pipeline/) | Multi-format summarization with semantic search | [BedrockDocumentProcessing](../use-cases/document-processing/) |
| [**Agentic Document Processing**](./document-processing/agentic-document-processing/) | Advanced document processing with AI reasoning | [AgenticDocumentProcessing](../use-cases/document-processing/) |
| [**Bedrock Document Processing**](./document-processing/bedrock-document-processing/) | Document classification and extraction pipeline | [BedrockDocumentProcessing](../use-cases/document-processing/) |
| [**Minimal Document Processing**](./document-processing/minimal-bedrock-doc-processing/) | Zero-config document processing starter | [BedrockDocumentProcessing](../use-cases/document-processing/) |

---

## Data Generation

| Solution | What It Does | Constructs Used |
|----------|--------------|-----------------|
| [**Synthetic Dataset Generator**](./synthetic-dataset-generator/) | AI-powered synthetic data generation through conversation | [InteractiveAgent](../use-cases/framework/agents/), [BatchAgent](../use-cases/framework/agents/), [Frontend](../use-cases/webapp/) |

---

## Solution Structure

All solutions follow a consistent pattern:

```
<solution>/
├── bin/app.ts              # CDK entry point
├── lib/*-stack.ts          # Infrastructure definition
├── resources/              # Prompts, tools, sample files
├── cdk.json                # CDK configuration
├── package.json            # Dependencies
└── README.md               # Deployment instructions
```

---

## Deployment

### Prerequisites

```bash
aws configure                # Configure AWS credentials
npx cdk bootstrap            # Bootstrap CDK (one-time)
```

### Deploy

```bash
git clone https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git
cd cdk-appmod-catalog-blueprints/examples/<category>/<solution>
npm install && npm run deploy
```

### Cleanup

```bash
cdk destroy
```

---

## Building Custom Solutions

Want to build your own? Use the [constructs](../use-cases/) directly:

```typescript
import { InteractiveAgent, AgenticDocumentProcessing } from '@cdklabs/cdk-appmod-catalog-blueprints';
```
