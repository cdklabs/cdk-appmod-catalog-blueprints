# Requirements Document

## Introduction

This document specifies the requirements for adding knowledge base capabilities to the existing agent framework (`BaseAgent` and `BatchAgent` constructs). The feature enables agents to retrieve relevant information from knowledge bases during task execution, implementing a Retrieval-Augmented Generation (RAG) pattern.

The integration follows the existing patterns in the agent framework, adding knowledge base support as an optional feature that maintains backward compatibility with existing agent implementations. The design uses OOP principles (interfaces and abstract classes) to allow extensibility for different knowledge base implementations while providing Amazon Bedrock Knowledge Bases with S3 Vectors as the default implementation.

Key capabilities include:
- Flexible knowledge base integration supporting multiple implementations
- Access Control List (ACL) support for identity-aware vector search
- Automatic tool generation for agent-driven retrieval
- Support for both referencing existing KBs and creating new ones

## Glossary

- **Agent_Framework**: The existing CDK constructs (`BaseAgent`, `BatchAgent`) that create AI agents using Amazon Bedrock
- **Knowledge_Base**: A vector store containing indexed documents for semantic search
- **IKnowledgeBase**: The interface defining the contract for knowledge base implementations
- **BaseKnowledgeBase**: Abstract base class providing common knowledge base functionality
- **BedrockKnowledgeBase**: Concrete implementation using Amazon Bedrock Knowledge Bases
- **Knowledge_Base_Configuration**: The settings that define how an agent connects to and queries a knowledge base
- **Retrieval_Tool**: A built-in tool that agents can invoke to search knowledge bases
- **RAG**: Retrieval-Augmented Generation - a pattern where relevant context is retrieved before generation
- **ACL**: Access Control List - metadata-based filtering to restrict retrieval based on user identity/permissions
- **S3_Vectors**: Amazon S3 vector storage capability for storing and querying vector embeddings
- **Agent_Role**: The IAM role assumed by the agent Lambda function
- **Guardrail**: An Amazon Bedrock Guardrail that filters content during retrieval
- **Vector_Store**: The underlying storage for vector embeddings (S3 Vectors, OpenSearch, etc.)
- **Metadata_Filter**: Query-time filter applied to vector search based on document metadata

## Requirements

### Requirement 1: Knowledge Base Interface and Extensibility

**User Story:** As a developer, I want a flexible knowledge base abstraction, so that I can use different knowledge base implementations (Bedrock KB, custom OpenSearch, etc.) with the same agent framework.

#### Acceptance Criteria

1. THE Agent_Framework SHALL define an `IKnowledgeBase` interface specifying the contract for knowledge base implementations
2. THE `IKnowledgeBase` interface SHALL define methods for retrieval, permission generation, and configuration export
3. THE Agent_Framework SHALL provide a `BaseKnowledgeBase` abstract class implementing common functionality
4. THE Agent_Framework SHALL provide a `BedrockKnowledgeBase` concrete implementation as the default
5. WHEN no knowledge base implementation is specified, THE Agent_Framework SHALL use `BedrockKnowledgeBase` with S3 Vectors as the default vector store
6. THE interface design SHALL allow third-party implementations without modifying the core framework

### Requirement 2: Knowledge Base Configuration

**User Story:** As a developer, I want to configure knowledge bases for my agent, so that the agent can retrieve relevant information during task execution.

#### Acceptance Criteria

1. THE Agent_Framework SHALL accept an optional `knowledgeBases` property in the `AgentDefinitionProps` interface
2. WHEN `knowledgeBases` is provided, THE Agent_Framework SHALL accept an array of `IKnowledgeBase` implementations
3. THE Knowledge_Base_Configuration SHALL require a `knowledgeBaseId` property identifying the knowledge base
4. THE Knowledge_Base_Configuration SHALL accept an optional `description` property explaining the knowledge base contents and when to use it
5. THE Knowledge_Base_Configuration SHALL accept an optional `numberOfResults` property with a default value of 5
6. THE Knowledge_Base_Configuration SHALL accept an optional `retrievalFilter` property for metadata filtering
7. THE Knowledge_Base_Configuration SHALL accept an optional `enableAcl` property to enable identity-aware filtering

### Requirement 3: Access Control List (ACL) Support

**User Story:** As a developer, I want to enable identity-aware vector search, so that users only retrieve documents they have permission to access.

#### Acceptance Criteria

