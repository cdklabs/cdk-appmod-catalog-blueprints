# Design Document: Agent Knowledge Base Integration

## Overview

This design document describes the technical architecture for adding knowledge base capabilities to the agent framework. The feature enables agents to perform Retrieval-Augmented Generation (RAG) by querying configured knowledge bases during task execution.

The design follows OOP principles with an interface-based approach that allows multiple knowledge base implementations while providing Amazon Bedrock Knowledge Bases with S3 Vectors as the default. Key design goals include:

- **Extensibility**: Interface-based design allows custom KB implementations
- **Backward Compatibility**: Optional feature that doesn't affect existing agents
- **Security**: ACL support for identity-aware retrieval
- **Simplicity**: Sensible defaults minimize required configuration

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Framework                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   BaseAgent     │    │   BatchAgent    │                    │
│  │  (abstract)     │───▶│  (concrete)     │                    │
│  └────────┬────────┘    └─────────────────┘                    │
│           │                                                     │
│           │ uses                                                │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              IKnowledgeBase[] (composition)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                     │
│           │ implements                                          │
│           ▼                                                     │
│  ┌─────────────────┐    ┌─────────────────────────────────┐   │
│  │ BaseKnowledge   │    │    BedrockKnowledgeBase         │   │
│  │ Base (abstract) │───▶│    (default implementation)     │   │
│  └─────────────────┘    └─────────────────────────────────┘   │
│                                    │                            │
│                                    │ creates                    │
│                                    ▼                            │
│                         ┌─────────────────────────────────┐   │
│                         │  Bedrock KB + S3 Vectors        │   │
│                         │  (AWS Resources)                │   │
│                         └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

```

### Component Interaction Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  User    │────▶│  BatchAgent  │────▶│ Retrieval Tool  │────▶│  Bedrock KB  │
│  Request │     │  Lambda      │     │ (Python)        │     │  API         │
└──────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
                        │                     │                      │
                        │                     │                      │
                        ▼                     ▼                      ▼
                 ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
                 │ KNOWLEDGE_   │     │ ACL Filter      │     │ S3 Vectors   │
                 │ BASES_CONFIG │     │ Injection       │     │ (Storage)    │
                 │ (env var)    │     │ (if enabled)    │     │              │
                 └──────────────┘     └─────────────────┘     └──────────────┘
```

## Components and Interfaces

### IKnowledgeBase Interface

The core interface that all knowledge base implementations must satisfy:

```typescript
/**
 * Interface for knowledge base implementations.
 * Allows different KB backends (Bedrock KB, OpenSearch, custom) to be used interchangeably.
 */
export interface IKnowledgeBase {
  /**
   * Human-readable name for this knowledge base
   */
  readonly name: string;

  /**
   * Human-readable description of what this KB contains
   * Used in system prompt to help agent decide when to query
   */
  readonly description: string;

  /**
   * Generate IAM policy statements required for this KB
   */
  generateIamPermissions(): PolicyStatement[];

  /**
   * Export configuration for runtime use by retrieval tool
   */
  getConfiguration(): KnowledgeBaseRuntimeConfig;

  /**
   * Get the retrieval tool asset for this KB type
   * Returns undefined if using the default framework tool
   */
  getRetrievalToolAsset?(): Asset | undefined;
}

```

### BaseKnowledgeBase Abstract Class

Provides common functionality for knowledge base implementations:

```typescript
/**
 * Abstract base class for knowledge base implementations.
 * Provides common configuration management and validation.
 */
export abstract class BaseKnowledgeBase extends Construct implements IKnowledgeBase {
  public readonly name: string;
  public readonly description: string;
  
  protected readonly props: BaseKnowledgeBaseProps;
  protected readonly retrievalConfig: RetrievalConfiguration;
  protected readonly aclConfig?: AclConfiguration;

  constructor(scope: Construct, id: string, props: BaseKnowledgeBaseProps) {
    super(scope, id);
    this.validateProps(props);
    this.props = props;
    this.name = props.name;
    this.description = props.description;
    this.retrievalConfig = props.retrieval || { numberOfResults: 5 };
    this.aclConfig = props.acl;
  }

  /**
   * Validates props at construction time
   */
  protected validateProps(props: BaseKnowledgeBaseProps): void {
    if (!props.name || props.name.trim() === '') {
      throw new Error('name is required and cannot be empty');
    }
    if (!props.description || props.description.trim() === '') {
      throw new Error('description is required and cannot be empty');
    }
  }

  /**
   * Generate IAM permissions - subclasses implement specific permissions
   */
  public abstract generateIamPermissions(): PolicyStatement[];

  /**
   * Export runtime configuration
   */
  public getConfiguration(): KnowledgeBaseRuntimeConfig {
    return {
      name: this.name,
      description: this.description,
      retrieval: this.retrievalConfig,
      acl: this.aclConfig,
    };
  }

  /**
   * Default: use framework retrieval tool
   */
  public getRetrievalToolAsset(): Asset | undefined {
    return undefined;
  }
}
```

