# Utilities

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/utilities)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/utilities/)

Essential cross-cutting concerns and helper constructs that enhance functionality, security, and observability of AWS applications. All utilities follow AWS Well-Architected principles with built-in security, cost optimization, and operational excellence.

## [`Observability`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/utilities/observability)

[`Observability`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/utilities/observability) provides comprehensive monitoring, logging, and alerting with automatic property injection and Lambda Powertools integration.

### Key Features
- **Property Injection**: Automatic observability configuration across AWS services
- **Lambda Powertools**: Structured logging, metrics, and tracing for Python/Node.js
- **CloudWatch Integration**: Dashboards, alarms, and custom metrics
- **X-Ray Tracing**: End-to-end request flow visualization
- **Bedrock Monitoring**: Specialized observability for Amazon Bedrock workloads

### Components
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

### Usage Example
```typescript
import { Observability } from '@cdklabs/appmod-catalog-blueprints';

const observability = new Observability(this, 'Observability', {
  enableDashboard: true,
  enableTracing: true,
  metricsNamespace: 'MyApp'
});

// Monitor resources
observability.addLambdaFunction(myLambdaFunction);
observability.addStateMachine(myStateMachine);
```

## [`Data Masking`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/utilities/lambda_layers/data-masking)

[`Data Masking`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/utilities/lambda_layers/data-masking) Lambda layer for PII protection in serverless applications.

### Key Features
- **Built-in Patterns**: SSN, credit cards, emails, phone numbers, passport numbers
- **Custom Patterns**: Extensible regex-based masking for domain-specific data
- **Multi-Runtime**: Node.js 16.x, 18.x, 20.x support
- **Easy Integration**: Layer attachment with environment variable configuration

### Components
- `DataMaskingLayerConstruct` - Lambda layer with built-in and custom masking patterns

### Usage Example
```typescript
import { DataMaskingLayerConstruct } from '@cdklabs/appmod-catalog-blueprints';

const maskingLayer = new DataMaskingLayerConstruct(this, 'DataMasking', {
  customPatterns: {
    customerId: {
      regex: 'CUST-\\d{8}',
      mask: 'CUST-XXXXXXXX'
    }
  }
});

maskingLayer.addToFunction(myLambdaFunction);
```

## [`DataLoader`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/utilities/data-loader.ts)

[`DataLoader`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/utilities/data-loader.ts) custom resource for loading initial data into databases with multi-engine support (MySQL, PostgreSQL, Aurora). Handles SQL files, dumps, batch processing, and VPC deployment.

### Components
- `DataLoader` - Custom resource for database initialization and data loading

### Usage Example
```typescript
import { DataLoader, DatabaseEngine } from '@cdklabs/appmod-catalog-blueprints';

const dataLoader = new DataLoader(this, 'DataLoader', {
  databaseConfig: {
    engine: DatabaseEngine.POSTGRESQL,
    cluster: myAuroraCluster,
    secret: myDatabaseSecret
  },
  dataFiles: ['schema.sql', 'reference-data.sql']
});
```

## [`Lambda IAM Utils`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/utilities/lambda-iam-utils.ts)

[`Lambda IAM Utils`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/utilities/lambda-iam-utils.ts) provides automated IAM policy generation for Lambda functions with observability-aware permissions, VPC support, and unique naming.

### Components
- `LambdaIamUtils` - Static utility class for generating Lambda IAM policies and permissions

### Usage Example
```typescript
import { LambdaIamUtils } from '@cdklabs/appmod-catalog-blueprints';

const logPermissions = LambdaIamUtils.createLogsPermissions({
  scope: this,
  functionName: 'my-function',
  region: 'us-east-1',
  account: '123456789012',
  enableObservability: true
});

myLambdaFunction.role?.addToPrincipalPolicy(logPermissions.policyStatements[0]);
```
