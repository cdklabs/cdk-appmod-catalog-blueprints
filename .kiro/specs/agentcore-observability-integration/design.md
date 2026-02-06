# Design: AgentCore Observability Integration

## Overview

This design document specifies how to integrate AWS Bedrock AgentCore observability into the BaseAgent construct. The integration will be activated via the existing `enableObservability` flag and will work seamlessly alongside Lambda Powertools observability to provide comprehensive monitoring at both function and agent levels.

## Design Principles

1. **Unified Observability**: Single flag (`enableObservability`) controls both Lambda Powertools and AgentCore observability
2. **Least Privilege**: Grant only the minimal IAM permissions required by AWS documentation
3. **Backward Compatibility**: No breaking changes to existing agents or API
4. **Inheritance**: AgentCore observability automatically inherited by all agent types (BatchAgent, future StreamingAgent)
5. **Consistency**: Use existing ObservableProps for configuration (service name, namespace)
6. **Simplicity**: Minimal code changes following cross-cutting concern pattern

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  BaseAgent (Base Layer)                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Constructor Flow:                                          │
│  1. Create encryption key                                   │
│  2. Create IAM role                                         │
│  3. Process tools (grant read access)                       │
│  4. Add Bedrock model permissions                           │
│  5. Configure Lambda Powertools (if enableObservability)    │
│  6. Configure AgentCore observability (if enableObservability) ← NEW
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓ inherits
┌─────────────────────────────────────────────────────────────┐
│  BatchAgent (Concrete Layer)                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  - Creates Lambda function                                  │
│  - Inherits environment variables from BaseAgent           │
│  - Inherits IAM permissions from BaseAgent                  │
│  - Adds ADOT Lambda Layer (if enableObservability)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘


### Observability Systems Integration

```
┌──────────────────────────────────────────────────────────────┐
│  Agent Lambda Function                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────┐  ┌──────────────────────────┐   │
│  │ Lambda Powertools      │  │ AgentCore Observability  │   │
│  ├────────────────────────┤  ├──────────────────────────┤   │
│  │ - Function logs        │  │ - Agent invocations      │   │
│  │ - Function traces      │  │ - Reasoning steps        │   │
│  │ - Function metrics     │  │ - Tool usage             │   │
│  │ - Custom metrics       │  │ - Token consumption      │   │
│  │                        │  │ - Agent latency          │   │
│  └────────────────────────┘  └──────────────────────────┘   │
│           ↓                            ↓                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Amazon CloudWatch                              │ │
│  │  - Unified service name and namespace                  │ │
│  │  - Correlated metrics and logs                         │ │
│  │  - Complete visibility (function + agent levels)       │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Both systems run independently without conflicts
- Both use the same service name and namespace for correlation
- Lambda Powertools provides function-level insights
- AgentCore provides agent-specific insights
- Both publish to CloudWatch for unified monitoring



## Implementation Details

### 1. BaseAgent Constructor Changes

**Location**: `use-cases/framework/agents/base-agent.ts`

**Integration Point**: After Lambda Powertools setup (after PropertyInjectors configuration)

**Code Structure** (inline in constructor):
```typescript
// Existing code...
if (props.enableObservability) {
  PropertyInjectors.of(this).add(
    new LambdaObservabilityPropertyInjector(this.logGroupDataProtection),
  );
  
  // NEW: AgentCore observability configuration
  // Add IAM permissions for AgentCore observability
  this.agentRole.addToPrincipalPolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'logs:CreateLogGroup',
      'logs:CreateLogStream',
      'logs:PutLogEvents',
      'xray:PutTraceSegments',
      'xray:PutTelemetryRecords',
    ],
    resources: ['*'], // CloudWatch Logs and X-Ray require wildcard
  }));
}
```

**Rationale for Inline Approach:**
- Follows existing pattern for Lambda Powertools integration
- Keeps related observability code together
- Minimal code changes (3-5 lines)
- Easy to understand and maintain
- Consistent with repository patterns



### 2. Environment Variables Configuration

**Environment Variables to Set** (in BatchAgent when creating Lambda function):

```typescript
// In BatchAgent constructor, when creating agentFunction
const environmentVariables: Record<string, string> = {
  // Existing environment variables...
  AGENT_TOOLS_LOCATIONS: JSON.stringify(this.agentToolsLocationDefinitions),
  BEDROCK_MODEL_ID: this.bedrockModel.modelId,
  // ... other existing variables
};

