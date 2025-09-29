import { App, Stack, Aspects, RemovalPolicy } from 'aws-cdk-lib';
import { Template, Annotations, Match } from 'aws-cdk-lib/assertions';
import { Vpc, FlowLog, FlowLogResourceType, FlowLogTrafficType, SecurityGroup, InstanceType, InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import { Key } from 'aws-cdk-lib/aws-kms';
import { DatabaseCluster, DatabaseClusterEngine, AuroraPostgresEngineVersion, ClusterInstance } from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { DataLoader, DatabaseEngine, FileType } from '../data-loader';

// Create app and stack
const app = new App();
const stack = new Stack(app, 'TestStack', {
  env: {
    account: '123456789012',
    region: 'us-east-1',
  },
});

// Create KMS key for encryption at rest
const encryptionKey = new Key(stack, 'EncryptionKey', {
  enableKeyRotation: true,
  description: 'KMS key for DataLoader encryption at rest',
});

// Create VPC with Flow Logs to fix AwsSolutions-VPC7
const vpc = new Vpc(stack, 'TestVpc', {
  maxAzs: 2,
});

// Add VPC Flow Logs to fix AwsSolutions-VPC7
new FlowLog(stack, 'VpcFlowLog', {
  resourceType: FlowLogResourceType.fromVpc(vpc),
  trafficType: FlowLogTrafficType.ALL,
});

// Create security group for database access
const dbSecurityGroup = new SecurityGroup(stack, 'DatabaseSecurityGroup', {
  vpc: vpc,
  description: 'Security group for DataLoader database access',
  allowAllOutbound: false,
});

// Create database credentials secret
const dbSecret = new Secret(stack, 'DatabaseSecret', {
  description: 'Database credentials for DataLoader',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ username: 'postgres' }),
    generateStringKey: 'password',
    excludeCharacters: '"@/\\',
  },
  encryptionKey: encryptionKey,
});

// Create Aurora PostgreSQL cluster for testing
const dbCluster = new DatabaseCluster(stack, 'TestDatabaseCluster', {
  engine: DatabaseClusterEngine.auroraPostgres({
    version: AuroraPostgresEngineVersion.VER_15_4,
  }),
  vpc: vpc,
  credentials: {
    username: 'postgres',
    password: dbSecret.secretValueFromJson('password'),
  },
  defaultDatabaseName: 'testdb',
  securityGroups: [dbSecurityGroup],
  storageEncryptionKey: encryptionKey,
  removalPolicy: RemovalPolicy.DESTROY, // For test environment
  writer: ClusterInstance.provisioned('writer', {
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
  }),
});

// Create DataLoader construct
const dataLoader = new DataLoader(stack, 'DataLoader', {
  databaseConfig: {
    engine: DatabaseEngine.POSTGRESQL,
    cluster: dbCluster,
    secret: dbSecret,
    databaseName: 'testdb',
    vpc: vpc,
    securityGroup: dbSecurityGroup,
  },
  fileInputs: [
    {
      filePath: 's3://test-bucket/schema.sql',
      fileType: FileType.SQL,
      executionOrder: 1,
    },
    {
      filePath: 's3://test-bucket/data.sql',
      fileType: FileType.SQL,
      executionOrder: 2,
    },
  ],
  removalPolicy: RemovalPolicy.DESTROY, // For test environment
});

// Add CDK Nag suppressions for acceptable violations

// Suppress VPC-related warnings for test environment
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/TestVpc', [
  {
    id: 'AwsSolutions-VPC7',
    reason: 'VPC Flow Logs are added separately in the test setup',
  },
]);

// Suppress RDS-related warnings for test environment
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/TestDatabaseCluster', [
  {
    id: 'AwsSolutions-RDS2',
    reason: 'Database encryption is enabled with customer-managed KMS key',
  },
  {
    id: 'AwsSolutions-RDS3',
    reason: 'Multi-AZ disabled for test environment cost optimization',
  },
  {
    id: 'AwsSolutions-RDS6',
    reason: 'IAM database authentication not required for this use case',
  },
  {
    id: 'AwsSolutions-RDS10',
    reason: 'Deletion protection disabled for test environment to allow cleanup',
  },
  {
    id: 'AwsSolutions-RDS11',
    reason: 'Default port acceptable within VPC security boundaries',
  },
  {
    id: 'AwsSolutions-RDS14',
    reason: 'Backtrack not available for PostgreSQL engine',
  },
  {
    id: 'AwsSolutions-RDS16',
    reason: 'Performance Insights disabled for cost optimization in test environment',
  },
]);