1. THE Knowledge_Base_Configuration SHALL accept an optional `enableAcl` boolean property defaulting to false
2. WHEN `enableAcl` is true, THE Retrieval_Tool SHALL accept user identity context for filtering
3. THE ACL implementation SHALL use metadata filtering to restrict results based on user permissions
4. THE Knowledge_Base_Configuration SHALL accept an optional `aclMetadataField` property specifying the metadata field containing access permissions
5. THE Retrieval_Tool SHALL automatically apply ACL filters when enabled and user context is provided
6. IF ACL is enabled but no user context is provided, THEN THE Retrieval_Tool SHALL return an error indicating missing identity context

### Requirement 4: IAM Permission Management

**User Story:** As a developer, I want the construct to automatically configure IAM permissions while allowing additional custom permissions, so that my agent can access the specified knowledge bases with minimal configuration.

#### Acceptance Criteria

1. WHEN knowledge bases are configured, THE Agent_Framework SHALL automatically grant the Agent_Role permission to call `bedrock:Retrieve` on each specified knowledge base
2. WHEN knowledge bases are configured, THE Agent_Framework SHALL automatically grant the Agent_Role permission to call `bedrock:RetrieveAndGenerate` on each specified knowledge base
3. THE Agent_Framework SHALL scope IAM permissions to the specific knowledge base ARNs provided
4. WHEN a guardrail is configured, THE Agent_Framework SHALL grant the Agent_Role permission to use the specified guardrail
5. THE Agent_Framework SHALL accept optional `additionalPolicyStatementsForKnowledgeBases` for custom IAM permissions
6. THE `IKnowledgeBase` interface SHALL define a method to generate required IAM permissions for the implementation

### Requirement 5: Built-in Retrieval Tool

**User Story:** As a developer, I want a built-in retrieval tool automatically available to my agent, so that the agent can query knowledge bases without me writing custom tool code.

#### Acceptance Criteria

1. WHEN knowledge bases are configured, THE Agent_Framework SHALL automatically include a `retrieve_from_knowledge_base` Retrieval_Tool
2. THE Retrieval_Tool SHALL accept a query string parameter for semantic search
3. THE Retrieval_Tool SHALL accept an optional knowledge base identifier to target a specific knowledge base
4. WHEN no knowledge base identifier is provided, THE Retrieval_Tool SHALL query all configured knowledge bases
5. THE Retrieval_Tool SHALL return retrieved passages with their source metadata and relevance scores
6. IF the retrieval operation fails, THEN THE Retrieval_Tool SHALL return a structured error response with error details
7. THE Retrieval_Tool implementation SHALL be provided by the `IKnowledgeBase` implementation to allow customization

### Requirement 6: System Prompt Integration

**User Story:** As a developer, I want the framework to automatically inform the agent about available knowledge bases, so that the agent knows when and how to use the retrieval capability.

#### Acceptance Criteria

1. WHEN knowledge bases are configured, THE Agent_Framework SHALL append knowledge base information to the agent's system prompt
2. THE appended information SHALL include the retrieval tool description and usage instructions
3. THE appended information SHALL list each configured knowledge base with its description to help the agent choose appropriately
4. THE Agent_Framework SHALL preserve the user-provided system prompt content without modification
5. WHEN no knowledge bases are configured, THE Agent_Framework SHALL not modify the system prompt

### Requirement 7: Environment Variable Configuration

**User Story:** As a developer, I want knowledge base configuration passed to the Lambda function, so that the retrieval tool can access the configured knowledge bases at runtime.

#### Acceptance Criteria

1. WHEN knowledge bases are configured, THE Agent_Framework SHALL set a `KNOWLEDGE_BASES_CONFIG` environment variable on the agent Lambda function
2. THE `KNOWLEDGE_BASES_CONFIG` environment variable SHALL contain a JSON-serialized array of knowledge base configurations
3. THE configuration SHALL include the knowledge base ID, description, number of results, ACL settings, and any filters for each knowledge base
4. THE Agent_Framework SHALL encrypt the environment variable using the agent's KMS encryption key

### Requirement 8: Guardrails Support

**User Story:** As a developer, I want to optionally apply Bedrock Guardrails to knowledge base retrieval, so that I can filter inappropriate or sensitive content from retrieval results.

#### Acceptance Criteria

1. THE Knowledge_Base_Configuration SHALL accept an optional `guardrailId` property
2. THE Knowledge_Base_Configuration SHALL accept an optional `guardrailVersion` property with a default of "DRAFT"
3. WHEN a guardrail is configured, THE Retrieval_Tool SHALL apply the guardrail during retrieval operations
4. WHEN guardrail filtering blocks content, THE Retrieval_Tool SHALL indicate filtered results in the response

### Requirement 9: Observability Integration

**User Story:** As a developer, I want knowledge base retrieval operations to be observable, so that I can monitor and troubleshoot RAG performance.

