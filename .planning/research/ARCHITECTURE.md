# Architecture Patterns

**Domain:** AI-Powered Synthetic Data Generator with Conversational Interface
**Researched:** 2026-03-01

## Recommended Architecture

### High-Level System Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (WebApp)                           │
│  CloudFront + S3 Hosting                                            │
│  - React SPA with split-panel UI                                    │
│  - Chat interface (left), Schema/Preview panels (right)             │
│  - Cognito authentication integration                               │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ HTTPS/WSS
                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   BACKEND (InteractiveAgent)                        │
│  API Gateway + Lambda (FastAPI + LWA)                               │
│  - Cognito authorizer                                               │
│  - Session management (S3SessionManager)                            │
│  - Streaming responses via SSE                                      │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ Bedrock Agent API
                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BEDROCK AGENT RUNTIME                          │
│  Claude 3.5 Haiku/Sonnet                                            │
│  - System prompt: DataSynth persona + tool descriptions             │
│  - Tool orchestration and reasoning                                 │
│  - Streaming token generation                                       │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ Tool invocations
                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    STRANDS AGENT TOOLS                              │
│  Python @tool functions packaged as Lambda layer                   │
│  1. generate_script_tool                                            │
│     - Invokes Bedrock to generate Python DataGenerator class        │
│     - Returns: script code + explanation                            │
│  2. execute_script_tool                                             │
│     - Dynamically imports and executes generated script             │
│     - Calls DataGenerator.generate_datasets()                       │
│     - Returns: schema JSON + preview rows (first 100)               │
│  3. export_dataset_tool                                             │
│     - Converts full DataFrames to CSV/JSON/XML                      │
│     - Uploads to S3 with organized folder structure                 │
│     - Generates presigned URLs (1 hour expiry)                      │
│     - Stores metadata in DynamoDB                                   │
│     - Returns: download URLs                                        │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ Storage
                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       PERSISTENCE LAYER                             │
│  S3 Bucket (KMS encrypted)                                          │
│    ├── sessions/{sessionId}/                  (conversation state)  │
│    ├── generated/{timestamp}_{sessionId}/                           │
│    │   ├── script/generated_script.py                               │
│    │   ├── text/explanation.txt                                     │
│    │   ├── schema_json/data_schema.json                             │
│    │   ├── data_csv/dataset_1.csv, dataset_2.csv, ...               │
│    │   └── data_json/dataset_1.json, dataset_2.json, ...            │
│                                                                      │
│  DynamoDB Table (KMS encrypted)                                     │
│    - PK: SessionID                                                  │
│    - SK: Timestamp                                                  │
│    - Attributes: ScriptURL, ExplanationURL, SchemaURL,              │
│                  CsvURL[], JsonURL[]                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Technology |
|-----------|---------------|-------------------|------------|
| **WebApp** | Frontend hosting, UI rendering, auth flow | InteractiveAgent (HTTPS/WSS), Cognito | CloudFront, S3, React |
| **InteractiveAgent** | API endpoint, session management, streaming, auth | WebApp, Bedrock Agent, S3 (sessions) | API Gateway, Lambda (FastAPI), Cognito |
| **Bedrock Agent** | Conversation orchestration, tool selection, reasoning | InteractiveAgent, Strands Tools | Bedrock Agent Runtime, Claude 3.5 |
| **Strands Tools** | Script generation, execution, export operations | Bedrock Agent, S3, DynamoDB, Bedrock Models | Python @tool functions, Lambda layer |
| **S3 Bucket** | Artifact storage (sessions, scripts, datasets) | InteractiveAgent, Strands Tools, WebApp (downloads) | S3 with KMS encryption |
| **DynamoDB** | Dataset metadata, URL tracking, history | Strands Tools, WebApp (history page) | DynamoDB with KMS encryption |

### Data Flow

#### Flow 1: User Message → Agent Response (Conversation)

```
1. User types message in chat UI
   ↓
2. Frontend → API Gateway (with Cognito JWT)
   ↓
3. API Gateway → Lambda (FastAPI + LWA runtime)
   ↓
4. Lambda calls Bedrock Agent API
   - Payload: user message, session ID, system prompt, tool definitions
   ↓
5. Bedrock Agent reasoning loop:
   - Analyze user intent
   - Decide: continue conversation OR invoke tool
   - Generate tokens (streamed back via SSE)
   ↓
6. Lambda streams response → API Gateway → Frontend
   ↓
7. Frontend renders response in chat panel
   - If schema/preview included: update right panels
```

