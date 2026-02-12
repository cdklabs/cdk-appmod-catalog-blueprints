---
inclusion: always
---

# Construct Development Guide - OOP Best Practices

## Overview

Constructs are **reusable library components** that provide abstract, extensible infrastructure patterns. They use OOP principles to enable customization and extension.

**See `aidlc-decisions-approval.md` for the critical distinction between Constructs and Examples.**

## Types of Construct Work

Before diving into OOP patterns, understand that construct work takes different forms:

1. **Creating a New Construct from Scratch** - Building a completely new use case pattern
2. **Adding a New Layer** - Extending an existing base class with new implementation
3. **Adding Features** - Enhancing existing constructs with new capabilities
4. **Creating Adapters/Plugins** - Implementing interfaces for new integrations
5. **Adding Cross-Cutting Concerns** - Adding observability, security, etc.

**This guide covers all types, with emphasis on the three-layer inheritance model for new constructs.**

## OOP Architecture Patterns

### Inheritance Models

This repository uses classical OOP inheritance, but **not all constructs follow the same layering**:

**Two-Layer Pattern** (Base → Concrete):
```typescript
┌─────────────────────────────────────────┐
│   Layer 1: Abstract Base Class         │
│   (BaseAgent)                           │
│   - Defines interface & contracts       │
│   - Provides common infrastructure      │
│   - Declares abstract methods           │
└──────────────┬──────────────────────────┘
               │ extends
┌──────────────▼──────────────────────────┐
│   Layer 2: Concrete Implementations     │
│   (BatchAgent, StreamingAgent, etc.)    │
│   - Implements abstract methods         │
│   - Adds specific functionality         │
│   - Ready to use                        │
└─────────────────────────────────────────┘
```

**Three-Layer Pattern** (Base → Concrete → Specialized):
```typescript
┌─────────────────────────────────────────┐
│   Layer 1: Abstract Base Class         │
│   (BaseDocumentProcessing)              │
│   - Defines interface & contracts       │
│   - Provides common infrastructure      │
│   - Declares abstract methods           │
└──────────────┬──────────────────────────┘
               │ extends
┌──────────────▼──────────────────────────┐
│   Layer 2: Concrete Implementation      │
│   (BedrockDocumentProcessing)           │
│   - Implements abstract methods         │
│   - Adds specific functionality         │
│   - Still configurable & extensible     │
└──────────────┬──────────────────────────┘
               │ extends
┌──────────────▼──────────────────────────┐
│   Layer 3: Specialized Implementation   │
│   (AgenticDocumentProcessing)           │
│   - Overrides specific methods          │
│   - Adds advanced features              │
│   - Highly specialized behavior         │
└─────────────────────────────────────────┘
```

**When to use each:**
- **Two-Layer**: When concrete implementations are distinct and don't share much code (e.g., BatchAgent vs StreamingAgent)
- **Three-Layer**: When you want progressive specialization with shared intermediate logic (e.g., Bedrock → Agentic)

**The pattern you choose depends on your use case - there's no one-size-fits-all.**

### Key OOP Principles Applied

**1. Abstraction**
```typescript
export abstract class BaseDocumentProcessing extends Construct {
  // Common infrastructure (concrete)
  readonly documentProcessingTable: Table;
  readonly encryptionKey: Key;
  readonly ingressAdapter: IAdapter;
  
  constructor(scope: Construct, id: string, props: BaseDocumentProcessingProps) {
    super(scope, id);
    // Initialize common resources
    this.documentProcessingTable = new Table(/*...*/);
    this.encryptionKey = new Key(/*...*/);
  }
  
  // Template method pattern - defines workflow structure
  protected handleStateMachineCreation(stateMachineId: string) {
    const classificationStep = this.classificationStep();  // Abstract
    const processingStep = this.processingStep();          // Abstract
    const enrichmentStep = this.enrichmentStep();          // Abstract
    const postProcessingStep = this.postProcessingStep();  // Abstract
    
    // Build workflow chain (concrete implementation)
    return this.buildWorkflow(/*...*/);
  }
  
  // Contract: Subclasses MUST implement these
  protected abstract classificationStep(): DocumentProcessingStepType;
  protected abstract processingStep(): DocumentProcessingStepType;
  protected abstract enrichmentStep(): DocumentProcessingStepType | undefined;
  protected abstract postProcessingStep(): DocumentProcessingStepType | undefined;
}
```

**2. Encapsulation**
```typescript
export class BedrockDocumentProcessing extends BaseDocumentProcessing {
  // Public interface - what consumers can access
  public readonly stateMachine: StateMachine;
  
  // Protected - available to subclasses
  protected readonly bedrockDocumentProcessingProps: BedrockDocumentProcessingProps;
  
  // Private - internal implementation details
  private generateLambdaRoleForBedrock(id: string, model?: BedrockModelProps) {
    // Implementation hidden from consumers and subclasses
  }
}
```

**3. Polymorphism**
```typescript
// Base class defines the contract
abstract class BaseDocumentProcessing {
  protected abstract processingStep(): DocumentProcessingStepType;
}

// Layer 2: Bedrock implementation
class BedrockDocumentProcessing extends BaseDocumentProcessing {
  protected processingStep(): DocumentProcessingStepType {
    // Uses Bedrock InvokeModel
    return new LambdaInvoke(this, 'ProcessingStep', {
      lambdaFunction: bedrockFunction,
      resultPath: '$.processingResult'
    });
  }
}

// Layer 3: Agentic implementation
class AgenticDocumentProcessing extends BedrockDocumentProcessing {
  protected processingStep(): DocumentProcessingStepType {
    // Overrides to use BatchAgent instead
    return new LambdaInvoke(this, 'ProcessingStep', {
      lambdaFunction: this.batchAgent.agentFunction,
      resultPath: '$.processingResult'
    });
  }
}
```