#### Acceptance Criteria

1. WHEN `enableObservability` is true, THE Retrieval_Tool SHALL log retrieval requests with query text and target knowledge base
2. WHEN `enableObservability` is true, THE Retrieval_Tool SHALL log retrieval responses with result count and latency
3. WHEN `enableObservability` is true, THE Retrieval_Tool SHALL emit CloudWatch metrics for retrieval latency
4. WHEN `enableObservability` is true, THE Retrieval_Tool SHALL emit CloudWatch metrics for retrieval result counts
5. IF retrieval fails, THEN THE Retrieval_Tool SHALL log error details including error type and message
6. THE observability features SHALL apply Log Group data protection capabilities where applicable

### Requirement 10: Backward Compatibility

**User Story:** As a developer with existing agents, I want the knowledge base feature to be optional, so that my existing agent configurations continue to work without modification.

#### Acceptance Criteria

1. THE Agent_Framework SHALL maintain full backward compatibility with existing `AgentDefinitionProps` configurations
2. WHEN `knowledgeBases` is not provided, THE Agent_Framework SHALL create agents without knowledge base capabilities
3. WHEN `knowledgeBases` is not provided, THE Agent_Framework SHALL not modify the system prompt
4. WHEN `knowledgeBases` is not provided, THE Agent_Framework SHALL not add knowledge base IAM permissions
5. THE Agent_Framework SHALL not require any changes to existing agent implementations

### Requirement 11: Multiple Knowledge Base Support

**User Story:** As a developer, I want to configure multiple knowledge bases for a single agent, so that the agent can access different information sources based on the task.

#### Acceptance Criteria

1. THE Agent_Framework SHALL support configuring multiple knowledge bases in the `knowledgeBases` array
2. THE Retrieval_Tool SHALL allow querying a specific knowledge base by its identifier
3. THE Retrieval_Tool SHALL allow querying all configured knowledge bases simultaneously
4. WHEN querying multiple knowledge bases, THE Retrieval_Tool SHALL aggregate and return results from all sources
5. THE system prompt SHALL list all configured knowledge bases with their descriptions to help the agent choose appropriately
6. EACH knowledge base description SHALL clearly indicate what type of information it contains and when to use it

### Requirement 12: Retrieval Tool Response Format

**User Story:** As a developer, I want retrieval results in a structured format, so that the agent can effectively use the retrieved information in its responses.

#### Acceptance Criteria

1. THE Retrieval_Tool SHALL return results as a structured JSON object
2. THE response SHALL include a `success` boolean indicating operation status
3. THE response SHALL include a `results` array containing retrieved passages
4. EACH result SHALL include the `content` text of the retrieved passage
5. EACH result SHALL include `source` metadata identifying the document origin
6. EACH result SHALL include a `score` indicating relevance to the query
7. THE response SHALL include `metadata` with total result count and query latency
8. IF retrieval fails, THEN THE response SHALL include `error` and `errorType` fields

### Requirement 13: Knowledge Base Creation Support

**User Story:** As a developer, I want the option to create new knowledge bases as part of my agent deployment, so that I can manage the complete RAG infrastructure in one place.

#### Acceptance Criteria

1. THE Agent_Framework SHALL support both referencing existing knowledge bases and creating new ones
2. WHEN creating a new knowledge base, THE Agent_Framework SHALL accept data source configuration (S3 bucket, prefix, etc.)
3. WHEN creating a new knowledge base, THE Agent_Framework SHALL use S3 Vectors as the default vector store
4. THE Agent_Framework SHALL accept an optional `vectorStoreType` property to specify alternative vector stores
5. WHEN creating a new knowledge base, THE Agent_Framework SHALL configure appropriate embedding model settings
6. THE Agent_Framework SHALL expose the created knowledge base ARN for reference by other constructs

### Requirement 14: Default Bedrock Knowledge Base Implementation

**User Story:** As a developer, I want a sensible default knowledge base implementation, so that I can quickly enable RAG without extensive configuration.

#### Acceptance Criteria

1. THE `BedrockKnowledgeBase` implementation SHALL be the default when no custom implementation is provided
2. THE `BedrockKnowledgeBase` SHALL use S3 Vectors as the default vector store
3. THE `BedrockKnowledgeBase` SHALL support all standard Bedrock KB retrieval parameters
4. THE `BedrockKnowledgeBase` SHALL implement the `IKnowledgeBase` interface completely
5. THE `BedrockKnowledgeBase` SHALL generate appropriate IAM permissions for Bedrock KB access
6. THE `BedrockKnowledgeBase` SHALL support ACL-based filtering using Bedrock KB metadata filters
