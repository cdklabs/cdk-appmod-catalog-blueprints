---
name: cdk-blueprint-workflow
description: Use this skill when implementing or modifying AWS CDK constructs/examples in this repository, especially for spec-driven changes requiring requirements, design, tasks, test updates, and safe handoff.
---

# CDK Blueprint Workflow

## Purpose

Provide a concise, repeatable workflow for construct/example changes using `.codex` as canonical execution guidance and `.kiro` as deep-dive support. Supports decision-first (user alignment) or direct spec authoring.

## When to Use

- User asks for feature work in `use-cases/` or `examples/`.
- User asks for architecture-aligned changes with tests/docs.
- Work is too large for a one-shot patch.

## Execution Flow

1. **Classify work:**
   - construct (`use-cases/**`)
   - example (`examples/**`)
   - other (docs/tooling)

2. **Read canonical instructions in this order:**
   - `.codex/AGENTS.md`
   - `.codex/scope/use-cases.md` if construct work, or `.codex/scope/examples.md` if example work
   - `.codex/context/project-overview.md`
   - `.codex/guides/construct-vs-example.md`
   - `.codex/workflows/spec-driven.md`

3. **Read task-specific canonical guides:**
   - `.codex/guides/coding-standards.md`
   - construct work: `.codex/guides/construct-development.md`, `.codex/guides/testing.md`
   - example work: `.codex/guides/example-development.md`, `.codex/guides/deployment-operations.md`
   - document-processing/agents work: `.codex/guides/document-processing-and-agents.md`

4. **Pull deep-dive context** from `.kiro/steering/**` only where needed for complex architecture/troubleshooting/pattern tradeoffs.

5. **For medium/large work, use spec workflow (see `.codex/workflows/spec-driven.md`):**
   - **Decision-first (default/required):** Create `_decisions-requirements.md`, get user answers, generate `requirements.md`; repeat for design and tasks. Use templates under `.codex/specs/templates/`.
   - **Direct (exception-only):** Create `requirements.md`, `design.md`, `tasks.md` from templates under `.codex/specs/<slug>/` only when direct-path exception criteria are satisfied and recorded in handoff.

6. **Implement** in smallest safe increments.

7. **Validate:**
   - `npm run build`
   - `npm run eslint`
   - targeted tests for touched area
   - broader tests when risk is cross-cutting

8. **Handoff:** changed files, behavior impact, test evidence, residual risks.

## Guardrails

- Preserve backward compatibility unless explicitly requested otherwise.
- Avoid unrelated refactors.
- Keep IAM permissions minimal and explicit.
- Preserve security defaults and observability behavior.
- Address CDK Nag findings or document suppressions.
- Use Projen-backed repository scripts for build/lint/test workflows.
- Keep Codex specs under `.codex/specs/**` only; never under `.kiro/specs/**`.
- Treat `.kiro/steering/**` as deep-dive support, not canonical authority.