**4. Composition Over Inheritance (where appropriate)**
```typescript
export class BaseDocumentProcessing extends Construct {
  // Composed adapter - strategy pattern
  readonly ingressAdapter: IAdapter;
  
  constructor(scope: Construct, id: string, props: BaseDocumentProcessingProps) {
    super(scope, id);
    
    // Inject dependency - allows different ingress strategies
    this.ingressAdapter = props.ingressAdapter || new QueuedS3Adapter();
    this.ingressAdapter.init(this, props);
  }
}

// Different adapters can be plugged in
interface IAdapter {
  init(scope: Construct, props: any): void;
  createIngressTrigger(scope: Construct, stateMachine: StateMachine, props: any): void;
  createSuccessChain(scope: Construct): IChainable;
  createFailureChain(scope: Construct): IChainable;
}
```

## Step-by-Step Construct Development

### Step 1: Define the Props Interface

```typescript
/**
 * Configuration properties for MyConstruct.
 * 
 * Extends parent props if inheriting from another construct.
 */
export interface MyConstructProps extends BaseConstructProps {
  /**
   * Required property with clear documentation
   * 
   * @example 'my-value'
   */
  readonly requiredProp: string;
  
  /**
   * Optional property with default behavior documented
   * 
   * @default - Auto-generated unique value
   */
  readonly optionalProp?: string;
  
  /**
   * Optional callback for customization
   * 
   * @default - Uses default implementation
   */
  readonly customBehavior?: (input: string) => string;
}
```

### Step 2: Implement the Construct Class

```typescript
/**
 * MyConstruct provides [brief description].
 * 
 * ## Key Features
 * - Feature 1: Description
 * - Feature 2: Description
 * 
 * ## Architecture
 * [Brief architecture description]
 * 
 * ## Usage
 * ```typescript
 * const myConstruct = new MyConstruct(this, 'MyConstruct', {
 *   requiredProp: 'value'
 * });
 * ```
 */
export class MyConstruct extends BaseConstruct {
  // Public readonly properties - the construct's interface
  public readonly bucket: Bucket;
  public readonly stateMachine: StateMachine;
  
  // Protected properties - available to subclasses
  protected readonly props: MyConstructProps;
  
  // Private properties - internal only
  private readonly internalState: Map<string, any>;
  
  constructor(scope: Construct, id: string, props: MyConstructProps) {
    super(scope, id, props);
    
    // 1. Validate props early
    this.validateProps(props);
    
    // 2. Store props for subclass access
    this.props = props;
    
    // 3. Initialize internal state
    this.internalState = new Map();
    
    // 4. Create resources
    this.bucket = this.createBucket();
    this.stateMachine = this.createStateMachine();
    
    // 5. Wire up integrations
    this.setupIntegrations();
  }
  
  /**
   * Validates construct properties.
   * Throws descriptive errors for invalid configurations.
   */
  private validateProps(props: MyConstructProps): void {
    if (!props.requiredProp || props.requiredProp.trim() === '') {
      throw new Error('requiredProp cannot be empty');
    }
    
    if (props.optionalProp && props.optionalProp.length > 100) {
      throw new Error('optionalProp must be 100 characters or less');
    }
  }
  
  /**
   * Creates the S3 bucket with appropriate configuration.
   * Protected to allow subclass customization.
   */
  protected createBucket(): Bucket {
    return new Bucket(this, 'Bucket', {
      encryption: BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      enforceSSL: true,
      versioned: false,
      removalPolicy: this.props.removalPolicy || RemovalPolicy.DESTROY
    });
  }
  
  /**
   * Creates the Step Functions state machine.
   * Protected to allow subclass customization.
   */
  protected createStateMachine(): StateMachine {
    const definition = this.buildWorkflowDefinition();
    
    return new StateMachine(this, 'StateMachine', {
      definitionBody: DefinitionBody.fromChainable(definition),
      timeout: this.props.workflowTimeout || Duration.minutes(15),
      role: this.createStateMachineRole()
    });
  }
  
  /**
   * Builds the workflow definition.
   * Template method - calls abstract methods that subclasses implement.
   */
  protected buildWorkflowDefinition(): IChainable {
    const step1 = this.step1();  // May be abstract
    const step2 = this.step2();  // May be abstract
    
    return step1.next(step2);
  }
  
  /**
   * Sets up integrations between resources.
   * Private - internal implementation detail.
   */
  private setupIntegrations(): void {
    this.bucket.grantRead(this.stateMachine);
  }
}
```

### Step 3: Implement Abstract Methods (if extending abstract class)

```typescript
export class ConcreteImplementation extends AbstractBase {
  /**
   * Implements the required step1 method.
   * 
   * @returns Step Functions task for step 1
   */
  protected step1(): IChainable {
    const lambda = new Function(this, 'Step1Function', {
      runtime: Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: Code.fromAsset('./lambda/step1')
    });
    
    return new LambdaInvoke(this, 'Step1', {
      lambdaFunction: lambda,
      resultPath: '$.step1Result'
    });
  }
  
  /**
   * Implements the required step2 method.
   * 
   * @returns Step Functions task for step 2
   */
  protected step2(): IChainable {
    // Implementation
  }
}
```

### Step 4: Add Extension Points for Subclasses

