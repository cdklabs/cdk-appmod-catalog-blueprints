# Requirements Document

> **Location:** `.codex/specs/<slug>/requirements.md` (never under `.kiro/specs/**`).  
> **Format:** Match original authors — see `.kiro/specs/` (e.g. `agent-knowledge-base/requirements.md`, `rag-customer-support-example/requirements.md`) and phase guidance in `.kiro/steering/aidlc-specdriven-core-workflow.md` (Requirements Phase).

## Introduction

[One or two paragraphs: what this spec is for, key capabilities, how it fits the repo (construct vs example).]

## Glossary

[Optional. Define terms used in requirements. Format: **Term**: definition.]

## Requirements

### FR-1: [Title]

**User Story:** As a [role], I want [goal], so that [benefit].

#### Acceptance Criteria

1. THE [system/component] SHALL [behavior]
2. WHEN [condition], THE [system] SHALL [behavior]
3. [Continue with SHALL/WHEN/THE style as in .kiro/specs examples]

### FR-2: [Title]

**User Story:** …

#### Acceptance Criteria

…

## Non-Functional Requirements

### NFR-1: [Title]

[Security, observability, backward compatibility, performance/cost.]

#### Acceptance Criteria

1. THE [system/component] SHALL [behavior]
2. WHEN [condition], THE [system] SHALL [behavior]

## Technical Requirements

### TR-1: [Title]

[Technical constraints/compatibility/integration requirements that are not functional user behavior.]

#### Acceptance Criteria

1. THE [system/component] SHALL [behavior]
2. WHEN [condition], THE [system] SHALL [behavior]

## Validation Mapping

Every requirement ID above must appear in this section.

- `FR-1` → [test/verification command or checklist]
- `FR-2` → [test/verification command or checklist]
- `NFR-1` → [test/verification command or checklist]
- `TR-1` → [test/verification command or checklist]

## Requirements Exit Check

- [ ] Requirement IDs are stable and unique (`FR-*`, `NFR-*`, `TR-*` as used).
- [ ] All acceptance criteria are testable.
- [ ] Validation mapping covers every requirement ID.

---

**Example (construct):** `.kiro/specs/agent-knowledge-base/requirements.md`  
**Example (example):** `.kiro/specs/rag-customer-support-example/requirements.md` — uses Overview, Functional Requirements (FR-1…), Non-Functional (NFR-1…), Technical Requirements (TR-1…).
