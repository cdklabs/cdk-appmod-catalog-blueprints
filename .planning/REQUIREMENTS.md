# Requirements: DataSynth

**Defined:** 2026-03-01
**Core Value:** Users can go from a natural language description to a downloadable, realistic synthetic dataset — iteratively refined through conversation — without writing any code.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Chat & Conversation

- [x] **CHAT-01**: User can send messages to AI agent through a chat interface
- [x] **CHAT-02**: Agent responses stream in real-time (token-by-token via SSE)
- [x] **CHAT-03**: User authenticates via Cognito before accessing chat
- [x] **CHAT-04**: Conversation history persists within a session
- [x] **CHAT-05**: Agent iteratively gathers dataset requirements (use case, fields, constraints, distributions, row count) before generating

### Script Generation

- [x] **GEN-01**: Agent generates a Python DataGenerator class based on user-described requirements
- [x] **GEN-02**: Generated script follows enforced template (DataGenerator class with `generate_datasets()` and `generate_schema()` methods)
- [x] **GEN-03**: System prompt pins dependency versions matching Lambda layer (pandas, numpy, faker)
- [x] **GEN-04**: User inputs are sanitized before inclusion in generation prompt (strip injection patterns)
- [x] **GEN-05**: Generated code is validated via AST parsing before execution (reject unauthorized imports, file I/O, network calls)

### Script Execution & Preview

- [x] **EXEC-01**: Agent executes generated script in Lambda and returns schema + preview (first 100 rows)
- [x] **EXEC-02**: Script execution is sandboxed (restricted imports whitelist: pandas, numpy, faker, random, datetime only)
- [x] **EXEC-03**: Execution Lambda has minimal IAM permissions (no S3/DynamoDB/Bedrock access from execution context)
- [x] **EXEC-04**: Hard row limit enforced (error if >100K rows requested per dataset)
- [x] **EXEC-05**: Schema panel displays column definitions (name, type, description, constraint)
- [x] **EXEC-06**: Preview panel displays sample rows in tabular format

### Export & Persistence

- [x] **EXPT-01**: User can export full dataset as CSV
- [x] **EXPT-02**: User can export full dataset as JSON
- [x] **EXPT-03**: Datasets uploaded to S3 with KMS encryption via parallel upload (ThreadPoolExecutor)
- [x] **EXPT-04**: Generated script persisted to S3 alongside data (reproducibility)
- [x] **EXPT-05**: S3 folder structure organized: `generated/{timestamp}_{sessionId}/script|data_csv|data_json|schema_json/`
- [x] **EXPT-06**: Presigned URLs generated for download links

### Frontend UI

- [x] **UI-01**: Split-panel layout — left sidebar (navigation), center (chat), right top (schema), right bottom (preview)
- [x] **UI-02**: Dark theme with teal/orange accent colors per mockup
- [x] **UI-03**: Download buttons rendered as UI elements (not raw URLs in chat)
- [x] **UI-04**: Schema and preview panels update live when agent returns results
- [x] **UI-05**: Responsive design — panels stack vertically on mobile

### Infrastructure

- [x] **INFRA-01**: CDK example stack using InteractiveAgent construct for backend
- [ ] **INFRA-02**: CDK example stack using WebApp construct for frontend hosting
- [x] **INFRA-03**: Lambda layer packaging pandas, numpy, faker dependencies
- [x] **INFRA-04**: S3 bucket with KMS encryption and enforceSSL
- [x] **INFRA-05**: Example includes README with deployment instructions
- [x] **INFRA-06**: Example includes cdk.json, package.json, tsconfig.json, app.ts

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### History & Metadata

- **HIST-01**: DynamoDB table tracks generated datasets per session (SessionID, Timestamp, S3 keys)
- **HIST-02**: "Your Data" page shows history of previous generations
- **HIST-03**: User can re-download datasets from history (on-demand presigned URL regeneration)
- **HIST-04**: User can resume/refine a previous dataset through new chat session

### Scenarios & Templates

- **SCEN-01**: Scenarios page with pre-built dataset templates (Fraud Detection, IoT, E-Commerce, Healthcare, Customer Demographics)
- **SCEN-02**: Clicking a template auto-fills chat with pre-defined use case and fields
- **SCEN-03**: User can modify template-loaded requirements via conversation before generation

### Advanced Features

- **ADV-01**: Direct schema editing — users can tweak fields in the schema table without chat
- **ADV-02**: Schema edit triggers silent script regeneration
- **ADV-03**: Export to XML format
- **ADV-04**: Multi-domain Faker providers (domain-specific distributions: log-normal for financial, bimodal for healthcare, Poisson for e-commerce)
- **ADV-05**: Schema versioning with rollback capability

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New reusable construct | This is an example app; extract a construct later if the pattern proves reusable |
| Real-time collaborative editing | Single user sessions only |
| Data validation against external schemas | Generated data is self-contained |
| Streaming large dataset previews | Preview shows sample rows, full dataset is downloaded |
| ECS/Fargate execution | Lambda sufficient for MVP (<=100K rows); revisit if needed |
| Step Functions orchestration | Agent tool chain is linear, Step Functions adds unnecessary complexity |
| OAuth/external identity providers | Cognito user pool sufficient for example app |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHAT-01 | Phase 1 | Complete |
| CHAT-02 | Phase 1 | Complete |
| CHAT-03 | Phase 1 | Complete |
| CHAT-04 | Phase 1 | Complete |
| CHAT-05 | Phase 1 | Complete |
| GEN-01 | Phase 1 | Complete |
| GEN-02 | Phase 1 | Complete |
| GEN-03 | Phase 1 | Complete |
| GEN-04 | Phase 1 | Complete |
| GEN-05 | Phase 2 | Complete |
| EXEC-01 | Phase 2 | Complete |
| EXEC-02 | Phase 2 | Complete |
| EXEC-03 | Phase 2 | Complete |
| EXEC-04 | Phase 2 | Complete |
| EXEC-05 | Phase 4 | Complete |
| EXEC-06 | Phase 4 | Complete |
| EXPT-01 | Phase 3 | Complete |
| EXPT-02 | Phase 3 | Complete |
| EXPT-03 | Phase 3 | Complete |
| EXPT-04 | Phase 3 | Complete |
| EXPT-05 | Phase 3 | Complete |
| EXPT-06 | Phase 3 | Complete |
| UI-01 | Phase 4 | Complete |
| UI-02 | Phase 4 | Complete |
| UI-03 | Phase 4 | Complete |
| UI-04 | Phase 4 | Complete |
| UI-05 | Phase 4 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 4 | Pending |
| INFRA-03 | Phase 2 | Complete |
| INFRA-04 | Phase 3 | Complete |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0
- Complete: 18 (Phase 1: 12, Phase 2: 6)
- Pending: 15

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-03 after 02-02 completion (EXEC-01, EXEC-03, EXEC-04, INFRA-03)*
