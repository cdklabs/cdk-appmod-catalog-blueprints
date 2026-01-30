# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### AccessLog <a name="AccessLog" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog"></a>

AccessLog construct that provides a centralized S3 bucket for storing access logs.

This construct creates a secure S3 bucket with appropriate policies for AWS services
to deliver access logs.

Usage:

const accessLog = new AccessLog(this, 'AccessLog');
const bucket = accessLog.bucket;
const bucketName = accessLog.bucketName;

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.Initializer"></a>

```typescript
import { AccessLog } from '@cdklabs/cdk-appmod-catalog-blueprints'

new AccessLog(scope: Construct, id: string, props?: AccessLogProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps">AccessLogProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Optional</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps">AccessLogProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.getLogPath">getLogPath</a></code> | Get the S3 bucket path for a specific service's access logs. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.getLogUri">getLogUri</a></code> | Get the S3 URI for a specific service's access logs. |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `getLogPath` <a name="getLogPath" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.getLogPath"></a>

```typescript
public getLogPath(serviceName: string, resourceName?: string): string
```

Get the S3 bucket path for a specific service's access logs.

###### `serviceName`<sup>Required</sup> <a name="serviceName" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.getLogPath.parameter.serviceName"></a>

- *Type:* string

The name of the service (e.g., 'alb', 'cloudfront', 's3').

---

###### `resourceName`<sup>Optional</sup> <a name="resourceName" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.getLogPath.parameter.resourceName"></a>

- *Type:* string

Optional resource name for further organization.

---

##### `getLogUri` <a name="getLogUri" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.getLogUri"></a>

```typescript
public getLogUri(serviceName: string, resourceName?: string): string
```

Get the S3 URI for a specific service's access logs.

###### `serviceName`<sup>Required</sup> <a name="serviceName" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.getLogUri.parameter.serviceName"></a>

- *Type:* string

The name of the service (e.g., 'alb', 'cloudfront', 's3').

---

###### `resourceName`<sup>Optional</sup> <a name="resourceName" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.getLogUri.parameter.resourceName"></a>

- *Type:* string

Optional resource name for further organization.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.isConstruct"></a>

```typescript
import { AccessLog } from '@cdklabs/cdk-appmod-catalog-blueprints'

AccessLog.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.property.bucket">bucket</a></code> | <code>aws-cdk-lib.aws_s3.Bucket</code> | The S3 bucket for storing access logs. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.property.bucketName">bucketName</a></code> | <code>string</code> | The name of the S3 bucket. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.property.bucketPrefix">bucketPrefix</a></code> | <code>string</code> | The bucket prefix used for organizing access logs. |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `bucket`<sup>Required</sup> <a name="bucket" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.property.bucket"></a>

```typescript
public readonly bucket: Bucket;
```

- *Type:* aws-cdk-lib.aws_s3.Bucket

The S3 bucket for storing access logs.

---

##### `bucketName`<sup>Required</sup> <a name="bucketName" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.property.bucketName"></a>

```typescript
public readonly bucketName: string;
```

- *Type:* string

The name of the S3 bucket.

---

##### `bucketPrefix`<sup>Required</sup> <a name="bucketPrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLog.property.bucketPrefix"></a>

```typescript
public readonly bucketPrefix: string;
```

- *Type:* string

The bucket prefix used for organizing access logs.

---


### AgenticDocumentProcessing <a name="AgenticDocumentProcessing" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.Initializer"></a>

```typescript
import { AgenticDocumentProcessing } from '@cdklabs/cdk-appmod-catalog-blueprints'

new AgenticDocumentProcessing(scope: Construct, id: string, props: AgenticDocumentProcessingProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps">AgenticDocumentProcessingProps</a></code> | Configuration properties for the document processing pipeline. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps">AgenticDocumentProcessingProps</a>

Configuration properties for the document processing pipeline.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.metrics">metrics</a></code> | *No description.* |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `metrics` <a name="metrics" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.metrics"></a>

```typescript
public metrics(): IMetric[]
```

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.isConstruct"></a>

```typescript
import { AgenticDocumentProcessing } from '@cdklabs/cdk-appmod-catalog-blueprints'

AgenticDocumentProcessing.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.documentProcessingTable">documentProcessingTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | DynamoDB table for storing document processing metadata and workflow state. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | KMS key. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.ingressAdapter">ingressAdapter</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a></code> | Ingress adapter, responsible for triggering workflow. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | log group data protection configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Business metric namespace. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | Business metric service name. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.stateMachine">stateMachine</a></code> | <code>aws-cdk-lib.aws_stepfunctions.StateMachine</code> | The Step Functions state machine that orchestrates the document processing workflow. |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `documentProcessingTable`<sup>Required</sup> <a name="documentProcessingTable" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.documentProcessingTable"></a>

```typescript
public readonly documentProcessingTable: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

DynamoDB table for storing document processing metadata and workflow state.

---

##### `encryptionKey`<sup>Required</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key

KMS key.

---

##### `ingressAdapter`<sup>Required</sup> <a name="ingressAdapter" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.ingressAdapter"></a>

```typescript
public readonly ingressAdapter: IAdapter;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a>

Ingress adapter, responsible for triggering workflow.

---

##### `logGroupDataProtection`<sup>Required</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>

log group data protection configuration.

---

##### `metricNamespace`<sup>Required</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string

Business metric namespace.

---

##### `metricServiceName`<sup>Required</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string

Business metric service name.

This is part of the initial service dimension

---

##### `stateMachine`<sup>Required</sup> <a name="stateMachine" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing.property.stateMachine"></a>

```typescript
public readonly stateMachine: StateMachine;
```

- *Type:* aws-cdk-lib.aws_stepfunctions.StateMachine

The Step Functions state machine that orchestrates the document processing workflow.

---


### BaseAgent <a name="BaseAgent" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.Initializer"></a>

```typescript
import { BaseAgent } from '@cdklabs/cdk-appmod-catalog-blueprints'

new BaseAgent(scope: Construct, id: string, props: BaseAgentProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps">BaseAgentProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps">BaseAgentProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.isConstruct"></a>

```typescript
import { BaseAgent } from '@cdklabs/cdk-appmod-catalog-blueprints'

BaseAgent.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.agentFunction">agentFunction</a></code> | <code>@aws-cdk/aws-lambda-python-alpha.PythonFunction</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.agentRole">agentRole</a></code> | <code>aws-cdk-lib.aws_iam.Role</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.bedrockModel">bedrockModel</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a></code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `agentFunction`<sup>Required</sup> <a name="agentFunction" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.agentFunction"></a>

```typescript
public readonly agentFunction: PythonFunction;
```

- *Type:* @aws-cdk/aws-lambda-python-alpha.PythonFunction

---

##### `agentRole`<sup>Required</sup> <a name="agentRole" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.agentRole"></a>

```typescript
public readonly agentRole: Role;
```

- *Type:* aws-cdk-lib.aws_iam.Role

---

##### `encryptionKey`<sup>Required</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key

---

##### `bedrockModel`<sup>Optional</sup> <a name="bedrockModel" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgent.property.bedrockModel"></a>

```typescript
public readonly bedrockModel: BedrockModelProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a>

---


### BaseDocumentProcessing <a name="BaseDocumentProcessing" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing"></a>

- *Implements:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IObservable">IObservable</a>

Abstract base class for serverless document processing workflows.

Provides a complete document processing pipeline with:
- **S3 Storage**: Organized with prefixes (raw/, processed/, failed/) for document lifecycle management
- **SQS Queue**: Reliable message processing with configurable visibility timeout and dead letter queue
- **DynamoDB Table**: Workflow metadata tracking with DocumentId as partition key
- **Step Functions**: Orchestrated workflow with automatic file movement based on processing outcome
- **Auto-triggering**: S3 event notifications automatically start processing when files are uploaded to raw/ prefix
- **Error Handling**: Failed documents are moved to failed/ prefix with error details stored in DynamoDB
- **EventBridge Integration**: Optional custom event publishing for workflow state changes

## Architecture Flow
S3 Upload (raw/) → SQS → Lambda Consumer → Step Functions → Processing Steps → S3 (processed/failed/)

## Implementation Requirements
Subclasses must implement four abstract methods to define the processing workflow:
- `classificationStep()`: Document type classification
- `extractionStep()`: Data extraction from documents
- `enrichmentStep()`: Optional data enrichment (return undefined to skip)
- `postProcessingStep()`: Optional post-processing (return undefined to skip)

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.Initializer"></a>

```typescript
import { BaseDocumentProcessing } from '@cdklabs/cdk-appmod-catalog-blueprints'

