# Feature Implementation Research

**Domain:** AI-Powered Synthetic Data Generator (DataSynth)
**Researched:** 2026-03-01

## Feature Inventory

Features derived from PROJECT.md Active Requirements with implementation analysis.

### Feature 1: Conversational Chat Interface

**Requirement:** Users describe desired datasets through natural conversation.

**Implementation approach:**
- InteractiveAgent provides the entire backend: Cognito auth → API Gateway → Lambda (FastAPI + LWA) → Bedrock Agent → streaming SSE
- Frontend React component handles message rendering, input, and streaming token display
- System prompt defines the DataSynth persona and available tools

**Key decisions:**
- Chat UI renders markdown (agent explains data patterns in rich text)
- Streaming tokens appear character-by-character (SSE from InteractiveAgent)
- Session persistence via S3SessionManager (built into InteractiveAgent)

**Complexity:** Medium — InteractiveAgent handles backend; frontend chat component is custom.

**Dependencies:** InteractiveAgent construct, WebApp construct, Cognito setup.

---

### Feature 2: AI Agent Requirement Gathering

**Requirement:** Agent iteratively gathers use case, fields, constraints, distributions.

**Implementation approach:**
- System prompt instructs agent to ask clarifying questions before generating
- Agent follows structured interview: use case → fields → constraints → distributions → row count
- Agent confirms requirements before invoking `generate_script_tool`

**Key decisions:**
- Agent should present a schema summary for user approval before generation
- Agent can suggest fields based on use case domain (e.g., "fraud detection" → suggest transaction_id, amount, is_fraud)
- Schema state tracked across conversation turns (critical for iterative refinement — see Pitfall 4)

**Complexity:** Low — Prompt engineering, no additional infrastructure.

---

### Feature 3: Python Script Generation

**Requirement:** Agent generates a DataGenerator class tailored to user specifications.

**Implementation approach:**
- `generate_script_tool` Strands @tool function
- Invokes Bedrock (Claude 3.5 Haiku) with structured prompt containing: user requirements, field definitions, template enforcement (DataGenerator class with `generate_datasets()` and `generate_schema()`)
- Returns: explanation text + extracted Python code

**Key decisions:**
- Template enforcement critical — tools depend on class/method names
- Version pinning in prompt (pandas/numpy/faker versions matching Lambda layer)
- AST validation before returning script to agent

**Complexity:** Medium — Prompt engineering + code extraction + validation.

**Risk:** Pitfalls 1, 2, 5 (exec security, prompt injection, version mismatches).

---

### Feature 4: Script Execution + Data Preview

**Requirement:** Script execution produces synthetic data; preview panel shows sample rows.

**Implementation approach:**
- `execute_script_tool` Strands @tool function
- Dynamic import via `importlib.util.spec_from_loader` + `exec()`
- Instantiate `DataGenerator`, call `generate_datasets()` and `generate_schema()`
- Return schema JSON + first 100 rows as preview

**Key decisions:**
- Preview limited to 100 rows (avoid token/payload limits)
- Schema panel shows column definitions (name, type, description, constraint)
- Preview panel shows tabular data grid
- Both panels update live when tool returns results

**Complexity:** High — Dynamic code execution, security sandboxing, structured data return.

**Risk:** Pitfalls 1, 3, 5, 9 (exec security, Lambda timeout, version mismatches, memory overflow).

---

### Feature 5: Export to CSV, JSON, XML

**Requirement:** Downloadable files in multiple formats.

**Implementation approach:**
- `export_dataset_tool` Strands @tool function
- Re-executes script to generate full DataFrames (not stored in session state — see Anti-Pattern 2)
- Parallel upload to S3 via ThreadPoolExecutor
- Generate presigned URLs for download
- Store metadata in DynamoDB

**Key decisions:**
- CSV: `df.to_csv()` with proper quoting
- JSON: `df.to_json(orient='records')` with ASCII handling
- XML: Custom conversion using `lxml` or `dicttoxml` (not in reference implementation — new requirement)
- Download links rendered as buttons in frontend, not raw URLs

**Complexity:** Medium — Reference implementation covers CSV/JSON; XML is new.