### BedrockKnowledgeBase Implementation

The default implementation using Amazon Bedrock Knowledge Bases:

```typescript
/**
 * Bedrock Knowledge Base implementation with S3 Vectors support.
 * This is the default KB implementation when none is specified.
 */
export class BedrockKnowledgeBase extends BaseKnowledgeBase {
  public readonly knowledgeBaseId: string;
  public readonly knowledgeBaseArn: string;
  
  private readonly guardrailConfig?: GuardrailConfiguration;
  private readonly region: string;
  private readonly account: string;

  constructor(scope: Construct, id: string, props: BedrockKnowledgeBaseProps) {
    super(scope, id, props);
    
    this.validateBedrockProps(props);
    
    const stack = Stack.of(this);
    this.region = stack.region;
    this.account = stack.account;
    
    this.knowledgeBaseId = props.knowledgeBaseId;
    this.knowledgeBaseArn = props.knowledgeBaseArn || 
      `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${props.knowledgeBaseId}`;
    this.guardrailConfig = props.guardrail;
  }

  /**
   * Validates Bedrock-specific props
   */
  private validateBedrockProps(props: BedrockKnowledgeBaseProps): void {
    if (!props.knowledgeBaseId || props.knowledgeBaseId.trim() === '') {
      throw new Error('knowledgeBaseId is required and cannot be empty');
    }
  }

  /**
   * Generate Bedrock KB specific IAM permissions
   */
  public generateIamPermissions(): PolicyStatement[] {
    const statements: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
        resources: [this.knowledgeBaseArn],
      }),
    ];

    // Add guardrail permissions if configured
    if (this.guardrailConfig) {
      statements.push(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['bedrock:ApplyGuardrail'],
          resources: [
            `arn:aws:bedrock:${this.region}:${this.account}:guardrail/${this.guardrailConfig.guardrailId}`,
          ],
        })
      );
    }

    return statements;
  }

  /**
   * Export Bedrock-specific runtime configuration
   */
  public getConfiguration(): KnowledgeBaseRuntimeConfig {
    return {
      ...super.getConfiguration(),
      type: 'bedrock',
      knowledgeBaseId: this.knowledgeBaseId,
      knowledgeBaseArn: this.knowledgeBaseArn,
      guardrail: this.guardrailConfig,
    };
  }
}
```

### Retrieval Tool (Python)

The built-in retrieval tool that agents can invoke:

```python
# use-cases/framework/agents/resources/knowledge-base-tool/retrieve.py

from strands import tool
from typing import Dict, Any, List, Optional
import boto3
import json
import os
import time

from aws_lambda_powertools import Logger, Metrics
from aws_lambda_powertools.metrics import MetricUnit

logger = Logger()
metrics = Metrics()

# Load KB configuration from environment
KB_CONFIG = json.loads(os.environ.get('KNOWLEDGE_BASES_CONFIG', '[]'))

@tool
def retrieve_from_knowledge_base(
    query: str,
    knowledge_base_id: Optional[str] = None,
    user_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Retrieve relevant information from configured knowledge bases.
    
    Use this tool when you need to find information from the knowledge bases.
    Available knowledge bases and their contents are listed in your instructions.
    
    Args:
        query: The search query to find relevant information
        knowledge_base_id: Optional specific KB to query. If not provided, queries all KBs.
        user_context: Optional user identity context for ACL filtering
        
    Returns:
        Dictionary with retrieved passages, sources, and relevance scores
    """
    start_time = time.time()
    
    try:
        # Determine which KBs to query
        kbs_to_query = _get_knowledge_bases(knowledge_base_id)
        
        if not kbs_to_query:
            return {
                'success': False,
                'error': f'Knowledge base not found: {knowledge_base_id}',
                'errorType': 'KnowledgeBaseNotFound'
            }
        
        all_results = []
        for kb in kbs_to_query:
            results = _retrieve_from_kb(kb, query, user_context)
            all_results.extend(results)
        
        # Sort by score and limit results
        all_results.sort(key=lambda x: x['score'], reverse=True)
        
        latency = time.time() - start_time
        _emit_metrics(len(all_results), latency, True)
        
        return {
            'success': True,
            'results': all_results,
            'metadata': {
                'totalResults': len(all_results),
                'queryLatencyMs': int(latency * 1000),
                'knowledgeBasesQueried': [kb['knowledgeBaseId'] for kb in kbs_to_query]
            }
        }
        
    except Exception as e:
        latency = time.time() - start_time
        _emit_metrics(0, latency, False)
        logger.error(f'Retrieval failed: {str(e)}')
        
        return {
            'success': False,
            'error': str(e),
            'errorType': type(e).__name__
        }
```

