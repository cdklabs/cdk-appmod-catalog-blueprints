# AppMod Use Case Blueprints

Serverless infrastructure components for modern application development. This catalog provides composable building blocks organized by business use cases, enabling rapid deployment of secure, scalable solutions.

## Quick Start

**Deploy a working example in 5 minutes:**

Clone the repository, build the project, then navigate to any example directory and deploy using CDK with your AWS profile and region.

## Core Use Cases

### 1. 📄 Document Processing

Serverless document processing pipeline with AI-powered classification, extraction, and workflow orchestration.

**Architecture:**
```
S3 Upload → SQS → Step Functions → Bedrock Models → DynamoDB
    ↓         ↓         ↓              ↓            ↓
[Storage] [Buffer] [Workflow]    [AI Processing] [Results]
```

**Key Features:**
- **Event-Driven Pipeline**: S3 upload triggers SQS → Step Functions workflow
- **AI-Powered Processing**: Amazon Bedrock for document classification and extraction
- **Multi-format Support**: PDF, JPG, PNG document processing
- **Flexible Workflows**: Base construct with extensible processing steps
- **State Management**: DynamoDB for workflow state and document metadata
- **Error Handling**: Dead letter queues and retry mechanisms with observability

**Available Constructs:**

**BaseDocumentProcessing** - Foundation construct providing:
- S3 bucket with organized prefixes (raw/, processed/, failed/)
- SQS queue with configurable visibility timeout and DLQ
- DynamoDB table for document metadata and workflow state
- Step Functions workflow with customizable processing steps
- Built-in observability and monitoring

**BedrockDocumentProcessing** - AI-powered document analysis:
- Document classification using Claude 3.5 Sonnet
- Entity extraction and content analysis
- Configurable prompts for classification and extraction
- Optional enrichment Lambda function integration
- Automatic workflow state management

**AgenticDocumentProcessing** - Multi-agent document workflows:
- Advanced multi-step processing with agent coordination
- Complex document understanding and analysis
- Configurable agent behaviors and processing flows

### 2. 🌐 Frontend Web Applications

Static web application hosting with CloudFront distribution and security best practices.

**Architecture:**
```
CloudFront → S3 Static Website → Security Headers
     ↓            ↓                    ↓
[Global CDN] [Static Assets]    [Security Functions]
```

**Key Features:**
- **Global Distribution**: CloudFront CDN for low-latency content delivery
- **Security Headers**: Automatic injection of security headers via CloudFront functions
- **SSL/TLS**: Automatic HTTPS with AWS Certificate Manager
- **Custom Domains**: Support for custom domain names with Route 53 integration
- **Error Pages**: Custom 404/403 error page handling
- **Access Logging**: CloudFront access logs for analytics

**Available Constructs:**

**FrontendConstruct** - Complete static website hosting:
- S3 bucket configured for static website hosting
- CloudFront distribution with optimized caching
- Security headers function for OWASP compliance
- Optional custom domain and SSL certificate
- Access logging and monitoring integration

### 3. 📊 Observability & Monitoring

Comprehensive monitoring, logging, and alerting for AWS infrastructure with automatic property injection and Lambda Powertools integration.

**Features:**
- **Property Injection**: Automatic observability configuration across AWS services
- **Lambda Powertools**: Structured logging, metrics, and tracing for Python/Node.js
- **CloudWatch Integration**: Dashboards, alarms, and custom metrics
- **X-Ray Tracing**: End-to-end request flow visualization
- **Bedrock Monitoring**: Specialized observability for Amazon Bedrock workloads
- **Cost Optimization**: Intelligent log retention and metric filtering

**Available Components:**

**Property Injectors:**
- `LambdaObservabilityPropertyInjector` - Auto-enables X-Ray tracing for Lambda functions
- `StateMachineObservabilityPropertyInjector` - Enables logging for Step Functions
- `CloudfrontDistributionObservabilityPropertyInjector` - CDN monitoring and logging

**Observability Constructs:**
- `BedrockObservability` - Comprehensive monitoring for Bedrock workloads with log groups, encryption, and data protection
- `PowertoolsConfig` - Lambda Powertools configuration for structured logging and metrics
- `Observable` interface - Standardized observability contract for constructs