```typescript
export class ExtensibleConstruct extends Construct {
  /**
   * Hook method called before resource creation.
   * Subclasses can override to add custom logic.
   */
  protected beforeResourceCreation(): void {
    // Default: do nothing
  }
  
  /**
   * Hook method called after resource creation.
   * Subclasses can override to add custom logic.
   */
  protected afterResourceCreation(): void {
    // Default: do nothing
  }
  
  /**
   * Factory method for creating custom processors.
   * Subclasses can override to provide different implementations.
   */
  protected createProcessor(): IProcessor {
    return new DefaultProcessor();
  }
  
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    
    this.beforeResourceCreation();
    
    // Create resources
    this.bucket = new Bucket(/*...*/);
    
    this.afterResourceCreation();
  }
}
```

## Design Patterns Used

### 1. Template Method Pattern

```typescript
abstract class BaseDocumentProcessing {
  // Template method - defines algorithm structure
  protected handleStateMachineCreation(id: string): StateMachine {
    // Step 1: Initialize (concrete)
    const init = this.initializeMetadata();
    
    // Step 2: Classification (abstract - subclass implements)
    const classification = this.classificationStep();
    
    // Step 3: Processing (abstract - subclass implements)
    const processing = this.processingStep();
    
    // Step 4: Build workflow (concrete)
    return this.buildWorkflow(init, classification, processing);
  }
  
  // Abstract methods - subclasses provide implementation
  protected abstract classificationStep(): IChainable;
  protected abstract processingStep(): IChainable;
}
```

### 2. Strategy Pattern

```typescript
// Strategy interface
interface IAdapter {
  createIngressTrigger(/*...*/): void;
  createSuccessChain(/*...*/): IChainable;
  createFailureChain(/*...*/): IChainable;
}

// Context uses strategy
class BaseDocumentProcessing {
  readonly ingressAdapter: IAdapter;
  
  constructor(scope: Construct, id: string, props: Props) {
    // Strategy injection
    this.ingressAdapter = props.ingressAdapter || new QueuedS3Adapter();
  }
}

// Different strategies
class QueuedS3Adapter implements IAdapter { /*...*/ }
class StreamAdapter implements IAdapter { /*...*/ }
class ApiAdapter implements IAdapter { /*...*/ }
```

### 3. Factory Method Pattern

```typescript
abstract class BaseAgent {
  // Factory method - subclasses decide what to create
  protected abstract createAgentFunction(): PythonFunction;
  
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    
    // Use factory method
    this.agentFunction = this.createAgentFunction();
  }
}

class BatchAgent extends BaseAgent {
  // Concrete factory implementation
  protected createAgentFunction(): PythonFunction {
    return new PythonFunction(this, 'Function', {
      entry: './batch-agent',
      // Batch-specific configuration
    });
  }
}
```

### 4. Builder Pattern (via Props)

```typescript
// Props act as builder configuration
const processing = new AgenticDocumentProcessing(this, 'Processing', {
  // Infrastructure config
  enableObservability: true,
  metricNamespace: 'my-app',
  network: myVpc,
  encryptionKey: myKey,
  
  // Behavior config
  processingAgentParameters: {
    agentName: 'MyAgent',
    agentDefinition: {
      bedrockModel: { useCrossRegionInference: true },
      systemPrompt: promptAsset,
      tools: [tool1, tool2]
    },
    prompt: 'Process the document',
    expectJson: true
  }
});
```

### 5. Dependency Injection Pattern

```typescript
// Interface defines the contract
export interface IAdapter {
  init(scope: Construct, props: BaseDocumentProcessingProps): void;
  createIngressTrigger(scope: Construct, stateMachine: StateMachine, props: any): Record<string, any>;
  generateAdapterIAMPolicies(additionalIAMActions?: string[], narrowActions?: boolean): PolicyStatement[];
  createFailedChain(scope: Construct): Chain;
  createSuccessChain(scope: Construct): Chain;
}

// Base class accepts dependency via constructor
export class BaseDocumentProcessing extends Construct {
  readonly ingressAdapter: IAdapter;
  
  constructor(scope: Construct, id: string, props: BaseDocumentProcessingProps) {
    super(scope, id);
    
    // Dependency injection with default fallback
    this.ingressAdapter = props.ingressAdapter || new QueuedS3Adapter();
    this.ingressAdapter.init(this, props);
  }
}

// Different implementations can be injected
const processing1 = new BedrockDocumentProcessing(this, 'Processing1', {
  ingressAdapter: new QueuedS3Adapter(),  // S3-triggered workflow
});

const processing2 = new BedrockDocumentProcessing(this, 'Processing2', {
  ingressAdapter: new StreamAdapter(),    // Stream-triggered workflow
});
```

**Benefits of Dependency Injection:**
- Loose coupling between components
- Easy to test with mock implementations
- Flexible configuration without modifying base class
- Supports multiple implementations of same interface

### 6. Interface Segregation Pattern

```typescript
// Focused interface for observability
export interface IObservable {
  readonly metricServiceName: string;
  readonly metricNamespace: string;
  readonly logGroupDataProtection: LogGroupDataProtectionProps;
  metrics(): IMetric[];
}

// Base class implements the interface
export abstract class BaseDocumentProcessing extends Construct implements IObservable {
  readonly metricServiceName: string;
  readonly metricNamespace: string;
  readonly logGroupDataProtection: LogGroupDataProtectionProps;
  
  public metrics(): IMetric[] {
    return [];
  }
}
```

**Why Interface Segregation Matters:**
- Clients depend only on methods they use
- Prevents "fat" interfaces with unused methods
- Enables multiple small, focused interfaces
- Improves maintainability and testability

## Advanced OOP Patterns in Document Processing

### Resource Initialization Pattern

The document processing constructs follow a specific initialization order to ensure proper resource setup:

