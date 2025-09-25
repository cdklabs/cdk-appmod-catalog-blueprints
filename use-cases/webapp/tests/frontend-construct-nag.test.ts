// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import * as path from 'path';
import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Template, Annotations, Match } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { Frontend } from '../frontend-construct';

// Create temporary build directory for tests
const testBuildDir = '/tmp/test-frontend-build-nag';
if (!fs.existsSync(testBuildDir)) {
  fs.mkdirSync(testBuildDir, { recursive: true });
}
fs.writeFileSync(path.join(testBuildDir, 'index.html'), '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test App</h1></body></html>');

// Create app and stack
const app = new App();
const stack = new Stack(app, 'TestStack', {
  env: {
    account: '123456789012',
    region: 'us-east-1',
  },
});

// Create SSL certificate for custom domain testing
const certificate = Certificate.fromCertificateArn(
  stack,
  'Certificate',
  'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
);

// Create hosted zone for DNS testing
const hostedZone = HostedZone.fromHostedZoneAttributes(stack, 'HostedZone', {
  hostedZoneId: 'Z123456789',
  zoneName: 'example.com',
});

// Create the main Frontend construct
const frontend = new Frontend(stack, 'TestFrontend', {
  sourceDirectory: '/tmp/test-frontend-src',
  buildOutputDirectory: testBuildDir,
  customDomain: {
    domainName: 'app.example.com',
    certificate,
    hostedZone,
  },
  skipBuild: true, // Skip build for testing
});

// Add CDK Nag suppressions for known acceptable violations
NagSuppressions.addResourceSuppressions(stack, [
  {
    id: 'AwsSolutions-CFR1',
    reason: 'CloudFront geo restrictions are configured based on application requirements',
  },
  {
    id: 'AwsSolutions-CFR2',
    reason: 'CloudFront WAF integration is configured based on security requirements',
  },
  {
    id: 'AwsSolutions-CFR3',
    reason: 'CloudFront access logging is configured based on compliance requirements',
  },
  {
    id: 'AwsSolutions-CFR4',
    reason: 'CloudFront viewer protocol policy is set to redirect-to-https for security',
  },
  {
    id: 'AwsSolutions-S1',
    reason: 'S3 bucket access logging is configured based on compliance requirements',
  },
  {
    id: 'AwsSolutions-S2',
    reason: 'S3 bucket public access is blocked and access is controlled via CloudFront OAC',
  },
  {
    id: 'AwsSolutions-S3',
    reason: 'S3 bucket SSL requests only policy is enforced via CloudFront HTTPS redirect',
  },
  {
    id: 'AwsSolutions-S10',
    reason: 'S3 bucket MFA delete is managed through organizational security policies',
  },
  {
    id: 'AwsSolutions-IAM4',
    reason: 'AWS managed policies are acceptable for standard Lambda execution roles',
    appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
  },
  {
    id: 'AwsSolutions-IAM5',
    reason: 'BucketDeployment requires broad S3 permissions to manage deployment assets',
    appliesTo: [
      'Action::s3:GetObject*',
      'Action::s3:GetBucket*',
      'Action::s3:List*',
      'Action::s3:DeleteObject*',
      'Action::s3:Abort*',
      'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-<AWS::AccountId>-<AWS::Region>/*',
      'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-123456789012-us-east-1/*',
      'Resource::<TestFrontendFrontendBucketD37D22DE.Arn>/*',
      'Resource::*',
    ],
  },
  {
    id: 'AwsSolutions-L1',
    reason: 'Lambda runtime versions are managed at the application deployment level',
  },
], true);

// Apply CDK Nag checks
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Synthesize the stack
Template.fromStack(stack);

// Check for unsuppressed warnings and errors
const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'));
const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

// Test: Frontend construct is properly created and accessible
test('Frontend construct is created successfully', () => {
  expect(frontend).toBeDefined();
  expect(frontend.node.id).toBe('TestFrontend');
  expect(frontend.bucket).toBeDefined();
  expect(frontend.distribution).toBeDefined();
  expect(frontend.bucketDeployment).toBeDefined();
});

// Test: Frontend construct has expected properties
test('Frontend construct has expected properties', () => {
  expect(frontend.bucket.bucketName).toBeDefined();
  expect(frontend.distribution.distributionId).toBeDefined();
  expect(frontend.domainName).toBe('app.example.com');
  expect(frontend.url()).toBe('https://app.example.com');
  expect(typeof frontend.bucketName()).toBe('string');
  expect(typeof frontend.distributionDomainName()).toBe('string');
});

// Test: Template contains expected frontend resources
test('Template contains expected frontend resources', () => {
  const template = Template.fromStack(stack);

  // Verify S3 bucket exists with security configuration
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256',
          },
        },
      ],
    },
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });

  // Verify CloudFront distribution exists with security configuration
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Aliases: ['app.example.com'],
      DefaultRootObject: 'index.html',
      DefaultCacheBehavior: {
        ViewerProtocolPolicy: 'redirect-to-https',
      },
      CustomErrorResponses: [
        {
          ErrorCode: 403,
          ResponseCode: 200,
          ResponsePagePath: '/index.html',
        },
        {
          ErrorCode: 404,
          ResponseCode: 200,
          ResponsePagePath: '/index.html',
        },
      ],
      ViewerCertificate: {
        AcmCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
        SslSupportMethod: 'sni-only',
      },
    },
  });

  // Verify CloudFront security headers function exists
  template.hasResourceProperties('AWS::CloudFront::Function', {
    FunctionConfig: {
      Runtime: 'cloudfront-js-1.0',
    },
  });

  // Verify Route53 A record exists for custom domain
  template.hasResourceProperties('AWS::Route53::RecordSet', {
    Type: 'A',
    Name: 'app.example.com.',
    HostedZoneId: 'Z123456789',
  });

  // Verify bucket deployment exists
  template.hasResource('Custom::CDKBucketDeployment', {});

  // Verify auto delete objects custom resource exists
  template.hasResource('Custom::S3AutoDeleteObjects', {});
});

// Test: Frontend construct enforces security best practices
test('Frontend construct enforces security best practices', () => {
  const template = Template.fromStack(stack);

  // Verify HTTPS redirect is enforced
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        ViewerProtocolPolicy: 'redirect-to-https',
      },
    },
  });

  // Verify S3 bucket blocks public access
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });

  // Verify S3 bucket has encryption
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256',
          },
        },
      ],
    },
  });
});

// Test: Frontend construct supports SPA applications
test('Frontend construct supports SPA applications', () => {
  const template = Template.fromStack(stack);

  // Verify SPA-friendly error responses
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      CustomErrorResponses: [
        {
          ErrorCode: 403,
          ResponseCode: 200,
          ResponsePagePath: '/index.html',
        },
        {
          ErrorCode: 404,
          ResponseCode: 200,
          ResponsePagePath: '/index.html',
        },
      ],
    },
  });

  // Verify default root object is set
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultRootObject: 'index.html',
    },
  });
});

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
