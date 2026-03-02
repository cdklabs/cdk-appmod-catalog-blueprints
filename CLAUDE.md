# CLAUDE.md

## Workflow & Behavioral Standards

### Plan Before Building

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### Verification Before Done

- Never mark a task complete without proving it works
- Run tests, check compilation, demonstrate correctness
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"

### Autonomous Problem Solving

- When given a bug report: just fix it — don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Go fix failing CI tests without being told how

### Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Demand Elegance**: For non-trivial changes, pause and ask "is there a more elegant way?" Skip this for simple, obvious fixes.

**Classify first:** Before any work, determine if it's a construct (`use-cases/`), example (`examples/`), or other. Read the matching guide from `.kiro/steering/` before proceeding.

---

## Project Overview

**AppMod Catalog Blueprints** — a comprehensive library of use case-driven AWS CDK L3 constructs for accelerating serverless development and modernization on AWS.

- **Package**: `@cdklabs/cdk-appmod-catalog-blueprints`
- **License**: Apache-2.0
- **Language**: TypeScript (source), multi-language via JSII (Python, Java, .NET)
- **Framework**: AWS CDK v2 (^2.218.0)
- **Build Tool**: Projen (generates package.json, tsconfig — do NOT edit these manually)
- **Node.js**: >= 18.12.0

## Critical Distinction: Constructs vs Examples

```
CONSTRUCTS (use-cases/)              EXAMPLES (examples/)
├─ Reusable library components       ├─ Deployable applications
├─ Abstract & extensible (OOP)       ├─ Concrete & opinionated
├─ Published to npm via JSII         ├─ Not published
├─ Must have unit + CDK Nag tests    ├─ Demonstrate usage of constructs
└─ Exported in use-cases/index.ts    └─ Include README with deploy steps
```

Never implement reusable construct logic inside example stacks. Always classify work first.

## Repository Structure

```
use-cases/                    # Source TypeScript (compiles to lib/)
├── framework/                # Core AI agent framework
│   ├── agents/               # BaseAgent, BatchAgent, InteractiveAgent
│   │   └── knowledge-base/   # IKnowledgeBase, BedrockKnowledgeBase
│   ├── foundation/           # Network (VPC), EventBridge, AccessLog
│   ├── bedrock/              # Bedrock model utils and IAM
│   └── custom-resource/      # Runtime definitions
├── document-processing/      # Document processing workflows
│   ├── base-document-processing.ts      # Layer 1: Abstract base
│   ├── bedrock-document-processing.ts   # Layer 2: Bedrock impl
│   ├── agentic-document-processing.ts   # Layer 3: Agent-powered
│   └── adapter/              # IAdapter, QueuedS3Adapter
├── webapp/                   # CloudFront + S3 frontend hosting
└── utilities/                # Observability, data masking, IAM utils, test-utils

examples/                     # Ready-to-deploy example applications
lib/                          # Compiled output (generated — do not edit)
test/                         # Integration tests
website/                      # Documentation site
.projenrc.ts                  # Project configuration (edit this, not package.json)
```

## Build & Test Commands

All commands use Projen-backed scripts. Never use ad hoc `tsc` or `jest` directly.

```bash
# Install
npm install

# Build (compile + test + lint + docgen)
npm run build

# Build variants
npm run build:fast          # Skip docgen
npm run build:no-test       # Skip tests (fastest iteration)

# Compile only
npm run compile

# Lint
npm run eslint

# Test — all
npm test

# Test — targeted
npm run test:document-processing:unit
npm run test:webapp:unit
npm run test:cdk-nag:all
npm run test:cdk-nag:document-processing
npm run test:cdk-nag:webapp
npm run test:security

# Test — specific file
npm test -- --testPathPattern="access-log"

# Test — watch mode
npm run test:watch

# After .projenrc.ts changes
npx projen
```

## Coding Standards

### TypeScript

- **Files**: kebab-case (`base-document-processing.ts`), tests: `{name}.test.ts`, CDK Nag: `{name}-nag.test.ts`
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line length**: 150 characters max
- **Strict mode**: All strict flags enabled (`noImplicitAny`, `strictNullChecks`, etc.)
- **Imports**: Ordered — builtin → AWS CDK → constructs → relative, alphabetical within groups
- **Props**: Always `interface` with `readonly` properties, JSDoc on every property
- **Visibility**: `public readonly` for consumer-facing, `protected` for subclass access, `private` for internals
- **Validation**: Validate props early in constructor, throw descriptive errors
- **No manual edits** to `package.json`, `tsconfig.json`, or `API.md` — these are Projen-managed

### Python (Lambda functions and agent tools)

