# Phase 3: Export + S3 Persistence - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can export full datasets in multiple formats (CSV, JSON) with all artifacts (schema, Python script) persisted to S3 for reproducibility. Export happens on-demand after user is satisfied with their dataset design from preview iterations.

</domain>

<decisions>
## Implementation Decisions

### Export Flow
- On-demand generation: Full dataset generated only when user explicitly requests export
- Iterative workflow: User refines dataset via 100-row previews (Phase 2), exports only when happy
- Both interaction modes: Natural language in chat AND UI buttons (Phase 4) trigger same backend tool

### Export Tool Design
- Single flexible `export_dataset` tool handles all export types
- Parameters: `type` (csv/json/schema/script/all), `row_count` (default 10,000)
- Agent parses natural language: "Export 50K rows as CSV" → `export_dataset(type="csv", row_count=50000)`
- UI buttons (Phase 4) send structured messages to agent, same tool handles them

### Caching Strategy
- First export generates ALL formats (CSV + JSON + schema + script) regardless of which was requested
- Cache all 4 presigned URLs in session state
- Subsequent clicks return cached URLs instantly (no regeneration)
- Regenerate only if: script changed OR row count changed

### Download Delivery
- Agent presents links as friendly message: "Your dataset is ready! Download: CSV | JSON | Schema | Script"
- Presigned URL expiry: 24 hours
- If URL expires, user can ask "give me the links again" → regenerate URLs from cached S3 files (no data regeneration)
- Individual file downloads (no zip bundle)

### File Formatting
- CSV: Standard RFC 4180 (comma delimiter, double-quote escaping, handles special chars)
- JSON: Array of objects format (`[{row1}, {row2}, ...]`)
- Schema: Column definitions with names, types, descriptions, constraints (same structure as Phase 2 preview)
- Script: Clean .py file with just the DataGenerator class code

### Large Dataset Handling
- Progress feedback: Simple status messages ("Generating your dataset...", "Uploading to S3...", "Done!")
- Memory management: Generate in 10K-row chunks to keep memory bounded in Lambda
- S3 upload: Parallel upload using ThreadPoolExecutor for all 4 files concurrently
- Error handling: Retry once on transient failures, then report clear error message to user

### Claude's Discretion
- Exact chunking implementation details
- S3 key naming within the folder structure
- Error message wording
- Status message timing and phrasing

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `execute_script.py` tool: Already handles script execution, returns schema + 100-row preview. Export tool can follow similar pattern.
- `ast_validator.py`: Script validation logic, can be reused for export tool
- `synthetic-dataset-generator-stack.ts`: CDK stack structure to extend with S3 bucket and export Lambda permissions

### Established Patterns
- Tool pattern: Python tools using `@tool` decorator from strands, return structured dicts
- Lambda invocation: Tools invoke other Lambdas via boto3, pass payloads as JSON
- Environment variables: Function names passed via `EXECUTION_LAMBDA_NAME`, `BATCH_AGENT_FUNCTION_NAME`
- InteractiveAgent tools: Packaged as S3 Assets, granted permissions via `additionalPolicyStatementsForTools`

### Integration Points
- Chat agent needs: New export tool added to `tools` array in InteractiveAgent
- CDK stack needs: S3 bucket with KMS encryption, grant permissions to export Lambda
- Execution Lambda: May need extending OR new export Lambda that handles full generation + S3 upload
- Session state: Need to track cached export URLs (likely via DynamoDB or agent context)

</code_context>

<specifics>
## Specific Ideas

- UI layout for Phase 4: Three buttons - "Export Dataset" (dropdown: CSV/JSON), "Export Schema", "Export Script"
- Folder structure per requirements: `generated/{timestamp}_{sessionId}/script|data_csv|data_json|schema_json/`
- Default row count of 10,000 chosen as reasonable balance for most use cases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-export-s3-persistence*
*Context gathered: 2026-03-03*
