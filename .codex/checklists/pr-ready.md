# PR Ready Checklist

- Work type was identified first (construct/example/other).
- Relevant `.codex/guides/*` references were followed.
- Scope is limited to task intent; no unrelated refactors.
- Public API changes are documented and justified.
- Security defaults preserved (encryption, least privilege IAM).
- IAM changes are least privilege and resource-scoped.
- Error handling/logging added where behavior changed.
- Tests added/updated for changed behavior.
- CDK Nag findings are fixed or suppression rationale is documented.
- `npm run eslint` passes.
- Relevant test suite passes (`npm test` or targeted suites).
- Example/docs updates included when user-facing behavior changed.
- Handoff summary includes risks and follow-ups.
