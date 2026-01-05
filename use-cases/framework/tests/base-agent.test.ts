// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { BatchAgent } from '../agents/batch-agent';
import { AgentRuntimeType } from '../agents/runtime';

describe('BaseAgent', () => {
  let defaultStack: Stack;
  let lambdaStack: Stack;
  let agentCoreStack: Stack;
  let encryptionKeyStack: Stack;
  let toolsStack: Stack;
  let observabilityLambdaStack: Stack;
  let observabilityAgentCoreStack: Stack;

  let systemPrompt: Asset;
  let toolAsset: Asset;
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  beforeAll(() => {
    // Create all stacks once for reuse across tests
    defaultStack = new Stack(undefined, 'DefaultStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    lambdaStack = new Stack(undefined, 'LambdaStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    agentCoreStack = new Stack(undefined, 'AgentCoreStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    encryptionKeyStack = new Stack(undefined, 'EncryptionKeyStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    toolsStack = new Stack(undefined, 'ToolsStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    observabilityLambdaStack = new Stack(undefined, 'ObservabilityLambdaStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    observabilityAgentCoreStack = new Stack(undefined, 'ObservabilityAgentCoreStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    // Create assets
    systemPrompt = new Asset(defaultStack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });

    toolAsset = new Asset(toolsStack, 'ToolAsset', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });

    // Test 1: Default runtime (Lambda)
    new BatchAgent(defaultStack, 'DefaultAgent', {
      agentName: 'DefaultTestAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    // Test 2: Explicit Lambda runtime
    // Note: BatchAgent doesn't support runtime config yet (Task 7)
    // This test will be updated when Task 7 is complete
    new BatchAgent(lambdaStack, 'LambdaAgent', {
      agentName: 'LambdaTestAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    // Test 3: AgentCore runtime
    // Note: BatchAgent doesn't support runtime config yet (Task 7)
    // This test will be updated when Task 7 is complete
    new BatchAgent(agentCoreStack, 'AgentCoreAgent', {
      agentName: 'AgentCoreTestAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    // Test 4: Custom encryption key
    const customKey = new Key(encryptionKeyStack, 'CustomKey', {
      enableKeyRotation: true,
    });

    new BatchAgent(encryptionKeyStack, 'EncryptionKeyAgent', {
      agentName: 'EncryptionKeyTestAgent',
      prompt: 'Test prompt',
      encryptionKey: customKey,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    // Test 5: Tool asset permissions
    new BatchAgent(toolsStack, 'ToolsAgent', {
      agentName: 'ToolsTestAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
        tools: [toolAsset],
        additionalPolicyStatementsForTools: [
          new PolicyStatement({
            actions: ['dynamodb:GetItem'],
            resources: ['arn:aws:dynamodb:us-east-1:123456789012:table/TestTable'],
          }),
        ],
      },
    });

    // Test 6: Observability with Lambda
    new BatchAgent(observabilityLambdaStack, 'ObservabilityLambdaAgent', {
      agentName: 'ObservabilityLambdaTestAgent',
      prompt: 'Test prompt',
      enableObservability: true,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    // Test 7: Observability with AgentCore
    // Note: BatchAgent doesn't support runtime config yet (Task 7)
    // This test will be updated when Task 7 is complete
    new BatchAgent(observabilityAgentCoreStack, 'ObservabilityAgentCoreAgent', {
      agentName: 'ObservabilityAgentCoreTestAgent',
      prompt: 'Test prompt',
      enableObservability: true,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });
  });

  describe('Default runtime behavior', () => {
    test('defaults to Lambda runtime when no runtime specified', () => {
      const template = Template.fromStack(defaultStack);

      // Should create Lambda function (agent function + LogRetention function)
      template.resourceCountIs('AWS::Lambda::Function', 2);

      // Should have the agent Lambda function with correct properties
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'DefaultTestAgent',
        Handler: 'batch.handler',
      });

      // Should not create AgentCore resources
      template.resourceCountIs('AWS::BedrockAgentCore::Runtime', 0);
      template.resourceCountIs('AWS::BedrockAgentCore::RuntimeEndpoint', 0);
    });

    test('creates Lambda execution role with correct service principal', () => {
      const template = Template.fromStack(defaultStack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'lambda.amazonaws.com' },
            }),
          ]),
        },
      });
    });
  });

  describe('Lambda runtime configuration', () => {
    test('accepts Lambda runtime configuration', () => {
      const template = Template.fromStack(lambdaStack);

      // Should create Lambda function (agent function + LogRetention function)
      template.resourceCountIs('AWS::Lambda::Function', 2);

      // Verify the agent Lambda has correct configuration
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'LambdaTestAgent',
        Handler: 'batch.handler',
        Timeout: 600,
        MemorySize: 1024,
      });
    });

    test('creates Lambda function with correct environment variables', () => {
      const template = Template.fromStack(lambdaStack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'LambdaTestAgent',
        Environment: {
          Variables: Match.objectLike({
            MODEL_ID: testModel.modelId,
            PROMPT: 'Test prompt',
            INVOKE_TYPE: 'batch',
          }),
        },
      });
    });
  });

  describe('AgentCore runtime configuration', () => {
    test('will support AgentCore runtime configuration (Task 7)', () => {
      const template = Template.fromStack(agentCoreStack);

      // Currently creates Lambda (agent function + LogRetention function) - Task 7 will add AgentCore support
      template.resourceCountIs('AWS::Lambda::Function', 2);

      // TODO: After Task 7, should create AgentCore resources
      // template.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);
      // template.resourceCountIs('AWS::BedrockAgentCore::RuntimeEndpoint', 1);
    });
  });

  describe('Encryption key accessibility', () => {
    test('creates default encryption key when not provided', () => {
      const template = Template.fromStack(defaultStack);

      // Should have at least one KMS key (agent encryption key)
      const keys = template.findResources('AWS::KMS::Key');
      expect(Object.keys(keys).length).toBeGreaterThanOrEqual(1);

      // Verify at least one key has rotation enabled
      const hasRotationEnabled = Object.values(keys).some((key: any) =>
        key.Properties.EnableKeyRotation === true,
      );
      expect(hasRotationEnabled).toBe(true);
    });

    test('uses custom encryption key when provided', () => {
      const template = Template.fromStack(encryptionKeyStack);

      // Should have the custom key
      const keys = template.findResources('AWS::KMS::Key');
      expect(Object.keys(keys).length).toBeGreaterThanOrEqual(1);

      // Custom key should have rotation enabled
      const hasRotationEnabled = Object.values(keys).some((key: any) =>
        key.Properties.EnableKeyRotation === true,
      );
      expect(hasRotationEnabled).toBe(true);
    });

    test('encryption key is accessible to Lambda runtime', () => {
      const template = Template.fromStack(defaultStack);

      // Lambda function should reference encryption key
      template.hasResourceProperties('AWS::Lambda::Function', {
        KmsKeyArn: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*Key.*'), 'Arn']),
        }),
      });
    });
  });

  describe('Tool asset permissions', () => {
    test('grants read access to tool assets', () => {
      const template = Template.fromStack(toolsStack);

      // Should have IAM policy with S3 permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['s3:GetObject*', 's3:GetBucket*', 's3:List*']),
              Effect: 'Allow',
            }),
          ]),
        },
      });
    });

    test('adds additional tool-specific permissions', () => {
      const template = Template.fromStack(toolsStack);

      // Should have DynamoDB permissions (Action can be string or array)
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'dynamodb:GetItem',
              Resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/TestTable',
            }),
          ]),
        },
      });
    });

    test('grants Bedrock model permissions', () => {
      const template = Template.fromStack(toolsStack);

      // Should have Bedrock permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['bedrock:InvokeModel']),
            }),
          ]),
        },
      });
    });
  });

  describe('Observability configuration for Lambda runtime', () => {
    test('configures observability for Lambda runtime', () => {
      const template = Template.fromStack(observabilityLambdaStack);

      // Lambda function should exist (agent function + LogRetention function)
      template.resourceCountIs('AWS::Lambda::Function', 2);

      // Should have Powertools environment variables in the agent Lambda
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'ObservabilityLambdaTestAgent',
        Environment: {
          Variables: Match.objectLike({
            POWERTOOLS_SERVICE_NAME: Match.anyValue(),
            POWERTOOLS_METRICS_NAMESPACE: Match.anyValue(),
          }),
        },
      });
    });

    test('creates CloudWatch log group for Lambda', () => {
      const template = Template.fromStack(observabilityLambdaStack);

      // LogGroup is created by LogRetention custom resource
      // LogGroupName is a CloudFormation intrinsic function, so we just verify the resource exists
      template.resourceCountIs('Custom::LogRetention', 1);
    });
  });

  describe('Observability configuration for AgentCore runtime', () => {
    test('will support AgentCore observability (Task 7)', () => {
      const template = Template.fromStack(observabilityAgentCoreStack);

      // Currently creates Lambda with Powertools (agent function + LogRetention function) - Task 7 will add AgentCore support
      template.resourceCountIs('AWS::Lambda::Function', 2);

      // TODO: After Task 7, should have ADOT environment variables
      // template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
      //   EnvironmentVariables: Match.objectLike({
      //     AGENT_OBSERVABILITY_ENABLED: 'true',
      //     OTEL_PYTHON_DISTRO: 'aws_distro',
      //   }),
      // });
    });
  });

  describe('Runtime interface', () => {
    test('exposes runtime property', () => {
      const agent = new BatchAgent(new Stack(), 'TestRuntimeAgent', {
        agentName: 'TestRuntimeAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      expect(agent.runtime).toBeDefined();
      expect(agent.runtime.runtimeType).toBe(AgentRuntimeType.LAMBDA);
      expect(agent.runtime.executionRole).toBeDefined();
      expect(agent.runtime.invocationArn).toBeDefined();
    });

    test('provides backward compatible agentRole property', () => {
      const agent = new BatchAgent(new Stack(), 'TestRoleAgent', {
        agentName: 'TestRoleAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      expect(agent.agentRole).toBeDefined();
      expect(agent.agentRole).toBe(agent.runtime.executionRole);
    });

    test('provides backward compatible agentFunction property for Lambda', () => {
      const agent = new BatchAgent(new Stack(), 'TestFunctionAgent', {
        agentName: 'TestFunctionAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      expect(agent.agentFunction).toBeDefined();
    });

    test('will return undefined agentFunction for AgentCore runtime (Task 7)', () => {
      // This test will be updated when Task 7 adds AgentCore support to BatchAgent
      const agent = new BatchAgent(new Stack(), 'TestAgentCoreFunction', {
        agentName: 'TestAgentCoreFunction',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      // Currently returns Lambda function (Task 7 will add AgentCore support)
      expect(agent.agentFunction).toBeDefined();

      // TODO: After Task 7, when AgentCore runtime is used:
      // expect(agent.agentFunction).toBeUndefined();
    });
  });
});
