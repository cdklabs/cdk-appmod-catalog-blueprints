# Implementation Plan: [Feature or Example Name]

> **Location:** `.codex/specs/<slug>/tasks.md` (never under `.kiro/specs/**`).  
> **Format:** Match original authors — see `.kiro/specs/` (e.g. `agent-knowledge-base/tasks.md`, `rag-customer-support-example/tasks.md`) and `.kiro/steering/aidlc-specdriven-core-workflow.md` (Tasks Phase).

## Overview

[Short summary of how the work is organized: phases, order, and any key strategy.]

## Tasks

- [ ] 1. [Task title]
  - [ ] 1.1 [Sub-task]
    - [Concrete step: file, change, or deliverable]
    - [Another step]
    - _Requirements: N.M, N.M_
  - [ ] 1.2 [Sub-task]
    - …
    - _Requirements: …_

- [ ] 2. [Task title]
  - [ ] 2.1 …
  - _Requirements: …_

- [ ] N. Checkpoint / Final validation
  - [Verification steps]
  - _Requirements: All success criteria_

## Traceability Matrix

Every requirement ID must map to one or more task IDs.

- `FR-1` → [1.1, 2.1]
- `FR-2` → [...]
- `NFR-1` → [...]
- `TR-1` → [...]

## Notes

- [Any implementation notes, testing policy, or traceability rules.]

## Tasks Exit Check

- [ ] Every task/sub-task includes requirement references.
- [ ] Traceability matrix covers every requirement ID from `requirements.md`.
- [ ] Validation commands are listed for touched behavior.
- [ ] Task completion is blocked on tests/docs updates.

---

**Examples:** `.kiro/specs/agent-knowledge-base/tasks.md`, `.kiro/specs/rag-customer-support-example/tasks.md` — use `- [ ]` or `- [x]`, nest sub-tasks, reference _Requirements: X.Y_ for traceability.
