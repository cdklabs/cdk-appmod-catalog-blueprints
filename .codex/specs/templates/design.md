# Design Document: [Feature or Example Name]

> **Location:** `.codex/specs/<slug>/design.md` (never under `.kiro/specs/**`).  
> **Format:** Match original authors — see `.kiro/specs/` (e.g. `agent-knowledge-base/design.md`, `rag-customer-support-example/design.md`) and `.kiro/steering/aidlc-specdriven-core-workflow.md` (Design Phase).

## Overview

[Summary of the technical approach, key design goals (e.g. extensibility, backward compatibility, security), and how it fits the repo.]

## Architecture

### High-Level Architecture

```
[ASCII diagram: components and relationships. See .kiro/specs examples.]
```

### Component Interaction Flow

```
[Optional: sequence or data-flow diagram.]
```

## Components and Interfaces

[For constructs: interface definitions, abstract base, concrete implementations in code blocks. For examples: component design with code snippets and purpose.]

### [Component or Interface Name]

[Description and, if applicable, code block.]
[Requirements: FR-*, NFR-*, TR-*]

## API and Data Model Impact

- Public interfaces/props changed:
- Backward compatibility strategy:
- Migration notes (if any):

## Security and IAM

- New permissions/resources:
- Least-privilege rationale:
- Encryption and data handling impact:

## Observability and Operations

- Logging changes:
- Metrics/alarms/tracing changes:
- Operational runbook impact:

## Alternatives Considered

1. **Option:** [name]
   - Pros:
   - Cons:
   - Why not chosen:

## Design Exit Check

- [ ] Major components/flows reference requirement IDs.
- [ ] Backward compatibility impacts are explicit.
- [ ] Security/IAM impacts are explicit.
- [ ] Observability/operations impacts are explicit.

---

**Examples:** `.kiro/specs/agent-knowledge-base/design.md`, `.kiro/specs/rag-customer-support-example/design.md`