#### Flow 2: Script Generation (generate_script_tool)

```
1. Agent determines user has specified enough requirements
   ↓
2. Agent invokes generate_script_tool with:
   - use_case: string (narrative description)
   - field_definitions: list[{Field Name, Data Type, Constraints}]
   - num_files: int (number of datasets to generate)
   ↓
3. Tool constructs detailed prompt with:
   - User storyline and requirements
   - Field schema
   - Template structure (DataGenerator class with required methods)
   - Output format instructions (10K records, multiple datasets)
   ↓
4. Tool → Bedrock InvokeModel (Claude 3.5 Haiku)
   - Max tokens: 200K
   - Structured prompt with template enforcement
   ↓
5. Bedrock returns:
   - Full text explanation (rationale, approach, libraries used)
   - Python code block (extracted via regex)
   ↓
6. Tool returns to agent:
   {
     "success": true,
     "explanation": "...",
     "script": "class DataGenerator: ..."
   }
   ↓
7. Agent synthesizes response to user:
   "I've generated a script that uses Faker to create..."
```

#### Flow 3: Script Execution (execute_script_tool)

```
1. Agent invokes execute_script_tool with:
   - python_code: string (from previous generate_script_tool call)
   ↓
2. Tool performs dynamic import:
   - importlib.util.spec_from_loader()
   - exec(python_code, module.__dict__)
   - Instantiate: generator = module.DataGenerator()
   ↓
3. Tool calls generator.generate_datasets()
   - Returns: list[pd.DataFrame] (in-memory)
   ↓
4. Tool calls generator.generate_schema()
   - Returns: {"columns": [{columnName, dataType, description, constraint}]}
   ↓
5. Tool extracts preview:
   - First DataFrame: df.head(100).to_dict('records')
   - Schema JSON
   ↓
6. Tool returns to agent:
   {
     "success": true,
     "schema": {...},
     "preview_rows": [{...}, {...}, ...],
     "num_datasets": 3,
     "total_rows": 30000
   }
   ↓
7. Agent synthesizes response + frontend updates:
   - Chat: "Generated 30K rows across 3 datasets. Preview below."
   - Schema panel: renders schema table
   - Preview panel: renders first 100 rows in data grid
```

#### Flow 4: Dataset Export (export_dataset_tool)

```
1. User clicks "Download CSV" or "Download JSON" in UI
   ↓
2. Agent invokes export_dataset_tool with:
   - python_code: string (same script)
   - format: "csv" | "json" | "xml"
   - session_id: string
   ↓
3. Tool re-executes script (regenerates DataFrames)
   - Ensures consistency with preview
   ↓
4. Tool performs parallel uploads (ThreadPoolExecutor):
   - For each DataFrame:
     - Convert to CSV: df.to_csv(StringIO)
     - Convert to JSON: df.to_json(orient='records')
   - Upload all files to S3
   - Generate presigned URLs (1 hour expiry)
   ↓
5. Tool uploads metadata artifacts:
   - script/generated_script.py
   - text/explanation.txt
   - schema_json/data_schema.json
   ↓
6. Tool stores URLs in DynamoDB:
   {
     SessionID: "...",
     Timestamp: "20260301_143022",
     ScriptURL: "https://s3...",
     SchemaURL: "https://s3...",
     CsvURL: ["https://s3...", "https://s3..."],
     JsonURL: ["https://s3...", "https://s3..."]
   }
   ↓
7. Tool returns to agent:
   {
     "success": true,
     "csv_urls": [...],
     "json_urls": [...],
     "script_url": "...",
     "explanation_url": "..."
   }
   ↓
8. Agent synthesizes response:
   "Your datasets are ready! Download links: [CSV 1] [CSV 2] [JSON 1]..."
   ↓
9. Frontend renders clickable download links
```

#### Flow 5: Session History (Your Data Page)

