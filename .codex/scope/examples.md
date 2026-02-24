# Codex Examples Scope

This file applies to `examples/**`. It overrides or extends the root working agreement where needed. Canonical source: `.codex/**`; deep-dive: `.kiro/steering/**`.

## Intent

- `examples/**` is deployable application composition work.
- Compose existing constructs; do not implement reusable construct architecture here.

## Canonical Instructions

Follow these first:
- `.codex/guides/example-development.md`
- `.codex/guides/deployment-operations.md`
- `.codex/guides/coding-standards.md`

Deep dives for additional detail:
- `.kiro/steering/example-development-guide.md`
- `.kiro/steering/deployment-operations.md`

## Example Guardrails

- Keep deployment, invocation, monitoring, troubleshooting, and cleanup commands runnable.
- Avoid hardcoding account/region values.
- Provide outputs/scripts needed for verification.
- Keep README instructions accurate and copy/paste-friendly.

## Validation Minimum

- `npm run build`
- `npm run eslint`
- Targeted tests for touched logic
- Deploy/synth checks when deployment paths are changed

## Spec Rigor

- Medium/large changes require `.codex/specs/<slug>/requirements.md`, `design.md`, and `tasks.md` (optionally after decision files for alignment).
- Handoff must include deployment verification notes and cleanup guidance.
