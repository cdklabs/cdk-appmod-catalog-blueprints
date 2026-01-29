# Implementation Plan: Agent Knowledge Base Integration

## Overview

This implementation plan adds knowledge base capabilities to the agent framework following an interface-first approach. The work is organized into phases: interfaces/types, abstract base class, concrete implementation, retrieval tool, framework integration, and testing.

## Tasks

- [x] 1. Define interfaces and types
  - [x] 1.1 Create `IKnowledgeBase` interface
    - Create `use-cases/framework/agents/knowledge-base/i-knowledge-base.ts`
    - Define `name`, `description` readonly properties
    - Define `generateIamPermissions()` method returning `PolicyStatement[]`
    - Define `getConfiguration()` method returning `KnowledgeBaseRuntimeConfig`
    - Define optional `getRetrievalToolAsset()` method
    - Add comprehensive JSDoc comments
    - _Requirements: 1.1, 1.2, 1.6_

  - [x] 1.2 Create props interfaces
    - Create `use-cases/framework/agents/knowledge-base/knowledge-base-props.ts`
    - Define `BaseKnowledgeBaseProps` with `name`, `description`, `retrieval?`, `acl?`
    - Define `RetrievalConfiguration` with `numberOfResults?`, `retrievalFilter?`
    - Define `AclConfiguration` with `enabled`, `metadataField?` (default: 'group')
    - Define `BedrockKnowledgeBaseProps` extending base with `knowledgeBaseId`, `knowledgeBaseArn?`, `vectorStore?`, `guardrail?`, `create?`
    - Define `VectorStoreConfiguration` with `type?`, `bucket?`, `prefix?`
    - Define `CreateKnowledgeBaseConfiguration` with `dataSourceBucket`, `dataSourcePrefix?`, `embeddingModelId?`, `chunkingStrategy?`
    - Define `GuardrailConfiguration` with `guardrailId`, `guardrailVersion?`
    - Define `KnowledgeBaseRuntimeConfig` for runtime use
    - Add JSDoc comments with @default annotations
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 13.3, 13.4_

  - [x] 1.3 Create index file and exports
    - Create `use-cases/framework/agents/knowledge-base/index.ts`
    - Export all interfaces and types
    - Update `use-cases/framework/agents/index.ts` to re-export knowledge-base module
    - Update `use-cases/index.ts` if needed
    - _Requirements: 1.6_

