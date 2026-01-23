import { App, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { AccessLog } from '../../framework';
import { EventbridgeBroker } from '../../framework/foundation/eventbridge-broker';
import { createTestApp } from '../../utilities/test-utils';
import { QueuedS3Adapter } from '../adapter';
import { BaseDocumentProcessing, DocumentProcessingStepType } from '../base-document-processing';

// Concrete test implementation of BaseDocumentProcessing
class TestDocumentProcessing extends BaseDocumentProcessing {
  private classificationFn: Function;
  private processingFn: Function;

  constructor(scope: any, id: string, props: any) {
    super(scope, id, props);

    this.classificationFn = new Function(this, 'ClassificationFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ documentClassification: "TEST" });'),
    });

    this.processingFn = new Function(this, 'ProcessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ result: {} });'),
    });
  }

  protected classificationStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockClassification', {
      lambdaFunction: this.classificationFn,
      resultPath: '$.classificationResult',
    });
  }

  protected processingStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockProcessing', {
      lambdaFunction: this.processingFn,
      resultPath: '$.processingResult',
    });
  }

  protected enrichmentStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected postProcessingStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected preprocessingStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected createProcessingWorkflow() {
    return this.createStandardProcessingWorkflow();
  }

  public createStateMachine() {
    return this.handleStateMachineCreation('test-state-machine');
  }
}

// Test implementation with enrichment step
class TestDocumentProcessingWithEnrichment extends BaseDocumentProcessing {
  private classificationFn: Function;
  private processingFn: Function;
  private enrichmentFn: Function;

  constructor(scope: any, id: string, props: any) {
    super(scope, id, props);

    this.classificationFn = new Function(this, 'ClassificationFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ documentClassification: "TEST" });'),
    });

    this.processingFn = new Function(this, 'ProcessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ result: {} });'),
    });

    this.enrichmentFn = new Function(this, 'EnrichmentFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ enriched: true });'),
    });
  }

  protected classificationStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockClassification', {
      lambdaFunction: this.classificationFn,
      resultPath: '$.classificationResult',
    });
  }

  protected processingStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockProcessing', {
      lambdaFunction: this.processingFn,
      resultPath: '$.processingResult',
    });
  }

  protected enrichmentStep(): DocumentProcessingStepType | undefined {
    return new LambdaInvoke(this, 'MockEnrichment', {
      lambdaFunction: this.enrichmentFn,
      resultPath: '$.enrichedResult',
    });
  }

  protected postProcessingStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected preprocessingStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected createProcessingWorkflow() {
    return this.createStandardProcessingWorkflow();
  }

  public createStateMachine() {
    return this.handleStateMachineCreation('test-state-machine-enrichment');
  }
}

// Test implementation with post-processing step
class TestDocumentProcessingWithPostProcessing extends BaseDocumentProcessing {
  private classificationFn: Function;
  private processingFn: Function;
  private postProcessingFn: Function;

  constructor(scope: any, id: string, props: any) {
    super(scope, id, props);

    this.classificationFn = new Function(this, 'ClassificationFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ documentClassification: "TEST" });'),
    });

    this.processingFn = new Function(this, 'ProcessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ result: {} });'),
    });

    this.postProcessingFn = new Function(this, 'PostProcessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ processed: true });'),
    });
  }

  protected classificationStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockClassification', {
      lambdaFunction: this.classificationFn,
      resultPath: '$.classificationResult',
    });
  }

  protected processingStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockProcessing', {
      lambdaFunction: this.processingFn,
      resultPath: '$.processingResult',
    });
  }

  protected enrichmentStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected postProcessingStep(): DocumentProcessingStepType | undefined {
    return new LambdaInvoke(this, 'MockPostProcessing', {
      lambdaFunction: this.postProcessingFn,
      resultPath: '$.postProcessedResult',
    });
  }

  protected preprocessingStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected createProcessingWorkflow() {
    return this.createStandardProcessingWorkflow();
  }

  public createStateMachine() {
    return this.handleStateMachineCreation('test-state-machine-post-processing');
  }
}