// NEW: Add AgentCore observability environment variables when enabled
if (props.enableObservability) {
  environmentVariables.AGENT_OBSERVABILITY_ENABLED = 'true';
  environmentVariables.OTEL_RESOURCE_ATTRIBUTES = 
    `service.name=${props.metricServiceName || props.agentName},` +
    `aws.log.group.names=/aws/lambda/${props.agentName}`;
  environmentVariables.OTEL_EXPORTER_OTLP_LOGS_HEADERS = 
    `x-aws-bedrock-agent-id=${props.agentName}`;
  // ADOT Layer wrapper for automatic instrumentation
  environmentVariables.AWS_LAMBDA_EXEC_WRAPPER = '/opt/otel-instrument';
}
```

**Environment Variable Details:**

| Variable | Purpose | Value Source | Example |
|----------|---------|--------------|---------|
| `AGENT_OBSERVABILITY_ENABLED` | Enable AgentCore observability | Hardcoded `'true'` | `'true'` |
| `OTEL_RESOURCE_ATTRIBUTES` | Service identification for OTEL | `metricServiceName` from ObservableProps, Lambda function name | `service.name=fraud-detection,aws.log.group.names=/aws/lambda/FraudDetectionAgent` |
| `OTEL_EXPORTER_OTLP_LOGS_HEADERS` | Agent identification header | Agent name from props | `x-aws-bedrock-agent-id=FraudDetectionAgent` |
| `AWS_LAMBDA_EXEC_WRAPPER` | ADOT Layer wrapper script | Hardcoded `'/opt/otel-instrument'` | `'/opt/otel-instrument'` |

**Value Construction Strategy:**
- Use `metricServiceName` from ObservableProps (falls back to `agentName` if not provided)
- Use Lambda function name for log group (follows AWS Lambda naming convention)
- Use agent name for agent identification header
- `AWS_LAMBDA_EXEC_WRAPPER` enables automatic OTEL instrumentation via ADOT layer
- All values encrypted using existing `encryptionKey` from BaseAgent



### 3. IAM Permissions

**Permissions Required** (based on AWS documentation):

```typescript
new PolicyStatement({
  effect: Effect.ALLOW,
  actions: [
    // CloudWatch Logs permissions
    'logs:CreateLogGroup',
    'logs:CreateLogStream',
    'logs:PutLogEvents',
    // X-Ray permissions
    'xray:PutTraceSegments',
    'xray:PutTelemetryRecords',
  ],
  resources: ['*'], // Required by CloudWatch Logs and X-Ray services
})
```

**Permission Details:**

| Permission | Service | Purpose | Justification |
|------------|---------|---------|---------------|
| `logs:CreateLogGroup` | CloudWatch Logs | Create log groups for agent traces | Required for first-time agent execution |
| `logs:CreateLogStream` | CloudWatch Logs | Create log streams within log groups | Required for each agent invocation |
| `logs:PutLogEvents` | CloudWatch Logs | Write log events to streams | Required for trace data collection |
| `xray:PutTraceSegments` | X-Ray | Send trace segments to X-Ray | Required for distributed tracing |
| `xray:PutTelemetryRecords` | X-Ray | Send telemetry data to X-Ray | Required for trace metadata |

**Implementation Strategy:**
- Add permissions conditionally (only when `enableObservability: true`)
- Add as inline policy statement to existing `agentRole`
- Use wildcard resource (`*`) as required by CloudWatch Logs and X-Ray
- Document CDK Nag suppression if needed (AwsSolutions-IAM5)

**CDK Nag Compliance:**
- Wildcard resource may trigger AwsSolutions-IAM5 warning
- Suppression justified: CloudWatch Logs and X-Ray require wildcard for dynamic resource creation
- Alternative: Suppress with clear justification in code comments

### 3a. CloudWatch Transaction Search (Optional Account-Level Configuration)

**Important**: CloudWatch Transaction Search is an **account-level configuration** that can be enabled using the new `CloudWatchTransactionSearch` utility construct.

**What is Transaction Search?**
- Enables cost-effective collection of all X-Ray spans through CloudWatch Logs
- Provides full end-to-end trace visibility on all ingested spans
- Indexes 1% of spans by default for trace summary analysis
- Uses CloudWatch Logs pricing instead of X-Ray pricing

**Automatic Configuration with CDK Construct**:

The repository provides a utility construct that automatically configures Transaction Search:

```typescript
import { CloudWatchTransactionSearch } from '@cdklabs/cdk-appmod-catalog-blueprints';

