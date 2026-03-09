# Decisions: Tasks

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. All decisions have been pre-filled with Kiro-recommended options.

---

## Implementation Strategy

### Development Approach

**Question:** How should we organize the implementation work?

**Options:**
1. Bottom-up (data models → registry → generator → resolver → server) (Kiro Recommended): Build foundational layers first, each task builds on the previous
2. Top-down (server → tools → generator → registry): Start with the server shell and fill in
3. Feature-sliced (one construct family end-to-end, then next): Vertical slices per family
4. Other (please specify): _______________________

**Answer:** Option 1 — Bottom-up. Start with data models and errors, then registry (JSII parsing), then generator (templates), then resolver (dependency DAG), then server wiring. Each layer builds on the previous.

---

### Task Granularity

**Question:** How granular should tasks be?

**Options:**
1. One task per module file (Kiro Recommended): Each Python module is its own task with sub-tasks for testing
2. Coarse-grained (2-3 large tasks): Fewer tasks, more work per task
3. Fine-grained (one task per function): Very small tasks
4. Other (please specify): _______________________

**Answer:** Option 1 — One task per module file, with testing as sub-tasks. Matches the package structure cleanly.

---

## Testing Strategy

### Testing Approach

**Question:** What testing strategy should we use?

**Options:**
1. Unit tests + property-based tests (Kiro Recommended): pytest for unit tests, Hypothesis for the 8 correctness properties
2. Unit tests only: Faster but misses universal property coverage
3. Full suite with integration tests: Unit + property + stdio integration tests
4. Other (please specify): _______________________

**Answer:** Option 1 — Unit tests (pytest) for each module plus Hypothesis property-based tests for the 8 correctness properties defined in design.md. Integration tests for the MCP server over stdio included in test_server.py.

---

### Property Test Placement

**Question:** Where should property-based tests live relative to implementation tasks?

**Options:**
1. Close to implementation (Kiro Recommended): Property test sub-tasks placed right after the component they validate
2. Separate phase: All property tests in a dedicated task at the end
3. Mixed: Some inline, some at end
4. Other (please specify): _______________________

**Answer:** Option 1 — Property test sub-tasks placed immediately after the component they validate, so errors are caught early.

---

## Task Prioritization

### What to Build First

**Question:** Which component should be built first?

**Options:**
1. Data models + errors (Kiro Recommended): Foundation types that everything else depends on
2. Registry (JSII parsing): Core data source
3. Server shell: Get MCP protocol working first
4. Other (please specify): _______________________

**Answer:** Option 1 — Data models and error types first, since every other module imports them.

---

## Implementation Language

### Language Confirmation

**Question:** The design specifies Python. Confirm implementation language?

**Options:**
1. Python (Kiro Recommended): Matches design document, MCP SDK, Hypothesis, PyPI distribution
2. Other (please specify): _______________________

**Answer:** Option 1 — Python, as specified in the design document. All code examples in tasks will use Python.

---

## Template Strategy

### Jinja2 Template Creation

**Question:** How should we handle the 8 Jinja2 templates (4 languages × 2 types)?

**Options:**
1. TypeScript first, then other languages (Kiro Recommended): TypeScript is the primary target; other languages follow the same pattern
2. All languages simultaneously: Create all templates at once
3. TypeScript only for MVP: Defer other languages
4. Other (please specify): _______________________

**Answer:** Option 1 — TypeScript templates first (scaffold + compose), then Python, Java, .NET templates. TypeScript is the primary use case.

---