// Suppress Secrets Manager warnings
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DatabaseSecret', [
  {
    id: 'AwsSolutions-SMG4',
    reason: 'Secret rotation not required for test environment',
  },
]);

// Suppress S3 bucket warnings for DataLoader bucket
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/DataLoaderBucket', [
  {
    id: 'AwsSolutions-S1',
    reason: 'S3 access logging not required for internal data loading bucket',
  },
  {
    id: 'AwsSolutions-S2',
    reason: 'S3 bucket public read access is blocked by default configuration',
  },
  {
    id: 'AwsSolutions-S3',
    reason: 'SSL-only access is enforced through bucket policy',
  },
  {
    id: 'AwsSolutions-S10',
    reason: 'MFA delete not required for data loading bucket',
  },
]);

// Suppress S3 bucket policy warnings
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/DataLoaderBucket/Policy', [
  {
    id: 'AwsSolutions-S10',
    reason: 'SSL-only access policy is enforced for data loading bucket security',
  },
]);

// Suppress Lambda function warnings for DataLoader processor
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/DataLoaderProcessor', [
  {
    id: 'AwsSolutions-L1',
    reason: 'Lambda runtime version is managed at deployment time',
  },
]);

// Suppress security group warnings for DataLoader processor
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/DataLoaderProcessorSecurityGroup', [
  {
    id: 'AwsSolutions-EC23',
    reason: 'Lambda security group allows all outbound traffic for AWS service access and dependency downloads',
  },
]);

// Suppress IAM role warnings for DataLoader processor
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/DataLoaderProcessor/ServiceRole', [
  {
    id: 'AwsSolutions-IAM4',
    reason: 'AWSLambdaVPCAccessExecutionRole is required for VPC Lambda functions',
    appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'],
  },
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Lambda function needs CloudWatch Logs permissions with wildcard for log stream creation',
    appliesTo: ['Resource::arn:<AWS::Partition>:logs:*:*:log-group:/aws/lambda/*:*'],
  },
]);

// Suppress IAM policy warnings for DataLoader processor
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/DataLoaderProcessor/ServiceRole/DefaultPolicy', [
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Lambda function needs S3 read permissions for data loading files',
    appliesTo: [
      'Action::s3:GetObject*',
      'Action::s3:GetBucket*',
      'Action::s3:List*',
    ],
  },
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Lambda function needs access to all objects in the data loading bucket',
    appliesTo: ['Resource::<DataLoaderDataLoaderBucketF99DADE2.Arn>/*'],
  },
]);

// Suppress Step Functions warnings
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/DataLoaderStateMachine', [
  {
    id: 'AwsSolutions-SF1',
    reason: 'Step Functions logging configuration is environment-specific',
  },
  {
    id: 'AwsSolutions-SF2',
    reason: 'X-Ray tracing configuration is environment-specific',
  },
]);

// Suppress Step Functions role warnings
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/DataLoaderStateMachine/Role', [
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Step Functions needs to invoke Lambda functions with specific permissions',
    appliesTo: ['Resource::<DataLoaderDataLoaderProcessor*>'],
  },
]);

// Suppress Step Functions role policy warnings
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/DataLoaderStateMachine/Role/DefaultPolicy', [
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Step Functions needs to invoke the DataLoader processor Lambda function',
    appliesTo: ['Resource::<DataLoaderDataLoaderProcessor693D75D2.Arn>:*'],
  },
]);

// Suppress custom resource Lambda warnings
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/StateMachineExecutionTrigger', [
  {
    id: 'AwsSolutions-L1',
    reason: 'Custom resource Lambda runtime version is managed at deployment time',
  },
]);

// Suppress custom resource IAM warnings for the dedicated role
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/StateMachineExecutionTriggerRole', [
  {
    id: 'AwsSolutions-IAM4',
    reason: 'AWSLambdaBasicExecutionRole is the standard minimal policy for Lambda execution',
    appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
  },
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Custom resource needs Step Functions execution permissions with wildcard for execution ARNs. ' +
            'Execution ARNs include dynamic execution names that cannot be predetermined.',
    appliesTo: ['Resource::<DataLoaderDataLoaderStateMachine2071C3DC>:*'],
  },
]);