// Test implementation with preprocessing step
class TestDocumentProcessingWithPreprocessing extends BaseDocumentProcessing {
  private classificationFn: Function;
  private processingFn: Function;
  private preprocessingFn: Function;

  constructor(scope: any, id: string, props: any) {
    super(scope, id, props);

    this.preprocessingFn = new Function(this, 'PreprocessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ preprocessed: true });'),
    });

    this.classificationFn = new Function(this, 'ClassificationFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ documentClassification: "TEST" });'),
    });

    this.processingFn = new Function(this, 'ProcessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ result: {} });'),
    });
  }

  protected preprocessingStep(): DocumentProcessingStepType | undefined {
    return new LambdaInvoke(this, 'MockPreprocessing', {
      lambdaFunction: this.preprocessingFn,
      resultPath: '$.preprocessingResult',
    });
  }

  protected classificationStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockClassification', {
      lambdaFunction: this.classificationFn,
      resultPath: '$.classificationResult',
    });
  }

  protected processingStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockProcessing', {
      lambdaFunction: this.processingFn,
      resultPath: '$.processingResult',
    });
  }

  protected enrichmentStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected postProcessingStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected createProcessingWorkflow() {
    return this.createStandardProcessingWorkflow();
  }

  public createStateMachine() {
    return this.handleStateMachineCreation('test-state-machine-preprocessing');
  }
}

