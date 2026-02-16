# Tasks: LocalStack Integration Option

## Phase 1: Spec and baseline

- [x] 1. Create spec-driven artifacts
  - [x] 1.1 Write requirements in `.codex/specs/localstack-support/requirements.md`
  - [x] 1.2 Write design in `.codex/specs/localstack-support/design.md`
  - [x] 1.3 Write implementation tasks in `.codex/specs/localstack-support/tasks.md`

## Phase 2: Shared LocalStack framework module

- [x] 2. Add LocalStack config and env utility
  - [x] 2.1 Add `use-cases/framework/localstack/localstack-config.ts`
  - [x] 2.2 Add `use-cases/framework/localstack/index.ts`
  - [x] 2.3 Export localstack module from `use-cases/framework/index.ts`

## Phase 3: Agent integration (OOP extension)

- [x] 3. Add additive LocalStack agent class
  - [x] 3.1 Add `use-cases/framework/agents/localstack-batch-agent.ts` extending `BatchAgent`
  - [x] 3.2 Export it from `use-cases/framework/agents/index.ts`

## Phase 4: Document-processing integration (OOP extension)

- [x] 4. Add additive LocalStack Bedrock construct
  - [x] 4.1 Add `use-cases/document-processing/localstack-bedrock-document-processing.ts` extending `BedrockDocumentProcessing`
  - [x] 4.2 Ensure LocalStack env variables apply to child Lambdas

- [x] 5. Add additive LocalStack Agentic construct
  - [x] 5.1 Add `use-cases/document-processing/localstack-agentic-document-processing.ts` extending `AgenticDocumentProcessing`
  - [x] 5.2 Override `processingStep()` to use `LocalStackBatchAgent`
  - [x] 5.3 Preserve adapter IAM policy attachment behavior

- [x] 6. Export LocalStack document-processing constructs
  - [x] 6.1 Update `use-cases/document-processing/index.ts`

## Phase 5: Model ID and runtime endpoint compatibility

- [x] 7. Add custom Bedrock model ID support
  - [x] 7.1 Extend `BedrockModelProps` with `customModelId`
  - [x] 7.2 Update `BedrockModelUtils` derivation logic

- [x] 8. Add Python runtime endpoint resolution support
  - [x] 8.1 Update `default-bedrock-invoke/index.py`
  - [x] 8.2 Update `default-sqs-consumer/index.py`
  - [x] 8.3 Update `pdf-chunking/handler.py`
  - [x] 8.4 Update `cleanup/handler.py`
  - [x] 8.5 Update `framework/agents/resources/default-strands-agent/batch.py`
  - [x] 8.6 Update `framework/agents/resources/default-strands-agent/utils.py`

## Phase 6: Tests and validation

- [x] 9. Add targeted TypeScript tests
  - [x] 9.1 Add `use-cases/framework/tests/localstack-batch-agent.test.ts`
  - [x] 9.2 Add `use-cases/document-processing/tests/localstack-document-processing.test.ts`
  - [x] 9.3 Add `use-cases/document-processing/tests/localstack-agentic-document-processing.test.ts`

- [x] 10. Run checks
  - [x] 10.1 Run targeted tests for touched files
  - [x] 10.2 Run eslint
  - [x] 10.3 Address any failures
