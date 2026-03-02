---
phase: 01-agent-infrastructure-script-generation
plan: 02
subsystem: agent-resources
tags: [python, prompts, tools, bedrock]

# Dependency graph
requires:
  - 01-01
provides:
  - InteractiveAgent conversation behavior (DataSynth persona)
  - BatchAgent script generation template enforcement
  - generate_script tool with input sanitization
affects: [01-03]

# Tech tracking
tech-stack:
  added:
    - strands (@tool decorator)
  patterns:
    - Prompt injection sanitization using regex patterns
    - Structured tool responses with success/error/recoverable fields
    - BatchAgent invocation via Lambda.invoke with contentType='data'

key-files:
  created:
    - examples/synthetic-dataset-generator/resources/system-prompt/conversation-prompt.txt
    - examples/synthetic-dataset-generator/resources/generation/script-generation-prompt.txt
    - examples/synthetic-dataset-generator/resources/tools/generate_script.py
  modified: []

key-decisions:
  - "Default row count: 10,000 (max 100,000) per CONTEXT.md decisions"
  - "Pinned library versions in prompt comments for Lambda layer compatibility"
  - "Prompt injection detection includes common patterns (ignore previous, system:, etc.)"

patterns-established:
  - "Tool response format: {success, script/error, summary, recoverable}"
  - "BatchAgent invocation payload: {contentType: 'data', content: {data: '...'}}"

requirements-completed: [CHAT-05, GEN-01, GEN-02, GEN-03, GEN-04]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 01 Plan 02: Agent Resources Summary

**System prompts for InteractiveAgent and BatchAgent, plus generate_script tool with input sanitization**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T06:50:42Z
- **Completed:** 2026-03-02T06:52:41Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Created DataSynth conversation prompt with adaptive requirement gathering strategy
- Created script generation prompt enforcing DataGenerator class template with pinned versions
- Implemented generate_script tool with sanitize_input() for prompt injection prevention

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InteractiveAgent conversation prompt** - `0935493` (feat)
2. **Task 2: Create BatchAgent script generation prompt** - `e4b6717` (feat)
3. **Task 3: Create generate_script tool** - `15bebe5` (feat)

## Files Created

- `examples/synthetic-dataset-generator/resources/system-prompt/conversation-prompt.txt` - DataSynth persona with VAGUE/DETAILED request handling
- `examples/synthetic-dataset-generator/resources/generation/script-generation-prompt.txt` - Template enforcement with DataGenerator class structure
- `examples/synthetic-dataset-generator/resources/tools/generate_script.py` - Tool invoking BatchAgent with input validation

## Decisions Made

- **Adaptive gathering:** Vague requests trigger follow-up questions; detailed requests generate immediately
- **Library versions:** pandas==2.0.3, numpy==1.24.3, faker==18.13.0 (to be updated when Lambda layer is created)
- **Sanitization patterns:** Detect and strip common prompt injection attempts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness
- All agent resources ready for stack wiring in Plan 03
- conversation-prompt.txt ready for InteractiveAgent system prompt
- script-generation-prompt.txt ready for BatchAgent system prompt
- generate_script.py ready for InteractiveAgent tool loading

---
*Phase: 01-agent-infrastructure-script-generation*
*Completed: 2026-03-02*

## Self-Check: PASSED

All created files verified:
- FOUND: conversation-prompt.txt
- FOUND: script-generation-prompt.txt
- FOUND: generate_script.py
- FOUND: 0935493 (Task 1 commit)
- FOUND: e4b6717 (Task 2 commit)
- FOUND: 15bebe5 (Task 3 commit)
