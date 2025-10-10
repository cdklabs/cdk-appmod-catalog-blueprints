# AppMod Catalog Blueprints

Application Modernization (AppMod) Catalog Blueprints is a comprehensive library of use case-driven infrastructure blueprints built using AWS well-architected best practices. Designed in the form of composable multi-layered building blocks using [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) (CDK) [L3 constructs](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html), these blueprints offer use case-driven solutions with multiple implementation pathways and industry-specific implementations to accelerate serverless development and modernization on AWS.

Built with [JSII](https://aws.github.io/jsii/), these constructs are available in TypeScript, Python, Java, and .NET, enabling teams to use their preferred programming language while leveraging the same proven infrastructure patterns. 

Get started by exploring the [use case constructs](use-cases) and deployable [examples](examples). Learn more from [documentation](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/) and [Construct Hub](https://constructs.dev/packages/@cdklabs/cdk-appmod-catalog-blueprints).

## Core Use Cases

| Use Case | Description | Quick Deploy Examples |
|----------|-------------|----------------------|
| **[Document Processing](./use-cases/document-processing/)** | AI-powered document processing workflows with classification, extraction, and agentic capabilities | • [Bedrock Document Processing](./examples/document-processing/bedrock-document-processing/)<br/>• [Agentic Document Processing](./examples/document-processing/agentic-document-processing/)<br/>• [Full-Stack Insurance Claims Processing Web Application](./examples/document-processing/doc-processing-fullstack-webapp/) |
| **[Web Application](./use-cases/webapp/)** | Static web application hosting with global CDN, security headers, and SPA support | • [Full-Stack Insurance Claims Processing Web Application](./examples/document-processing/doc-processing-fullstack-webapp/) |

## Foundation and Utilities

| Component | Description |
|-----------|-------------|
| **[Observability & Monitoring](./use-cases/utilities/observability/)** | Comprehensive monitoring, logging, and alerting with automatic property injection and Lambda Powertools integration |
| **[Data Masking](./use-cases/utilities/lambda_layers/data-masking/)** | Lambda layer for data masking and PII protection in serverless applications |
| **[Infrastructure Foundation](./use-cases/framework/)** | Core infrastructure components and utilities for building scalable applications |

## Key Design Principles

AppMod Catalog Blueprints is built on Object-Oriented Programming (OOP) principles, providing a structured approach to infrastructure development through core design concepts:

### Composable Architecture

Build complex enterprise systems by combining independent, reusable components with standardized interfaces.

- **Independent components** with clear interfaces and loose coupling for maximum flexibility
- **Mix and match building blocks** to create custom solutions across different contexts and use cases  
- **Scalable composition** that maintains consistency while enabling incremental adoption and gradual modernization

### Multi-Layered Building Blocks Architecture

Our blueprints use a multi-layered architecture that bridges the gap between business requirements and technical implementation:

| Layer | Implementation Type | Purpose | Key Features |
|-------|-------------------|---------|--------------|
| **Infrastructure Foundation** | Abstract base classes | Shared infrastructure components and common services | • Standardized interfaces and contracts<br/>• Extensible foundation for custom implementations |
| **General Use Case Implementation** | Concrete implementation classes | Implementations for common patterns across industries | • Configurable parameters for different environments<br/>• Abstract method implementations with general-purpose solutions |
| **Industry-Aligned Implementation** | Configured implementation examples | Pre-configured solutions for specific business domains | • Industry-specific validation rules and workflows<br/>• Built-in compliance requirements and domain expertise |

### Well-Architected with Smart Defaults

AppMod Catalog Blueprints serves both **rapid deployment** needs (for teams wanting immediate solutions) and **custom development** requirements (for teams needing tailored implementations), providing flexibility based on your needs.

| Approach | Best For | Capabilities |
|----------|----------|--------------|
| **Out-of-the-Box Deployment** | Rapid deployment and evaluation | • Deploy complete solutions in minutes using examples for immediate value<br/>• Pre-configured security, monitoring, and well-architected best practices<br/>• Sensible defaults with well-architected configurations that work immediately<br/>• No infrastructure boilerplate required with minimal learning curve |
| **Intelligent Customization** | Custom development and integration | • Override defaults to modify behavior without changing core implementation<br/>• Enable/disable optional features to meet specific requirements<br/>• Inject custom logic at predefined extension points with well-architected best practices<br/>• Configure parameters for different environments and use cases |

### Security & Compliance

All components include enterprise-grade security by default:
- **CDK Nag Integration**: Automated security compliance checking
- **AWS Well-Architected**: Security, reliability, and performance best practices
- **Encryption & IAM**: At-rest/in-transit encryption with least-privilege access
- **Compliance Reports**: Generate reports with `npm test -- --testPathPattern="nag.test.ts"`

## Essential Commands

### Environment Setup
```bash
# Clone the repository
git clone https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git

# Configure AWS credentials and region
aws configure
# OR set AWS profile: export AWS_PROFILE=your-profile-name

# Bootstrap your AWS environment (one-time setup)
npx cdk bootstrap
```

### Quick Start

Deploy a working example in **5 minutes**:

```bash
# Navigate to any example and deploy
cd examples/document-processing/agentic-document-processing
npm install
npm run deploy
```

### Build & Deploy Project
```bash
# Build entire project
npx projen build

# Deploy with specific profile/region
npx cdk deploy --require-approval never

# Update CDK CLI if needed
npm install aws-cdk@latest
```

### Development
```bash
# Run all tests
npm test

# Run specific test pattern
npm test -- --testPathPattern="document-processing"

# Generate CDK Nag compliance reports
npm test -- --testPathPattern="nag.test.ts"
```

## How to Use This Library

### Quick Start (Deploy Examples)
1. **Browse Examples**: Start with the [examples](./examples/) folder to see working implementations
2. **Deploy & Test**: Use `npm run deploy` in any example to get a working system in minutes
3. **Customize**: Modify example parameters to fit your specific requirements

### Using Individual Constructs
1. **Import Constructs**: Add `@cdklabs/appmod-catalog-blueprints` to your CDK project
2. **Choose Your Layer**: Pick the right abstraction level for your needs
3. **Configure**: Use the configuration options documented in each construct

### Understanding the Layers

**Foundation Layer** (`use-cases/framework/`, `use-cases/utilities/`)
- **When to use**: Building custom solutions or need specific infrastructure components
- **Components**: VPC networking, observability utilities, data management tools, etc.

**Use Case Layer** (`use-cases/document-processing/`, `use-cases/webapp/`)
- **When to use**: Need proven patterns for common business problems
- **Components**: Document processing workflows, web application hosting, data transformation patterns, etc.

**Example Layer** (`examples/`)
- **When to use**: Want complete, deployable solutions
- **Components**: Industry-specific configurations, end-to-end applications, reference implementations, etc.

## Contributing

See [CONTRIBUTING.md](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/CONTRIBUTING.md) for detailed guidelines on how to contribute to this project.

## Disclaimer
These application solutions are not supported products in their own right, but examples to help our customers use our products from their applications. As our customer, any applications you integrate these examples in should be thoroughly tested, secured, and optimized according to your business's security standards before deploying to production or handling production workloads.

## License

Apache License 2.0 - see [LICENSE](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/LICENSE) file for details.
