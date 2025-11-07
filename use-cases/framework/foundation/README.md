# Infrastructure Foundation

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/framework/foundation)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/)

Core infrastructure components and utilities for building scalable, secure applications on AWS. Provides standardized patterns for networking, logging, and event-driven architectures.

## Network

Standardized VPC construct with configurable subnet layouts, NAT gateways, and VPC endpoints.

**Features:**
- **Flexible subnet configuration**: Public, private, and isolated subnets with customizable CIDR blocks
- **Private-only mode**: Option for fully isolated VPCs without internet connectivity
- **VPC endpoints**: Built-in support for AWS service endpoints (S3, Lambda, etc.)
- **Security groups**: Automatic security group creation for VPC endpoints

**Usage:**
```typescript
import { Network } from '@cdklabs/appmod-catalog-blueprints';

// Standard VPC with public, private, and isolated subnets
const network = new Network(this, 'AppNetwork', {
  maxAzs: 2,
  natGateways: 1
});

// Private-only VPC for sensitive workloads
const privateNetwork = new Network(this, 'PrivateNetwork', {
  private: true,
  maxAzs: 2
});

// Add VPC endpoint for S3 access
network.createServiceEndpoint('S3', InterfaceVpcEndpointAwsService.S3);
```

## Access Log

Centralized access logging infrastructure with S3 storage, lifecycle management, and proper IAM permissions.

**Features:**
- **Centralized logging**: Single S3 bucket for all access logs
- **Lifecycle management**: Automatic transition to cheaper storage classes and deletion
- **Security**: Encrypted storage with proper IAM policies
- **Cost optimization**: Configurable retention and storage class transitions

**Usage:**
```typescript
import { AccessLog } from '@cdklabs/appmod-catalog-blueprints';

const accessLog = new AccessLog(this, 'AccessLogs', {
  bucketName: 'my-app-access-logs',
  lifecycleRules: [{
    id: 'DeleteOldLogs',
    expiration: cdk.Duration.days(90),
    transitions: [{
      storageClass: s3.StorageClass.INFREQUENT_ACCESS,
      transitionAfter: cdk.Duration.days(30)
    }]
  }]
});
```

## EventBridge Broker

Centralized event routing and management using Amazon EventBridge for decoupled architectures.

**Features:**
- **Event routing**: Custom event bus for application events
- **Decoupled architecture**: Enable loose coupling between components
- **Event patterns**: Support for complex event filtering and routing
- **Integration ready**: Easy integration with Lambda, Step Functions, and other AWS services

**Usage:**
```typescript
import { EventBridgeBroker } from '@cdklabs/appmod-catalog-blueprints';

const eventBroker = new EventBridgeBroker(this, 'AppEvents', {
  eventBusName: 'my-app-events'
});

// Add rules and targets as needed
eventBroker.eventBus.addRule('ProcessDocuments', {
  eventPattern: {
    source: ['document.processor'],
    detailType: ['Document Processed']
  },
  targets: [new targets.LambdaFunction(processingFunction)]
});
```

## Architecture Patterns

### Multi-Tier Application
```typescript
const network = new Network(this, 'AppNetwork');
const accessLog = new AccessLog(this, 'AccessLogs');
const eventBroker = new EventBridgeBroker(this, 'Events');

// Use network.vpc for your application resources
// Use accessLog.bucket for ALB and CloudFront access logs
// Use eventBroker.eventBus for inter-service communication
```

### Private Application
```typescript
const privateNetwork = new Network(this, 'PrivateNetwork', {
  private: true,
  maxAzs: 2
});

// Add required VPC endpoints
privateNetwork.createServiceEndpoint('Lambda', InterfaceVpcEndpointAwsService.LAMBDA);
privateNetwork.createServiceEndpoint('S3', InterfaceVpcEndpointAwsService.S3);
```

## Best Practices

### Security
- Use private subnets for application workloads
- Implement VPC endpoints to avoid internet traffic for AWS services
- Enable access logging for all public-facing resources
- Use security groups with least-privilege access

### Cost Optimization
- Configure appropriate NAT gateway count based on availability requirements
- Use lifecycle rules for access logs to manage storage costs
- Consider private-only VPCs for internal applications

### Scalability
- Design subnet CIDR blocks with growth in mind
- Use multiple AZs for high availability
- Implement EventBridge for scalable event-driven architectures

## Integration with Other Constructs

Infrastructure Foundation components are designed to work seamlessly with other AppMod Catalog constructs:

- **Document Processing**: Provides VPC for Lambda functions and Step Functions
- **Web Applications**: Supplies access logging for CloudFront and ALB
- **Observability**: Integrates with monitoring and logging solutions
- **Agentic AI**: Supports secure networking for AI workloads

## Contributing

See the main [CONTRIBUTING.md](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/CONTRIBUTING.md) for guidelines on contributing to this project.
