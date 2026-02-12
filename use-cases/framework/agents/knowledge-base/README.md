# Knowledge Base Integration

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/framework/agents/knowledge-base)

## Overview

The Knowledge Base module provides Retrieval-Augmented Generation (RAG) capabilities for the Agentic AI Framework. It enables agents to query configured knowledge bases during task execution, retrieving relevant context to enhance response quality and accuracy.

The module follows an interface-based design that allows multiple knowledge base implementations while providing Amazon Bedrock Knowledge Bases as the default. Key features include:

- **Extensible Architecture**: Interface-based design supports custom KB implementations
- **Access Control (ACL)**: Identity-aware retrieval filtering based on user permissions
- **Guardrails Support**: Content filtering during retrieval operations
- **Automatic Tool Generation**: Built-in retrieval tool for agent-driven queries
- **Observability**: Integrated logging and metrics with Lambda Powertools

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Framework                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │   BaseAgent     │    │   BatchAgent    │                     │
│  │  (abstract)     │───▶│  (concrete)     │                     │
│  └────────┬────────┘    └─────────────────┘                     │
│           │                                                      │
│           │ uses                                                 │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              IKnowledgeBase[] (composition)              │    │
│  └─────────────────────────────────────────────────────────┘    │
│           │                                                      │
│           │ implements                                           │
│           ▼                                                      │
│  ┌─────────────────┐    ┌─────────────────────────────────┐    │
│  │ BaseKnowledge   │    │    BedrockKnowledgeBase         │    │
│  │ Base (abstract) │───▶│    (default implementation)     │    │
│  └─────────────────┘    └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### IKnowledgeBase Interface

The core interface that all knowledge base implementations must satisfy:

```typescript
interface IKnowledgeBase {
  // Human-readable name for logging and agent identification
  readonly name: string;
  
  // Description shown to agent to help decide when to query
  readonly description: string;
  
  // Generate IAM permissions for KB access
  generateIamPermissions(): PolicyStatement[];
  
  // Export runtime configuration for retrieval tool
  exportConfiguration(): KnowledgeBaseRuntimeConfig;
  
  // Optional: Provide custom retrieval tool
  retrievalToolAsset?(): Asset | undefined;
}
```

### BaseKnowledgeBase Abstract Class

Provides common functionality for all knowledge base implementations:

- Props validation (name and description required)
- Default retrieval configuration (numberOfResults defaults to 5)
- ACL configuration storage
- Base runtime configuration export

Subclasses must implement `generateIamPermissions()` for their specific KB type.

### BedrockKnowledgeBase Implementation

The default implementation using Amazon Bedrock Knowledge Bases with S3 Vectors:

- ARN construction from knowledge base ID
- IAM permission generation for Bedrock Retrieve APIs
- Guardrail configuration support
- Vector store configuration (S3 Vectors default)

## Usage Examples

### Basic Usage

```typescript
import { BedrockKnowledgeBase, BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

// Create a knowledge base reference
const productDocs = new BedrockKnowledgeBase(this, 'ProductDocs', {
  name: 'product-documentation',
  description: 'Product documentation, user guides, and FAQs. Use for product feature questions.',
  knowledgeBaseId: 'ABCD1234',
});

// Create agent with knowledge base
const agent = new BatchAgent(this, 'SupportAgent', {
  agentName: 'CustomerSupportAgent',
  agentDefinition: {
    bedrockModel: { useCrossRegionInference: true },
    systemPrompt: new Asset(this, 'SystemPrompt', {
      path: './prompts/support_agent.txt'
    }),
    knowledgeBases: [productDocs],
  },
  prompt: 'Answer the customer question using available knowledge bases.',
  enableObservability: true,
});
```

### Multiple Knowledge Bases

```typescript
const productDocs = new BedrockKnowledgeBase(this, 'ProductDocs', {
  name: 'product-docs',
  description: 'Product documentation and user guides',
  knowledgeBaseId: 'KB_PRODUCT',
});

const policyDocs = new BedrockKnowledgeBase(this, 'PolicyDocs', {
  name: 'policy-docs',
  description: 'Company policies and compliance documents',
  knowledgeBaseId: 'KB_POLICY',
});

const technicalDocs = new BedrockKnowledgeBase(this, 'TechnicalDocs', {
  name: 'technical-docs',
  description: 'Technical specifications and API documentation',
  knowledgeBaseId: 'KB_TECHNICAL',
});

const agent = new BatchAgent(this, 'Agent', {
  agentDefinition: {
    knowledgeBases: [productDocs, policyDocs, technicalDocs],
    // ... other props
  },
});
```

### With Retrieval Configuration

```typescript
const kb = new BedrockKnowledgeBase(this, 'KnowledgeBase', {
  name: 'detailed-docs',
  description: 'Detailed documentation requiring more context',
  knowledgeBaseId: 'ABCD1234',
  retrieval: {
    numberOfResults: 10,  // Return more results (default: 5)
    retrievalFilter: {    // Static metadata filter
      equals: {
        key: 'documentType',
        value: 'technical'
      }
    }
  },
});
```

## Access Control (ACL) Configuration

ACL enables identity-aware retrieval, ensuring users only access documents they have permission to view.

### Enabling ACL

```typescript
const teamDocs = new BedrockKnowledgeBase(this, 'TeamDocs', {
  name: 'team-documentation',
  description: 'Team-specific documentation with access control',
  knowledgeBaseId: 'KB_TEAM',
  acl: {
    enabled: true,
    metadataField: 'team',  // Document metadata field containing access groups
  },
});
```

### How ACL Works

