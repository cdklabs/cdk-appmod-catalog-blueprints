# Document Processing and Agents Guide

Use for work under `**/document-processing/**` or `**/agents/**`.

## Document Processing Layers

- `BaseDocumentProcessing`: shared workflow/infrastructure abstractions.
- `BedrockDocumentProcessing`: Bedrock model-driven implementation.
- `AgenticDocumentProcessing`: agent-powered specialization with tools/prompts.

Choose lowest layer that satisfies the requirement. Do not jump to agentic layer unless tool-based reasoning is needed.

## Agent Framework Layers

- `BaseAgent`: infrastructure foundation and shared permissions/config.
- `BatchAgent`: ready-to-use batch-oriented agent execution.

Use `BaseAgent` only when building a new agent type. Use `BatchAgent` for standard document/data batch tasks.

## Tooling Rules

- Keep Python tools single-purpose and clearly described.
- Load tool assets explicitly and include only required IAM permissions.
- Keep tool dependencies isolated in layers/requirements.
- Ensure tool errors are structured and observable.

## Prompt and Runtime Rules

- System prompts should define role, available tools, process, and output format.
- Keep prompts deterministic enough for production behavior, not only demos.
- Ensure expected input/output payload shapes are documented and tested.

## Cross-Cutting Features

- Observability should be opt-in and consistent (logs, metrics, traces).
- EventBridge integration should be optional and explicit.
- Security defaults remain on: encryption and least privilege.

