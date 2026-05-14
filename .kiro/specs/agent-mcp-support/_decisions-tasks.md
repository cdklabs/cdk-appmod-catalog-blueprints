# Decisions: Tasks — Agent MCP Support

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Implementation Strategy

### Development Approach

**Question:** How should we organize the implementation work for this feature addition across the TypeScript CDK layer and Python runtime layer?

**Options:**
1. CDK types first → CDK construct changes → Python models → Python utils → Python handlers → Tests (Kiro Recommended): Start with TypeScript types/enums (McpServerConfig, McpTransportType, McpAuthFlow), then modify BaseAgent/BatchAgent/InteractiveAgent, then add Python Pydantic model, then utility functions, then handler integration. This follows the data flow: types define the contract, constructs serialize, runtime deserializes and uses. Each step builds on the previous.
2. Python first → CDK second: Build the Python runtime support first (parsing, MCPClient creation), then wire up the CDK constructs. Allows testing Python logic independently but delays integration.
3. Vertical slices: Implement one complete flow at a time (e.g., BatchAgent with plain headers end-to-end, then add Secrets Manager, then AgentCore Identity). More incremental but requires revisiting files multiple times.
4. Other (please specify): _______________________

**Answer:** Option 1 — CDK types first, then construct changes, then Python models/utils/handlers, then tests. Follows the data flow and matches the design document's implementation order.

---

## Task Prioritization

### Core vs Auth Tiers

**Question:** Should all three authentication tiers (plain headers, Secrets Manager, AgentCore Identity) be implemented together, or should we prioritize?

**Options:**
1. All tiers together (Kiro Recommended): The three tiers share the same config model and parsing logic. Implementing them together avoids revisiting the same files. The design already defines all three tiers in the same interfaces and functions.
2. Plain headers first, then Secrets Manager, then AgentCore Identity: Incremental approach with checkpoints between tiers. Safer but slower.
3. Plain headers + Secrets Manager first, AgentCore Identity later: AgentCore Identity is the most complex tier. Defer it to reduce initial scope.
4. Other (please specify): _______________________

**Answer:** Option 1 — All tiers together. They share the same config model and the design already defines them as a unified interface.

---

## Testing Strategy

### Testing Approach

**Question:** What testing strategy should we use for this construct feature addition?

**Options:**
1. Full suite: CDK unit tests + Python unit tests + Property-based tests + CDK Nag tests (Kiro Recommended): CDK unit tests verify env vars, IAM policies, and backward compatibility. Python unit tests verify parsing, Secrets Manager resolution, and MCPClient creation with mocks. Property-based tests (Hypothesis) verify serialization round-trip and config validation. CDK Nag tests verify security compliance. This matches the design document's testing strategy section.
2. CDK unit tests + Python unit tests only: Skip property-based tests and CDK Nag. Faster but misses the high-value serialization round-trip property.
3. CDK unit tests only: Skip Python tests entirely. Fastest but leaves runtime logic untested.
4. Other (please specify): _______________________

**Answer:** Option 1 — Full suite matching the design document's testing strategy. CDK unit tests, Python unit tests, Hypothesis property-based tests, and CDK Nag tests.

---

## Python Test Location

### Where to Place Python Tests

**Question:** Where should the Python unit tests and property-based tests live?

**Options:**
1. In the resource directory alongside source files (Kiro Recommended): Place `test_mcp_utils.py` in `use-cases/framework/agents/resources/default-strands-agent/` alongside `utils.py` and `models.py`. This follows the repository's testing guide pattern where Python tests live next to the code they test, with a virtual environment per directory.
2. Separate test directory: Create `use-cases/framework/agents/resources/default-strands-agent/tests/`. Cleaner separation but diverges from the flat structure used by existing Python resources.
3. Top-level test directory: Place Python tests in `test/python/`. Centralizes tests but disconnects them from the code.
4. Other (please specify): _______________________

**Answer:** Option 1 — In the resource directory alongside source files, following the testing guide's pattern.

---

## Package Dependencies

### Dependency Installation Order

**Question:** When should the new Python packages (`mcp`, `bedrock-agentcore-identity`) be added to requirements.txt?

**Options:**
1. Early, before Python implementation tasks (Kiro Recommended): Add packages to requirements.txt as one of the first tasks. This ensures the development environment is ready when implementing Python utility functions and handler integration. Both Lambda and AgentCore container requirements files need updating.
2. Just before handler integration: Add packages only when the handler code needs them. Delays dependency changes but may cause import errors during development.
3. At the end: Add all dependency changes in a final cleanup task. Risk of forgetting or mismatching versions.
4. Other (please specify): _______________________

**Answer:** Option 1 — Early, before Python implementation tasks. Add to both `requirements.txt` files.

---

## Documentation

### Documentation Scope

**Question:** What documentation updates are needed for this feature addition?

**Options:**
1. JSDoc on new types + README update + usage examples (Kiro Recommended): Add JSDoc comments on McpServerConfig, McpTransportType, McpAuthFlow, and the new `mcpServers` field. Update the agents README.md with an MCP section showing usage examples for all three auth tiers. This follows the construct development guide's documentation requirements.
2. JSDoc only: Minimal documentation in code comments. Faster but leaves README outdated.
3. Full documentation: JSDoc + README + separate MCP guide + architecture diagrams. Comprehensive but may be overkill for a feature addition.
4. Other (please specify): _______________________

**Answer:** Option 1 — JSDoc on new types + README update with MCP usage examples for all three auth tiers.

---

**Reference:** Previous `_decisions-requirements.md` and `_decisions-design.md` for alignment.
**After confirmation:** Generate `.kiro/specs/agent-mcp-support/tasks.md` from these decisions.
