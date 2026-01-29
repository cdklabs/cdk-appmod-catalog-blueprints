# Decisions: Requirements - RAG Customer Support Example

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Work Type Confirmation

### Example vs Construct

**Question:** Is this an example (demonstrating existing constructs) or a new construct (reusable library component)?

**Options:**
1. Example (Kiro Recommended): Demonstrates the new knowledge base integration feature with BatchAgent
2. Construct: Creates new reusable infrastructure patterns

**Answer:** Option 1 - This is an example demonstrating the knowledge base enhancement with BatchAgent
1
---

## Scope Decisions

### Use Case Focus

**Question:** What specific use case should this example demonstrate?

**Options:**
1. Customer Support Agent (Kiro Recommended): Agent that answers questions using product documentation KB - clear, practical use case
2. Research Assistant: Agent that queries multiple knowledge bases for research
3. Compliance Checker: Agent that validates documents against policy KBs
4. Generic RAG Demo: Minimal example showing basic KB integration

**Answer:** 
1
---

### Knowledge Base Configuration

**Question:** What knowledge base features should the example demonstrate?

**Options:**
1. Basic KB integration only: Single KB with default settings - simplest demo
2. Multiple KBs with retrieval config (Kiro Recommended): Shows multiple KBs, custom numberOfResults - practical production pattern
3. Full feature showcase: Multiple KBs + ACL + Guardrails - comprehensive but complex
4. Other (please specify): _______________________

**Answer:** 
1
---

### Agent Tools

**Question:** Should the example include custom tools alongside knowledge base retrieval?

**Options:**
1. No custom tools (Kiro Recommended): Focus purely on KB integration - clearer demonstration
2. Simple helper tools: Add 1-2 basic tools (e.g., format response, log interaction)
3. Domain-specific tools: Add tools relevant to customer support (e.g., ticket lookup, escalation)

**Answer:** 
1
---

## Non-Functional Requirements

### Observability

**Question:** Should the example enable observability features?

**Options:**
1. Yes, enable observability (Kiro Recommended): Shows production best practices
2. No, keep minimal: Focus on core KB functionality
3. Optional with documentation: Include but make easy to disable

**Answer:** 
1
---

### Sample Data

**Question:** What sample data should be included for testing?

**Options:**
1. Sample questions only (Kiro Recommended): Include sample customer questions to test against user's own KB
2. Mock KB setup instructions: Document how to create a test KB with sample docs
3. Full sample data: Include sample documents and KB creation scripts (complex)

**Answer:** 
3
---

## Documentation Requirements

### README Depth

**Question:** How comprehensive should the README be?

**Options:**
1. Standard example README (Kiro Recommended): Prerequisites, deployment, usage, monitoring, cleanup
2. Minimal README: Just deployment steps
3. Extended tutorial: Step-by-step guide including KB creation in Bedrock console

**Answer:** 
3
---

## Confirmation

Please review and fill in your decisions above, then confirm you're ready to proceed with the requirements document.
yes