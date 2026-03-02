# Phase 2: Script Execution + Preview - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Generated Python scripts execute securely in a sandboxed Lambda environment, returning schema definitions and sample data preview. The execution Lambda validates code via AST parsing, runs the DataGenerator class, and returns structured results for the chat and preview panel.

</domain>

<decisions>
## Implementation Decisions

### Sandbox boundaries
- **Validation approach**: AST parsing only (no RestrictedPython). Parse the code tree, reject unauthorized imports/calls. Fast, simple, sufficient for AI-generated code.
- **Allowed imports**: Extended whitelist — pandas, numpy, faker, random, datetime, json, math, string, collections
- **Blocked operations**: File I/O, network calls, system commands, eval/exec, unauthorized imports
- **Self-healing on failure**: When AST validation fails, send error back to BatchAgent to fix the specific violation (e.g., "remove import os, use allowed imports only")
- **Retry limit**: 3 fix attempts before showing user-friendly error asking them to rephrase their request

### Output format
- **Schema fields**: name, type, description, value ranges, example values for each column
- **Preview rows**: 100 rows returned for preview
- **Preview UI**: Toggle between Table view (CSV-like rows/columns) and JSON view (pretty-printed with syntax highlighting, collapsible sections)
- **Download**: Single "Download Dataset" action where user chooses format (CSV or JSON)
- **Chat result**: Summary message + pointer to preview panel (e.g., "Generated 6-column dataset with 10K rows. See preview →") with brief schema summary

### Claude's Discretion
- Exact AST validation implementation details
- Lambda memory sizing for pandas operations
- Error message wording
- JSON syntax highlighting library choice

</decisions>

<specifics>
## Specific Ideas

- Reference mockup at `data-generator-ref/datasynth-agent-action-group/datasynth-mockup.png` shows the split-panel layout with chat on left, schema/preview tables on right
- Preview panel should feel like a data exploration tool — users can see both structured table and raw JSON
- Downloads should be straightforward: pick format, get file

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BatchAgent**: Already created in Phase 1 — executes Python with Bedrock, returns JSON. Can be invoked for script fixing.
- **generate_script.py tool**: Already has sanitize_input() and BatchAgent invocation pattern. New execute_script tool follows same pattern.
- **InteractiveAgent**: Chat infrastructure ready — just need to wire new tool and handle preview response.

### Established Patterns
- **Tool response format**: `{success, result/error, summary, recoverable}` — use same pattern for execute_script
- **BatchAgent invocation**: `{contentType: 'data', content: {data: '...'}}` payload format
- **Lambda layers**: Project uses `@aws-cdk/aws-lambda-python-alpha` for Python bundling

### Integration Points
- New `execute_script` tool added to InteractiveAgent alongside `generate_script`
- Execution Lambda is separate from BatchAgent (minimal IAM, no Bedrock access)
- Results flow: execute_script tool → Execution Lambda → structured response → chat + preview panel

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-script-execution-preview*
*Context gathered: 2026-03-03*