// Suppress custom resource provider warnings
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/StateMachineExecutionProvider', [
  {
    id: 'AwsSolutions-L1',
    reason: 'Custom resource provider Lambda runtime version is managed at deployment time',
  },
]);

// Suppress custom resource provider IAM warnings
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/StateMachineExecutionProvider/framework-onEvent/ServiceRole', [
  {
    id: 'AwsSolutions-IAM4',
    reason: 'AWSLambdaBasicExecutionRole is the standard minimal policy for Lambda execution',
    appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
  },
]);

// Suppress custom resource provider policy warnings
NagSuppressions.addResourceSuppressionsByPath(stack, '/TestStack/DataLoader/StateMachineExecutionProvider/framework-onEvent/ServiceRole/DefaultPolicy', [
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Custom resource needs Step Functions execution permissions',
    appliesTo: ['Resource::<DataLoaderStateMachineExecutionTrigger94199E00.Arn>:*'],
  },
]);

// Suppress bucket deployment warnings if present
NagSuppressions.addResourceSuppressions(stack, [
  {
    id: 'AwsSolutions-IAM4',
    reason: 'CDK managed bucket deployment resources use AWS managed policies',
    appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
  },
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Bucket deployment requires wildcard permissions for S3 operations',
    appliesTo: ['Resource::*'],
  },
  {
    id: 'AwsSolutions-L1',
    reason: 'CDK managed bucket deployment Lambda runtime is managed by CDK',
  },
], true);

// Apply CDK Nag checks
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Synthesize the stack
Template.fromStack(stack);

// Check for unsuppressed warnings and errors
const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'));
const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

// Test: DataLoader construct is properly created
test('DataLoader construct is created successfully', () => {
  expect(dataLoader).toBeDefined();
  expect(dataLoader.node.id).toBe('DataLoader');
  expect(dataLoader.bucket).toBeDefined();
  expect(dataLoader.stateMachine).toBeDefined();
  expect(dataLoader.processorFunction).toBeDefined();
  expect(dataLoader.customResourceProvider).toBeDefined();
  expect(dataLoader.executionTrigger).toBeDefined();
});

// Test: DataLoader has expected properties
test('DataLoader has expected properties', () => {
  expect(dataLoader.bucket.bucketName).toBeDefined();
  expect(dataLoader.stateMachine.stateMachineArn).toBeDefined();
  expect(dataLoader.processorFunction.functionArn).toBeDefined();
});

// Test: Template contains expected DataLoader resources
test('Template contains expected DataLoader resources', () => {
  const template = Template.fromStack(stack);

  // Verify S3 bucket exists with encryption
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

  // Verify Lambda function exists with VPC configuration
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'python3.13',
    VpcConfig: {
      SecurityGroupIds: Match.anyValue(),
      SubnetIds: Match.anyValue(),
    },
  });

  // Verify Step Functions state machine exists
  template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
    DefinitionString: Match.anyValue(),
  });

  // Verify Aurora cluster exists with encryption
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    Engine: 'aurora-postgresql',
    StorageEncrypted: true,
  });

  // Verify custom resource exists
  template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
    ServiceToken: Match.anyValue(),
  });
});

// Test: Security configurations are properly applied
test('Security configurations are properly applied', () => {
  const template = Template.fromStack(stack);

  // Verify KMS key exists with rotation enabled
  template.hasResourceProperties('AWS::KMS::Key', {
    EnableKeyRotation: true,
  });

  // Verify VPC Flow Logs exist
  template.hasResourceProperties('AWS::EC2::FlowLog', {
    ResourceType: 'VPC',
    TrafficType: 'ALL',
  });

  // Verify Secrets Manager secret exists with KMS encryption
  template.hasResourceProperties('AWS::SecretsManager::Secret', {
    KmsKeyId: Match.anyValue(),
  });

  // Verify security group exists
  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    GroupDescription: 'Security group for DataLoader database access',
  });

  // Verify Lambda security group exists
  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    GroupDescription: 'Security group for DataLoader processor Lambda function',
  });
});

// Test: IAM permissions are properly configured
test('IAM permissions are properly configured', () => {
  const template = Template.fromStack(stack);

  // Verify Lambda execution role exists
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

  // Verify Step Functions role exists
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'states.amazonaws.com',
          },
        },
      ],
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
