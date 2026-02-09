# Spec-Driven Workflow

Use this workflow for medium/large changes.

## 1) Classify Work

- Construct/library work: `use-cases/**`
- Example application work: `examples/**`
- Other work: docs, tooling, CI, scripts

For construct/example work, read the matching guide before drafting requirements:
- Construct: `.codex/guides/construct-development.md`
- Example: `.codex/guides/example-development.md`

## 2) Define Requirements

- List user-facing outcomes and constraints.
- Capture acceptance criteria that can be tested.
- Include non-functional requirements when relevant:
- security
- observability
- backward compatibility

For construct work, explicitly decide:
- abstraction level and extension points
- props/API compatibility strategy
- required test scope (unit + CDK Nag + optional integration/property tests)

For example work, explicitly decide:
- what existing constructs are composed
- sample files and helper script needs
- README coverage for deploy/use/monitor/troubleshoot/cleanup

## 3) Design

- Describe architecture and integration points.
- Identify interfaces/props changes and migration impacts.
- Note IAM/data/security implications explicitly.
- For framework work, document where logic lives:
- TypeScript construct layer
- Python runtime/tool layer

## 4) Task Breakdown

- Break work into small verifiable tasks.
- Mark tasks as complete only after tests/docs are updated.

## 5) Implement and Validate

- Implement in smallest safe increments.
- Run targeted tests first, then broader suite.
- Validate lint/type/test before handoff.
- Address CDK Nag findings or add justified suppressions.

## 6) Handoff Notes

- Summarize changed files, behavior impact, and test evidence.
- Call out any residual risks or follow-up work.
