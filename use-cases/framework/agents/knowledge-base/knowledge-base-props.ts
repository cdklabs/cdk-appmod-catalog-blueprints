// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Configuration for retrieval operations.
 *
 * Controls how many results are returned and optional metadata filtering
 * applied to all queries against the knowledge base.
 */
export interface RetrievalConfiguration {
  /**
   * Number of results to return per query.
   *
   * Higher values provide more context but increase token usage.
   * Lower values are faster but may miss relevant information.
   *
   * @default 5
   */
  readonly numberOfResults?: number;

  /**
   * Metadata filter to apply to all queries.
   *
   * This filter is applied in addition to any ACL filters. Use this
   * for static filtering based on document metadata (e.g., document type,
   * category, or date range).
   *
   * @default - No filter applied
   */
  readonly retrievalFilter?: Record<string, unknown>;
}

/**
 * Configuration for Access Control List (ACL) based filtering.
 *
 * When enabled, retrieval queries will be filtered based on user identity
 * context, ensuring users only retrieve documents they have permission to access.
 */
export interface AclConfiguration {
  /**
   * Enable ACL-based filtering for retrieval queries.
   *
   * When true, the retrieval tool will require user context and apply
   * metadata filters based on user permissions.
   *
   * @default false
   */
  readonly enabled: boolean;

  /**
   * Metadata field containing access permissions.
   *
   * This field in the document metadata should contain the group or
   * permission identifier that controls access. The retrieval tool
   * will filter results where this field matches the user's permissions.
   *
   * @default 'group'
   */
  readonly metadataField?: string;
}

/**
 * Configuration for Bedrock Guardrails.
 *
 * Guardrails filter content during retrieval operations to prevent
 * inappropriate or sensitive content from being returned.
 */
export interface GuardrailConfiguration {
  /**
   * ID of the Bedrock Guardrail to apply.
   *
   * The guardrail must exist in the same region as the knowledge base.
   */
  readonly guardrailId: string;

  /**
   * Version of the guardrail to use.
   *
   * Use 'DRAFT' for testing or a specific version number for production.
   *
   * @default 'DRAFT'
   */
  readonly guardrailVersion?: string;
}

/**
 * Supported vector store types for Bedrock Knowledge Bases.
 */
export type VectorStoreType = 's3-vectors' | 'opensearch-serverless' | 'pinecone' | 'rds';

/**
 * Configuration for vector store used by the knowledge base.
 *
 * Defines the type of vector store and any type-specific configuration.
 * S3 Vectors is the default and recommended option for most use cases.
 */
export interface VectorStoreConfiguration {
  /**
   * Type of vector store.
   *
   * - 's3-vectors': Amazon S3 vector storage (default, recommended)
   * - 'opensearch-serverless': Amazon OpenSearch Serverless
   * - 'pinecone': Pinecone vector database
   * - 'rds': Amazon RDS with pgvector
   *
   * @default 's3-vectors'
   */
  readonly type?: VectorStoreType;

  /**
   * S3 bucket name for S3 Vectors storage.
   *
   * Only used when type is 's3-vectors'. If not provided, the default
   * bucket created by Bedrock will be used.
   *
   * @default - Uses Bedrock's default bucket
   */
  readonly bucketName?: string;

  /**
   * S3 prefix for vectors within the bucket.
   *
   * Only used when type is 's3-vectors'.
   *
   * @default 'vectors/'
   */
  readonly prefix?: string;
}

/**
 * Supported chunking strategies for knowledge base document processing.
 *
 * Note: This is different from the document processing ChunkingStrategy
 * which uses 'fixed-pages', 'token-based', and 'hybrid' strategies.
 */
export type KnowledgeBaseChunkingStrategy = 'fixed-size' | 'semantic' | 'none';

/**
 * Configuration for creating a new Bedrock Knowledge Base.
 *
 * When provided to BedrockKnowledgeBase, a new knowledge base will be
 * created with the specified data source and embedding configuration.
 *
 * Note: This is an advanced feature. For most use cases, referencing
 * an existing knowledge base by ID is recommended.
 */
export interface CreateKnowledgeBaseConfiguration {
  /**
   * S3 bucket name containing source documents.
   *
   * The bucket must exist and contain the documents to be indexed.
   */
  readonly dataSourceBucketName: string;

  /**
   * S3 prefix for source documents within the bucket.
   *
   * Only documents under this prefix will be indexed.
   *
   * @default - Root of bucket (all documents)
   */
  readonly dataSourcePrefix?: string;

  /**
   * Embedding model to use for vectorization.
   *
   * Must be a valid Bedrock embedding model ID.
   *
   * @default 'amazon.titan-embed-text-v2:0'
   */
  readonly embeddingModelId?: string;

  /**
   * Chunking strategy for document processing.
   *
   * - 'fixed-size': Split documents into fixed-size chunks
   * - 'semantic': Use semantic boundaries for chunking
   * - 'none': No chunking (use entire documents)
   *
   * @default 'fixed-size'
   */
  readonly chunkingStrategy?: KnowledgeBaseChunkingStrategy;

