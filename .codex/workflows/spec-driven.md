# Spec-Driven Workflow

Use this workflow for medium/large changes. Use a short kebab-case slug for each spec (e.g. `add-s3-export`, `rag-customer-support-example`).

## 1) Classify Work

- Construct/library work: `use-cases/**`
- Example application work: `examples/**`
- Other work: docs, tooling, CI, scripts

For construct/example work, read the matching canonical guide before drafting requirements:
- Construct: `.codex/guides/construct-development.md`
- Example: `.codex/guides/example-development.md`

## 2) Requirements, Design, and Tasks — Required Path for Medium/Large Work

For medium/large work, use **Decision-first** by default. The direct path is an exception-only path.

### Path A — Decision-first (default and required unless exception applies)

1. Create `.codex/specs/<slug>/_decisions-requirements.md` from `.codex/specs/templates/_decisions-requirements.md`. Add decision points with options and a recommended choice; leave **Answer** for the user.
2. Get user review and answers; confirm before proceeding.
3. Generate `.codex/specs/<slug>/requirements.md` from the template and the completed decisions.
4. Repeat for design: create `_decisions-design.md` → user answers → generate `design.md`.
5. Repeat for tasks: create `_decisions-tasks.md` → user answers → generate `tasks.md`.

Present decision steps as part of planning (“To align on what we’re building, here are a few decisions…”) rather than as a procedural requirement. Each phase (requirements, design, tasks) is independent; do not carry answers from one phase into the next unless the next phase explicitly references them.

### Path B — Direct (exception-only)

- Create `.codex/specs/<slug>/requirements.md` from `.codex/specs/templates/requirements.md`.
- Create `.codex/specs/<slug>/design.md` from `.codex/specs/templates/design.md`.
- Create `.codex/specs/<slug>/tasks.md` from `.codex/specs/templates/tasks.md`.

Use only when all conditions are true:
- User explicitly asks to skip decision files, or existing approved artifacts already contain clear requirements/design/tasks.
- Scope is straightforward and low-risk.
- The agent records the reason for skipping decisions in the handoff.

## 3) Phase Exit Checks (required)

Do not proceed to the next phase until all checks pass.

### Requirements Exit Check

- Requirements are tagged with stable IDs (`FR-*`, `NFR-*`, `TR-*` as applicable).
- Acceptance criteria are testable and use SHALL/WHEN/THE style.
- Validation mapping exists for every requirement ID.

### Design Exit Check

- Design references requirement IDs impacted by each major component/decision.
- API/data model changes and backward compatibility impacts are explicit.
- Security/IAM and observability/operations impacts are explicit.

### Tasks Exit Check

- Every implementation sub-task maps to one or more requirement IDs.
- Tasks include validation steps and expected commands.
- Task checkboxes are not marked complete until related tests/docs are updated.

## 4) Implement and Validate

- Implement in smallest safe increments.
- Run targeted tests first, then broader suites.
- Validate lint/type/test before handoff.
- Address CDK Nag findings or add justified suppressions.

Command policy:
- Use Projen-backed repository scripts (`npm run build`, `npm run eslint`, `npm test`, targeted `npm run test:*`).
- Do not replace repository scripts with ad hoc alternatives when scripted commands exist.

## 5) Handoff Notes

- Summarize changed files, behavior impact, and test evidence.
- Call out residual risks or follow-up work.
- If direct path was used, include the explicit exception reason.

## 6) Location and Authority Rules

- Create and update Codex specs only under `.codex/specs/<slug>/`.
- Do not create Codex spec artifacts under `.kiro/specs/**`.
- `.kiro/steering/**` is deep-dive reference only and does not override `.codex` rules.

## Deep Dive

- `.kiro/steering/aidlc-specdriven-core-workflow.md` (decision format and phase-specific guidance)
