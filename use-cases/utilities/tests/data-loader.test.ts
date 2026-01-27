// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { InstanceClass, InstanceSize, InstanceType, Vpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { DatabaseCluster, DatabaseClusterEngine, AuroraPostgresEngineVersion, ClusterInstance } from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { DataLoader, DatabaseEngine, FileType } from '../data-loader';
import { createTestApp } from '../test-utils';

describe('DataLoader', () => {
  let app: App;
  let stack: Stack;
  let vpc: Vpc;
  let cluster: DatabaseCluster;
  let secret: Secret;
  let securityGroup: SecurityGroup;
  let template: Template;

  // Use beforeAll instead of beforeEach to avoid recreating infrastructure
  beforeAll(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack');

    // Create VPC
    vpc = new Vpc(stack, 'TestVpc');

    // Create security group for database access
    securityGroup = new SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc: vpc,
      description: 'Security group for database access',
    });

    // Create database secret
    secret = new Secret(stack, 'DatabaseSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'testuser' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    // Create Aurora cluster
    cluster = new DatabaseCluster(stack, 'TestCluster', {
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_13_7,
      }),
      credentials: {
        username: 'testuser',
        password: secret.secretValueFromJson('password'),
      },
      vpc,
      writer: ClusterInstance.provisioned('writer', {
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
      }),
    });

    // Create all DataLoader instances first
    new DataLoader(stack, 'BasicDataLoader', {
      databaseConfig: {
        engine: DatabaseEngine.POSTGRESQL,
        cluster: cluster,
        secret: secret,
        databaseName: 'testdb',
        vpc: vpc,
        securityGroup: securityGroup,
      },
      fileInputs: [
        {
          filePath: 's3://test-bucket/test-data.sql',
          fileType: FileType.SQL,
        },
      ],
    });

    new DataLoader(stack, 'MultiFileDataLoader', {
      databaseConfig: {
        engine: DatabaseEngine.MYSQL,
        cluster: cluster,
        secret: secret,
        databaseName: 'testdb',
        vpc: vpc,
        securityGroup: securityGroup,
      },
      fileInputs: [
        {
          filePath: 's3://test-bucket/schema.sql',
          fileType: FileType.SQL,
          executionOrder: 1,
        },
        {
          filePath: 's3://test-bucket/data.sql',
          fileType: FileType.MYSQLDUMP,
          executionOrder: 2,
        },
      ],
    });

    new DataLoader(stack, 'CustomDataLoader', {
      databaseConfig: {
        engine: DatabaseEngine.POSTGRESQL,
        cluster: cluster,
        secret: secret,
        databaseName: 'testdb',
        vpc: vpc,
        securityGroup: securityGroup,
      },
      fileInputs: [
        {
          filePath: 's3://test-bucket/test-data.sql',
          fileType: FileType.SQL,
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
      memorySize: 2048,
    });

    // Generate template once after all constructs are created
    template = Template.fromStack(stack);
  });

  describe('Basic functionality', () => {

    test('creates DataLoader construct with minimal configuration', () => {
      expect(stack.node.findChild('BasicDataLoader')).toBeDefined();
    });

    test('creates expected AWS resources', () => {
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

      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {});
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'python3.11',
        Handler: 'index.handler',
      });
    });

    test('supports multiple file inputs with execution order', () => {
      expect(stack.node.findChild('MultiFileDataLoader')).toBeDefined();
    });

    test('supports custom configuration options', () => {
      expect(stack.node.findChild('CustomDataLoader')).toBeDefined();
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 2048,
      });
    });
  });

  describe('Validation', () => {
    test('throws error when databaseConfig is missing', () => {
      expect(() => {
        new DataLoader(stack, 'InvalidConfigDataLoader', {
          databaseConfig: undefined as any,
          fileInputs: [
            {
              filePath: 's3://test-bucket/test-data.sql',
              fileType: FileType.SQL,
            },
          ],
        });
      }).toThrow('databaseConfig is required');
    });

    test('throws error when both cluster and instance are missing', () => {
      expect(() => {
        new DataLoader(stack, 'NoClusterDataLoader', {
          databaseConfig: {
            engine: DatabaseEngine.POSTGRESQL,
            secret: secret,
            databaseName: 'testdb',
            vpc: vpc,
            securityGroup: securityGroup,
          },
          fileInputs: [
            {
              filePath: 's3://test-bucket/test-data.sql',
              fileType: FileType.SQL,
            },
          ],
        });
      }).toThrow('Either cluster or instance must be provided in databaseConfig');
    });

    test('throws error when fileInputs is empty', () => {
      expect(() => {
        new DataLoader(stack, 'EmptyInputsDataLoader', {
          databaseConfig: {
            engine: DatabaseEngine.POSTGRESQL,
            cluster: cluster,
            secret: secret,
            databaseName: 'testdb',
            vpc: vpc,
            securityGroup: securityGroup,
          },
          fileInputs: [],
        });
      }).toThrow('At least one file input is required');
    });

    test('throws error when MySQL engine is used with PostgreSQL dump', () => {
      expect(() => {
        new DataLoader(stack, 'MySQLPgDumpDataLoader', {
          databaseConfig: {
            engine: DatabaseEngine.MYSQL,
            cluster: cluster,
            secret: secret,
            databaseName: 'testdb',
            vpc: vpc,
            securityGroup: securityGroup,
          },
          fileInputs: [
            {
              filePath: 's3://test-bucket/test-data.sql',
              fileType: FileType.PGDUMP,
            },
          ],
        });
      }).toThrow('PostgreSQL dump files cannot be used with MySQL databases');
    });

    test('throws error when PostgreSQL engine is used with MySQL dump', () => {
      expect(() => {
        new DataLoader(stack, 'PostgreSQLMySQLDumpDataLoader', {
          databaseConfig: {
            engine: DatabaseEngine.POSTGRESQL,
            cluster: cluster,
            secret: secret,
            databaseName: 'testdb',
            vpc: vpc,
            securityGroup: securityGroup,
          },
          fileInputs: [
            {
              filePath: 's3://test-bucket/test-data.sql',
              fileType: FileType.MYSQLDUMP,
            },
          ],
        });
      }).toThrow('MySQL dump files cannot be used with PostgreSQL databases');
    });
  });

  describe('Removal Policy', () => {
    test('applies custom removal policy to resources', () => {
      expect(stack.node.findChild('CustomDataLoader')).toBeDefined();

      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    test('uses default DESTROY removal policy when not specified', () => {
      expect(stack.node.findChild('BasicDataLoader')).toBeDefined();

      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });
  });

  describe('Security', () => {
    test('creates resources with proper security configurations', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });

      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
        Runtime: 'python3.11',
      });

      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const hasVpcConfig = Object.values(lambdaFunctions).some((fn: any) =>
        fn.Properties?.VpcConfig?.SubnetIds,
      );
      expect(hasVpcConfig).toBe(true);
    });

    test('grants appropriate IAM permissions', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
            },
          ],
        },
      });
    });
  });
});