```
1. User navigates to "Your Data" page
   ↓
2. Frontend → API Gateway → Lambda
   - Query: list_user_datasets(user_id, session_id)
   ↓
3. Lambda queries DynamoDB:
   - Query by SessionID (from Cognito user context)
   - Sort by Timestamp descending
   ↓
4. Lambda returns:
   [{
     timestamp: "...",
     schema_url: "...",
     csv_urls: [...],
     json_urls: [...],
     script_url: "..."
   }, ...]
   ↓
5. Frontend renders history table:
   - Timestamp
   - Dataset count
   - Action buttons: Re-download, View Schema, Refine (resume chat)
```

## Patterns to Follow

### Pattern 1: Tool-Driven Script Generation
**What:** Agent doesn't generate data directly; it generates a Python script that generates data.

**Why:**
- Enables unlimited complexity (Faker, numpy distributions, temporal patterns)
- Reproducibility (script can be re-run with same seed)
- Auditability (script shows exactly what was generated)
- Lambda timeout mitigation (script generation is fast; execution is cached)

**Implementation:**
```python
@tool
def generate_script_tool(use_case: str, field_definitions: list, num_files: int):
    """Generate a Python DataGenerator class based on user requirements."""
    prompt = construct_detailed_prompt(use_case, field_definitions, num_files)
    response = bedrock_client.invoke_model(
        modelId="us.anthropic.claude-3-5-haiku-20241022-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 200000,
            "messages": [{"role": "user", "content": prompt}]
        })
    )
    full_text = extract_text(response)
    python_code = extract_code_block(full_text)
    return {"success": True, "explanation": full_text, "script": python_code}
```

### Pattern 2: Dynamic Script Execution in Lambda
**What:** Dynamically import and execute user-generated Python code within Lambda sandbox.

**Why:**
- No need for separate execution infrastructure
- Controlled environment (Lambda timeout, memory limits)
- Can use pre-installed dependencies (Faker, pandas, numpy)

**Implementation:**
```python
@tool
def execute_script_tool(python_code: str):
    """Execute generated script and return schema + preview."""
    # Dynamic import
    spec = importlib.util.spec_from_loader('generated_module', loader=None)
    module = importlib.util.module_from_spec(spec)
    sys.modules['generated_module'] = module
    exec(python_code, module.__dict__)

    # Instantiate and execute
    generator = module.DataGenerator()
    dataframes = generator.generate_datasets()  # Returns list[pd.DataFrame]
    schema_json = generator.generate_schema()   # Returns dict

    # Extract preview (first 100 rows of first dataset)
    preview_rows = dataframes[0].head(100).to_dict('records')

    return {
        "success": True,
        "schema": schema_json,
        "preview_rows": preview_rows,
        "num_datasets": len(dataframes),
        "total_rows": sum(len(df) for df in dataframes)
    }
```

**Security considerations:**
- Lambda execution role has minimal permissions (S3 write, DynamoDB write only)
- Generated code runs in isolated Lambda environment (no network access beyond AWS APIs)
- Timeout protection (15 min max Lambda timeout)
- Memory limits (configurable, recommend 3 GB for large datasets)

### Pattern 3: Parallel S3 Upload with ThreadPoolExecutor
**What:** Upload multiple large files to S3 concurrently to avoid Lambda timeout.

**Why:**
- Sequential upload of 10+ datasets (10K rows each) can exceed Lambda timeout
- ThreadPoolExecutor leverages boto3's thread-safe S3 client
- Reduces upload time by 5-10x for multi-dataset generation

**Implementation:**
```python
from concurrent.futures import ThreadPoolExecutor

@tool
def export_dataset_tool(python_code: str, format: str, session_id: str):
    """Export datasets to S3 in requested format."""
    # Re-execute script to generate fresh DataFrames
    generator = execute_script_in_memory(python_code)
    dataframes = generator.generate_datasets()

    # Parallel upload
    csv_urls = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for i, df in enumerate(dataframes):
            csv_key = f"{timestamp}_{session_id}/data_csv/dataset_{i+1}.csv"
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            futures.append(executor.submit(upload_to_s3, csv_key, csv_buffer.getvalue()))

        for future in futures:
            csv_urls.append(future.result())  # Presigned URL

    # Store URLs in DynamoDB for history
    store_presigned_urls(session_id, timestamp, csv_urls, ...)

    return {"success": True, "csv_urls": csv_urls}
```

### Pattern 4: Stateless Tool Functions with State Passing
**What:** Tools don't maintain state between calls; agent passes context explicitly.

