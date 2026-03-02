# Roadmap: DataSynth

## Overview

DataSynth delivers an AI-powered synthetic data generator where users describe desired datasets through natural conversation and download production-ready files. The journey progresses through five phases: establishing the conversational agent backend with script generation capabilities, adding secure execution and preview functionality, implementing full dataset export with S3 persistence, building the split-panel frontend UI that brings all backend features together, and finalizing with comprehensive documentation. Each phase builds on the previous, with security and core functionality prioritized before UI polish.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Agent Infrastructure + Script Generation** - Conversational backend with Python script generation
- [x] **Phase 2: Script Execution + Preview** - Secure sandboxed execution with schema and sample data
- [x] **Phase 3: Export + S3 Persistence** - Full dataset generation with multi-format download (completed 2026-03-03)
- [ ] **Phase 4: Frontend UI** - Split-panel interface integrating all backend features
- [ ] **Phase 5: Documentation + Polish** - Deployment guide and example finalization

## Phase Details

### Phase 1: Agent Infrastructure + Script Generation
**Goal**: Users can authenticate and converse with an AI agent that generates Python scripts based on their dataset requirements
**Depends on**: Nothing (first phase)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, GEN-01, GEN-02, GEN-03, GEN-04, INFRA-01, INFRA-06
**Success Criteria** (what must be TRUE):
  1. User can authenticate via Cognito before accessing the application
  2. User can send messages to the AI agent through a chat interface and receive streaming responses token-by-token
  3. Agent iteratively gathers dataset requirements (use case, fields, constraints, distributions, row count) through conversation before generating code
  4. Agent generates a Python DataGenerator class that follows the enforced template structure (generate_datasets and generate_schema methods)
  5. Generated scripts use pinned dependency versions matching Lambda layer (pandas, numpy, faker) with no version mismatches
  6. User inputs are sanitized to prevent prompt injection attacks before inclusion in generation prompts
  7. CDK example stack successfully deploys InteractiveAgent construct with Cognito, API Gateway, Lambda, and Bedrock integration
**Plans**: 3 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — CDK infrastructure foundation (app, stack, config files)
- [x] 01-02-PLAN.md — Agent resources (system prompts, generate_script tool)
- [x] 01-03-PLAN.md — Wire resources to InteractiveAgent + BatchAgent and add README

### Phase 2: Script Execution + Preview
**Goal**: Generated scripts execute securely in a sandboxed Lambda environment, returning schema definitions and sample data
**Depends on**: Phase 1
**Requirements**: GEN-05, EXEC-01, EXEC-02, EXEC-03, EXEC-04, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Generated code is validated via AST parsing before execution, rejecting unauthorized imports, file I/O, and network calls
  2. Agent executes generated script in Lambda and returns structured schema (column names, types, descriptions, constraints) plus first 100 rows
  3. Script execution is sandboxed with restricted imports whitelist (pandas, numpy, faker, random, datetime only)
  4. Execution Lambda has minimal IAM permissions with no access to S3, DynamoDB, or Bedrock from execution context
  5. Hard row limit enforced (error returned if user requests more than 100,000 rows per dataset)
  6. Lambda layer successfully packages pandas, numpy, and faker dependencies with correct versions
**Plans**: 2 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — AST validator and execute_script tool with self-healing
- [x] 02-02-PLAN.md — Execution Lambda with pandas/numpy/faker layer and CDK stack wiring

### Phase 3: Export + S3 Persistence
**Goal**: Users can export full datasets in multiple formats with all artifacts persisted to S3 for reproducibility
**Depends on**: Phase 2
**Requirements**: EXPT-01, EXPT-02, EXPT-03, EXPT-04, EXPT-05, EXPT-06, INFRA-04
**Success Criteria** (what must be TRUE):
  1. User can export full dataset as CSV with proper quoting and escaping for special characters
  2. User can export full dataset as JSON with structured array format
  3. Datasets upload to S3 with KMS encryption via parallel upload (ThreadPoolExecutor) reducing export time
  4. Generated Python script persists to S3 alongside data files for reproducibility
  5. S3 folder structure follows organized pattern (generated/{timestamp}_{sessionId}/script|data_csv|data_json|schema_json/)
  6. Presigned URLs with 24-hour expiry are generated for secure download links
  7. S3 bucket has KMS encryption enabled and enforceSSL configured
**Plans**: 2 plans in 2 waves

Plans:
- [x] 03-01-PLAN.md — S3 infrastructure and export Lambda with chunked generation
- [x] 03-02-PLAN.md — export_dataset tool and InteractiveAgent wiring

### Phase 4: Frontend UI
**Goal**: Users interact with a polished split-panel UI showing chat, live schema updates, data preview, and download buttons
**Depends on**: Phase 3
**Requirements**: EXEC-05, EXEC-06, UI-01, UI-02, UI-03, UI-04, UI-05, INFRA-02
**Success Criteria** (what must be TRUE):
  1. Split-panel layout renders correctly with left sidebar (navigation), center (chat), right top (schema), right bottom (preview)
  2. Dark theme with blue/amber accent colors (#0f172a slate-900 background, #3b82f6 blue-500 primary, #f59e0b amber-500 secondary) follows Tailwind design system
  3. Schema panel displays column definitions in tabular format updating live when agent returns results
  4. Preview panel displays first 100 sample rows in tabular format updating live when agent returns results
  5. Download buttons for CSV and JSON render as styled UI elements (not raw URLs in chat messages)
  6. Responsive design causes panels to stack vertically on mobile devices without breaking layout
  7. CDK example stack using WebApp construct successfully deploys CloudFront distribution hosting React application
**Plans**: 4 plans in 3 waves

Plans:
- [x] 04-01-PLAN.md — Project scaffold with Vite + React + Tailwind and split-panel layout
- [x] 04-02-PLAN.md — Chat panel with SSE streaming and React Context state management
- [ ] 04-03-PLAN.md — Schema and Preview panels with @tanstack/react-table
- [ ] 04-04-PLAN.md — CDK Frontend construct integration and deployment verification

### Phase 5: Documentation + Polish
**Goal**: Example application is fully documented with clear deployment instructions and ready for repository inclusion
**Depends on**: Phase 4
**Requirements**: INFRA-05
**Success Criteria** (what must be TRUE):
  1. README includes comprehensive deployment instructions with prerequisites, setup steps, and troubleshooting
  2. README includes architecture diagram showing InteractiveAgent, WebApp, S3, and Bedrock integration
  3. README includes usage examples demonstrating common dataset generation scenarios
  4. Example includes all required configuration files (cdk.json, package.json, tsconfig.json, app.ts)
  5. Example is added to root README.md, examples/README.md, and use-cases/README.md as required by repository standards
**Plans**: TBD

Plans:
- [ ] 05-01: [Will be defined during planning]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Agent Infrastructure + Script Generation | 3/3 | Complete | 2026-03-02 |
| 2. Script Execution + Preview | 2/2 | Complete | 2026-03-03 |
| 3. Export + S3 Persistence | 2/2 | Complete   | 2026-03-03 |
| 4. Frontend UI | 2/4 | In Progress|  |
| 5. Documentation + Polish | 0/TBD | Not started | - |
