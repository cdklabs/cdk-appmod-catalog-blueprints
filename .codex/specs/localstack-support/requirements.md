# Requirements: LocalStack Integration Option

## Overview

Add an **optional LocalStack integration path** for agent/document-processing constructs without replacing or breaking existing AWS-first constructs.

The implementation must:
- preserve current behavior by default
- follow OOP extension patterns (subclassing and reusable base configuration)
- support LocalStack endpoint routing for Lambda runtime AWS SDK calls
- allow local Bedrock model IDs (for LocalStack Bedrock + Ollama-backed models)

## Goals

1. Provide additive classes that users can choose when targeting LocalStack.
2. Keep existing classes and APIs backward compatible.
3. Make runtime endpoint behavior configurable through typed props.
4. Ensure document processing and agent flows both support LocalStack mode.

## Non-Goals

1. Replacing existing `BedrockDocumentProcessing`, `AgenticDocumentProcessing`, or `BatchAgent`.
2. Refactoring unrelated modules.
3. Enforcing LocalStack behavior in existing AWS paths.

## Functional Requirements

### FR-1: LocalStack Configuration Model

The framework SHALL provide a shared LocalStack configuration type for endpoint routing.

Acceptance Criteria:
1. A typed config supports enable/disable semantics and endpoint override(s).
2. A reusable utility produces Lambda environment variables from this config.
3. Existing constructs are unchanged when LocalStack config is not used.

### FR-2: Additive Agent Integration

The framework SHALL provide an additive LocalStack agent class using inheritance.

Acceptance Criteria:
1. A `LocalStackBatchAgent` class extends `BatchAgent`.
2. The subclass injects LocalStack endpoint environment variables into the agent Lambda.
3. Existing `BatchAgent` behavior is unchanged.

### FR-3: Additive Document Processing Integration (Bedrock)

The framework SHALL provide an additive LocalStack Bedrock document-processing class using inheritance.

Acceptance Criteria:
1. A `LocalStackBedrockDocumentProcessing` class extends `BedrockDocumentProcessing`.
2. The subclass applies LocalStack endpoint environment variables to Lambdas created under the construct.
3. Existing `BedrockDocumentProcessing` behavior is unchanged.

### FR-4: Additive Document Processing Integration (Agentic)

The framework SHALL provide an additive LocalStack agentic document-processing class using inheritance.

Acceptance Criteria:
1. A `LocalStackAgenticDocumentProcessing` class extends `AgenticDocumentProcessing`.
2. The subclass uses `LocalStackBatchAgent` for processing step creation.
3. Adapter IAM policy behavior remains equivalent to existing `AgenticDocumentProcessing`.

### FR-5: Runtime Endpoint Support in Python Handlers

Python Lambda runtimes used by the affected constructs SHALL support endpoint override via environment variables.

Acceptance Criteria:
1. Bedrock invoke runtime supports endpoint override for Bedrock Runtime and S3 clients.
2. SQS consumer runtime supports endpoint override for Step Functions client.
3. Chunking and cleanup runtimes support endpoint override for S3 client.
4. Strands batch agent runtime/tool loader supports endpoint override for S3 client.
5. If no endpoint env var is set, behavior is unchanged.

### FR-6: Local Model ID Compatibility

Bedrock model configuration SHALL support a direct custom model ID for LocalStack Bedrock/Ollama usage.

Acceptance Criteria:
1. `BedrockModelProps` includes an optional custom model-id field.
2. Model ID derivation uses this custom value when provided.
3. Existing model-ID derivation remains unchanged when custom model ID is not set.

### FR-7: Exports and Discoverability

New integration classes/types SHALL be exported through existing module entrypoints.

Acceptance Criteria:
1. New classes/types are exported from relevant `index.ts` modules.
2. Existing exports remain intact.

### FR-8: Tests

Targeted tests SHALL validate LocalStack integration behavior.

Acceptance Criteria:
1. Unit tests verify LocalStack environment variables on LocalStack subclasses.
2. Unit tests verify `customModelId` behavior.
3. Existing test scope continues to pass for touched areas.

## Non-Functional Requirements

### NFR-1: Backward Compatibility

All existing public APIs must continue to work unchanged.

### NFR-2: Security Defaults

No security defaults are weakened; encryption and IAM patterns remain consistent with existing constructs.

### NFR-3: OOP Design

Implementation must use extension (subclassing/composition) rather than replacing existing class logic.

### NFR-4: Documentation Readability

Specs and code should clearly separate AWS-default and LocalStack integration paths.
