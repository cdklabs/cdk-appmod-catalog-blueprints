---
inclusion: always
---

# AppMod Catalog Blueprints Repository Overview

## What This Repository Is

This is **AppMod Catalog Blueprints** - a comprehensive library of use case-driven AWS CDK infrastructure solution blueprints. It provides composable, multi-layered building blocks (L3 constructs) for accelerating serverless development and modernization on AWS.

**Key Characteristics:**
- **Multi-language support**: TypeScript, Python, Java, .NET via JSII
- **Enterprise-ready**: Built-in security, compliance, AWS Well-Architected best practices
- **Composable architecture**: Mix and match independent components with standardized interfaces
- **Use case-driven**: Purpose-built blueprints for common business scenarios
- **Two distinct outputs**: Reusable constructs (published to npm) and example applications (for demonstration)

## Critical Distinction: Constructs vs Examples

**Before working in this repository, understand the fundamental difference:**

```
CONSTRUCTS (use-cases/)          vs.    EXAMPLES (examples/)
├─ Reusable library components          ├─ Deployable applications
├─ Abstract & extensible                ├─ Concrete & opinionated
├─ Require OOP patterns                 ├─ Compose existing constructs
├─ Must be tested & exported            ├─ Demonstrate usage
├─ Published to npm                     ├─ Not published
└─ Used by examples                     └─ Use constructs
```

**See `aidlc-decisions-approval.md` for detailed guidance on determining which you're building.**

## Repository Structure

```
├── use-cases/              # Reusable L3 constructs (the library)
│   ├── document-processing/    # Document processing workflows
│   │   ├── base-document-processing.ts       # Layer 1: Abstract base
│   │   ├── bedrock-document-processing.ts    # Layer 2: Bedrock implementation
│   │   ├── agentic-document-processing.ts    # Layer 3: Agent-powered
│   │   ├── adapter/                          # Ingress adapters (S3, streaming, etc.)
│   │   └── tests/                            # Unit + CDK Nag tests
│   ├── webapp/                 # Web application hosting
│   ├── framework/              # Foundation components
│   │   ├── agents/            # Agentic AI framework (BatchAgent, BaseAgent)
│   │   └── foundation/        # Core infrastructure (VPC, logging, EventBridge)
│   └── utilities/             # Observability, data masking, helpers
│
├── examples/               # Ready-to-deploy example applications
│   └── document-processing/
│       ├── bedrock-document-processing/      # Simple Bedrock example
│       ├── agentic-document-processing/      # Agent with tools example
│       ├── fraud-detection/                  # Multi-tool fraud detection
│       ├── minimal-bedrock-doc-processing/   # Minimal example
│       └── doc-processing-fullstack-webapp/  # Full-stack with frontend
│
├── .kiro/                  # Kiro steering documentation
│   └── steering/
│       ├── aidlc-decisions-approval.md       # Decision-driven spec workflow
│       ├── construct-development-guide.md    # OOP patterns for constructs
│       ├── example-development-guide.md      # Composing examples
│       ├── testing-guide.md                  # Testing strategies
│       ├── coding-standards.md               # Code style and conventions
│       ├── deployment-operations.md          # Deployment and monitoring
│       ├── document-processing-guide.md      # Document processing specifics
│       └── repository-overview.md            # This file
│
├── test/                   # Test files for use-cases
├── website/                # Docusaurus documentation site
└── API.md                  # Auto-generated API documentation
```

## Core Concepts

### Multi-Layered Architecture (Flexible Inheritance Patterns)

The repository uses OOP inheritance patterns, but **not all constructs follow the same layering**:

**Two-Layer Pattern** (Base → Concrete):
- **Layer 1**: Abstract base class defines interface and common infrastructure
- **Layer 2**: Multiple concrete implementations (e.g., BatchAgent, StreamingAgent)
- **Use when**: Implementations are distinct and don't share intermediate logic

**Three-Layer Pattern** (Base → Concrete → Specialized):
- **Layer 1**: Abstract base class defines interface and common infrastructure
- **Layer 2**: Concrete implementation with specific technology (e.g., BedrockDocumentProcessing)
- **Layer 3**: Specialized implementation that extends Layer 2 (e.g., AgenticDocumentProcessing)
- **Use when**: You want progressive specialization with shared intermediate logic

**Examples in this repository:**
- **Two-Layer**: `BaseAgent` → `BatchAgent` / `StreamingAgent` (future)
- **Three-Layer**: `BaseDocumentProcessing` → `BedrockDocumentProcessing` → `AgenticDocumentProcessing`

**The pattern you choose depends on your use case.**

### Key Design Patterns Used

**Template Method Pattern**: Base classes define workflow structure, subclasses fill in steps
**Strategy Pattern**: Adapters provide pluggable ingress mechanisms (S3, streaming, API)
**Dependency Injection**: Components accept dependencies via constructor props
**Factory Method**: Subclasses create their own specialized resources
**Interface Segregation**: Small, focused interfaces (IAdapter, IObservable)
**Composition Over Inheritance**: Where appropriate (adapters, observability)