- [x] 2. Implement BaseKnowledgeBase abstract class
  - [x] 2.1 Create BaseKnowledgeBase class
    - Create `use-cases/framework/agents/knowledge-base/base-knowledge-base.ts`
    - Extend `Construct` and implement `IKnowledgeBase`
    - Store `name`, `description` as public readonly
    - Store `retrievalConfig`, `aclConfig` as protected
    - Implement `validateProps()` for name and description validation
    - Implement `getConfiguration()` returning base config
    - Implement `getRetrievalToolAsset()` returning undefined (default)
    - Declare abstract `generateIamPermissions()` method
    - Add comprehensive JSDoc comments
    - _Requirements: 1.3, 2.3, 2.4, 2.5_

  - [x] 2.2 Write unit tests for BaseKnowledgeBase
    - Create `use-cases/framework/agents/knowledge-base/tests/base-knowledge-base.test.ts`
    - Test validation throws for empty name
    - Test validation throws for empty description
    - Test default numberOfResults is 5
    - Test getConfiguration returns correct structure
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 3. Implement BedrockKnowledgeBase concrete class
  - [x] 3.1 Create BedrockKnowledgeBase class
    - Create `use-cases/framework/agents/knowledge-base/bedrock-knowledge-base.ts`
    - Extend `BaseKnowledgeBase`
    - Add `knowledgeBaseId`, `knowledgeBaseArn` as public readonly
    - Store `guardrailConfig` as private
    - Implement `validateBedrockProps()` for knowledgeBaseId validation
    - Construct ARN from ID if not provided
    - Implement `generateIamPermissions()` for bedrock:Retrieve, bedrock:RetrieveAndGenerate
    - Add guardrail permissions if configured
    - Override `getConfiguration()` to include Bedrock-specific fields
    - Add comprehensive JSDoc comments
    - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4, 8.1, 8.2, 8.3, 14.1, 14.4, 14.5_

  - [x] 3.2 Add vector store configuration support
    - Add `VectorStoreConfiguration` interface with `type` (s3-vectors, opensearch, etc.)
    - Add optional `vectorStore` prop to `BedrockKnowledgeBaseProps`
    - Default to S3 Vectors when not specified
    - Add S3 Vectors specific configuration (bucket, prefix)
    - Generate appropriate IAM permissions for vector store access
    - _Requirements: 13.3, 13.4, 14.2_

  - [x] 3.3 Add KB creation support (optional)
    - Add `CreateKnowledgeBaseProps` interface for creating new KBs
    - Add optional `create` prop to `BedrockKnowledgeBaseProps`
    - When `create` is provided, create Bedrock KB with data source
    - Configure embedding model (default: Titan Embeddings V2)
    - Create S3 bucket for vectors if not provided
    - Expose created KB ARN for reference
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6_

  - [x] 3.4 Write unit tests for BedrockKnowledgeBase
    - Create `use-cases/framework/agents/knowledge-base/tests/bedrock-knowledge-base.test.ts`
    - Test validation throws for empty knowledgeBaseId
    - Test ARN construction from ID
    - Test ARN used when provided
    - Test IAM permissions include Retrieve and RetrieveAndGenerate
    - Test IAM permissions scoped to specific ARN
    - Test guardrail permissions added when configured
    - Test getConfiguration includes Bedrock-specific fields
    - Test vector store configuration defaults to S3 Vectors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.1, 8.2, 14.2_

  - [x] 3.5 Write CDK Nag tests for BedrockKnowledgeBase
    - Create `use-cases/framework/agents/knowledge-base/tests/bedrock-knowledge-base-nag.test.ts`
    - Test IAM policies follow least-privilege
    - Test no wildcard permissions
    - Test guardrail permissions scoped correctly
    - Test vector store permissions scoped correctly
    - _Requirements: 4.3_

- [x] 4. Checkpoint - Verify knowledge base constructs
  - Ensure all tests pass
  - Verify exports are correct
  - Ask the user if questions arise

- [x] 5. Implement retrieval tool
  - [x] 5.1 Create retrieval tool Python module
    - Create `use-cases/framework/agents/resources/knowledge-base-tool/retrieve.py`
    - Implement `retrieve_from_knowledge_base` function with @tool decorator
    - Accept `query`, `knowledge_base_id?`, `user_context?` parameters
    - Load KB config from `KNOWLEDGE_BASES_CONFIG` environment variable
    - Implement `_get_knowledge_bases()` helper to filter KBs
    - Implement `_retrieve_from_kb()` helper for Bedrock API call
    - Implement ACL filter injection when enabled and user context provided
    - Return structured response with success, results, metadata
    - Return structured error response on failure
    - Add comprehensive docstrings
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 12.1-12.8_

  - [x] 5.2 Implement ACL filtering logic
    - Add ACL filter to retrieval query when enabled
    - Use configured metadataField (default: 'group')
    - Return error when ACL enabled but no user context
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.3 Implement observability in retrieval tool
    - Add Lambda Powertools Logger integration
    - Log retrieval requests with query and target KB
    - Log retrieval responses with result count and latency
    - Add Lambda Powertools Metrics integration
    - Emit metrics for retrieval latency and result counts
    - Log errors with full context
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 5.4 Write unit tests for retrieval tool
    - Create `use-cases/framework/agents/resources/knowledge-base-tool/test_retrieve.py`
    - Test successful retrieval returns correct structure
    - Test multi-KB query aggregates results
    - Test specific KB query filters correctly
    - Test ACL filter applied when enabled
    - Test error when ACL enabled without user context
    - Test error response structure on failure
    - _Requirements: 5.4, 5.5, 5.6, 3.5, 3.6, 12.1-12.8_