```typescript
export abstract class BaseDocumentProcessing extends Construct {
  constructor(scope: Construct, id: string, props: BaseDocumentProcessingProps) {
    super(scope, id);
    
    // 1. Initialize adapter FIRST (may create VPC endpoints)
    this.ingressAdapter = props.ingressAdapter || new QueuedS3Adapter();
    
    // 2. Setup network infrastructure (VPC endpoints)
    if (props.network) {
      props.network.createServiceEndpoint('vpce-sfn', InterfaceVpcEndpointAwsService.STEP_FUNCTIONS);
      props.network.createServiceEndpoint('vpce-eb', InterfaceVpcEndpointAwsService.EVENTBRIDGE);
    }
    
    // 3. Initialize adapter resources (depends on network)
    this.ingressAdapter.init(this, props);
    
    // 4. Create encryption key
    this.encryptionKey = props.encryptionKey || new Key(/*...*/);
    
    // 5. Create shared resources (table, etc.)
    this.documentProcessingTable = new Table(/*...*/);
    
    // 6. Setup observability (if enabled)
    if (props.enableObservability) {
      PropertyInjectors.of(this).add(/*...*/);
    }
  }
}
```

**Key Principles:**
- Dependencies are initialized before dependents
- Network setup happens before resource creation
- Shared resources are created in base class
- Observability is configured last (cross-cutting concern)

### Conditional Workflow Building Pattern

The base class builds workflows dynamically based on which optional steps are implemented:

```typescript
protected handleStateMachineCreation(stateMachineId: string) {
  // Required steps (always present)
  const classificationStep = this.classificationStep();
  const processingStep = this.processingStep();
  
  // Optional steps (may return undefined)
  const enrichmentStep = this.enrichmentStep();
  const postProcessingStep = this.postProcessingStep();
  
  // Build chain with error handling
  const processingChain = processingStep
    .addCatch(errorHandler)
    .next(updateSuccess);
  
  // Conditionally add optional steps
  if (enrichmentStep) {
    const enrichmentChain = enrichmentStep
      .addCatch(errorHandler)
      .next(updateSuccess);
    
    processingChain.next(enrichmentChain);
    
    if (postProcessingStep) {
      // Both optional steps present
      enrichmentChain.next(postProcessingStep);
    } else {
      // Only enrichment present
      enrichmentChain.next(moveToProcessed);
    }
  } else if (postProcessingStep) {
    // Only post-processing present
    processingChain.next(postProcessingStep);
  } else {
    // No optional steps
    processingChain.next(moveToProcessed);
  }
  
  return workflowDefinition;
}
```

**Benefits:**
- Flexible workflow composition
- Subclasses control which steps to include
- No need for multiple base class variants
- Clean separation of concerns

### Selective Method Override Pattern

Subclasses can override only the methods they need to customize:

```typescript
// Layer 2: BedrockDocumentProcessing
// Implements ALL abstract methods
export class BedrockDocumentProcessing extends BaseDocumentProcessing {
  protected classificationStep(): DocumentProcessingStepType {
    // Bedrock-based classification
  }
  
  protected processingStep(): DocumentProcessingStepType {
    // Bedrock-based processing
  }
  
  protected enrichmentStep(): DocumentProcessingStepType | undefined {
    // Optional: Lambda-based enrichment
    return this.props.enrichmentLambdaFunction 
      ? new LambdaInvoke(/*...*/) 
      : undefined;
  }
  
  protected postProcessingStep(): DocumentProcessingStepType | undefined {
    // Optional: Lambda-based post-processing
    return this.props.postProcessingLambdaFunction 
      ? new LambdaInvoke(/*...*/) 
      : undefined;
  }
}

// Layer 3: AgenticDocumentProcessing
// Overrides ONLY processingStep, inherits everything else
export class AgenticDocumentProcessing extends BedrockDocumentProcessing {
  protected processingStep(): DocumentProcessingStepType {
    // Agent-based processing (overrides parent)
    const batchAgent = new BatchAgent(this, 'IDPBatchAgent', this.props.processingAgentParameters);
    return new LambdaInvoke(this, 'ProcessingStep', {
      lambdaFunction: batchAgent.agentFunction,
      resultPath: '$.processingResult'
    });
  }
  
  // Inherits classificationStep, enrichmentStep, postProcessingStep from parent
}
```

**Key Insight:** AgenticDocumentProcessing only changes ONE method but gets all the infrastructure, error handling, and workflow orchestration from its parent classes.

### Props Extension Pattern

Each layer extends the props interface to add layer-specific configuration:

```typescript
// Layer 1: Base props
export interface BaseDocumentProcessingProps extends ObservableProps {
  readonly ingressAdapter?: IAdapter;
  readonly documentProcessingTable?: Table;
  readonly workflowTimeout?: Duration;
  readonly removalPolicy?: RemovalPolicy;
  readonly eventbridgeBroker?: EventbridgeBroker;
  readonly enableObservability?: boolean;
  readonly network?: Network;
  readonly encryptionKey?: Key;
}

// Layer 2: Adds Bedrock-specific props
export interface BedrockDocumentProcessingProps extends BaseDocumentProcessingProps {
  readonly classificationBedrockModel?: BedrockModelProps;
  readonly processingBedrockModel?: BedrockModelProps;
  readonly classificationPrompt?: string;
  readonly processingPrompt?: string;
  readonly enrichmentLambdaFunction?: Function;
  readonly postProcessingLambdaFunction?: Function;
  readonly stepTimeouts?: Duration;
}

// Layer 3: Adds agent-specific props
export interface AgenticDocumentProcessingProps extends BedrockDocumentProcessingProps {
  /**
   * This parameter takes precedence over the
   * `processingBedrockModel` parameter.
   */
  readonly processingAgentParameters: BatchAgentProps;
}
```

