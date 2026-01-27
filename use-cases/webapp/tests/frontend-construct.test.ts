// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import * as path from 'path';
import { App, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment } from 'aws-cdk-lib/aws-s3-deployment';
import { createTestApp } from '../../utilities/test-utils';
import { Frontend, DEFAULT_SPA_ERROR_RESPONSES } from '../frontend-construct';

// Mock execSync to avoid actual build execution during tests
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('@webapp Frontend', () => {
  let app: App;
  let stack: Stack;
  let template: Template;
  let testBuildDir: string;
  let testSrcDir: string;

  beforeAll(() => {
    // Create a temporary build directory for tests
    testBuildDir = '/tmp/test-frontend-build';
    if (!fs.existsSync(testBuildDir)) {
      fs.mkdirSync(testBuildDir, { recursive: true });
    }
    fs.writeFileSync(path.join(testBuildDir, 'index.html'), '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test App</h1></body></html>');

    // Create a temporary source directory for tests
    testSrcDir = '/tmp/test-frontend-src';
    if (!fs.existsSync(testSrcDir)) {
      fs.mkdirSync(testSrcDir, { recursive: true });
    }

    // Create default build directory inside source directory
    const defaultBuildDir = path.join(testSrcDir, 'build');
    if (!fs.existsSync(defaultBuildDir)) {
      fs.mkdirSync(defaultBuildDir, { recursive: true });
    }
    fs.writeFileSync(path.join(defaultBuildDir, 'index.html'), '<!DOCTYPE html><html><head><title>Default Test</title></head><body><h1>Default Test App</h1></body></html>');
  });

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack');
  });

  describe('@webapp Basic functionality', () => {
    test('@webapp creates frontend construct with minimal configuration', () => {
      const frontend = new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        skipBuild: true, // Skip build for testing
      });

      template = Template.fromStack(stack);

      // Verify S3 bucket is created
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

      // Verify CloudFront distribution is created
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultRootObject: 'index.html',
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

      // Verify security headers function is created
      template.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionConfig: {
          Runtime: 'cloudfront-js-1.0',
        },
      });

      // Verify bucket deployment is created
      template.hasResource('Custom::CDKBucketDeployment', {});

      // Test public methods
      expect(frontend.bucket).toBeInstanceOf(Bucket);
      expect(frontend.distribution).toBeInstanceOf(Distribution);
      expect(frontend.bucketDeployment).toBeInstanceOf(BucketDeployment);
      expect(typeof frontend.distributionDomainName()).toBe('string');
      expect(typeof frontend.bucketName()).toBe('string');
      expect(frontend.url()).toContain('https://');
    });

    test('@webapp creates frontend construct with custom build command', () => {
      new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        buildCommand: 'yarn build',
        skipBuild: true,
      });

      template = Template.fromStack(stack);

      // Should still create the same resources
      template.resourceCountIs('AWS::S3::Bucket', 1);
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });

    test('@webapp creates frontend construct with custom error responses', () => {
      const customErrorResponses = [
        {
          httpStatus: 500,
          responseHttpStatus: 200,
          responsePagePath: '/error.html',
        },
      ];

      new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        errorResponses: customErrorResponses,
        skipBuild: true,
      });

      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CustomErrorResponses: [
            {
              ErrorCode: 500,
              ResponseCode: 200,
              ResponsePagePath: '/error.html',
            },
          ],
        },
      });
    });
  });

  describe('@webapp Custom domain functionality', () => {
    test('@webapp creates frontend construct with custom domain', () => {
      const certificate = Certificate.fromCertificateArn(
        stack,
        'Certificate',
        'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
      );

      const frontend = new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        customDomain: {
          domainName: 'app.example.com',
          certificate,
        },
        skipBuild: true,
      });

      template = Template.fromStack(stack);

      // Verify CloudFront distribution has custom domain
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Aliases: ['app.example.com'],
          ViewerCertificate: {
            AcmCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
            SslSupportMethod: 'sni-only',
          },
        },
      });

      expect(frontend.domainName).toBe('app.example.com');
      expect(frontend.url()).toBe('https://app.example.com');
    });

    test('@webapp creates frontend construct with custom domain and hosted zone', () => {
      const certificate = Certificate.fromCertificateArn(
        stack,
        'Certificate',
        'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
      );

      const hostedZone = HostedZone.fromHostedZoneAttributes(stack, 'HostedZone', {
        hostedZoneId: 'Z123456789',
        zoneName: 'example.com',
      });

      new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        customDomain: {
          domainName: 'app.example.com',
          certificate,
          hostedZone,
        },
        skipBuild: true,
      });

      template = Template.fromStack(stack);

      // Verify Route53 A record is created
      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Type: 'A',
        Name: 'app.example.com.',
        HostedZoneId: 'Z123456789',
      });
    });
  });

  describe('@webapp Validation', () => {
    test('@webapp throws error when sourceDirectory is missing', () => {
      expect(() => {
        new Frontend(stack, 'Frontend', {
          sourceDirectory: '',
          buildOutputDirectory: testBuildDir,
          skipBuild: true,
        });
      }).toThrow('sourceDirectory is required');
    });

    test('@webapp uses default buildOutputDirectory when not provided', () => {
      // Use the existing test build directory
      const frontend = new Frontend(stack, 'Frontend', {
        sourceDirectory: testSrcDir,
        // buildOutputDirectory not provided - should use default './build/'
        skipBuild: true,
      });

      expect(frontend).toBeDefined();
      // The construct should be created successfully with default buildOutputDirectory
    });

    test('@webapp applies custom removal policy to resources', () => {
      const retainStack = new Stack(app, 'RetainTestStack');
      const frontend = new Frontend(retainStack, 'Frontend', {
        sourceDirectory: testSrcDir,
        buildOutputDirectory: testBuildDir,
        skipBuild: true,
        removalPolicy: RemovalPolicy.RETAIN,
      });

      expect(frontend).toBeDefined();

      // Check that the bucket has the correct removal policy
      const retainTemplate = Template.fromStack(retainStack);
      retainTemplate.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    test('@webapp uses default DESTROY removal policy when not specified', () => {
      const destroyStack = new Stack(app, 'DestroyTestStack');
      const frontend = new Frontend(destroyStack, 'Frontend', {
        sourceDirectory: testSrcDir,
        buildOutputDirectory: testBuildDir,
        skipBuild: true,
        // removalPolicy not specified - should default to DESTROY
      });

      expect(frontend).toBeDefined();

      // Check that the bucket has the default DESTROY removal policy
      const destroyTemplate = Template.fromStack(destroyStack);
      destroyTemplate.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });

    test('@webapp throws error when domainName is provided without certificate', () => {
      expect(() => {
        new Frontend(stack, 'Frontend', {
          sourceDirectory: '/tmp/test-frontend-src',
          buildOutputDirectory: testBuildDir,
          customDomain: {
            domainName: 'app.example.com',
          } as any, // Type assertion to bypass TypeScript validation for testing
          skipBuild: true,
        });
      }).toThrow('certificate is required when domainName is provided');
    });
  });

  describe('@webapp Security features', () => {
    test('@webapp creates S3 bucket with security best practices', () => {
      new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        skipBuild: true,
      });

      template = Template.fromStack(stack);

      // Verify S3 bucket security settings
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
    });

    test('@webapp creates CloudFront distribution with security headers', () => {
      new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        skipBuild: true,
      });

      template = Template.fromStack(stack);

      // Verify security headers function exists
      template.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionConfig: {
          Runtime: 'cloudfront-js-1.0',
        },
      });

      // Verify HTTPS redirect is enabled
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'redirect-to-https',
          },
        },
      });
    });

    test('@webapp enables auto delete objects on S3 bucket', () => {
      new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        skipBuild: true,
      });

      template = Template.fromStack(stack);

      // Verify auto delete objects custom resource is created
      template.hasResource('Custom::S3AutoDeleteObjects', {});
    });
  });

  describe('@webapp Default values', () => {
    test('@webapp uses default SPA error responses', () => {
      new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        skipBuild: true,
      });

      template = Template.fromStack(stack);

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
    });

    test('@webapp exports default SPA error responses', () => {
      expect(DEFAULT_SPA_ERROR_RESPONSES).toEqual([
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ]);
    });
  });

  describe('@webapp Additional distribution properties', () => {
    test('@webapp accepts additional CloudFront distribution properties', () => {
      new Frontend(stack, 'Frontend', {
        sourceDirectory: '/tmp/test-frontend-src',
        buildOutputDirectory: testBuildDir,
        distributionProps: {
          comment: 'Custom frontend distribution',
          enabled: true,
        },
        skipBuild: true,
      });

      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Comment: 'Custom frontend distribution',
          Enabled: true,
        },
      });
    });
  });
});
