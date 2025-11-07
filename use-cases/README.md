# Use Case Building Blocks

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/)
[![Examples](https://img.shields.io/badge/examples-deploy-orange)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/examples/)

Use-case driven composable infrastructure constructs that accelerate serverless development and modernization on AWS. Each use case provides multiple implementation pathways with industry-specific examples.

## Core Use Cases

| Use Case | Description | Quick Deploy Examples |
|----------|-------------|----------------------|
| **[Document Processing](./document-processing/)** | Intelligent document processing workflows with classification, extraction, and agentic capabilities | • [Bedrock Document Processing](../examples/document-processing/bedrock-document-processing/)<br/>• [Agentic Document Processing](../examples/document-processing/agentic-document-processing/)<br/>• [Full-Stack Insurance Claims Processing Web Application](../examples/document-processing/doc-processing-fullstack-webapp/) |
| **[Web Application](./webapp/)** | Static web application hosting with global CDN, security headers, and SPA support | • [Full-Stack Insurance Claims Processing Web Application](../examples/document-processing/doc-processing-fullstack-webapp/) |

### Foundation and Utilities

| Component | Description |
|-----------|-------------|
| **[Agentic AI Framework](./framework/agents/)** | Composable enterprise framework for building intelligent AI agents that can be mixed and matched across diverse use cases - from document processing to conversational AI |
| **[Infrastructure Foundation](./framework/foundation/)** | Core infrastructure components including VPC networking, access logging, and EventBridge integration |
| **[Observability & Monitoring](./utilities/#observability)** | Comprehensive monitoring, logging, and alerting with automatic property injection and Lambda Powertools integration |
| **[Data Masking](./utilities/#data-masking)** | Lambda layer for data masking and PII protection in serverless applications |

## Using the Constructs

### When to Use Constructs As-Is
- **Ready-made implementations**: Use concrete constructs (BedrockDocumentProcessing, Frontend, etc.) for standard business scenarios
- **Foundation utilities**: VPC, observability, data management components work out-of-the-box
- **Configuration-driven**: Most constructs offer extensive configuration options without code changes

### When to Extend Base Classes
Extend abstract base classes when you need custom business logic that isn't covered by existing implementations:

```typescript
// Example: Custom implementation extending a base class
class MyCustomUseCase extends BaseUseCase {
  protected stepOne() {
    // Your custom logic (e.g., external API integration)
    return new LambdaInvoke(this, 'CustomStep', {
      lambdaFunction: myCustomFunction,
      resultPath: '$.stepResult'
    });
  }
  
  protected stepTwo() {
    // Your custom processing logic
    return new StepFunctionsStartExecution(this, 'CustomWorkflow', {
      stateMachine: myCustomStateMachine,
      resultPath: '$.workflowResult'
    });
  }
}
```

**Common extension scenarios**:
- Integration with proprietary systems or third-party services
- Industry-specific business logic (healthcare, finance, manufacturing)
- Custom data processing or transformation workflows
- Specialized security or compliance requirements