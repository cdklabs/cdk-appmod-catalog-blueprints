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