**Risk:** Pitfalls 6, 7 (URL expiration, format edge cases).

---

### Feature 6: S3 Persistence (Scripts + Data)

**Requirement:** Both generated script and data persisted to S3 for reproducibility and auditability.

**Implementation approach:**
- S3 bucket with organized folder structure:
  ```
  generated/{timestamp}_{session_id}/
  ├── script/generated_script.py
  ├── text/explanation.txt
  ├── schema_json/data_schema.json
  ├── data_csv/dataset_1.csv, dataset_2.csv, ...
  ├── data_json/dataset_1.json, dataset_2.json, ...
  └── data_xml/dataset_1.xml, dataset_2.xml, ...
  ```
- KMS encryption at rest, enforceSSL on bucket
- Lifecycle policy: delete after 90 days (configurable)

**Complexity:** Low — Standard S3 patterns, well-covered in reference code.

---

### Feature 7: Scenarios Page (Pre-Built Templates)

**Requirement:** Pre-built dataset templates for common domains (fraud detection, IoT, e-commerce, etc.).

**Implementation approach:**
- Static JSON definitions stored in frontend or S3:
  ```json
  {
    "name": "Fraud Detection",
    "description": "Credit card transactions with fraud indicators",
    "use_case": "Generate a dataset of credit card transactions...",
    "fields": [
      {"name": "transaction_id", "type": "Integer", "constraint": "1-1000000"},
      {"name": "amount", "type": "Float", "constraint": "0.01-50000"},
      {"name": "is_fraud", "type": "Boolean", "constraint": "5% true"}
    ],
    "suggested_rows": 10000
  }
  ```
- Clicking a template auto-fills chat with pre-defined use case and fields
- Agent processes as normal conversation (user can refine before generation)

**Key decisions:**
- Templates stored as static assets in React app (not database)
- Templates are starting points, not rigid — user can modify via chat
- Initial templates: Fraud Detection, IoT Sensor Data, E-Commerce Orders, Healthcare Records, Customer Demographics

**Complexity:** Low — UI component + static data, no backend changes.

---

### Feature 8: Your Data Page (History)

**Requirement:** History of previously generated datasets for re-download or refinement.

**Implementation approach:**
- DynamoDB query by user/session, sorted by timestamp
- API endpoint: `GET /api/history?user_id={cognito_sub}`
- Returns list of previous generations with: timestamp, dataset count, schema summary, download links
- Re-download: generate fresh presigned URLs on demand (not store stale URLs)
- Refine: resume conversation session with previous context

**Key decisions:**
- Store S3 keys in DynamoDB (not presigned URLs — see Pitfall 6)
- Generate presigned URLs on-demand when user clicks download
- "Refine" opens new chat session with previous schema pre-loaded

**Complexity:** Medium — DynamoDB queries + new API endpoint + frontend page.

---

### Feature 9: Direct Schema Editing

**Requirement:** Users can tweak schema fields in the table, not just through chat.

**Implementation approach:**
- Schema panel cells become editable on click (inline editing)
- Editable fields: column name, data type (dropdown), description, constraint
- Add/remove column buttons
- After edit: trigger `generate_script_tool` with updated schema
- No chat message needed — direct schema → script flow

**Key decisions:**
- Editing schema directly creates a "silent" tool invocation (agent generates new script without conversational back-and-forth)
- Schema edit history tracked for undo capability
- Data type dropdown: String, Integer, Float, Boolean, Date, DateTime, UUID, Email, Phone, Address, Custom

**Complexity:** Medium — Interactive table UI + bidirectional sync between schema panel and agent.

---

### Feature 10: Multi-Domain Support

**Requirement:** Financial, healthcare, IoT, e-commerce, and custom domains.

**Implementation approach:**
- Domain knowledge encoded in system prompt + scenario templates
- Each domain has: relevant Faker providers, realistic distribution patterns, domain-specific constraints
- Custom domain: user describes from scratch, agent infers appropriate generators

