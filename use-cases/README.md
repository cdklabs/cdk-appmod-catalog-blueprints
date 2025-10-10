# Use Case Building Blocks

Use-case driven composable infrastructure constructs that accelerate serverless development and modernization on AWS. Each use case provides multiple implementation pathways with industry-specific examples.

## Core Use Cases

| Use Case | Description | Quick Deploy Examples |
|----------|-------------|----------------------|
| **[Document Processing](./use-cases/document-processing/)** | AI-powered document processing workflows with classification, extraction, and agentic capabilities | • [Bedrock Document Processing](./examples/document-processing/bedrock-document-processing/)<br/>• [Agentic Document Processing](./examples/document-processing/agentic-document-processing/)<br/>• [Full-Stack Insurance Claims Processing Web Application](./examples/document-processing/doc-processing-fullstack-webapp/) |
| **[Web Application](./use-cases/webapp/)** | Static web application hosting with global CDN, security headers, and SPA support | • [Full-Stack Insurance Claims Processing Web Application](./examples/document-processing/doc-processing-fullstack-webapp/) |

## Foundation & Utilities

| Component | Description |
|-----------|-------------|
| **[Infrastructure Foundation](./framework/)** | Core infrastructure components including VPC networking, access logging, EventBridge integration, and standardized runtime configurations |
| **[Observability & Monitoring](./utilities/)** | Comprehensive monitoring, logging, and alerting with automatic property injection and Lambda Powertools integration |
| **[Data Masking](./utilities/)** | Lambda layer for PII protection with built-in patterns for SSN, credit cards, emails, and custom regex support |
| **[Data Management](./utilities/)** | Database initialization utilities and automated IAM policy generation for Lambda functions |

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