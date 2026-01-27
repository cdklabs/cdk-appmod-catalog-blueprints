import { Stack, Duration, App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { createTestApp } from '../../utilities/test-utils';
import { AccessLog } from '../foundation/access-log';

describe('AccessLog', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  test('creates bucket with default configuration', () => {
    new AccessLog(stack, 'AccessLog');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'access-logs-123456789012-us-east-1',
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [{
          ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
        }],
      },
      PublicAccessBlockConfiguration: Match.objectLike({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      }),
    });
  });

  test('creates bucket with custom name', () => {
    new AccessLog(stack, 'AccessLog', {
      bucketName: 'custom-logs',
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'custom-logs-123456789012-us-east-1',
    });
  });

  test('applies default lifecycle rules', () => {
    new AccessLog(stack, 'AccessLog');

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Status: 'Enabled',
            Transitions: Match.arrayWith([
              { StorageClass: 'STANDARD_IA', TransitionInDays: 30 },
              { StorageClass: 'GLACIER', TransitionInDays: 90 },
            ]),
            ExpirationInDays: 365,
          }),
        ]),
      },
    });
  });

  test('applies custom lifecycle rules', () => {
    new AccessLog(stack, 'AccessLog', {
      lifecycleRules: [{
        id: 'CustomRule',
        enabled: true,
        expiration: Duration.days(180),
      }],
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: [Match.objectLike({ ExpirationInDays: 180 })],
      },
    });
  });

  test('enables versioning when specified', () => {
    new AccessLog(stack, 'AccessLog', { versioned: true });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });

  test('adds bucket policy for S3 and CloudWatch Logs', () => {
    new AccessLog(stack, 'AccessLog');

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AllowAccessLogDelivery',
            Effect: 'Allow',
            Principal: {
              Service: Match.arrayWith(['logging.s3.amazonaws.com', 'delivery.logs.amazonaws.com']),
            },
            Action: Match.arrayWith(['s3:PutObject', 's3:GetBucketAcl', 's3:ListBucket']),
          }),
        ]),
      },
    });
  });

  test('adds bucket policy for ELB', () => {
    new AccessLog(stack, 'AccessLog');

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AllowELBAccessLogDelivery',
            Effect: 'Allow',
            Principal: { Service: 'elasticloadbalancing.amazonaws.com' },
            Action: 's3:PutObject',
          }),
        ]),
      },
    });
  });

  test('enforces SSL', () => {
    new AccessLog(stack, 'AccessLog');

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Deny',
            Condition: { Bool: { 'aws:SecureTransport': 'false' } },
          }),
        ]),
      },
    });
  });

  test('getLogPath returns correct path', () => {
    const accessLog = new AccessLog(stack, 'AccessLog');
    expect(accessLog.getLogPath('alb')).toBe('access-logs-123456789012-us-east-1/access-logs/alb');
    expect(accessLog.getLogPath('alb', 'my-alb')).toBe('access-logs-123456789012-us-east-1/access-logs/alb/my-alb');
  });

  test('getLogUri returns correct S3 URI', () => {
    const accessLog = new AccessLog(stack, 'AccessLog');
    expect(accessLog.getLogUri('cloudfront')).toBe('s3://access-logs-123456789012-us-east-1/access-logs/cloudfront');
    expect(accessLog.getLogUri('cloudfront', 'my-dist')).toBe('s3://access-logs-123456789012-us-east-1/access-logs/cloudfront/my-dist');
  });

  test('uses custom bucket prefix', () => {
    const accessLog = new AccessLog(stack, 'AccessLog', {
      bucketPrefix: 'custom-prefix',
    });
    expect(accessLog.getLogPath('s3')).toBe('access-logs-123456789012-us-east-1/custom-prefix/s3');
  });
});