**Domains and their characteristics:**
| Domain | Key Faker Providers | Distribution Patterns |
|--------|--------------------|-----------------------|
| Financial | credit_card, iban, currency | Amount: log-normal; fraud: 1-5% |
| Healthcare | medical providers, ICD codes | Age: bimodal; diagnosis: Zipf |
| IoT | Sensor readings, device IDs | Temperature: normal ± seasonal |
| E-Commerce | product names, prices, SKUs | Orders: Poisson; revenue: pareto |
| Custom | User-defined | User-specified or agent-inferred |

**Complexity:** Low-Medium — Prompt engineering + template variety.

---

### Feature 11: Split-Panel UI (Dark Theme)

**Requirement:** Chat left, schema + preview right, dark theme with teal/orange accents.

**Implementation approach:**
- Per mockup (`datasynth-mockup.png`):
  - Left sidebar: navigation (Chat, Scenarios, Your Data)
  - Center: chat panel (message history + input)
  - Right top: Data Schema panel (column definitions table)
  - Right bottom: Data Preview panel (sample rows grid)
- Dark theme: `#1a1a2e` background, `#00d4aa` teal accents, `#ff6b35` orange accents
- Responsive: panels stack vertically on mobile

**Complexity:** Medium-High — Custom layout, responsive design, streaming integration, data grid.

---

## Feature Dependency Graph

```
F1 (Chat Interface)
├── F2 (Requirement Gathering) — prompt engineering
├── F3 (Script Generation) — generate_script_tool
│   └── F4 (Script Execution + Preview) — execute_script_tool
│       ├── F5 (Export) — export_dataset_tool
│       │   └── F6 (S3 Persistence)
│       │       └── F8 (History Page)
│       └── F9 (Schema Editing) — bidirectional sync
├── F7 (Scenarios) — template → chat flow
├── F10 (Multi-Domain) — prompt + templates
└── F11 (Split-Panel UI) — wraps all above
```

## MVP vs Post-MVP

| Feature | MVP | Post-MVP | Rationale |
|---------|-----|----------|-----------|
| F1: Chat Interface | Yes | — | Core interaction mode |
| F2: Requirement Gathering | Yes | — | Core agent behavior |
| F3: Script Generation | Yes | — | Core value proposition |
| F4: Script Execution + Preview | Yes | — | Validates generation works |
| F5: Export (CSV, JSON) | Yes | XML later | CSV/JSON sufficient for MVP |
| F6: S3 Persistence | Yes | — | Reproducibility requirement |
| F7: Scenarios | — | Yes | Nice-to-have, not core flow |
| F8: History Page | — | Yes | Requires DynamoDB + API |
| F9: Schema Editing | — | Yes | Enhancement to chat-only flow |
| F10: Multi-Domain | Partial | Full | System prompt covers basics |
| F11: Split-Panel UI | Yes | Polish | Core UX, but can start basic |

## Implementation Effort Matrix

| Feature | Backend | Frontend | Infrastructure | Total |
|---------|---------|----------|---------------|-------|
| F1 | Low (construct) | Medium (chat UI) | Low | Medium |
| F2 | Low (prompt) | None | None | Low |
| F3 | Medium (tool) | None | Low (Bedrock) | Medium |
| F4 | High (exec) | Medium (panels) | Low (layer) | High |
| F5 | Medium (tool) | Low (buttons) | Low (S3) | Medium |
| F6 | Low (S3 ops) | None | Low (bucket) | Low |
| F7 | None | Medium (page) | None | Medium |
| F8 | Medium (API) | Medium (page) | Low (DynamoDB) | Medium |
| F9 | Low (tool call) | High (editable table) | None | Medium-High |
| F10 | Low (prompt) | Low (templates) | None | Low |
| F11 | None | High (layout) | None | High |

## Sources

- PROJECT.md — All 13 active requirements
- `data-generator-ref/` — Reference implementation patterns
- `datasynth-mockup.png` — UI layout reference
- `.planning/research/ARCHITECTURE.md` — Data flows and component boundaries
- `.planning/research/PITFALLS.md` — Risk mapping to features
- `.planning/codebase/ARCHITECTURE.md` — InteractiveAgent capabilities

---

*Feature research completed: 2026-03-01*
