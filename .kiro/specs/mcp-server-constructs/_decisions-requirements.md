# Decisions: Requirements — MCP Server for AppMod Catalog Blueprints

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## MCP Server Scope

### 1. Primary Purpose

**Question:** What should the MCP server primarily help end users do?

**Options:**
1. **Scaffold & configure constructs (Kiro Recommended):** Provide tools that generate CDK code snippets for each L3 construct with correct props, imports, and best-practice defaults. Users ask "set up a Bedrock document processing pipeline" and get working code.
2. **Explore & understand constructs:** Expose resources (construct docs, props interfaces, architecture diagrams) so users can browse and learn about available constructs before writing code themselves.
3. **Full lifecycle management:** Scaffold code + deploy + monitor + troubleshoot. The MCP server handles everything from code generation through `cdk deploy` and CloudWatch dashboards.
4. Other (please specify): ___

**Answer:**
1
---

### 2. Construct Coverage

**Question:** Which constructs should the MCP server support at launch?

The repository currently exposes these construct families:
- **Document Processing** — `BedrockDocumentProcessing`, `AgenticDocumentProcessing` (+ base class, adapters, chunking config)
- **Agents** — `BatchAgent`, `InteractiveAgent` (+ base class, knowledge base config)
- **Webapp** — `Frontend` (CloudFront + S3 hosting)
- **Foundation** — `Network` (VPC), `AccessLog`, `EventBridgeBroker`
- **Utilities** — `Observability`, `DataMasking`, `DataLoader`, CDK Nag helpers

**Options:**
1. **All construct families (Kiro Recommended):** Cover every public construct so the MCP server is a one-stop shop from day one.
2. **High-value constructs only:** Start with Document Processing + Agents (the most complex and highest-value constructs), add others later.
3. **Core + Foundation only:** Document Processing + Agents + Foundation (Network, EventBridge) — skip Webapp and Utilities.
4. Other (please specify): ___

**Answer:**
1
---

## MCP Tool Design

### 3. Tool Granularity

**Question:** How should MCP tools be organized — one tool per construct, or grouped by capability?

**Options:**
1. **One tool per construct (Kiro Recommended):** Each construct gets its own MCP tool (e.g., `scaffold_bedrock_document_processing`, `scaffold_batch_agent`, `scaffold_network`). Clear, discoverable, easy to maintain.
2. **Grouped by capability:** Fewer tools with a `constructType` parameter (e.g., `scaffold_construct(type="bedrock-doc-processing")`). Simpler tool list but more complex per-tool logic.
3. **Layered tools:** A `list_constructs` discovery tool + a generic `scaffold` tool + per-construct `configure_*` tools for advanced options. Most flexible but more tools to manage.
4. Other (please specify): ___

**Answer:**
2
---

### 4. MCP Capabilities Beyond Tools

**Question:** Should the MCP server expose MCP Resources and/or Prompts in addition to Tools?

**Options:**
1. **Tools + Resources (Kiro Recommended):** Tools for code generation, Resources for exposing construct documentation, props interfaces, and architecture info. This lets AI models pull context about constructs before generating code.
2. **Tools only:** Keep it simple — just tools that generate code. Documentation stays in the repo README files.
3. **Tools + Resources + Prompts:** Full MCP surface. Prompts provide pre-built prompt templates like "Help me set up a document processing pipeline" that guide the conversation.
4. Other (please specify): ___

**Answer:**
1
---

### 5. Output Format

**Question:** What should the MCP tools return when a user asks to scaffold a construct?

**Options:**
1. **Complete CDK stack file (Kiro Recommended):** A full, deployable TypeScript file with imports, stack class, construct instantiation, and CloudFormation outputs. Ready to save and `cdk deploy`.
2. **Code snippet only:** Just the construct instantiation code (the `new BedrockDocumentProcessing(...)` block) — user integrates it into their own stack.
3. **Multi-file scaffold:** Stack file + `cdk.json` + `package.json` + README — a complete mini-project. Most helpful for new users but heavier.
4. Other (please specify): ___

**Answer:**
2
---

## Configuration & Customization

### 6. Props Handling Strategy

**Question:** How should the MCP server handle construct props (configuration options)?

Constructs like `BedrockDocumentProcessing` have 15+ props, many optional with sensible defaults. `BatchAgent` requires prompt text, model selection, tool definitions, etc.

