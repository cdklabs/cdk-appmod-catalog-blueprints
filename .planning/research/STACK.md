# Technology Stack Research

**Domain:** AI-Powered Synthetic Data Generator (DataSynth)
**Researched:** 2026-03-01

## Required Stack (Locked by Repository Constraints)

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **IaC** | AWS CDK v2 (TypeScript) | ^2.218.0 | Repository standard, JSII multi-language |
| **Build** | Projen | Managed by cdklabs-projen-project-types | Never edit package.json/tsconfig directly |
| **Agent Backend** | InteractiveAgent construct | In-repo (`use-cases/framework/agents/interactive-agent.ts`) | Provides Cognito auth, API Gateway, streaming, session mgmt |
| **Frontend Hosting** | WebApp construct | In-repo (`use-cases/webapp/`) | CloudFront + S3 hosting |
| **Agent Framework** | Strands SDK | Python @tool decorator | Repo standard for all agent tools |
| **AI Models** | Amazon Bedrock | Claude 3.5 Haiku/Sonnet | Script generation + conversation |
| **Auth** | Amazon Cognito | User pools via InteractiveAgent | Built into construct |
| **API** | API Gateway + Lambda (FastAPI + LWA) | Via InteractiveAgent | Streaming SSE responses |

## Data Layer

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Session State** | S3 (via S3SessionManager) | Conversation history, built into InteractiveAgent |
| **Dataset Storage** | S3 Bucket (KMS encrypted) | Generated scripts, datasets (CSV/JSON/XML), schemas |
| **Metadata** | DynamoDB Table (KMS encrypted) | Session→dataset mapping, presigned URL tracking, history queries |

## Lambda Runtime Dependencies

| Library | Purpose | Notes |
|---------|---------|-------|
| **pandas** | DataFrame creation, CSV/JSON export | Core data manipulation |
| **numpy** | Statistical distributions, random seeds | Correlated fields, realistic patterns |
| **faker** | Synthetic data generation | Names, addresses, transactions, etc. |
| **random** | Seeded randomness | Reproducibility |
| **boto3** | S3 upload, DynamoDB writes, Bedrock invocation | AWS SDK |
| **importlib** | Dynamic script loading | `exec()` of generated Python |

### Lambda Layer Strategy

Package pandas/numpy/faker as a Lambda Layer to avoid bundling in each deployment. Reference implementation bundles these inline — new implementation should use `@aws-cdk/aws-lambda-python-alpha` PythonLayerVersion for cleaner packaging.

## Frontend Stack

| Technology | Purpose | Notes |
|-----------|---------|-------|
| **React** | SPA framework | Standard in AWS ecosystem |
| **TypeScript** | Type safety | Consistent with backend |
| **CSS Variables** | Dark theme with teal/orange accents | Per mockup (`datasynth-mockup.png`) |
| **Fetch API / EventSource** | SSE streaming from API Gateway | For real-time agent responses |

### Key UI Libraries (Recommended)

| Library | Purpose | Alternative |
|---------|---------|-------------|
| **@tanstack/react-table** | Data preview grid (sortable, paginated) | AG Grid (heavier) |
| **react-markdown** | Render agent markdown responses | remark |
| **Tailwind CSS** or **CSS Modules** | Styling approach | Styled-components |

*Note: Final library choices deferred to phase planning. Keep dependencies minimal.*

## Infrastructure Topology

```
CloudFront (WebApp)
├── S3 Origin: React SPA bundle
└── API Gateway Origin: /api/* path pattern
    └── Lambda (FastAPI + LWA)
        ├── Bedrock Agent Runtime
        │   └── Claude 3.5 Haiku (script gen)
        │   └── Claude 3.5 Sonnet (conversation)
        ├── S3 Bucket (datasets, scripts)
        └── DynamoDB Table (metadata)

Cognito User Pool
├── Token issuance
└── API Gateway Authorizer
```

## Version Constraints

- **Node.js**: >= 18.12.0 (Lambda runtime + CDK CLI)
- **Python**: 3.11+ (Lambda runtime for tools)
- **CDK**: ^2.218.0 (peer dependency)
- **JSII**: ~5.9.5 (multi-language compilation)

## What NOT to Use

| Technology | Why Not |
|-----------|---------|
| **AppSync** | InteractiveAgent already provides API Gateway + streaming |
| **Step Functions** | Overkill for 3-tool linear flow; agent orchestration is sufficient |
| **ECS/Fargate** | Lambda sufficient for MVP; revisit for >100K row datasets |
| **OpenSearch** | No full-text search needed; DynamoDB handles metadata queries |
| **External frameworks (LangChain, etc.)** | Must use Strands per repository standard |

## Sources

- Repository `.projenrc.ts` — CDK version, JSII targets, build configuration
- `CLAUDE.md` — Framework requirements, construct patterns, coding standards
- `use-cases/framework/agents/` — InteractiveAgent implementation details
- `use-cases/webapp/` — WebApp construct implementation
- `data-generator-ref/` — Reference implementation dependencies
- `.planning/codebase/STACK.md` — Existing codebase technology inventory

---

*Stack research completed: 2026-03-01*