**Why:**
- Aligns with Strands framework design
- Enables conversation branching ("generate different script", "refine previous")
- Simplifies testing and debugging

**Implementation:**
```python
# Agent conversation flow:
# Turn 1: User describes requirements
#   → Agent: "Got it. What fields do you need?"
#
# Turn 2: User specifies fields
#   → Agent invokes: generate_script_tool(use_case, fields, num_files)
#   → Agent: "Here's what I'll generate: [explanation]"
#
# Turn 3: User: "Show me a preview"
#   → Agent invokes: execute_script_tool(script_from_turn2)
#   → Agent updates schema panel + preview panel
#
# Turn 4: User: "Export as CSV"
#   → Agent invokes: export_dataset_tool(script_from_turn2, "csv", session_id)
#   → Agent: "Download links: [URLs]"
```

**State managed by:**
- **Conversation history:** S3SessionManager (InteractiveAgent built-in)
- **Generated artifacts:** S3 bucket with organized folder structure
- **Metadata:** DynamoDB for query/retrieval by session

### Pattern 5: Template-Enforced Script Structure
**What:** System prompt includes a strict template that generated scripts must follow.

**Why:**
- Tools expect specific class name (`DataGenerator`) and methods (`generate_datasets()`, `generate_schema()`)
- Dynamic import requires consistent structure for `exec()` to work
- Schema format must be predictable for frontend parsing

**Template:**
```python
class DataGenerator:
    def __init__(self, ...):
        # Initialize Faker, set seeds, define constants
        pass

    def generate_datasets(self) -> list[pd.DataFrame]:
        """Generate N datasets, each as a pandas DataFrame."""
        # MUST return list of DataFrames
        return [df1, df2, ...]

    def generate_schema(self) -> dict:
        """Generate JSON schema with column definitions."""
        return {
            "columns": [
                {
                    "columnName": "Field_Name",
                    "dataType": "String",
                    "description": "...",
                    "constraint": "range or N/A"
                }
            ]
        }
```

**Validation in tool:**
```python
# After exec, verify expected structure
if not hasattr(module, 'DataGenerator'):
    return {"success": False, "error": "Generated script missing DataGenerator class"}

generator = module.DataGenerator()
if not callable(getattr(generator, 'generate_datasets', None)):
    return {"success": False, "error": "DataGenerator missing generate_datasets method"}
```

### Pattern 6: Progressive Enhancement (Schema → Preview → Export)
**What:** Three-step workflow where each step builds on previous, with frontend updates at each stage.

**Why:**
- User gets immediate feedback (schema renders before preview)
- Preview validates correctness before committing to full generation
- Large exports don't block conversation (can continue chatting while export runs)

