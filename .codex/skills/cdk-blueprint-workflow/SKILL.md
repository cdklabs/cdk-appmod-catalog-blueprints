---
name: cdk-blueprint-workflow
description: Use this skill when implementing or modifying AWS CDK constructs/examples in this repository, especially for spec-driven changes requiring requirements, design, tasks, test updates, and safe handoff.
---

# CDK Blueprint Workflow

## When to Use

- User asks for feature work in `use-cases/` or `examples/`.
- User asks for architecture-aligned changes with tests and docs.
- Work is too large for a one-shot patch.

## Execution Flow

1. Classify work:
- construct (`use-cases/**`)
- example (`examples/**`)
- other (docs/tooling)
2. Read repository guidance in this order:
- `AGENTS.md`
- `.codex/context/project-overview.md`
- `.codex/workflows/spec-driven.md`
3. Read task-specific guide(s):
- `.codex/guides/coding-standards.md`
- construct work: `.codex/guides/construct-development.md` and `.codex/guides/testing.md`
- example work: `.codex/guides/example-development.md` and `.codex/guides/deployment-operations.md`
- document-processing/agents work: `.codex/guides/document-processing-and-agents.md`
4. Produce concise requirements, design, and task plan (internal working notes).
5. Implement smallest safe increments.
6. Validate:
- `npm run eslint`
- targeted tests for touched area
- broader tests when risk is cross-cutting
7. Handoff:
- changed files
- behavior impact
- test evidence
- residual risks

## Guardrails

- Preserve backward compatibility unless explicitly requested otherwise.
- Avoid unrelated refactors.
- Keep IAM permissions minimal and explicit.
- Preserve observability and security defaults.
- Address CDK Nag findings or document suppressions.