// Enable Transaction Search for the account
new CloudWatchTransactionSearch(this, 'TransactionSearch', {
  samplingPercentage: 1,  // Optional: 1% is default
  policyName: 'TransactionSearchXRayAccess'  // Optional: default name
});
```

**What the Construct Does**:
1. **Checks if Transaction Search is already enabled** (idempotent)
2. **Creates CloudWatch Logs resource-based policy** to allow X-Ray to send traces
3. **Configures X-Ray** to send trace segments to CloudWatch Logs
4. **Sets sampling percentage** for span indexing (default 1%)
5. **Verifies configuration** is active

**Construct Features**:
- **Idempotent**: Safe to deploy multiple times, only applies configuration if needed
- **Custom Resource**: Uses Lambda-backed custom resource for account-level configuration
- **Automatic cleanup**: Removes CloudWatch Logs policy on stack deletion (preserves X-Ray settings)
- **Configurable**: Adjust sampling percentage and policy name

**Manual Configuration** (Alternative):

If you prefer manual configuration or need to enable Transaction Search outside of CDK:

1. **Create CloudWatch Logs resource-based policy**:
   ```bash
   aws logs put-resource-policy \
     --policy-name TransactionSearchXRayAccess \
     --policy-document '{
       "Version": "2012-10-17",
       "Statement": [{
         "Sid": "TransactionSearchXRayAccess",
         "Effect": "Allow",
         "Principal": {"Service": "xray.amazonaws.com"},
         "Action": "logs:PutLogEvents",
         "Resource": [
           "arn:aws:logs:region:account-id:log-group:aws/spans:*",
           "arn:aws:logs:region:account-id:log-group:/aws/application-signals/data:*"
         ],
         "Condition": {
           "ArnLike": {"aws:SourceArn": "arn:aws:xray:region:account-id:*"},
           "StringEquals": {"aws:SourceAccount": "account-id"}
         }
       }]
     }'
   ```

2. **Configure X-Ray to send traces to CloudWatch Logs**:
   ```bash
   aws xray update-trace-segment-destination --destination CloudWatchLogs
   ```

3. **Configure sampling percentage** (optional, default is 1%):
   ```bash
   aws xray update-indexing-rule \
     --name "Default" \
     --rule '{"Probabilistic": {"DesiredSamplingPercentage": 1}}'
   ```

4. **Verify Transaction Search is active**:
   ```bash
   aws xray get-trace-segment-destination
   # Expected response: {"Destination": "CloudWatchLogs", "Status": "ACTIVE"}
   ```

**Agent Construct Behavior**:
- The BaseAgent construct automatically sends traces to X-Ray when `enableObservability: true`
- If Transaction Search is enabled (via construct or manually), traces automatically flow to CloudWatch Logs
- No additional configuration needed in the agent construct
- Agents benefit from Transaction Search without code changes

**Usage Example with Agent**:

```typescript
// Enable Transaction Search for the account (once per account/region)
new CloudWatchTransactionSearch(this, 'TransactionSearch');

// Create agent with observability enabled
const agent = new BatchAgent(this, 'MyAgent', {
  agentName: 'my-agent',
  enableObservability: true,  // Traces will go to CloudWatch Logs via Transaction Search
  agentDefinition: {
    // ... agent configuration
  }
});
```

**Documentation Note**:
- Add note in README about Transaction Search as an optional feature
- Explain benefits (cost savings, better trace visibility)
- Show how to use the `CloudWatchTransactionSearch` construct

**Reference**: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Enable-TransactionSearch.html


### 4. BatchAgent Integration

**Changes Required in BatchAgent:**

1. **Add ADOT Lambda Layer** (when `enableObservability: true`):
   - Reference: https://aws-otel.github.io/docs/getting-started/lambda/lambda-python
   - ADOT (AWS Distro for OpenTelemetry) Lambda Layer provides OTEL instrumentation
   - Required for AgentCore observability to function properly

2. **Environment Variables** (automatically inherited from BaseAgent):
   - No explicit passing needed
   - Environment variables set in BatchAgent constructor are automatically available to Lambda function

**Implementation in BatchAgent Constructor:**

```typescript
// In BatchAgent constructor
const layers: LayerVersion[] = [
  ...props.agentDefinition.lambdaLayers || [],
  ...this.knowledgeBaseLayers,
];

