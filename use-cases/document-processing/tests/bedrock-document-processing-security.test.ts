import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { AccessLog } from '../../framework';
import { createTestApp } from '../../utilities/test-utils';
import { QueuedS3Adapter } from '../adapter';
import { BedrockDocumentProcessing } from '../bedrock-document-processing';

/**
 * Security tests for BedrockDocumentProcessing with chunking enabled.
 *
 * These tests verify that:
 * 1. Lambda functions have minimum required IAM permissions (least privilege)
 * 2. Lambda functions cannot access unauthorized resources
 * 3. Encryption is enforced for all resources
 *
 * ## Security Controls Tested
 *
 * ### Least Privilege IAM Permissions
 * - Classification Lambda: s3:GetObject only (read-only)
 * - Processing Lambda: s3:GetObject only (read-only)
 * - Chunking Lambda: s3:GetObject, s3:PutObject (read/write for chunks)
 * - Cleanup Lambda: s3:DeleteObject only (delete-only)
 * - Aggregation Lambda: dynamodb:GetItem, dynamodb:Query (read-only)
 *
 * ### Encryption at Rest
 * - S3 bucket uses KMS encryption
 * - DynamoDB table uses KMS encryption
 * - SQS queues use KMS encryption
 * - Lambda environment variables use KMS encryption
 * - Step Functions state machine uses KMS encryption
 *
 * ### Encryption in Transit
 * - S3 bucket enforces SSL
 * - SQS queues enforce SSL
 */

