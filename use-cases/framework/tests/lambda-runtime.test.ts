// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Duration, Size, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaAgentRuntime } from '../agents/runtime/lambda-runtime';
import { AgentRuntimeType } from '../agents/runtime/types';

describe('LambdaAgentRuntime', () => {
  // Helper to get valid entry path for tests
  const getTestEntry = (): string => path.join(__dirname, '../agents/resources/default-strands-agent');

  let basicStack: Stack;
  let advancedStack: Stack;
  let methodsStack: Stack;

  let basicTemplate: Template;
  let advancedTemplate: Template;
  let methodsTemplate: Template;

  let basicRuntime: LambdaAgentRuntime;
  let methodsRuntime: LambdaAgentRuntime;
  let customRoleRuntime: LambdaAgentRuntime;

  beforeAll(() => {
    // Basic stack - tests default configuration and simple variations
    basicStack = new Stack(undefined, 'BasicStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    basicRuntime = new LambdaAgentRuntime(basicStack, 'DefaultRuntime', {
      functionName: 'test-agent',
      entry: getTestEntry(),
      index: 'batch.py',
    });
    new LambdaAgentRuntime(basicStack, 'CustomTimeoutRuntime', {
      functionName: 'timeout-agent',
      entry: getTestEntry(),
      index: 'batch.py',
      config: {
        timeout: Duration.minutes(5),
        memorySize: 2048,
        architecture: Architecture.X86_64,
        ephemeralStorageSize: Size.gibibytes(1),
      },
    });
    new LambdaAgentRuntime(basicStack, 'CustomRuntimeVersion', {
      functionName: 'runtime-agent',
      entry: getTestEntry(),
      index: 'utils.py',
      runtime: Runtime.PYTHON_3_11,
    });
    basicTemplate = Template.fromStack(basicStack);

    // Advanced stack - tests VPC, encryption, custom role, and all options
    advancedStack = new Stack(undefined, 'AdvancedStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const vpc = new Vpc(advancedStack, 'Vpc');
    const key = new Key(advancedStack, 'Key', {
      enableKeyRotation: true,
    });
    new LambdaAgentRuntime(advancedStack, 'VpcRuntime', {
      functionName: 'vpc-agent',
      entry: getTestEntry(),
      index: 'batch.py',
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
    });
    new LambdaAgentRuntime(advancedStack, 'EncryptionRuntime', {
      functionName: 'encrypted-agent',
      entry: getTestEntry(),
      index: 'batch.py',
      environmentEncryption: key,
    });
    const customRole = new Role(advancedStack, 'CustomRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    customRoleRuntime = new LambdaAgentRuntime(advancedStack, 'CustomRoleRuntime', {
      functionName: 'custom-role-agent',
      entry: getTestEntry(),
      index: 'batch.py',
      role: customRole,
    });
    // Add policy to custom role for testing
    customRoleRuntime.addToRolePolicy(
      new PolicyStatement({
        actions: ['kms:Decrypt'],
        resources: ['*'],
      }),
    );
    new LambdaAgentRuntime(advancedStack, 'AllOptionsRuntime', {
      functionName: 'all-options-agent',
      entry: getTestEntry(),
      index: 'batch.py',
      runtime: Runtime.PYTHON_3_12,
      environment: {
        MODEL_ID: 'anthropic.claude-v2',
        DEBUG: 'true',
      },
      environmentEncryption: key,
      vpc,
      config: {
        timeout: Duration.minutes(15),
        memorySize: 3008,
        architecture: Architecture.X86_64,
        ephemeralStorageSize: Size.gibibytes(2),
      },
    });
    advancedTemplate = Template.fromStack(advancedStack);

    // Methods stack - tests runtime methods (grantInvoke, addEnvironment, addToRolePolicy)
    methodsStack = new Stack(undefined, 'MethodsStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    methodsRuntime = new LambdaAgentRuntime(methodsStack, 'MethodsRuntime', {
      functionName: 'methods-agent',
      entry: getTestEntry(),
      index: 'batch.py',
      environment: {
        INITIAL_VAR: 'initial',
        DEBUG: 'false',
      },
    });

    // Test grantInvoke
    const invokerRole = new Role(methodsStack, 'InvokerRole', {
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
    });
    const role2 = new Role(methodsStack, 'Role2', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    methodsRuntime.grantInvoke(invokerRole);
    methodsRuntime.grantInvoke(role2);

    // Test addEnvironment
    methodsRuntime.addEnvironment('MODEL_ID', 'anthropic.claude-v2');
    methodsRuntime.addEnvironment('TEMPERATURE', '0.7');
    methodsRuntime.addEnvironment('ADDED_VAR', 'added');
    methodsRuntime.addEnvironment('DEBUG', 'true'); // Overwrite existing

    // Test addToRolePolicy
    methodsRuntime.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: ['arn:aws:s3:::my-bucket/*'],
      }),
    );
    methodsRuntime.addToRolePolicy(
      new PolicyStatement({
        actions: ['dynamodb:GetItem'],
        resources: ['arn:aws:dynamodb:us-east-1:123456789012:table/MyTable'],
      }),
    );
    methodsRuntime.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      }),
    );

    methodsTemplate = Template.fromStack(methodsStack);
  });

  describe('Runtime Creation', () => {
    test('creates Lambda function with default configuration', () => {
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'test-agent',
        Runtime: Match.stringLikeRegexp('python3\\.1[23]'),
        Timeout: 600, // Default 10 minutes
        MemorySize: 1024, // Default 1024 MB
        Architectures: ['x86_64'], // Default x86_64
      });
    });

    test('creates Lambda function with custom timeout and memory', () => {
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'timeout-agent',
        Timeout: 300, // 5 minutes
        MemorySize: 2048,
      });
    });

    test('creates Lambda function with X86_64 architecture', () => {
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'timeout-agent',
        Architectures: ['x86_64'],
      });
    });

    test('creates Lambda function with custom ephemeral storage', () => {
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'timeout-agent',
        EphemeralStorage: {
          Size: 1024, // 1 GiB in MiB
        },
      });
    });

    test('creates Lambda function with custom runtime version', () => {
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'runtime-agent',
        Runtime: 'python3.11',
      });
    });

    test('creates Lambda function with custom index file', () => {
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'runtime-agent',
        Handler: 'utils.handler',
      });
    });

    test('creates Lambda function with VPC configuration', () => {
      advancedTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'vpc-agent',
        VpcConfig: Match.objectLike({
          SubnetIds: Match.anyValue(),
          SecurityGroupIds: Match.anyValue(),
        }),
      });
    });

    test('creates Lambda function with environment encryption', () => {
      advancedTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'encrypted-agent',
        KmsKeyArn: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('Key.*'), 'Arn']),
        }),
      });
    });

    test('creates Lambda function with provided IAM role', () => {
      expect(customRoleRuntime.executionRole).toBeDefined();

      advancedTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'custom-role-agent',
        Role: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('CustomRole.*'), 'Arn']),
        }),
      });
    });

    test('creates Lambda function with all configuration options', () => {
      advancedTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'all-options-agent',
        Runtime: 'python3.12',
        Handler: 'batch.handler',
        Timeout: 900,
        MemorySize: 3008,
        Architectures: ['x86_64'],
        EphemeralStorage: { Size: 2048 },
        Environment: {
          Variables: Match.objectLike({
            MODEL_ID: 'anthropic.claude-v2',
            DEBUG: 'true',
          }),
        },
        VpcConfig: Match.objectLike({
          SubnetIds: Match.anyValue(),
        }),
        KmsKeyArn: Match.anyValue(),
      });
    });

    test('creates expected number of Lambda functions', () => {
      // Each stack has Lambda functions (may include log retention functions)
      const basicFunctions = basicTemplate.findResources('AWS::Lambda::Function');
      const advancedFunctions = advancedTemplate.findResources('AWS::Lambda::Function');
      const methodsFunctions = methodsTemplate.findResources('AWS::Lambda::Function');

      // Basic stack: 3 agent runtimes + 1 log retention function
      expect(Object.keys(basicFunctions).length).toBeGreaterThanOrEqual(3);
      // Advanced stack: 4 agent runtimes + log retention functions
      expect(Object.keys(advancedFunctions).length).toBeGreaterThanOrEqual(4);
      // Methods stack: 1 agent runtime + log retention function
      expect(Object.keys(methodsFunctions).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Runtime Interface Properties', () => {
    test('exposes correct runtime type', () => {
      expect(basicRuntime.runtimeType).toBe(AgentRuntimeType.LAMBDA);
    });

    test('exposes execution role', () => {
      expect(basicRuntime.executionRole).toBeDefined();
      expect(basicRuntime.executionRole).toBeInstanceOf(Role);
    });

    test('exposes invocation ARN', () => {
      expect(basicRuntime.invocationArn).toBeDefined();
      // ARN is a CDK token at synthesis time, just verify it's defined
      expect(typeof basicRuntime.invocationArn).toBe('string');
    });

    test('exposes log group', () => {
      expect(basicRuntime.logGroup).toBeDefined();
    });

    test('exposes underlying PythonFunction', () => {
      expect(basicRuntime.agentFunction).toBeDefined();
      // Function name is a CDK token at synthesis time, just verify it's defined
      expect(typeof basicRuntime.agentFunction.functionName).toBe('string');
    });
  });

  describe('grantInvoke()', () => {
    test('grants lambda:InvokeFunction permission to grantee', () => {
      // Check that InvokerRole has a policy with lambda:InvokeFunction
      const policies = methodsTemplate.findResources('AWS::IAM::Policy');
      const invokerPolicy = Object.values(policies).find((policy: any) => {
        return (
          policy.Properties.Roles &&
          policy.Properties.Roles.some((role: any) => role.Ref && role.Ref.includes('InvokerRole'))
        );
      });

      expect(invokerPolicy).toBeDefined();
      expect(invokerPolicy).toHaveProperty('Properties.PolicyDocument.Statement');
      const statements = (invokerPolicy as any).Properties.PolicyDocument.Statement;
      const hasInvokeFunction = statements.some(
        (stmt: any) => stmt.Action === 'lambda:InvokeFunction' && stmt.Effect === 'Allow',
      );
      expect(hasInvokeFunction).toBe(true);
    });

    test('grants invoke permission to multiple grantees', () => {
      const policies = methodsTemplate.findResources('AWS::IAM::Policy');

      // Check that both InvokerRole and Role2 have policies
      const invokerPolicy = Object.values(policies).find((policy: any) =>
        policy.Properties.Roles?.some((role: any) => role.Ref?.includes('InvokerRole')),
      );
      const role2Policy = Object.values(policies).find((policy: any) =>
        policy.Properties.Roles?.some((role: any) => role.Ref?.includes('Role2')),
      );

      expect(invokerPolicy).toBeDefined();
      expect(role2Policy).toBeDefined();
    });

    test('returns Grant object', () => {
      const grant = methodsRuntime.grantInvoke(methodsRuntime.executionRole);

      expect(grant).toBeDefined();
      expect(grant.success).toBe(true);
    });
  });

  describe('addEnvironment()', () => {
    test('adds environment variables to Lambda function', () => {
      methodsTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            MODEL_ID: 'anthropic.claude-v2',
            TEMPERATURE: '0.7',
          }),
        },
      });
    });

    test('adds environment variables after construction', () => {
      methodsTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            INITIAL_VAR: 'initial',
            ADDED_VAR: 'added',
          }),
        },
      });
    });

    test('propagates environment variables correctly', () => {
      methodsTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            MODEL_ID: 'anthropic.claude-v2',
            TEMPERATURE: '0.7',
            ADDED_VAR: 'added',
          }),
        },
      });
    });

    test('overwrites existing environment variable', () => {
      methodsTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            DEBUG: 'true', // Was 'false', now overwritten
          }),
        },
      });
    });
  });

  describe('addToRolePolicy()', () => {
    test('adds IAM policy statement to execution role', () => {
      methodsTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: 'arn:aws:s3:::my-bucket/*',
            }),
          ]),
        },
      });
    });

    test('adds multiple IAM policy statements', () => {
      methodsTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::my-bucket/*',
            }),
            Match.objectLike({
              Action: 'dynamodb:GetItem',
              Resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable',
            }),
            Match.objectLike({
              Action: 'bedrock:InvokeModel',
              Resource: '*',
            }),
          ]),
        },
      });
    });

    test('attaches policy to correct execution role', () => {
      methodsTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.anyValue(),
            }),
          ]),
        },
        Roles: Match.arrayWith([
          Match.objectLike({
            Ref: Match.stringLikeRegexp('MethodsRuntimeFunctionServiceRole.*'),
          }),
        ]),
      });
    });

    test('policy statements are attached to provided custom role', () => {
      advancedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'kms:Decrypt',
            }),
          ]),
        },
        Roles: Match.arrayWith([
          Match.objectLike({
            Ref: Match.stringLikeRegexp('CustomRole.*'),
          }),
        ]),
      });
    });
  });

  describe('IAM Role Configuration', () => {
    test('creates execution role with Lambda service principal', () => {
      basicTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
            }),
          ]),
        },
      });
    });

    test('execution role has basic Lambda execution permissions', () => {
      const roles = basicTemplate.findResources('AWS::IAM::Role');
      const lambdaRole = Object.values(roles).find((role: any) =>
        role.Properties.AssumeRolePolicyDocument.Statement.some(
          (stmt: any) => stmt.Principal?.Service === 'lambda.amazonaws.com',
        ),
      );

      expect(lambdaRole).toBeDefined();
    });
  });
});