// NEW: Add ADOT Lambda Layer when observability is enabled
if (props.enableObservability) {
  // ADOT Lambda Layer for Python (region-specific ARN)
  const adotLayerArn = `arn:aws:lambda:${Stack.of(this).region}:901920570463:layer:aws-otel-python-amd64-ver-1-26-0:1`;
  layers.push(LayerVersion.fromLayerVersionArn(this, 'AdotLayer', adotLayerArn));
}

this.agentFunction = new PythonFunction(this, `Agent-${props.agentName}`, {
  // ... existing configuration
  layers: layers,
  environment: {
    // Environment variables including AgentCore observability config
    AGENT_OBSERVABILITY_ENABLED: props.enableObservability ? 'true' : undefined,
    OTEL_RESOURCE_ATTRIBUTES: props.enableObservability 
      ? `service.name=${props.metricServiceName || props.agentName},aws.log.group.names=/aws/lambda/${props.agentName}`
      : undefined,
    OTEL_EXPORTER_OTLP_LOGS_HEADERS: props.enableObservability
      ? `x-aws-bedrock-agent-id=${props.agentName}`
      : undefined,
    AWS_LAMBDA_EXEC_WRAPPER: props.enableObservability
      ? '/opt/otel-instrument'
      : undefined,
    // ... other environment variables
  },
});
```

**Key Points:**
- ADOT Lambda Layer ARN is region-specific (use `Stack.of(this).region`)
- Layer version may need updates over time (currently using ver-1-26-0)
- Environment variables only set when `enableObservability: true`
- Use `undefined` for disabled state (cleaner than conditional object spreading)
- `AWS_LAMBDA_EXEC_WRAPPER` enables automatic OTEL instrumentation via ADOT layer wrapper script



### 5. Code Organization

**File Changes Required:**

1. **`use-cases/framework/agents/base-agent.ts`**:
   - Add IAM permissions in constructor (after PropertyInjectors setup)
   - 3-5 lines of code inline in constructor
   - No new methods or properties needed

2. **`use-cases/framework/agents/batch-agent.ts`**:
   - Add ADOT Lambda Layer when `enableObservability: true`
   - Add environment variables for AgentCore observability
   - ~10-15 lines of code

3. **No changes needed to**:
   - `BaseAgentProps` interface (uses existing `enableObservability` flag)
   - Other agent types (future StreamingAgent will inherit automatically)
   - Existing examples (backward compatible)

**Code Organization Principles:**
- Inline implementation (no new methods)
- Follows existing Lambda Powertools pattern
- Minimal code changes
- Clear conditional logic based on `enableObservability` flag
- No breaking changes to public API



## Testing Strategy

### Unit Tests

**Test File**: `use-cases/framework/agents/tests/base-agent.test.ts` (add to existing file)

**Test Cases to Add:**

1. **AgentCore Observability Enabled**:
   ```typescript
   test('adds AgentCore observability IAM permissions when enableObservability is true', () => {
     // Given
     const stack = new Stack();
     
     // When
     new TestBatchAgent(stack, 'TestAgent', {
       agentName: 'test-agent',
       enableObservability: true,
       // ... other required props
     });
     
     // Then
     const template = Template.fromStack(stack);
     template.hasResourceProperties('AWS::IAM::Policy', {
       PolicyDocument: {
         Statement: Match.arrayWith([
           Match.objectLike({
             Effect: 'Allow',
             Action: Match.arrayWith([
               'logs:CreateLogGroup',
               'logs:CreateLogStream',
               'logs:PutLogEvents',
               'xray:PutTraceSegments',
               'xray:PutTelemetryRecords',
             ]),
           }),
         ]),
       },
     });
   });
   ```

2. **AgentCore Observability Disabled**:
   ```typescript
   test('does not add AgentCore observability IAM permissions when enableObservability is false', () => {
     // Given
     const stack = new Stack();
     
     // When
     new TestBatchAgent(stack, 'TestAgent', {
       agentName: 'test-agent',
       enableObservability: false,
       // ... other required props
     });
     
     // Then
     const template = Template.fromStack(stack);
     // Verify AgentCore-specific permissions are NOT present
     template.hasResourceProperties('AWS::IAM::Policy', {
       PolicyDocument: {
         Statement: Match.not(Match.arrayWith([
           Match.objectLike({
             Action: Match.arrayWith(['xray:PutTraceSegments']),
           }),
         ])),
       },
     });
   });
   ```

3. **Environment Variables Set Correctly**:
   ```typescript
   test('sets AgentCore environment variables when enableObservability is true', () => {
     // Given
     const stack = new Stack();
     
     // When
     new TestBatchAgent(stack, 'TestAgent', {
       agentName: 'test-agent',
       enableObservability: true,
       metricServiceName: 'my-service',
       // ... other required props
     });
     
     // Then
     const template = Template.fromStack(stack);
     template.hasResourceProperties('AWS::Lambda::Function', {
       Environment: {
         Variables: Match.objectLike({
           AGENT_OBSERVABILITY_ENABLED: 'true',
           OTEL_RESOURCE_ATTRIBUTES: Match.stringLikeRegexp('service\\.name=my-service'),
           OTEL_EXPORTER_OTLP_LOGS_HEADERS: Match.stringLikeRegexp('x-aws-bedrock-agent-id=test-agent'),
         }),
       },
     });
   });
   ```

4. **ADOT Lambda Layer Added**:
   ```typescript
   test('adds ADOT Lambda Layer when enableObservability is true', () => {
     // Given
     const stack = new Stack();
     
     // When
     new TestBatchAgent(stack, 'TestAgent', {
       agentName: 'test-agent',
       enableObservability: true,
       // ... other required props
     });
     
     // Then
     const template = Template.fromStack(stack);
     template.hasResourceProperties('AWS::Lambda::Function', {
       Layers: Match.arrayWith([
         Match.stringLikeRegexp('arn:aws:lambda:.*:901920570463:layer:aws-otel-python.*'),
       ]),
     });
   });
   ```

5. **Backward Compatibility**:
   ```typescript
   test('maintains backward compatibility when enableObservability is undefined', () => {
     // Given
     const stack = new Stack();
     
     // When
     new TestBatchAgent(stack, 'TestAgent', {
       agentName: 'test-agent',
       // enableObservability not set (undefined)
       // ... other required props
     });
     
     // Then - should work without errors
     const template = Template.fromStack(stack);
     expect(template).toBeDefined();
   });
   ```



### CDK Nag Tests

**Test File**: `use-cases/framework/agents/tests/base-agent-nag.test.ts` (may need to create or add to existing)

**Test Cases:**

1. **CDK Nag Passes with AgentCore Observability**:
   ```typescript
   test('passes CDK Nag checks with AgentCore observability enabled', () => {
     // Given
     const app = new App();
     const stack = new Stack(app, 'TestStack');
     
     // When
     new TestBatchAgent(stack, 'TestAgent', {
       agentName: 'test-agent',
       enableObservability: true,
       // ... other required props
     });
     
     // Apply CDK Nag
     Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
     
     // Then - should not throw
     const messages = app.synth();
     
     // If AwsSolutions-IAM5 is triggered, verify it's suppressed with justification
     // (CloudWatch Logs and X-Ray require wildcard resources)
   });
   ```

2. **Suppression Documentation** (if needed):
   ```typescript
   // In BaseAgent constructor, if CDK Nag flags the wildcard resource:
   NagSuppressions.addResourceSuppressions(
     this.agentRole,
     [
       {
         id: 'AwsSolutions-IAM5',
         reason: 'CloudWatch Logs and X-Ray require wildcard resources for log group/stream creation and trace submission. This is required for AgentCore observability as documented by AWS.',
       },
     ],
     true, // Apply to children
   );
   ```

**CDK Nag Compliance Strategy:**
- Run CDK Nag tests after implementation
- Document any suppressions with clear justification
- Wildcard resource for CloudWatch Logs and X-Ray is expected and justified
- Ensure all other security checks pass



## Documentation

### JSDoc Updates

**File**: `use-cases/framework/agents/base-agent.ts`

**Update `enableObservability` prop documentation**:

```typescript
/**
 * Enable observability for the agent
 *
 * When enabled, configures both Lambda Powertools and AWS Bedrock AgentCore observability:
 * - **Lambda Powertools**: Provides function-level observability including structured logging,
 *   distributed tracing with X-Ray, and custom metrics
 * - **AgentCore Observability**: Provides agent-specific observability including agent invocations,
 *   reasoning steps, tool usage, token consumption, and agent latency
 *
 * Both systems publish to Amazon CloudWatch and use the same service name and namespace
 * for correlation. This provides complete visibility at both function and agent levels.
 *
 * **Environment Variables Set** (AgentCore):
 * - `AGENT_OBSERVABILITY_ENABLED`: Enables AgentCore observability
 * - `OTEL_RESOURCE_ATTRIBUTES`: Service identification for OpenTelemetry
 * - `OTEL_EXPORTER_OTLP_LOGS_HEADERS`: Agent identification headers
 *
 * **IAM Permissions Granted** (AgentCore):
 * - CloudWatch Logs: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
 * - X-Ray: `xray:PutTraceSegments`, `xray:PutTelemetryRecords`
 *
 * **Additional Requirements**:
 * - BatchAgent automatically adds ADOT (AWS Distro for OpenTelemetry) Lambda Layer
 *
 * @default false
 */