**Flow:**
```
Step 1: Generate Script
  - Agent gathers requirements via conversation
  - Calls: generate_script_tool()
  - Frontend: Shows "Generating..." spinner
  - Result: "I've created a script using Faker. Ready to preview?"

Step 2: Execute Script for Preview
  - User: "Yes, show me"
  - Calls: execute_script_tool()
  - Frontend: Schema panel updates, Preview panel shows first 100 rows
  - Result: User can inspect before committing to full generation

Step 3: Export Full Dataset
  - User: "Looks good, download CSV"
  - Calls: export_dataset_tool()
  - Frontend: Shows progress, then download links
  - Result: User downloads, can re-download from history later
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Data Generation in Agent Tool
**What goes wrong:** Tool directly generates and returns 10K rows of JSON to agent.

**Why bad:**
- Token limits: 10K rows = massive payload, exceeds response size limits
- No reproducibility: Can't re-run generation with same parameters
- No auditability: Can't inspect logic after generation

**Instead:** Generate script first, execute script separately. Return only schema + preview (first 100 rows).

### Anti-Pattern 2: Storing DataFrames in Session State
**What goes wrong:** After execution, store DataFrames in S3 session state for re-use.

**Why bad:**
- DataFrame serialization is expensive and fragile (pickle issues)
- Session state balloons (each DataFrame = 10K rows × N columns)
- Lambda memory pressure when loading large session state

**Instead:** Store only the Python script in session state. Re-execute script when needed (execution is fast: <30s for 10K rows).

### Anti-Pattern 3: Synchronous Sequential Upload
**What goes wrong:** Upload datasets one-by-one in a loop.

**Why bad:**
- Lambda timeout risk: 10 datasets × 5s/upload = 50s (approaching 15 min limit with other operations)
- Poor utilization: CPU idle while waiting for S3 PUT to complete

**Instead:** Use ThreadPoolExecutor for parallel uploads (see Pattern 3).

### Anti-Pattern 4: Presigned URLs in Chat Messages
**What goes wrong:** Agent returns presigned URLs in conversational text, user copies/pastes.

**Why bad:**
- Poor UX: URLs are long, ugly, error-prone to copy
- Accessibility issues: Screen readers read entire URL
- Security: URLs visible in chat history, logs

**Instead:** Return URLs as structured data. Frontend renders as clickable download buttons with friendly labels ("Download CSV 1").

### Anti-Pattern 5: No Schema Validation Before Execution
**What goes wrong:** Execute generated script without checking structure.

**Why bad:**
- Runtime errors if script doesn't follow template
- Cryptic error messages for users ("AttributeError: 'module' object has no attribute 'DataGenerator'")
- Wasted Lambda invocations and execution time

**Instead:** Parse generated script after generation, verify class/method names exist before calling `execute_script_tool`.

## Scalability Considerations

| Concern | At 10 users | At 100 users | At 1K users |
|---------|-------------|--------------|-------------|
| **API Gateway throughput** | Default limits sufficient | Default limits sufficient | Monitor throttling; request increase if needed |
| **Lambda concurrency** | 1-2 concurrent invocations | 10-20 concurrent | 100-200 concurrent; may need reserved concurrency |
| **S3 object count** | ~100 objects (10 users × 10 datasets avg) | ~1K objects | ~10K objects; consider lifecycle policies |
| **DynamoDB RCU/WCU** | On-demand mode sufficient | On-demand mode sufficient | Consider provisioned capacity for cost optimization |
| **Lambda timeout** | 15 min sufficient for 100K rows | 15 min sufficient | Consider splitting very large datasets (>1M rows) across multiple exports |
| **Session state size** | <1 MB (conversation + script) | <1 MB per session | Monitor S3 costs; implement session expiry (30 days) |
| **Bedrock throttling** | Rare (few script generations/min) | Monitor InvokeModel TPS | Request quota increase; implement exponential backoff |

**Lambda sizing recommendations:**
- Memory: 3 GB (balance between performance and cost)
- Timeout: 15 min (allows large dataset generation + parallel upload)
- Ephemeral storage: 10 GB (sufficient for in-memory DataFrames + temp CSV buffers)
- Concurrency: Start with default (1000), monitor throttling

**Cost optimization:**
- Use Claude 3.5 Haiku for script generation (90% cheaper than Sonnet, sufficient quality)
- Implement S3 lifecycle policy: delete datasets >90 days (users re-generate if needed)
- DynamoDB on-demand mode for unpredictable traffic (switch to provisioned if usage stabilizes)
- CloudFront caching: 1 hour TTL for static assets

## Build Order

### Phase 1: Core Agent + Single Tool (Script Generation)
**Goal:** Prove conversational script generation works.

**Components:**
1. InteractiveAgent construct instantiation (stack file)
2. System prompt: DataSynth persona + single tool definition
3. `generate_script_tool` implementation (Python @tool)
4. Basic test: describe use case → receive generated script

**Why first:** Validates the agent can understand requirements and generate valid Python. No execution complexity yet.

**Deliverables:**
- Agent responds to user messages
- Tool generates DataGenerator class matching template
- Script stored in conversation history

---

### Phase 2: Script Execution + Preview
**Goal:** Execute generated scripts and show schema + preview rows.

**Components:**
1. `execute_script_tool` implementation
2. Dynamic import logic (importlib + exec)
3. Schema JSON extraction
4. Preview row extraction (first 100)
5. Lambda dependencies: Faker, pandas, numpy in layer

**Why second:** Builds on Phase 1. Proves generated scripts are valid and executable.

**Deliverables:**
- Tool executes script in Lambda
- Returns schema JSON + preview rows
- Agent can describe preview to user

---

### Phase 3: Export + S3 Storage
**Goal:** Generate full datasets, upload to S3, return download URLs.

**Components:**
1. `export_dataset_tool` implementation
2. Parallel upload with ThreadPoolExecutor
3. Presigned URL generation
4. S3 bucket with organized folder structure
5. KMS encryption for bucket

**Why third:** Depends on Phase 2 (script execution). Adds persistence layer.

**Deliverables:**
- Full datasets uploaded to S3
- Presigned URLs returned
- User can download CSV/JSON files

---

### Phase 4: Metadata + History
**Goal:** Track generated datasets, enable "Your Data" page.

**Components:**
1. DynamoDB table (SessionID, Timestamp, URLs)
2. URL storage in `export_dataset_tool`
3. History query API endpoint
4. Frontend "Your Data" page

**Why fourth:** Depends on Phase 3 (export). Adds multi-session tracking.

**Deliverables:**
- Each export logged to DynamoDB
- Users can view history of previous generations
- Re-download links work beyond 1 hour (re-generate presigned URL on demand)

---

### Phase 5: Frontend UI (Split-Panel)
**Goal:** Modern React UI with chat + schema/preview panels.

**Components:**
1. WebApp construct instantiation
2. React app with split-panel layout
3. Chat component (message list, input, streaming)
4. Schema panel (data table with column definitions)
5. Preview panel (data grid with first 100 rows)
6. Download buttons (CSV, JSON, XML)

**Why fifth:** Functional backend (Phases 1-4) enables focused UI development. Can test with backend before UI is polished.

**Deliverables:**
- Chat interface with streaming responses
- Live schema/preview updates
- Download buttons trigger export tool

---

### Phase 6: Scenarios + Direct Editing
**Goal:** Pre-built templates and schema editing without re-prompting agent.

**Components:**
1. Scenarios page with template definitions
2. Template → auto-generate script flow (pre-fill use case + fields)
3. Schema table with editable cells
4. Schema edit → regenerate script tool

**Why last:** Nice-to-have features. Core value (conversational generation) already works.

**Deliverables:**
- Users can start from templates
- Users can tweak schema directly in table
- Agent regenerates script based on edited schema

---

## Dependency Graph

```
Phase 1 (Agent + Script Gen)
  └─ Phase 2 (Execution + Preview)
      └─ Phase 3 (Export + S3)
          ├─ Phase 4 (Metadata + History)
          └─ Phase 5 (Frontend UI)
              └─ Phase 6 (Scenarios + Editing)
