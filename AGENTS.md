# Codex Working Agreement

This file is the primary instruction source for Codex in this repository.

## Scope

- Applies to the entire repository unless a deeper `AGENTS.md` overrides it.
- Prefer repository-local guidance in `.codex/` over external assumptions.

## Mandatory First Step

Classify work before editing:
- Construct/library work: `use-cases/**`
- Example/application composition: `examples/**`
- Other: docs, tooling, CI, scripts

Then read:
- `.codex/context/project-overview.md`
- `.codex/guides/construct-vs-example.md`
- `.codex/workflows/spec-driven.md`

Path-specific references:
- `use-cases/**`: `.codex/guides/construct-development.md`, `.codex/guides/testing.md`
- `examples/**`: `.codex/guides/example-development.md`, `.codex/guides/deployment-operations.md`
- `**/document-processing/**` or `**/agents/**`: `.codex/guides/document-processing-and-agents.md`
- Any code change: `.codex/guides/coding-standards.md`

## Core Workflow

For non-trivial changes:
1. Define requirements and acceptance criteria.
2. Document design choices and integration impacts.
3. Break implementation into verifiable tasks.
4. Implement smallest safe increments.
5. Validate and hand off with evidence.

## Build and Test Expectations

- Install deps: `npm install`
- Lint: `npm run eslint`
- Full tests when appropriate: `npm test`
- Prefer targeted tests first:
- `npm run test:document-processing:unit`
- `npm run test:cdk-nag:all`

## Change Boundaries

- Do not refactor unrelated modules in the same change.
- Preserve public APIs unless explicitly requested.
- Keep security defaults intact (least privilege IAM, encryption by default).
- Do not ignore CDK Nag findings; fix or document suppression rationale.

## Quality Gate

Before handoff, run `.codex/checklists/pr-ready.md`.

## Skill Trigger

Use local project skill when applicable:
- `.codex/skills/cdk-blueprint-workflow/SKILL.md`