readonly enableObservability?: boolean;
```

**Add class-level JSDoc note**:

```typescript
/**
 * Base class for all agent types in the framework
 *
 * Provides common infrastructure for AI agents including:
 * - IAM role and permissions management
 * - Encryption key for environment variables
 * - Tool integration and S3 asset management
 * - Knowledge base integration for RAG
 * - Observability configuration (Lambda Powertools + AgentCore)
 *
 * Subclasses must implement the agent-specific Lambda function creation.
 *
 * **Observability**: When `enableObservability: true`, BaseAgent configures both
 * Lambda Powertools (function-level) and AWS Bedrock AgentCore (agent-level)
 * observability. Both systems work together to provide complete visibility.
 *
 * @see https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
 */
export abstract class BaseAgent extends Construct {
  // ...
}
```



### README Updates

**File**: `use-cases/framework/agents/README.md`

**Add subsection to existing observability section**:

```markdown
### AgentCore Observability

AWS Bedrock AgentCore provides agent-specific observability that complements Lambda Powertools by capturing agent-level metrics and traces. When you enable observability on your agent, both systems work together to provide complete visibility.

#### What is AgentCore Observability?

AgentCore observability automatically collects and publishes metrics about your agent's behavior:

- **Agent Invocations**: Number of times the agent is invoked
- **Reasoning Steps**: How the agent processes requests and makes decisions
- **Tool Usage**: Which tools the agent calls and how often
- **Token Consumption**: Number of tokens used per invocation
- **Agent Latency**: Time taken for agent operations
- **Error Rates**: Failed invocations and error types

