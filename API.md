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
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.additionalPolicyStatementsForTools">additionalPolicyStatementsForTools</a></code> | <code>aws-cdk-lib.aws_iam.PolicyStatement[]</code> | If tools need additional IAM permissions, these statements would be attached to the Agent's IAM role. |
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

##### `additionalPolicyStatementsForTools`<sup>Optional</sup> <a name="additionalPolicyStatementsForTools" id="@cdklabs/cdk-appmod-catalog-blueprints.AgentDefinitionProps.property.additionalPolicyStatementsForTools"></a>

```typescript
public readonly additionalPolicyStatementsForTools: PolicyStatement[];
```

- *Type:* aws-cdk-lib.aws_iam.PolicyStatement[]

If tools need additional IAM permissions, these statements would be attached to the Agent's IAM role.

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
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.classificationBedrockModel">classificationBedrockModel</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a></code> | Bedrock foundation model for document classification step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.AgenticDocumentProcessingProps.property.classificationPrompt">classificationPrompt</a></code> | <code>string</code> | Custom prompt template for document classification. |
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
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.classificationBedrockModel">classificationBedrockModel</a></code> | <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockModelProps">BedrockModelProps</a></code> | Bedrock foundation model for document classification step. |
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessingProps.property.classificationPrompt">classificationPrompt</a></code> | <code>string</code> | Custom prompt template for document classification. |
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
| <code><a href="#@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig">generateDefaultLambdaConfig</a></code> | *No description.* |

---

##### `generateDefaultLambdaConfig` <a name="generateDefaultLambdaConfig" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig"></a>

```typescript
import { PowertoolsConfig } from '@cdklabs/cdk-appmod-catalog-blueprints'

PowertoolsConfig.generateDefaultLambdaConfig(enableObservability?: boolean, metricsNamespace?: string, serviceName?: string)
```

###### `enableObservability`<sup>Optional</sup> <a name="enableObservability" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig.parameter.enableObservability"></a>

- *Type:* boolean

---

###### `metricsNamespace`<sup>Optional</sup> <a name="metricsNamespace" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig.parameter.metricsNamespace"></a>

- *Type:* string

---

###### `serviceName`<sup>Optional</sup> <a name="serviceName" id="@cdklabs/cdk-appmod-catalog-blueprints.PowertoolsConfig.generateDefaultLambdaConfig.parameter.serviceName"></a>

- *Type:* string

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
public createFailedChain(scope: Construct): Chain
```

Create the adapter specific handler for failed processing.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createFailedChain.parameter.scope"></a>

- *Type:* constructs.Construct

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
public createSuccessChain(scope: Construct): Chain
```

Create the adapter specific handler for successful processing.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.QueuedS3Adapter.createSuccessChain.parameter.scope"></a>

- *Type:* constructs.Construct

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
public createFailedChain(scope: Construct): Chain
```

Create the adapter specific handler for failed processing.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createFailedChain.parameter.scope"></a>

- *Type:* constructs.Construct

Scope to use in relation to the CDK hierarchy.

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
public createSuccessChain(scope: Construct): Chain
```

Create the adapter specific handler for successful processing.

###### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-appmod-catalog-blueprints.IAdapter.createSuccessChain.parameter.scope"></a>

- *Type:* constructs.Construct

Scope to use in relation to the CDK hierarchy.

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

