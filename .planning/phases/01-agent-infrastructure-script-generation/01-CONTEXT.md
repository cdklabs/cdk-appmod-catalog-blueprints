# Phase 1: Agent Infrastructure + Script Generation - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can authenticate via Cognito, converse with an AI agent that gathers dataset requirements adaptively, and receive a generated Python DataGenerator script. This phase establishes the CDK example stack with InteractiveAgent (chat) + BatchAgent (generation), the generate_script tool, and the system prompt. No script execution, no preview, no export — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Agent Architecture
- **InteractiveAgent** — handles real-time chat with user (Cognito auth, API Gateway, streaming SSE)
- **BatchAgent** — generates Python scripts (invoked by InteractiveAgent via tool)
- **Tool invocation pattern** — InteractiveAgent has a `generate_script` tool that internally invokes BatchAgent
- **Separate Execution Lambda** (Phase 2) — script execution isolated in dedicated Lambda with minimal IAM (no Bedrock, no S3). Defense in depth.

```
InteractiveAgent (chat)
    │
    └─► generate_script tool
            │
            └─► BatchAgent (Bedrock) ──► returns .py code

[Phase 2: execute_script tool ──► Execution Lambda (isolated)]
```

### Agent Conversation Flow
- Adaptive requirement gathering: Agent decides when to ask follow-ups based on request specificity. Vague = more questions, detailed = generate immediately.
- Default row count: 10,000 rows (user can override via conversation)
- Tone: Professional but friendly — like a data engineer colleague. Knowledgeable, concise.

### Script Presentation
- Full script displayed in **collapsible code block** in chat
- **Download button** on the side for the .py file
- **Brief summary** after generation: 1-2 sentences explaining approach ("Used Faker for names, numpy normal distribution for amounts, 10K rows")

### Example App Structure
- Path: `examples/synthetic-dataset-generator/`
- Self-contained — all code inside the example folder
- Agent resources under `resources/`:
  - `resources/tools/` — Python @tool functions
  - `resources/system-prompt/` — Agent system prompt file
- Frontend (Phase 4) will go in `webapp/` subfolder within the example
- Standard example files: app.ts, stack.ts, cdk.json, package.json, tsconfig.json

### Model Selection
- Default model: Claude Sonnet for both conversation and script generation
- Model ID exposed as configurable CDK prop so deployers can override
- No Bedrock Guardrails — security handled at code level (input sanitization + AST validation)

### Claude's Discretion
- Exact system prompt wording and structure
- Input sanitization implementation details
- Lambda memory/timeout configuration
- Error message formatting
- How BatchAgent is invoked from the tool (Lambda invoke vs SDK)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **InteractiveAgent** (`use-cases/framework/agents/interactive-agent.ts`): Complete chat backend — Cognito auth, API Gateway, Lambda (FastAPI + LWA), streaming SSE, S3 session management.
- **BatchAgent** (`use-cases/framework/agents/batch-agent.ts`): Non-interactive agent for backend processing — Strands framework, tool loading, JSON extraction.
- **Strands @tool pattern** (`use-cases/framework/agents/resources/`): Existing Python tools show the decorator pattern. Follow same structure for generate_script tool.
- **createTestApp()** (`use-cases/utilities/test-utils.ts`): Test utility that skips Lambda bundling.

### Established Patterns
- Examples reference constructs via relative path or npm package in package.json
- System prompts are text files loaded at construct instantiation time
- Agent tools are Python files packaged as S3 assets by the construct
- InteractiveAgent + BatchAgent can be combined in same stack

### Integration Points
- InteractiveAgent constructor accepts: model ID, system prompt, tool paths, Cognito config
- BatchAgent constructor accepts: model ID, system prompt, tool paths
- Stack file creates both agents + wires generate_script tool to invoke BatchAgent
- Example app.ts instantiates the stack with environment config

</code_context>

<specifics>
## Specific Ideas

- Reference implementation in `data-generator-ref/` shows the proven script generation prompt template (DataGenerator class with generate_datasets() and generate_schema() methods)
- Version pinning in system prompt: explicitly state pandas, numpy, faker versions matching Lambda layer
- Template enforcement: generated script MUST follow DataGenerator class structure for downstream tools to work

</specifics>

<deferred>
## Deferred Ideas

- Script execution architecture (Phase 2) — noted: separate Lambda with minimal IAM, isolated from Bedrock/S3

</deferred>

---

*Phase: 01-agent-infrastructure-script-generation*
*Context gathered: 2026-03-02*