- **Files**: snake_case (`metadata_analyzer.py`)
- **Style**: PEP 8, 4-space indent, type hints, docstrings
- **Tools**: Use `@tool` decorator from `strands`, return structured dicts with `success`/`error` keys
- **Error handling**: Return errors as data, don't raise exceptions from tools

### Member Ordering (enforced by ESLint)

1. Public static fields/methods
2. Protected static fields/methods
3. Private static fields/methods
4. Public instance fields
5. Constructor
6. Public instance methods
7. Protected instance methods
8. Private instance methods

## Architecture Patterns

### Inheritance Models

**Two-Layer** (Base → Concrete): `BaseAgent` → `BatchAgent` / `InteractiveAgent`
**Three-Layer** (Base → Concrete → Specialized): `BaseDocumentProcessing` → `BedrockDocumentProcessing` → `AgenticDocumentProcessing`

### Design Patterns Used

- **Template Method**: Base classes define workflow structure, subclasses fill in steps
- **Strategy**: `IAdapter` for pluggable ingress, `IKnowledgeBase` for vector stores
- **Dependency Injection**: Components accept dependencies via constructor props with defaults
- **Factory Method**: Subclasses create their own specialized resources
- **Interface Segregation**: Small interfaces — `IAdapter`, `IObservable`, `IKnowledgeBase`
- **Property Injection**: Observability applied as cross-cutting concern via `PropertyInjectors`

### Construct Development Checklist

1. Define props interface with JSDoc (`readonly` properties, `@default` tags)
2. Extend appropriate base class or `Construct`
3. Validate props early in constructor
4. Create resources with security defaults (KMS encryption, enforceSSL, least-privilege IAM)
5. Use `protected` for methods subclasses may override
6. Write unit tests + CDK Nag tests
7. Export in `use-cases/index.ts`

## Key Integrations

- **Amazon Bedrock**: Claude models for classification/processing, knowledge bases with vector stores
- **Step Functions**: Workflow orchestration for document processing
- **Lambda**: Node.js and Python runtimes, Powertools for observability
- **S3/DynamoDB/SQS**: Storage, state tracking, message queuing
- **EventBridge**: Event-driven architecture integration
- **Cognito**: Authentication for interactive agents
- **CloudFront/Route 53**: Frontend hosting and DNS

## Document Processing Workflow

```
S3 Upload (raw/) → S3 Event → SQS → Lambda Consumer → Step Functions
  → Classification (Bedrock InvokeModel)
  → Processing (Bedrock or BatchAgent)
  → Enrichment (optional Lambda)
  → Post-Processing (optional Lambda)
  → Success: move to processed/ | Failure: move to failed/
```

Three implementation layers:
1. **BaseDocumentProcessing**: Abstract foundation — implement all 4 steps
2. **BedrockDocumentProcessing**: Bedrock-based classification and processing
3. **AgenticDocumentProcessing**: Replaces processing with BatchAgent + tools

## Agent Framework

- **BaseAgent**: Foundation with IAM, encryption, Powertools, VPC support
- **BatchAgent**: Strands framework, tool loading, JSON extraction, configurable prompts
- **InteractiveAgent**: Real-time streaming with Cognito auth and API Gateway

Tools are Python files with `@tool` decorator, packaged as S3 Assets. System prompts define role, available tools, analysis process, and output format.

## Working with Examples

```bash
cd examples/{use-case}/{example-name}
npm install
npx cdk deploy
```

Examples must include: `app.ts`, stack file, `cdk.json`, `package.json`, `tsconfig.json`, comprehensive `README.md`, sample files, and helper scripts.

## Mandatory: Updating READMEs for New Use Cases or Examples

When adding a new use case construct or example, you **must** update these files to include the new entry:

1. **`README.md`** (root) — add to the "Use Case Building Blocks" tables
2. **`use-cases/README.md`** — add to the "Core Use Cases" or "Foundation and Utilities" tables
3. **`examples/README.md`** — add to the appropriate category table

These are the public-facing indexes of the repository. Failing to update them means new work is invisible to users.

## Deep-Dive References

For detailed guidance beyond this file:

### GSD project state

- **Project definition**: `.planning/PROJECT.md`
- **Roadmap**: `.planning/ROADMAP.md`
- **Session state**: `.planning/STATE.md`
- **Research**: `.planning/research/`
- **Phase plans**: `.planning/phases/`
- **Codebase analysis**: `.planning/codebase/`

### Domain guides (read-only reference)