#### How to Enable

AgentCore observability is enabled with the same flag as Lambda Powertools:

```typescript
const agent = new BatchAgent(this, 'MyAgent', {
  agentName: 'my-agent',
  enableObservability: true,  // Enables both Lambda Powertools AND AgentCore
  metricServiceName: 'my-service',
  metricNamespace: 'MyApp',
  agentDefinition: {
    // ... agent configuration
  },
});
```

When `enableObservability: true`:
- **Lambda Powertools** provides function-level observability (logs, traces, metrics)
- **AgentCore** provides agent-level observability (invocations, reasoning, tools)
- Both systems use the same service name and namespace for correlation

#### What Gets Configured

**Environment Variables** (automatically set):
- `AGENT_OBSERVABILITY_ENABLED=true`: Enables AgentCore observability
- `OTEL_RESOURCE_ATTRIBUTES`: Service identification for OpenTelemetry
- `OTEL_EXPORTER_OTLP_LOGS_HEADERS`: Agent identification headers

**IAM Permissions** (automatically granted):
- CloudWatch Logs: Create log groups/streams and write log events
- X-Ray: Submit trace segments and telemetry records

**Lambda Layers** (automatically added):
- ADOT (AWS Distro for OpenTelemetry) Lambda Layer for Python

#### Querying Metrics in CloudWatch

AgentCore metrics are published to CloudWatch under your configured namespace:

