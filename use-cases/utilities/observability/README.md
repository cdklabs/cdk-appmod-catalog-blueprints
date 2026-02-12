# Observability

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/utilities/observability)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/utilities/observability/)

Comprehensive observability framework for AWS applications with automatic property injection, Lambda Powertools integration, and CloudWatch Transaction Search for cost-effective X-Ray trace collection.

## Overview

The Observability module provides a complete solution for monitoring, logging, and tracing AWS applications. It follows AWS Well-Architected principles and integrates seamlessly with AWS native services.

### Key Features

- **Property Injection**: Automatic observability configuration across AWS services
- **Lambda Powertools**: Structured logging, metrics, and tracing for Python/Node.js
- **CloudWatch Integration**: Dashboards, alarms, and custom metrics
- **X-Ray Tracing**: End-to-end request flow visualization
- **Transaction Search**: Cost-effective trace collection through CloudWatch Logs
- **Bedrock Monitoring**: Specialized observability for Amazon Bedrock workloads
- **Data Protection**: PII masking and sensitive data protection in logs

## Components

### Property Injectors

Property injectors automatically configure observability features for AWS resources using CDK Aspects.

#### LambdaObservabilityPropertyInjector

Automatically enables X-Ray tracing for Lambda functions.

```typescript
import { LambdaObservabilityPropertyInjector } from '@cdklabs/appmod-catalog-blueprints';
import { Aspects } from 'aws-cdk-lib';

// Apply to entire stack
Aspects.of(stack).add(new LambdaObservabilityPropertyInjector());

// All Lambda functions in the stack will have X-Ray tracing enabled
```

#### StateMachineObservabilityPropertyInjector

Enables logging for Step Functions state machines.

```typescript
import { StateMachineObservabilityPropertyInjector } from '@cdklabs/appmod-catalog-blueprints';
import { Aspects } from 'aws-cdk-lib';

Aspects.of(stack).add(new StateMachineObservabilityPropertyInjector({
  logLevel: 'ALL',
  includeExecutionData: true
}));
```

#### CloudfrontDistributionObservabilityPropertyInjector

Configures monitoring and logging for CloudFront distributions.

```typescript
import { CloudfrontDistributionObservabilityPropertyInjector } from '@cdklabs/appmod-catalog-blueprints';
import { Aspects } from 'aws-cdk-lib';

Aspects.of(stack).add(new CloudfrontDistributionObservabilityPropertyInjector({
  enableAccessLogs: true,
  enableMetrics: true
}));
```

### CloudWatch Transaction Search

Enables cost-effective collection and search of all X-Ray traces through CloudWatch Logs.

#### Overview

CloudWatch Transaction Search provides a cost-effective alternative to X-Ray's native trace storage by routing all trace data through CloudWatch Logs. This approach offers:

- **Lower costs**: CloudWatch Logs pricing instead of X-Ray trace storage pricing
- **Full visibility**: All spans collected, not just sampled traces
- **Flexible retention**: Use CloudWatch Logs retention policies
- **Powerful search**: Query traces using CloudWatch Logs Insights

#### How It Works

The `CloudWatchTransactionSearch` construct performs three configuration steps:

1. **CloudWatch Logs Resource Policy**: Creates a resource-based policy allowing X-Ray to send trace data to CloudWatch Logs
2. **X-Ray Destination**: Configures X-Ray to route trace segments to CloudWatch Logs instead of X-Ray storage
3. **Sampling Configuration**: Sets the percentage of spans to index for trace summaries (default 1%)

#### Usage

```typescript
import { CloudWatchTransactionSearch } from '@cdklabs/appmod-catalog-blueprints';

// Enable with default settings (1% sampling)
new CloudWatchTransactionSearch(this, 'TransactionSearch');

// Customize sampling percentage
new CloudWatchTransactionSearch(this, 'TransactionSearch', {
  samplingPercentage: 5,  // Index 5% of spans
  policyName: 'MyTransactionSearchPolicy'
});
```

#### Configuration Properties