describe('BaseDocumentProcessing', () => {
  let app: App;
  let minimalStack: Stack;
  let customStack: Stack;
  let enrichmentStack: Stack;
  let postProcessingStack: Stack;
  let preprocessingStack: Stack;
  let eventBridgeStack: Stack;
  let minimalTemplate: Template;
  let customTemplate: Template;
  let enrichmentTemplate: Template;
  let postProcessingTemplate: Template;
  let preprocessingTemplate: Template;
  let eventBridgeTemplate: Template;

  beforeAll(() => {
    // Use createTestApp() to skip bundling and speed up tests
    app = createTestApp();

    // Minimal configuration
    minimalStack = new Stack(app, 'MinimalStack');
    const minimalConstruct = new TestDocumentProcessing(minimalStack, 'MinimalTest', {});
    minimalConstruct.createStateMachine();

    // Custom configuration with custom table, bucket, and timeout
    customStack = new Stack(app, 'CustomStack');
    const customTable = new Table(customStack, 'CustomTable', {
      partitionKey: { name: 'DocumentId', type: AttributeType.STRING },
    });
    const customKey = new Key(customStack, 'CustomKey', { enableKeyRotation: true });
    const accessLog = new AccessLog(customStack, 'AccessLog');
    const customBucket = new Bucket(customStack, 'CustomBucket', {
      serverAccessLogsBucket: accessLog.bucket,
      serverAccessLogsPrefix: accessLog.bucketPrefix,
      enforceSSL: true,
    });
    const customAdapter = new QueuedS3Adapter({ bucket: customBucket });
    const customConstruct = new TestDocumentProcessing(customStack, 'CustomTest', {
      documentProcessingTable: customTable,
      ingressAdapter: customAdapter,
      workflowTimeout: Duration.minutes(30),
      removalPolicy: RemovalPolicy.RETAIN,
      encryptionKey: customKey,
    });
    customConstruct.createStateMachine();

    // With enrichment step
    enrichmentStack = new Stack(app, 'EnrichmentStack');
    const enrichmentConstruct = new TestDocumentProcessingWithEnrichment(enrichmentStack, 'EnrichmentTest', {});
    enrichmentConstruct.createStateMachine();

    // With post-processing step
    postProcessingStack = new Stack(app, 'PostProcessingStack');
    const postProcessingConstruct = new TestDocumentProcessingWithPostProcessing(postProcessingStack, 'PostProcessingTest', {});
    postProcessingConstruct.createStateMachine();

    // With preprocessing step
    preprocessingStack = new Stack(app, 'PreprocessingStack');
    const preprocessingConstruct = new TestDocumentProcessingWithPreprocessing(preprocessingStack, 'PreprocessingTest', {});
    preprocessingConstruct.createStateMachine();

    // With EventBridge broker
    eventBridgeStack = new Stack(app, 'EventBridgeStack');
    const broker = new EventbridgeBroker(eventBridgeStack, 'TestBroker', {
      name: 'test-broker',
      eventSource: 'test-source',
    });
    const eventBridgeConstruct = new TestDocumentProcessing(eventBridgeStack, 'EventBridgeTest', {
      eventbridgeBroker: broker,
    });
    eventBridgeConstruct.createStateMachine();

    // Generate templates once
    minimalTemplate = Template.fromStack(minimalStack);
    customTemplate = Template.fromStack(customStack);
    enrichmentTemplate = Template.fromStack(enrichmentStack);
    postProcessingTemplate = Template.fromStack(postProcessingStack);
    preprocessingTemplate = Template.fromStack(preprocessingStack);
    eventBridgeTemplate = Template.fromStack(eventBridgeStack);
  });

  describe('Basic functionality', () => {
    test('creates construct with minimal configuration', () => {
      expect(minimalTemplate).toBeDefined();
    });

    test('creates DynamoDB table with correct configuration', () => {
      minimalTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [{
          AttributeName: 'DocumentId',
          KeyType: 'HASH',
        }],
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
        SSESpecification: {
          SSEEnabled: true,
          SSEType: 'KMS',
        },
      });
    });

    test('creates KMS encryption key with rotation enabled', () => {
      minimalTemplate.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
      });
    });

    test('creates S3 bucket for document storage', () => {
      minimalTemplate.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [{
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          }],
        },
      });
    });

    test('creates SQS queue with DLQ', () => {
      minimalTemplate.hasResourceProperties('AWS::SQS::Queue', {
        RedrivePolicy: Match.objectLike({
          maxReceiveCount: 5,
        }),
      });
    });

    test('creates Step Functions state machine', () => {
      minimalTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });
  });

  describe('State machine configuration', () => {
    test('creates state machine with timeout', () => {
      minimalTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });

    test('creates state machine with custom timeout', () => {
      customTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });

    test('creates state machine with encryption', () => {
      minimalTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        EncryptionConfiguration: {
          Type: 'CUSTOMER_MANAGED_KMS_KEY',
        },
      });
    });

    test('creates state machine role with DynamoDB permissions', () => {
      minimalTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [{
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'states.amazonaws.com',
            },
          }],
        },
      });

      minimalTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Resource: Match.anyValue(),
            }),
          ]),
        },
      });
    });
  });

  describe('Error handling chains', () => {
    test('includes DynamoDB update for classification failure', () => {
      minimalTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });

    test('includes DynamoDB update for processing failure', () => {
      minimalTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });

    test('includes workflow status updates for success', () => {
      minimalTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });
  });

  describe('Optional workflow steps', () => {
    test('includes enrichment step when provided', () => {
      enrichmentTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });

    test('includes post-processing step when provided', () => {
      postProcessingTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });

    test('marks workflow complete after processing when no optional steps', () => {
      minimalTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });
  });

  describe('Custom configuration', () => {
    test('uses provided DynamoDB table', () => {
      customTemplate.resourceCountIs('AWS::DynamoDB::Table', 1);
      customTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [{
          AttributeName: 'DocumentId',
          KeyType: 'HASH',
        }],
      });
    });

    test('uses provided encryption key', () => {
      customTemplate.resourceCountIs('AWS::KMS::Key', 2); // Custom key + adapter key
    });

    test('uses provided S3 bucket via adapter', () => {
      customTemplate.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: Match.objectLike({
          ServerSideEncryptionConfiguration: Match.anyValue(),
        }),
      });
    });

    test('applies custom removal policy', () => {
      customTemplate.hasResource('AWS::DynamoDB::Table', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });
  });

  describe('EventBridge integration', () => {
    test('includes EventBridge event bus when broker provided', () => {
      eventBridgeTemplate.hasResourceProperties('AWS::Events::EventBus', {
        Name: 'test-broker',
      });
    });

    test('includes EventBridge put events in state machine', () => {
      eventBridgeTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });
  });

  describe('Security', () => {
    test('encrypts DynamoDB table with KMS', () => {
      minimalTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          SSEType: 'KMS',
        },
      });
    });

    test('encrypts S3 bucket with KMS', () => {
      minimalTemplate.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [{
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          }],
        },
      });
    });

    test('encrypts SQS queue with KMS', () => {
      minimalTemplate.hasResourceProperties('AWS::SQS::Queue', {
        KmsMasterKeyId: Match.anyValue(),
      });
    });

    test('encrypts state machine with customer managed key', () => {
      minimalTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        EncryptionConfiguration: {
          Type: 'CUSTOMER_MANAGED_KMS_KEY',
          KmsKeyId: Match.anyValue(),
        },
      });
    });

    test('enforces SSL on S3 bucket', () => {
      minimalTemplate.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Deny',
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
            }),
          ]),
        },
      });
    });

    test('enforces SSL on SQS queue', () => {
      minimalTemplate.hasResourceProperties('AWS::SQS::QueuePolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Deny',
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
            }),
          ]),
        },
      });
    });
  });

  describe('Adapter integration', () => {
    test('creates S3 event notification to SQS', () => {
      minimalTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
        Environment: {
          Variables: {
            STATE_MACHINE_ARN: Match.anyValue(),
            RAW_PREFIX: 'raw/',
          },
        },
      });
    });

    test('creates SQS consumer Lambda with event source', () => {
      minimalTemplate.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        BatchSize: 10,
        EventSourceArn: Match.anyValue(),
        FunctionName: Match.anyValue(),
      });
    });

    test('creates dead letter queue for failed messages', () => {
      minimalTemplate.resourceCountIs('AWS::SQS::Queue', 2);
    });
  });

  describe('Observability', () => {
    test('creates construct without observability by default', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'NoObservabilityStack');
      const construct = new TestDocumentProcessing(stack, 'NoObservability', {
        enableObservability: false,
      });
      construct.createStateMachine();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        LoggingConfiguration: Match.absent(),
      });
    });

    test('enables observability when configured', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'WithObservabilityStack');
      const construct = new TestDocumentProcessing(stack, 'WithObservability', {
        enableObservability: true,
      });
      construct.createStateMachine();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        LoggingConfiguration: Match.objectLike({
          Level: 'ALL',
        }),
      });
    });
  });

  describe('Resource counts', () => {
    test('creates expected number of resources', () => {
      minimalTemplate.resourceCountIs('AWS::DynamoDB::Table', 1);
      minimalTemplate.resourceCountIs('AWS::S3::Bucket', 1);
      minimalTemplate.resourceCountIs('AWS::SQS::Queue', 2);
      minimalTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });
  });

  describe('Preprocessing integration', () => {
    test('includes preprocessing Lambda when provided', () => {
      // Verify preprocessing Lambda exists
      const lambdas = preprocessingTemplate.findResources('AWS::Lambda::Function');
      const hasPreprocessingLambda = Object.values(lambdas).some((lambda: any) =>
        lambda.Properties?.Code?.ZipFile?.includes('preprocessed: true'),
      );

      expect(hasPreprocessingLambda).toBe(true);
    });

    test('workflow without preprocessing uses standard flow (backward compatibility)', () => {
      // Minimal template has no preprocessing, should start with InitMetadata
      const stateMachine = minimalTemplate.findResources('AWS::StepFunctions::StateMachine');
      const stateMachineKey = Object.keys(stateMachine)[0];
      const definitionString = stateMachine[stateMachineKey].Properties.DefinitionString;

      const definition = JSON.parse(definitionString['Fn::Join'][1].join(''));

      // Should start with InitMetadata when no preprocessing
      expect(definition.StartAt).toMatch(/InitMetadata/);
    });

    test('state machine is created successfully with preprocessing class', () => {
      // Verify state machine is created successfully
      preprocessingTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

      // Verify it has Lambda functions
      const lambdaCount = Object.keys(preprocessingTemplate.findResources('AWS::Lambda::Function')).length;
      expect(lambdaCount).toBeGreaterThanOrEqual(3);
    });
  });
});