```bash
# Example CloudWatch Insights query for agent invocations
fields @timestamp, @message
| filter @message like /agent_invocation/
| stats count() by bin(5m)
```

**Common Metrics to Monitor**:
- Agent invocation count (success vs. failure)
- Average agent latency
- Token consumption per invocation
- Tool usage frequency
- Error rates by error type

#### Complementary Systems

| Aspect | Lambda Powertools | AgentCore Observability |
|--------|-------------------|-------------------------|
| **Scope** | Lambda function execution | Agent reasoning and behavior |
| **Logs** | Function logs, structured logging | Agent traces, reasoning steps |
| **Metrics** | Function metrics, custom metrics | Agent invocations, token usage, tool calls |
| **Traces** | Function execution traces | Agent decision-making traces |
| **Use Case** | Debug function issues, performance | Understand agent behavior, optimize prompts |

Both systems publish to CloudWatch and use the same service name/namespace, making it easy to correlate function-level and agent-level insights.

#### Example: Monitoring Agent Performance

```typescript
// Enable observability
const agent = new BatchAgent(this, 'FraudDetectionAgent', {
  agentName: 'fraud-detection',
  enableObservability: true,
  metricServiceName: 'fraud-detection',
  metricNamespace: 'FraudDetection',
  agentDefinition: {
    // ... configuration
  },
});

// After deployment, query CloudWatch:
// 1. View Lambda function logs (Lambda Powertools)
// 2. View agent reasoning traces (AgentCore)
// 3. Correlate by service name: "fraud-detection"
```

#### Best Practices

1. **Always enable in production**: Observability is crucial for understanding agent behavior
2. **Use consistent naming**: Same service name and namespace across all agents in an application
3. **Monitor token usage**: Track token consumption to optimize costs
4. **Analyze tool usage**: Understand which tools are most frequently called
5. **Set up alarms**: Create CloudWatch alarms for high error rates or latency

#### Troubleshooting

**Metrics not appearing in CloudWatch?**
- Verify `enableObservability: true` is set
- Check IAM permissions are granted (CloudWatch Logs, X-Ray)
- Verify ADOT Lambda Layer is attached
- Check Lambda function logs for OTEL errors

**High token consumption?**
- Review agent reasoning traces in CloudWatch
- Optimize system prompt to reduce unnecessary reasoning
- Consider caching frequently used tool results

**Agent latency issues?**
- Check tool execution time in traces
- Review reasoning step count
- Consider optimizing tool implementations
```



## Backward Compatibility

### Compatibility Guarantees

1. **No Breaking Changes**:
   - No changes to `BaseAgentProps` interface signature
   - No changes to `BaseAgent` constructor signature
   - No changes to public methods or properties
   - Existing agents continue to work without modification

2. **Default Behavior**:
   - `enableObservability` defaults to `false` (or `undefined`)
   - When disabled, no AgentCore observability configuration is applied
   - No IAM permissions added when disabled
   - No environment variables set when disabled
   - No ADOT Lambda Layer added when disabled

3. **Opt-In Enhancement**:
   - AgentCore observability is an opt-in feature
   - Existing agents with `enableObservability: true` automatically get AgentCore observability
   - This is a non-breaking enhancement (adds functionality without changing behavior)

4. **Example Compatibility**:
   - All existing examples continue to work unchanged
   - Examples with `enableObservability: false` or undefined: no changes
   - Examples with `enableObservability: true`: automatically get AgentCore observability (enhancement)

### Migration Path

**For existing agents without observability**:
```typescript
// Before (no observability)
const agent = new BatchAgent(this, 'MyAgent', {
  agentName: 'my-agent',
  agentDefinition: { /* ... */ },
});

// After (opt-in to observability)
const agent = new BatchAgent(this, 'MyAgent', {
  agentName: 'my-agent',
  enableObservability: true,  // Add this line
  metricServiceName: 'my-service',  // Optional: customize service name
  metricNamespace: 'MyApp',  // Optional: customize namespace
  agentDefinition: { /* ... */ },
});
```

**For existing agents with Lambda Powertools observability**:
```typescript
// Before (Lambda Powertools only)
const agent = new BatchAgent(this, 'MyAgent', {
  agentName: 'my-agent',
  enableObservability: true,
  metricServiceName: 'my-service',
  metricNamespace: 'MyApp',
  agentDefinition: { /* ... */ },
});

