import { Aspects, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
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

describe('QueuedS3Adapter CDK Nag', () => {
  test('passes CDK Nag checks with all configurations', () => {
    const stack = new Stack(undefined, 'QueuedS3AdapterStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    const accessLog = new AccessLog(stack, 'AccessLog');
    const bucket = new Bucket(stack, 'QueuedS3AdapterBucket', {
      serverAccessLogsBucket: accessLog.bucket,
      serverAccessLogsPrefix: accessLog.bucketPrefix,
      enforceSSL: true,
    });

    const adapter = new QueuedS3Adapter({ bucket });
    const construct = new TestDocumentProcessing(stack, 'QueuedS3AdapterTest', {
      ingressAdapter: adapter,
      removalPolicy: RemovalPolicy.DESTROY,
      enableObservability: true,
    });
    construct.createStateMachine();

    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/QueuedS3AdapterStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role',
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'CDK-managed BucketNotificationsHandler requires AWSLambdaBasicExecutionRole for S3 event processing',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        },
      ],
    );

    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda functions require wildcard access to S3 bucket objects for document processing',
          appliesTo: ['Resource::<QueuedS3AdapterBucketE8A9C7F1.Arn>/*'],
        },
      ],
      true,
    );

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

    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Step Functions requires wildcard permissions to invoke Lambda functions with version-specific ARNs',
        },
      ],
      true,
    );

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

    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

    const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'));
    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

    if (warnings.length > 0) {
      console.log('CDK Nag Warnings:', JSON.stringify(warnings, null, 2));
    }
    if (errors.length > 0) {
      console.log('CDK Nag Errors:', JSON.stringify(errors, null, 2));
    }

    expect(warnings).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});