1. Documents in the knowledge base must have metadata with the configured field (e.g., `team: engineering`)
2. When querying, the retrieval tool receives user context with groups/permissions
3. The tool automatically applies a filter to match user's groups against document metadata
4. Only documents matching the user's permissions are returned

### User Context Format

The retrieval tool expects user context in this format:

```python
user_context = {
    "groups": ["engineering", "project-alpha"],
    # OR
    "permissions": ["read-engineering", "read-project-alpha"]
}
```

### ACL Error Handling

If ACL is enabled but no user context is provided, the retrieval tool returns:

```json
{
  "success": false,
  "error": "ACL enabled but no user context provided",
  "errorType": "AclContextMissing"
}
```

## Guardrails Configuration

Guardrails filter content during retrieval to prevent inappropriate or sensitive content from being returned.

### Enabling Guardrails

```typescript
const secureDocs = new BedrockKnowledgeBase(this, 'SecureDocs', {
  name: 'secure-documentation',
  description: 'Sensitive documentation with content filtering',
  knowledgeBaseId: 'KB_SECURE',
  guardrail: {
    guardrailId: 'my-guardrail-id',
    guardrailVersion: '1',  // Optional, defaults to 'DRAFT'
  },
});
```

### Guardrail Behavior

- The guardrail is applied during the Bedrock Retrieve API call
- Filtered content is excluded from results
- The response indicates when content was filtered
- IAM permissions for `bedrock:ApplyGuardrail` are automatically added

## Vector Store Configuration

By default, BedrockKnowledgeBase uses S3 Vectors. You can specify alternative configurations:

```typescript
// Using S3 Vectors with custom bucket
const kb = new BedrockKnowledgeBase(this, 'KB', {
  name: 'custom-vectors',
  description: 'KB with custom vector storage',
  knowledgeBaseId: 'ABCD1234',
  vectorStore: {
    type: 's3-vectors',
    bucketName: 'my-vectors-bucket',
    prefix: 'embeddings/',
  },
});

// Supported vector store types
type VectorStoreType = 's3-vectors' | 'opensearch-serverless' | 'pinecone' | 'rds';
```

## Custom Knowledge Base Implementation

Create custom implementations by extending `BaseKnowledgeBase`:

```typescript
import { BaseKnowledgeBase, BaseKnowledgeBaseProps } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

interface CustomKnowledgeBaseProps extends BaseKnowledgeBaseProps {
  readonly endpoint: string;
  readonly apiKey: string;
}

class CustomKnowledgeBase extends BaseKnowledgeBase {
  private readonly endpoint: string;

  constructor(scope: Construct, id: string, props: CustomKnowledgeBaseProps) {
    super(scope, id, props);
    this.endpoint = props.endpoint;
  }

  public generateIamPermissions(): PolicyStatement[] {
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: ['arn:aws:secretsmanager:*:*:secret:custom-kb-*'],
      }),
    ];
  }

  public exportConfiguration(): KnowledgeBaseRuntimeConfig {
    return {
      ...super.exportConfiguration(),
      type: 'custom',
      endpoint: this.endpoint,
    };
  }
}
```

## IAM Permissions

The framework automatically generates least-privilege IAM permissions:

### Bedrock Knowledge Base Permissions

```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:Retrieve",
    "bedrock:RetrieveAndGenerate"
  ],
  "Resource": "arn:aws:bedrock:REGION:ACCOUNT:knowledge-base/KB_ID"
}
```

### With Guardrail

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:ApplyGuardrail"],
  "Resource": "arn:aws:bedrock:REGION:ACCOUNT:guardrail/GUARDRAIL_ID"
}
```

### Additional Permissions

Use `additionalPolicyStatementsForKnowledgeBases` for custom permissions:

```typescript
const agent = new BatchAgent(this, 'Agent', {
  agentDefinition: {
    knowledgeBases: [kb],
    additionalPolicyStatementsForKnowledgeBases: [
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: ['arn:aws:s3:::my-custom-bucket/*'],
      }),
    ],
  },
});
```

## Observability

When `enableObservability` is true, the retrieval tool provides:

### Logging

- Retrieval requests with query and target KB
- Retrieval responses with result count and latency
- Error details with full context

### CloudWatch Metrics

| Metric | Unit | Description |
|--------|------|-------------|
| RetrievalLatency | Milliseconds | Time to complete retrieval |
| RetrievalResultCount | Count | Number of results returned |
| RetrievalSuccess | Count | Successful retrieval operations |
| RetrievalFailure | Count | Failed retrieval operations |

## API Reference

### BedrockKnowledgeBaseProps

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| name | string | Yes | - | Human-readable name |
| description | string | Yes | - | Description for agent |
| knowledgeBaseId | string | Yes | - | Bedrock KB ID |
| knowledgeBaseArn | string | No | Constructed | KB ARN |
| retrieval | RetrievalConfiguration | No | `{ numberOfResults: 5 }` | Retrieval settings |
| acl | AclConfiguration | No | Disabled | ACL settings |
| guardrail | GuardrailConfiguration | No | None | Guardrail settings |
| vectorStore | VectorStoreConfiguration | No | S3 Vectors | Vector store type |

### RetrievalConfiguration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| numberOfResults | number | 5 | Results per query |
| retrievalFilter | `Record<string, unknown>` | None | Static metadata filter |

### AclConfiguration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| enabled | boolean | false | Enable ACL filtering |
| metadataField | string | 'group' | Metadata field for permissions |

### GuardrailConfiguration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| guardrailId | string | Required | Guardrail ID |
| guardrailVersion | string | 'DRAFT' | Guardrail version |

## Related Documentation

- [Agentic AI Framework](../README.md)
- [BatchAgent](../batch-agent.ts)
- [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
