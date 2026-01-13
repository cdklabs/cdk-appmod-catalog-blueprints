import { Stack, Aspects } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { AccessLog } from '../../framework';
import { EventbridgeBroker } from '../../framework/foundation/eventbridge-broker';
import { QueuedS3Adapter } from '../adapter';
import { BedrockDocumentProcessing } from '../bedrock-document-processing';

describe('BedrockDocumentProcessing CDK Nag', () => {
  test('passes CDK Nag checks with all configurations', () => {
    const stack = new Stack(undefined, 'BedrockDocProcessingStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    // Create EventBridge broker
    const broker = new EventbridgeBroker(stack, 'IDPBroker', {
      name: 'idp-broker',
      eventSource: 'intelligent-document-processing',
    });

    const accessLog = new AccessLog(stack, 'AccessLog');

    // Create S3 bucket
    const bucket = new Bucket(stack, 'BedrockDocumentProcessingBucket', {
      serverAccessLogsBucket: accessLog.bucket,
      serverAccessLogsPrefix: accessLog.bucketPrefix,
      enforceSSL: true,
    });

    const adapter = new QueuedS3Adapter({
      bucket,
    });

    // Create the main BedrockDocumentProcessing construct
    new BedrockDocumentProcessing(stack, 'BedrockDocumentProcessing', {
      ingressAdapter: adapter,
      classificationBedrockModel: { useCrossRegionInference: true },
      processingBedrockModel: { useCrossRegionInference: true },
      eventbridgeBroker: broker,
      enableObservability: true,
    });

    // Suppress CDK-managed BucketNotificationsHandler AWS managed policy
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/BedrockDocProcessingStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role',
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
          appliesTo: ['Resource::<BedrockDocumentProcessingBucketA06CA1E2.Arn>/*'],
        },
      ],
      true,
    );

    // Suppress Bedrock foundation model wildcard permissions
    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Cross-region inference requires wildcard region access to Bedrock foundation models',
          appliesTo: ['Resource::arn:aws:bedrock:*::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0'],
        },
      ],
      true,
    );

    // Suppress Lambda log stream wildcard permissions
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
      '/BedrockDocProcessingStack/BedrockDocumentProcessing/StateMachineRole/DefaultPolicy',
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Step Functions requires wildcard permissions to invoke Lambda functions with version-specific ARNs',
        },
      ],
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
