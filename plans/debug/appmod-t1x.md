# appmod-t1x: scheduled upgrade-main startup_failure at d463319

## Current Focus
Hypothesis (confirmed by evidence below): the repository's GitHub Actions policy was switched to
"selected" actions (GitHub-owned + verified creators only, no patterns), which rejects the
third-party actions `peter-evans/create-pull-request` and `amannn/action-semantic-pull-request`
at workflow startup. Not a code regression.

Evidence:
- `gh api repos/cdklabs/cdk-appmod-catalog-blueprints/actions/permissions` ->
  `allowed_actions: selected`; `.../selected-actions` -> `github_owned_allowed: true,
  verified_allowed: true, patterns_allowed: []`.
- `.github/workflows/upgrade-main.yml` last changed in ce55b1e, the commit of the last green run
  (2026-11-02). The same file failed 2026-11-09 and 2026-11-16 with startup_failure, jobs total_count 0.
- Since 2026-11-11 every startup_failure is a workflow using a non-GitHub action: upgrade,
  upgrade-dev-deps, upgrade-main (peter-evans/create-pull-request), pull-request-lint
  (amannn/action-semantic-pull-request). build, release, python-tests, dependency-review
  (GitHub-owned actions only) stay green.
- Org-level policy not readable (403, needs org admin), so whether it is inherited from cdklabs
  or set on the repo is unknown.

## Eliminated
- Code change in ce55b1e...d463319: the diff does not touch upgrade-main.yml or pull-request-lint.yml.

## Resolution
No repo code fix applies: the cause is a settings change. The fix is an allowlist entry
(`peter-evans/create-pull-request@*`, `amannn/action-semantic-pull-request@*`) at repo or
cdklabs org level, or rewriting projen's generated workflows to drop those actions. Widening the
Actions policy is Quinn's call, so it is filed as a decision bead.