- [x] 6. Integrate with BaseAgent
  - [x] 6.1 Update AgentDefinitionProps interface
    - Modify `use-cases/framework/agents/base-agent.ts`
    - Add optional `knowledgeBases?: IKnowledgeBase[]` property
    - Add optional `additionalPolicyStatementsForKnowledgeBases?: PolicyStatement[]` property
    - Add JSDoc comments
    - _Requirements: 2.1, 2.2, 4.5_

  - [x] 6.2 Update BaseAgent constructor
    - Generate IAM permissions from each knowledge base
    - Add permissions to agent role inline policies
    - Add additional KB policy statements if provided
    - Store knowledge base configurations for subclass access
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 6.3 Add knowledge base tool asset handling
    - Create Asset for retrieval tool if KBs configured
    - Add retrieval tool to agent tools location definitions
    - Grant read access to retrieval tool asset
    - _Requirements: 5.1, 5.7_

  - [x] 6.4 Write unit tests for BaseAgent KB integration
    - Update `use-cases/framework/agents/tests/base-agent.test.ts`
    - Test agent created without KBs (backward compatibility)
    - Test agent created with single KB
    - Test agent created with multiple KBs
    - Test IAM permissions generated correctly
    - Test additional KB policy statements added
    - _Requirements: 10.1, 10.2, 10.4, 4.1, 4.2, 4.5_

- [x] 7. Integrate with BatchAgent
  - [x] 7.1 Update BatchAgent environment variables
    - Modify `use-cases/framework/agents/batch-agent.ts`
    - Add `KNOWLEDGE_BASES_CONFIG` environment variable with JSON config
    - Ensure encryption with KMS key
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.2 Implement system prompt modification
    - Create helper function to append KB information to system prompt
    - Include retrieval tool description and usage instructions
    - List each KB with name and description
    - Preserve original system prompt content
    - Only modify if KBs are configured
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.5, 11.6_

  - [x] 7.3 Write unit tests for BatchAgent KB integration
    - Update `use-cases/framework/agents/tests/batch-agent.test.ts`
    - Test KNOWLEDGE_BASES_CONFIG env var set correctly
    - Test system prompt modified when KBs configured
    - Test system prompt unchanged when no KBs
    - Test multiple KBs listed in system prompt
    - _Requirements: 7.1, 7.2, 6.1, 6.5, 10.3_

- [x] 8. Checkpoint - Verify framework integration
  - Ensure all tests pass
  - Verify backward compatibility with existing agents
  - Ask the user if questions arise

- [x] 9. CDK Nag compliance
  - [x] 9.1 Write CDK Nag tests for agent with KBs
    - Create `use-cases/framework/agents/tests/agent-knowledge-base-nag.test.ts`
    - Test agent with single KB passes AWS Solutions checks
    - Test agent with multiple KBs passes AWS Solutions checks
    - Test agent with guardrails passes AWS Solutions checks
    - Document any necessary suppressions with justification
    - _Requirements: 4.3_

- [x] 10. Documentation and exports
  - [x] 10.1 Create README for knowledge base module
    - Create `use-cases/framework/agents/knowledge-base/README.md`
    - Document IKnowledgeBase interface
    - Document BaseKnowledgeBase abstract class
    - Document BedrockKnowledgeBase implementation
    - Include usage examples
    - Document ACL configuration
    - Document guardrails configuration
    - _Requirements: 1.1, 1.3, 1.4, 3.1, 8.1_

  - [x] 10.2 Update agent framework README
    - Update `use-cases/framework/agents/README.md`
    - Add section on knowledge base integration
    - Include example with KB configuration
    - Document retrieval tool usage
    - _Requirements: 5.1, 6.1_

  - [x] 10.3 Verify all exports
    - Ensure all public interfaces exported from `use-cases/index.ts`
    - Verify API.md generated correctly
    - _Requirements: 1.6_

- [x] 11. Final checkpoint
  - Ensure all tests pass
  - Run full test suite including CDK Nag
  - Verify documentation is complete
  - Ask the user if questions arise

## Notes

- All tests are required (not optional) for this construct work
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The implementation follows interface-first approach per design decisions