// After (Lambda Powertools + AgentCore - no code changes needed!)
// Automatically gets AgentCore observability when you redeploy
```



## Security Considerations

### IAM Permissions

**Least Privilege Approach**:
- Only grant permissions required by AWS documentation
- Permissions added conditionally (only when `enableObservability: true`)
- No permissions granted when observability is disabled

**Wildcard Resource Justification**:
- CloudWatch Logs requires wildcard for dynamic log group/stream creation
- X-Ray requires wildcard for trace segment submission
- This is standard AWS practice for these services
- CDK Nag suppression documented with clear justification

### Environment Variable Encryption

**Encryption Strategy**:
- All environment variables encrypted using existing `encryptionKey` from BaseAgent
- KMS key rotation enabled by default
- No sensitive data in environment variable values (only configuration)

### Data Protection

**No Sensitive Data Exposure**:
- Environment variables contain only configuration (service name, agent name)
- No credentials or secrets in environment variables
- Agent name and service name are non-sensitive identifiers

### CDK Nag Compliance

**Expected Warnings**:
- `AwsSolutions-IAM5`: Wildcard resource for CloudWatch Logs and X-Ray
  - **Suppression**: Documented with justification
  - **Reason**: Required by AWS services for dynamic resource creation

**All Other Checks**:
- Must pass without suppressions
- Follow repository security standards
- Maintain least-privilege access



## Implementation Checklist

### Phase 1: BaseAgent Changes
- [ ] Add IAM permissions for AgentCore observability in BaseAgent constructor
- [ ] Add conditional logic based on `enableObservability` flag
- [ ] Update BaseAgent JSDoc comments
- [ ] Add CDK Nag suppression if needed (with justification)

### Phase 2: BatchAgent Changes
- [ ] Add ADOT Lambda Layer when `enableObservability: true`
- [ ] Add environment variables for AgentCore observability
- [ ] Test environment variable construction
- [ ] Verify layer ARN is region-aware

### Phase 3: Testing
- [ ] Add unit tests for IAM permissions (enabled/disabled)
- [ ] Add unit tests for environment variables (enabled/disabled)
- [ ] Add unit tests for ADOT Lambda Layer (enabled/disabled)
- [ ] Add unit tests for backward compatibility
- [ ] Add CDK Nag tests
- [ ] Verify all tests pass

### Phase 4: Documentation
- [ ] Update `enableObservability` prop JSDoc
- [ ] Update BaseAgent class JSDoc
- [ ] Add AgentCore observability section to README
- [ ] Update or create example demonstrating feature
- [ ] Document environment variables
- [ ] Document IAM permissions

### Phase 5: Validation
- [ ] Deploy example with observability enabled
- [ ] Verify metrics appear in CloudWatch
- [ ] Verify traces appear in X-Ray
- [ ] Test backward compatibility with existing examples
- [ ] Verify CDK Nag passes

## Success Criteria

### Functional Requirements
- ✅ AgentCore observability enabled with single flag
- ✅ IAM permissions automatically granted
- ✅ Environment variables automatically configured
- ✅ ADOT Lambda Layer automatically added
- ✅ Works alongside Lambda Powertools
- ✅ Backward compatible with existing agents

### Quality Requirements
- ✅ All unit tests passing
- ✅ All CDK Nag tests passing
- ✅ Code coverage >80% for new code
- ✅ Documentation complete and accurate
- ✅ Example demonstrates feature

### Integration Requirements
- ✅ Metrics published to CloudWatch
- ✅ Traces published to X-Ray
- ✅ Service name and namespace correlation works
- ✅ No conflicts with Lambda Powertools
- ✅ All agent types inherit observability

## References

- AWS Bedrock AgentCore Observability: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
- ADOT Lambda Layer: https://aws-otel.github.io/docs/getting-started/lambda/lambda-python
- Repository Construct Development Guide: `.kiro/steering/construct-development-guide.md`
- Repository Testing Guide: `.kiro/steering/testing-guide.md`
- Repository Coding Standards: `.kiro/steering/coding-standards.md`
- Requirements Document: `.kiro/specs/agentcore-observability-integration/requirements.md`
- Design Decisions: `.kiro/specs/agentcore-observability-integration/_decisions-design.md`

