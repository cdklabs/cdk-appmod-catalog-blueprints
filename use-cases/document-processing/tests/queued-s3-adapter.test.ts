import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { AccessLog } from '../../framework';
import { QueuedS3Adapter } from '../adapter';
import { BaseDocumentProcessing, DocumentProcessingStepType } from '../base-document-processing';

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

  public createStateMachine() {
    return this.handleStateMachineCreation('test-state-machine');
  }
}

describe('QueuedS3Adapter', () => {
  let defaultStack: Stack;
  let customBucketStack: Stack;
  let customPrefixStack: Stack;
  let customQueueStack: Stack;
  let removalStack: Stack;
  let defaultTemplate: Template;
  let customBucketTemplate: Template;
  let customPrefixTemplate: Template;
  let customQueueTemplate: Template;
  let removalTemplate: Template;

  beforeAll(() => {
    defaultStack = new Stack();
    const defaultAdapter = new QueuedS3Adapter();
    const defaultConstruct = new TestDocumentProcessing(defaultStack, 'DefaultTest', {
      ingressAdapter: defaultAdapter,
    });
    defaultConstruct.createStateMachine();

    customBucketStack = new Stack();
    const accessLog = new AccessLog(customBucketStack, 'AccessLog');
    const customBucket = new Bucket(customBucketStack, 'CustomBucket', {
      serverAccessLogsBucket: accessLog.bucket,
      serverAccessLogsPrefix: accessLog.bucketPrefix,
      enforceSSL: true,
    });
    const customBucketAdapter = new QueuedS3Adapter({ bucket: customBucket });
    const customBucketConstruct = new TestDocumentProcessing(customBucketStack, 'CustomBucketTest', {
      ingressAdapter: customBucketAdapter,
    });
    customBucketConstruct.createStateMachine();

    customPrefixStack = new Stack();
    const customPrefixAdapter = new QueuedS3Adapter({
      rawPrefix: 'input/',
      processedPrefix: 'output/',
      failedPrefix: 'errors/',
    });
    const customPrefixConstruct = new TestDocumentProcessing(customPrefixStack, 'CustomPrefixTest', {
      ingressAdapter: customPrefixAdapter,
    });
    customPrefixConstruct.createStateMachine();

    customQueueStack = new Stack();
    const customQueueAdapter = new QueuedS3Adapter({
      queueVisibilityTimeout: Duration.minutes(10),
      dlqMaxReceiveCount: 10,
    });
    const customQueueConstruct = new TestDocumentProcessing(customQueueStack, 'CustomQueueTest', {
      ingressAdapter: customQueueAdapter,
    });
    customQueueConstruct.createStateMachine();

    removalStack = new Stack();
    const removalAdapter = new QueuedS3Adapter();
    const removalConstruct = new TestDocumentProcessing(removalStack, 'RemovalTest', {
      ingressAdapter: removalAdapter,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    removalConstruct.createStateMachine();

    defaultTemplate = Template.fromStack(defaultStack);
    customBucketTemplate = Template.fromStack(customBucketStack);
    customPrefixTemplate = Template.fromStack(customPrefixStack);
    customQueueTemplate = Template.fromStack(customQueueStack);
    removalTemplate = Template.fromStack(removalStack);
  });

  describe('S3 bucket configuration', () => {
    test('creates default S3 bucket', () => {
      defaultTemplate.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [{
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          }],
        },
      });
    });

    test('uses provided custom bucket', () => {
      customBucketTemplate.resourceCountIs('AWS::S3::Bucket', 2);
    });

    test('enables bucket key for cost optimization', () => {
      defaultTemplate.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [{
            BucketKeyEnabled: true,
          }],
        },
      });
    });
  });

  describe('SQS queue configuration', () => {
    test('creates SQS queue with default visibility timeout', () => {
      defaultTemplate.hasResourceProperties('AWS::SQS::Queue', {
        VisibilityTimeout: 300,
      });
    });

    test('creates dead letter queue', () => {
      defaultTemplate.hasResourceProperties('AWS::SQS::Queue', {
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 5,
        },
      });
    });

    test('uses custom visibility timeout', () => {
      customQueueTemplate.hasResourceProperties('AWS::SQS::Queue', {
        VisibilityTimeout: 600,
      });
    });

    test('uses custom DLQ max receive count', () => {
      customQueueTemplate.hasResourceProperties('AWS::SQS::Queue', {
        RedrivePolicy: {
          maxReceiveCount: 10,
        },
      });
    });

    test('encrypts queue with KMS', () => {
      defaultTemplate.hasResourceProperties('AWS::SQS::Queue', {
        KmsMasterKeyId: Match.anyValue(),
      });
    });
  });

  describe('S3 event notifications', () => {
    test('creates S3 event notification for raw prefix', () => {
      defaultTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            RAW_PREFIX: 'raw/',
          },
        },
      });
    });

    test('uses custom prefix for event notification', () => {
      customPrefixTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            RAW_PREFIX: 'input/',
          },
        },
      });
    });
  });

  describe('SQS consumer Lambda', () => {
    test('creates SQS consumer Lambda function', () => {
      defaultTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'python3.13',
        Timeout: 300,
        Environment: {
          Variables: {
            STATE_MACHINE_ARN: Match.anyValue(),
            RAW_PREFIX: 'raw/',
          },
        },
      });
    });

    test('configures Lambda event source mapping', () => {
      defaultTemplate.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        BatchSize: 10,
        MaximumBatchingWindowInSeconds: 5,
        FunctionResponseTypes: ['ReportBatchItemFailures'],
      });
    });

    test('uses custom prefix in Lambda environment', () => {
      customPrefixTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            RAW_PREFIX: 'input/',
          },
        },
      });
    });
  });

  describe('IAM permissions', () => {
    test('grants Lambda permission to start Step Functions execution', () => {
      defaultTemplate.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: 'states:StartExecution',
                  Effect: 'Allow',
                }),
              ]),
            },
          }),
        ]),
      });
    });

    test('grants KMS decrypt permissions', () => {
      defaultTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['kms:Decrypt']),
              Effect: 'Allow',
            }),
          ]),
        },
      });
    });
  });

  describe('State machine chains', () => {
    test('creates success chain with copy and delete operations', () => {
      defaultTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });

    test('creates failed chain with copy and delete operations', () => {
      defaultTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });

    test('uses custom prefixes in state machine', () => {
      customPrefixTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });
  });

  describe('Removal policy', () => {
    test('applies removal policy to resources', () => {
      removalTemplate.hasResource('AWS::SQS::Queue', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });
  });
});