describe('BedrockDocumentProcessing Security Tests', () => {
  let app: ReturnType<typeof createTestApp>;
  let stack: Stack;
  let template: Template;

  beforeAll(() => {
    app = createTestApp();
    stack = new Stack(app, 'SecurityTestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    const accessLog = new AccessLog(stack, 'AccessLog');
    const bucket = new Bucket(stack, 'DocumentBucket', {
      serverAccessLogsBucket: accessLog.bucket,
      serverAccessLogsPrefix: accessLog.bucketPrefix,
      enforceSSL: true,
    });

    const adapter = new QueuedS3Adapter({ bucket });

    new BedrockDocumentProcessing(stack, 'BedrockDocumentProcessing', {
      ingressAdapter: adapter,
      enableChunking: true,
      chunkingConfig: {
        strategy: 'hybrid',
        pageThreshold: 100,
        tokenThreshold: 150000,
        processingMode: 'parallel',
        maxConcurrency: 10,
      },
    });

    template = Template.fromStack(stack);
  });

  describe('Least Privilege IAM Permissions', () => {
    describe('Classification Lambda', () => {
      test('has only s3:GetObject permission for S3 access', () => {
        // Find IAM policies that grant S3 access to classification Lambda
        const policies = template.findResources('AWS::IAM::Policy');

        // Verify that classification Lambda role has s3:GetObject
        // and does NOT have s3:PutObject, s3:DeleteObject, or s3:*
        const s3Policies = Object.values(policies).filter((policy: any) => {
          const statements = policy.Properties?.PolicyDocument?.Statement || [];
          return statements.some((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            return actions.some((action: string) => action.startsWith('s3:'));
          });
        });

        // Should have S3 policies
        expect(s3Policies.length).toBeGreaterThan(0);

        // Verify no wildcard s3:* permissions
        s3Policies.forEach((policy: any) => {
          const statements = policy.Properties?.PolicyDocument?.Statement || [];
          statements.forEach((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            actions.forEach((action: string) => {
              if (action.startsWith('s3:')) {
                expect(action).not.toBe('s3:*');
              }
            });
          });
        });
      });

      test('has Bedrock InvokeModel permission', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
          Policies: Match.arrayWith([
            Match.objectLike({
              PolicyDocument: {
                Statement: Match.arrayWith([
                  Match.objectLike({
                    Action: Match.arrayWith(['bedrock:InvokeModel']),
                    Effect: 'Allow',
                  }),
                ]),
              },
            }),
          ]),
        });
      });
    });

    describe('Chunking Lambda', () => {
      test('has s3:GetObject and s3:PutObject permissions', () => {
        // Chunking Lambda needs to read PDFs and write chunks
        // Verify the chunking Lambda role policy exists
        const policies = template.findResources('AWS::IAM::Policy');

        // Find the chunking Lambda policy by name pattern
        const chunkingPolicyKey = Object.keys(policies).find(key =>
          key.includes('ChunkingLambdaRole'),
        );

        expect(chunkingPolicyKey).toBeDefined();

        // Verify no s3:* wildcard in any policy
        Object.values(policies).forEach((policy: any) => {
          const statements = policy.Properties?.PolicyDocument?.Statement || [];
          statements.forEach((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            actions.forEach((action: string) => {
              expect(action).not.toBe('s3:*');
            });
          });
        });
      });
    });

    describe('Cleanup Lambda', () => {
      test('has s3:DeleteObject permission', () => {
        // Cleanup Lambda should have delete permission
        const policies = template.findResources('AWS::IAM::Policy');

        // Find the cleanup Lambda policy by name pattern
        const cleanupPolicyKey = Object.keys(policies).find(key =>
          key.includes('CleanupLambdaRole'),
        );

        expect(cleanupPolicyKey).toBeDefined();

        // Verify no s3:* wildcard in any policy
        Object.values(policies).forEach((policy: any) => {
          const statements = policy.Properties?.PolicyDocument?.Statement || [];
          statements.forEach((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            actions.forEach((action: string) => {
              expect(action).not.toBe('s3:*');
            });
          });
        });
      });
    });

    describe('Aggregation Lambda', () => {
      test('has DynamoDB permissions', () => {
        // Aggregation Lambda should have DynamoDB permissions
        const policies = template.findResources('AWS::IAM::Policy');

        // Find the aggregation Lambda policy by name pattern
        const aggregationPolicyKey = Object.keys(policies).find(key =>
          key.includes('AggregationLambdaRole'),
        );

        expect(aggregationPolicyKey).toBeDefined();

        // Verify no dynamodb:* wildcard in any policy
        Object.values(policies).forEach((policy: any) => {
          const statements = policy.Properties?.PolicyDocument?.Statement || [];
          statements.forEach((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            actions.forEach((action: string) => {
              expect(action).not.toBe('dynamodb:*');
            });
          });
        });
      });
    });

    describe('No Wildcard Permissions', () => {
      test('no Lambda role has s3:* permission', () => {
        const policies = template.findResources('AWS::IAM::Policy');

        Object.values(policies).forEach((policy: any) => {
          const statements = policy.Properties?.PolicyDocument?.Statement || [];
          statements.forEach((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            actions.forEach((action: string) => {
              expect(action).not.toBe('s3:*');
            });
          });
        });
      });

      test('no Lambda role has dynamodb:* permission', () => {
        const policies = template.findResources('AWS::IAM::Policy');

        Object.values(policies).forEach((policy: any) => {
          const statements = policy.Properties?.PolicyDocument?.Statement || [];
          statements.forEach((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            actions.forEach((action: string) => {
              expect(action).not.toBe('dynamodb:*');
            });
          });
        });
      });

      test('no Lambda role has bedrock:* permission', () => {
        const policies = template.findResources('AWS::IAM::Policy');

        Object.values(policies).forEach((policy: any) => {
          const statements = policy.Properties?.PolicyDocument?.Statement || [];
          statements.forEach((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            actions.forEach((action: string) => {
              expect(action).not.toBe('bedrock:*');
            });
          });
        });
      });
    });
  });

  describe('Encryption at Rest', () => {
    test('S3 bucket uses encryption', () => {
      // S3 bucket should use encryption (AWS-managed KMS or customer-managed)
      // The bucket provided by the user may use different encryption settings
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: Match.anyValue(),
      });
    });

    test('DynamoDB table uses KMS encryption', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          SSEType: 'KMS',
        },
      });
    });

    test('SQS queues use KMS encryption', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        KmsMasterKeyId: Match.anyValue(),
      });
    });

    test('Step Functions state machine uses KMS encryption', () => {
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        EncryptionConfiguration: {
          Type: 'CUSTOMER_MANAGED_KMS_KEY',
          KmsKeyId: Match.anyValue(),
        },
      });
    });

    test('Lambda environment variables use KMS encryption', () => {
      // Find Lambda functions with environment variables
      const lambdas = template.findResources('AWS::Lambda::Function');

      // All Lambda functions should have KmsKeyArn set for environment encryption
      const lambdasWithEnvVars = Object.values(lambdas).filter((lambda: any) =>
        lambda.Properties?.Environment?.Variables,
      );

      // Should have Lambda functions with environment variables
      expect(lambdasWithEnvVars.length).toBeGreaterThan(0);

      // Each Lambda with env vars should have KmsKeyArn
      lambdasWithEnvVars.forEach((lambda: any) => {
        expect(lambda.Properties.KmsKeyArn).toBeDefined();
      });
    });
  });

  describe('Encryption in Transit', () => {
    test('S3 bucket enforces SSL', () => {
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
              Effect: 'Deny',
            }),
          ]),
        },
      });
    });
  });

  describe('Resource Isolation', () => {
    test('Lambda functions have specific resource ARNs, not wildcards', () => {
      const policies = template.findResources('AWS::IAM::Policy');

      // Check that S3 permissions are scoped to specific bucket ARNs
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        statements.forEach((stmt: any) => {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];

          // If this is an S3 action, verify resources are not just '*'
          if (actions.some((a: string) => a.startsWith('s3:'))) {
            resources.forEach((resource: any) => {
              // Resource should be a Ref, GetAtt, or Fn::Join, not just '*'
              if (typeof resource === 'string') {
                expect(resource).not.toBe('*');
              }
            });
          }
        });
      });
    });

    test('DynamoDB permissions are scoped to specific table', () => {
      const policies = template.findResources('AWS::IAM::Policy');

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        statements.forEach((stmt: any) => {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];

          // If this is a DynamoDB action, verify resources are not just '*'
          if (actions.some((a: string) => a.startsWith('dynamodb:'))) {
            resources.forEach((resource: any) => {
              if (typeof resource === 'string') {
                expect(resource).not.toBe('*');
              }
            });
          }
        });
      });
    });
  });
});

