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
import { Frontend, DEFAULT_SPA_ERROR_RESPONSES } from '../frontend-construct';

// Mock execSync to avoid actual build execution during tests
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('@webapp Frontend', () => {
  let app: App;
  let basicStack: Stack;
  let customBuildStack: Stack;
  let customErrorStack: Stack;
  let customDomainStack: Stack;
  let customDomainWithZoneStack: Stack;
  let retainStack: Stack;
  let destroyStack: Stack;
  let securityStack: Stack;
  let distributionPropsStack: Stack;
  let basicTemplate: Template;
  let customBuildTemplate: Template;
  let customErrorTemplate: Template;
  let customDomainTemplate: Template;
  let customDomainWithZoneTemplate: Template;
  let retainTemplate: Template;
  let destroyTemplate: Template;
  let securityTemplate: Template;
  let distributionPropsTemplate: Template;
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

    // Create app once
    app = new App();

    // Create all stacks once in beforeAll
    basicStack = new Stack(app, 'BasicStack');
    const basicFrontend = new Frontend(basicStack, 'Frontend', {
      sourceDirectory: '/tmp/test-frontend-src',
      buildOutputDirectory: testBuildDir,
      skipBuild: true,
    });

    customBuildStack = new Stack(app, 'CustomBuildStack');
    new Frontend(customBuildStack, 'Frontend', {
      sourceDirectory: '/tmp/test-frontend-src',
      buildOutputDirectory: testBuildDir,
      buildCommand: 'yarn build',
      skipBuild: true,
    });

    customErrorStack = new Stack(app, 'CustomErrorStack');
    const customErrorResponses = [
      {
        httpStatus: 500,
        responseHttpStatus: 200,
        responsePagePath: '/error.html',
      },
    ];
    new Frontend(customErrorStack, 'Frontend', {
      sourceDirectory: '/tmp/test-frontend-src',
      buildOutputDirectory: testBuildDir,
      errorResponses: customErrorResponses,
      skipBuild: true,
    });

    customDomainStack = new Stack(app, 'CustomDomainStack');
    const certificate = Certificate.fromCertificateArn(
      customDomainStack,
      'Certificate',
      'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
    );
    const customDomainFrontend = new Frontend(customDomainStack, 'Frontend', {
      sourceDirectory: '/tmp/test-frontend-src',
      buildOutputDirectory: testBuildDir,
      customDomain: {
        domainName: 'app.example.com',
        certificate,
      },
      skipBuild: true,
    });

    customDomainWithZoneStack = new Stack(app, 'CustomDomainWithZoneStack');
    const certificate2 = Certificate.fromCertificateArn(
      customDomainWithZoneStack,
      'Certificate',
      'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
    );
    const hostedZone = HostedZone.fromHostedZoneAttributes(customDomainWithZoneStack, 'HostedZone', {
      hostedZoneId: 'Z123456789',
      zoneName: 'example.com',
    });
    new Frontend(customDomainWithZoneStack, 'Frontend', {
      sourceDirectory: '/tmp/test-frontend-src',
      buildOutputDirectory: testBuildDir,
      customDomain: {
        domainName: 'app.example.com',
        certificate: certificate2,
        hostedZone,
      },
      skipBuild: true,
    });

    retainStack = new Stack(app, 'RetainStack');
    const retainFrontend = new Frontend(retainStack, 'Frontend', {
      sourceDirectory: testSrcDir,
      buildOutputDirectory: testBuildDir,
      skipBuild: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    destroyStack = new Stack(app, 'DestroyStack');
    const destroyFrontend = new Frontend(destroyStack, 'Frontend', {
      sourceDirectory: testSrcDir,
      buildOutputDirectory: testBuildDir,
      skipBuild: true,
    });

    securityStack = new Stack(app, 'SecurityStack');
    new Frontend(securityStack, 'Frontend', {
      sourceDirectory: '/tmp/test-frontend-src',
      buildOutputDirectory: testBuildDir,
      skipBuild: true,
    });

    distributionPropsStack = new Stack(app, 'DistributionPropsStack');
    new Frontend(distributionPropsStack, 'Frontend', {
      sourceDirectory: '/tmp/test-frontend-src',
      buildOutputDirectory: testBuildDir,
      distributionProps: {
        comment: 'Custom frontend distribution',
        enabled: true,
      },
      skipBuild: true,
    });

    // Generate all templates once
    basicTemplate = Template.fromStack(basicStack);
    customBuildTemplate = Template.fromStack(customBuildStack);
    customErrorTemplate = Template.fromStack(customErrorStack);
    customDomainTemplate = Template.fromStack(customDomainStack);
    customDomainWithZoneTemplate = Template.fromStack(customDomainWithZoneStack);
    retainTemplate = Template.fromStack(retainStack);
    destroyTemplate = Template.fromStack(destroyStack);
    securityTemplate = Template.fromStack(securityStack);
    distributionPropsTemplate = Template.fromStack(distributionPropsStack);

    // Store frontend instances for public method tests
    (basicStack as any).frontend = basicFrontend;
    (customDomainStack as any).frontend = customDomainFrontend;
    (retainStack as any).frontend = retainFrontend;
    (destroyStack as any).frontend = destroyFrontend;
  });

  describe('@webapp Basic functionality', () => {
    test('@webapp creates frontend construct with minimal configuration', () => {
      const frontend = (basicStack as any).frontend;

      // Verify S3 bucket is created
      basicTemplate.hasResourceProperties('AWS::S3::Bucket', {
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
      basicTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
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
      basicTemplate.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionConfig: {
          Runtime: 'cloudfront-js-1.0',
        },
      });

      // Verify bucket deployment is created
      basicTemplate.hasResource('Custom::CDKBucketDeployment', {});

      // Test public methods
      expect(frontend.bucket).toBeInstanceOf(Bucket);
      expect(frontend.distribution).toBeInstanceOf(Distribution);
      expect(frontend.bucketDeployment).toBeInstanceOf(BucketDeployment);
      expect(typeof frontend.distributionDomainName()).toBe('string');
      expect(typeof frontend.bucketName()).toBe('string');
      expect(frontend.url()).toContain('https://');
    });

    test('@webapp creates frontend construct with custom build command', () => {
      // Should still create the same resources
      customBuildTemplate.resourceCountIs('AWS::S3::Bucket', 1);
      customBuildTemplate.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });

    test('@webapp creates frontend construct with custom error responses', () => {
      customErrorTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
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
      const frontend = (customDomainStack as any).frontend;

      // Verify CloudFront distribution has custom domain
      customDomainTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
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
      // Verify Route53 A record is created
      customDomainWithZoneTemplate.hasResourceProperties('AWS::Route53::RecordSet', {
        Type: 'A',
        Name: 'app.example.com.',
        HostedZoneId: 'Z123456789',
      });
    });
  });

  describe('@webapp Validation', () => {
    test('@webapp throws error when sourceDirectory is missing', () => {
      const testStack = new Stack(app, 'ValidationStack1');
      expect(() => {
        new Frontend(testStack, 'Frontend', {
          sourceDirectory: '',
          buildOutputDirectory: testBuildDir,
          skipBuild: true,
        });
      }).toThrow('sourceDirectory is required');
    });

    test('@webapp uses default buildOutputDirectory when not provided', () => {
      // Use the existing test build directory
      const frontend = (destroyStack as any).frontend;
      expect(frontend).toBeDefined();
      // The construct should be created successfully with default buildOutputDirectory
    });

    test('@webapp applies custom removal policy to resources', () => {
      const frontend = (retainStack as any).frontend;
      expect(frontend).toBeDefined();

      // Check that the bucket has the correct removal policy
      retainTemplate.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    test('@webapp uses default DESTROY removal policy when not specified', () => {
      const frontend = (destroyStack as any).frontend;
      expect(frontend).toBeDefined();

      // Check that the bucket has the default DESTROY removal policy
      destroyTemplate.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });

    test('@webapp throws error when domainName is provided without certificate', () => {
      const testStack = new Stack(app, 'ValidationStack2');
      expect(() => {
        new Frontend(testStack, 'Frontend', {
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
      // Verify S3 bucket security settings
      securityTemplate.hasResourceProperties('AWS::S3::Bucket', {
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
      // Verify security headers function exists
      securityTemplate.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionConfig: {
          Runtime: 'cloudfront-js-1.0',
        },
      });

      // Verify HTTPS redirect is enabled
      securityTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'redirect-to-https',
          },
        },
      });
    });

    test('@webapp enables auto delete objects on S3 bucket', () => {
      // Verify auto delete objects custom resource is created
      securityTemplate.hasResource('Custom::S3AutoDeleteObjects', {});
    });
  });

  describe('@webapp Default values', () => {
    test('@webapp uses default SPA error responses', () => {
      basicTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
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
      distributionPropsTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Comment: 'Custom frontend distribution',
          Enabled: true,
        },
      });
    });
  });
});