**Benefits:**
- Each layer adds only what it needs
- Full backward compatibility
- Type safety across all layers
- Clear documentation of layer-specific options

### Protected Property Access Pattern

Subclasses store props in protected fields for access by further subclasses:

```typescript
export class BedrockDocumentProcessing extends BaseDocumentProcessing {
  // Protected: accessible to AgenticDocumentProcessing
  protected readonly bedrockDocumentProcessingProps: BedrockDocumentProcessingProps;
  
  constructor(scope: Construct, id: string, props: BedrockDocumentProcessingProps) {
    super(scope, id, props);
    this.bedrockDocumentProcessingProps = props;
  }
}

export class AgenticDocumentProcessing extends BedrockDocumentProcessing {
  protected processingStep(): DocumentProcessingStepType {
    // Can access parent's protected props
    const agentProps = this.bedrockDocumentProcessingProps as AgenticDocumentProcessingProps;
    const processingAgentProps = agentProps.processingAgentParameters;
    
    const batchAgent = new BatchAgent(this, 'IDPBatchAgent', processingAgentProps);
    return new LambdaInvoke(/*...*/);
  }
}
```

**Why This Matters:**
- Subclasses can access configuration from any layer
- Type casting is safe (child props extend parent props)
- Enables deep customization without breaking encapsulation

## Real-World Pattern: The Adapter Implementation

The document processing constructs use a sophisticated adapter pattern to support different ingress mechanisms. Here's the complete implementation breakdown:

### Adapter Interface Design

```typescript
export interface IAdapter {
  // Lifecycle: Initialize adapter resources
  init(scope: Construct, props: BaseDocumentProcessingProps): void;
  
  // Create trigger mechanism (S3 events, API calls, streams, etc.)
  createIngressTrigger(
    scope: Construct, 
    stateMachine: StateMachine, 
    props: BaseDocumentProcessingProps
  ): Record<string, any>;
  
  // Generate IAM policies for accessing adapter storage
  generateAdapterIAMPolicies(
    additionalIAMActions?: string[], 
    narrowActions?: boolean
  ): PolicyStatement[];
  
  // Create workflow chains for success/failure scenarios
  createFailedChain(scope: Construct): Chain;
  createSuccessChain(scope: Construct): Chain;
}
```

### Concrete Adapter: QueuedS3Adapter

