# AppMod Catalog Blueprints

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints)
[![Website](https://img.shields.io/badge/website-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/)
[![Package](https://img.shields.io/badge/package-construct--hub-orange)](https://constructs.dev/packages/@cdklabs/cdk-appmod-catalog-blueprints/)

Application Modernization (AppMod) Catalog Blueprints is a comprehensive library of use case-driven infrastructure solution blueprints built using AWS well-architected best practices. Designed as composable multi-layered building blocks using [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) (CDK) [L3 constructs](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html), these blueprints offer use case-driven solutions with multiple implementation pathways and industry-specific implementations to accelerate serverless development and modernization on AWS.

**Key Benefits:**
- **Use case-driven solutions**: Purpose-built blueprints for common business scenarios like document processing, web applications, and AI workflows, with industry-specific implementations like insurance claims processing
- **Multi-layered approach**: Infrastructure Foundation → General Use Cases → Industry Examples, allowing you to start with proven patterns and customize as needed.
- **Composable architecture**: Mix and match independent components with standardized interfaces
- **Enterprise-ready**: Built-in security, compliance, and AWS Well-Architected best practices
- **Multi-language support**: Available in TypeScript, Python, Java, and .NET via [JSII](https://aws.github.io/jsii/)

## How to Use This Library

Get started by exploring the [use case constructs](use-cases) and deployable [examples](examples). Learn more from [documentation](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/) and [Construct Hub](https://constructs.dev/packages/@cdklabs/cdk-appmod-catalog-blueprints).

| Approach | Best For | Get Started |
|----------|----------|-------------|
| **🚀 Rapid Deployment** | Quick evaluation, immediate solutions, proof-of-concepts | Use [examples](./examples/) - deploy complete solutions in minutes with sensible defaults and AWS Well-Architected best practices |
| **🔧 Custom Development** | Specific requirements, enterprise integration, tailored solutions | Use [individual constructs](./use-cases/) - override defaults, inject custom logic, configure for your environment |

## Use Case Building Blocks

### Core Use Cases

| Use Case | Description | Quick Deploy Examples |
|----------|-------------|----------------------|
| **[Document Processing](./use-cases/document-processing/)** | Intelligent document processing workflows with classification, extraction, and agentic capabilities | • [Bedrock Document Processing](./examples/document-processing/bedrock-document-processing/)<br/>• [Agentic Document Processing](./examples/document-processing/agentic-document-processing/)<br/>• [Full-Stack Insurance Claims Processing Web Application](./examples/document-processing/doc-processing-fullstack-webapp/) |
| **[Web Application](./use-cases/webapp/)** | Static web application hosting with global CDN, security headers, and SPA support | • [Full-Stack Insurance Claims Processing Web Application](./examples/document-processing/doc-processing-fullstack-webapp/) |

### Foundation and Utilities

| Component | Description |
|-----------|-------------|
| **[Agentic AI Framework](./use-cases/framework/agents/)** | Composable enterprise framework for building intelligent AI agents that can be mixed and matched across diverse use cases - from document processing to conversational AI |
| **[Infrastructure Foundation](./use-cases/framework/foundation/)** | Core infrastructure components including VPC networking, access logging, and EventBridge integration |
| **[Observability & Monitoring](./use-cases/utilities/#observability)** | Comprehensive monitoring, logging, and alerting with automatic property injection and Lambda Powertools integration |
| **[Data Masking](./use-cases/utilities/#data-masking)** | Lambda layer for data masking and PII protection in serverless applications |

## Getting Started

### Environment Setup
```bash
# Configure AWS credentials and region
aws configure
# OR set AWS profile: export AWS_PROFILE=your-profile-name

# Bootstrap your AWS environment (one-time setup)
npx cdk bootstrap
```

### Quick Deploy (Complete Solutions)
Deploy working examples in minutes for immediate value:

```bash
# Clone the repository
git clone https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git

# Deploy complete insurance claims processing solution
cd examples/document-processing/doc-processing-fullstack-webapp
npm install && npm run deploy
# Full AI-powered solution with web interface deployed

# Or deploy basic document processing
cd examples/document-processing/bedrock-document-processing
npm install && npm run deploy
```

### Using Individual Constructs
Add to your existing CDK projects for custom solutions:

```bash
# Install the library
npm install @cdklabs/appmod-catalog-blueprints

# Use in your CDK code
import { AgenticDocumentProcessing, WebApp } from '@cdklabs/appmod-catalog-blueprints';

const docProcessor = new AgenticDocumentProcessing(this, 'Processor', {
  agentDefinition: {
    bedrockModel: { useCrossRegionInference: true },
    systemPrompt: myPrompt,
    tools: [myTools]
  }
});
```

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

### Security & Compliance

All components include enterprise-grade security by default:
- **CDK Nag Integration**: Automated security compliance checking
- **AWS Well-Architected**: Security, reliability, and performance best practices
- **Encryption & IAM**: At-rest/in-transit encryption with least-privilege access
- **Compliance Reports**: Generate reports with `npm test -- --testPathPattern="nag.test.ts"`

## Contributing

See [CONTRIBUTING.md](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/CONTRIBUTING.md) for detailed guidelines on how to contribute to this project.

## Disclaimer
These application solutions are not supported products in their own right, but examples to help our customers use our products from their applications. As our customer, any applications you integrate these examples in should be thoroughly tested, secured, and optimized according to your business's security standards before deploying to production or handling production workloads.

## License

Apache License 2.0 - see [LICENSE](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/LICENSE) file for details.