**See `construct-development-guide.md` for detailed OOP patterns and real code examples.**

### Key Use Cases

**Document Processing**
- Intelligent document processing workflows with Step Functions orchestration
- Classification, extraction, enrichment, post-processing stages
- Three implementations:
  - **BaseDocumentProcessing**: Abstract foundation for custom implementations
  - **BedrockDocumentProcessing**: Uses Bedrock InvokeModel for classification and processing
  - **AgenticDocumentProcessing**: Uses BatchAgent with tools for complex reasoning
- S3-triggered workflows via QueuedS3Adapter (default)
- Extensible via custom adapters for streaming, API, or on-premises ingress

**Agentic AI Framework**
- Composable framework for building AI agents with Amazon Bedrock
- Tool integration for extending agent capabilities (Python tools with `@tool` decorator)
- BatchAgent for asynchronous processing (interactive agents coming soon)
- System prompts and tools packaged as S3 Assets
- Lambda Layers for Python dependencies
- Reusable across diverse use cases (fraud detection, compliance, analysis)

**Web Application**
- Static web hosting with CloudFront CDN
- Security headers and SPA support
- Integration with backend APIs
- S3 bucket with CloudFront distribution

**Foundation & Utilities**
- **Network**: VPC with service endpoints, security groups
- **EventBridge Broker**: Event-driven architecture integration
- **Access Logging**: Centralized logging for S3, CloudFront
- **Observability**: Lambda Powertools integration, CloudWatch metrics, X-Ray tracing
- **Data Masking**: PII protection in logs

## Technology Stack

- **Language**: TypeScript (source), multi-language via JSII
- **Framework**: AWS CDK v2 (minimum 2.218.0)
- **Build Tool**: Projen for project management
- **Testing**: Jest for unit/integration tests, CDK Nag for security compliance
- **Documentation**: Docusaurus for website, jsii-docgen for API docs
- **AI/ML**: Amazon Bedrock (Claude models), Strands agent framework
- **Infrastructure**: Step Functions, Lambda, S3, DynamoDB, SQS, EventBridge, CloudFront

## Development Patterns

### Working with Constructs (use-cases/)

Construct work can take several forms:

**1. Creating a New Construct from Scratch**
- Building a completely new use case pattern (e.g., data processing, API gateway, ML pipelines, ETL workflows)
- Creating foundation utilities (networking, observability, security, monitoring)
- Implementing a new base class for a new domain

**2. Adding a New Layer to Existing Construct**
- Extending an existing base class with a new concrete implementation
- Creating a specialized version of an existing concrete implementation
- Adding Layer 3 on top of existing Layer 2 construct

**3. Adding Features to Existing Construct**
- Adding optional processing steps or stages
- Adding new props to configure existing behavior
- Enhancing error handling, retry logic, or observability
- Adding new integration points

**4. Creating New Adapters or Plugins**
- Implementing interfaces for new ingress/egress types (streaming, API, on-premises, databases)
- Adding support for different event sources or destinations
- Creating custom processing chains or workflows

**5. Adding Cross-Cutting Concerns**
- Adding EventBridge integration to existing constructs
- Adding observability hooks and metrics
- Creating new extension points for subclasses
- Adding security or compliance features

**Requirements (all construct work):**
- Follow OOP patterns (inheritance, composition, interfaces)
- Write comprehensive tests (unit tests + CDK Nag tests)
- Add JSDoc comments for all public APIs
- Update exports in `use-cases/index.ts` (if new construct or public interface)
- Update or create README.md with usage examples

**See `construct-development-guide.md` for step-by-step guidance.**

### When to Create an Example (examples/)

**Create an example when:**
- Demonstrating how to use existing constructs
- Showing a specific business use case (fraud detection, invoice processing)
- Providing a deployable reference implementation
- Teaching developers how to compose constructs