```typescript
export interface CloudWatchTransactionSearchProps {
  /**
   * Sampling percentage for span indexing
   * 
   * Controls what percentage of spans are indexed for trace summaries.
   * Higher percentages provide more detailed trace summaries but increase costs.
   * 
   * @default 1 (1% of spans indexed)
   */
  readonly samplingPercentage?: number;

  /**
   * Name of the CloudWatch Logs resource policy
   * 
   * @default 'TransactionSearchXRayAccess'
   */
  readonly policyName?: string;
}
```

#### Important Considerations

**Account-Level Configuration**
- Transaction Search is configured at the AWS account and region level
- Once enabled, it affects all X-Ray traces in that account/region
- Multiple stacks can safely deploy this construct - it's idempotent

**Cost Implications**
- All trace data is sent to CloudWatch Logs (charged at CloudWatch Logs rates)
- Sampling percentage controls indexing costs (higher = more indexed spans)
- 1% sampling is recommended for most use cases

**Cleanup Behavior**
- Stack deletion removes the CloudWatch Logs resource policy
- X-Ray destination and sampling rules are preserved (to avoid affecting other stacks)
- To fully disable Transaction Search, manually run:
  ```bash
  aws xray update-trace-segment-destination --destination XRay
  ```

#### Querying Traces

Once enabled, query traces using CloudWatch Logs Insights:

```sql
-- Find all traces for a specific operation
fields @timestamp, @message
| filter @message like /MyOperation/
| sort @timestamp desc
| limit 100

-- Find slow traces (>1 second)
fields @timestamp, duration
| filter duration > 1000
| sort duration desc
| limit 20

-- Count errors by service
fields service, error
| filter error = true
| stats count() by service
```

#### Example: Full Observability Stack

```typescript
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  CloudWatchTransactionSearch,
  LambdaObservabilityPropertyInjector,
  StateMachineObservabilityPropertyInjector
} from '@cdklabs/appmod-catalog-blueprints';
import { Aspects } from 'aws-cdk-lib';

export class ObservabilityStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Enable Transaction Search for cost-effective trace collection
    new CloudWatchTransactionSearch(this, 'TransactionSearch', {
      samplingPercentage: 1
    });

    // Auto-enable X-Ray tracing for all Lambda functions
    Aspects.of(this).add(new LambdaObservabilityPropertyInjector());

    // Auto-enable logging for all Step Functions
    Aspects.of(this).add(new StateMachineObservabilityPropertyInjector());

    // Your application resources here...
  }
}
```

### Bedrock Observability

Specialized observability for Amazon Bedrock workloads.

```typescript
import { BedrockObservability } from '@cdklabs/appmod-catalog-blueprints';

const bedrockObs = new BedrockObservability(this, 'BedrockObs', {
  enableDataProtection: true,
  retentionDays: 30,
  encryptionKey: myKmsKey
});

// Access log groups
const modelLogGroup = bedrockObs.modelInvocationLogGroup;
const agentLogGroup = bedrockObs.agentLogGroup;
```

### Lambda Powertools Configuration

Configure Lambda Powertools for structured logging and metrics.

```typescript
import { PowertoolsConfig } from '@cdklabs/appmod-catalog-blueprints';

const powertoolsConfig = new PowertoolsConfig({
  serviceName: 'my-service',
  logLevel: 'INFO',
  metricsNamespace: 'MyApp'
});

// Apply to Lambda function
const myFunction = new Function(this, 'MyFunction', {
  runtime: Runtime.PYTHON_3_11,
  handler: 'index.handler',
  code: Code.fromAsset('lambda'),
  environment: powertoolsConfig.environment
});
```

### Data Protection

Configure data protection policies for CloudWatch Logs to mask PII.

```typescript
import { LogGroupDataProtectionProps } from '@cdklabs/appmod-catalog-blueprints';
import { LogGroup } from 'aws-cdk-lib/aws-logs';

const logGroup = new LogGroup(this, 'MyLogGroup', {
  dataProtectionPolicy: LogGroupDataProtectionProps.createPolicy({
    identifiers: [
      'EmailAddress',
      'CreditCardNumber',
      'SSN',
      'PhoneNumber'
    ],
    auditDestination: auditLogGroup
  })
});
```

## Observable Interface

The `Observable` interface provides a standardized contract for constructs that support observability.