new BaseDocumentProcessing(scope: Construct, id: string, props: BaseDocumentProcessingProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | - The scope in which to define this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.Initializer.parameter.id">id</a></code> | <code>string</code> | - The scoped construct ID. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps">BaseDocumentProcessingProps</a></code> | - Configuration properties for the document processing pipeline. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

The scope in which to define this construct.

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.Initializer.parameter.id"></a>

- *Type:* string

The scoped construct ID.

Must be unique within the scope.

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps">BaseDocumentProcessingProps</a>

Configuration properties for the document processing pipeline.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.metrics">metrics</a></code> | *No description.* |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `metrics` <a name="metrics" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.metrics"></a>

```typescript
public metrics(): IMetric[]
```

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.isConstruct"></a>

```typescript
import { BaseDocumentProcessing } from '@cdklabs/cdk-appmod-catalog-blueprints'

BaseDocumentProcessing.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.documentProcessingTable">documentProcessingTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | DynamoDB table for storing document processing metadata and workflow state. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | KMS key. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.ingressAdapter">ingressAdapter</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a></code> | Ingress adapter, responsible for triggering workflow. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | log group data protection configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Business metric namespace. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | Business metric service name. |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `documentProcessingTable`<sup>Required</sup> <a name="documentProcessingTable" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.documentProcessingTable"></a>

```typescript
public readonly documentProcessingTable: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

DynamoDB table for storing document processing metadata and workflow state.

---

##### `encryptionKey`<sup>Required</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key

KMS key.

---

##### `ingressAdapter`<sup>Required</sup> <a name="ingressAdapter" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.ingressAdapter"></a>

```typescript
public readonly ingressAdapter: IAdapter;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a>

Ingress adapter, responsible for triggering workflow.

---

##### `logGroupDataProtection`<sup>Required</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>

log group data protection configuration.

---

##### `metricNamespace`<sup>Required</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string

Business metric namespace.

---

##### `metricServiceName`<sup>Required</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string

Business metric service name.

This is part of the initial service dimension

---


### BaseKnowledgeBase <a name="BaseKnowledgeBase" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase"></a>

- *Implements:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase">IKnowledgeBase</a>

Abstract base class for knowledge base implementations.

This class provides common functionality for all knowledge base implementations,
including configuration management, validation, and default behaviors. Concrete
implementations (like BedrockKnowledgeBase) extend this class and implement
the abstract methods.

The base class handles:
- Props validation (name and description are required)
- Default retrieval configuration (numberOfResults defaults to 5)
- ACL configuration storage
- Base runtime configuration export

Subclasses must implement:
- `generateIamPermissions()`: Return IAM permissions specific to the KB type

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.Initializer"></a>

```typescript
import { BaseKnowledgeBase } from '@cdklabs/cdk-appmod-catalog-blueprints'

new BaseKnowledgeBase(scope: Construct, id: string, props: BaseKnowledgeBaseProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | - The scope in which to define this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.Initializer.parameter.id">id</a></code> | <code>string</code> | - The scoped construct ID. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps">BaseKnowledgeBaseProps</a></code> | - Configuration properties for the knowledge base. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

The scope in which to define this construct.

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.Initializer.parameter.id"></a>

- *Type:* string

The scoped construct ID.

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps">BaseKnowledgeBaseProps</a>

Configuration properties for the knowledge base.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.exportConfiguration">exportConfiguration</a></code> | Export configuration for runtime use by the retrieval tool. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.generateIamPermissions">generateIamPermissions</a></code> | Generate IAM policy statements required for accessing this knowledge base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.retrievalToolAsset">retrievalToolAsset</a></code> | Provide the retrieval tool asset for this knowledge base type. |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `exportConfiguration` <a name="exportConfiguration" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.exportConfiguration"></a>

```typescript
public exportConfiguration(): KnowledgeBaseRuntimeConfig
```

Export configuration for runtime use by the retrieval tool.

Returns a configuration object containing the base knowledge base
settings. Subclasses should override this method to add implementation-
specific configuration, calling super.exportConfiguration() to include
the base configuration.

##### `generateIamPermissions` <a name="generateIamPermissions" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.generateIamPermissions"></a>

```typescript
public generateIamPermissions(): PolicyStatement[]
```

Generate IAM policy statements required for accessing this knowledge base.

This abstract method must be implemented by subclasses to return the
specific IAM permissions needed for their knowledge base type.

##### `retrievalToolAsset` <a name="retrievalToolAsset" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.retrievalToolAsset"></a>

```typescript
public retrievalToolAsset(): Asset
```

Provide the retrieval tool asset for this knowledge base type.

By default, returns undefined to use the framework's default retrieval
tool. Subclasses can override this method to provide a custom retrieval
tool implementation.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.isConstruct"></a>

```typescript
import { BaseKnowledgeBase } from '@cdklabs/cdk-appmod-catalog-blueprints'

BaseKnowledgeBase.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.property.description">description</a></code> | <code>string</code> | Human-readable description of what this knowledge base contains. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.property.name">name</a></code> | <code>string</code> | Human-readable name for this knowledge base. |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `description`<sup>Required</sup> <a name="description" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string

Human-readable description of what this knowledge base contains.

This description is included in the agent's system prompt to help
the agent decide when to query this knowledge base.

---

##### `name`<sup>Required</sup> <a name="name" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

Human-readable name for this knowledge base.

This name is used for logging, display purposes, and to help the agent
identify which knowledge base to query.

---


### BatchAgent <a name="BatchAgent" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.Initializer"></a>

```typescript
import { BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints'

new BatchAgent(scope: Construct, id: string, props: BatchAgentProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps">BatchAgentProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps">BatchAgentProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.isConstruct"></a>

```typescript
import { BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints'

BatchAgent.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.agentFunction">agentFunction</a></code> | <code>@aws-cdk/aws-lambda-python-alpha.PythonFunction</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.agentRole">agentRole</a></code> | <code>aws-cdk-lib.aws_iam.Role</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.bedrockModel">bedrockModel</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a></code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `agentFunction`<sup>Required</sup> <a name="agentFunction" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.agentFunction"></a>

```typescript
public readonly agentFunction: PythonFunction;
```

- *Type:* @aws-cdk/aws-lambda-python-alpha.PythonFunction

---

##### `agentRole`<sup>Required</sup> <a name="agentRole" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.agentRole"></a>

```typescript
public readonly agentRole: Role;
```

- *Type:* aws-cdk-lib.aws_iam.Role

---

##### `encryptionKey`<sup>Required</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key

---

##### `bedrockModel`<sup>Optional</sup> <a name="bedrockModel" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgent.property.bedrockModel"></a>

```typescript
public readonly bedrockModel: BedrockModelProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a>

---


### BedrockDocumentProcessing <a name="BedrockDocumentProcessing" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing"></a>

Document processing workflow powered by Amazon Bedrock foundation models.

Extends BaseDocumentProcessing to provide AI-powered document classification and extraction
using Amazon Bedrock foundation models. This implementation offers:

## Key Features
- **AI-Powered Classification**: Uses Claude 3.7 Sonnet (configurable) to classify document types
- **Intelligent Extraction**: Extracts structured data from documents using foundation models
- **Cross-Region Inference**: Optional support for improved availability via inference profiles
- **Flexible Processing**: Optional enrichment and post-processing Lambda functions
- **Cost Optimized**: Configurable timeouts and model selection for cost control

## Processing Workflow
S3 Upload → Classification (Bedrock) → Extraction (Bedrock) → [Enrichment] → [Post-Processing] → Results

## Default Models
- Classification: Claude 3.7 Sonnet (anthropic.claude-3-7-sonnet-20250219-v1:0)
- Extraction: Claude 3.7 Sonnet (anthropic.claude-3-7-sonnet-20250219-v1:0)

## Prompt Templates
The construct uses default prompts that can be customized:
- **Classification**: Analyzes document and returns JSON with documentClassification field
- **Extraction**: Uses classification result to extract entities in structured JSON format

## Cross-Region Inference
When enabled, uses Bedrock inference profiles for improved availability:
- US prefix: Routes to US-based regions for lower latency
- EU prefix: Routes to EU-based regions for data residency compliance

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.Initializer"></a>

```typescript
import { BedrockDocumentProcessing } from '@cdklabs/cdk-appmod-catalog-blueprints'

new BedrockDocumentProcessing(scope: Construct, id: string, props: BedrockDocumentProcessingProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | - The scope in which to define this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.Initializer.parameter.id">id</a></code> | <code>string</code> | - The scoped construct ID. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps">BedrockDocumentProcessingProps</a></code> | - Configuration properties for the Bedrock document processing pipeline. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

The scope in which to define this construct.

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.Initializer.parameter.id"></a>

- *Type:* string

The scoped construct ID.

Must be unique within the scope.

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps">BedrockDocumentProcessingProps</a>

Configuration properties for the Bedrock document processing pipeline.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.metrics">metrics</a></code> | *No description.* |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `metrics` <a name="metrics" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.metrics"></a>

```typescript
public metrics(): IMetric[]
```

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.isConstruct"></a>

```typescript
import { BedrockDocumentProcessing } from '@cdklabs/cdk-appmod-catalog-blueprints'

BedrockDocumentProcessing.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.documentProcessingTable">documentProcessingTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | DynamoDB table for storing document processing metadata and workflow state. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | KMS key. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.ingressAdapter">ingressAdapter</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a></code> | Ingress adapter, responsible for triggering workflow. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | log group data protection configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Business metric namespace. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | Business metric service name. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.stateMachine">stateMachine</a></code> | <code>aws-cdk-lib.aws_stepfunctions.StateMachine</code> | The Step Functions state machine that orchestrates the document processing workflow. |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `documentProcessingTable`<sup>Required</sup> <a name="documentProcessingTable" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.documentProcessingTable"></a>

```typescript
public readonly documentProcessingTable: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

DynamoDB table for storing document processing metadata and workflow state.

---

##### `encryptionKey`<sup>Required</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key

KMS key.

---

##### `ingressAdapter`<sup>Required</sup> <a name="ingressAdapter" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.ingressAdapter"></a>

```typescript
public readonly ingressAdapter: IAdapter;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a>

Ingress adapter, responsible for triggering workflow.

---

##### `logGroupDataProtection`<sup>Required</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>

log group data protection configuration.

---

##### `metricNamespace`<sup>Required</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string

Business metric namespace.

---

##### `metricServiceName`<sup>Required</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string

Business metric service name.

This is part of the initial service dimension

---

##### `stateMachine`<sup>Required</sup> <a name="stateMachine" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing.property.stateMachine"></a>

```typescript
public readonly stateMachine: StateMachine;
```

- *Type:* aws-cdk-lib.aws_stepfunctions.StateMachine

The Step Functions state machine that orchestrates the document processing workflow.

---


### BedrockKnowledgeBase <a name="BedrockKnowledgeBase" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase"></a>

Amazon Bedrock Knowledge Base implementation.

This class provides integration with Amazon Bedrock Knowledge Bases,
which use vector stores (S3 Vectors by default) for semantic search.
It is the default knowledge base implementation when none is specified.

The implementation handles:
- ARN construction from knowledge base ID (if ARN not provided)
- IAM permission generation for Bedrock Retrieve and RetrieveAndGenerate APIs
- Optional guardrail configuration for content filtering
- Runtime configuration export for the retrieval tool

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.Initializer"></a>

```typescript
import { BedrockKnowledgeBase } from '@cdklabs/cdk-appmod-catalog-blueprints'

new BedrockKnowledgeBase(scope: Construct, id: string, props: BedrockKnowledgeBaseProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | - The scope in which to define this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.Initializer.parameter.id">id</a></code> | <code>string</code> | - The scoped construct ID. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps">BedrockKnowledgeBaseProps</a></code> | - Configuration properties for the Bedrock Knowledge Base. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

The scope in which to define this construct.

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.Initializer.parameter.id"></a>

- *Type:* string

The scoped construct ID.

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps">BedrockKnowledgeBaseProps</a>

Configuration properties for the Bedrock Knowledge Base.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.exportConfiguration">exportConfiguration</a></code> | Export configuration for runtime use by the retrieval tool. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.generateIamPermissions">generateIamPermissions</a></code> | Generate IAM policy statements required for accessing this Bedrock Knowledge Base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.retrievalToolAsset">retrievalToolAsset</a></code> | Provide the retrieval tool asset for this knowledge base type. |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `exportConfiguration` <a name="exportConfiguration" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.exportConfiguration"></a>

```typescript
public exportConfiguration(): KnowledgeBaseRuntimeConfig
```

Export configuration for runtime use by the retrieval tool.

Returns a configuration object containing all Bedrock-specific
settings needed to query the knowledge base at runtime, including:
- Base configuration (name, description, retrieval, acl)
- Knowledge base type ('bedrock')
- Knowledge base ID and ARN
- Vector store configuration
- Guardrail configuration (if present)

##### `generateIamPermissions` <a name="generateIamPermissions" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.generateIamPermissions"></a>

```typescript
public generateIamPermissions(): PolicyStatement[]
```

Generate IAM policy statements required for accessing this Bedrock Knowledge Base.

Returns permissions for:
- bedrock:Retrieve - Query the knowledge base
- bedrock:RetrieveAndGenerate - Query and generate responses
- bedrock:ApplyGuardrail - Apply guardrail (if configured)
- s3:GetObject - Access S3 vectors (if using S3 Vectors with custom bucket)
- s3:GetObject - Access data source bucket (if create config provided)

All permissions are scoped to the specific knowledge base ARN
following the principle of least privilege.

##### `retrievalToolAsset` <a name="retrievalToolAsset" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.retrievalToolAsset"></a>

```typescript
public retrievalToolAsset(): Asset
```

Provide the retrieval tool asset for this knowledge base type.

By default, returns undefined to use the framework's default retrieval
tool. Subclasses can override this method to provide a custom retrieval
tool implementation.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.isConstruct"></a>

```typescript
import { BedrockKnowledgeBase } from '@cdklabs/cdk-appmod-catalog-blueprints'

BedrockKnowledgeBase.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.description">description</a></code> | <code>string</code> | Human-readable description of what this knowledge base contains. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.name">name</a></code> | <code>string</code> | Human-readable name for this knowledge base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.knowledgeBaseArn">knowledgeBaseArn</a></code> | <code>string</code> | The ARN of the Bedrock Knowledge Base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.knowledgeBaseId">knowledgeBaseId</a></code> | <code>string</code> | The unique identifier for the Bedrock Knowledge Base. |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `description`<sup>Required</sup> <a name="description" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string

Human-readable description of what this knowledge base contains.

This description is included in the agent's system prompt to help
the agent decide when to query this knowledge base.

---

##### `name`<sup>Required</sup> <a name="name" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

Human-readable name for this knowledge base.

This name is used for logging, display purposes, and to help the agent
identify which knowledge base to query.

---

##### `knowledgeBaseArn`<sup>Required</sup> <a name="knowledgeBaseArn" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.knowledgeBaseArn"></a>

```typescript
public readonly knowledgeBaseArn: string;
```

- *Type:* string

The ARN of the Bedrock Knowledge Base.

If not provided in props, this is constructed from the knowledgeBaseId
using the current region and account.

---

##### `knowledgeBaseId`<sup>Required</sup> <a name="knowledgeBaseId" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase.property.knowledgeBaseId"></a>

```typescript
public readonly knowledgeBaseId: string;
```

- *Type:* string

The unique identifier for the Bedrock Knowledge Base.

This is the ID assigned by Bedrock when the knowledge base was created.

---


### DataLoader <a name="DataLoader" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader"></a>

DataLoader construct for loading data into Aurora/RDS databases.

This construct provides a simplified solution for loading data from various file formats
(SQL, mysqldump, pg_dump) into MySQL or PostgreSQL databases. It uses S3 for file storage,
Step Functions for orchestration, and Lambda for processing.

Architecture:
1. Files are uploaded to S3 bucket
2. Step Function is triggered with list of S3 keys
3. Step Function iterates over files in execution order
4. Lambda function processes each file against the database

Example usage:
Create a DataLoader with database configuration and file inputs.
The construct will handle uploading files to S3, creating a Step Function
to orchestrate processing, and executing the data loading pipeline.

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.Initializer"></a>

```typescript
import { DataLoader } from '@cdklabs/cdk-appmod-catalog-blueprints'

new DataLoader(scope: Construct, id: string, props: DataLoaderProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps">DataLoaderProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps">DataLoaderProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.grantExecutionTriggerPermissions">grantExecutionTriggerPermissions</a></code> | Grants additional IAM permissions to the execution trigger Lambda function. |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `grantExecutionTriggerPermissions` <a name="grantExecutionTriggerPermissions" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.grantExecutionTriggerPermissions"></a>

```typescript
public grantExecutionTriggerPermissions(statement: PolicyStatement): void
```

Grants additional IAM permissions to the execution trigger Lambda function.

###### `statement`<sup>Required</sup> <a name="statement" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.grantExecutionTriggerPermissions.parameter.statement"></a>

- *Type:* aws-cdk-lib.aws_iam.PolicyStatement

The IAM policy statement to add.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.isConstruct"></a>

```typescript
import { DataLoader } from '@cdklabs/cdk-appmod-catalog-blueprints'

DataLoader.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.bucket">bucket</a></code> | <code>aws-cdk-lib.aws_s3.Bucket</code> | The S3 bucket used for storing files. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.customResourceProvider">customResourceProvider</a></code> | <code>aws-cdk-lib.custom_resources.Provider</code> | The custom resource provider for triggering state machine execution. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.executionTrigger">executionTrigger</a></code> | <code>aws-cdk-lib.CustomResource</code> | The custom resource that triggers the state machine. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.processorFunction">processorFunction</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | The Lambda function that processes the data loading. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.stateMachine">stateMachine</a></code> | <code>aws-cdk-lib.aws_stepfunctions.StateMachine</code> | The Step Functions state machine for orchestration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.bucketDeployment">bucketDeployment</a></code> | <code>aws-cdk-lib.aws_s3_deployment.BucketDeployment</code> | The bucket deployment for uploading files. |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `bucket`<sup>Required</sup> <a name="bucket" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.bucket"></a>

```typescript
public readonly bucket: Bucket;
```

- *Type:* aws-cdk-lib.aws_s3.Bucket

The S3 bucket used for storing files.

---

##### `customResourceProvider`<sup>Required</sup> <a name="customResourceProvider" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.customResourceProvider"></a>

```typescript
public readonly customResourceProvider: Provider;
```

- *Type:* aws-cdk-lib.custom_resources.Provider

The custom resource provider for triggering state machine execution.

---

##### `executionTrigger`<sup>Required</sup> <a name="executionTrigger" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.executionTrigger"></a>

```typescript
public readonly executionTrigger: CustomResource;
```

- *Type:* aws-cdk-lib.CustomResource

The custom resource that triggers the state machine.

---

##### `processorFunction`<sup>Required</sup> <a name="processorFunction" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.processorFunction"></a>

```typescript
public readonly processorFunction: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

The Lambda function that processes the data loading.

---

##### `stateMachine`<sup>Required</sup> <a name="stateMachine" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.stateMachine"></a>

```typescript
public readonly stateMachine: StateMachine;
```

- *Type:* aws-cdk-lib.aws_stepfunctions.StateMachine

The Step Functions state machine for orchestration.

---

##### `bucketDeployment`<sup>Optional</sup> <a name="bucketDeployment" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoader.property.bucketDeployment"></a>

```typescript
public readonly bucketDeployment: BucketDeployment;
```

- *Type:* aws-cdk-lib.aws_s3_deployment.BucketDeployment

The bucket deployment for uploading files.

---


### EventbridgeBroker <a name="EventbridgeBroker" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.Initializer"></a>

```typescript
import { EventbridgeBroker } from '@cdklabs/cdk-appmod-catalog-blueprints'

new EventbridgeBroker(scope: Construct, id: string, props: EventbridgeBrokerProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps">EventbridgeBrokerProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps">EventbridgeBrokerProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.sendViaSfnChain">sendViaSfnChain</a></code> | *No description.* |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `sendViaSfnChain` <a name="sendViaSfnChain" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.sendViaSfnChain"></a>

```typescript
public sendViaSfnChain(detailType: string, eventDetail: any): EventBridgePutEvents
```

###### `detailType`<sup>Required</sup> <a name="detailType" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.sendViaSfnChain.parameter.detailType"></a>

- *Type:* string

---

###### `eventDetail`<sup>Required</sup> <a name="eventDetail" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.sendViaSfnChain.parameter.eventDetail"></a>

- *Type:* any

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.isConstruct"></a>

```typescript
import { EventbridgeBroker } from '@cdklabs/cdk-appmod-catalog-blueprints'

EventbridgeBroker.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.property.eventbus">eventbus</a></code> | <code>aws-cdk-lib.aws_events.EventBus</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.property.kmsKey">kmsKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `eventbus`<sup>Required</sup> <a name="eventbus" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.property.eventbus"></a>

```typescript
public readonly eventbus: EventBus;
```

- *Type:* aws-cdk-lib.aws_events.EventBus

---

##### `kmsKey`<sup>Required</sup> <a name="kmsKey" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker.property.kmsKey"></a>

```typescript
public readonly kmsKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key

---


### Frontend <a name="Frontend" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend"></a>

Frontend construct that deploys a frontend application to S3 and CloudFront.

This construct provides a complete solution for hosting static frontend applications
with the following features:
- S3 bucket for hosting static assets with security best practices
- CloudFront distribution for global content delivery
- Optional custom domain with SSL certificate
- Automatic build process execution
- SPA-friendly error handling by default
- Security configurations

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.Initializer"></a>

```typescript
import { Frontend } from '@cdklabs/cdk-appmod-catalog-blueprints'

new Frontend(scope: Construct, id: string, props: FrontendProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | The construct scope. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.Initializer.parameter.id">id</a></code> | <code>string</code> | The construct ID. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps">FrontendProps</a></code> | The frontend properties. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

The construct scope.

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.Initializer.parameter.id"></a>

- *Type:* string

The construct ID.

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps">FrontendProps</a>

The frontend properties.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.bucketName">bucketName</a></code> | Gets the S3 bucket name. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.distributionDomainName">distributionDomainName</a></code> | Gets the CloudFront distribution domain name. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.url">url</a></code> | Gets the URL of the frontend application. |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `bucketName` <a name="bucketName" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.bucketName"></a>

```typescript
public bucketName(): string
```

Gets the S3 bucket name.

##### `distributionDomainName` <a name="distributionDomainName" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.distributionDomainName"></a>

```typescript
public distributionDomainName(): string
```

Gets the CloudFront distribution domain name.

##### `url` <a name="url" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.url"></a>

```typescript
public url(): string
```

Gets the URL of the frontend application.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.isConstruct"></a>

```typescript
import { Frontend } from '@cdklabs/cdk-appmod-catalog-blueprints'

Frontend.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.bucket">bucket</a></code> | <code>aws-cdk-lib.aws_s3.Bucket</code> | The S3 bucket hosting the frontend assets. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.bucketDeployment">bucketDeployment</a></code> | <code>aws-cdk-lib.aws_s3_deployment.BucketDeployment</code> | The bucket deployment that uploads the frontend assets. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.distribution">distribution</a></code> | <code>aws-cdk-lib.aws_cloudfront.Distribution</code> | The CloudFront distribution. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.asset">asset</a></code> | <code>aws-cdk-lib.aws_s3_assets.Asset</code> | The Asset containing the frontend source code. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.domainName">domainName</a></code> | <code>string</code> | The custom domain name (if configured). |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `bucket`<sup>Required</sup> <a name="bucket" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.bucket"></a>

```typescript
public readonly bucket: Bucket;
```

- *Type:* aws-cdk-lib.aws_s3.Bucket

The S3 bucket hosting the frontend assets.

---

##### `bucketDeployment`<sup>Required</sup> <a name="bucketDeployment" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.bucketDeployment"></a>

```typescript
public readonly bucketDeployment: BucketDeployment;
```

- *Type:* aws-cdk-lib.aws_s3_deployment.BucketDeployment

The bucket deployment that uploads the frontend assets.

---

##### `distribution`<sup>Required</sup> <a name="distribution" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.distribution"></a>

```typescript
public readonly distribution: Distribution;
```

- *Type:* aws-cdk-lib.aws_cloudfront.Distribution

The CloudFront distribution.

---

##### `asset`<sup>Optional</sup> <a name="asset" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.asset"></a>

```typescript
public readonly asset: Asset;
```

- *Type:* aws-cdk-lib.aws_s3_assets.Asset

The Asset containing the frontend source code.

---

##### `domainName`<sup>Optional</sup> <a name="domainName" id="@cdklabs/cdk-appmod-catalog-blueprints.Frontend.property.domainName"></a>

```typescript
public readonly domainName: string;
```

- *Type:* string

The custom domain name (if configured).

---


### Network <a name="Network" id="@cdklabs/cdk-appmod-catalog-blueprints.Network"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.Initializer"></a>

```typescript
import { Network } from '@cdklabs/cdk-appmod-catalog-blueprints'

new Network(scope: Construct, id: string, props?: NetworkProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps">NetworkProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Optional</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps">NetworkProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.applicationSubnetSelection">applicationSubnetSelection</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.createServiceEndpoint">createServiceEndpoint</a></code> | *No description.* |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `applicationSubnetSelection` <a name="applicationSubnetSelection" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.applicationSubnetSelection"></a>

```typescript
public applicationSubnetSelection(): SubnetSelection
```

##### `createServiceEndpoint` <a name="createServiceEndpoint" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.createServiceEndpoint"></a>

```typescript
public createServiceEndpoint(id: string, service: InterfaceVpcEndpointService, peer?: IPeer): InterfaceVpcEndpoint
```

###### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.createServiceEndpoint.parameter.id"></a>

- *Type:* string

---

###### `service`<sup>Required</sup> <a name="service" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.createServiceEndpoint.parameter.service"></a>

- *Type:* aws-cdk-lib.aws_ec2.InterfaceVpcEndpointService

---

###### `peer`<sup>Optional</sup> <a name="peer" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.createServiceEndpoint.parameter.peer"></a>

- *Type:* aws-cdk-lib.aws_ec2.IPeer

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.useExistingVPCFromLookup">useExistingVPCFromLookup</a></code> | *No description.* |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.isConstruct"></a>

```typescript
import { Network } from '@cdklabs/cdk-appmod-catalog-blueprints'

Network.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

##### `useExistingVPCFromLookup` <a name="useExistingVPCFromLookup" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.useExistingVPCFromLookup"></a>

```typescript
import { Network } from '@cdklabs/cdk-appmod-catalog-blueprints'

Network.useExistingVPCFromLookup(scope: Construct, id: string, options: VpcLookupOptions)
```

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.useExistingVPCFromLookup.parameter.scope"></a>

- *Type:* constructs.Construct

---

###### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.useExistingVPCFromLookup.parameter.id"></a>

- *Type:* string

---

###### `options`<sup>Required</sup> <a name="options" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.useExistingVPCFromLookup.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_ec2.VpcLookupOptions

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `vpc`<sup>Required</sup> <a name="vpc" id="@cdklabs/cdk-appmod-catalog-blueprints.Network.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

---


## Structs <a name="Structs" id="Structs"></a>

### AccessLogProps <a name="AccessLogProps" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps"></a>

Configuration options for the AccessLog construct.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps.Initializer"></a>

```typescript
import { AccessLogProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const accessLogProps: AccessLogProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps.property.bucketName">bucketName</a></code> | <code>string</code> | The name of the S3 bucket for access logs. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps.property.bucketPrefix">bucketPrefix</a></code> | <code>string</code> | Custom bucket prefix for organizing access logs. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps.property.lifecycleRules">lifecycleRules</a></code> | <code>aws-cdk-lib.aws_s3.LifecycleRule[]</code> | Lifecycle rules for the access logs. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps.property.versioned">versioned</a></code> | <code>boolean</code> | Whether to enable versioning on the access logs bucket. |

---

##### `bucketName`<sup>Optional</sup> <a name="bucketName" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps.property.bucketName"></a>

```typescript
public readonly bucketName: string;
```

- *Type:* string
- *Default:* 'access-logs'

The name of the S3 bucket for access logs.

---

##### `bucketPrefix`<sup>Optional</sup> <a name="bucketPrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps.property.bucketPrefix"></a>

```typescript
public readonly bucketPrefix: string;
```

- *Type:* string
- *Default:* 'access-logs'

Custom bucket prefix for organizing access logs.

---

##### `lifecycleRules`<sup>Optional</sup> <a name="lifecycleRules" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps.property.lifecycleRules"></a>

```typescript
public readonly lifecycleRules: LifecycleRule[];
```

- *Type:* aws-cdk-lib.aws_s3.LifecycleRule[]
- *Default:* Transition to IA after 30 days, delete after 90 days

Lifecycle rules for the access logs.

---

##### `versioned`<sup>Optional</sup> <a name="versioned" id="@cdklabs/cdk-appmod-catalog-blueprints.AccessLogProps.property.versioned"></a>

```typescript
public readonly versioned: boolean;
```

- *Type:* boolean
- *Default:* false

Whether to enable versioning on the access logs bucket.

---

### AclConfiguration <a name="AclConfiguration" id="@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration"></a>

Configuration for Access Control List (ACL) based filtering.

When enabled, retrieval queries will be filtered based on user identity
context, ensuring users only retrieve documents they have permission to access.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration.Initializer"></a>

```typescript
import { AclConfiguration } from '@cdklabs/cdk-appmod-catalog-blueprints'

const aclConfiguration: AclConfiguration = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration.property.enabled">enabled</a></code> | <code>boolean</code> | Enable ACL-based filtering for retrieval queries. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration.property.metadataField">metadataField</a></code> | <code>string</code> | Metadata field containing access permissions. |

---

##### `enabled`<sup>Required</sup> <a name="enabled" id="@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration.property.enabled"></a>

```typescript
public readonly enabled: boolean;
```

- *Type:* boolean
- *Default:* false

Enable ACL-based filtering for retrieval queries.

When true, the retrieval tool will require user context and apply
metadata filters based on user permissions.

---

##### `metadataField`<sup>Optional</sup> <a name="metadataField" id="@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration.property.metadataField"></a>

```typescript
public readonly metadataField: string;
```

- *Type:* string
- *Default:* 'group'

Metadata field containing access permissions.

This field in the document metadata should contain the group or
permission identifier that controls access. The retrieval tool
will filter results where this field matches the user's permissions.

---

### AdditionalDistributionProps <a name="AdditionalDistributionProps" id="@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps"></a>

Additional CloudFront distribution properties.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps.Initializer"></a>

```typescript
import { AdditionalDistributionProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const additionalDistributionProps: AdditionalDistributionProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps.property.comment">comment</a></code> | <code>string</code> | Optional comment for the distribution. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps.property.enabled">enabled</a></code> | <code>boolean</code> | Optional enabled flag for the distribution. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps.property.priceClass">priceClass</a></code> | <code>aws-cdk-lib.aws_cloudfront.PriceClass</code> | Optional price class for the distribution. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps.property.webAclId">webAclId</a></code> | <code>string</code> | Optional web ACL ID for the distribution. |

---

##### `comment`<sup>Optional</sup> <a name="comment" id="@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string

Optional comment for the distribution.

---

##### `enabled`<sup>Optional</sup> <a name="enabled" id="@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps.property.enabled"></a>

```typescript
public readonly enabled: boolean;
```

- *Type:* boolean

Optional enabled flag for the distribution.

---

##### `priceClass`<sup>Optional</sup> <a name="priceClass" id="@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps.property.priceClass"></a>

```typescript
public readonly priceClass: PriceClass;
```

- *Type:* aws-cdk-lib.aws_cloudfront.PriceClass

Optional price class for the distribution.

---

##### `webAclId`<sup>Optional</sup> <a name="webAclId" id="@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps.property.webAclId"></a>

```typescript
public readonly webAclId: string;
```

- *Type:* string

Optional web ACL ID for the distribution.

---

### AgentDefinitionProps <a name="AgentDefinitionProps" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps"></a>

Parameters that influences the behavior of the agent.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.Initializer"></a>

```typescript
import { AgentDefinitionProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const agentDefinitionProps: AgentDefinitionProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.bedrockModel">bedrockModel</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a></code> | Configuration for the Bedrock Model to be used. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.systemPrompt">systemPrompt</a></code> | <code>aws-cdk-lib.aws_s3_assets.Asset</code> | The system prompt of the agent. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.additionalPolicyStatementsForKnowledgeBases">additionalPolicyStatementsForKnowledgeBases</a></code> | <code>aws-cdk-lib.aws_iam.PolicyStatement[]</code> | Additional IAM policy statements for knowledge base access. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.additionalPolicyStatementsForTools">additionalPolicyStatementsForTools</a></code> | <code>aws-cdk-lib.aws_iam.PolicyStatement[]</code> | If tools need additional IAM permissions, these statements would be attached to the Agent's IAM role. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.knowledgeBases">knowledgeBases</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase">IKnowledgeBase</a>[]</code> | Knowledge bases available to the agent for Retrieval-Augmented Generation (RAG). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.lambdaLayers">lambdaLayers</a></code> | <code>aws-cdk-lib.aws_lambda.LayerVersion[]</code> | Any dependencies needed by the provided tools. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.tools">tools</a></code> | <code>aws-cdk-lib.aws_s3_assets.Asset[]</code> | List of tools defined in python files. |

---

##### `bedrockModel`<sup>Required</sup> <a name="bedrockModel" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.bedrockModel"></a>

```typescript
public readonly bedrockModel: BedrockModelProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a>

Configuration for the Bedrock Model to be used.

---

##### `systemPrompt`<sup>Required</sup> <a name="systemPrompt" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.systemPrompt"></a>

```typescript
public readonly systemPrompt: Asset;
```

- *Type:* aws-cdk-lib.aws_s3_assets.Asset

The system prompt of the agent.

---

##### `additionalPolicyStatementsForKnowledgeBases`<sup>Optional</sup> <a name="additionalPolicyStatementsForKnowledgeBases" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.additionalPolicyStatementsForKnowledgeBases"></a>

```typescript
public readonly additionalPolicyStatementsForKnowledgeBases: PolicyStatement[];
```

- *Type:* aws-cdk-lib.aws_iam.PolicyStatement[]
- *Default:* Only auto-generated permissions from knowledge bases

Additional IAM policy statements for knowledge base access.

Use this when knowledge bases require permissions beyond what is
automatically generated by the IKnowledgeBase implementations.
These statements will be added to the agent's IAM role in addition
to the auto-generated permissions.

---

##### `additionalPolicyStatementsForTools`<sup>Optional</sup> <a name="additionalPolicyStatementsForTools" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.additionalPolicyStatementsForTools"></a>

```typescript
public readonly additionalPolicyStatementsForTools: PolicyStatement[];
```

- *Type:* aws-cdk-lib.aws_iam.PolicyStatement[]

If tools need additional IAM permissions, these statements would be attached to the Agent's IAM role.

---

##### `knowledgeBases`<sup>Optional</sup> <a name="knowledgeBases" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.knowledgeBases"></a>

```typescript
public readonly knowledgeBases: IKnowledgeBase[];
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase">IKnowledgeBase</a>[]
- *Default:* No knowledge bases configured

Knowledge bases available to the agent for Retrieval-Augmented Generation (RAG).

When configured, the agent will have access to a built-in retrieval tool
that can query these knowledge bases. The agent's system prompt will be
automatically augmented with information about available knowledge bases.

Each knowledge base must implement the IKnowledgeBase interface, which
handles IAM permission generation and runtime configuration.

---

##### `lambdaLayers`<sup>Optional</sup> <a name="lambdaLayers" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.lambdaLayers"></a>

```typescript
public readonly lambdaLayers: LayerVersion[];
```

- *Type:* aws-cdk-lib.aws_lambda.LayerVersion[]

Any dependencies needed by the provided tools.

---

##### `tools`<sup>Optional</sup> <a name="tools" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.tools"></a>

```typescript
public readonly tools: Asset[];
```

- *Type:* aws-cdk-lib.aws_s3_assets.Asset[]

List of tools defined in python files.

This tools would automatically
be loaded by the agent. You can also use this to incorporate other specialized
agents as tools.

---

### AgenticDocumentProcessingProps <a name="AgenticDocumentProcessingProps" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps"></a>

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.Initializer"></a>

```typescript
import { AgenticDocumentProcessingProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const agenticDocumentProcessingProps: AgenticDocumentProcessingProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | Data protection related configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Business metric namespace. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | Business metric service name dimension. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.documentProcessingTable">documentProcessingTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | DynamoDB table for storing document processing metadata and workflow state. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.enableObservability">enableObservability</a></code> | <code>boolean</code> | Enable logging and tracing for all supporting resource. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | KMS key to be used. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.eventbridgeBroker">eventbridgeBroker</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker">EventbridgeBroker</a></code> | Optional EventBridge broker for publishing custom events during processing. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.ingressAdapter">ingressAdapter</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a></code> | Adapter that defines how the document processing workflow is triggered. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.network">network</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a></code> | Resources that can run inside a VPC will follow the provided network configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | Removal policy for created resources (bucket, table, queue). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.workflowTimeout">workflowTimeout</a></code> | <code>aws-cdk-lib.Duration</code> | Maximum execution time for the Step Functions workflow. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.aggregationPrompt">aggregationPrompt</a></code> | <code>string</code> | Custom prompt template for aggregating results from multiple chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.chunkingConfig">chunkingConfig</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig">ChunkingConfig</a></code> | Configuration for PDF chunking behavior. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.classificationBedrockModel">classificationBedrockModel</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a></code> | Bedrock foundation model for document classification step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.classificationPrompt">classificationPrompt</a></code> | <code>string</code> | Custom prompt template for document classification. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.enableChunking">enableChunking</a></code> | <code>boolean</code> | Enable PDF chunking for large documents. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.enrichmentLambdaFunction">enrichmentLambdaFunction</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | Optional Lambda function for document enrichment step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.postProcessingLambdaFunction">postProcessingLambdaFunction</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | Optional Lambda function for post-processing step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.processingBedrockModel">processingBedrockModel</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a></code> | Bedrock foundation model for document extraction step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.processingPrompt">processingPrompt</a></code> | <code>string</code> | Custom prompt template for document extraction. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.stepTimeouts">stepTimeouts</a></code> | <code>aws-cdk-lib.Duration</code> | Timeout for individual Step Functions tasks (classification, extraction, etc.). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.processingAgentParameters">processingAgentParameters</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps">BatchAgentProps</a></code> | This parameter takes precedence over the `processingBedrockModel` parameter. |

---

##### `logGroupDataProtection`<sup>Optional</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>
- *Default:* a new KMS key would be generated

Data protection related configuration.

---

##### `metricNamespace`<sup>Optional</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric namespace.

---

##### `metricServiceName`<sup>Optional</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric service name dimension.

---

##### `documentProcessingTable`<sup>Optional</sup> <a name="documentProcessingTable" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.documentProcessingTable"></a>

```typescript
public readonly documentProcessingTable: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

DynamoDB table for storing document processing metadata and workflow state.

If not provided, a new table will be created with DocumentId as partition key.

---

##### `enableObservability`<sup>Optional</sup> <a name="enableObservability" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.enableObservability"></a>

```typescript
public readonly enableObservability: boolean;
```

- *Type:* boolean
- *Default:* false

Enable logging and tracing for all supporting resource.

---

##### `encryptionKey`<sup>Optional</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key
- *Default:* A new key would be created

KMS key to be used.

---

##### `eventbridgeBroker`<sup>Optional</sup> <a name="eventbridgeBroker" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.eventbridgeBroker"></a>

```typescript
public readonly eventbridgeBroker: EventbridgeBroker;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker">EventbridgeBroker</a>

Optional EventBridge broker for publishing custom events during processing.

If not provided, no custom events will be sent out.

---

##### `ingressAdapter`<sup>Optional</sup> <a name="ingressAdapter" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.ingressAdapter"></a>

```typescript
public readonly ingressAdapter: IAdapter;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a>
- *Default:* QueuedS3Adapter

Adapter that defines how the document processing workflow is triggered.

---

##### `network`<sup>Optional</sup> <a name="network" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.network"></a>

```typescript
public readonly network: Network;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a>
- *Default:* resources will run outside of a VPC

Resources that can run inside a VPC will follow the provided network configuration.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* RemovalPolicy.DESTROY

Removal policy for created resources (bucket, table, queue).

---

##### `workflowTimeout`<sup>Optional</sup> <a name="workflowTimeout" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.workflowTimeout"></a>

```typescript
public readonly workflowTimeout: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* Duration.minutes(30)

Maximum execution time for the Step Functions workflow.

---

##### `aggregationPrompt`<sup>Optional</sup> <a name="aggregationPrompt" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.aggregationPrompt"></a>

```typescript
public readonly aggregationPrompt: string;
```

- *Type:* string
- *Default:* DEFAULT_AGGREGATION_PROMPT

Custom prompt template for aggregating results from multiple chunks.

Used when chunking is enabled to merge processing results from all chunks
into a single coherent result.

The prompt receives the concatenated processing results from all chunks
and should instruct the model to synthesize them into a unified output.

---

##### `chunkingConfig`<sup>Optional</sup> <a name="chunkingConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.chunkingConfig"></a>

```typescript
public readonly chunkingConfig: ChunkingConfig;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig">ChunkingConfig</a>
- *Default:* undefined (uses default configuration when enableChunking is true)

Configuration for PDF chunking behavior.

Only applies when `enableChunking` is true. Allows customization of:
- **Chunking strategy**: How documents are split (fixed-pages, token-based, or hybrid)
- **Thresholds**: When to trigger chunking based on page count or token count
- **Chunk size and overlap**: Control chunk boundaries and context preservation
- **Processing mode**: Parallel (faster) or sequential (cost-optimized)
- **Aggregation strategy**: How to combine results from multiple chunks

## Default Configuration

If not provided, uses sensible defaults optimized for most use cases:
- Strategy: `'hybrid'` (recommended - balances token and page limits)
- Page threshold: 100 pages
- Token threshold: 150,000 tokens
- Processing mode: `'parallel'`
- Max concurrency: 10
- Aggregation strategy: `'majority-vote'`

## Strategy Comparison

| Strategy | Best For | Pros | Cons |
|----------|----------|------|------|
| `hybrid` | Most documents | Balances token/page limits | Slightly more complex |
| `token-based` | Variable density | Respects model limits | Slower analysis |
| `fixed-pages` | Uniform density | Simple, fast | May exceed token limits |

> [{@link ChunkingConfig } for detailed configuration options]({@link ChunkingConfig } for detailed configuration options)

---

##### `classificationBedrockModel`<sup>Optional</sup> <a name="classificationBedrockModel" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.classificationBedrockModel"></a>

```typescript
public readonly classificationBedrockModel: BedrockModelProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a>

Bedrock foundation model for document classification step.

---

##### `classificationPrompt`<sup>Optional</sup> <a name="classificationPrompt" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.classificationPrompt"></a>

```typescript
public readonly classificationPrompt: string;
```

- *Type:* string
- *Default:* DEFAULT_CLASSIFICATION_PROMPT

Custom prompt template for document classification.

Must include placeholder for document content.

---

##### `enableChunking`<sup>Optional</sup> <a name="enableChunking" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.enableChunking"></a>

```typescript
public readonly enableChunking: boolean;
```

- *Type:* boolean
- *Default:* false

Enable PDF chunking for large documents.

When enabled, documents exceeding configured thresholds will be automatically
split into chunks, processed in parallel or sequentially, and results aggregated.

This feature is useful for:
- Processing large PDFs (>100 pages)
- Handling documents that exceed Bedrock token limits (~200K tokens)
- Improving processing reliability for complex documents
- Processing documents with variable content density

The chunking workflow:
1. Analyzes PDF to determine page count and estimate token count
2. Decides if chunking is needed based on configured thresholds
3. If chunking is needed, splits PDF into chunks and uploads to S3
4. Processes each chunk through classification and extraction
5. Aggregates results using majority voting for classification
6. Deduplicates entities across chunks
7. Cleans up temporary chunk files from S3

---

##### `enrichmentLambdaFunction`<sup>Optional</sup> <a name="enrichmentLambdaFunction" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.enrichmentLambdaFunction"></a>

```typescript
public readonly enrichmentLambdaFunction: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

Optional Lambda function for document enrichment step.

If provided, will be invoked after extraction with workflow state.

---

##### `postProcessingLambdaFunction`<sup>Optional</sup> <a name="postProcessingLambdaFunction" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.postProcessingLambdaFunction"></a>

```typescript
public readonly postProcessingLambdaFunction: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

Optional Lambda function for post-processing step.

If provided, will be invoked after enrichment with workflow state.

---

##### `processingBedrockModel`<sup>Optional</sup> <a name="processingBedrockModel" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.processingBedrockModel"></a>

```typescript
public readonly processingBedrockModel: BedrockModelProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a>

Bedrock foundation model for document extraction step.

---

##### `processingPrompt`<sup>Optional</sup> <a name="processingPrompt" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.processingPrompt"></a>

```typescript
public readonly processingPrompt: string;
```

- *Type:* string
- *Default:* DEFAULT_EXTRACTION_PROMPT

Custom prompt template for document extraction.

Must include placeholder for document content and classification result.

---

##### `stepTimeouts`<sup>Optional</sup> <a name="stepTimeouts" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.stepTimeouts"></a>

```typescript
public readonly stepTimeouts: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* Duration.minutes(5)

Timeout for individual Step Functions tasks (classification, extraction, etc.).

---

##### `processingAgentParameters`<sup>Required</sup> <a name="processingAgentParameters" id="@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.processingAgentParameters"></a>

```typescript
public readonly processingAgentParameters: BatchAgentProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps">BatchAgentProps</a>

This parameter takes precedence over the `processingBedrockModel` parameter.

---

### AgentToolsLocationDefinition <a name="AgentToolsLocationDefinition" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition"></a>

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition.Initializer"></a>

```typescript
import { AgentToolsLocationDefinition } from '@cdklabs/cdk-appmod-catalog-blueprints'

const agentToolsLocationDefinition: AgentToolsLocationDefinition = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition.property.bucketName">bucketName</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition.property.isFile">isFile</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition.property.isZipArchive">isZipArchive</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition.property.key">key</a></code> | <code>string</code> | *No description.* |

---

##### `bucketName`<sup>Required</sup> <a name="bucketName" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition.property.bucketName"></a>

```typescript
public readonly bucketName: string;
```

- *Type:* string

---

##### `isFile`<sup>Required</sup> <a name="isFile" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition.property.isFile"></a>

```typescript
public readonly isFile: boolean;
```

- *Type:* boolean

---

##### `isZipArchive`<sup>Required</sup> <a name="isZipArchive" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition.property.isZipArchive"></a>

```typescript
public readonly isZipArchive: boolean;
```

- *Type:* boolean

---

##### `key`<sup>Required</sup> <a name="key" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentToolsLocationDefinition.property.key"></a>

```typescript
public readonly key: string;
```

- *Type:* string

---

### AggregatedResult <a name="AggregatedResult" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult"></a>

Aggregated result from processing all chunks.

Combines classification and extraction results into final output.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.Initializer"></a>

```typescript
import { AggregatedResult } from '@cdklabs/cdk-appmod-catalog-blueprints'

const aggregatedResult: AggregatedResult = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.chunksSummary">chunksSummary</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary">ChunksSummary</a></code> | Summary of chunk processing results. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.classification">classification</a></code> | <code>string</code> | Final document classification (from majority vote or other strategy). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.classificationConfidence">classificationConfidence</a></code> | <code>number</code> | Confidence score for the classification (0-1). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.documentId">documentId</a></code> | <code>string</code> | Document identifier. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.entities">entities</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Entity">Entity</a>[]</code> | Deduplicated entities from all chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.partialResult">partialResult</a></code> | <code>boolean</code> | Indicates if result is partial due to chunk failures. |

---

##### `chunksSummary`<sup>Required</sup> <a name="chunksSummary" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.chunksSummary"></a>

```typescript
public readonly chunksSummary: ChunksSummary;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary">ChunksSummary</a>

Summary of chunk processing results.

---

##### `classification`<sup>Required</sup> <a name="classification" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.classification"></a>

```typescript
public readonly classification: string;
```

- *Type:* string

Final document classification (from majority vote or other strategy).

---

##### `classificationConfidence`<sup>Required</sup> <a name="classificationConfidence" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.classificationConfidence"></a>

```typescript
public readonly classificationConfidence: number;
```

- *Type:* number

Confidence score for the classification (0-1).

For majority vote: (count of majority / total chunks)

---

##### `documentId`<sup>Required</sup> <a name="documentId" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.documentId"></a>

```typescript
public readonly documentId: string;
```

- *Type:* string

Document identifier.

---

##### `entities`<sup>Required</sup> <a name="entities" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.entities"></a>

```typescript
public readonly entities: Entity[];
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.Entity">Entity</a>[]

Deduplicated entities from all chunks.

Entities without page numbers are deduplicated by (type, value).
Entities with page numbers are preserved even if duplicated.

---

##### `partialResult`<sup>Required</sup> <a name="partialResult" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregatedResult.property.partialResult"></a>

```typescript
public readonly partialResult: boolean;
```

- *Type:* boolean

Indicates if result is partial due to chunk failures.

True if fewer than minSuccessThreshold chunks succeeded.

---

### AggregationRequest <a name="AggregationRequest" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregationRequest"></a>

Request payload for aggregation Lambda.

Contains results from all processed chunks.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregationRequest.Initializer"></a>

```typescript
import { AggregationRequest } from '@cdklabs/cdk-appmod-catalog-blueprints'

const aggregationRequest: AggregationRequest = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AggregationRequest.property.chunkResults">chunkResults</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult">ChunkResult</a>[]</code> | Results from all processed chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AggregationRequest.property.documentId">documentId</a></code> | <code>string</code> | Document identifier. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AggregationRequest.property.aggregationStrategy">aggregationStrategy</a></code> | <code>string</code> | Strategy to use for aggregation. |

---

##### `chunkResults`<sup>Required</sup> <a name="chunkResults" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregationRequest.property.chunkResults"></a>

```typescript
public readonly chunkResults: ChunkResult[];
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult">ChunkResult</a>[]

Results from all processed chunks.

---

##### `documentId`<sup>Required</sup> <a name="documentId" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregationRequest.property.documentId"></a>

```typescript
public readonly documentId: string;
```

- *Type:* string

Document identifier.

---

##### `aggregationStrategy`<sup>Optional</sup> <a name="aggregationStrategy" id="@cdklabs/cdk-appmod-catalog-blueprints.AggregationRequest.property.aggregationStrategy"></a>

```typescript
public readonly aggregationStrategy: string;
```

- *Type:* string
- *Default:* 'majority-vote'

Strategy to use for aggregation.

---

### BaseAgentProps <a name="BaseAgentProps" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps"></a>

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.Initializer"></a>

```typescript
import { BaseAgentProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const baseAgentProps: BaseAgentProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | Data protection related configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Business metric namespace. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | Business metric service name dimension. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.agentDefinition">agentDefinition</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps">AgentDefinitionProps</a></code> | Agent related parameters. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.agentName">agentName</a></code> | <code>string</code> | Name of the agent. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.enableObservability">enableObservability</a></code> | <code>boolean</code> | Enable observability. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | Encryption key to encrypt agent environment variables. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.network">network</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a></code> | If the Agent would be running inside a VPC. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | Removal policy for resources created by this construct. |

---

##### `logGroupDataProtection`<sup>Optional</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>
- *Default:* a new KMS key would be generated

Data protection related configuration.

---

##### `metricNamespace`<sup>Optional</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric namespace.

---

##### `metricServiceName`<sup>Optional</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric service name dimension.

---

##### `agentDefinition`<sup>Required</sup> <a name="agentDefinition" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.agentDefinition"></a>

```typescript
public readonly agentDefinition: AgentDefinitionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps">AgentDefinitionProps</a>

Agent related parameters.

---

##### `agentName`<sup>Required</sup> <a name="agentName" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.agentName"></a>

```typescript
public readonly agentName: string;
```

- *Type:* string

Name of the agent.

---

##### `enableObservability`<sup>Optional</sup> <a name="enableObservability" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.enableObservability"></a>

```typescript
public readonly enableObservability: boolean;
```

- *Type:* boolean
- *Default:* false

Enable observability.

---

##### `encryptionKey`<sup>Optional</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key
- *Default:* new KMS Key would be created

Encryption key to encrypt agent environment variables.

---

##### `network`<sup>Optional</sup> <a name="network" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.network"></a>

```typescript
public readonly network: Network;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a>
- *Default:* Agent would not be in a VPC

If the Agent would be running inside a VPC.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseAgentProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* RemovalPolicy.DESTROY

Removal policy for resources created by this construct.

---

### BaseDocumentProcessingProps <a name="BaseDocumentProcessingProps" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps"></a>

Configuration properties for BaseDocumentProcessing construct.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.Initializer"></a>

```typescript
import { BaseDocumentProcessingProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const baseDocumentProcessingProps: BaseDocumentProcessingProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | Data protection related configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Business metric namespace. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | Business metric service name dimension. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.documentProcessingTable">documentProcessingTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | DynamoDB table for storing document processing metadata and workflow state. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.enableObservability">enableObservability</a></code> | <code>boolean</code> | Enable logging and tracing for all supporting resource. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | KMS key to be used. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.eventbridgeBroker">eventbridgeBroker</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker">EventbridgeBroker</a></code> | Optional EventBridge broker for publishing custom events during processing. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.ingressAdapter">ingressAdapter</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a></code> | Adapter that defines how the document processing workflow is triggered. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.network">network</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a></code> | Resources that can run inside a VPC will follow the provided network configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | Removal policy for created resources (bucket, table, queue). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.workflowTimeout">workflowTimeout</a></code> | <code>aws-cdk-lib.Duration</code> | Maximum execution time for the Step Functions workflow. |

---

##### `logGroupDataProtection`<sup>Optional</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>
- *Default:* a new KMS key would be generated

Data protection related configuration.

---

##### `metricNamespace`<sup>Optional</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric namespace.

---

##### `metricServiceName`<sup>Optional</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric service name dimension.

---

##### `documentProcessingTable`<sup>Optional</sup> <a name="documentProcessingTable" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.documentProcessingTable"></a>

```typescript
public readonly documentProcessingTable: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

DynamoDB table for storing document processing metadata and workflow state.

If not provided, a new table will be created with DocumentId as partition key.

---

##### `enableObservability`<sup>Optional</sup> <a name="enableObservability" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.enableObservability"></a>

```typescript
public readonly enableObservability: boolean;
```

- *Type:* boolean
- *Default:* false

Enable logging and tracing for all supporting resource.

---

##### `encryptionKey`<sup>Optional</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key
- *Default:* A new key would be created

KMS key to be used.

---

##### `eventbridgeBroker`<sup>Optional</sup> <a name="eventbridgeBroker" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.eventbridgeBroker"></a>

```typescript
public readonly eventbridgeBroker: EventbridgeBroker;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker">EventbridgeBroker</a>

Optional EventBridge broker for publishing custom events during processing.

If not provided, no custom events will be sent out.

---

##### `ingressAdapter`<sup>Optional</sup> <a name="ingressAdapter" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.ingressAdapter"></a>

```typescript
public readonly ingressAdapter: IAdapter;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a>
- *Default:* QueuedS3Adapter

Adapter that defines how the document processing workflow is triggered.

---

##### `network`<sup>Optional</sup> <a name="network" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.network"></a>

```typescript
public readonly network: Network;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a>
- *Default:* resources will run outside of a VPC

Resources that can run inside a VPC will follow the provided network configuration.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* RemovalPolicy.DESTROY

Removal policy for created resources (bucket, table, queue).

---

##### `workflowTimeout`<sup>Optional</sup> <a name="workflowTimeout" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps.property.workflowTimeout"></a>

```typescript
public readonly workflowTimeout: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* Duration.minutes(30)

Maximum execution time for the Step Functions workflow.

---

### BaseKnowledgeBaseProps <a name="BaseKnowledgeBaseProps" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps"></a>

Base configuration for all knowledge base implementations.

This interface defines the common properties shared by all knowledge
base types. Specific implementations (like BedrockKnowledgeBase) extend
this with additional properties.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps.Initializer"></a>

```typescript
import { BaseKnowledgeBaseProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const baseKnowledgeBaseProps: BaseKnowledgeBaseProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps.property.description">description</a></code> | <code>string</code> | Description of what this knowledge base contains and when to use it. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps.property.name">name</a></code> | <code>string</code> | Human-readable name/identifier for this knowledge base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps.property.acl">acl</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration">AclConfiguration</a></code> | Access control configuration for identity-aware retrieval. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps.property.retrieval">retrieval</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration">RetrievalConfiguration</a></code> | Retrieval configuration options. |

---

##### `description`<sup>Required</sup> <a name="description" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string

Description of what this knowledge base contains and when to use it.

This description is shown to the agent in its system prompt to help
it decide when to query this knowledge base. Be specific about the
type of information contained and appropriate use cases.

---

*Example*

```typescript
'Contains product documentation, user guides, and FAQs. Use when answering questions about product features or troubleshooting.'
```


##### `name`<sup>Required</sup> <a name="name" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

Human-readable name/identifier for this knowledge base.

Used for logging, display purposes, and to help the agent identify
which knowledge base to query. Should be unique within the set of
knowledge bases configured for an agent.

---

*Example*

```typescript
'product-documentation'
```


##### `acl`<sup>Optional</sup> <a name="acl" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps.property.acl"></a>

```typescript
public readonly acl: AclConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration">AclConfiguration</a>
- *Default:* ACL disabled

Access control configuration for identity-aware retrieval.

When enabled, retrieval queries will be filtered based on user
identity context to ensure users only access permitted documents.

---

##### `retrieval`<sup>Optional</sup> <a name="retrieval" id="@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBaseProps.property.retrieval"></a>

```typescript
public readonly retrieval: RetrievalConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration">RetrievalConfiguration</a>
- *Default:* { numberOfResults: 5 }

Retrieval configuration options.

Controls the number of results returned and optional metadata filtering.

---

### BatchAgentProps <a name="BatchAgentProps" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps"></a>

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.Initializer"></a>

```typescript
import { BatchAgentProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const batchAgentProps: BatchAgentProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | Data protection related configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Business metric namespace. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | Business metric service name dimension. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.agentDefinition">agentDefinition</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps">AgentDefinitionProps</a></code> | Agent related parameters. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.agentName">agentName</a></code> | <code>string</code> | Name of the agent. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.enableObservability">enableObservability</a></code> | <code>boolean</code> | Enable observability. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | Encryption key to encrypt agent environment variables. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.network">network</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a></code> | If the Agent would be running inside a VPC. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | Removal policy for resources created by this construct. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.prompt">prompt</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.expectJson">expectJson</a></code> | <code>boolean</code> | *No description.* |

---

##### `logGroupDataProtection`<sup>Optional</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>
- *Default:* a new KMS key would be generated

Data protection related configuration.

---

##### `metricNamespace`<sup>Optional</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric namespace.

---

##### `metricServiceName`<sup>Optional</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric service name dimension.

---

##### `agentDefinition`<sup>Required</sup> <a name="agentDefinition" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.agentDefinition"></a>

```typescript
public readonly agentDefinition: AgentDefinitionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps">AgentDefinitionProps</a>

Agent related parameters.

---

##### `agentName`<sup>Required</sup> <a name="agentName" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.agentName"></a>

```typescript
public readonly agentName: string;
```

- *Type:* string

Name of the agent.

---

##### `enableObservability`<sup>Optional</sup> <a name="enableObservability" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.enableObservability"></a>

```typescript
public readonly enableObservability: boolean;
```

- *Type:* boolean
- *Default:* false

Enable observability.

---

##### `encryptionKey`<sup>Optional</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key
- *Default:* new KMS Key would be created

Encryption key to encrypt agent environment variables.

---

##### `network`<sup>Optional</sup> <a name="network" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.network"></a>

```typescript
public readonly network: Network;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a>
- *Default:* Agent would not be in a VPC

If the Agent would be running inside a VPC.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* RemovalPolicy.DESTROY

Removal policy for resources created by this construct.

---

##### `prompt`<sup>Required</sup> <a name="prompt" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.prompt"></a>

```typescript
public readonly prompt: string;
```

- *Type:* string

---

##### `expectJson`<sup>Optional</sup> <a name="expectJson" id="@cdklabs/cdk-appmod-catalog-blueprints.BatchAgentProps.property.expectJson"></a>

```typescript
public readonly expectJson: boolean;
```

- *Type:* boolean

---

### BedrockDocumentProcessingProps <a name="BedrockDocumentProcessingProps" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps"></a>

Configuration properties for BedrockDocumentProcessing construct.

Extends BaseDocumentProcessingProps with Bedrock-specific options.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.Initializer"></a>

```typescript
import { BedrockDocumentProcessingProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const bedrockDocumentProcessingProps: BedrockDocumentProcessingProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | Data protection related configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Business metric namespace. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | Business metric service name dimension. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.documentProcessingTable">documentProcessingTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | DynamoDB table for storing document processing metadata and workflow state. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.enableObservability">enableObservability</a></code> | <code>boolean</code> | Enable logging and tracing for all supporting resource. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.encryptionKey">encryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | KMS key to be used. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.eventbridgeBroker">eventbridgeBroker</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker">EventbridgeBroker</a></code> | Optional EventBridge broker for publishing custom events during processing. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.ingressAdapter">ingressAdapter</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a></code> | Adapter that defines how the document processing workflow is triggered. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.network">network</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a></code> | Resources that can run inside a VPC will follow the provided network configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | Removal policy for created resources (bucket, table, queue). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.workflowTimeout">workflowTimeout</a></code> | <code>aws-cdk-lib.Duration</code> | Maximum execution time for the Step Functions workflow. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.aggregationPrompt">aggregationPrompt</a></code> | <code>string</code> | Custom prompt template for aggregating results from multiple chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.chunkingConfig">chunkingConfig</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig">ChunkingConfig</a></code> | Configuration for PDF chunking behavior. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.classificationBedrockModel">classificationBedrockModel</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a></code> | Bedrock foundation model for document classification step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.classificationPrompt">classificationPrompt</a></code> | <code>string</code> | Custom prompt template for document classification. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.enableChunking">enableChunking</a></code> | <code>boolean</code> | Enable PDF chunking for large documents. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.enrichmentLambdaFunction">enrichmentLambdaFunction</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | Optional Lambda function for document enrichment step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.postProcessingLambdaFunction">postProcessingLambdaFunction</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | Optional Lambda function for post-processing step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.processingBedrockModel">processingBedrockModel</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a></code> | Bedrock foundation model for document extraction step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.processingPrompt">processingPrompt</a></code> | <code>string</code> | Custom prompt template for document extraction. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.stepTimeouts">stepTimeouts</a></code> | <code>aws-cdk-lib.Duration</code> | Timeout for individual Step Functions tasks (classification, extraction, etc.). |

---

##### `logGroupDataProtection`<sup>Optional</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>
- *Default:* a new KMS key would be generated

Data protection related configuration.

---

##### `metricNamespace`<sup>Optional</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric namespace.

---

##### `metricServiceName`<sup>Optional</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric service name dimension.

---

##### `documentProcessingTable`<sup>Optional</sup> <a name="documentProcessingTable" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.documentProcessingTable"></a>

```typescript
public readonly documentProcessingTable: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

DynamoDB table for storing document processing metadata and workflow state.

If not provided, a new table will be created with DocumentId as partition key.

---

##### `enableObservability`<sup>Optional</sup> <a name="enableObservability" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.enableObservability"></a>

```typescript
public readonly enableObservability: boolean;
```

- *Type:* boolean
- *Default:* false

Enable logging and tracing for all supporting resource.

---

##### `encryptionKey`<sup>Optional</sup> <a name="encryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.encryptionKey"></a>

```typescript
public readonly encryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key
- *Default:* A new key would be created

KMS key to be used.

---

##### `eventbridgeBroker`<sup>Optional</sup> <a name="eventbridgeBroker" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.eventbridgeBroker"></a>

```typescript
public readonly eventbridgeBroker: EventbridgeBroker;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBroker">EventbridgeBroker</a>

Optional EventBridge broker for publishing custom events during processing.

If not provided, no custom events will be sent out.

---

##### `ingressAdapter`<sup>Optional</sup> <a name="ingressAdapter" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.ingressAdapter"></a>

```typescript
public readonly ingressAdapter: IAdapter;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a>
- *Default:* QueuedS3Adapter

Adapter that defines how the document processing workflow is triggered.

---

##### `network`<sup>Optional</sup> <a name="network" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.network"></a>

```typescript
public readonly network: Network;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.Network">Network</a>
- *Default:* resources will run outside of a VPC

Resources that can run inside a VPC will follow the provided network configuration.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* RemovalPolicy.DESTROY

Removal policy for created resources (bucket, table, queue).

---

##### `workflowTimeout`<sup>Optional</sup> <a name="workflowTimeout" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.workflowTimeout"></a>

```typescript
public readonly workflowTimeout: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* Duration.minutes(30)

Maximum execution time for the Step Functions workflow.

---

##### `aggregationPrompt`<sup>Optional</sup> <a name="aggregationPrompt" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.aggregationPrompt"></a>

```typescript
public readonly aggregationPrompt: string;
```

- *Type:* string
- *Default:* DEFAULT_AGGREGATION_PROMPT

Custom prompt template for aggregating results from multiple chunks.

Used when chunking is enabled to merge processing results from all chunks
into a single coherent result.

The prompt receives the concatenated processing results from all chunks
and should instruct the model to synthesize them into a unified output.

---

##### `chunkingConfig`<sup>Optional</sup> <a name="chunkingConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.chunkingConfig"></a>

```typescript
public readonly chunkingConfig: ChunkingConfig;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig">ChunkingConfig</a>
- *Default:* undefined (uses default configuration when enableChunking is true)

Configuration for PDF chunking behavior.

Only applies when `enableChunking` is true. Allows customization of:
- **Chunking strategy**: How documents are split (fixed-pages, token-based, or hybrid)
- **Thresholds**: When to trigger chunking based on page count or token count
- **Chunk size and overlap**: Control chunk boundaries and context preservation
- **Processing mode**: Parallel (faster) or sequential (cost-optimized)
- **Aggregation strategy**: How to combine results from multiple chunks

## Default Configuration

If not provided, uses sensible defaults optimized for most use cases:
- Strategy: `'hybrid'` (recommended - balances token and page limits)
- Page threshold: 100 pages
- Token threshold: 150,000 tokens
- Processing mode: `'parallel'`
- Max concurrency: 10
- Aggregation strategy: `'majority-vote'`

## Strategy Comparison

| Strategy | Best For | Pros | Cons |
|----------|----------|------|------|
| `hybrid` | Most documents | Balances token/page limits | Slightly more complex |
| `token-based` | Variable density | Respects model limits | Slower analysis |
| `fixed-pages` | Uniform density | Simple, fast | May exceed token limits |

> [{@link ChunkingConfig } for detailed configuration options]({@link ChunkingConfig } for detailed configuration options)

---

##### `classificationBedrockModel`<sup>Optional</sup> <a name="classificationBedrockModel" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.classificationBedrockModel"></a>

```typescript
public readonly classificationBedrockModel: BedrockModelProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a>

Bedrock foundation model for document classification step.

---

##### `classificationPrompt`<sup>Optional</sup> <a name="classificationPrompt" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.classificationPrompt"></a>

```typescript
public readonly classificationPrompt: string;
```

- *Type:* string
- *Default:* DEFAULT_CLASSIFICATION_PROMPT

Custom prompt template for document classification.

Must include placeholder for document content.

---

##### `enableChunking`<sup>Optional</sup> <a name="enableChunking" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.enableChunking"></a>

```typescript
public readonly enableChunking: boolean;
```

- *Type:* boolean
- *Default:* false

Enable PDF chunking for large documents.

When enabled, documents exceeding configured thresholds will be automatically
split into chunks, processed in parallel or sequentially, and results aggregated.

This feature is useful for:
- Processing large PDFs (>100 pages)
- Handling documents that exceed Bedrock token limits (~200K tokens)
- Improving processing reliability for complex documents
- Processing documents with variable content density

The chunking workflow:
1. Analyzes PDF to determine page count and estimate token count
2. Decides if chunking is needed based on configured thresholds
3. If chunking is needed, splits PDF into chunks and uploads to S3
4. Processes each chunk through classification and extraction
5. Aggregates results using majority voting for classification
6. Deduplicates entities across chunks
7. Cleans up temporary chunk files from S3

---

##### `enrichmentLambdaFunction`<sup>Optional</sup> <a name="enrichmentLambdaFunction" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.enrichmentLambdaFunction"></a>

```typescript
public readonly enrichmentLambdaFunction: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

Optional Lambda function for document enrichment step.

If provided, will be invoked after extraction with workflow state.

---

##### `postProcessingLambdaFunction`<sup>Optional</sup> <a name="postProcessingLambdaFunction" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.postProcessingLambdaFunction"></a>

```typescript
public readonly postProcessingLambdaFunction: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

Optional Lambda function for post-processing step.

If provided, will be invoked after enrichment with workflow state.

---

##### `processingBedrockModel`<sup>Optional</sup> <a name="processingBedrockModel" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.processingBedrockModel"></a>

```typescript
public readonly processingBedrockModel: BedrockModelProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a>

Bedrock foundation model for document extraction step.

---

##### `processingPrompt`<sup>Optional</sup> <a name="processingPrompt" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.processingPrompt"></a>

```typescript
public readonly processingPrompt: string;
```

- *Type:* string
- *Default:* DEFAULT_EXTRACTION_PROMPT

Custom prompt template for document extraction.

Must include placeholder for document content and classification result.

---

##### `stepTimeouts`<sup>Optional</sup> <a name="stepTimeouts" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.stepTimeouts"></a>

```typescript
public readonly stepTimeouts: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* Duration.minutes(5)

Timeout for individual Step Functions tasks (classification, extraction, etc.).

---

### BedrockKnowledgeBaseProps <a name="BedrockKnowledgeBaseProps" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps"></a>

Configuration for Amazon Bedrock Knowledge Base.

This interface extends the base configuration with Bedrock-specific
properties for connecting to an existing Bedrock Knowledge Base.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.Initializer"></a>

```typescript
import { BedrockKnowledgeBaseProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const bedrockKnowledgeBaseProps: BedrockKnowledgeBaseProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.description">description</a></code> | <code>string</code> | Description of what this knowledge base contains and when to use it. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.name">name</a></code> | <code>string</code> | Human-readable name/identifier for this knowledge base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.acl">acl</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration">AclConfiguration</a></code> | Access control configuration for identity-aware retrieval. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.retrieval">retrieval</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration">RetrievalConfiguration</a></code> | Retrieval configuration options. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.knowledgeBaseId">knowledgeBaseId</a></code> | <code>string</code> | Unique identifier for the Bedrock Knowledge Base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.create">create</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration">CreateKnowledgeBaseConfiguration</a></code> | Configuration for creating a new knowledge base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.guardrail">guardrail</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration">GuardrailConfiguration</a></code> | Guardrail configuration for content filtering. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.knowledgeBaseArn">knowledgeBaseArn</a></code> | <code>string</code> | ARN of the Bedrock Knowledge Base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.vectorStore">vectorStore</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration">VectorStoreConfiguration</a></code> | Vector store configuration. |

---

##### `description`<sup>Required</sup> <a name="description" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string

Description of what this knowledge base contains and when to use it.

This description is shown to the agent in its system prompt to help
it decide when to query this knowledge base. Be specific about the
type of information contained and appropriate use cases.

---

*Example*

```typescript
'Contains product documentation, user guides, and FAQs. Use when answering questions about product features or troubleshooting.'
```


##### `name`<sup>Required</sup> <a name="name" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

Human-readable name/identifier for this knowledge base.

Used for logging, display purposes, and to help the agent identify
which knowledge base to query. Should be unique within the set of
knowledge bases configured for an agent.

---

*Example*

```typescript
'product-documentation'
```


##### `acl`<sup>Optional</sup> <a name="acl" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.acl"></a>

```typescript
public readonly acl: AclConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration">AclConfiguration</a>
- *Default:* ACL disabled

Access control configuration for identity-aware retrieval.

When enabled, retrieval queries will be filtered based on user
identity context to ensure users only access permitted documents.

---

##### `retrieval`<sup>Optional</sup> <a name="retrieval" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.retrieval"></a>

```typescript
public readonly retrieval: RetrievalConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration">RetrievalConfiguration</a>
- *Default:* { numberOfResults: 5 }

Retrieval configuration options.

Controls the number of results returned and optional metadata filtering.

---

##### `knowledgeBaseId`<sup>Required</sup> <a name="knowledgeBaseId" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.knowledgeBaseId"></a>

```typescript
public readonly knowledgeBaseId: string;
```

- *Type:* string

Unique identifier for the Bedrock Knowledge Base.

This is the ID assigned by Bedrock when the knowledge base was created.
You can find this in the Bedrock console or via the AWS CLI.

Required when referencing an existing knowledge base.
Not required when using the `create` property to create a new KB.

---

##### `create`<sup>Optional</sup> <a name="create" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.create"></a>

```typescript
public readonly create: CreateKnowledgeBaseConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration">CreateKnowledgeBaseConfiguration</a>
- *Default:* Reference existing KB only (no creation)

Configuration for creating a new knowledge base.

When provided, a new Bedrock Knowledge Base will be created with
the specified data source and embedding configuration.

Note: This is an advanced feature that creates AWS resources.
For most use cases, referencing an existing knowledge base by ID
is recommended.

---

##### `guardrail`<sup>Optional</sup> <a name="guardrail" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.guardrail"></a>

```typescript
public readonly guardrail: GuardrailConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration">GuardrailConfiguration</a>
- *Default:* No guardrail applied

Guardrail configuration for content filtering.

When configured, the guardrail will be applied during retrieval
operations to filter inappropriate or sensitive content.

---

##### `knowledgeBaseArn`<sup>Optional</sup> <a name="knowledgeBaseArn" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.knowledgeBaseArn"></a>

```typescript
public readonly knowledgeBaseArn: string;
```

- *Type:* string
- *Default:* Constructed from knowledgeBaseId

ARN of the Bedrock Knowledge Base.

If not provided, the ARN will be constructed from the knowledgeBaseId
using the current region and account.

---

##### `vectorStore`<sup>Optional</sup> <a name="vectorStore" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBaseProps.property.vectorStore"></a>

```typescript
public readonly vectorStore: VectorStoreConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration">VectorStoreConfiguration</a>
- *Default:* S3 Vectors (type: 's3-vectors')

Vector store configuration.

Defines the type of vector store used by this knowledge base.
This is informational and used for generating appropriate IAM
permissions when needed.

---

### BedrockModelProps <a name="BedrockModelProps" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps"></a>

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps.Initializer"></a>

```typescript
import { BedrockModelProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const bedrockModelProps: BedrockModelProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps.property.crossRegionInferencePrefix">crossRegionInferencePrefix</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockCrossRegionInferencePrefix">BedrockCrossRegionInferencePrefix</a></code> | Prefix for cross-region inference configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps.property.fmModelId">fmModelId</a></code> | <code>aws-cdk-lib.aws_bedrock.FoundationModelIdentifier</code> | Foundation model to use. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps.property.useCrossRegionInference">useCrossRegionInference</a></code> | <code>boolean</code> | Enable cross-region inference for Bedrock models to improve availability and performance. |

---

##### `crossRegionInferencePrefix`<sup>Optional</sup> <a name="crossRegionInferencePrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps.property.crossRegionInferencePrefix"></a>

```typescript
public readonly crossRegionInferencePrefix: BedrockCrossRegionInferencePrefix;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockCrossRegionInferencePrefix">BedrockCrossRegionInferencePrefix</a>
- *Default:* BedrockCrossRegionInferencePrefix.US

Prefix for cross-region inference configuration.

Only used when useCrossRegionInference is true.

---

##### `fmModelId`<sup>Optional</sup> <a name="fmModelId" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps.property.fmModelId"></a>

```typescript
public readonly fmModelId: FoundationModelIdentifier;
```

- *Type:* aws-cdk-lib.aws_bedrock.FoundationModelIdentifier
- *Default:* FoundationModelIdentifier.ANTHROPIC_CLAUDE_SONNET_4_20250514_V1_0

Foundation model to use.

---

##### `useCrossRegionInference`<sup>Optional</sup> <a name="useCrossRegionInference" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps.property.useCrossRegionInference"></a>

```typescript
public readonly useCrossRegionInference: boolean;
```

- *Type:* boolean
- *Default:* false

Enable cross-region inference for Bedrock models to improve availability and performance.

When enabled, uses inference profiles instead of direct model invocation.

---

### ChunkClassificationResult <a name="ChunkClassificationResult" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkClassificationResult"></a>

Classification result for a chunk.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkClassificationResult.Initializer"></a>

```typescript
import { ChunkClassificationResult } from '@cdklabs/cdk-appmod-catalog-blueprints'

const chunkClassificationResult: ChunkClassificationResult = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkClassificationResult.property.documentClassification">documentClassification</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkClassificationResult.property.confidence">confidence</a></code> | <code>number</code> | *No description.* |

---

##### `documentClassification`<sup>Required</sup> <a name="documentClassification" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkClassificationResult.property.documentClassification"></a>

```typescript
public readonly documentClassification: string;
```

- *Type:* string

---

##### `confidence`<sup>Optional</sup> <a name="confidence" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkClassificationResult.property.confidence"></a>

```typescript
public readonly confidence: number;
```

- *Type:* number

---

### ChunkingConfig <a name="ChunkingConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig"></a>

Comprehensive configuration for PDF chunking behavior.

This interface provides fine-grained control over how large PDF documents are
split into manageable chunks for processing. The chunking system supports three
strategies, each optimized for different document types and use cases.

## Chunking Strategies

### 1. Hybrid Strategy (RECOMMENDED)
Balances both token count and page limits for optimal chunking. Best for most
documents as it respects model token limits while preventing excessively large chunks.

### 2. Token-Based Strategy
Splits documents based on estimated token count. Best for documents with variable
content density (e.g., mixed text and images, tables, charts).

### 3. Fixed-Pages Strategy (Legacy)
Simple page-based splitting. Fast but may exceed token limits for dense documents.
Use only for documents with uniform content density.

## Processing Modes

- **parallel**: Process multiple chunks simultaneously (faster, higher cost)
- **sequential**: Process chunks one at a time (slower, lower cost)

## Aggregation Strategies

- **majority-vote**: Most frequent classification wins (recommended)
- **weighted-vote**: Early chunks weighted higher
- **first-chunk**: Use first chunk's classification only

## Default Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| strategy | 'hybrid' | Chunking strategy |
| pageThreshold | 100 | Pages to trigger chunking |
| tokenThreshold | 150000 | Tokens to trigger chunking |
| chunkSize | 50 | Pages per chunk (fixed-pages) |
| overlapPages | 5 | Overlap pages (fixed-pages) |
| maxTokensPerChunk | 100000 | Max tokens per chunk (token-based) |
| overlapTokens | 5000 | Overlap tokens (token-based, hybrid) |
| targetTokensPerChunk | 80000 | Target tokens per chunk (hybrid) |
| maxPagesPerChunk | 99 | Max pages per chunk (hybrid) |
| processingMode | 'parallel' | Processing mode |
| maxConcurrency | 10 | Max parallel chunks |
| aggregationStrategy | 'majority-vote' | Result aggregation |
| minSuccessThreshold | 0.5 | Min success rate for valid result |

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.Initializer"></a>

```typescript
import { ChunkingConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

const chunkingConfig: ChunkingConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.aggregationStrategy">aggregationStrategy</a></code> | <code>string</code> | Strategy for aggregating results from multiple chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.chunkSize">chunkSize</a></code> | <code>number</code> | Number of pages per chunk (fixed-pages strategy). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.maxConcurrency">maxConcurrency</a></code> | <code>number</code> | Maximum number of chunks to process concurrently (parallel mode only). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.maxPagesPerChunk">maxPagesPerChunk</a></code> | <code>number</code> | Hard limit on pages per chunk (hybrid strategy). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.maxTokensPerChunk">maxTokensPerChunk</a></code> | <code>number</code> | Maximum tokens per chunk (token-based strategy). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.minSuccessThreshold">minSuccessThreshold</a></code> | <code>number</code> | Minimum percentage of chunks that must succeed for aggregation. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.overlapPages">overlapPages</a></code> | <code>number</code> | Number of overlapping pages between chunks (fixed-pages strategy). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.overlapTokens">overlapTokens</a></code> | <code>number</code> | Number of overlapping tokens between chunks (token-based and hybrid strategies). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.pageThreshold">pageThreshold</a></code> | <code>number</code> | Threshold for triggering chunking based on page count (fixed-pages strategy). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.processingMode">processingMode</a></code> | <code>string</code> | Processing mode for chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.strategy">strategy</a></code> | <code>string</code> | Chunking strategy to use. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.targetTokensPerChunk">targetTokensPerChunk</a></code> | <code>number</code> | Soft target for tokens per chunk (hybrid strategy). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.tokenThreshold">tokenThreshold</a></code> | <code>number</code> | Threshold for triggering chunking based on token count (token-based strategy). |

---

##### `aggregationStrategy`<sup>Optional</sup> <a name="aggregationStrategy" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.aggregationStrategy"></a>

```typescript
public readonly aggregationStrategy: string;
```

- *Type:* string
- *Default:* 'majority-vote'

Strategy for aggregating results from multiple chunks.

**majority-vote**: Most frequent classification wins
- **weighted-vote**: Early chunks weighted higher
- **first-chunk**: Use first chunk's classification

---

##### `chunkSize`<sup>Optional</sup> <a name="chunkSize" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.chunkSize"></a>

```typescript
public readonly chunkSize: number;
```

- *Type:* number
- *Default:* 50

Number of pages per chunk (fixed-pages strategy).

---

##### `maxConcurrency`<sup>Optional</sup> <a name="maxConcurrency" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.maxConcurrency"></a>

```typescript
public readonly maxConcurrency: number;
```

- *Type:* number
- *Default:* 10

Maximum number of chunks to process concurrently (parallel mode only).

Higher values increase speed but also cost.

---

##### `maxPagesPerChunk`<sup>Optional</sup> <a name="maxPagesPerChunk" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.maxPagesPerChunk"></a>

```typescript
public readonly maxPagesPerChunk: number;
```

- *Type:* number
- *Default:* 99

Hard limit on pages per chunk (hybrid strategy).

Note: Bedrock has a hard limit of 100 pages per PDF, so we default to 99
to provide a safety margin.

---

##### `maxTokensPerChunk`<sup>Optional</sup> <a name="maxTokensPerChunk" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.maxTokensPerChunk"></a>

```typescript
public readonly maxTokensPerChunk: number;
```

- *Type:* number
- *Default:* 100000

Maximum tokens per chunk (token-based strategy).

---

##### `minSuccessThreshold`<sup>Optional</sup> <a name="minSuccessThreshold" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.minSuccessThreshold"></a>

```typescript
public readonly minSuccessThreshold: number;
```

- *Type:* number
- *Default:* 0.5 (50%)

Minimum percentage of chunks that must succeed for aggregation.

If fewer chunks succeed, the result is marked as partial failure.

---

##### `overlapPages`<sup>Optional</sup> <a name="overlapPages" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.overlapPages"></a>

```typescript
public readonly overlapPages: number;
```

- *Type:* number
- *Default:* 5

Number of overlapping pages between chunks (fixed-pages strategy).

---

##### `overlapTokens`<sup>Optional</sup> <a name="overlapTokens" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.overlapTokens"></a>

```typescript
public readonly overlapTokens: number;
```

- *Type:* number
- *Default:* 5000

Number of overlapping tokens between chunks (token-based and hybrid strategies).

---

##### `pageThreshold`<sup>Optional</sup> <a name="pageThreshold" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.pageThreshold"></a>

```typescript
public readonly pageThreshold: number;
```

- *Type:* number
- *Default:* 100

Threshold for triggering chunking based on page count (fixed-pages strategy).

---

##### `processingMode`<sup>Optional</sup> <a name="processingMode" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.processingMode"></a>

```typescript
public readonly processingMode: string;
```

- *Type:* string
- *Default:* 'parallel'

Processing mode for chunks.

**parallel**: Process multiple chunks simultaneously (faster, higher cost)
- **sequential**: Process chunks one at a time (slower, lower cost)

---

##### `strategy`<sup>Optional</sup> <a name="strategy" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.strategy"></a>

```typescript
public readonly strategy: string;
```

- *Type:* string
- *Default:* 'hybrid'

Chunking strategy to use.

**hybrid** (RECOMMENDED): Balances token count and page limits
- **token-based**: Respects model token limits, good for variable density
- **fixed-pages**: Simple page-based splitting (legacy, not recommended)

---

##### `targetTokensPerChunk`<sup>Optional</sup> <a name="targetTokensPerChunk" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.targetTokensPerChunk"></a>

```typescript
public readonly targetTokensPerChunk: number;
```

- *Type:* number
- *Default:* 80000

Soft target for tokens per chunk (hybrid strategy).

---

##### `tokenThreshold`<sup>Optional</sup> <a name="tokenThreshold" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig.property.tokenThreshold"></a>

```typescript
public readonly tokenThreshold: number;
```

- *Type:* number
- *Default:* 150000

Threshold for triggering chunking based on token count (token-based strategy).

---

### ChunkingConfigUsed <a name="ChunkingConfigUsed" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed"></a>

Chunking configuration used for processing.

Includes both user-provided and default values.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.Initializer"></a>

```typescript
import { ChunkingConfigUsed } from '@cdklabs/cdk-appmod-catalog-blueprints'

const chunkingConfigUsed: ChunkingConfigUsed = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.strategy">strategy</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.totalPages">totalPages</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.totalTokens">totalTokens</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.chunkSize">chunkSize</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.maxPagesPerChunk">maxPagesPerChunk</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.maxTokensPerChunk">maxTokensPerChunk</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.overlapPages">overlapPages</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.overlapTokens">overlapTokens</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.processingMode">processingMode</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.targetTokensPerChunk">targetTokensPerChunk</a></code> | <code>number</code> | *No description.* |

---

##### `strategy`<sup>Required</sup> <a name="strategy" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.strategy"></a>

```typescript
public readonly strategy: string;
```

- *Type:* string

---

##### `totalPages`<sup>Required</sup> <a name="totalPages" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.totalPages"></a>

```typescript
public readonly totalPages: number;
```

- *Type:* number

---

##### `totalTokens`<sup>Required</sup> <a name="totalTokens" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.totalTokens"></a>

```typescript
public readonly totalTokens: number;
```

- *Type:* number

---

##### `chunkSize`<sup>Optional</sup> <a name="chunkSize" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.chunkSize"></a>

```typescript
public readonly chunkSize: number;
```

- *Type:* number

---

##### `maxPagesPerChunk`<sup>Optional</sup> <a name="maxPagesPerChunk" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.maxPagesPerChunk"></a>

```typescript
public readonly maxPagesPerChunk: number;
```

- *Type:* number

---

##### `maxTokensPerChunk`<sup>Optional</sup> <a name="maxTokensPerChunk" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.maxTokensPerChunk"></a>

```typescript
public readonly maxTokensPerChunk: number;
```

- *Type:* number

---

##### `overlapPages`<sup>Optional</sup> <a name="overlapPages" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.overlapPages"></a>

```typescript
public readonly overlapPages: number;
```

- *Type:* number

---

##### `overlapTokens`<sup>Optional</sup> <a name="overlapTokens" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.overlapTokens"></a>

```typescript
public readonly overlapTokens: number;
```

- *Type:* number

---

##### `processingMode`<sup>Optional</sup> <a name="processingMode" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.processingMode"></a>

```typescript
public readonly processingMode: string;
```

- *Type:* string

---

##### `targetTokensPerChunk`<sup>Optional</sup> <a name="targetTokensPerChunk" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed.property.targetTokensPerChunk"></a>

```typescript
public readonly targetTokensPerChunk: number;
```

- *Type:* number

---

### ChunkingRequest <a name="ChunkingRequest" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest"></a>

Request payload for PDF analysis and chunking Lambda.

Contains document information and chunking configuration.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest.Initializer"></a>

```typescript
import { ChunkingRequest } from '@cdklabs/cdk-appmod-catalog-blueprints'

const chunkingRequest: ChunkingRequest = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest.property.content">content</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent">DocumentContent</a></code> | Document content location information. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest.property.contentType">contentType</a></code> | <code>string</code> | Content type of the document. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest.property.documentId">documentId</a></code> | <code>string</code> | Unique identifier for the document. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest.property.config">config</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig">ChunkingConfig</a></code> | Optional chunking configuration. |

---

##### `content`<sup>Required</sup> <a name="content" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest.property.content"></a>

```typescript
public readonly content: DocumentContent;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent">DocumentContent</a>

Document content location information.

---

##### `contentType`<sup>Required</sup> <a name="contentType" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest.property.contentType"></a>

```typescript
public readonly contentType: string;
```

- *Type:* string

Content type of the document.

Typically 'file' for S3-based documents.

---

##### `documentId`<sup>Required</sup> <a name="documentId" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest.property.documentId"></a>

```typescript
public readonly documentId: string;
```

- *Type:* string

Unique identifier for the document.

---

##### `config`<sup>Optional</sup> <a name="config" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingRequest.property.config"></a>

```typescript
public readonly config: ChunkingConfig;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfig">ChunkingConfig</a>

Optional chunking configuration.

If not provided, uses default configuration.

---

### ChunkingResponse <a name="ChunkingResponse" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse"></a>

Response when chunking IS required.

Document exceeds thresholds and has been split into chunks.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.Initializer"></a>

```typescript
import { ChunkingResponse } from '@cdklabs/cdk-appmod-catalog-blueprints'

const chunkingResponse: ChunkingResponse = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.chunks">chunks</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata">ChunkMetadata</a>[]</code> | Array of chunk metadata for all created chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.config">config</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed">ChunkingConfigUsed</a></code> | Configuration used for chunking. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.documentId">documentId</a></code> | <code>string</code> | Document identifier. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.requiresChunking">requiresChunking</a></code> | <code>boolean</code> | Indicates chunking is required. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.strategy">strategy</a></code> | <code>string</code> | Strategy used for chunking. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.tokenAnalysis">tokenAnalysis</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis">TokenAnalysis</a></code> | Token analysis results with detailed per-page information. |

---

##### `chunks`<sup>Required</sup> <a name="chunks" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.chunks"></a>

```typescript
public readonly chunks: ChunkMetadata[];
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata">ChunkMetadata</a>[]

Array of chunk metadata for all created chunks.

---

##### `config`<sup>Required</sup> <a name="config" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.config"></a>

```typescript
public readonly config: ChunkingConfigUsed;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkingConfigUsed">ChunkingConfigUsed</a>

Configuration used for chunking.

Includes both user-provided and default values.

---

##### `documentId`<sup>Required</sup> <a name="documentId" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.documentId"></a>

```typescript
public readonly documentId: string;
```

- *Type:* string

Document identifier.

---

##### `requiresChunking`<sup>Required</sup> <a name="requiresChunking" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.requiresChunking"></a>

```typescript
public readonly requiresChunking: boolean;
```

- *Type:* boolean

Indicates chunking is required.

---

##### `strategy`<sup>Required</sup> <a name="strategy" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.strategy"></a>

```typescript
public readonly strategy: string;
```

- *Type:* string

Strategy used for chunking.

---

##### `tokenAnalysis`<sup>Required</sup> <a name="tokenAnalysis" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkingResponse.property.tokenAnalysis"></a>

```typescript
public readonly tokenAnalysis: TokenAnalysis;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis">TokenAnalysis</a>

Token analysis results with detailed per-page information.

---

### ChunkMetadata <a name="ChunkMetadata" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata"></a>

Metadata about a single chunk of a document.

Contains information about the chunk's position, size, and S3 location.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.Initializer"></a>

```typescript
import { ChunkMetadata } from '@cdklabs/cdk-appmod-catalog-blueprints'

const chunkMetadata: ChunkMetadata = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.bucket">bucket</a></code> | <code>string</code> | S3 bucket containing the chunk file. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.chunkId">chunkId</a></code> | <code>string</code> | Unique identifier for this chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.chunkIndex">chunkIndex</a></code> | <code>number</code> | Zero-based index of this chunk in the document. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.endPage">endPage</a></code> | <code>number</code> | Ending page number (zero-based, inclusive) of this chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.estimatedTokens">estimatedTokens</a></code> | <code>number</code> | Estimated token count for this chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.key">key</a></code> | <code>string</code> | S3 key for the chunk file. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.pageCount">pageCount</a></code> | <code>number</code> | Number of pages in this chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.startPage">startPage</a></code> | <code>number</code> | Starting page number (zero-based) of this chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.totalChunks">totalChunks</a></code> | <code>number</code> | Total number of chunks in the document. |

---

##### `bucket`<sup>Required</sup> <a name="bucket" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.bucket"></a>

```typescript
public readonly bucket: string;
```

- *Type:* string

S3 bucket containing the chunk file.

---

##### `chunkId`<sup>Required</sup> <a name="chunkId" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.chunkId"></a>

```typescript
public readonly chunkId: string;
```

- *Type:* string

Unique identifier for this chunk.

Format: {documentId}_chunk_{index}

---

##### `chunkIndex`<sup>Required</sup> <a name="chunkIndex" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.chunkIndex"></a>

```typescript
public readonly chunkIndex: number;
```

- *Type:* number

Zero-based index of this chunk in the document.

---

##### `endPage`<sup>Required</sup> <a name="endPage" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.endPage"></a>

```typescript
public readonly endPage: number;
```

- *Type:* number

Ending page number (zero-based, inclusive) of this chunk.

---

##### `estimatedTokens`<sup>Required</sup> <a name="estimatedTokens" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.estimatedTokens"></a>

```typescript
public readonly estimatedTokens: number;
```

- *Type:* number

Estimated token count for this chunk.

Based on word-count heuristic (1.3 tokens per word).

---

##### `key`<sup>Required</sup> <a name="key" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.key"></a>

```typescript
public readonly key: string;
```

- *Type:* string

S3 key for the chunk file.

Typically in chunks/ prefix.

---

##### `pageCount`<sup>Required</sup> <a name="pageCount" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.pageCount"></a>

```typescript
public readonly pageCount: number;
```

- *Type:* number

Number of pages in this chunk.

---

##### `startPage`<sup>Required</sup> <a name="startPage" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.startPage"></a>

```typescript
public readonly startPage: number;
```

- *Type:* number

Starting page number (zero-based) of this chunk.

---

##### `totalChunks`<sup>Required</sup> <a name="totalChunks" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata.property.totalChunks"></a>

```typescript
public readonly totalChunks: number;
```

- *Type:* number

Total number of chunks in the document.

---

### ChunkProcessingResult <a name="ChunkProcessingResult" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkProcessingResult"></a>

Processing result for a chunk.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkProcessingResult.Initializer"></a>

```typescript
import { ChunkProcessingResult } from '@cdklabs/cdk-appmod-catalog-blueprints'

const chunkProcessingResult: ChunkProcessingResult = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkProcessingResult.property.entities">entities</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Entity">Entity</a>[]</code> | *No description.* |

---

##### `entities`<sup>Required</sup> <a name="entities" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkProcessingResult.property.entities"></a>

```typescript
public readonly entities: Entity[];
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.Entity">Entity</a>[]

---

### ChunkResult <a name="ChunkResult" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult"></a>

Result from processing a single chunk.

Contains classification and extraction results, or error information.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.Initializer"></a>

```typescript
import { ChunkResult } from '@cdklabs/cdk-appmod-catalog-blueprints'

const chunkResult: ChunkResult = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.chunkId">chunkId</a></code> | <code>string</code> | Chunk identifier. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.chunkIndex">chunkIndex</a></code> | <code>number</code> | Zero-based chunk index. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.classificationResult">classificationResult</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkClassificationResult">ChunkClassificationResult</a></code> | Optional classification result for this chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.error">error</a></code> | <code>string</code> | Error message if chunk processing failed. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.processingResult">processingResult</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkProcessingResult">ChunkProcessingResult</a></code> | Optional extraction result for this chunk. |

---

##### `chunkId`<sup>Required</sup> <a name="chunkId" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.chunkId"></a>

```typescript
public readonly chunkId: string;
```

- *Type:* string

Chunk identifier.

---

##### `chunkIndex`<sup>Required</sup> <a name="chunkIndex" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.chunkIndex"></a>

```typescript
public readonly chunkIndex: number;
```

- *Type:* number

Zero-based chunk index.

---

##### `classificationResult`<sup>Optional</sup> <a name="classificationResult" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.classificationResult"></a>

```typescript
public readonly classificationResult: ChunkClassificationResult;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkClassificationResult">ChunkClassificationResult</a>

Optional classification result for this chunk.

---

##### `error`<sup>Optional</sup> <a name="error" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.error"></a>

```typescript
public readonly error: string;
```

- *Type:* string

Error message if chunk processing failed.

---

##### `processingResult`<sup>Optional</sup> <a name="processingResult" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunkResult.property.processingResult"></a>

```typescript
public readonly processingResult: ChunkProcessingResult;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkProcessingResult">ChunkProcessingResult</a>

Optional extraction result for this chunk.

---

### ChunksSummary <a name="ChunksSummary" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary"></a>

Summary of chunk processing results.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary.Initializer"></a>

```typescript
import { ChunksSummary } from '@cdklabs/cdk-appmod-catalog-blueprints'

const chunksSummary: ChunksSummary = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary.property.failedChunks">failedChunks</a></code> | <code>number</code> | Number of chunks that failed processing. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary.property.successfulChunks">successfulChunks</a></code> | <code>number</code> | Number of chunks that processed successfully. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary.property.totalChunks">totalChunks</a></code> | <code>number</code> | Total number of chunks created. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary.property.totalTokensProcessed">totalTokensProcessed</a></code> | <code>number</code> | Optional total tokens processed across all chunks. |

---

##### `failedChunks`<sup>Required</sup> <a name="failedChunks" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary.property.failedChunks"></a>

```typescript
public readonly failedChunks: number;
```

- *Type:* number

Number of chunks that failed processing.

---

##### `successfulChunks`<sup>Required</sup> <a name="successfulChunks" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary.property.successfulChunks"></a>

```typescript
public readonly successfulChunks: number;
```

- *Type:* number

Number of chunks that processed successfully.

---

##### `totalChunks`<sup>Required</sup> <a name="totalChunks" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary.property.totalChunks"></a>

```typescript
public readonly totalChunks: number;
```

- *Type:* number

Total number of chunks created.

---

##### `totalTokensProcessed`<sup>Optional</sup> <a name="totalTokensProcessed" id="@cdklabs/cdk-appmod-catalog-blueprints.ChunksSummary.property.totalTokensProcessed"></a>

```typescript
public readonly totalTokensProcessed: number;
```

- *Type:* number

Optional total tokens processed across all chunks.

---

### CleanupRequest <a name="CleanupRequest" id="@cdklabs/cdk-appmod-catalog-blueprints.CleanupRequest"></a>

Request payload for cleanup Lambda.

Contains information about chunks to delete.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.CleanupRequest.Initializer"></a>

```typescript
import { CleanupRequest } from '@cdklabs/cdk-appmod-catalog-blueprints'

const cleanupRequest: CleanupRequest = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CleanupRequest.property.chunks">chunks</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata">ChunkMetadata</a>[]</code> | Array of chunk metadata for chunks to delete. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CleanupRequest.property.documentId">documentId</a></code> | <code>string</code> | Document identifier. |

---

##### `chunks`<sup>Required</sup> <a name="chunks" id="@cdklabs/cdk-appmod-catalog-blueprints.CleanupRequest.property.chunks"></a>

```typescript
public readonly chunks: ChunkMetadata[];
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.ChunkMetadata">ChunkMetadata</a>[]

Array of chunk metadata for chunks to delete.

---

##### `documentId`<sup>Required</sup> <a name="documentId" id="@cdklabs/cdk-appmod-catalog-blueprints.CleanupRequest.property.documentId"></a>

```typescript
public readonly documentId: string;
```

- *Type:* string

Document identifier.

---

### CleanupResponse <a name="CleanupResponse" id="@cdklabs/cdk-appmod-catalog-blueprints.CleanupResponse"></a>

Response from cleanup Lambda.

Reports success and any errors encountered.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.CleanupResponse.Initializer"></a>

```typescript
import { CleanupResponse } from '@cdklabs/cdk-appmod-catalog-blueprints'

const cleanupResponse: CleanupResponse = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CleanupResponse.property.deletedChunks">deletedChunks</a></code> | <code>number</code> | Number of chunks successfully deleted. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CleanupResponse.property.documentId">documentId</a></code> | <code>string</code> | Document identifier. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CleanupResponse.property.errors">errors</a></code> | <code>string[]</code> | Array of error messages for failed deletions. |

---

##### `deletedChunks`<sup>Required</sup> <a name="deletedChunks" id="@cdklabs/cdk-appmod-catalog-blueprints.CleanupResponse.property.deletedChunks"></a>

```typescript
public readonly deletedChunks: number;
```

- *Type:* number

Number of chunks successfully deleted.

---

##### `documentId`<sup>Required</sup> <a name="documentId" id="@cdklabs/cdk-appmod-catalog-blueprints.CleanupResponse.property.documentId"></a>

```typescript
public readonly documentId: string;
```

- *Type:* string

Document identifier.

---

##### `errors`<sup>Required</sup> <a name="errors" id="@cdklabs/cdk-appmod-catalog-blueprints.CleanupResponse.property.errors"></a>

```typescript
public readonly errors: string[];
```

- *Type:* string[]

Array of error messages for failed deletions.

Empty if all deletions succeeded.

---

### CreateKnowledgeBaseConfiguration <a name="CreateKnowledgeBaseConfiguration" id="@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration"></a>

Configuration for creating a new Bedrock Knowledge Base.

When provided to BedrockKnowledgeBase, a new knowledge base will be
created with the specified data source and embedding configuration.

Note: This is an advanced feature. For most use cases, referencing
an existing knowledge base by ID is recommended.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.Initializer"></a>

```typescript
import { CreateKnowledgeBaseConfiguration } from '@cdklabs/cdk-appmod-catalog-blueprints'

const createKnowledgeBaseConfiguration: CreateKnowledgeBaseConfiguration = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.dataSourceBucketName">dataSourceBucketName</a></code> | <code>string</code> | S3 bucket name containing source documents. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.chunkingStrategy">chunkingStrategy</a></code> | <code>string</code> | Chunking strategy for document processing. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.dataSourcePrefix">dataSourcePrefix</a></code> | <code>string</code> | S3 prefix for source documents within the bucket. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.embeddingModelId">embeddingModelId</a></code> | <code>string</code> | Embedding model to use for vectorization. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.maxTokens">maxTokens</a></code> | <code>number</code> | Maximum chunk size in tokens (for fixed-size chunking). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.overlapTokens">overlapTokens</a></code> | <code>number</code> | Overlap between chunks in tokens (for fixed-size chunking). |

---

##### `dataSourceBucketName`<sup>Required</sup> <a name="dataSourceBucketName" id="@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.dataSourceBucketName"></a>

```typescript
public readonly dataSourceBucketName: string;
```

- *Type:* string

S3 bucket name containing source documents.

The bucket must exist and contain the documents to be indexed.

---

##### `chunkingStrategy`<sup>Optional</sup> <a name="chunkingStrategy" id="@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.chunkingStrategy"></a>

```typescript
public readonly chunkingStrategy: string;
```

- *Type:* string
- *Default:* 'fixed-size'

Chunking strategy for document processing.

'fixed-size': Split documents into fixed-size chunks
- 'semantic': Use semantic boundaries for chunking
- 'none': No chunking (use entire documents)

---

##### `dataSourcePrefix`<sup>Optional</sup> <a name="dataSourcePrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.dataSourcePrefix"></a>

```typescript
public readonly dataSourcePrefix: string;
```

- *Type:* string
- *Default:* Root of bucket (all documents)

S3 prefix for source documents within the bucket.

Only documents under this prefix will be indexed.

---

##### `embeddingModelId`<sup>Optional</sup> <a name="embeddingModelId" id="@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.embeddingModelId"></a>

```typescript
public readonly embeddingModelId: string;
```

- *Type:* string
- *Default:* 'amazon.titan-embed-text-v2:0'

Embedding model to use for vectorization.

Must be a valid Bedrock embedding model ID.

---

##### `maxTokens`<sup>Optional</sup> <a name="maxTokens" id="@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.maxTokens"></a>

```typescript
public readonly maxTokens: number;
```

- *Type:* number
- *Default:* 300

Maximum chunk size in tokens (for fixed-size chunking).

Only used when chunkingStrategy is 'fixed-size'.

---

##### `overlapTokens`<sup>Optional</sup> <a name="overlapTokens" id="@cdklabs/cdk-appmod-catalog-blueprints.CreateKnowledgeBaseConfiguration.property.overlapTokens"></a>

```typescript
public readonly overlapTokens: number;
```

- *Type:* number
- *Default:* 20

Overlap between chunks in tokens (for fixed-size chunking).

Only used when chunkingStrategy is 'fixed-size'.

---

### CustomDomainConfig <a name="CustomDomainConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig"></a>

Custom domain configuration for the frontend.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig.Initializer"></a>

```typescript
import { CustomDomainConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

const customDomainConfig: CustomDomainConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig.property.certificate">certificate</a></code> | <code>aws-cdk-lib.aws_certificatemanager.ICertificate</code> | SSL certificate for the domain (required when domainName is provided). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig.property.domainName">domainName</a></code> | <code>string</code> | Domain name for the frontend (e.g., 'app.example.com'). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig.property.hostedZone">hostedZone</a></code> | <code>aws-cdk-lib.aws_route53.IHostedZone</code> | Optional hosted zone for automatic DNS record creation. |

---

##### `certificate`<sup>Required</sup> <a name="certificate" id="@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig.property.certificate"></a>

```typescript
public readonly certificate: ICertificate;
```

- *Type:* aws-cdk-lib.aws_certificatemanager.ICertificate

SSL certificate for the domain (required when domainName is provided).

---

##### `domainName`<sup>Required</sup> <a name="domainName" id="@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig.property.domainName"></a>

```typescript
public readonly domainName: string;
```

- *Type:* string

Domain name for the frontend (e.g., 'app.example.com').

---

##### `hostedZone`<sup>Optional</sup> <a name="hostedZone" id="@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig.property.hostedZone"></a>

```typescript
public readonly hostedZone: IHostedZone;
```

- *Type:* aws-cdk-lib.aws_route53.IHostedZone

Optional hosted zone for automatic DNS record creation.

---

### DatabaseConfig <a name="DatabaseConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig"></a>

Database connection configuration.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.Initializer"></a>

```typescript
import { DatabaseConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

const databaseConfig: DatabaseConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.databaseName">databaseName</a></code> | <code>string</code> | Database name to connect to. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.engine">engine</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseEngine">DatabaseEngine</a></code> | Database engine type. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.secret">secret</a></code> | <code>aws-cdk-lib.aws_secretsmanager.ISecret</code> | Database credentials secret. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.securityGroup">securityGroup</a></code> | <code>aws-cdk-lib.aws_ec2.ISecurityGroup</code> | Security group for database access. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | VPC where the database is located. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.cluster">cluster</a></code> | <code>aws-cdk-lib.aws_rds.IDatabaseCluster</code> | Database cluster (for Aurora). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.instance">instance</a></code> | <code>aws-cdk-lib.aws_rds.IDatabaseInstance</code> | Database instance (for RDS). |

---

##### `databaseName`<sup>Required</sup> <a name="databaseName" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.databaseName"></a>

```typescript
public readonly databaseName: string;
```

- *Type:* string

Database name to connect to.

---

##### `engine`<sup>Required</sup> <a name="engine" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.engine"></a>

```typescript
public readonly engine: DatabaseEngine;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseEngine">DatabaseEngine</a>

Database engine type.

---

##### `secret`<sup>Required</sup> <a name="secret" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.secret"></a>

```typescript
public readonly secret: ISecret;
```

- *Type:* aws-cdk-lib.aws_secretsmanager.ISecret

Database credentials secret.

---

##### `securityGroup`<sup>Required</sup> <a name="securityGroup" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.securityGroup"></a>

```typescript
public readonly securityGroup: ISecurityGroup;
```

- *Type:* aws-cdk-lib.aws_ec2.ISecurityGroup

Security group for database access.

---

##### `vpc`<sup>Required</sup> <a name="vpc" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

VPC where the database is located.

---

##### `cluster`<sup>Optional</sup> <a name="cluster" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.cluster"></a>

```typescript
public readonly cluster: IDatabaseCluster;
```

- *Type:* aws-cdk-lib.aws_rds.IDatabaseCluster

Database cluster (for Aurora).

---

##### `instance`<sup>Optional</sup> <a name="instance" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig.property.instance"></a>

```typescript
public readonly instance: IDatabaseInstance;
```

- *Type:* aws-cdk-lib.aws_rds.IDatabaseInstance

Database instance (for RDS).

---

### DataLoaderProps <a name="DataLoaderProps" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps"></a>

Properties for the DataLoader construct.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.Initializer"></a>

```typescript
import { DataLoaderProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const dataLoaderProps: DataLoaderProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.databaseConfig">databaseConfig</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig">DatabaseConfig</a></code> | Database configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.fileInputs">fileInputs</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileInput">FileInput</a>[]</code> | List of files to load. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.memorySize">memorySize</a></code> | <code>number</code> | Optional memory size for Lambda function (defaults to 1024 MB). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | Optional removal policy for resources (defaults to DESTROY). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.timeout">timeout</a></code> | <code>aws-cdk-lib.Duration</code> | Optional timeout for Lambda function (defaults to 15 minutes). |

---

##### `databaseConfig`<sup>Required</sup> <a name="databaseConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.databaseConfig"></a>

```typescript
public readonly databaseConfig: DatabaseConfig;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseConfig">DatabaseConfig</a>

Database configuration.

---

##### `fileInputs`<sup>Required</sup> <a name="fileInputs" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.fileInputs"></a>

```typescript
public readonly fileInputs: FileInput[];
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileInput">FileInput</a>[]

List of files to load.

---

##### `memorySize`<sup>Optional</sup> <a name="memorySize" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.memorySize"></a>

```typescript
public readonly memorySize: number;
```

- *Type:* number

Optional memory size for Lambda function (defaults to 1024 MB).

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy

Optional removal policy for resources (defaults to DESTROY).

---

##### `timeout`<sup>Optional</sup> <a name="timeout" id="@cdklabs/cdk-appmod-catalog-blueprints.DataLoaderProps.property.timeout"></a>

```typescript
public readonly timeout: Duration;
```

- *Type:* aws-cdk-lib.Duration

Optional timeout for Lambda function (defaults to 15 minutes).

---

### DocumentContent <a name="DocumentContent" id="@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent"></a>

Document content location information.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent.Initializer"></a>

```typescript
import { DocumentContent } from '@cdklabs/cdk-appmod-catalog-blueprints'

const documentContent: DocumentContent = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent.property.bucket">bucket</a></code> | <code>string</code> | S3 bucket containing the document. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent.property.filename">filename</a></code> | <code>string</code> | Original filename of the document. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent.property.key">key</a></code> | <code>string</code> | S3 key for the document. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent.property.location">location</a></code> | <code>string</code> | Storage location type (e.g., 's3'). |

---

##### `bucket`<sup>Required</sup> <a name="bucket" id="@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent.property.bucket"></a>

```typescript
public readonly bucket: string;
```

- *Type:* string

S3 bucket containing the document.

---

##### `filename`<sup>Required</sup> <a name="filename" id="@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent.property.filename"></a>

```typescript
public readonly filename: string;
```

- *Type:* string

Original filename of the document.

---

##### `key`<sup>Required</sup> <a name="key" id="@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent.property.key"></a>

```typescript
public readonly key: string;
```

- *Type:* string

S3 key for the document.

---

##### `location`<sup>Required</sup> <a name="location" id="@cdklabs/cdk-appmod-catalog-blueprints.DocumentContent.property.location"></a>

```typescript
public readonly location: string;
```

- *Type:* string

Storage location type (e.g., 's3').

---

### Entity <a name="Entity" id="@cdklabs/cdk-appmod-catalog-blueprints.Entity"></a>

Extracted entity from document processing.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.Entity.Initializer"></a>

```typescript
import { Entity } from '@cdklabs/cdk-appmod-catalog-blueprints'

const entity: Entity = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Entity.property.type">type</a></code> | <code>string</code> | Type of entity (e.g., 'NAME', 'DATE', 'AMOUNT', 'ADDRESS'). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Entity.property.value">value</a></code> | <code>string</code> | Value of the entity. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Entity.property.chunkIndex">chunkIndex</a></code> | <code>number</code> | Optional chunk index where entity was found. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.Entity.property.page">page</a></code> | <code>number</code> | Optional page number where entity was found. |

---

##### `type`<sup>Required</sup> <a name="type" id="@cdklabs/cdk-appmod-catalog-blueprints.Entity.property.type"></a>

```typescript
public readonly type: string;
```

- *Type:* string

Type of entity (e.g., 'NAME', 'DATE', 'AMOUNT', 'ADDRESS').

---

##### `value`<sup>Required</sup> <a name="value" id="@cdklabs/cdk-appmod-catalog-blueprints.Entity.property.value"></a>

```typescript
public readonly value: string;
```

- *Type:* string

Value of the entity.

---

##### `chunkIndex`<sup>Optional</sup> <a name="chunkIndex" id="@cdklabs/cdk-appmod-catalog-blueprints.Entity.property.chunkIndex"></a>

```typescript
public readonly chunkIndex: number;
```

- *Type:* number

Optional chunk index where entity was found.

---

##### `page`<sup>Optional</sup> <a name="page" id="@cdklabs/cdk-appmod-catalog-blueprints.Entity.property.page"></a>

```typescript
public readonly page: number;
```

- *Type:* number

Optional page number where entity was found.

Entities with page numbers are preserved even if duplicated.

---

### EventbridgeBrokerProps <a name="EventbridgeBrokerProps" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps"></a>

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps.Initializer"></a>

```typescript
import { EventbridgeBrokerProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const eventbridgeBrokerProps: EventbridgeBrokerProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps.property.eventSource">eventSource</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps.property.kmsKey">kmsKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps.property.name">name</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | *No description.* |

---

##### `eventSource`<sup>Required</sup> <a name="eventSource" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps.property.eventSource"></a>

```typescript
public readonly eventSource: string;
```

- *Type:* string

---

##### `kmsKey`<sup>Optional</sup> <a name="kmsKey" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps.property.kmsKey"></a>

```typescript
public readonly kmsKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key

---

##### `name`<sup>Optional</sup> <a name="name" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@cdklabs/cdk-appmod-catalog-blueprints.EventbridgeBrokerProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy

---

### FileInput <a name="FileInput" id="@cdklabs/cdk-appmod-catalog-blueprints.FileInput"></a>

File input configuration.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.FileInput.Initializer"></a>

```typescript
import { FileInput } from '@cdklabs/cdk-appmod-catalog-blueprints'

const fileInput: FileInput = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileInput.property.filePath">filePath</a></code> | <code>string</code> | Path to the file (local path or S3 URI). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileInput.property.fileType">fileType</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileType">FileType</a></code> | Type of file. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileInput.property.continueOnError">continueOnError</a></code> | <code>boolean</code> | Whether to continue on error. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileInput.property.executionOrder">executionOrder</a></code> | <code>number</code> | Execution order (lower numbers execute first). |

---

##### `filePath`<sup>Required</sup> <a name="filePath" id="@cdklabs/cdk-appmod-catalog-blueprints.FileInput.property.filePath"></a>

```typescript
public readonly filePath: string;
```

- *Type:* string

Path to the file (local path or S3 URI).

---

##### `fileType`<sup>Required</sup> <a name="fileType" id="@cdklabs/cdk-appmod-catalog-blueprints.FileInput.property.fileType"></a>

```typescript
public readonly fileType: FileType;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileType">FileType</a>

Type of file.

---

##### `continueOnError`<sup>Optional</sup> <a name="continueOnError" id="@cdklabs/cdk-appmod-catalog-blueprints.FileInput.property.continueOnError"></a>

```typescript
public readonly continueOnError: boolean;
```

- *Type:* boolean

Whether to continue on error.

---

##### `executionOrder`<sup>Optional</sup> <a name="executionOrder" id="@cdklabs/cdk-appmod-catalog-blueprints.FileInput.property.executionOrder"></a>

```typescript
public readonly executionOrder: number;
```

- *Type:* number

Execution order (lower numbers execute first).

---

### FixedPagesConfig <a name="FixedPagesConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.FixedPagesConfig"></a>

Configuration for fixed-pages chunking strategy.

Splits documents by fixed page count (legacy approach).

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.FixedPagesConfig.Initializer"></a>

```typescript
import { FixedPagesConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

const fixedPagesConfig: FixedPagesConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FixedPagesConfig.property.chunkSize">chunkSize</a></code> | <code>number</code> | Number of pages per chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FixedPagesConfig.property.overlapPages">overlapPages</a></code> | <code>number</code> | Number of overlapping pages between consecutive chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FixedPagesConfig.property.pageThreshold">pageThreshold</a></code> | <code>number</code> | Threshold for triggering chunking based on page count. |

---

##### `chunkSize`<sup>Optional</sup> <a name="chunkSize" id="@cdklabs/cdk-appmod-catalog-blueprints.FixedPagesConfig.property.chunkSize"></a>

```typescript
public readonly chunkSize: number;
```

- *Type:* number
- *Default:* 50

Number of pages per chunk.

---

##### `overlapPages`<sup>Optional</sup> <a name="overlapPages" id="@cdklabs/cdk-appmod-catalog-blueprints.FixedPagesConfig.property.overlapPages"></a>

```typescript
public readonly overlapPages: number;
```

- *Type:* number
- *Default:* 5

Number of overlapping pages between consecutive chunks.

Must be less than chunkSize.

---

##### `pageThreshold`<sup>Optional</sup> <a name="pageThreshold" id="@cdklabs/cdk-appmod-catalog-blueprints.FixedPagesConfig.property.pageThreshold"></a>

```typescript
public readonly pageThreshold: number;
```

- *Type:* number
- *Default:* 100

Threshold for triggering chunking based on page count.

Documents with pages > threshold will be chunked.

---

### FrontendProps <a name="FrontendProps" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps"></a>

Properties for the Frontend construct.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.Initializer"></a>

```typescript
import { FrontendProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const frontendProps: FrontendProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.sourceDirectory">sourceDirectory</a></code> | <code>string</code> | Base directory of the frontend source code. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.buildCommand">buildCommand</a></code> | <code>string</code> | Optional build command (defaults to 'npm run build'). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.buildOutputDirectory">buildOutputDirectory</a></code> | <code>string</code> | Directory where build artifacts are located after build command completes (defaults to '{sourceDirectory}/build'). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.customDomain">customDomain</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig">CustomDomainConfig</a></code> | Optional custom domain configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.distributionProps">distributionProps</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps">AdditionalDistributionProps</a></code> | Optional additional CloudFront distribution properties. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.enableObservability">enableObservability</a></code> | <code>boolean</code> | Enable logging and tracing for all supporting resource. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.errorResponses">errorResponses</a></code> | <code>aws-cdk-lib.aws_cloudfront.ErrorResponse[]</code> | Optional CloudFront error responses (defaults to SPA-friendly responses). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | Optional removal policy for all resources (defaults to DESTROY). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.skipBuild">skipBuild</a></code> | <code>boolean</code> | Optional flag to skip the build process (useful for pre-built artifacts). |

---

##### `sourceDirectory`<sup>Required</sup> <a name="sourceDirectory" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.sourceDirectory"></a>

```typescript
public readonly sourceDirectory: string;
```

- *Type:* string

Base directory of the frontend source code.

---

##### `buildCommand`<sup>Optional</sup> <a name="buildCommand" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.buildCommand"></a>

```typescript
public readonly buildCommand: string;
```

- *Type:* string

Optional build command (defaults to 'npm run build').

---

##### `buildOutputDirectory`<sup>Optional</sup> <a name="buildOutputDirectory" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.buildOutputDirectory"></a>

```typescript
public readonly buildOutputDirectory: string;
```

- *Type:* string

Directory where build artifacts are located after build command completes (defaults to '{sourceDirectory}/build').

---

##### `customDomain`<sup>Optional</sup> <a name="customDomain" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.customDomain"></a>

```typescript
public readonly customDomain: CustomDomainConfig;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.CustomDomainConfig">CustomDomainConfig</a>

Optional custom domain configuration.

---

##### `distributionProps`<sup>Optional</sup> <a name="distributionProps" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.distributionProps"></a>

```typescript
public readonly distributionProps: AdditionalDistributionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.AdditionalDistributionProps">AdditionalDistributionProps</a>

Optional additional CloudFront distribution properties.

---

##### `enableObservability`<sup>Optional</sup> <a name="enableObservability" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.enableObservability"></a>

```typescript
public readonly enableObservability: boolean;
```

- *Type:* boolean
- *Default:* false

Enable logging and tracing for all supporting resource.

---

##### `errorResponses`<sup>Optional</sup> <a name="errorResponses" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.errorResponses"></a>

```typescript
public readonly errorResponses: ErrorResponse[];
```

- *Type:* aws-cdk-lib.aws_cloudfront.ErrorResponse[]

Optional CloudFront error responses (defaults to SPA-friendly responses).

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy

Optional removal policy for all resources (defaults to DESTROY).

---

##### `skipBuild`<sup>Optional</sup> <a name="skipBuild" id="@cdklabs/cdk-appmod-catalog-blueprints.FrontendProps.property.skipBuild"></a>

```typescript
public readonly skipBuild: boolean;
```

- *Type:* boolean

Optional flag to skip the build process (useful for pre-built artifacts).

---

### GuardrailConfiguration <a name="GuardrailConfiguration" id="@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration"></a>

Configuration for Bedrock Guardrails.

Guardrails filter content during retrieval operations to prevent
inappropriate or sensitive content from being returned.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration.Initializer"></a>

```typescript
import { GuardrailConfiguration } from '@cdklabs/cdk-appmod-catalog-blueprints'

const guardrailConfiguration: GuardrailConfiguration = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration.property.guardrailId">guardrailId</a></code> | <code>string</code> | ID of the Bedrock Guardrail to apply. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration.property.guardrailVersion">guardrailVersion</a></code> | <code>string</code> | Version of the guardrail to use. |

---

##### `guardrailId`<sup>Required</sup> <a name="guardrailId" id="@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration.property.guardrailId"></a>

```typescript
public readonly guardrailId: string;
```

- *Type:* string

ID of the Bedrock Guardrail to apply.

The guardrail must exist in the same region as the knowledge base.

---

##### `guardrailVersion`<sup>Optional</sup> <a name="guardrailVersion" id="@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration.property.guardrailVersion"></a>

```typescript
public readonly guardrailVersion: string;
```

- *Type:* string
- *Default:* 'DRAFT'

Version of the guardrail to use.

Use 'DRAFT' for testing or a specific version number for production.

---

### HybridConfig <a name="HybridConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig"></a>

Configuration for hybrid chunking strategy (RECOMMENDED).

Balances token count and page limits for optimal chunking.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.Initializer"></a>

```typescript
import { HybridConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

const hybridConfig: HybridConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.maxPagesPerChunk">maxPagesPerChunk</a></code> | <code>number</code> | Hard limit on pages per chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.overlapTokens">overlapTokens</a></code> | <code>number</code> | Number of overlapping tokens between consecutive chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.pageThreshold">pageThreshold</a></code> | <code>number</code> | Threshold for triggering chunking based on page count. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.targetTokensPerChunk">targetTokensPerChunk</a></code> | <code>number</code> | Soft target for tokens per chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.tokenThreshold">tokenThreshold</a></code> | <code>number</code> | Threshold for triggering chunking based on token count. |

---

##### `maxPagesPerChunk`<sup>Optional</sup> <a name="maxPagesPerChunk" id="@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.maxPagesPerChunk"></a>

```typescript
public readonly maxPagesPerChunk: number;
```

- *Type:* number
- *Default:* 99

Hard limit on pages per chunk.

Prevents very large chunks even if token count is low.
Note: Bedrock has a hard limit of 100 pages per PDF, so we default to 99
to provide a safety margin.

---

##### `overlapTokens`<sup>Optional</sup> <a name="overlapTokens" id="@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.overlapTokens"></a>

```typescript
public readonly overlapTokens: number;
```

- *Type:* number
- *Default:* 5000

Number of overlapping tokens between consecutive chunks.

Provides context continuity across chunks.

---

##### `pageThreshold`<sup>Optional</sup> <a name="pageThreshold" id="@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.pageThreshold"></a>

```typescript
public readonly pageThreshold: number;
```

- *Type:* number
- *Default:* 100

Threshold for triggering chunking based on page count.

Documents with pages > threshold will be chunked.

---

##### `targetTokensPerChunk`<sup>Optional</sup> <a name="targetTokensPerChunk" id="@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.targetTokensPerChunk"></a>

```typescript
public readonly targetTokensPerChunk: number;
```

- *Type:* number
- *Default:* 80000

Soft target for tokens per chunk.

Chunks aim for this token count but respect maxPagesPerChunk.

---

##### `tokenThreshold`<sup>Optional</sup> <a name="tokenThreshold" id="@cdklabs/cdk-appmod-catalog-blueprints.HybridConfig.property.tokenThreshold"></a>

```typescript
public readonly tokenThreshold: number;
```

- *Type:* number
- *Default:* 150000

Threshold for triggering chunking based on token count.

Documents with tokens > threshold will be chunked.

---

### KnowledgeBaseRuntimeConfig <a name="KnowledgeBaseRuntimeConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig"></a>

Runtime configuration exported for the retrieval tool.

This interface defines the structure of the configuration object
that is serialized and passed to the retrieval tool via environment
variables. It contains all information needed to query the knowledge
base at runtime.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.Initializer"></a>

```typescript
import { KnowledgeBaseRuntimeConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

const knowledgeBaseRuntimeConfig: KnowledgeBaseRuntimeConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.description">description</a></code> | <code>string</code> | Description of what this knowledge base contains. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.name">name</a></code> | <code>string</code> | Human-readable name for this knowledge base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.retrieval">retrieval</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration">RetrievalConfiguration</a></code> | Retrieval configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.acl">acl</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration">AclConfiguration</a></code> | ACL configuration for identity-aware retrieval. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.guardrail">guardrail</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration">GuardrailConfiguration</a></code> | Guardrail configuration (for Bedrock implementations). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.knowledgeBaseArn">knowledgeBaseArn</a></code> | <code>string</code> | Bedrock Knowledge Base ARN (for Bedrock implementations). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.knowledgeBaseId">knowledgeBaseId</a></code> | <code>string</code> | Bedrock Knowledge Base ID (for Bedrock implementations). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.type">type</a></code> | <code>string</code> | Type of knowledge base implementation. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.vectorStore">vectorStore</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration">VectorStoreConfiguration</a></code> | Vector store configuration (for Bedrock implementations). |

---

##### `description`<sup>Required</sup> <a name="description" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string

Description of what this knowledge base contains.

---

##### `name`<sup>Required</sup> <a name="name" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

Human-readable name for this knowledge base.

---

##### `retrieval`<sup>Required</sup> <a name="retrieval" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.retrieval"></a>

```typescript
public readonly retrieval: RetrievalConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration">RetrievalConfiguration</a>

Retrieval configuration.

---

##### `acl`<sup>Optional</sup> <a name="acl" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.acl"></a>

```typescript
public readonly acl: AclConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.AclConfiguration">AclConfiguration</a>

ACL configuration for identity-aware retrieval.

---

##### `guardrail`<sup>Optional</sup> <a name="guardrail" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.guardrail"></a>

```typescript
public readonly guardrail: GuardrailConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.GuardrailConfiguration">GuardrailConfiguration</a>

Guardrail configuration (for Bedrock implementations).

---

##### `knowledgeBaseArn`<sup>Optional</sup> <a name="knowledgeBaseArn" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.knowledgeBaseArn"></a>

```typescript
public readonly knowledgeBaseArn: string;
```

- *Type:* string

Bedrock Knowledge Base ARN (for Bedrock implementations).

---

##### `knowledgeBaseId`<sup>Optional</sup> <a name="knowledgeBaseId" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.knowledgeBaseId"></a>

```typescript
public readonly knowledgeBaseId: string;
```

- *Type:* string

Bedrock Knowledge Base ID (for Bedrock implementations).

---

##### `type`<sup>Optional</sup> <a name="type" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.type"></a>

```typescript
public readonly type: string;
```

- *Type:* string

Type of knowledge base implementation.

Used by the retrieval tool to determine how to query the KB.

---

*Example*

```typescript
'bedrock'
```


##### `vectorStore`<sup>Optional</sup> <a name="vectorStore" id="@cdklabs/cdk-appmod-catalog-blueprints.KnowledgeBaseRuntimeConfig.property.vectorStore"></a>

```typescript
public readonly vectorStore: VectorStoreConfiguration;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration">VectorStoreConfiguration</a>

Vector store configuration (for Bedrock implementations).

---

### LambdaIamUtilsStackInfo <a name="LambdaIamUtilsStackInfo" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtilsStackInfo"></a>

Stack information.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtilsStackInfo.Initializer"></a>

```typescript
import { LambdaIamUtilsStackInfo } from '@cdklabs/cdk-appmod-catalog-blueprints'

const lambdaIamUtilsStackInfo: LambdaIamUtilsStackInfo = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtilsStackInfo.property.account">account</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtilsStackInfo.property.region">region</a></code> | <code>string</code> | *No description.* |

---

##### `account`<sup>Required</sup> <a name="account" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtilsStackInfo.property.account"></a>

```typescript
public readonly account: string;
```

- *Type:* string

---

##### `region`<sup>Required</sup> <a name="region" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtilsStackInfo.property.region"></a>

```typescript
public readonly region: string;
```

- *Type:* string

---

### LambdaLogsPermissionsProps <a name="LambdaLogsPermissionsProps" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps"></a>

Configuration options for Lambda CloudWatch Logs permissions.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.Initializer"></a>

```typescript
import { LambdaLogsPermissionsProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const lambdaLogsPermissionsProps: LambdaLogsPermissionsProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.account">account</a></code> | <code>string</code> | AWS account ID for the log group ARN. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.functionName">functionName</a></code> | <code>string</code> | The base name of the Lambda function. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.region">region</a></code> | <code>string</code> | AWS region for the log group ARN. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.scope">scope</a></code> | <code>constructs.Construct</code> | The construct scope (used to generate unique names). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.enableObservability">enableObservability</a></code> | <code>boolean</code> | Whether observability is enabled or not. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.logGroupName">logGroupName</a></code> | <code>string</code> | Custom log group name pattern. |

---

##### `account`<sup>Required</sup> <a name="account" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.account"></a>

```typescript
public readonly account: string;
```

- *Type:* string

AWS account ID for the log group ARN.

---

##### `functionName`<sup>Required</sup> <a name="functionName" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.functionName"></a>

```typescript
public readonly functionName: string;
```

- *Type:* string

The base name of the Lambda function.

---

##### `region`<sup>Required</sup> <a name="region" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.region"></a>

```typescript
public readonly region: string;
```

- *Type:* string

AWS region for the log group ARN.

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.scope"></a>

```typescript
public readonly scope: Construct;
```

- *Type:* constructs.Construct

The construct scope (used to generate unique names).

---

##### `enableObservability`<sup>Optional</sup> <a name="enableObservability" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.enableObservability"></a>

```typescript
public readonly enableObservability: boolean;
```

- *Type:* boolean
- *Default:* false

Whether observability is enabled or not.

This would have an impact
on the result IAM policy for the LogGroup for the Lambda function

---

##### `logGroupName`<sup>Optional</sup> <a name="logGroupName" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps.property.logGroupName"></a>

```typescript
public readonly logGroupName: string;
```

- *Type:* string
- *Default:* '/aws/lambda/{uniqueFunctionName}'

Custom log group name pattern.

---

### LambdaLogsPermissionsResult <a name="LambdaLogsPermissionsResult" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsResult"></a>

Result of creating Lambda logs permissions.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsResult.Initializer"></a>

```typescript
import { LambdaLogsPermissionsResult } from '@cdklabs/cdk-appmod-catalog-blueprints'

const lambdaLogsPermissionsResult: LambdaLogsPermissionsResult = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsResult.property.policyStatements">policyStatements</a></code> | <code>aws-cdk-lib.aws_iam.PolicyStatement[]</code> | The policy statements for CloudWatch Logs. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsResult.property.uniqueFunctionName">uniqueFunctionName</a></code> | <code>string</code> | The unique function name that was generated. |

---

##### `policyStatements`<sup>Required</sup> <a name="policyStatements" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsResult.property.policyStatements"></a>

```typescript
public readonly policyStatements: PolicyStatement[];
```

- *Type:* aws-cdk-lib.aws_iam.PolicyStatement[]

The policy statements for CloudWatch Logs.

---

##### `uniqueFunctionName`<sup>Required</sup> <a name="uniqueFunctionName" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsResult.property.uniqueFunctionName"></a>

```typescript
public readonly uniqueFunctionName: string;
```

- *Type:* string

The unique function name that was generated.

---

### LogGroupDataProtectionProps <a name="LogGroupDataProtectionProps" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps"></a>

Props to enable various data protection configuration for CloudWatch Log Groups.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps.Initializer"></a>

```typescript
import { LogGroupDataProtectionProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const logGroupDataProtectionProps: LogGroupDataProtectionProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps.property.dataProtectionIdentifiers">dataProtectionIdentifiers</a></code> | <code>aws-cdk-lib.aws_logs.DataIdentifier[]</code> | List of DataIdentifiers that would be used as part of the Data Protection Policy that would be created for the log group. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps.property.logGroupEncryptionKey">logGroupEncryptionKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | Encryption key that would be used to encrypt the relevant log group. |

---

##### `dataProtectionIdentifiers`<sup>Optional</sup> <a name="dataProtectionIdentifiers" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps.property.dataProtectionIdentifiers"></a>

```typescript
public readonly dataProtectionIdentifiers: DataIdentifier[];
```

- *Type:* aws-cdk-lib.aws_logs.DataIdentifier[]
- *Default:* Data Protection Policy won't be enabled

List of DataIdentifiers that would be used as part of the Data Protection Policy that would be created for the log group.

---

##### `logGroupEncryptionKey`<sup>Optional</sup> <a name="logGroupEncryptionKey" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps.property.logGroupEncryptionKey"></a>

```typescript
public readonly logGroupEncryptionKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key
- *Default:* a new KMS key would automatically be created

Encryption key that would be used to encrypt the relevant log group.

---

### NetworkProps <a name="NetworkProps" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps"></a>

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.Initializer"></a>

```typescript
import { NetworkProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const networkProps: NetworkProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.existingVpc">existingVpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.ipAddresses">ipAddresses</a></code> | <code>aws-cdk-lib.aws_ec2.IIpAddresses</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.maxAzs">maxAzs</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.natGatewayProvider">natGatewayProvider</a></code> | <code>aws-cdk-lib.aws_ec2.NatProvider</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.natGateways">natGateways</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.natGatewaySubnets">natGatewaySubnets</a></code> | <code>aws-cdk-lib.aws_ec2.SubnetSelection</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.private">private</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.subnetConfiguration">subnetConfiguration</a></code> | <code>aws-cdk-lib.aws_ec2.SubnetConfiguration[]</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.vpcName">vpcName</a></code> | <code>string</code> | *No description.* |

---

##### `existingVpc`<sup>Optional</sup> <a name="existingVpc" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.existingVpc"></a>

```typescript
public readonly existingVpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

---

##### `ipAddresses`<sup>Optional</sup> <a name="ipAddresses" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.ipAddresses"></a>

```typescript
public readonly ipAddresses: IIpAddresses;
```

- *Type:* aws-cdk-lib.aws_ec2.IIpAddresses

---

##### `maxAzs`<sup>Optional</sup> <a name="maxAzs" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.maxAzs"></a>

```typescript
public readonly maxAzs: number;
```

- *Type:* number

---

##### `natGatewayProvider`<sup>Optional</sup> <a name="natGatewayProvider" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.natGatewayProvider"></a>

```typescript
public readonly natGatewayProvider: NatProvider;
```

- *Type:* aws-cdk-lib.aws_ec2.NatProvider

---

##### `natGateways`<sup>Optional</sup> <a name="natGateways" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.natGateways"></a>

```typescript
public readonly natGateways: number;
```

- *Type:* number

---

##### `natGatewaySubnets`<sup>Optional</sup> <a name="natGatewaySubnets" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.natGatewaySubnets"></a>

```typescript
public readonly natGatewaySubnets: SubnetSelection;
```

- *Type:* aws-cdk-lib.aws_ec2.SubnetSelection

---

##### `private`<sup>Optional</sup> <a name="private" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.private"></a>

```typescript
public readonly private: boolean;
```

- *Type:* boolean

---

##### `subnetConfiguration`<sup>Optional</sup> <a name="subnetConfiguration" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.subnetConfiguration"></a>

```typescript
public readonly subnetConfiguration: SubnetConfiguration[];
```

- *Type:* aws-cdk-lib.aws_ec2.SubnetConfiguration[]

---

##### `vpcName`<sup>Optional</sup> <a name="vpcName" id="@cdklabs/cdk-appmod-catalog-blueprints.NetworkProps.property.vpcName"></a>

```typescript
public readonly vpcName: string;
```

- *Type:* string

---

### NoChunkingResponse <a name="NoChunkingResponse" id="@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse"></a>

Response when chunking is NOT required.

Document is below thresholds and will be processed without chunking.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse.Initializer"></a>

```typescript
import { NoChunkingResponse } from '@cdklabs/cdk-appmod-catalog-blueprints'

const noChunkingResponse: NoChunkingResponse = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse.property.documentId">documentId</a></code> | <code>string</code> | Document identifier. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse.property.reason">reason</a></code> | <code>string</code> | Human-readable reason why chunking was not applied. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse.property.requiresChunking">requiresChunking</a></code> | <code>boolean</code> | Indicates chunking is not required. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse.property.tokenAnalysis">tokenAnalysis</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis">TokenAnalysis</a></code> | Token analysis results. |

---

##### `documentId`<sup>Required</sup> <a name="documentId" id="@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse.property.documentId"></a>

```typescript
public readonly documentId: string;
```

- *Type:* string

Document identifier.

---

##### `reason`<sup>Required</sup> <a name="reason" id="@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse.property.reason"></a>

```typescript
public readonly reason: string;
```

- *Type:* string

Human-readable reason why chunking was not applied.

Example: "Document has 50 pages, below threshold of 100"

---

##### `requiresChunking`<sup>Required</sup> <a name="requiresChunking" id="@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse.property.requiresChunking"></a>

```typescript
public readonly requiresChunking: boolean;
```

- *Type:* boolean

Indicates chunking is not required.

---

##### `tokenAnalysis`<sup>Required</sup> <a name="tokenAnalysis" id="@cdklabs/cdk-appmod-catalog-blueprints.NoChunkingResponse.property.tokenAnalysis"></a>

```typescript
public readonly tokenAnalysis: TokenAnalysis;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis">TokenAnalysis</a>

Token analysis results.

---

### ObservableProps <a name="ObservableProps" id="@cdklabs/cdk-appmod-catalog-blueprints.ObservableProps"></a>

Additional properties that constructs implementing the IObservable interface should extend as part of their input props.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.ObservableProps.Initializer"></a>

```typescript
import { ObservableProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const observableProps: ObservableProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ObservableProps.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | Data protection related configuration. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ObservableProps.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Business metric namespace. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.ObservableProps.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | Business metric service name dimension. |

---

##### `logGroupDataProtection`<sup>Optional</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.ObservableProps.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>
- *Default:* a new KMS key would be generated

Data protection related configuration.

---

##### `metricNamespace`<sup>Optional</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.ObservableProps.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric namespace.

---

##### `metricServiceName`<sup>Optional</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.ObservableProps.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string
- *Default:* would be defined per use case

Business metric service name dimension.

---

### QueuedS3AdapterProps <a name="QueuedS3AdapterProps" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps"></a>

Props for the Queued S3 Adapter.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.Initializer"></a>

```typescript
import { QueuedS3AdapterProps } from '@cdklabs/cdk-appmod-catalog-blueprints'

const queuedS3AdapterProps: QueuedS3AdapterProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.bucket">bucket</a></code> | <code>aws-cdk-lib.aws_s3.Bucket</code> | S3 bucket for document storage with organized prefixes (raw/, processed/, failed/). |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.dlqMaxReceiveCount">dlqMaxReceiveCount</a></code> | <code>number</code> | The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.failedPrefix">failedPrefix</a></code> | <code>string</code> | S3 prefix where the files that failed processing would be stored. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.processedPrefix">processedPrefix</a></code> | <code>string</code> | S3 prefix where the processed files would be stored. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.queueVisibilityTimeout">queueVisibilityTimeout</a></code> | <code>aws-cdk-lib.Duration</code> | SQS queue visibility timeout for processing messages. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.rawPrefix">rawPrefix</a></code> | <code>string</code> | S3 prefix where the raw files would be stored. |

---

##### `bucket`<sup>Optional</sup> <a name="bucket" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.bucket"></a>

```typescript
public readonly bucket: Bucket;
```

- *Type:* aws-cdk-lib.aws_s3.Bucket
- *Default:* create a new bucket

S3 bucket for document storage with organized prefixes (raw/, processed/, failed/).

If not provided, a new bucket will be created with auto-delete enabled based on removalPolicy.

---

##### `dlqMaxReceiveCount`<sup>Optional</sup> <a name="dlqMaxReceiveCount" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.dlqMaxReceiveCount"></a>

```typescript
public readonly dlqMaxReceiveCount: number;
```

- *Type:* number
- *Default:* 5

The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.

---

##### `failedPrefix`<sup>Optional</sup> <a name="failedPrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.failedPrefix"></a>

```typescript
public readonly failedPrefix: string;
```

- *Type:* string
- *Default:* "failed/"

S3 prefix where the files that failed processing would be stored.

---

##### `processedPrefix`<sup>Optional</sup> <a name="processedPrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.processedPrefix"></a>

```typescript
public readonly processedPrefix: string;
```

- *Type:* string
- *Default:* "processed/"

S3 prefix where the processed files would be stored.

---

##### `queueVisibilityTimeout`<sup>Optional</sup> <a name="queueVisibilityTimeout" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.queueVisibilityTimeout"></a>

```typescript
public readonly queueVisibilityTimeout: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* Duration.seconds(300)

SQS queue visibility timeout for processing messages.

Should be longer than expected processing time to prevent duplicate processing.

---

##### `rawPrefix`<sup>Optional</sup> <a name="rawPrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps.property.rawPrefix"></a>

```typescript
public readonly rawPrefix: string;
```

- *Type:* string
- *Default:* "raw/"

S3 prefix where the raw files would be stored.

This serves as the trigger point for processing

---

### RetrievalConfiguration <a name="RetrievalConfiguration" id="@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration"></a>

Configuration for retrieval operations.

Controls how many results are returned and optional metadata filtering
applied to all queries against the knowledge base.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration.Initializer"></a>

```typescript
import { RetrievalConfiguration } from '@cdklabs/cdk-appmod-catalog-blueprints'

const retrievalConfiguration: RetrievalConfiguration = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration.property.numberOfResults">numberOfResults</a></code> | <code>number</code> | Number of results to return per query. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration.property.retrievalFilter">retrievalFilter</a></code> | <code>{[ key: string ]: any}</code> | Metadata filter to apply to all queries. |

---

##### `numberOfResults`<sup>Optional</sup> <a name="numberOfResults" id="@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration.property.numberOfResults"></a>

```typescript
public readonly numberOfResults: number;
```

- *Type:* number
- *Default:* 5

Number of results to return per query.

Higher values provide more context but increase token usage.
Lower values are faster but may miss relevant information.

---

##### `retrievalFilter`<sup>Optional</sup> <a name="retrievalFilter" id="@cdklabs/cdk-appmod-catalog-blueprints.RetrievalConfiguration.property.retrievalFilter"></a>

```typescript
public readonly retrievalFilter: {[ key: string ]: any};
```

- *Type:* {[ key: string ]: any}
- *Default:* No filter applied

Metadata filter to apply to all queries.

This filter is applied in addition to any ACL filters. Use this
for static filtering based on document metadata (e.g., document type,
category, or date range).

---

### TokenAnalysis <a name="TokenAnalysis" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis"></a>

Token analysis results from PDF analysis.

Provides information about document size and token distribution.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis.Initializer"></a>

```typescript
import { TokenAnalysis } from '@cdklabs/cdk-appmod-catalog-blueprints'

const tokenAnalysis: TokenAnalysis = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis.property.avgTokensPerPage">avgTokensPerPage</a></code> | <code>number</code> | Average tokens per page across the document. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis.property.totalPages">totalPages</a></code> | <code>number</code> | Total number of pages in the document. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis.property.totalTokens">totalTokens</a></code> | <code>number</code> | Total estimated tokens in the document. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis.property.tokensPerPage">tokensPerPage</a></code> | <code>number[]</code> | Optional detailed token count for each page. |

---

##### `avgTokensPerPage`<sup>Required</sup> <a name="avgTokensPerPage" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis.property.avgTokensPerPage"></a>

```typescript
public readonly avgTokensPerPage: number;
```

- *Type:* number

Average tokens per page across the document.

---

##### `totalPages`<sup>Required</sup> <a name="totalPages" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis.property.totalPages"></a>

```typescript
public readonly totalPages: number;
```

- *Type:* number

Total number of pages in the document.

---

##### `totalTokens`<sup>Required</sup> <a name="totalTokens" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis.property.totalTokens"></a>

```typescript
public readonly totalTokens: number;
```

- *Type:* number

Total estimated tokens in the document.

---

##### `tokensPerPage`<sup>Optional</sup> <a name="tokensPerPage" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenAnalysis.property.tokensPerPage"></a>

```typescript
public readonly tokensPerPage: number[];
```

- *Type:* number[]

Optional detailed token count for each page.

Used for token-based and hybrid chunking strategies.

---

### TokenBasedConfig <a name="TokenBasedConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenBasedConfig"></a>

Configuration for token-based chunking strategy.

Splits documents based on estimated token count to respect model limits.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenBasedConfig.Initializer"></a>

```typescript
import { TokenBasedConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

const tokenBasedConfig: TokenBasedConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenBasedConfig.property.maxTokensPerChunk">maxTokensPerChunk</a></code> | <code>number</code> | Maximum tokens per chunk. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenBasedConfig.property.overlapTokens">overlapTokens</a></code> | <code>number</code> | Number of overlapping tokens between consecutive chunks. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.TokenBasedConfig.property.tokenThreshold">tokenThreshold</a></code> | <code>number</code> | Threshold for triggering chunking based on token count. |

---

##### `maxTokensPerChunk`<sup>Optional</sup> <a name="maxTokensPerChunk" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenBasedConfig.property.maxTokensPerChunk"></a>

```typescript
public readonly maxTokensPerChunk: number;
```

- *Type:* number
- *Default:* 100000

Maximum tokens per chunk.

Ensures no chunk exceeds model token limits.

---

##### `overlapTokens`<sup>Optional</sup> <a name="overlapTokens" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenBasedConfig.property.overlapTokens"></a>

```typescript
public readonly overlapTokens: number;
```

- *Type:* number
- *Default:* 5000

Number of overlapping tokens between consecutive chunks.

Provides context continuity across chunks.

---

##### `tokenThreshold`<sup>Optional</sup> <a name="tokenThreshold" id="@cdklabs/cdk-appmod-catalog-blueprints.TokenBasedConfig.property.tokenThreshold"></a>

```typescript
public readonly tokenThreshold: number;
```

- *Type:* number
- *Default:* 150000

Threshold for triggering chunking based on token count.

Documents with tokens > threshold will be chunked.

---

### VectorStoreConfiguration <a name="VectorStoreConfiguration" id="@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration"></a>

Configuration for vector store used by the knowledge base.

Defines the type of vector store and any type-specific configuration.
S3 Vectors is the default and recommended option for most use cases.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration.Initializer"></a>

```typescript
import { VectorStoreConfiguration } from '@cdklabs/cdk-appmod-catalog-blueprints'

const vectorStoreConfiguration: VectorStoreConfiguration = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration.property.bucketName">bucketName</a></code> | <code>string</code> | S3 bucket name for S3 Vectors storage. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration.property.prefix">prefix</a></code> | <code>string</code> | S3 prefix for vectors within the bucket. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration.property.type">type</a></code> | <code>string</code> | Type of vector store. |

---

##### `bucketName`<sup>Optional</sup> <a name="bucketName" id="@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration.property.bucketName"></a>

```typescript
public readonly bucketName: string;
```

- *Type:* string
- *Default:* Uses Bedrock's default bucket

S3 bucket name for S3 Vectors storage.

Only used when type is 's3-vectors'. If not provided, the default
bucket created by Bedrock will be used.

---

##### `prefix`<sup>Optional</sup> <a name="prefix" id="@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration.property.prefix"></a>

```typescript
public readonly prefix: string;
```

- *Type:* string
- *Default:* 'vectors/'

S3 prefix for vectors within the bucket.

Only used when type is 's3-vectors'.

---

##### `type`<sup>Optional</sup> <a name="type" id="@cdklabs/cdk-appmod-catalog-blueprints.VectorStoreConfiguration.property.type"></a>

```typescript
public readonly type: string;
```

- *Type:* string
- *Default:* 's3-vectors'

Type of vector store.

's3-vectors': Amazon S3 vector storage (default, recommended)
- 'opensearch-serverless': Amazon OpenSearch Serverless
- 'pinecone': Pinecone vector database
- 'rds': Amazon RDS with pgvector

---

## Classes <a name="Classes" id="Classes"></a>

### BedrockModelUtils <a name="BedrockModelUtils" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelUtils"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelUtils.Initializer"></a>

```typescript
import { BedrockModelUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

new BedrockModelUtils()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelUtils.deriveActualModelId">deriveActualModelId</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelUtils.generateModelIAMPermissions">generateModelIAMPermissions</a></code> | *No description.* |

---

##### `deriveActualModelId` <a name="deriveActualModelId" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelUtils.deriveActualModelId"></a>

```typescript
import { BedrockModelUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

BedrockModelUtils.deriveActualModelId(props?: BedrockModelProps)
```

###### `props`<sup>Optional</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelUtils.deriveActualModelId.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a>

---

##### `generateModelIAMPermissions` <a name="generateModelIAMPermissions" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelUtils.generateModelIAMPermissions"></a>

```typescript
import { BedrockModelUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

BedrockModelUtils.generateModelIAMPermissions(scope: Construct, props?: BedrockModelProps)
```

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelUtils.generateModelIAMPermissions.parameter.scope"></a>

- *Type:* constructs.Construct

---

###### `props`<sup>Optional</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelUtils.generateModelIAMPermissions.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a>

---



### CloudfrontDistributionObservabilityPropertyInjector <a name="CloudfrontDistributionObservabilityPropertyInjector" id="@cdklabs/cdk-appmod-catalog-blueprints.CloudfrontDistributionObservabilityPropertyInjector"></a>

- *Implements:* aws-cdk-lib.IPropertyInjector

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.CloudfrontDistributionObservabilityPropertyInjector.Initializer"></a>

```typescript
import { CloudfrontDistributionObservabilityPropertyInjector } from '@cdklabs/cdk-appmod-catalog-blueprints'

new CloudfrontDistributionObservabilityPropertyInjector()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CloudfrontDistributionObservabilityPropertyInjector.inject">inject</a></code> | The injector to be applied to the constructor properties of the Construct. |

---

##### `inject` <a name="inject" id="@cdklabs/cdk-appmod-catalog-blueprints.CloudfrontDistributionObservabilityPropertyInjector.inject"></a>

```typescript
public inject(originalProps: any, context: InjectionContext): any
```

The injector to be applied to the constructor properties of the Construct.

###### `originalProps`<sup>Required</sup> <a name="originalProps" id="@cdklabs/cdk-appmod-catalog-blueprints.CloudfrontDistributionObservabilityPropertyInjector.inject.parameter.originalProps"></a>

- *Type:* any

---

###### `context`<sup>Required</sup> <a name="context" id="@cdklabs/cdk-appmod-catalog-blueprints.CloudfrontDistributionObservabilityPropertyInjector.inject.parameter.context"></a>

- *Type:* aws-cdk-lib.InjectionContext

---


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.CloudfrontDistributionObservabilityPropertyInjector.property.constructUniqueId">constructUniqueId</a></code> | <code>string</code> | The unique Id of the Construct class. |

---

##### `constructUniqueId`<sup>Required</sup> <a name="constructUniqueId" id="@cdklabs/cdk-appmod-catalog-blueprints.CloudfrontDistributionObservabilityPropertyInjector.property.constructUniqueId"></a>

```typescript
public readonly constructUniqueId: string;
```

- *Type:* string

The unique Id of the Construct class.

---


### DefaultAgentConfig <a name="DefaultAgentConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultAgentConfig"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultAgentConfig.Initializer"></a>

```typescript
import { DefaultAgentConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

new DefaultAgentConfig()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---




#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DefaultAgentConfig.property.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME">DEFAULT_OBSERVABILITY_METRIC_SVC_NAME</a></code> | <code>string</code> | *No description.* |

---

##### `DEFAULT_OBSERVABILITY_METRIC_SVC_NAME`<sup>Required</sup> <a name="DEFAULT_OBSERVABILITY_METRIC_SVC_NAME" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultAgentConfig.property.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME"></a>

```typescript
public readonly DEFAULT_OBSERVABILITY_METRIC_SVC_NAME: string;
```

- *Type:* string

---

### DefaultDocumentProcessingConfig <a name="DefaultDocumentProcessingConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultDocumentProcessingConfig"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultDocumentProcessingConfig.Initializer"></a>

```typescript
import { DefaultDocumentProcessingConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

new DefaultDocumentProcessingConfig()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---




#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DefaultDocumentProcessingConfig.property.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME">DEFAULT_OBSERVABILITY_METRIC_SVC_NAME</a></code> | <code>string</code> | *No description.* |

---

##### `DEFAULT_OBSERVABILITY_METRIC_SVC_NAME`<sup>Required</sup> <a name="DEFAULT_OBSERVABILITY_METRIC_SVC_NAME" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultDocumentProcessingConfig.property.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME"></a>

```typescript
public readonly DEFAULT_OBSERVABILITY_METRIC_SVC_NAME: string;
```

- *Type:* string

---

### DefaultObservabilityConfig <a name="DefaultObservabilityConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultObservabilityConfig"></a>

Contains default constants for Observability related configuration.

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultObservabilityConfig.Initializer"></a>

```typescript
import { DefaultObservabilityConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

new DefaultObservabilityConfig()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---




#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DefaultObservabilityConfig.property.DEFAULT_METRIC_NAMESPACE">DEFAULT_METRIC_NAMESPACE</a></code> | <code>string</code> | Default namespace for powertools. |

---

##### `DEFAULT_METRIC_NAMESPACE`<sup>Required</sup> <a name="DEFAULT_METRIC_NAMESPACE" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultObservabilityConfig.property.DEFAULT_METRIC_NAMESPACE"></a>

```typescript
public readonly DEFAULT_METRIC_NAMESPACE: string;
```

- *Type:* string

Default namespace for powertools.

---

### DefaultRuntimes <a name="DefaultRuntimes" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes"></a>

Contains default runtimes that would be referenced by Lambda functions in the various use cases.

Updating of
Runtime versions should be done here.

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes.Initializer"></a>

```typescript
import { DefaultRuntimes } from '@cdklabs/cdk-appmod-catalog-blueprints'

new DefaultRuntimes()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---




#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes.property.NODEJS">NODEJS</a></code> | <code>aws-cdk-lib.aws_lambda.Runtime</code> | Default runtime for all Lambda functions in the use cases. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes.property.PYTHON">PYTHON</a></code> | <code>aws-cdk-lib.aws_lambda.Runtime</code> | Default runtime for Python based Lambda functions. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes.property.PYTHON_BUNDLING_IMAGE">PYTHON_BUNDLING_IMAGE</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes.property.PYTHON_FUNCTION_BUNDLING">PYTHON_FUNCTION_BUNDLING</a></code> | <code>@aws-cdk/aws-lambda-python-alpha.BundlingOptions</code> | Default bundling arguments for Python function. |

---

##### `NODEJS`<sup>Required</sup> <a name="NODEJS" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes.property.NODEJS"></a>

```typescript
public readonly NODEJS: Runtime;
```

- *Type:* aws-cdk-lib.aws_lambda.Runtime

Default runtime for all Lambda functions in the use cases.

---

##### `PYTHON`<sup>Required</sup> <a name="PYTHON" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes.property.PYTHON"></a>

```typescript
public readonly PYTHON: Runtime;
```

- *Type:* aws-cdk-lib.aws_lambda.Runtime

Default runtime for Python based Lambda functions.

---

##### `PYTHON_BUNDLING_IMAGE`<sup>Required</sup> <a name="PYTHON_BUNDLING_IMAGE" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes.property.PYTHON_BUNDLING_IMAGE"></a>

```typescript
public readonly PYTHON_BUNDLING_IMAGE: string;
```

- *Type:* string

---

##### `PYTHON_FUNCTION_BUNDLING`<sup>Required</sup> <a name="PYTHON_FUNCTION_BUNDLING" id="@cdklabs/cdk-appmod-catalog-blueprints.DefaultRuntimes.property.PYTHON_FUNCTION_BUNDLING"></a>

```typescript
public readonly PYTHON_FUNCTION_BUNDLING: BundlingOptions;
```

- *Type:* @aws-cdk/aws-lambda-python-alpha.BundlingOptions

Default bundling arguments for Python function.

---

### LambdaIamUtils <a name="LambdaIamUtils" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils"></a>

Utility class for creating secure Lambda IAM policy statements with minimal permissions.

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.Initializer"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

new LambdaIamUtils()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createDynamoDbPolicyStatement">createDynamoDbPolicyStatement</a></code> | Creates a policy statement for DynamoDB table access. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createKmsPolicyStatement">createKmsPolicyStatement</a></code> | Creates a policy statement for KMS key access. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createLogsPermissions">createLogsPermissions</a></code> | Creates CloudWatch Logs policy statements for Lambda execution. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createS3PolicyStatement">createS3PolicyStatement</a></code> | Creates a policy statement for S3 bucket access. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSecretsManagerPolicyStatement">createSecretsManagerPolicyStatement</a></code> | Creates a policy statement for Secrets Manager access. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSnsPolicyStatement">createSnsPolicyStatement</a></code> | Creates a policy statement for SNS topic access. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSqsPolicyStatement">createSqsPolicyStatement</a></code> | Creates a policy statement for SQS queue access. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createStepFunctionsPolicyStatement">createStepFunctionsPolicyStatement</a></code> | Creates a policy statement for Step Functions execution. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createVpcPermissions">createVpcPermissions</a></code> | Creates VPC permissions for Lambda functions running in VPC. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createXRayPermissions">createXRayPermissions</a></code> | Creates X-Ray tracing permissions for Lambda functions. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.generateLambdaVPCPermissions">generateLambdaVPCPermissions</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.generateUniqueFunctionName">generateUniqueFunctionName</a></code> | Generates a unique function name using CDK's built-in functionality. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.getStackInfo">getStackInfo</a></code> | Helper method to get region and account from a construct. |

---

##### `createDynamoDbPolicyStatement` <a name="createDynamoDbPolicyStatement" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createDynamoDbPolicyStatement"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createDynamoDbPolicyStatement(tableArn: string, actions?: string[])
```

Creates a policy statement for DynamoDB table access.

###### `tableArn`<sup>Required</sup> <a name="tableArn" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createDynamoDbPolicyStatement.parameter.tableArn"></a>

- *Type:* string

The ARN of the DynamoDB table.

---

###### `actions`<sup>Optional</sup> <a name="actions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createDynamoDbPolicyStatement.parameter.actions"></a>

- *Type:* string[]

The DynamoDB actions to allow.

---

##### `createKmsPolicyStatement` <a name="createKmsPolicyStatement" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createKmsPolicyStatement"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createKmsPolicyStatement(keyArn: string, actions?: string[])
```

Creates a policy statement for KMS key access.

###### `keyArn`<sup>Required</sup> <a name="keyArn" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createKmsPolicyStatement.parameter.keyArn"></a>

- *Type:* string

The ARN of the KMS key.

---

###### `actions`<sup>Optional</sup> <a name="actions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createKmsPolicyStatement.parameter.actions"></a>

- *Type:* string[]

The KMS actions to allow.

---

##### `createLogsPermissions` <a name="createLogsPermissions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createLogsPermissions"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createLogsPermissions(props: LambdaLogsPermissionsProps)
```

Creates CloudWatch Logs policy statements for Lambda execution.

###### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createLogsPermissions.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaLogsPermissionsProps">LambdaLogsPermissionsProps</a>

Configuration properties.

---

##### `createS3PolicyStatement` <a name="createS3PolicyStatement" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createS3PolicyStatement"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createS3PolicyStatement(bucketArn: string, actions?: string[], includeObjects?: boolean)
```

Creates a policy statement for S3 bucket access.

###### `bucketArn`<sup>Required</sup> <a name="bucketArn" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createS3PolicyStatement.parameter.bucketArn"></a>

- *Type:* string

The ARN of the S3 bucket.

---

###### `actions`<sup>Optional</sup> <a name="actions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createS3PolicyStatement.parameter.actions"></a>

- *Type:* string[]

The S3 actions to allow.

---

###### `includeObjects`<sup>Optional</sup> <a name="includeObjects" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createS3PolicyStatement.parameter.includeObjects"></a>

- *Type:* boolean

Whether to include object-level permissions.

---

##### `createSecretsManagerPolicyStatement` <a name="createSecretsManagerPolicyStatement" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSecretsManagerPolicyStatement"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createSecretsManagerPolicyStatement(secretArn: string, actions?: string[])
```

Creates a policy statement for Secrets Manager access.

###### `secretArn`<sup>Required</sup> <a name="secretArn" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSecretsManagerPolicyStatement.parameter.secretArn"></a>

- *Type:* string

The ARN of the secret.

---

###### `actions`<sup>Optional</sup> <a name="actions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSecretsManagerPolicyStatement.parameter.actions"></a>

- *Type:* string[]

The Secrets Manager actions to allow.

---

##### `createSnsPolicyStatement` <a name="createSnsPolicyStatement" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSnsPolicyStatement"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createSnsPolicyStatement(topicArn: string, actions?: string[])
```

Creates a policy statement for SNS topic access.

###### `topicArn`<sup>Required</sup> <a name="topicArn" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSnsPolicyStatement.parameter.topicArn"></a>

- *Type:* string

The ARN of the SNS topic.

---

###### `actions`<sup>Optional</sup> <a name="actions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSnsPolicyStatement.parameter.actions"></a>

- *Type:* string[]

The SNS actions to allow.

---

##### `createSqsPolicyStatement` <a name="createSqsPolicyStatement" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSqsPolicyStatement"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createSqsPolicyStatement(queueArn: string, actions?: string[])
```

Creates a policy statement for SQS queue access.

###### `queueArn`<sup>Required</sup> <a name="queueArn" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSqsPolicyStatement.parameter.queueArn"></a>

- *Type:* string

The ARN of the SQS queue.

---

###### `actions`<sup>Optional</sup> <a name="actions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createSqsPolicyStatement.parameter.actions"></a>

- *Type:* string[]

The SQS actions to allow.

---

##### `createStepFunctionsPolicyStatement` <a name="createStepFunctionsPolicyStatement" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createStepFunctionsPolicyStatement"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createStepFunctionsPolicyStatement(stateMachineArn: string, actions?: string[])
```

Creates a policy statement for Step Functions execution.

###### `stateMachineArn`<sup>Required</sup> <a name="stateMachineArn" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createStepFunctionsPolicyStatement.parameter.stateMachineArn"></a>

- *Type:* string

The ARN of the Step Functions state machine.

---

###### `actions`<sup>Optional</sup> <a name="actions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createStepFunctionsPolicyStatement.parameter.actions"></a>

- *Type:* string[]

The Step Functions actions to allow.

---

##### `createVpcPermissions` <a name="createVpcPermissions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createVpcPermissions"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createVpcPermissions()
```

Creates VPC permissions for Lambda functions running in VPC.

##### `createXRayPermissions` <a name="createXRayPermissions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.createXRayPermissions"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.createXRayPermissions()
```

Creates X-Ray tracing permissions for Lambda functions.

##### `generateLambdaVPCPermissions` <a name="generateLambdaVPCPermissions" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.generateLambdaVPCPermissions"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.generateLambdaVPCPermissions()
```

##### `generateUniqueFunctionName` <a name="generateUniqueFunctionName" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.generateUniqueFunctionName"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.generateUniqueFunctionName(scope: Construct, baseName: string)
```

Generates a unique function name using CDK's built-in functionality.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.generateUniqueFunctionName.parameter.scope"></a>

- *Type:* constructs.Construct

The construct scope.

---

###### `baseName`<sup>Required</sup> <a name="baseName" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.generateUniqueFunctionName.parameter.baseName"></a>

- *Type:* string

The base name for the function.

---

##### `getStackInfo` <a name="getStackInfo" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.getStackInfo"></a>

```typescript
import { LambdaIamUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LambdaIamUtils.getStackInfo(scope: Construct)
```

Helper method to get region and account from a construct.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.getStackInfo.parameter.scope"></a>

- *Type:* constructs.Construct

The construct scope.

---


#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.property.OBSERVABILITY_SUFFIX">OBSERVABILITY_SUFFIX</a></code> | <code>string</code> | *No description.* |

---

##### `OBSERVABILITY_SUFFIX`<sup>Required</sup> <a name="OBSERVABILITY_SUFFIX" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaIamUtils.property.OBSERVABILITY_SUFFIX"></a>

```typescript
public readonly OBSERVABILITY_SUFFIX: string;
```

- *Type:* string

---

### LambdaObservabilityPropertyInjector <a name="LambdaObservabilityPropertyInjector" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector"></a>

- *Implements:* aws-cdk-lib.IPropertyInjector

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.Initializer"></a>

```typescript
import { LambdaObservabilityPropertyInjector } from '@cdklabs/cdk-appmod-catalog-blueprints'

new LambdaObservabilityPropertyInjector(logGroupDataProtection: LogGroupDataProtectionProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.Initializer.parameter.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | *No description.* |

---

##### `logGroupDataProtection`<sup>Required</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.Initializer.parameter.logGroupDataProtection"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.inject">inject</a></code> | The injector to be applied to the constructor properties of the Construct. |

---

##### `inject` <a name="inject" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.inject"></a>

```typescript
public inject(originalProps: any, _context: InjectionContext): any
```

The injector to be applied to the constructor properties of the Construct.

###### `originalProps`<sup>Required</sup> <a name="originalProps" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.inject.parameter.originalProps"></a>

- *Type:* any

---

###### `_context`<sup>Required</sup> <a name="_context" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.inject.parameter._context"></a>

- *Type:* aws-cdk-lib.InjectionContext

---


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.property.constructUniqueId">constructUniqueId</a></code> | <code>string</code> | The unique Id of the Construct class. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | *No description.* |

---

##### `constructUniqueId`<sup>Required</sup> <a name="constructUniqueId" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.property.constructUniqueId"></a>

```typescript
public readonly constructUniqueId: string;
```

- *Type:* string

The unique Id of the Construct class.

---

##### `logGroupDataProtection`<sup>Required</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.LambdaObservabilityPropertyInjector.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>

---


### LogGroupDataProtectionUtils <a name="LogGroupDataProtectionUtils" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionUtils"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionUtils.Initializer"></a>

```typescript
import { LogGroupDataProtectionUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

new LogGroupDataProtectionUtils()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionUtils.handleDefault">handleDefault</a></code> | *No description.* |

---

##### `handleDefault` <a name="handleDefault" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionUtils.handleDefault"></a>

```typescript
import { LogGroupDataProtectionUtils } from '@cdklabs/cdk-appmod-catalog-blueprints'

LogGroupDataProtectionUtils.handleDefault(scope: Construct, props?: LogGroupDataProtectionProps, removalPolicy?: RemovalPolicy)
```

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionUtils.handleDefault.parameter.scope"></a>

- *Type:* constructs.Construct

---

###### `props`<sup>Optional</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionUtils.handleDefault.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>

---

###### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionUtils.handleDefault.parameter.removalPolicy"></a>

- *Type:* aws-cdk-lib.RemovalPolicy

---



### PowertoolsConfig <a name="PowertoolsConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig"></a>

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.Initializer"></a>

```typescript
import { PowertoolsConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

new PowertoolsConfig()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig">generateDefaultLambdaConfig</a></code> | Generate default Lambda configuration for Powertools. |

---

##### `generateDefaultLambdaConfig` <a name="generateDefaultLambdaConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig"></a>

```typescript
import { PowertoolsConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

PowertoolsConfig.generateDefaultLambdaConfig(enableObservability?: boolean, metricsNamespace?: string, serviceName?: string, logLevel?: string)
```

Generate default Lambda configuration for Powertools.

###### `enableObservability`<sup>Optional</sup> <a name="enableObservability" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig.parameter.enableObservability"></a>

- *Type:* boolean

Whether observability is enabled.

---

###### `metricsNamespace`<sup>Optional</sup> <a name="metricsNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig.parameter.metricsNamespace"></a>

- *Type:* string

CloudWatch metrics namespace.

---

###### `serviceName`<sup>Optional</sup> <a name="serviceName" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig.parameter.serviceName"></a>

- *Type:* string

Service name for logging and metrics.

---

###### `logLevel`<sup>Optional</sup> <a name="logLevel" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig.parameter.logLevel"></a>

- *Type:* string

Log level (INFO, ERROR, DEBUG, WARNING).

Defaults to INFO.

---



### QueuedS3Adapter <a name="QueuedS3Adapter" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter"></a>

- *Implements:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a>

This adapter allows the intelligent document processing workflow to be triggered by files that are uploaded into a S3 Bucket.

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.Initializer"></a>

```typescript
import { QueuedS3Adapter } from '@cdklabs/cdk-appmod-catalog-blueprints'

new QueuedS3Adapter(adapterProps?: QueuedS3AdapterProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.Initializer.parameter.adapterProps">adapterProps</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps">QueuedS3AdapterProps</a></code> | *No description.* |

---

##### `adapterProps`<sup>Optional</sup> <a name="adapterProps" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.Initializer.parameter.adapterProps"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3AdapterProps">QueuedS3AdapterProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createFailedChain">createFailedChain</a></code> | Create the adapter specific handler for failed processing. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createIngressTrigger">createIngressTrigger</a></code> | Create resources that would receive the data and trigger the workflow. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createSuccessChain">createSuccessChain</a></code> | Create the adapter specific handler for successful processing. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.generateAdapterIAMPolicies">generateAdapterIAMPolicies</a></code> | Generate IAM statements that can be used by other resources to access the storage. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.init">init</a></code> | Initializes the adapter. |

---

##### `createFailedChain` <a name="createFailedChain" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createFailedChain"></a>

```typescript
public createFailedChain(scope: Construct, idPrefix?: string): Chain
```

Create the adapter specific handler for failed processing.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createFailedChain.parameter.scope"></a>

- *Type:* constructs.Construct

---

###### `idPrefix`<sup>Optional</sup> <a name="idPrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createFailedChain.parameter.idPrefix"></a>

- *Type:* string

---

##### `createIngressTrigger` <a name="createIngressTrigger" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createIngressTrigger"></a>

```typescript
public createIngressTrigger(scope: Construct, stateMachine: StateMachine, props: BaseDocumentProcessingProps): {[ key: string ]: any}
```

Create resources that would receive the data and trigger the workflow.

Important: resource created should trigger the state machine

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createIngressTrigger.parameter.scope"></a>

- *Type:* constructs.Construct

---

###### `stateMachine`<sup>Required</sup> <a name="stateMachine" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createIngressTrigger.parameter.stateMachine"></a>

- *Type:* aws-cdk-lib.aws_stepfunctions.StateMachine

---

###### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createIngressTrigger.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps">BaseDocumentProcessingProps</a>

---

##### `createSuccessChain` <a name="createSuccessChain" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createSuccessChain"></a>

```typescript
public createSuccessChain(scope: Construct, idPrefix?: string): Chain
```

Create the adapter specific handler for successful processing.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createSuccessChain.parameter.scope"></a>

- *Type:* constructs.Construct

---

###### `idPrefix`<sup>Optional</sup> <a name="idPrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createSuccessChain.parameter.idPrefix"></a>

- *Type:* string

---

##### `generateAdapterIAMPolicies` <a name="generateAdapterIAMPolicies" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.generateAdapterIAMPolicies"></a>

```typescript
public generateAdapterIAMPolicies(additionalIAMActions?: string[], narrowActions?: boolean): PolicyStatement[]
```

Generate IAM statements that can be used by other resources to access the storage.

###### `additionalIAMActions`<sup>Optional</sup> <a name="additionalIAMActions" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.generateAdapterIAMPolicies.parameter.additionalIAMActions"></a>

- *Type:* string[]

---

###### `narrowActions`<sup>Optional</sup> <a name="narrowActions" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.generateAdapterIAMPolicies.parameter.narrowActions"></a>

- *Type:* boolean

---

##### `init` <a name="init" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.init"></a>

```typescript
public init(scope: Construct, props: BaseDocumentProcessingProps): void
```

Initializes the adapter.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.init.parameter.scope"></a>

- *Type:* constructs.Construct

---

###### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.init.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps">BaseDocumentProcessingProps</a>

---




### StateMachineObservabilityPropertyInjector <a name="StateMachineObservabilityPropertyInjector" id="@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector"></a>

- *Implements:* aws-cdk-lib.IPropertyInjector

#### Initializers <a name="Initializers" id="@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.Initializer"></a>

```typescript
import { StateMachineObservabilityPropertyInjector } from '@cdklabs/cdk-appmod-catalog-blueprints'

new StateMachineObservabilityPropertyInjector(logGroupDataProtection: LogGroupDataProtectionProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.Initializer.parameter.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | *No description.* |

---

##### `logGroupDataProtection`<sup>Required</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.Initializer.parameter.logGroupDataProtection"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.inject">inject</a></code> | The injector to be applied to the constructor properties of the Construct. |

---

##### `inject` <a name="inject" id="@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.inject"></a>

```typescript
public inject(originalProps: any, _context: InjectionContext): any
```

The injector to be applied to the constructor properties of the Construct.

###### `originalProps`<sup>Required</sup> <a name="originalProps" id="@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.inject.parameter.originalProps"></a>

- *Type:* any

---

###### `_context`<sup>Required</sup> <a name="_context" id="@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.inject.parameter._context"></a>

- *Type:* aws-cdk-lib.InjectionContext

---


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.property.constructUniqueId">constructUniqueId</a></code> | <code>string</code> | The unique Id of the Construct class. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | *No description.* |

---

##### `constructUniqueId`<sup>Required</sup> <a name="constructUniqueId" id="@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.property.constructUniqueId"></a>

```typescript
public readonly constructUniqueId: string;
```

- *Type:* string

The unique Id of the Construct class.

---

##### `logGroupDataProtection`<sup>Required</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.StateMachineObservabilityPropertyInjector.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>

---


## Protocols <a name="Protocols" id="Protocols"></a>

### IAdapter <a name="IAdapter" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter"></a>

- *Implemented By:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter">QueuedS3Adapter</a>, <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter">IAdapter</a>

Abstraction to enable different types of source triggers for the intelligent document processing workflow.

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createFailedChain">createFailedChain</a></code> | Create the adapter specific handler for failed processing. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createIngressTrigger">createIngressTrigger</a></code> | Create resources that would receive the data and trigger the workflow. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createSuccessChain">createSuccessChain</a></code> | Create the adapter specific handler for successful processing. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.generateAdapterIAMPolicies">generateAdapterIAMPolicies</a></code> | Generate IAM statements that can be used by other resources to access the storage. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.init">init</a></code> | Initializes the adapter. |

---

##### `createFailedChain` <a name="createFailedChain" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createFailedChain"></a>

```typescript
public createFailedChain(scope: Construct, idPrefix?: string): Chain
```

Create the adapter specific handler for failed processing.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createFailedChain.parameter.scope"></a>

- *Type:* constructs.Construct

Scope to use in relation to the CDK hierarchy.

---

###### `idPrefix`<sup>Optional</sup> <a name="idPrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createFailedChain.parameter.idPrefix"></a>

- *Type:* string

Optional prefix for construct IDs to ensure uniqueness when called multiple times.

---

##### `createIngressTrigger` <a name="createIngressTrigger" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createIngressTrigger"></a>

```typescript
public createIngressTrigger(scope: Construct, stateMachine: StateMachine, props: BaseDocumentProcessingProps): {[ key: string ]: any}
```

Create resources that would receive the data and trigger the workflow.

Important: resource created should trigger the state machine

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createIngressTrigger.parameter.scope"></a>

- *Type:* constructs.Construct

Scope to use in relation to the CDK hierarchy.

---

###### `stateMachine`<sup>Required</sup> <a name="stateMachine" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createIngressTrigger.parameter.stateMachine"></a>

- *Type:* aws-cdk-lib.aws_stepfunctions.StateMachine

The workflow of the document processor.

---

###### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createIngressTrigger.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps">BaseDocumentProcessingProps</a>

The parameters passed to the document processing L3 Construct.

---

##### `createSuccessChain` <a name="createSuccessChain" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createSuccessChain"></a>

```typescript
public createSuccessChain(scope: Construct, idPrefix?: string): Chain
```

Create the adapter specific handler for successful processing.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createSuccessChain.parameter.scope"></a>

- *Type:* constructs.Construct

Scope to use in relation to the CDK hierarchy.

---

###### `idPrefix`<sup>Optional</sup> <a name="idPrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createSuccessChain.parameter.idPrefix"></a>

- *Type:* string

Optional prefix for construct IDs to ensure uniqueness when called multiple times.

---

##### `generateAdapterIAMPolicies` <a name="generateAdapterIAMPolicies" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.generateAdapterIAMPolicies"></a>

```typescript
public generateAdapterIAMPolicies(additionalIAMActions?: string[], narrowActions?: boolean): PolicyStatement[]
```

Generate IAM statements that can be used by other resources to access the storage.

###### `additionalIAMActions`<sup>Optional</sup> <a name="additionalIAMActions" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.generateAdapterIAMPolicies.parameter.additionalIAMActions"></a>

- *Type:* string[]

(Optional) list of additional actions in relation to the underlying storage for the adapter.

---

###### `narrowActions`<sup>Optional</sup> <a name="narrowActions" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.generateAdapterIAMPolicies.parameter.narrowActions"></a>

- *Type:* boolean

(Optional) whether the resulting permissions would only be the IAM actions indicated in the `additionalIAMActions` parameter.

---

##### `init` <a name="init" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.init"></a>

```typescript
public init(scope: Construct, props: BaseDocumentProcessingProps): void
```

Initializes the adapter.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.init.parameter.scope"></a>

- *Type:* constructs.Construct

Scope to use in relation to the CDK hierarchy.

---

###### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.init.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessingProps">BaseDocumentProcessingProps</a>

The parameters passed to the document processing L3 Construct.

---


### IKnowledgeBase <a name="IKnowledgeBase" id="@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase"></a>

- *Implemented By:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseKnowledgeBase">BaseKnowledgeBase</a>, <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockKnowledgeBase">BedrockKnowledgeBase</a>, <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase">IKnowledgeBase</a>

Interface for knowledge base implementations.

This interface defines the contract that all knowledge base implementations must satisfy,
allowing different KB backends (Bedrock KB, OpenSearch, custom) to be used interchangeably
with the agent framework.

Implementations of this interface are responsible for:
- Providing metadata about the knowledge base (name, description)
- Generating the IAM permissions required for the agent to access the KB
- Exporting runtime configuration for the retrieval tool
- Optionally providing a custom retrieval tool implementation

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.exportConfiguration">exportConfiguration</a></code> | Export configuration for runtime use by the retrieval tool. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.generateIamPermissions">generateIamPermissions</a></code> | Generate IAM policy statements required for accessing this knowledge base. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.retrievalToolAsset">retrievalToolAsset</a></code> | Provide the retrieval tool asset for this knowledge base type. |

---

##### `exportConfiguration` <a name="exportConfiguration" id="@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.exportConfiguration"></a>

```typescript
public exportConfiguration(): KnowledgeBaseRuntimeConfig
```

Export configuration for runtime use by the retrieval tool.

This method returns a configuration object that will be serialized
and passed to the retrieval tool via environment variables. The
configuration includes all information needed to query the KB at runtime.

##### `generateIamPermissions` <a name="generateIamPermissions" id="@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.generateIamPermissions"></a>

```typescript
public generateIamPermissions(): PolicyStatement[]
```

Generate IAM policy statements required for accessing this knowledge base.

This method returns the IAM permissions that the agent's Lambda function
role needs to query this knowledge base. The permissions should follow
the principle of least privilege, scoped to the specific resources.

##### `retrievalToolAsset` <a name="retrievalToolAsset" id="@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.retrievalToolAsset"></a>

```typescript
public retrievalToolAsset(): Asset
```

Provide the retrieval tool asset for this knowledge base type.

This optional method allows knowledge base implementations to provide
a custom retrieval tool. If not implemented or returns undefined,
the framework's default retrieval tool will be used.

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.property.description">description</a></code> | <code>string</code> | Human-readable description of what this knowledge base contains. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.property.name">name</a></code> | <code>string</code> | Human-readable name for this knowledge base. |

---

##### `description`<sup>Required</sup> <a name="description" id="@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string

Human-readable description of what this knowledge base contains.

This description is included in the agent's system prompt to help
the agent decide when to query this knowledge base. It should clearly
indicate what type of information the KB contains and when it should
be used.

---

*Example*

```typescript
'Contains product documentation, user guides, and FAQs. Use when answering questions about product features or troubleshooting.'
```


##### `name`<sup>Required</sup> <a name="name" id="@cdklabs/cdk-appmod-catalog-blueprints.IKnowledgeBase.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

Human-readable name for this knowledge base.

This name is used for logging, display purposes, and to help the agent
identify which knowledge base to query. It should be unique within
the set of knowledge bases configured for an agent.

---

*Example*

```typescript
'product-documentation'
```


### IObservable <a name="IObservable" id="@cdklabs/cdk-appmod-catalog-blueprints.IObservable"></a>

- *Implemented By:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessing">AgenticDocumentProcessing</a>, <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BaseDocumentProcessing">BaseDocumentProcessing</a>, <a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing">BedrockDocumentProcessing</a>, <a href="#@cdklabs/cdk-appmod-catalog-blueprints.IObservable">IObservable</a>

Interface providing configuration parameters for constructs that support Observability.

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IObservable.metrics">metrics</a></code> | *No description.* |

---

##### `metrics` <a name="metrics" id="@cdklabs/cdk-appmod-catalog-blueprints.IObservable.metrics"></a>

```typescript
public metrics(): IMetric[]
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IObservable.property.logGroupDataProtection">logGroupDataProtection</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IObservable.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.IObservable.property.metricServiceName">metricServiceName</a></code> | <code>string</code> | *No description.* |

---

##### `logGroupDataProtection`<sup>Required</sup> <a name="logGroupDataProtection" id="@cdklabs/cdk-appmod-catalog-blueprints.IObservable.property.logGroupDataProtection"></a>

```typescript
public readonly logGroupDataProtection: LogGroupDataProtectionProps;
```

- *Type:* <a href="#@cdklabs/cdk-appmod-catalog-blueprints.LogGroupDataProtectionProps">LogGroupDataProtectionProps</a>

---

##### `metricNamespace`<sup>Required</sup> <a name="metricNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.IObservable.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string

---

##### `metricServiceName`<sup>Required</sup> <a name="metricServiceName" id="@cdklabs/cdk-appmod-catalog-blueprints.IObservable.property.metricServiceName"></a>

```typescript
public readonly metricServiceName: string;
```

- *Type:* string

---

## Enums <a name="Enums" id="Enums"></a>

### BedrockCrossRegionInferencePrefix <a name="BedrockCrossRegionInferencePrefix" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockCrossRegionInferencePrefix"></a>

Cross-region inference prefix options for Bedrock models.

Used to configure inference profiles for improved availability and performance.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockCrossRegionInferencePrefix.US">US</a></code> | US-based cross-region inference profile. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockCrossRegionInferencePrefix.EU">EU</a></code> | EU-based cross-region inference profile. |

---

##### `US` <a name="US" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockCrossRegionInferencePrefix.US"></a>

US-based cross-region inference profile.

---


##### `EU` <a name="EU" id="@cdklabs/cdk-appmod-catalog-blueprints.BedrockCrossRegionInferencePrefix.EU"></a>

EU-based cross-region inference profile.

---


### DatabaseEngine <a name="DatabaseEngine" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseEngine"></a>

Supported database engines.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseEngine.MYSQL">MYSQL</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.DatabaseEngine.POSTGRESQL">POSTGRESQL</a></code> | *No description.* |

---

##### `MYSQL` <a name="MYSQL" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseEngine.MYSQL"></a>

---


##### `POSTGRESQL` <a name="POSTGRESQL" id="@cdklabs/cdk-appmod-catalog-blueprints.DatabaseEngine.POSTGRESQL"></a>

---


### FileType <a name="FileType" id="@cdklabs/cdk-appmod-catalog-blueprints.FileType"></a>

Supported file types for data loading.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileType.SQL">SQL</a></code> | Standard SQL file. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileType.MYSQLDUMP">MYSQLDUMP</a></code> | MySQL dump file generated by mysqldump. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.FileType.PGDUMP">PGDUMP</a></code> | PostgreSQL dump file generated by pg_dump. |

---

##### `SQL` <a name="SQL" id="@cdklabs/cdk-appmod-catalog-blueprints.FileType.SQL"></a>

Standard SQL file.

---


##### `MYSQLDUMP` <a name="MYSQLDUMP" id="@cdklabs/cdk-appmod-catalog-blueprints.FileType.MYSQLDUMP"></a>

MySQL dump file generated by mysqldump.

---


##### `PGDUMP` <a name="PGDUMP" id="@cdklabs/cdk-appmod-catalog-blueprints.FileType.PGDUMP"></a>

PostgreSQL dump file generated by pg_dump.

---

