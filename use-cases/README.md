# Building Blocks

> **CDK constructs for building custom applications.**

[![GitHub](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints)
[![Construct Hub](https://img.shields.io/badge/construct--hub-API-orange)](https://constructs.dev/packages/@cdklabs/cdk-appmod-catalog-blueprints/)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/)

Reusable AWS CDK L3 constructs. Import and customize to build exactly what you need.

## Installation

```bash
npm install @cdklabs/cdk-appmod-catalog-blueprints
```

---

## Available Constructs

### AI Agents

| Construct | What It Does |
|-----------|--------------|
| [**InteractiveAgent**](./framework/agents/) | Real-time chatbots with SSE streaming, sessions, and auth |
| [**BatchAgent**](./framework/agents/) | Async AI processing for document analysis |
| [**BaseAgent**](./framework/agents/) | Abstract base for custom agent implementations |
| [**BedrockKnowledgeBase**](./framework/agents/knowledge-base/) | RAG retrieval with access control |

```typescript
import { InteractiveAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';

new InteractiveAgent(this, 'Chatbot', {
  agentName: 'support-bot',
  agentDefinition: {
    bedrockModel: { useCrossRegionInference: true },
    systemPrompt: new Asset(this, 'Prompt', { path: './prompt.txt' }),
  },
});
```

### Document Processing

| Construct | What It Does |
|-----------|--------------|
| [**AgenticDocumentProcessing**](./document-processing/) | Document workflows with AI agents and tools |
| [**BedrockDocumentProcessing**](./document-processing/) | Document classification and extraction |
| [**BaseDocumentProcessing**](./document-processing/) | Abstract base for custom implementations |

```typescript
import { AgenticDocumentProcessing } from '@cdklabs/cdk-appmod-catalog-blueprints';

new AgenticDocumentProcessing(this, 'Processor', {
  processingAgentParameters: {
    agentName: 'doc-processor',
    agentDefinition: { systemPrompt, tools },
    prompt: 'Analyze and extract data from the document',
    expectJson: true,
  },
});
```

### Web Application

| Construct | What It Does |
|-----------|--------------|
| [**Frontend**](./webapp/) | CloudFront + S3 web hosting for React apps, SPAs, static sites |

```typescript
import { Frontend } from '@cdklabs/cdk-appmod-catalog-blueprints';

new Frontend(this, 'App', {
  sourcePath: './frontend',
  buildCommands: ['npm install', 'npm run build'],
});
```

### Foundation & Utilities

| Construct | What It Does |
|-----------|--------------|
| [**Network**](./framework/foundation/) | VPC with subnets and endpoints |
| [**AccessLog**](./framework/foundation/) | Centralized access logging |
| [**EventBridgeBroker**](./framework/foundation/) | Event routing for decoupled architectures |
| [**Observability**](./utilities/) | Logging, tracing, monitoring with Lambda Powertools |
| [**DataMasking**](./utilities/) | PII protection Lambda layer |
| [**DataLoader**](./utilities/) | Database initialization |

---

## Architecture

All constructs follow a multi-layered design:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Your Application Code                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ InteractiveAgent│  │ AgenticDocument │  │    Frontend     │  │
│  │   (concrete)    │  │   Processing    │  │   (concrete)    │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘  │
│           │                    │                                 │
│  ┌────────▼────────┐  ┌────────▼────────┐                       │
│  │    BaseAgent    │  │ BedrockDocument │  Foundation Layer     │
│  │   (abstract)    │  │   Processing    │  (Network, Observ.)   │
│  └─────────────────┘  └────────┬────────┘                       │
│                       ┌────────▼────────┐                       │
│                       │ BaseDocument    │                       │
│                       │   Processing    │                       │
│                       └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

**Extend base classes** for custom behavior. **Use concrete classes** for standard use cases.

---

## Ready-to-Deploy Solutions

See complete examples in action: [examples/](../examples/)

| Solution | Constructs Used |
|----------|-----------------|
| [Customer Service Chatbot](../examples/chatbot/customer-service-chatbot/) | InteractiveAgent, Frontend |
| [Retail Banking Chatbot](../examples/chatbot/retail-banking-chatbot/) | InteractiveAgent, BedrockKnowledgeBase, Frontend |
| [Insurance Claims Portal](../examples/document-processing/doc-processing-fullstack-webapp/) | AgenticDocumentProcessing, Frontend |
| [Fraud Detection](../examples/document-processing/fraud-detection/) | AgenticDocumentProcessing |

---

## Security

All constructs include enterprise security by default:

- **KMS encryption** for data at rest
- **TLS** for data in transit
- **Least-privilege IAM** with resource-scoped permissions
- **CDK Nag compliance** for security best practices