```typescript
export interface Observable {
  /**
   * Enable observability features for this construct
   */
  enableObservability(config: ObservabilityConfig): void;

  /**
   * Get CloudWatch log groups created by this construct
   */
  getLogGroups(): LogGroup[];

  /**
   * Get CloudWatch metrics for this construct
   */
  getMetrics(): Metric[];
}
```

Implement this interface in your custom constructs to provide consistent observability:

```typescript
import { Observable, ObservabilityConfig } from '@cdklabs/appmod-catalog-blueprints';

export class MyConstruct extends Construct implements Observable {
  private logGroup: LogGroup;

  enableObservability(config: ObservabilityConfig): void {
    // Enable X-Ray tracing
    this.myFunction.addEnvironment('AWS_XRAY_TRACING_ENABLED', 'true');
    
    // Configure structured logging
    this.myFunction.addEnvironment('LOG_LEVEL', config.logLevel);
  }

  getLogGroups(): LogGroup[] {
    return [this.logGroup];
  }

  getMetrics(): Metric[] {
    return [
      this.myFunction.metricInvocations(),
      this.myFunction.metricErrors()
    ];
  }
}
```

## Best Practices

### 1. Use Property Injectors for Automatic Configuration

Apply property injectors at the stack level to automatically configure observability for all resources:

```typescript
Aspects.of(stack).add(new LambdaObservabilityPropertyInjector());
Aspects.of(stack).add(new StateMachineObservabilityPropertyInjector());
```

### 2. Enable Transaction Search Early

Deploy Transaction Search in your foundational infrastructure stack:

```typescript
// In your base/foundation stack
new CloudWatchTransactionSearch(this, 'TransactionSearch');
```

### 3. Use Structured Logging

Always use structured logging with Lambda Powertools:

```python
from aws_lambda_powertools import Logger

logger = Logger(service="my-service")

@logger.inject_lambda_context
def handler(event, context):
    logger.info("Processing request", extra={
        "request_id": event["requestId"],
        "user_id": event["userId"]
    })
```

### 4. Implement the Observable Interface

Make your custom constructs observable:

```typescript
export class MyConstruct extends Construct implements Observable {
  // Implement Observable interface methods
}
```

### 5. Protect Sensitive Data

Always enable data protection for logs containing PII:

```typescript
const logGroup = new LogGroup(this, 'LogGroup', {
  dataProtectionPolicy: LogGroupDataProtectionProps.createPolicy({
    identifiers: ['EmailAddress', 'CreditCardNumber']
  })
});
```

## Cost Optimization

### Transaction Search Sampling

Choose sampling percentage based on your needs:

- **1% (default)**: Recommended for most applications, provides good trace summaries
- **5-10%**: For applications requiring more detailed trace analysis
- **100%**: Only for critical applications or troubleshooting (highest cost)

### Log Retention

Set appropriate retention periods:

```typescript
const logGroup = new LogGroup(this, 'LogGroup', {
  retention: RetentionDays.ONE_WEEK  // Adjust based on compliance needs
});
```

### Metric Filters

Use metric filters instead of custom metrics when possible:

```typescript
logGroup.addMetricFilter('ErrorCount', {
  filterPattern: FilterPattern.literal('[ERROR]'),
  metricNamespace: 'MyApp',
  metricName: 'Errors',
  metricValue: '1'
});
```

## Troubleshooting

### Transaction Search Not Working

1. **Check X-Ray destination**:
   ```bash
   aws xray get-trace-segment-destination
   ```
   Should return `"Destination": "CloudWatchLogs"`

2. **Verify CloudWatch Logs policy**:
   ```bash
   aws logs describe-resource-policies
   ```
   Should show the Transaction Search policy

3. **Check sampling rules**:
   ```bash
   aws xray get-indexing-rules
   ```
   Should show your configured sampling percentage

### Missing Traces

- Ensure Lambda functions have X-Ray tracing enabled
- Check IAM permissions for X-Ray and CloudWatch Logs
- Verify VPC endpoints if using private subnets

### High Costs

- Reduce sampling percentage
- Implement log retention policies
- Use metric filters instead of custom metrics
- Enable data protection to reduce log volume

## References

- [AWS X-Ray Documentation](https://docs.aws.amazon.com/xray/)
- [CloudWatch Transaction Search](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Enable-TransactionSearch.html)
- [Lambda Powertools](https://docs.powertools.aws.dev/)
- [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)