**Options:**
1. **Smart defaults + override (Kiro Recommended):** Generate code with best-practice defaults for all optional props. Include inline comments explaining each prop. Users can ask to customize specific props and the tool regenerates.
2. **Minimal required only:** Only include required props in generated code. Users add optional props themselves using documentation.
3. **Interactive configuration:** The tool asks clarifying questions about each major prop group before generating code (e.g., "Do you want chunking enabled? Which Bedrock model?").
4. Other (please specify): ___

**Answer:**
1
---

### 7. Composition Support

**Question:** Should the MCP server help users compose multiple constructs together?

For example, a typical deployment combines `Network` + `BedrockDocumentProcessing` + `AccessLog` + `Observability`. These constructs reference each other (e.g., doc processing takes a `network` prop).

**Options:**
1. **Yes, with a compose tool (Kiro Recommended):** Provide a dedicated tool that wires multiple constructs together in a single stack, handling cross-references (e.g., passing the Network construct to BedrockDocumentProcessing). This is where the real value is for complex setups.
2. **No, single construct only:** Each tool scaffolds one construct. Users wire them together manually. Simpler to build but less helpful.
3. **Template-based composition:** Provide pre-built composition templates for common patterns (e.g., "full document processing stack", "agent with VPC") rather than dynamic composition.
4. Other (please specify): ___

**Answer:**
1
---

## Runtime & Distribution

### 8. Transport Protocol

**Question:** Which MCP transport should the server support?

**Options:**
1. **stdio (Kiro Recommended):** Standard input/output transport. Works with all MCP clients (Claude Desktop, VS Code extensions, Kiro, etc.). Simplest to implement and distribute.
2. **HTTP with SSE:** Server-Sent Events over HTTP. Enables remote hosting and multi-user scenarios but adds deployment complexity.
3. **Both stdio and HTTP:** Support both transports for maximum flexibility. More code to maintain.
4. Other (please specify): ___

**Answer:**
1
---

### 9. Implementation Language

**Question:** What language should the MCP server be implemented in?

**Options:**
1. **TypeScript (Kiro Recommended):** Matches the repository's primary language. Can directly import and introspect construct types from the library. Uses the `@modelcontextprotocol/sdk` package.
2. **Python:** Good MCP SDK support, but would need to maintain construct metadata separately since the library is TypeScript.
3. **TypeScript with JSII metadata:** Use JSII-generated type information to auto-discover construct props. More complex but stays in sync with the library automatically.
4. Other (please specify): ___

**Answer:**
3
---

### 10. Distribution Method

**Question:** How should end users install and run the MCP server?

**Options:**
1. **npx / npm package (Kiro Recommended):** Publish as an npm package. Users run `npx @cdklabs/mcp-appmod-catalog-blueprints` or add it to their MCP client config. Standard Node.js distribution.
2. **Bundled in the main package:** Ship the MCP server as part of `@cdklabs/cdk-appmod-catalog-blueprints` itself. No separate install but increases main package size.
3. **Docker container:** Distribute as a Docker image. Good for HTTP transport but overkill for stdio.
4. Other (please specify): ___

**Answer:**
1
---

## Non-Functional Requirements

### 11. Error Handling & Validation

**Question:** How should the MCP server handle invalid or incomplete user requests?

**Options:**
1. **Graceful degradation with guidance (Kiro Recommended):** Return partial results with clear messages about what's missing. For example, if a user asks for a BatchAgent without specifying a prompt, generate the code with a placeholder and a comment explaining what to fill in.
2. **Strict validation:** Reject requests that don't include all required props. Return error messages listing what's needed.
3. **Best-effort generation:** Always generate code, using reasonable defaults for anything not specified. May produce code that needs editing but never fails.
4. Other (please specify): ___

**Answer:**
1
---

### 12. Versioning & Construct Sync

**Question:** How should the MCP server stay in sync with construct changes?

**Options:**
1. **Version-locked to library (Kiro Recommended):** The MCP server version matches the library version. When constructs change, the MCP server is updated in the same release. Metadata is maintained alongside construct code.
2. **Auto-discovery from JSII:** Dynamically read construct metadata from the installed library version at runtime. Always in sync but more complex.
3. **Manual metadata maintenance:** Maintain a separate metadata file that describes each construct. Updated manually when constructs change.
4. Other (please specify): ___

**Answer:**
1
---