## Data Models

### Props Interfaces

```typescript
/**
 * Base configuration for all knowledge base implementations
 */
export interface BaseKnowledgeBaseProps {
  /**
   * Human-readable name/identifier for this knowledge base
   * Used for logging and display purposes
   */
  readonly name: string;

  /**
   * Description of what this KB contains and when to use it
   * This is shown to the agent to help it decide when to query
   */
  readonly description: string;

  /**
   * Retrieval configuration options
   * @default { numberOfResults: 5 }
   */
  readonly retrieval?: RetrievalConfiguration;

  /**
   * Access control configuration for identity-aware retrieval
   * @default - ACL disabled
   */
  readonly acl?: AclConfiguration;
}

/**
 * Retrieval configuration options
 */
export interface RetrievalConfiguration {
  /**
   * Number of results to return per query
   * @default 5
   */
  readonly numberOfResults?: number;

  /**
   * Metadata filter to apply to all queries
   * @default - No filter
   */
  readonly retrievalFilter?: Record<string, any>;
}

/**
 * ACL configuration for identity-aware retrieval
 */
export interface AclConfiguration {
  /**
   * Enable ACL-based filtering
   * @default false
   */
  readonly enabled: boolean;

  /**
   * Metadata field containing access permissions
   * @default 'group'
   */
  readonly metadataField?: string;
}

/**
 * Bedrock-specific knowledge base configuration
 */
export interface BedrockKnowledgeBaseProps extends BaseKnowledgeBaseProps {
  /**
   * Unique identifier for the Bedrock Knowledge Base
   */
  readonly knowledgeBaseId: string;

  /**
   * ARN of the Bedrock Knowledge Base
   * If not provided, constructed from knowledgeBaseId
   * @default - Constructed from knowledgeBaseId
   */
  readonly knowledgeBaseArn?: string;

  /**
   * Vector store configuration
   * @default - S3 Vectors
   */
  readonly vectorStore?: VectorStoreConfiguration;

  /**
   * Guardrail configuration for content filtering
   * @default - No guardrail
   */
  readonly guardrail?: GuardrailConfiguration;

  /**
   * Configuration for creating a new knowledge base
   * If provided, a new KB will be created with the specified settings
   * @default - Reference existing KB only
   */
  readonly create?: CreateKnowledgeBaseConfiguration;
}

/**
 * Vector store configuration
 */
export interface VectorStoreConfiguration {
  /**
   * Type of vector store
   * @default 's3-vectors'
   */
  readonly type?: 's3-vectors' | 'opensearch-serverless' | 'pinecone' | 'rds';

  /**
   * S3 bucket for S3 Vectors storage
   * Only used when type is 's3-vectors'
   * @default - Auto-created bucket
   */
  readonly bucket?: IBucket;

  /**
   * S3 prefix for vectors
   * @default 'vectors/'
   */
  readonly prefix?: string;
}

/**
 * Configuration for creating a new knowledge base
 */
export interface CreateKnowledgeBaseConfiguration {
  /**
   * S3 bucket containing source documents
   */
  readonly dataSourceBucket: IBucket;

  /**
   * S3 prefix for source documents
   * @default - Root of bucket
   */
  readonly dataSourcePrefix?: string;

  /**
   * Embedding model to use
   * @default 'amazon.titan-embed-text-v2:0'
   */
  readonly embeddingModelId?: string;

  /**
   * Chunking strategy for documents
   * @default - Default chunking
   */
  readonly chunkingStrategy?: 'fixed-size' | 'semantic' | 'none';
}

/**
 * Guardrail configuration
 */
export interface GuardrailConfiguration {
  /**
   * ID of the Bedrock Guardrail
   */
  readonly guardrailId: string;

  /**
   * Version of the guardrail to use
   * @default 'DRAFT'
   */
  readonly guardrailVersion?: string;
}

/**
 * Runtime configuration exported for the retrieval tool
 */
export interface KnowledgeBaseRuntimeConfig {
  readonly name: string;
  readonly description: string;
  readonly type?: string;
  readonly knowledgeBaseId?: string;
  readonly knowledgeBaseArn?: string;
  readonly retrieval: RetrievalConfiguration;
  readonly acl?: AclConfiguration;
  readonly guardrail?: GuardrailConfiguration;
}
```