**Data Protection:**
- `LogGroupDataProtectionProps` - Configurable data protection policies for CloudWatch logs

### 4. 🏗️ Foundation & Framework

Core infrastructure components and utilities for building scalable applications.

**Available Components:**

**Network Foundation:**
- `Network` - VPC with public/private subnets, NAT gateways, and security groups
- `AccessLog` - Centralized access logging configuration for AWS services
- `EventBridgeBroker` - Event-driven architecture with custom EventBridge bus

**Utilities:**
- `DataLoader` - Custom resource for loading initial data into databases and services
- `LambdaIamUtils` - Utility functions for Lambda IAM role and policy management
- `DefaultRuntimes` - Standardized Lambda runtime configurations

**Lambda Layers:**
- `DataMasking` - Layer for data masking and PII protection in Lambda functions

## Essential Commands

**Build & Deploy:**

Build entire project with npx projen build. Deploy with specific profile/region using npx cdk deploy --require-approval never. Update CDK CLI if needed with npm install aws-cdk@latest.

**Development:**

Run tests with npm test. Run specific test pattern with npm test -- --testPathPattern="document-processing". Generate CDK Nag compliance reports with npm test -- --testPathPattern="nag.test.ts".

## Repository Structure

```
appmod-usecase-blueprints/
├── use-cases/
│   ├── document-processing/     # Document processing components
│   │   ├── base-document-processing.ts
│   │   ├── bedrock-document-processing.ts
│   │   ├── agentic-document-processing.ts
│   │   ├── resources/          # Lambda functions
│   │   └── tests/              # Unit and CDK Nag tests
│   ├── webapp/                 # Web application components
│   │   ├── frontend-construct.ts
│   │   └── tests/              # Unit and CDK Nag tests
│   ├── framework/              # Core infrastructure
│   │   ├── foundation/         # Network, access logs, EventBridge
│   │   ├── quickstart/         # Base quickstart patterns
│   │   └── custom-resource/    # Default runtimes
│   └── utilities/
│       ├── observability/      # Monitoring components
│       ├── lambda_layers/      # Shared Lambda layers
│       ├── data-loader.ts      # Custom resource for data loading
│       └── lambda-iam-utils.ts # IAM utilities
├── examples/                   # Ready-to-deploy examples
│   └── document-processing/
│       ├── bedrock-document-processing/
│       ├── agentic-document-processing/
│       └── doc-processing-fullstack-webapp/
└── README.md
```

## Security & Compliance

All components include:
- **CDK Nag Integration**: Automated security compliance checking
- **AWS Well-Architected**: Following best practices for security, reliability, performance
- **Encryption**: At-rest and in-transit encryption by default
- **IAM Least Privilege**: Minimal required permissions
- **VPC Isolation**: Private subnets and security groups

**Generate Compliance Reports:**

Run npm test with testPathPattern="nag.test.ts" to generate reports in cdk.out/*-NagReport.csv

## Examples

### Document Processing
- **Bedrock Document Processing**: AI-powered document analysis with Claude 3.5 Sonnet
- **Agentic Document Processing**: Multi-agent document workflows with complex processing
- **Full-Stack Document Processing Webapp**: Complete document processing application with frontend interface

Each example includes deployment scripts, sample files, and comprehensive documentation.

## Key AWS Services

- **Compute**: Lambda, ECS Fargate, Step Functions
- **Storage**: S3, DynamoDB
- **Database**: RDS (MySQL/PostgreSQL)
- **Networking**: VPC, CloudFront, Application Load Balancer
- **AI/ML**: Amazon Bedrock, Textract
- **Monitoring**: CloudWatch, X-Ray
- **Security**: KMS, Secrets Manager, IAM

## Contributing

1. **Add New Use Case**: Create directory under `use-cases/`
2. **Follow Structure**: Include constructs, tests, and documentation
3. **Security First**: All components must pass CDK Nag checks
4. **Include Monitoring**: Include monitoring, error handling, and cost optimization

## Disclaimer
These application solutions are not supported products in their own right, but examples to help our customers use our products from their applications. As our customer, any applications you integrate these examples in should be thoroughly tested, secured, and optimized according to your business's security standards before deploying to production or handling production workloads.

## License

Apache License 2.0 - see [LICENSE](./LICENSE) file for details.
