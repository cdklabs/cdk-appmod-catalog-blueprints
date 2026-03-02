# DataSynth — AI-Powered Synthetic Data Generator

## What This Is

An AI-powered synthetic data generator with a conversational chat interface, deployed as an example application in the AppMod Catalog Blueprints repository. Users describe desired dataset scenarios through natural conversation, and the app generates customizable synthetic datasets with intricate patterns (transaction spikes, temporal anomalies, domain-specific distributions). Built on the existing InteractiveAgent and WebApp constructs, with the core innovation being agent-driven Python script generation that produces the actual data.

## Core Value

Users can go from a natural language description to a downloadable, realistic synthetic dataset — iteratively refined through conversation — without writing any code.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Conversational chat interface where users describe desired datasets
- [ ] AI agent iteratively gathers requirements (use case, fields, constraints, distributions)
- [ ] Agent generates a Python script (DataGenerator class) tailored to the user's specifications
- [ ] Script execution produces synthetic data using Faker/numpy/pandas
- [ ] Data Schema panel showing column definitions (name, type, constraints) — live updated
- [ ] Data Preview panel showing sample rows in tabular format — live updated
- [ ] Export to CSV, JSON, and XML formats as downloadable files
- [ ] Both generated script and data persisted to S3 (reproducibility + auditability)
- [ ] Scenarios page — pre-built dataset templates (fraud detection, IoT, e-commerce, etc.)
- [ ] Your Data page — history of previously generated datasets for re-download or refinement
- [ ] Direct schema editing — users can tweak schema fields in the table, not just through chat
- [ ] Multi-domain support — financial, healthcare, IoT, e-commerce, and custom domains
- [ ] Modern split-panel UI — chat left, schema + preview right, dark theme with teal/orange accents

### Out of Scope

- New reusable construct — this is an example app; extract a construct later if the pattern proves reusable
- Real-time collaborative editing — single user sessions only
- Data validation against external schemas — generated data is self-contained
- Streaming large dataset previews — preview shows sample rows, full dataset is downloaded

## Context

**Prior art:** A previous prototype ("hacky architecture") was built ~2 years ago with a similar flow: API Gateway → Lambda → Bedrock Agent → action group Lambda that generates and executes Python scripts. The reference code is in `data-generator-ref/`. The core pattern (agent generates script → script generates data) is proven and will be carried forward.

**Existing constructs to leverage:**
- **InteractiveAgent** (`use-cases/framework/agents/interactive-agent.ts`) — handles Cognito auth, API Gateway, streaming responses, session management. Replaces the old API Gateway + Lambda + Bedrock Agent manual setup.
- **WebApp** (`use-cases/webapp/`) — CloudFront + S3 frontend hosting. Hosts the React chat application.
- **Agent tools** — Python `@tool` functions in the Strands framework replace the old Bedrock action group Lambda.

**Architecture mapping (old → new):**
- API Gateway + Lambda 1 + Bedrock Agent conversation → InteractiveAgent construct
- Lambda 2 action group (generate_data.py) → Strands @tool function
- Manual S3/DynamoDB → Part of construct infrastructure
- Custom frontend → WebApp construct + React application

**UI reference:** Mockup in `datasynth-mockup.png` — split-panel layout with dark theme, chat center, schema panel top-right, preview panel bottom-right.

## Constraints

- **Tech stack**: Must use existing constructs (InteractiveAgent, WebApp) from the repo — no external frameworks
- **Agent framework**: Strands framework with @tool decorator for agent tools (repo standard)
- **JSII compatibility**: Example app doesn't need JSII, but any shared code must be compatible
- **Lambda limits**: Script execution happens in Lambda — dataset size bounded by Lambda memory/timeout (can use large Lambda config)
- **Bedrock models**: Claude models via Bedrock for script generation and conversation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Example app, not construct | Prove the pattern first; extract reusable construct later if validated | — Pending |
| InteractiveAgent for chat backend | Provides Cognito auth, streaming, session management out of the box | — Pending |
| Agent generates Python script, not data directly | Enables unlimited complexity, reproducibility, auditability (proven pattern from prototype) | — Pending |
| WebApp construct for frontend hosting | CloudFront + S3 hosting is sufficient; UI quality comes from the React app, not the construct | — Pending |
| React for frontend | Standard in AWS ecosystem, rich component libraries for data tables and chat UIs | — Pending |
| Skip AgenticDocumentProcessing | Its flow (process incoming documents) doesn't match data generation (produce outgoing data) | — Pending |

---
*Last updated: 2026-03-01 after initialization*
