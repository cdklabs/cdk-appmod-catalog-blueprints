# Agent instructions

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:46cd31e7 -->
## Beads Issue Tracker (scoped — quinn-suite contract)

This project uses **bd (beads)** as the execution-task work graph ONLY, under the
scoped contract in quinn-suite `references/beads-guidance.md`
(`$QUINN_SUITE_ROOT/references/beads-guidance.md`, ADR 008). The stock beads workflow rules are deliberately NOT installed here:

- Task/PRD/plan tracking stays in `plans/` markdown (authored source of truth).
- Memories stay in auto-memory `MEMORY.md` — do not use `bd remember` for them.
- Do NOT run `bd prime` or `bd setup` — their injected rules conflict with the
  quinn-suite conventions. Use only the allowed, read-only and forbidden verb
  sets in beads-guidance.md (the SessionStart hook prints the same contract).

(These marker comments are kept so `bd` tooling treats the integration as present
and does not re-inject its stock template. Guarded by `beads_onboard.py --check`.)
<!-- END BEADS INTEGRATION -->
