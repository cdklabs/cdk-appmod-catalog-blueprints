# Codex Use-Cases Scope

This file applies to `use-cases/**`. It overrides or extends the root working agreement where needed. Canonical source: `.codex/**`; deep-dive: `.kiro/steering/**`.

## Intent

- `use-cases/**` is reusable construct/library work.
- Optimize for stable public APIs, extension points, and security by default.

## Canonical Instructions

Follow these first:
- `.codex/guides/construct-development.md`
- `.codex/guides/testing.md`
- `.codex/guides/coding-standards.md`
- `.codex/guides/document-processing-and-agents.md` for `**/document-processing/**` or `**/agents/**`

Deep dives for additional detail:
- `.kiro/steering/construct-development-guide.md`
- `.kiro/steering/testing-guide.md`
- `.kiro/steering/document-processing-guide.md`
- `.kiro/steering/agentic-framework-guide.md`

## Construct Guardrails

- Preserve backward compatibility unless explicitly requested.
- Keep IAM permissions least-privilege and resource-scoped.
- Preserve encryption and security defaults.
- Expose only necessary public readonly resources.
- Avoid unrelated refactors.

## Validation Minimum

- `npm run build`
- `npm run eslint`
- Targeted tests for touched behavior
- `npm run test:cdk-nag:all` when construct/stacks or security posture are changed

## Spec Rigor

- Medium/large changes require `.codex/specs/<slug>/requirements.md`, `design.md`, and `tasks.md` (optionally after decision files for alignment).
- Include test evidence and residual risks in handoff.
