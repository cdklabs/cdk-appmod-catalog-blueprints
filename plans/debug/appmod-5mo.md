# Debug: appmod-5mo — scheduled upgrade startup_failure at cf97460

## Symptom
`upgrade` and `upgrade-dev-deps` scheduled runs (2026-11-09) end `startup_failure`; no jobs start.
`pull-request-lint` (pull_request_target) has ended `startup_failure` on every PR since 2026-11-05 15:11Z
(last success 2026-11-05 06:28Z).

## Evidence
- Run page 42670757683: "The action peter-evans/create-pull-request@c5a7806660adbe173f04e3e038b0ccdcd758773c
  is not allowed in cdklabs/cdk-appmod-catalog-blueprints because all actions must be from a repository owned
  by your enterprise, created by GitHub, or verified in the GitHub Marketplace."
- Run page 42333212594 (pull-request-lint): "The action amannn/action-semantic-pull-request@v6 is not allowed" —
  a plain tag, never SHA-pinned.
- `gh api repos/cdklabs/cdk-appmod-catalog-blueprints/actions/permissions`: allowed_actions=selected,
  sha_pinning_required=false; selected-actions: github_owned_allowed=true, verified_allowed=true, patterns_allowed=[].
- Neither peter-evans/create-pull-request nor amannn/action-semantic-pull-request has a verified-creator badge
  on the Marketplace.
- Pinned SHA c5a7806 is exactly what tag v6 resolves to, so the ref itself is valid.

## Eliminated
- H1: the SHA pin from 9449543 (#293) is the cause. Disproved: amannn/action-semantic-pull-request@v6 (unpinned)
  fails with the same policy error, and the pinned SHA is valid. Under the current policy, @v6 would be refused too.

## Current Focus
- H2 (supported): the repo/org Actions allow-list was narrowed between 2026-11-05 06:28Z and 15:11Z to GitHub-owned +
  verified creators with no patterns. That blocks both third-party actions. We get a 403 on the org-level policy.

## Resolution
This can't be fixed in code unless the allow-list is widened (add patterns
`peter-evans/create-pull-request@*`, `amannn/action-semantic-pull-request@*`) or projen's generated
upgrade/lint workflows are replaced. Widening the allow-list is Quinn's decision, so it's filed as a decision bead.
