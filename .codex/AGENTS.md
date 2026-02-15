# Codex Working Agreement

Primary instruction source for Codex. If other files reference Codex instructions, they should link to this file.

## Scope

- Applies to the whole repo. Path-specific: **use-cases/** → `scope/use-cases.md`; **examples/** → `scope/examples.md`. Follow the most specific.

## Instruction Model

- **Canonical:** `.codex/**`. **Deep-dive:** `.kiro/steering/**`. If they differ, follow `.codex`. File map: `README.md`.

## Specs

- All Codex spec artifacts under `.codex/specs/<slug>/` only (kebab-case slug). Never under `.kiro/specs/**`.

## Mandatory First Step

1. **Classify:** construct (`use-cases/**`), example (`examples/**`), or other (docs, tooling, CI).
2. **Read:** `context/project-overview.md`, `guides/construct-vs-example.md`, `workflows/spec-driven.md`.
3. **Path-specific:** use-cases → `scope/use-cases.md` + `guides/construct-development.md`, `guides/testing.md`; examples → `scope/examples.md` + `guides/example-development.md`, `guides/deployment-operations.md`; paths under `document-processing/` or `agents/` → `guides/document-processing-and-agents.md`. Any code change → `guides/coding-standards.md`.

## Deep-Dive Triggers

Read `.kiro/steering/*` when: non-trivial or multi-layer architecture; unclear tradeoffs; inheritance/framework internals; test/deploy troubleshooting; handoff examples.

## Core Workflow (non-trivial changes)

1. Requirements and acceptance criteria (decision files first for medium/large work unless direct-path exception criteria are met — see `workflows/spec-driven.md`).
2. Design and integration impacts.
3. Verifiable tasks.
4. Smallest safe increments; validate and hand off with evidence.

**Spec rigor:** Small change → notes in handoff. Medium/large → persisted specs under `.codex/specs/<slug>/` with decision-first workflow by default, required phase exit checks, and explicit exception rationale when direct path is used. Mark tasks complete only after tests/docs updated.

## Build and Test

- `npm install`, `npm run build`, `npm run eslint`, `npm test`; targeted: `npm run test:document-processing:unit`, `npm run test:cdk-nag:all`.
- Use Projen-backed scripts only; no ad hoc `tsc`/Jest. After `.projenrc.ts` changes: `npx projen`.

## Change Boundaries

- No unrelated refactors. Preserve public APIs unless asked. Security defaults and least-privilege IAM. Fix or document CDK Nag suppressions.

## Quality Gate

Before handoff: `checklists/pr-ready.md`. For spec-driven work: `skills/cdk-blueprint-workflow/SKILL.md`.
