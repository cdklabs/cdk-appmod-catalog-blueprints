import { Stack, Duration } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AccessLog } from '../foundation/access-log';

describe('AccessLog', () => {
  let defaultStack: Stack;
  let customNameStack: Stack;
  let customLifecycleStack: Stack;
  let versionedStack: Stack;
  let defaultTemplate: Template;
  let customNameTemplate: Template;
  let customLifecycleTemplate: Template;
  let versionedTemplate: Template;
  let defaultAccessLog: AccessLog;
  let customPrefixAccessLog: AccessLog;

  beforeAll(() => {
    // Default configuration stack
    defaultStack = new Stack(undefined, 'DefaultStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    defaultAccessLog = new AccessLog(defaultStack, 'AccessLog');
    defaultTemplate = Template.fromStack(defaultStack);

    // Custom name stack
    customNameStack = new Stack(undefined, 'CustomNameStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    new AccessLog(customNameStack, 'AccessLog', {
      bucketName: 'custom-logs',
    });
    customNameTemplate = Template.fromStack(customNameStack);

    // Custom lifecycle stack
    customLifecycleStack = new Stack(undefined, 'CustomLifecycleStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    new AccessLog(customLifecycleStack, 'AccessLog', {
      lifecycleRules: [{
        id: 'CustomRule',
        enabled: true,
        expiration: Duration.days(180),
      }],
    });
    customLifecycleTemplate = Template.fromStack(customLifecycleStack);

    // Versioned stack
    versionedStack = new Stack(undefined, 'VersionedStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    new AccessLog(versionedStack, 'AccessLog', { versioned: true });
    versionedTemplate = Template.fromStack(versionedStack);

    // Custom prefix stack (for getLogPath tests)
    const customPrefixStack = new Stack(undefined, 'CustomPrefixStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    customPrefixAccessLog = new AccessLog(customPrefixStack, 'AccessLog', {
      bucketPrefix: 'custom-prefix',
    });
  });

  test('creates bucket with default configuration', () => {
    defaultTemplate.resourceCountIs('AWS::S3::Bucket', 1);
    defaultTemplate.hasResourceProperties('AWS::S3::Bucket', {
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
    customNameTemplate.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'custom-logs-123456789012-us-east-1',
    });
  });

  test('applies default lifecycle rules', () => {
    defaultTemplate.hasResourceProperties('AWS::S3::Bucket', {
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
    customLifecycleTemplate.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: [Match.objectLike({ ExpirationInDays: 180 })],
      },
    });
  });

  test('enables versioning when specified', () => {
    versionedTemplate.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });

  test('adds bucket policy for S3 and CloudWatch Logs', () => {
    defaultTemplate.hasResourceProperties('AWS::S3::BucketPolicy', {
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
    defaultTemplate.hasResourceProperties('AWS::S3::BucketPolicy', {
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
    defaultTemplate.hasResourceProperties('AWS::S3::BucketPolicy', {
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
    expect(defaultAccessLog.getLogPath('alb')).toBe('access-logs-123456789012-us-east-1/access-logs/alb');
    expect(defaultAccessLog.getLogPath('alb', 'my-alb')).toBe('access-logs-123456789012-us-east-1/access-logs/alb/my-alb');
  });

  test('getLogUri returns correct S3 URI', () => {
    expect(defaultAccessLog.getLogUri('cloudfront')).toBe('s3://access-logs-123456789012-us-east-1/access-logs/cloudfront');
    expect(defaultAccessLog.getLogUri('cloudfront', 'my-dist')).toBe('s3://access-logs-123456789012-us-east-1/access-logs/cloudfront/my-dist');
  });

  test('uses custom bucket prefix', () => {
    expect(customPrefixAccessLog.getLogPath('s3')).toBe('access-logs-123456789012-us-east-1/custom-prefix/s3');
  });
});
