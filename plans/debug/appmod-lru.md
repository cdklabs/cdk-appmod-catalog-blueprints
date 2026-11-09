# appmod-lru: scheduled upgrade-dev-deps startup_failure at cf97460

## Current Focus

Hypothesis (confirmed by evidence, fix not code-side): the repository Actions policy
restricts runs to GitHub-owned + verified-creator actions, so every workflow that
references a third-party action is rejected at startup (no jobs created).

Evidence:
- `gh api repos/cdklabs/cdk-appmod-catalog-blueprints/actions/permissions` ->
  `allowed_actions: selected`; `.../selected-actions` ->
  `github_owned_allowed: true, verified_allowed: true, patterns_allowed: []`.
- startup_failure (0 jobs) on 2026-11-09: upgrade, upgrade-dev-deps, upgrade-main
  (all use peter-evans/create-pull-request).
- pull-request-lint (amannn/action-semantic-pull-request) startup_failure on every run
  since 2026-11-05T15:11Z; last success 2026-11-05T06:28Z; workflow file unchanged since
  ce55b1e (2026-08-18). So the trigger is external (policy change), not a commit.
- build, dependency-review, python-tests, release, CodeQL (actions/* only) succeed.

## Eliminated

- SHA pin from #293 (appmod-e1g) is bad: c5a7806660adbe173f04e3e038b0ccdcd758773c
  is the commit the v6 tag points at (`gh api .../git/ref/tags/v6`). Also
  upgrade-main uses unpinned @v8 and fails the same way.
- A commit in ce55b1e...cf97460 broke the workflow YAML: pull-request-lint, never
  touched in the window, began failing on 2026-11-05 with no change of its own.

## Resolution

Not code-fixable minimally: the projen-generated upgrade workflows require
peter-evans/create-pull-request. Unblock = repo admin adds
`peter-evans/create-pull-request@*, amannn/action-semantic-pull-request@*` to the
allowed-actions patterns (or reverts allowed_actions to `all`). That is a
security-policy decision for fabecode; filed as a decision bead.
