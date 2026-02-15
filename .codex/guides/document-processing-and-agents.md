# Document Processing and Agents Guide

Use for work under `**/document-processing/**` or `**/agents/**`.

## Layering Rules

- Choose the lowest document-processing layer that satisfies requirements.
- Use `BaseAgent` when creating a new agent type; use higher-level agent constructs for standard flows.
- Keep observability and event integrations opt-in and explicit.

## Tooling and Prompt Rules

- Keep Python tools single-purpose with clear contracts.
- Load tool assets explicitly and grant minimum IAM permissions.
- Define prompt role, tools, process, and output format.
- Keep expected input/output payload shapes documented and tested.

## Security and Reliability

- Keep encryption defaults intact.
- Keep IAM least privilege and resource-scoped.
- Ensure failures are structured and observable.

## Deep Dive

- `.kiro/steering/document-processing-guide.md`
- `.kiro/steering/agentic-framework-guide.md`
