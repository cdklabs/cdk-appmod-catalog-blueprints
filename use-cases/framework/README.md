# Infrastructure Foundation

## Overview

The Infrastructure Foundation provides core infrastructure components and utilities for building scalable, secure, and well-architected applications on AWS. These foundational constructs serve as building blocks that can be composed together or used independently to create robust cloud infrastructure.

The foundation layer abstracts common infrastructure patterns and provides sensible defaults while maintaining flexibility for customization. All components follow AWS Well-Architected principles and include built-in security, observability, and cost optimization features.

## Components

### Bedrock

#### `BedrockModelUtils`
Contains utility functions to handle the following:
- Derive the actual Model ID factoring in cases where cross region inferencing is used.
- Centralized default model to used
- Generate IAM permission to invoke the model

### Agentic Framework

The `agents/` component contains the agentic framework that makes it easy to incorporate agentic functionality into your CDK application. It simplifies the deployment of tools and agents.

Currently, Batch mode agents are supported. Batch mode is typically used in cases such as document processing where the Agent would leverage the use the provided tools to process the document.

Interactive agents are *coming soon*. Interactive mode allows the use of agents in chatbots.

### Network Foundation

#### Network Construct
The [`Network`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/foundation/network.ts) construct provides a complete VPC setup with intelligent subnet configuration and VPC endpoint management.

**Key Features:**
- **Flexible VPC Configuration**: Supports both internet-connected and fully private VPC deployments
- **Multi-AZ Design**: Automatic distribution across availability zones for high availability
- **Intelligent Subnetting**: Pre-configured subnet types (Public, Private with Egress, Isolated) with optimal CIDR allocation
- **VPC Endpoints**: Automated creation of interface and gateway endpoints for AWS services
- **Security Groups**: Automatic security group creation for VPC endpoints with least-privilege access

**Architecture Patterns:**
- **Standard VPC** (default): Public, Private with NAT, and Isolated subnets across multiple AZs
- **Private-Only VPC**: Isolated subnets only for maximum security with no internet connectivity
- **Custom Subnet Configuration**: Override default subnet layout for specific requirements

**Usage Example:**
```typescript
// Standard VPC with internet connectivity
const network = new Network(this, 'AppNetwork', {
  maxAzs: 3,
  natGateways: 2
});

// Private-only VPC for sensitive workloads
const privateNetwork = new Network(this, 'PrivateNetwork', {
  private: true,
  ipAddresses: IpAddresses.cidr('10.1.0.0/16')
});

// Create VPC endpoints for AWS services
network.createServiceEndpoint('S3Endpoint', InterfaceVpcEndpointAwsService.S3);
network.createServiceEndpoint('LambdaEndpoint', InterfaceVpcEndpointAwsService.LAMBDA);
```

#### AccessLog Construct
The [`AccessLog`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/foundation/access-log.ts) construct provides centralized access logging infrastructure for AWS services.

**Key Features:**
- **Centralized Logging**: Single S3 bucket for all service access logs with organized prefixes
- **Lifecycle Management**: Automatic transition to cheaper storage classes and deletion policies
- **Security Hardened**: Bucket policies configured for AWS service log delivery with encryption
- **Cost Optimized**: Default lifecycle rules transition to IA after 30 days, delete after 90 days
- **Compliance Ready**: Versioning and retention policies for audit requirements

**Supported Services:**
- Application Load Balancer (ALB) access logs
- CloudFront distribution logs
- S3 bucket access logs
- VPC Flow Logs
- API Gateway access logs

#### EventBridge Broker
The [`EventbridgeBroker`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/foundation/eventbridge-broker.ts) construct enables event-driven architecture with custom EventBridge integration.

**Key Features:**
- **Custom Event Bus**: Dedicated EventBridge bus for application events with KMS encryption
- **Step Functions Integration**: Built-in support for sending events from Step Functions workflows
- **Event Standardization**: Consistent event structure and source identification
- **Security**: KMS encryption for events in transit and at rest
- **Scalability**: Automatic scaling and retry mechanisms for event delivery

**Event Flow:**
```
Application → EventBridge Bus → Event Rules → Target Services (Lambda, SQS, SNS, etc.)
```

### Runtime & Configuration

#### DefaultRuntimes
The [`DefaultRuntimes`](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/blob/main/use-cases/framework/custom-resource/default-runtimes.ts) class provides standardized Lambda runtime configurations across all constructs.

**Key Features:**
- **Centralized Runtime Management**: Single source of truth for Lambda runtime versions
- **Latest Versions**: Always uses the most recent stable runtime versions
- **Consistent Bundling**: Standardized bundling options for Python functions with platform-specific builds
- **Easy Updates**: Update runtime versions across all constructs from one location

**Current Runtimes:**
- **Node.js**: `NODEJS_22_X` - Latest Node.js runtime with improved performance
- **Python**: `PYTHON_3_13` - Latest Python runtime with enhanced security features
- **Python Bundling**: Optimized for `linux/amd64` platform with consistent image versions

## Architecture Patterns

### Layered Infrastructure Design
The foundation components are designed to work together in a layered architecture:

```
┌─────────────────────────────────────────┐
│           Application Layer             │
├─────────────────────────────────────────┤
│          Use Case Constructs            │
├─────────────────────────────────────────┤
│         Foundation Components           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ Network │ │AccessLog│ │EventBus │    │
│  └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────┤
│            AWS Services                 │
└─────────────────────────────────────────┘
```

### Security-First Design
All foundation components implement security best practices:
- **Encryption**: KMS encryption for data at rest and in transit
- **Least Privilege**: IAM policies with minimal required permissions
- **Network Isolation**: Private subnets and VPC endpoints for service communication
- **Audit Logging**: Comprehensive logging for compliance and monitoring

### Cost Optimization
Built-in cost optimization features:
- **Lifecycle Policies**: Automatic transition to cheaper storage classes
- **Right-Sized Resources**: Optimal resource sizing based on usage patterns
- **Efficient Networking**: Strategic NAT Gateway placement and VPC endpoint usage
- **Resource Cleanup**: Configurable removal policies for different environments

## Usage Patterns

### Basic Infrastructure Setup
```typescript
// Create foundational infrastructure
const network = new Network(this, 'Network');
const accessLog = new AccessLog(this, 'AccessLog');
const eventBroker = new EventbridgeBroker(this, 'EventBroker', {
  eventSource: 'myapp.events'
});

// Use in higher-level constructs
const documentProcessing = new BedrockDocumentProcessing(this, 'DocProcessing', {
  network: network,
  eventbridgeBroker: eventBroker,
  enableObservability: true
});
```

### Environment-Specific Configuration
```typescript
// Production environment with high availability
const prodNetwork = new Network(this, 'ProdNetwork', {
  maxAzs: 3,
  natGateways: 3, // One per AZ for redundancy
});

// Development environment with cost optimization
const devNetwork = new Network(this, 'DevNetwork', {
  maxAzs: 2,
  natGateways: 1, // Single NAT for cost savings
});
```