- **Construct patterns**: `.kiro/steering/construct-development-guide.md`
- **Testing strategies**: `.kiro/steering/testing-guide.md`
- **Document processing**: `.kiro/steering/document-processing-guide.md`
- **Agent framework**: `.kiro/steering/agentic-framework-guide.md`
- **Example development**: `.kiro/steering/example-development-guide.md`
- **Deployment/ops**: `.kiro/steering/deployment-operations.md`
- **Full coding standards**: `.kiro/steering/coding-standards.md`
- **Repository overview**: `.kiro/steering/repository-overview.md`
- **Spec-driven core workflow**: `.kiro/steering/aidlc-specdriven-core-workflow.md`
# CLAUDE.md

## Project Overview

CDK AppMod Catalog Blueprints (`@cdklabs/cdk-appmod-catalog-blueprints`) — a library of reusable AWS CDK L3 constructs for application modernization on AWS. Provides composable, security-first infrastructure components organized by business use cases with multi-language support (TypeScript, Python, Java, .NET via JSII).

**Repository:** https://github.com/cdklabs/cdk-appmod-catalog-blueprints

## Project Structure

```
use-cases/                    # Source code — reusable construct libraries
├── document-processing/      # Document classification, extraction, processing
├── framework/                # Core components (agents, foundation, bedrock, custom-resource)
├── utilities/                # Shared utilities (observability, lambda layers, data loader)
├── webapp/                   # Web app hosting (CloudFront/S3)
└── index.ts                  # Public API barrel file

examples/                     # Deployable reference implementations (not part of library)
lib/                          # Compiled output (generated, do not edit)
.projenrc.ts                  # Projen project configuration (source of truth for build config)
```

## Build & Test Commands

All commands use Projen — never run `tsc` or `jest` directly.

```bash
npm install                              # Install dependencies
npm run build                            # Full build (compile + test + docs)
npm run build:fast                       # Build without docgen
npm run build:no-test                    # Build without tests
npm run compile                          # TypeScript compilation only
npm run eslint                           # Lint
npm test                                 # All tests

# Targeted tests (faster feedback)
npm run test:document-processing:unit    # Document processing unit tests
npm run test:webapp:unit                 # Web app unit tests
npm run test:cdk-nag:all                 # All CDK Nag security/compliance tests

# After .projenrc.ts changes
npx projen                               # Regenerate project config
```

## Code Conventions

### TypeScript
- **Files:** kebab-case (`base-document-processing.ts`)
- **Classes:** PascalCase (`BaseDocumentProcessing`)
- **Props:** `{ConstructName}Props` interface pattern
- 2-space indentation, single quotes, semicolons
- Max line length: 150 characters
- Prefer `interface` for public APIs, `type` for unions/intersections
- Prefer `readonly` on immutable public props/resources
- Validate construct props early

### Python (Lambdas/tools)
- snake_case files, PEP 8 style
- Type hints and docstrings for public functions

### CDK Construct Patterns
- Abstract base classes define contracts; concrete classes implement use cases
- Expose only necessary `public readonly` resources
- IAM grants must be explicit and resource-scoped (least-privilege)
- Encryption by default (KMS at rest, TLS in transit)
- Fix CDK Nag findings or provide justified suppressions
- No hardcoded credentials/secrets

## Architecture

**Construct hierarchy:** Abstract Base → Concrete Implementation → Industry-specific Example

- `use-cases/` = reusable library constructs (stable APIs, strong test coverage, CDK Nag compliance)
- `examples/` = deployable compositions of existing constructs (do not put reusable construct logic here)

**Key patterns:**
- Composability via props injection (Network, EventBridge, Observability)
- `IObservable` interface for optional observability
- Lambda Powertools integration for logging/tracing
- `createTestApp()` from `utilities/test-utils.ts` for faster unit tests (bundling disabled)

## Key Dependencies

- `aws-cdk-lib` v2.218.0 (peer dep)
- `@aws-cdk/aws-lambda-python-alpha` (peer dep)
- Projen + `cdklabs-projen-project-types` (build tooling)
- JSII 5.x (multi-language compilation)
- Jest 29 (testing), CDK Nag (security compliance)

## Quality Standards

- Unit tests for core behavior and edge cases
- CDK Nag tests for security/compliance on constructs and stacks
- No failing tests in touched scope before PR
- New behavior needs positive and negative-path coverage
- Run `npm run test:cdk-nag:all` when changing constructs or security posture
- **Documentation updates required** when adding new constructs or examples (see rules files)

## Rules

Project-wide rules are enforced via `.claude/rules/`:

- **Coding standards:** `.claude/rules/coding-standards.md`
- **Testing standards:** `.claude/rules/testing-standards.md`
- **Security standards:** `.claude/rules/security-standards.md`
- **Example standards:** `.claude/rules/example-standards.md`