### Extended AgentDefinitionProps

```typescript
/**
 * Extended agent definition with knowledge base support
 */
export interface AgentDefinitionProps {
  // ... existing props ...

  /**
   * Knowledge bases available to the agent for RAG
   * @default - No knowledge bases
   */
  readonly knowledgeBases?: IKnowledgeBase[];

  /**
   * Additional IAM permissions for knowledge base access
   * Use when KBs need permissions beyond auto-generated ones
   * @default - Only auto-generated permissions
   */
  readonly additionalPolicyStatementsForKnowledgeBases?: PolicyStatement[];
}
```

## Error Handling

### Construction-Time Errors

| Error Condition | Error Message | Recovery |
|----------------|---------------|----------|
| Empty `name` | "name is required and cannot be empty" | Provide valid KB name |
| Empty `description` | "description is required and cannot be empty" | Provide KB description |
| Empty `knowledgeBaseId` (Bedrock) | "knowledgeBaseId is required and cannot be empty" | Provide valid Bedrock KB ID |
| Invalid `numberOfResults` | "numberOfResults must be a positive integer" | Use value >= 1 |
| Invalid guardrail config | "guardrailId is required when guardrail is configured" | Provide guardrail ID |

### Runtime Errors (Retrieval Tool)

| Error Condition | Error Type | Response |
|----------------|------------|----------|
| KB not found | `KnowledgeBaseNotFound` | `{ success: false, error: "Knowledge base not found: {id}", errorType: "KnowledgeBaseNotFound" }` |
| ACL missing user context | `AclContextMissing` | `{ success: false, error: "ACL enabled but no user context provided", errorType: "AclContextMissing" }` |
| Bedrock API error | `BedrockApiError` | `{ success: false, error: "{message}", errorType: "BedrockApiError" }` |
| Timeout | `TimeoutError` | `{ success: false, error: "Retrieval timed out", errorType: "TimeoutError" }` |
| Permission denied | `AccessDenied` | `{ success: false, error: "Access denied to knowledge base", errorType: "AccessDenied" }` |

### Error Logging

When `enableObservability` is true:
- All errors are logged with full context (query, KB ID, user context if present)
- Error metrics are emitted to CloudWatch
- Sensitive data (query content) is protected by Log Group data protection

## Testing Strategy

### Unit Tests

Unit tests verify individual component behavior:

1. **Interface Contract Tests**
   - Verify `IKnowledgeBase` implementations satisfy the interface
   - Test `BaseKnowledgeBase` validation logic
   - Test `BedrockKnowledgeBase` IAM permission generation

2. **Props Validation Tests**
   - Test required field validation (name, description, knowledgeBaseId)
   - Test default value application (numberOfResults = 5)
   - Test optional field handling (acl, guardrail)

3. **CDK Synthesis Tests**
   - Verify Lambda environment variables are set correctly
   - Verify IAM policies are generated with correct permissions
   - Verify system prompt modification when KBs configured

### CDK Nag Tests

Security compliance tests:

1. Verify IAM policies follow least-privilege principle
2. Verify KMS encryption is used for environment variables
3. Verify no wildcard permissions in generated policies
4. Verify guardrail permissions are scoped correctly

### Integration Tests

End-to-end tests with actual Bedrock KB:

1. Create agent with KB configuration
2. Invoke agent with retrieval query
3. Verify retrieval results are returned
4. Verify ACL filtering works correctly
5. Verify observability metrics are emitted