```typescript
export class QueuedS3Adapter implements IAdapter {
  private readonly adapterProps: QueuedS3AdapterProps;
  private readonly resources: Record<string, any>;  // Internal resource storage
  private readonly prefixes: S3Prefixes;            // S3 prefix configuration
  
  constructor(adapterProps: QueuedS3AdapterProps = {}) {
    this.adapterProps = adapterProps;
    this.resources = {};
    this.prefixes = {
      raw: this.adapterProps.rawPrefix || 'raw/',
      processed: this.adapterProps.processedPrefix || 'processed/',
      failed: this.adapterProps.failedPrefix || 'failed/',
    };
  }
  
  init(scope: Construct, props: BaseDocumentProcessingProps): void {
    // 1. Setup VPC endpoints if needed
    if (props.network) {
      props.network.createServiceEndpoint('vpce-sqs', InterfaceVpcEndpointAwsService.SQS);
      props.network.createServiceEndpoint('vpce-s3', InterfaceVpcEndpointAwsService.S3);
    }
    
    // 2. Create encryption key
    const encryptionKey = props.encryptionKey || new Key(scope, 'EncryptionKey', {
      enableKeyRotation: true,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
    });
    this.resources.encryptionKey = encryptionKey;
    
    // 3. Create S3 bucket
    const bucket = this.adapterProps.bucket || new Bucket(scope, 'Bucket', {
      encryption: BucketEncryption.KMS,
      encryptionKey,
      enforceSSL: true,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
    });
    this.resources.bucket = bucket;
    
    // 4. Create SQS queues (main + DLQ)
    const deadLetterQueue = new Queue(scope, 'DLQ', {
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
    });
    const queue = new Queue(scope, 'Queue', {
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
      deadLetterQueue: { maxReceiveCount: 5, queue: deadLetterQueue },
    });
    this.resources.queue = queue;
    this.resources.deadLetterQueue = deadLetterQueue;
  }
  
  createIngressTrigger(
    scope: Construct, 
    stateMachine: StateMachine, 
    props: BaseDocumentProcessingProps
  ): Record<string, any> {
    const bucket: Bucket = this.resources.bucket;
    const queue: Queue = this.resources.queue;
    
    // 1. Setup S3 → SQS notification
    bucket.addEventNotification(
      EventType.OBJECT_CREATED, 
      new SqsDestination(queue), 
      { prefix: this.prefixes.raw }
    );
    
    // 2. Create Lambda to consume SQS and trigger Step Functions
    const sqsConsumerLambda = new PythonFunction(scope, 'SQSConsumer', {
      runtime: DefaultRuntimes.PYTHON,
      entry: path.join(__dirname, '/../resources/default-sqs-consumer'),
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn,
        RAW_PREFIX: this.prefixes.raw,
      },
    });
    
    // 3. Connect SQS → Lambda
    sqsConsumerLambda.addEventSource(new SqsEventSource(queue, {
      batchSize: 10,
      maxBatchingWindow: Duration.seconds(5),
      reportBatchItemFailures: true,
    }));
    
    this.resources.sqsConsumerLambdaFunction = sqsConsumerLambda;
    return this.resources;
  }
  
  generateAdapterIAMPolicies(
    additionalIAMActions?: string[], 
    narrowActions?: boolean
  ): PolicyStatement[] {
    const bucket: Bucket = this.resources.bucket;
    const normalizedActions = additionalIAMActions || [];
    
    if (!narrowActions) {
      // Full access pattern (default)
      return [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            's3:GetObject', 
            's3:CopyObject', 
            's3:DeleteObject', 
            's3:PutObject', 
            ...normalizedActions
          ],
          resources: [`${bucket.bucketArn}/*`],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'kms:Encrypt', 
            'kms:ReEncrypt*', 
            'kms:GenerateDataKey*', 
            'kms:Decrypt'
          ],
          resources: [bucket.encryptionKey.keyArn],
        }),
      ];
    } else {
      // Narrow access pattern (least-privilege)
      return [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: normalizedActions,
          resources: [`${bucket.bucketArn}/*`],
        }),
      ];
    }
  }
  
  createFailedChain(scope: Construct): Chain {
    const bucket: Bucket = this.resources.bucket;
    
    // Move file from raw/ to failed/ prefix
    return new CallAwsService(scope, 'CopyToFailed', {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: JsonPath.stringAt('$.content.bucket'),
        CopySource: JsonPath.format(
          '{}/{}', 
          JsonPath.stringAt('$.content.bucket'), 
          JsonPath.stringAt('$.content.key')
        ),
        Key: JsonPath.format(
          `${this.prefixes.failed}/{}`, 
          JsonPath.stringAt('$.content.filename')
        ),
      },
      iamResources: [`${bucket.bucketArn}/*`],
      resultPath: JsonPath.DISCARD,
    }).next(
      new CallAwsService(scope, 'DeleteFromRaw', {
        service: 's3',
        action: 'deleteObject',
        parameters: {
          Bucket: JsonPath.stringAt('$.content.bucket'),
          Key: JsonPath.stringAt('$.content.key'),
        },
        iamResources: [`${bucket.bucketArn}/*`],
        resultPath: JsonPath.DISCARD,
      }),
    );
  }
  
  createSuccessChain(scope: Construct): Chain {
    const bucket: Bucket = this.resources.bucket;
    
    // Move file from raw/ to processed/ prefix
    return new CallAwsService(scope, 'CopyToProcessed', {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: JsonPath.stringAt('$.content.bucket'),
        CopySource: JsonPath.format(
          '{}/{}', 
          JsonPath.stringAt('$.content.bucket'), 
          JsonPath.stringAt('$.content.key')
        ),
        Key: JsonPath.format(
          `${this.prefixes.processed}/{}`, 
          JsonPath.stringAt('$.content.filename')
        ),
      },
      iamResources: [`${bucket.bucketArn}/*`],
      resultPath: JsonPath.DISCARD,
    }).next(
      new CallAwsService(scope, 'DeleteFromRawSuccess', {
        service: 's3',
        action: 'deleteObject',
        parameters: {
          Bucket: JsonPath.stringAt('$.content.bucket'),
          Key: JsonPath.stringAt('$.content.key'),
        },
        iamResources: [`${bucket.bucketArn}/*`],
        resultPath: JsonPath.DISCARD,
      }),
    );
  }
}
```

### Key Adapter Pattern Insights

**1. Resource Encapsulation**
- Adapter owns and manages its resources (bucket, queue, Lambda)
- Base class doesn't need to know adapter implementation details
- Resources stored in private `resources` map for internal access

**2. Lifecycle Management**
- `init()`: Create and configure resources
- `createIngressTrigger()`: Wire up trigger mechanism
- `createSuccessChain()` / `createFailedChain()`: Provide workflow integration points

**3. IAM Policy Generation**
- Adapter knows what permissions are needed for its storage
- Base class and subclasses can request additional permissions via `additionalIAMActions`
- Supports both full access and narrow (least-privilege) modes via `narrowActions` flag

**4. Pluggability**
Different adapters can provide completely different ingress mechanisms:
- `QueuedS3Adapter`: S3 → SQS → Lambda → Step Functions
- `StreamAdapter`: Kinesis → Lambda → Step Functions (future)
- `ApiAdapter`: API Gateway → Lambda → Step Functions (future)

Base class workflow remains unchanged regardless of adapter.

**5. Separation of Concerns**
- **Base class**: Workflow orchestration, DynamoDB tracking, error handling
- **Adapter**: Ingress mechanism, storage management, file movement
- Clean boundaries between responsibilities

**6. How Base Class Uses Adapter**

```typescript
export abstract class BaseDocumentProcessing extends Construct {
  readonly ingressAdapter: IAdapter;
  
  constructor(scope: Construct, id: string, props: BaseDocumentProcessingProps) {
    super(scope, id);
    
    // 1. Inject adapter (strategy pattern)
    this.ingressAdapter = props.ingressAdapter || new QueuedS3Adapter();
    
    // 2. Initialize adapter resources
    this.ingressAdapter.init(this, props);
    
    // ... create other resources ...
  }
  
  protected handleStateMachineCreation(stateMachineId: string) {
    // ... build workflow ...
    
    // 3. Use adapter to create success/failure chains
    const moveToFailed = this.ingressAdapter.createFailedChain(this);
    const moveToProcessed = this.ingressAdapter.createSuccessChain(this);
    
    // ... integrate chains into workflow ...
    
    const stateMachine = new StateMachine(/*...*/);
    
    // 4. Use adapter to create ingress trigger
    this.ingressAdapter.createIngressTrigger(this, stateMachine, this.props);
    
    return stateMachine;
  }
  
  private createStateMachineRole(): Role {
    return new Role(this, 'StateMachineRole', {
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        StateMachineExecutionPolicy: new PolicyDocument({
          statements: [
            // 5. Use adapter to generate IAM policies
            ...this.ingressAdapter.generateAdapterIAMPolicies(),
            // ... other policies ...
          ],
        }),
      },
    });
  }
}
```

**7. Extending with New Adapters**

To add a new ingress mechanism, simply implement the `IAdapter` interface:

```typescript
export class KinesisStreamAdapter implements IAdapter {
  private readonly resources: Record<string, any> = {};
  
