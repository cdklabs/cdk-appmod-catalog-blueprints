# AppMod Catalog Blueprints

> **Build customizable, well-architected applications on AWS in minutes, not months.**

[![GitHub](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints)
[![Construct Hub](https://img.shields.io/badge/construct--hub-cdklabs-orange)](https://constructs.dev/packages/@cdklabs/cdk-appmod-catalog-blueprints/)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/)
[![npm version](https://img.shields.io/npm/v/@cdklabs/cdk-appmod-catalog-blueprints?label=npm)](https://www.npmjs.com/package/@cdklabs/cdk-appmod-catalog-blueprints)
[![npm downloads](https://img.shields.io/npm/dt/@cdklabs/cdk-appmod-catalog-blueprints?label=npm%20downloads)](https://www.npmjs.com/package/@cdklabs/cdk-appmod-catalog-blueprints)
[![PyPI version](https://img.shields.io/pypi/v/appmod-catalog-blueprints?label=pypi)](https://pypi.org/project/appmod-catalog-blueprints/)
[![PyPI downloads](https://img.shields.io/pepy/dt/appmod-catalog-blueprints?label=pypi%20downloads)](https://pepy.tech/project/appmod-catalog-blueprints)
[![NuGet version](https://img.shields.io/nuget/v/CdklabsAppmodCatalogBlueprints?label=nuget)](https://www.nuget.org/packages/CdklabsAppmodCatalogBlueprints)
[![NuGet downloads](https://img.shields.io/nuget/dt/CdklabsAppmodCatalogBlueprints?label=nuget%20downloads)](https://www.nuget.org/packages/CdklabsAppmodCatalogBlueprints)
[![Maven version](https://img.shields.io/maven-central/v/io.github.cdklabs/appmod-catalog-blueprints?label=maven)](https://central.sonatype.com/artifact/io.github.cdklabs/appmod-catalog-blueprints)

Application Modernization (AppMod) Catalog Blueprints is a comprehensive library of **use case-driven infrastructure blueprints** and **industry-aligned solutions** built on AWS Well-Architected best practices. Designed as composable, multi-layered [AWS CDK](https://aws.amazon.com/cdk/) [L3 constructs](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html), these blueprints accelerate serverless development and modernization with multiple implementation pathways — from ready-to-deploy solutions to fully customizable building blocks.

**Why This Library?**
- **Use case-driven**: Purpose-built for real business problems — AI workflows, document processing, event-driven architectures, web applications
- **Multi-layered approach**: Infrastructure Foundation → General Use Cases → Industry Solutions — start with proven patterns, customize as needed
- **Composable architecture**: Mix and match independent components with standardized interfaces
- **Enterprise-ready security**: Built-in compliance, encryption, least-privilege IAM, and CDK Nag validation
- **Multi-language**: TypeScript, Python, Java, .NET via [JSII](https://aws.github.io/jsii/)

---

## Deploy in 3 Commands

Pick any solution from [the catalog below](#what-you-can-build) and deploy:

```bash
git clone https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git
cd cdk-appmod-catalog-blueprints/examples/chatbot/customer-service-chatbot  # or any other example
npm install && npm run deploy
```

**That's it.** In this example, you now have a well-architected AI chatbot with streaming, authentication, and a React frontend. Swap the path for any other solution — fraud detection, document processing, RAG support, and more.

---

## Two Ways to Use This Library

| Approach | Best For | Get Started |
|----------|----------|-------------|
| **🚀 Deploy a Solution** | Quick evaluation, immediate value, proof-of-concepts | Pick from [ready-to-deploy solutions](#what-you-can-build) below — deploy in minutes with sensible defaults |
| **🔧 Build Custom** | Specific requirements, enterprise integration, tailored applications | Use [individual constructs](#building-blocks) — import into your CDK project, override defaults, inject custom logic |

---

## What You Can Build

### AI Chatbots & Assistants

| Solution | What It Does | Constructs Used |
|----------|--------------|-----------------|
| [**Customer Service Chatbot**](./examples/chatbot/customer-service-chatbot/) | Real-time chatbot with streaming and session management | [InteractiveAgent](./use-cases/framework/agents/), [Frontend](./use-cases/webapp/) |
| [**Retail Banking Chatbot**](./examples/chatbot/retail-banking-chatbot/) | Banking chatbot with RAG knowledge base and transaction lookup | [InteractiveAgent](./use-cases/framework/agents/), [BedrockKnowledgeBase](./use-cases/framework/agents/knowledge-base/), [Frontend](./use-cases/webapp/) |
| [**Retail Banking Chatbot (AgentCore)**](./examples/chatbot/retail-banking-chatbot-agentcore/) | High-availability banking bot on AgentCore Runtime | [InteractiveAgent](./use-cases/framework/agents/), [BedrockKnowledgeBase](./use-cases/framework/agents/knowledge-base/) |
| [**RAG Customer Support**](./examples/rag-customer-support/) | Knowledge-powered Q&A for e-commerce support | [BatchAgent](./use-cases/framework/agents/), [BedrockKnowledgeBase](./use-cases/framework/agents/knowledge-base/) |

### Intelligent Document Processing

| Solution | What It Does | Constructs Used |
|----------|--------------|-----------------|
| [**Insurance Claims Portal**](./examples/document-processing/doc-processing-fullstack-webapp/) | End-to-end claims processing with web UI | [AgenticDocumentProcessing](./use-cases/document-processing/), [Frontend](./use-cases/webapp/) |
| [**Fraud Detection**](./examples/document-processing/fraud-detection/) | AI-powered document fraud analysis with risk scoring | [AgenticDocumentProcessing](./use-cases/document-processing/) |
| [**Document Summarization**](./examples/document-processing/summarization-pipeline/) | Multi-format summarization with semantic search | [BedrockDocumentProcessing](./use-cases/document-processing/) |
| [**Agentic Document Processing**](./examples/document-processing/agentic-document-processing/) | Advanced document processing with AI reasoning | [AgenticDocumentProcessing](./use-cases/document-processing/) |
| [**Bedrock Document Processing**](./examples/document-processing/bedrock-document-processing/) | Document classification and extraction pipeline | [BedrockDocumentProcessing](./use-cases/document-processing/) |
| [**Minimal Document Processing**](./examples/document-processing/minimal-bedrock-doc-processing/) | Zero-config document processing starter | [BedrockDocumentProcessing](./use-cases/document-processing/) |

---

## Building Blocks

Use individual constructs to build custom applications:

```bash
npm install @cdklabs/cdk-appmod-catalog-blueprints
```

```typescript
import { InteractiveAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

new InteractiveAgent(this, 'MyChatbot', {
  agentName: 'support-bot',
  agentDefinition: {
    bedrockModel: { useCrossRegionInference: true },
    systemPrompt: new Asset(this, 'Prompt', { path: './prompt.txt' }),
  },
});
```

### Available Constructs

| Construct | What It Does |
|-----------|--------------|
| [**InteractiveAgent**](./use-cases/framework/agents/) | Real-time chatbots with SSE streaming, sessions, and auth |
| [**BatchAgent**](./use-cases/framework/agents/) | Async AI processing for document analysis |
| [**BaseAgent**](./use-cases/framework/agents/) | Abstract base for custom agent implementations |
| [**AgenticDocumentProcessing**](./use-cases/document-processing/) | Document workflows with AI agents and tools |
| [**BedrockDocumentProcessing**](./use-cases/document-processing/) | Document classification and extraction |
| [**BaseDocumentProcessing**](./use-cases/document-processing/) | Abstract base for custom document processing |
| [**BedrockKnowledgeBase**](./use-cases/framework/agents/knowledge-base/) | RAG retrieval with access control |
| [**Frontend**](./use-cases/webapp/) | Static web hosting with CloudFront CDN |

### Foundation & Utilities

| Component | What It Does |
|-----------|--------------|
| [**Network**](./use-cases/framework/foundation/) | VPC with subnets and endpoints |
| [**Observability**](./use-cases/utilities/) | Logging, tracing, monitoring with Lambda Powertools |
| [**DataMasking**](./use-cases/utilities/) | PII protection Lambda layer |

---

## Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your Application                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Interactive │  │   Batch     │  │  Document   │  │   Frontend  │ │
│  │   Agent     │  │   Agent     │  │ Processing  │  │   (React)   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
├─────────┼────────────────┼────────────────┼────────────────┼────────┤
│         │                │                │                │        │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐ │
│  │  Bedrock    │  │    Step     │  │   Lambda    │  │ CloudFront  │ │
│  │  + Cognito  │  │  Functions  │  │   + S3      │  │   + S3      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                    Foundation (Network, Observability)               │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Layered Design

The library uses a multi-layered architecture that bridges business requirements and technical implementation:

| Layer | What It Is | Purpose |
|-------|------------|---------|
| **Infrastructure Foundation** | Abstract base classes (`BaseAgent`, `BaseDocumentProcessing`) | Standardized interfaces and contracts — extend for custom implementations |
| **General Use Case Implementation** | Concrete classes (`InteractiveAgent`, `BedrockDocumentProcessing`) | Configurable implementations for common patterns — use directly or extend |
| **Industry-Aligned Solutions** | Deployable examples (`examples/`) | Pre-configured for specific domains (insurance, banking, e-commerce) — deploy as-is or use as reference |

### Composable Architecture

Build complex systems by combining independent, reusable components:

- **Independent components** with clear interfaces and loose coupling
- **Mix and match** constructs across different contexts and use cases
- **Pluggable strategies** for networking, observability, and event handling
- **Scalable composition** — incremental adoption and gradual modernization

---

## Getting Started

### Prerequisites

```bash
# Configure AWS credentials
aws configure
# OR: export AWS_PROFILE=your-profile-name

# Bootstrap CDK (one-time per account/region)
npx cdk bootstrap
```

### Option 1: Deploy a Solution

```bash
git clone https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git
cd cdk-appmod-catalog-blueprints/examples/chatbot/customer-service-chatbot
npm install && npm run deploy
```

### Option 2: Use Constructs in Your Project

```bash
npm install @cdklabs/cdk-appmod-catalog-blueprints
```

```typescript
import { InteractiveAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

new InteractiveAgent(this, 'MyChatbot', {
  agentName: 'my-bot',
  agentDefinition: {
    bedrockModel: { useCrossRegionInference: true },
    systemPrompt: new Asset(this, 'Prompt', { path: './prompt.txt' }),
  },
});
```

---

## Security & Compliance

All constructs include enterprise-grade security by default:

| Feature | What You Get |
|---------|--------------|
| **CDK Nag Integration** | Automated security compliance checking |
| **AWS Well-Architected** | Security, reliability, and performance best practices |
| **Encryption** | KMS at rest, TLS in transit — always on |
| **IAM** | Least-privilege, resource-scoped permissions |
| **Compliance Reports** | Generate with `npm test -- --testPathPattern="nag.test.ts"` |

---

## Documentation

- [**Website**](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/) — Full documentation and guides
- [**Construct Hub**](https://constructs.dev/packages/@cdklabs/cdk-appmod-catalog-blueprints/) — API reference
- [**Examples**](./examples/) — Complete deployable solutions
- [**Building Blocks**](./use-cases/) — Individual construct documentation

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/CONTRIBUTING.md) for guidelines.

## Disclaimer

These solutions are examples to help you build applications, not supported products. Any applications you build should be thoroughly tested, secured, and optimized according to your security standards before production use.

## License

Apache License 2.0 — see [LICENSE](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/LICENSE) for details.
