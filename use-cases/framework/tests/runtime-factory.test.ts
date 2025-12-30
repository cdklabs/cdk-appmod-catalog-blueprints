// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { AgentRuntimeFactory } from '../agents/runtime/runtime-factory';
import { IAgentRuntime } from '../agents/runtime/runtime-interface';
import {
  AgentRuntimeType,
  AgentCoreDeploymentMethod,
} from '../agents/runtime/types';

describe('AgentRuntimeFactory', () => {
  // Helper to get valid entry path for tests
  const getTestEntry = (): string => path.join(__dirname, '../agents/resources/default-strands-agent');

  let lambdaStack: Stack;
  let agentCoreStack: Stack;
  let configStack: Stack;

  let lambdaTemplate: Template;
  let agentCoreTemplate: Template;
  let configTemplate: Template;

  let lambdaRuntime: IAgentRuntime;
  let agentCoreRuntime: IAgentRuntime;

  beforeAll(() => {
    // Lambda runtime stack - tests factory creates Lambda runtime
    lambdaStack = new Stack(undefined, 'LambdaStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    lambdaRuntime = AgentRuntimeFactory.create(
      lambdaStack,
      'LambdaRuntime',
      {
        type: AgentRuntimeType.LAMBDA,
      },
      {
        agentName: 'test-lambda-agent',
        entry: getTestEntry(),
        index: 'batch.py',
        environment: {
          MODEL_ID: 'anthropic.claude-v2',
        },
      },
    );
    lambdaTemplate = Template.fromStack(lambdaStack);

    // AgentCore runtime stack - tests factory creates AgentCore runtime
    agentCoreStack = new Stack(undefined, 'AgentCoreStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    agentCoreRuntime = AgentRuntimeFactory.create(
      agentCoreStack,
      'AgentCoreRuntime',
      {
        type: AgentRuntimeType.AGENTCORE,
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
        },
      },
      {
        agentName: 'test-agentcore-agent',
        entry: getTestEntry(), // Required by CommonRuntimeProps
        foundationModel: 'anthropic.claude-v2',
        instruction: 'You are a helpful assistant',
        environment: {
          MODEL_ID: 'anthropic.claude-v2',
        },
      },
    );
    agentCoreTemplate = Template.fromStack(agentCoreStack);

    // Configuration stack - tests factory passes configuration correctly
    configStack = new Stack(undefined, 'ConfigStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    AgentRuntimeFactory.create(
      configStack,
      'LambdaWithConfig',
      {
        type: AgentRuntimeType.LAMBDA,
        config: {
          timeout: Duration.minutes(5),
          memorySize: 2048,
          architecture: Architecture.X86_64,
        },
      },
      {
        agentName: 'config-lambda-agent',
        entry: getTestEntry(),
        index: 'batch.py',
        environment: {
          DEBUG: 'true',
          TEMPERATURE: '0.7',
        },
      },
    );
    AgentRuntimeFactory.create(
      configStack,
      'AgentCoreWithConfig',
      {
        type: AgentRuntimeType.AGENTCORE,
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/config-agent:latest',
          timeout: Duration.minutes(10),
          memorySize: 4096,
        },
      },
      {
        agentName: 'config-agentcore-agent',
        entry: getTestEntry(), // Required by CommonRuntimeProps
        foundationModel: 'anthropic.claude-v2',
        instruction: 'You are a specialized assistant',
        environment: {
          DEBUG: 'true',
          MAX_TOKENS: '1000',
        },
      },
    );
    configTemplate = Template.fromStack(configStack);
  });

  describe('Factory creates Lambda runtime', () => {
    test('creates Lambda runtime when type is LAMBDA', () => {
      expect(lambdaRuntime).toBeDefined();
      expect(lambdaRuntime.runtimeType).toBe(AgentRuntimeType.LAMBDA);
    });

    test('Lambda runtime has correct properties', () => {
      expect(lambdaRuntime.executionRole).toBeDefined();
      expect(lambdaRuntime.invocationArn).toBeDefined();
      expect(lambdaRuntime.logGroup).toBeDefined();
    });

    test('creates Lambda function resource', () => {
      // CDK creates log retention Lambda function automatically, so we expect at least 1
      const functions = lambdaTemplate.findResources('AWS::Lambda::Function');
      expect(Object.keys(functions).length).toBeGreaterThanOrEqual(1);
    });

    test('Lambda function has correct name', () => {
      lambdaTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'test-lambda-agent',
      });
    });

    test('Lambda function has correct handler', () => {
      lambdaTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'batch.handler',
      });
    });

    test('Lambda function has correct environment variables', () => {
      lambdaTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            MODEL_ID: 'anthropic.claude-v2',
          },
        },
      });
    });

    test('Lambda function has IAM role with Lambda service principal', () => {
      lambdaTemplate.hasResourceProperties('AWS::IAM::Role', {
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

  describe('Factory creates AgentCore runtime', () => {
    test('creates AgentCore runtime when type is AGENTCORE', () => {
      expect(agentCoreRuntime).toBeDefined();
      expect(agentCoreRuntime.runtimeType).toBe(AgentRuntimeType.AGENTCORE);
    });

    test('AgentCore runtime has correct properties', () => {
      expect(agentCoreRuntime.executionRole).toBeDefined();
      expect(agentCoreRuntime.invocationArn).toBeDefined();
      expect(agentCoreRuntime.logGroup).toBeDefined();
    });

    test('creates AgentCore runtime resource', () => {
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);
    });

    test('AgentCore runtime has correct name', () => {
      agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'test-agentcore-agent',
      });
    });

    test('AgentCore runtime has correct deployment configuration', () => {
      agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
          },
        },
      });
    });

    test('AgentCore runtime has correct environment variables', () => {
      agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        EnvironmentVariables: {
          MODEL_ID: 'anthropic.claude-v2',
        },
      });
    });

    test('AgentCore runtime has IAM role with AgentCore service principal', () => {
      agentCoreTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'agentcore.amazonaws.com',
              },
            },
          ],
        },
      });
    });

    test('creates AgentCore runtime endpoint', () => {
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::RuntimeEndpoint', 1);
    });

    test('creates CloudWatch log group', () => {
      agentCoreTemplate.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/bedrock-agentcore/runtimes/test-agentcore-agent',
      });
    });
  });

  describe('Factory throws error for invalid runtime type', () => {
    test('throws Error for unsupported runtime type', () => {
      const stack = new Stack();
      expect(() => {
        AgentRuntimeFactory.create(
          stack,
          'InvalidRuntime',
          {
            type: 'INVALID_TYPE' as AgentRuntimeType,
          },
          {
            agentName: 'invalid-agent',
            entry: getTestEntry(),
          },
        );
      }).toThrow(Error);
    });

    test('error message indicates unsupported runtime type', () => {
      const stack = new Stack();
      expect(() => {
        AgentRuntimeFactory.create(
          stack,
          'InvalidRuntime',
          {
            type: 'UNKNOWN' as AgentRuntimeType,
          },
          {
            agentName: 'invalid-agent',
            entry: getTestEntry(),
          },
        );
      }).toThrow(/Unsupported runtime type: UNKNOWN/);
    });

    test('error message lists supported runtime types', () => {
      const stack = new Stack();
      expect(() => {
        AgentRuntimeFactory.create(
          stack,
          'InvalidRuntime',
          {
            type: 'INVALID' as AgentRuntimeType,
          },
          {
            agentName: 'invalid-agent',
            entry: getTestEntry(),
          },
        );
      }).toThrow(/Supported types are: LAMBDA, AGENTCORE/);
    });
  });

  describe('Factory passes configuration correctly', () => {
    test('passes Lambda configuration to Lambda runtime', () => {
      configTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'config-lambda-agent',
        Timeout: 300, // 5 minutes
        MemorySize: 2048,
        Architectures: ['x86_64'],
      });
    });

    test('passes Lambda environment variables correctly', () => {
      configTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'config-lambda-agent',
        Environment: {
          Variables: {
            DEBUG: 'true',
            TEMPERATURE: '0.7',
          },
        },
      });
    });

    test('passes AgentCore configuration to AgentCore runtime', () => {
      configTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'config-agentcore-agent',
        Description: 'You are a specialized assistant',
      });
    });

    test('passes AgentCore deployment configuration correctly', () => {
      configTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/config-agent:latest',
          },
        },
      });
    });

    test('passes AgentCore environment variables correctly', () => {
      configTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        EnvironmentVariables: {
          DEBUG: 'true',
          MAX_TOKENS: '1000',
        },
      });
    });

    test('passes common properties to both runtime types', () => {
      // Lambda gets agentName as functionName
      configTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'config-lambda-agent',
      });

      // AgentCore gets agentName as AgentRuntimeName
      configTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'config-agentcore-agent',
      });
    });

    test('creates expected number of resources', () => {
      // Should have at least 1 Lambda function (plus log retention) and 1 AgentCore runtime
      const functions = configTemplate.findResources('AWS::Lambda::Function');
      expect(Object.keys(functions).length).toBeGreaterThanOrEqual(1);
      configTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);
    });
  });

  describe('Factory handles additional properties', () => {
    test('passes through additional Lambda-specific properties', () => {
      const stack = new Stack();
      const runtime = AgentRuntimeFactory.create(
        stack,
        'AdditionalPropsRuntime',
        {
          type: AgentRuntimeType.LAMBDA,
        },
        {
          agentName: 'additional-props-agent',
          entry: getTestEntry(),
          index: 'batch.py',
          description: 'Test function with additional props',
          layers: [], // Additional property
        },
      );

      expect(runtime).toBeDefined();
      expect(runtime.runtimeType).toBe(AgentRuntimeType.LAMBDA);
    });

    test('passes through additional AgentCore-specific properties', () => {
      const stack = new Stack();
      const runtime = AgentRuntimeFactory.create(
        stack,
        'AdditionalPropsRuntime',
        {
          type: AgentRuntimeType.AGENTCORE,
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
            imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test:latest',
          },
        },
        {
          agentName: 'additional-props-agent',
          entry: getTestEntry(), // Required by CommonRuntimeProps
          foundationModel: 'anthropic.claude-v2',
          instruction: 'Test',
          description: 'Test runtime with additional props', // Additional property
        },
      );

      expect(runtime).toBeDefined();
      expect(runtime.runtimeType).toBe(AgentRuntimeType.AGENTCORE);
    });
  });

  describe('Factory returns IAgentRuntime interface', () => {
    test('Lambda runtime implements IAgentRuntime interface', () => {
      expect(lambdaRuntime.runtimeType).toBeDefined();
      expect(lambdaRuntime.executionRole).toBeDefined();
      expect(lambdaRuntime.invocationArn).toBeDefined();
      expect(lambdaRuntime.grantInvoke).toBeDefined();
      expect(lambdaRuntime.addEnvironment).toBeDefined();
      expect(lambdaRuntime.addToRolePolicy).toBeDefined();
    });

    test('AgentCore runtime implements IAgentRuntime interface', () => {
      expect(agentCoreRuntime.runtimeType).toBeDefined();
      expect(agentCoreRuntime.executionRole).toBeDefined();
      expect(agentCoreRuntime.invocationArn).toBeDefined();
      expect(agentCoreRuntime.grantInvoke).toBeDefined();
      expect(agentCoreRuntime.addEnvironment).toBeDefined();
      expect(agentCoreRuntime.addToRolePolicy).toBeDefined();
    });

    test('both runtimes can be used interchangeably through interface', () => {
      const runtimes: IAgentRuntime[] = [lambdaRuntime, agentCoreRuntime];

      runtimes.forEach((runtime) => {
        expect(runtime.runtimeType).toBeDefined();
        expect(runtime.executionRole).toBeDefined();
        expect(runtime.invocationArn).toBeDefined();
        expect(typeof runtime.grantInvoke).toBe('function');
        expect(typeof runtime.addEnvironment).toBe('function');
        expect(typeof runtime.addToRolePolicy).toBe('function');
      });
    });
  });
});
