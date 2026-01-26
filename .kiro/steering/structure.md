# Project Structure

## Directory Organization

```
cdk-appmod-catalog-blueprints/
├── use-cases/              # Source code (compiles to lib/)
│   ├── document-processing/  # Example use case
│   │   ├── adapter/        # Ingress adapter implementations
│   │   ├── resources/      # Lambda functions (Python/Node.js)
│   │   ├── tests/          # Unit and CDK Nag tests
│   │   ├── base-document-processing.ts
│   │   ├── bedrock-document-processing.ts
│   │   ├── agentic-document-processing.ts
│   │   └── index.ts        # Public exports
│   ├── webapp/             # Frontend hosting constructs
│   ├── framework/          # Shared framework components
│   │   ├── agents/         # Agentic AI framework
│   │   ├── bedrock/        # Bedrock utilities
│   │   ├── foundation/     # Core infrastructure (VPC, EventBridge, logging)
│   │   └── custom-resource/
│   ├── utilities/          # Cross-cutting utilities
│   │   ├── observability/  # Monitoring and logging
│   │   ├── lambda_layers/  # Reusable Lambda layers
│   │   └── tests/
│   └── index.ts            # Main library entry point
├── lib/                    # Compiled output (generated, not source)
├── examples/               # Deployable example applications
│   └── document-processing/  # Examples for document processing use case
│       ├── bedrock-document-processing/
│       ├── agentic-document-processing/
│       └── doc-processing-fullstack-webapp/
├── .projenrc.ts           # Project configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Key Conventions

### Source Code Location
- **All source code** lives in `use-cases/`
- **Compiled output** goes to `lib/` (never edit directly)
- **Lambda resources** in `use-cases/*/resources/` are copied to `lib/` during build

### Naming Conventions
- **Directories**: kebab-case (`document-processing`, `agentic-document-processing`)
- **Classes**: PascalCase (`BaseDocumentProcessing`, `AgenticDocumentProcessing`)
- **Files**: kebab-case matching class name (`base-document-processing.ts`)
- **Interfaces**: PascalCase with `I` prefix for adapter interfaces (`IAdapter`)

### File Organization Pattern
Each use case follows this structure:
```
use-case-name/
├── README.md              # Comprehensive documentation
├── main-construct.ts      # Primary construct implementation
├── supporting-files.ts    # Additional constructs/utilities
├── index.ts               # Public API exports
├── resources/             # Lambda functions and runtime code
│   ├── lambda-name/
│   │   ├── index.py|js|mjs
│   │   ├── requirements.txt (Python)
│   │   └── package.json (Node.js)
└── tests/
    ├── construct.test.ts      # Unit tests
    └── construct-nag.test.ts  # CDK Nag compliance tests
```

### Test Organization
- **Unit tests**: `*.test.ts` - Functional testing
- **CDK Nag tests**: `*-nag.test.ts` - Security/compliance validation
- **Co-located**: Tests live alongside source in `tests/` subdirectory
- **Coverage requirement**: >80% for new contributions

### Multi-Layered Architecture
The codebase implements three architectural layers for each use case:

1. **Abstract Base Classes** (`Base*` classes)
   - Define interfaces and contracts
   - Provide infrastructure scaffolding
   - Require implementation of abstract methods
   - Example: `BaseDocumentProcessing` (document processing use case)

2. **Concrete Implementations** (Standard classes)
   - Extend base classes with general-purpose logic
   - Configurable via props
   - Example: `BedrockDocumentProcessing` (document processing use case)

3. **Industry Examples** (in `examples/`)
   - Pre-configured for specific domains
   - Ready-to-deploy applications
   - Example: Insurance claims processing (document processing use case)

This pattern is designed to be replicated for future use cases as they are added to the library.

### Resource Handling
- **Lambda functions**: Store in `resources/` subdirectory
- **Python functions**: Include `requirements.txt`
- **Node.js functions**: Include `package.json`
- **Build process**: Automatically copies resources to `lib/` during compilation

### Public API Exports
- Each use case has an `index.ts` that exports public constructs
- Main library `use-cases/index.ts` re-exports all use cases
- Only export stable, documented constructs
- Internal utilities should not be exported

### Documentation Requirements
- **README.md**: Required for each use case
- **API.md**: Auto-generated from JSDoc comments
- **JSDoc comments**: Required for all public classes, methods, and properties
- **Examples**: Include code snippets in documentation

### Examples Structure
- Self-contained CDK applications
- Include `README.md` with deployment instructions
- Provide sample data/files when applicable
- Must deploy with: `npm install && npm run build && npm run deploy`