  init(scope: Construct, props: BaseDocumentProcessingProps): void {
    // Create Kinesis stream, Lambda consumer, etc.
    const stream = new Stream(scope, 'InputStream', {/*...*/});
    this.resources.stream = stream;
  }
  
  createIngressTrigger(scope: Construct, stateMachine: StateMachine, props: any): Record<string, any> {
    // Setup Kinesis → Lambda → Step Functions
    const consumer = new Function(/*...*/);
    consumer.addEventSource(new KinesisEventSource(this.resources.stream));
    return this.resources;
  }
  
  generateAdapterIAMPolicies(): PolicyStatement[] {
    // Return Kinesis-specific permissions
    return [
      new PolicyStatement({
        actions: ['kinesis:GetRecords', 'kinesis:GetShardIterator'],
        resources: [this.resources.stream.streamArn],
      }),
    ];
  }
  
  createFailedChain(scope: Construct): Chain {
    // Write to DLQ stream or S3
  }
  
  createSuccessChain(scope: Construct): Chain {
    // Write to output stream or S3
  }
}

// Use the new adapter
const processing = new BedrockDocumentProcessing(this, 'Processing', {
  ingressAdapter: new KinesisStreamAdapter(),  // ✅ Plug and play!
});
```

## Cross-Cutting Concerns: Observability Pattern

The document processing constructs handle observability as a cross-cutting concern using property injection:

### Property Injector Pattern

```typescript
export abstract class BaseDocumentProcessing extends Construct implements IObservable {
  readonly metricServiceName: string;
  readonly metricNamespace: string;
  readonly logGroupDataProtection: LogGroupDataProtectionProps;
  
  constructor(scope: Construct, id: string, props: BaseDocumentProcessingProps) {
    super(scope, id);
    
    // ... create resources ...
    
    // Setup observability LAST (after all resources created)
    if (props.enableObservability) {
      PropertyInjectors.of(this).add(
        new StateMachineObservabilityPropertyInjector(this.logGroupDataProtection),
        new LambdaObservabilityPropertyInjector(this.logGroupDataProtection),
      );
    }
    
    // Store observability config
    this.metricNamespace = props.metricNamespace || DefaultObservabilityConfig.DEFAULT_METRIC_NAMESPACE;
    this.metricServiceName = props.metricServiceName || DefaultDocumentProcessingConfig.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME;
  }
  
  public metrics(): IMetric[] {
    return [];  // Subclasses can override to provide custom metrics
  }
}
```

### How Property Injection Works

Property injectors automatically configure observability for all resources in the construct tree:

```typescript
// When enableObservability is true, these injectors:
// 1. Find all Lambda functions in the construct tree
// 2. Add Lambda Powertools environment variables
// 3. Configure structured logging with service name and namespace
// 4. Setup X-Ray tracing
// 5. Add data protection policies to log groups

// Example: Lambda gets these environment variables automatically
{
  POWERTOOLS_SERVICE_NAME: 'financial-documents',
  POWERTOOLS_METRICS_NAMESPACE: 'fraud-detection',
  POWERTOOLS_LOG_LEVEL: 'INFO',
  POWERTOOLS_LOGGER_LOG_EVENT: 'true',
  POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'true',
  POWERTOOLS_TRACER_CAPTURE_ERROR: 'true',
}
```

### Benefits of This Pattern

**1. Opt-in Observability**
- Disabled by default (no cost impact)
- Single flag enables comprehensive observability
- No code changes needed in Lambda functions

**2. Consistent Configuration**
- All resources use same namespace and service name
- Centralized configuration in base class
- Easy to query logs and metrics across all components

**3. Separation of Concerns**
- Business logic doesn't know about observability
- Observability is applied declaratively
- Can be toggled without changing construct code

**4. Inheritance-Friendly**
- Subclasses automatically get observability
- No need to repeat configuration in each layer
- Works with any depth of inheritance

### Using Observability in Examples

```typescript
// Example: Fraud detection with observability
const fraudDetection = new AgenticDocumentProcessing(this, 'FraudDetection', {
  // Enable observability
  enableObservability: true,
  metricNamespace: 'fraud-detection',
  metricServiceName: 'financial-documents',
  
  // Regular configuration
  ingressAdapter: new QueuedS3Adapter(),
  processingAgentParameters: {/*...*/},
});

// All Lambda functions, Step Functions, and logs automatically get:
// - Structured logging with service/namespace
// - X-Ray tracing
// - CloudWatch metrics
// - Data protection for PII
```

### Querying Observability Data

```bash
# Query logs with structured fields
aws logs filter-log-events \
  --log-group-name /aws/lambda/fraud-detection-processing \
  --filter-pattern '{ $.service = "financial-documents" && $.namespace = "fraud-detection" }'

# View X-Ray traces
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)

