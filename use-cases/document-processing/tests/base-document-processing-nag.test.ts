import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { AccessLog } from '../../framework';
import { EventbridgeBroker } from '../../framework/foundation/eventbridge-broker';
import { QueuedS3Adapter } from '../adapter';
import { BaseDocumentProcessing, DocumentProcessingStepType } from '../base-document-processing';

// Concrete test implementation of BaseDocumentProcessing for CDK Nag testing
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

// Create app and stack
const app = new App();
const stack = new Stack(app, 'TestStack', {
  env: {
    account: '123456789012',
    region: 'us-east-1',
  },
});

// Create access log bucket
const accessLog = new AccessLog(stack, 'AccessLog');

// Create S3 bucket with proper configuration
const bucket = new Bucket(stack, 'BaseDocumentProcessingBucket', {
  serverAccessLogsBucket: accessLog.bucket,
  serverAccessLogsPrefix: accessLog.bucketPrefix,
  enforceSSL: true,
});

// Create EventBridge broker
const broker = new EventbridgeBroker(stack, 'TestBroker', {
  name: 'test-broker',
  eventSource: 'test-source',
});

// Create adapter with custom bucket
const adapter = new QueuedS3Adapter({
  bucket,
});

// Create the BaseDocumentProcessing construct
const construct = new TestDocumentProcessing(stack, 'BaseDocumentProcessing', {
  ingressAdapter: adapter,
  eventbridgeBroker: broker,
  enableObservability: true,
});

// Create the state machine
construct.createStateMachine();

// Suppress CDK-managed BucketNotificationsHandler AWS managed policy
NagSuppressions.addResourceSuppressionsByPath(
  stack,
  '/TestStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role',
  [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'CDK-managed BucketNotificationsHandler requires AWSLambdaBasicExecutionRole for S3 event processing',
      appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
    },
  ],
);

// Suppress S3 bucket wildcard permissions for Lambda roles
NagSuppressions.addResourceSuppressions(
  stack,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'Lambda functions require wildcard access to S3 bucket objects for document processing',
      appliesTo: ['Resource::<BaseDocumentProcessingBucketE8E0F6F5.Arn>/*'],
    },
  ],
  true,
);

// Suppress SQS consumer Lambda wildcard permissions for log streams
NagSuppressions.addResourceSuppressions(
  stack,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'Lambda log stream ARN is only known at runtime, wildcard required for CloudWatch Logs access',
    },
  ],
  true,
);

// Suppress StateMachineRole wildcard permissions for Lambda invocation
NagSuppressions.addResourceSuppressionsByPath(
  stack,
  '/TestStack/BaseDocumentProcessing/StateMachineRole/DefaultPolicy',
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'Step Functions requires wildcard permissions to invoke Lambda functions with version-specific ARNs',
    },
  ],
);

// Suppress Lambda log group wildcard permissions
NagSuppressions.addResourceSuppressions(
  stack,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'Lambda log stream names are generated at runtime, wildcard required for CloudWatch Logs access',
    },
  ],
  true,
);

// Suppress Lambda basic execution role
NagSuppressions.addResourceSuppressions(
  stack,
  [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'Test Lambda functions use AWS managed policies for basic execution',
      appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
    },
  ],
  true,
);

// Suppress Lambda runtime version for test functions
NagSuppressions.addResourceSuppressions(
  stack,
  [
    {
      id: 'AwsSolutions-L1',
      reason: 'Test Lambda functions use Node.js 20 which is a supported runtime',
    },
  ],
  true,
);

// Suppress KMS key rotation for test encryption key
NagSuppressions.addResourceSuppressions(
  stack,
  [
    {
      id: 'AwsSolutions-KMS5',
      reason: 'KMS key rotation is enabled by default in BaseDocumentProcessing construct',
    },
  ],
  true,
);

// Apply CDK Nag checks
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Synthesize the stack and check for unsuppressed warnings and errors
const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'));
const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

// Test: No unsuppressed warnings
test('No unsuppressed warnings', () => {
  if (warnings.length > 0) {
    console.log('CDK Nag Warnings:', JSON.stringify(warnings, null, 2));
  }
  expect(warnings).toHaveLength(0);
});

// Test: No unsuppressed errors
test('No unsuppressed errors', () => {
  if (errors.length > 0) {
    console.log('CDK Nag Errors:', JSON.stringify(errors, null, 2));
  }
  expect(errors).toHaveLength(0);
});
