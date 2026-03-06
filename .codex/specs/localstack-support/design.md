# Design: LocalStack Integration Option

## Summary

This design introduces LocalStack support as an additive integration layer:

1. Shared LocalStack config + env utility in framework layer.
2. New subclass-based LocalStack variants for agent and document-processing constructs.
3. Runtime endpoint resolution in Python handlers through environment variables.
4. Optional custom Bedrock model ID support for LocalStack Bedrock/Ollama model naming.

No existing construct is replaced.

## Work Classification

- Construct/library work: `use-cases/**`
- Docs/spec work: `.codex/specs/**`

## Architecture

### 1) Shared LocalStack config utility

Create a small framework module:
- `LocalStackIntegrationConfig` interface
- `LocalStackIntegrationUtils` helper

Responsibilities:
- Normalize endpoint configuration.
- Emit Lambda env variables used by Python runtime clients.

### 2) Agent path

Add `LocalStackBatchAgent extends BatchAgent`.

Flow:
1. Call `super(...)` to preserve current setup.
2. Add LocalStack endpoint environment variables to `agentFunction`.

This keeps existing `BatchAgent` internals and behavior untouched.

### 3) Bedrock document-processing path

Add `LocalStackBedrockDocumentProcessing extends BedrockDocumentProcessing`.

Flow:
1. Call `super(...)` to create existing workflow/resources.
2. Traverse child Lambdas under the construct and apply LocalStack endpoint env vars.

Rationale:
- Avoid replacing workflow logic.
- Reuse all existing BedrockDocumentProcessing behavior.

### 4) Agentic document-processing path

Add `LocalStackAgenticDocumentProcessing extends AgenticDocumentProcessing`.

Flow:
1. Call `super(...)` for baseline workflow/resource creation.
2. Apply LocalStack env vars to child Lambdas (same approach as LocalStack bedrock variant).
3. Override `processingStep()` to instantiate `LocalStackBatchAgent` instead of `BatchAgent`.
4. Preserve adapter IAM policy attachment behavior from parent implementation.

Rationale:
- Keeps inheritance model (`Base -> Bedrock -> Agentic -> LocalStackAgentic`).
- Avoids modifying existing `AgenticDocumentProcessing` logic paths.

### 5) Runtime endpoint support

Python handlers currently instantiate boto3 clients with default endpoints. Add helper-based endpoint resolution:
- Prefer service-specific env var when present.
- Fallback to global endpoint env var.
- Otherwise use default boto3 behavior.

Files:
- `use-cases/document-processing/resources/default-bedrock-invoke/index.py`
- `use-cases/document-processing/resources/default-sqs-consumer/index.py`
- `use-cases/document-processing/resources/pdf-chunking/handler.py`
- `use-cases/document-processing/resources/cleanup/handler.py`
- `use-cases/framework/agents/resources/default-strands-agent/batch.py`
- `use-cases/framework/agents/resources/default-strands-agent/utils.py`

### 6) Bedrock model custom ID

Extend `BedrockModelProps` with `customModelId?: string`.

Behavior:
- If `customModelId` is set, use it as final model ID.
- Otherwise keep existing model derivation behavior.

This enables LocalStack Bedrock/Ollama model IDs while preserving current AWS defaults.

## API Additions

1. `LocalStackIntegrationConfig`
2. `LocalStackIntegrationUtils`
3. `LocalStackBatchAgent`
4. `LocalStackBedrockDocumentProcessing`
5. `LocalStackAgenticDocumentProcessing`
6. `BedrockModelProps.customModelId` (optional)

## Security and IAM Considerations

1. No broadening of IAM permissions in this design.
2. Existing least-privilege role composition is preserved.
3. Endpoint routing is runtime-config only; does not alter IAM boundaries.

## Backward Compatibility

1. Existing classes stay unchanged and remain default path.
2. Existing props continue to work with no migration.
3. New behavior is opt-in via new LocalStack subclasses/config.

## Testing Plan

1. Add TypeScript tests for LocalStack subclass env injection.
2. Add TypeScript test for `customModelId` model resolution in synthesized templates.
3. Run targeted suites for touched modules.

## Risks and Mitigations

1. Risk: Lambda environment injection misses future child Lambdas.
Mitigation: Apply env by traversing all child `Function` constructs in LocalStack subclasses.

2. Risk: Endpoint env naming inconsistency across SDKs.
Mitigation: Emit both global endpoint and service-specific endpoint env vars; runtime helper resolves service-specific first.

3. Risk: Agentic override diverges from parent processing behavior.
Mitigation: Keep override minimal and mirror parent logic for IAM policy attachment and result shape.