**Requirements:**
- Compose existing constructs (don't create new ones)
- Include comprehensive README with deployment instructions
- Add sample files for testing
- Include helper scripts (upload-document.sh)
- Add CloudFormation outputs for important resources

**See `example-development-guide.md` for step-by-step guidance.**

### When to Extend Base Classes

**Extend base classes when:**
- Custom business logic not covered by existing implementations
- Integration with proprietary systems or third-party services
- Industry-specific requirements (healthcare, finance, manufacturing)
- Specialized security or compliance requirements

**Example Extension Pattern:**
```typescript
class CustomDocumentProcessing extends BaseDocumentProcessing {
  protected classificationStep(): IChainable {
    // Your custom classification logic
    return new LambdaInvoke(this, 'CustomClassifier', {
      lambdaFunction: myCustomClassifier,
      resultPath: '$.classificationResult'
    });
  }
  
  protected processingStep(): IChainable {
    // Your custom processing logic
    return new LambdaInvoke(this, 'CustomProcessor', {
      lambdaFunction: myCustomProcessor,
      resultPath: '$.processingResult'
    });
  }
  
  // Optional steps can return undefined
  protected enrichmentStep(): IChainable | undefined {
    return undefined;  // Skip enrichment
  }
  
  protected postProcessingStep(): IChainable | undefined {
    return undefined;  // Skip post-processing
  }
}
```

## Security & Compliance

- **CDK Nag Integration**: Automated security compliance checking with AwsSolutionsChecks
- **Encryption**: KMS encryption at-rest (S3, DynamoDB, SQS) and in-transit (TLS)
- **IAM**: Least-privilege access patterns, grant methods for permissions
- **Data Protection**: CloudWatch Logs data protection for PII masking
- **Compliance Reports**: Generate with `npm test -- --testPathPattern="nag.test.ts"`
- **Security Headers**: CloudFront security headers for web applications

## Common Workflows

### Adding a New Example

1. **Determine structure**: `examples/{use-case}/{example-name}/`
2. **Create files**:
   - `app.ts` - CDK app entry point
   - `{example-name}-stack.ts` - Stack composing constructs
   - `cdk.json`, `package.json`, `tsconfig.json` - Configuration
   - `README.md` - Comprehensive documentation
3. **Add resources**:
   - `sample-files/` - Test documents with README
   - `resources/` - Agent prompts and tools (if agentic)
   - `upload-document.sh` - Helper script (if S3-based)
4. **Test deployment**: Deploy, test with samples, verify cleanup
5. **Document thoroughly**: Prerequisites, deployment, usage, monitoring, troubleshooting

**See `example-development-guide.md` for complete checklist.**

### Adding a New Use Case Construct

1. **Determine layer**: Base class, concrete implementation, or specialized?
2. **Create directory**: `use-cases/{use-case-name}/`
3. **Implement construct**:
   - Define props interface with JSDoc
   - Extend appropriate base class
   - Implement abstract methods
   - Add extension points for subclasses
4. **Add tests**: `use-cases/{use-case-name}/tests/`
   - Unit tests for resource creation
   - CDK Nag tests for security compliance
   - Property-based tests (if applicable)
5. **Export**: Update `use-cases/index.ts`
6. **Document**: Add README.md with architecture and usage examples

**See `construct-development-guide.md` for complete checklist and OOP patterns.**

### Testing

- **All tests**: `npm test`
- **Specific test suite**: `npm test -- --testPathPattern="document-processing"`
- **Security/Nag tests only**: `npm test:security`
- **Watch mode**: `npm test:watch`
- **Coverage report**: `npm test -- --coverage`

**See `testing-guide.md` for comprehensive testing strategies.**

## Important Files

- **`.projenrc.ts`**: Project configuration (managed by Projen) - edit this, not package.json
- **`package.json`**: Generated by Projen - DO NOT edit manually
- **`tsconfig.json`**: TypeScript configuration
- **`API.md`**: Auto-generated API documentation - DO NOT edit manually
- **`use-cases/index.ts`**: Main export file for the library - add new constructs here
- **`.kiro/steering/*.md`**: Development guides and standards

## Steering Documentation

The `.kiro/steering/` directory contains comprehensive guides:

- **`aidlc-decisions-approval.md`**: Decision-driven spec creation workflow
- **`construct-development-guide.md`**: OOP patterns, three-layer architecture, design patterns
- **`example-development-guide.md`**: Composing examples, documentation requirements
- **`testing-guide.md`**: Unit tests, CDK Nag tests, property-based tests
- **`coding-standards.md`**: TypeScript/Python style, naming conventions
- **`deployment-operations.md`**: Deployment, monitoring, troubleshooting
- **`document-processing-guide.md`**: Document processing specifics, adapters, agents

**Start with `aidlc-decisions-approval.md` to determine if you're building a construct or example.**

## Documentation

- **Website**: https://cdklabs.github.io/cdk-appmod-catalog-blueprints/
- **Construct Hub**: https://constructs.dev/packages/@cdklabs/cdk-appmod-catalog-blueprints/
- **GitHub**: https://github.com/cdklabs/cdk-appmod-catalog-blueprints
- **API Reference**: See API.md in repository root

## Package Information

- **Package Name**: `@cdklabs/cdk-appmod-catalog-blueprints`
- **License**: Apache-2.0
- **Stability**: Experimental
- **Minimum Node Version**: 18.12.0
- **CDK Version**: ^2.218.0

## Quick Start

**For new developers:**
1. Read this overview
2. Read `aidlc-decisions-approval.md` to understand construct vs example
3. If building a construct: Read `construct-development-guide.md`
4. If building an example: Read `example-development-guide.md`
5. Review `testing-guide.md` for testing strategies
6. Check `coding-standards.md` for style guidelines

**For deploying examples:**
1. Navigate to example directory: `cd examples/document-processing/fraud-detection`
2. Install dependencies: `npm install`
3. Deploy: `npm run deploy`
4. Follow example README for usage instructions
