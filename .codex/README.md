# Codex

Canonical execution layer for Codex. **Start at `.codex/AGENTS.md`.** Deep-dive: `.kiro/steering/**`.

## Scope

- **use-cases/** → `scope/use-cases.md`
- **examples/** → `scope/examples.md`

## File Map

| Topic | File |
|-------|------|
| Working agreement & entrypoint | `AGENTS.md` |
| Project map, baseline | `context/project-overview.md` |
| Work type (construct vs example) | `guides/construct-vs-example.md` |
| Spec workflow (incl. decision-first) | `workflows/spec-driven.md` |
| Construct rules | `guides/construct-development.md` |
| Example rules | `guides/example-development.md` |
| Document processing / agents | `guides/document-processing-and-agents.md` |
| Testing | `guides/testing.md` |
| Deployment | `guides/deployment-operations.md` |
| Coding / security | `guides/coding-standards.md` |
| Pre-handoff gate | `checklists/pr-ready.md` |
| Spec-driven skill | `skills/cdk-blueprint-workflow/SKILL.md` |
| Spec templates | `specs/templates/` (requirements, design, tasks, _decisions-*) |

## Deep-Dive (.kiro/steering)

- `repository-overview.md`, `aidlc-specdriven-core-workflow.md`, `construct-development-guide.md`, `example-development-guide.md`, `document-processing-guide.md`, `agentic-framework-guide.md`, `testing-guide.md`, `deployment-operations.md`, `coding-standards.md`

## Usage

If other files reference Codex instructions, they should link to `.codex/AGENTS.md` and the applicable scope file. Keep `.codex` concise; long rationale stays in `.kiro`