  /**
   * Maximum chunk size in tokens (for fixed-size chunking).
   *
   * Only used when chunkingStrategy is 'fixed-size'.
   *
   * @default 300
   */
  readonly maxTokens?: number;

  /**
   * Overlap between chunks in tokens (for fixed-size chunking).
   *
   * Only used when chunkingStrategy is 'fixed-size'.
   *
   * @default 20
   */
  readonly overlapTokens?: number;
}

/**
 * Base configuration for all knowledge base implementations.
 *
 * This interface defines the common properties shared by all knowledge
 * base types. Specific implementations (like BedrockKnowledgeBase) extend
 * this with additional properties.
 */
export interface BaseKnowledgeBaseProps {
  /**
   * Human-readable name/identifier for this knowledge base.
   *
   * Used for logging, display purposes, and to help the agent identify
   * which knowledge base to query. Should be unique within the set of
   * knowledge bases configured for an agent.
   *
   * @example 'product-documentation'
   */
  readonly name: string;

  /**
   * Description of what this knowledge base contains and when to use it.
   *
   * This description is shown to the agent in its system prompt to help
   * it decide when to query this knowledge base. Be specific about the
   * type of information contained and appropriate use cases.
   *
   * @example 'Contains product documentation, user guides, and FAQs. Use when answering questions about product features or troubleshooting.'
   */
  readonly description: string;

  /**
   * Retrieval configuration options.
   *
   * Controls the number of results returned and optional metadata filtering.
   *
   * @default { numberOfResults: 5 }
   */
  readonly retrieval?: RetrievalConfiguration;

  /**
   * Access control configuration for identity-aware retrieval.
   *
   * When enabled, retrieval queries will be filtered based on user
   * identity context to ensure users only access permitted documents.
   *
   * @default - ACL disabled
   */
  readonly acl?: AclConfiguration;
}

/**
 * Configuration for Amazon Bedrock Knowledge Base.
 *
 * This interface extends the base configuration with Bedrock-specific
 * properties for connecting to an existing Bedrock Knowledge Base.
 */
export interface BedrockKnowledgeBaseProps extends BaseKnowledgeBaseProps {
  /**
   * Unique identifier for the Bedrock Knowledge Base.
   *
   * This is the ID assigned by Bedrock when the knowledge base was created.
   * You can find this in the Bedrock console or via the AWS CLI.
   *
   * Required when referencing an existing knowledge base.
   * Not required when using the `create` property to create a new KB.
   */
  readonly knowledgeBaseId: string;

  /**
   * ARN of the Bedrock Knowledge Base.
   *
   * If not provided, the ARN will be constructed from the knowledgeBaseId
   * using the current region and account.
   *
   * @default - Constructed from knowledgeBaseId
   */
  readonly knowledgeBaseArn?: string;

  /**
   * Vector store configuration.
   *
   * Defines the type of vector store used by this knowledge base.
   * This is informational and used for generating appropriate IAM
   * permissions when needed.
   *
   * @default - S3 Vectors (type: 's3-vectors')
   */
  readonly vectorStore?: VectorStoreConfiguration;

  /**
   * Guardrail configuration for content filtering.
   *
   * When configured, the guardrail will be applied during retrieval
   * operations to filter inappropriate or sensitive content.
   *
   * @default - No guardrail applied
   */
  readonly guardrail?: GuardrailConfiguration;

  /**
   * Configuration for creating a new knowledge base.
   *
   * When provided, a new Bedrock Knowledge Base will be created with
   * the specified data source and embedding configuration.
   *
   * Note: This is an advanced feature that creates AWS resources.
   * For most use cases, referencing an existing knowledge base by ID
   * is recommended.
   *
   * @default - Reference existing KB only (no creation)
   */
  readonly create?: CreateKnowledgeBaseConfiguration;
}

/**
 * Runtime configuration exported for the retrieval tool.
 *
 * This interface defines the structure of the configuration object
 * that is serialized and passed to the retrieval tool via environment
 * variables. It contains all information needed to query the knowledge
 * base at runtime.
 */
export interface KnowledgeBaseRuntimeConfig {
  /**
   * Human-readable name for this knowledge base.
   */
  readonly name: string;

  /**
   * Description of what this knowledge base contains.
   */
  readonly description: string;

  /**
   * Type of knowledge base implementation.
   *
   * Used by the retrieval tool to determine how to query the KB.
   *
   * @example 'bedrock'
   */
  readonly type?: string;

  /**
   * Bedrock Knowledge Base ID (for Bedrock implementations).
   */
  readonly knowledgeBaseId?: string;

  /**
   * Bedrock Knowledge Base ARN (for Bedrock implementations).
   */
  readonly knowledgeBaseArn?: string;

  /**
   * Vector store configuration (for Bedrock implementations).
   */
  readonly vectorStore?: VectorStoreConfiguration;

  /**
   * Retrieval configuration.
   */
  readonly retrieval: RetrievalConfiguration;

  /**
   * ACL configuration for identity-aware retrieval.
   */
  readonly acl?: AclConfiguration;

  /**
   * Guardrail configuration (for Bedrock implementations).
   */
  readonly guardrail?: GuardrailConfiguration;
}