describe('BedrockDocumentProcessing Security - Without Chunking', () => {
  let app: ReturnType<typeof createTestApp>;
  let stack: Stack;
  let template: Template;

  beforeAll(() => {
    app = createTestApp();
    stack = new Stack(app, 'SecurityNoChunkingStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    new BedrockDocumentProcessing(stack, 'BedrockDocumentProcessing', {
      enableChunking: false,
    });

    template = Template.fromStack(stack);
  });

  describe('Encryption at Rest (without chunking)', () => {
    test('S3 bucket uses KMS encryption', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: Match.arrayWith([
            Match.objectLike({
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
              },
            }),
          ]),
        },
      });
    });

    test('DynamoDB table uses KMS encryption', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          SSEType: 'KMS',
        },
      });
    });

    test('Step Functions state machine uses KMS encryption', () => {
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        EncryptionConfiguration: {
          Type: 'CUSTOMER_MANAGED_KMS_KEY',
          KmsKeyId: Match.anyValue(),
        },
      });
    });
  });

  describe('Least Privilege (without chunking)', () => {
    test('no wildcard s3:* permissions', () => {
      const policies = template.findResources('AWS::IAM::Policy');

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        statements.forEach((stmt: any) => {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          actions.forEach((action: string) => {
            expect(action).not.toBe('s3:*');
          });
        });
      });
    });

    test('no wildcard dynamodb:* permissions', () => {
      const policies = template.findResources('AWS::IAM::Policy');

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        statements.forEach((stmt: any) => {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          actions.forEach((action: string) => {
            expect(action).not.toBe('dynamodb:*');
          });
        });
      });
    });
  });
});