# Query custom metrics
aws cloudwatch get-metric-statistics \
  --namespace fraud-detection \
  --metric-name ProcessingDuration \
  --dimensions Name=service,Value=financial-documents \
  --start-time $(date -u -d '1 hour ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 300 \
  --statistics Average,Maximum
```

## Common Mistakes to Avoid

### ❌ Don't: Break the Initialization Order

```typescript
// BAD: Creating resources before adapter initialization
export class MyConstruct extends BaseConstruct {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    
    this.bucket = new Bucket(/*...*/);  // ❌ Created before network setup
    
    if (props.network) {
      props.network.createServiceEndpoint('vpce-s3', /*...*/);  // ❌ Too late!
    }
  }
}
```

```typescript
// GOOD: Follow proper initialization order
export class MyConstruct extends BaseConstruct {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    
    // 1. Setup network FIRST
    if (props.network) {
      props.network.createServiceEndpoint('vpce-s3', /*...*/);
    }
    
    // 2. Then create resources that need network
    this.bucket = new Bucket(/*...*/);  // ✅ Network ready
  }
}
```

### ❌ Don't: Forget to Call Parent Constructor

```typescript
// BAD: Skipping parent initialization
export class BedrockDocumentProcessing extends BaseDocumentProcessing {
  constructor(scope: Construct, id: string, props: BedrockDocumentProcessingProps) {
    // ❌ Missing super() call - parent resources not created!
    this.stateMachine = this.handleStateMachineCreation('workflow');
  }
}
```

```typescript
// GOOD: Always call parent constructor first
export class BedrockDocumentProcessing extends BaseDocumentProcessing {
  constructor(scope: Construct, id: string, props: BedrockDocumentProcessingProps) {
    super(scope, id, props);  // ✅ Parent creates shared resources
    
    // Now safe to use parent resources
    this.stateMachine = this.handleStateMachineCreation('workflow');
  }
}
```

### ❌ Don't: Expose Implementation Details

```typescript
// BAD: Exposes internal Lambda function
export class MyConstruct extends Construct {
  public readonly internalLambda: Function;  // ❌
}
```

```typescript
// GOOD: Only expose what consumers need
export class MyConstruct extends Construct {
  public readonly stateMachine: StateMachine;  // ✅
  // Lambda is internal implementation detail
}
```

### ❌ Don't: Create Tight Coupling

```typescript
// BAD: Hardcoded dependency
export class MyConstruct extends Construct {
  constructor(/*...*/) {
    this.processor = new SpecificProcessor();  // ❌ Tight coupling
  }
}
```

```typescript
// GOOD: Dependency injection
export interface MyConstructProps {
  readonly processor?: IProcessor;  // ✅ Flexible
}

export class MyConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MyConstructProps) {
    this.processor = props.processor || new DefaultProcessor();
  }
}
```

### ❌ Don't: Skip Validation

```typescript
// BAD: No validation
constructor(scope: Construct, id: string, props: Props) {
  super(scope, id);
  this.value = props.value;  // ❌ What if it's invalid?
}
```

```typescript
// GOOD: Validate early
constructor(scope: Construct, id: string, props: Props) {
  super(scope, id);
  this.validateProps(props);  // ✅ Fail fast
  this.value = props.value;
}
```

### ❌ Don't: Use Public for Everything

```typescript
// BAD: Everything is public
export class MyConstruct extends Construct {
  public bucket: Bucket;              // ❌
  public helperMethod(): void {}      // ❌
  public internalState: Map<any, any>; // ❌
}
```

```typescript
// GOOD: Appropriate visibility
export class MyConstruct extends Construct {
  public readonly bucket: Bucket;           // ✅ Part of interface
  protected helperMethod(): void {}         // ✅ For subclasses
  private internalState: Map<any, any>;     // ✅ Internal only
}
```

## Testing Your Construct

See `testing-guide.md` for comprehensive testing patterns, but key points:

1. **Unit tests**: Test resource creation and configuration
2. **CDK Nag tests**: Ensure security compliance
3. **Integration tests**: Test with parent/child constructs
4. **Property-based tests**: Test universal properties (when applicable)

## Checklist Before Submitting

- [ ] Props interface with JSDoc comments
- [ ] Construct class with comprehensive JSDoc
- [ ] Proper visibility modifiers (public/protected/private)
- [ ] Input validation in constructor
- [ ] Abstract methods implemented (if extending abstract class)
- [ ] Extension points for subclasses (if base class)
- [ ] Unit tests with >80% coverage
- [ ] CDK Nag tests passing
- [ ] README.md with usage examples
- [ ] Exported in `index.ts`
- [ ] No exposed implementation details
- [ ] Follows repository coding standards

## Summary: OOP Principles in Action

The document processing constructs demonstrate how classical OOP principles create flexible, maintainable infrastructure code:

### Three-Layer Architecture
1. **BaseDocumentProcessing**: Abstract foundation with template methods
2. **BedrockDocumentProcessing**: Concrete implementation with Bedrock models
3. **AgenticDocumentProcessing**: Specialized implementation with AI agents

### Key Patterns Applied
- **Template Method**: Base class defines workflow structure, subclasses fill in steps
- **Strategy**: Adapters provide pluggable ingress mechanisms
- **Dependency Injection**: Components accept dependencies via constructor
- **Factory Method**: Subclasses create their own specialized resources
- **Interface Segregation**: Small, focused interfaces (IAdapter, IObservable)

### Design Benefits
- **Reusability**: Base class provides 90% of functionality
- **Extensibility**: Override only what you need to change
- **Testability**: Mock interfaces for unit testing
- **Maintainability**: Changes in one layer don't affect others
- **Type Safety**: TypeScript ensures correct usage at compile time

### Real-World Impact
- AgenticDocumentProcessing overrides ONE method but inherits:
  - Complete workflow orchestration
  - Error handling and retry logic
  - DynamoDB state tracking
  - S3 file management
  - Observability configuration
  - Network and security setup

This is the power of well-designed OOP: maximum functionality with minimal code.