```

**Critical path:** Phases 1 → 2 → 3 → 5 (MVP with chat + download)

**Parallel work opportunities:**
- Phase 4 (DynamoDB) can start alongside Phase 3
- Phase 5 (Frontend) can start with mocked backend responses

**Integration points:**
- Phase 2 → Phase 5: Frontend expects specific schema JSON format
- Phase 3 → Phase 5: Frontend expects structured URL response (not plain text)
- Phase 4 → Phase 5: History API contract (query params, response shape)

## Sources

**High Confidence (Reference Implementation):**
- `/Users/feffendi/Documents/GitHub/cdk-appmod-catalog-blueprints4/data-generator-ref/datasynth-agent-action-group/generate_data.py` — Original Lambda action group showing script generation, execution, and S3 upload patterns
- `/Users/feffendi/Documents/GitHub/cdk-appmod-catalog-blueprints4/data-generator-ref/datasynth-agent-action-group/lambda_function.py` — Original Lambda handler showing Bedrock Agent action group protocol

**High Confidence (Existing Constructs):**
- `.planning/codebase/ARCHITECTURE.md` — InteractiveAgent architecture (FastAPI, streaming, session management, Cognito auth)
- `CLAUDE.md` — Repository patterns (Strands @tool decorator, construct development standards)

**Medium Confidence (AWS Documentation - implied from code):**
- Bedrock Agent Runtime API (streaming responses)
- Cognito Authorizer integration with API Gateway
- S3 presigned URL generation (boto3 standard pattern)
- ThreadPoolExecutor for parallel S3 uploads (Python standard library)

**Design Decisions (Architected for this project):**
- Three-tool pattern (generate → execute → export) — designed to balance Lambda timeout, reproducibility, and UX
- Progressive enhancement flow — designed to provide incremental feedback
- Template enforcement in system prompt — designed to enable dynamic import without complex parsing

---

*Architecture patterns researched and documented: 2026-03-01*
