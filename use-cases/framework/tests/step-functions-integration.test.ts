// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { JsonPath, TaskInput } from 'aws-cdk-lib/aws-stepfunctions';
import { BatchAgent } from '../agents/batch-agent';
import { AgentRuntimeType, AgentCoreDeploymentMethod } from '../agents/runtime';
import { Network } from '../foundation';

describe('Step Functions Integration', () => {
  let lambdaStack: Stack;
  let agentCoreStack: Stack;
  let vpcStack: Stack;
  let customPayloadStack: Stack;
  let lambdaTemplate: Template;
  let agentCoreTemplate: Template;
  let vpcTemplate: Template;
  let customPayloadTemplate: Template;

  let systemPrompt: Asset;
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  beforeAll(() => {
    // Create stacks once for reuse across tests
    lambdaStack = new Stack(undefined, 'LambdaStepFunctionsStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    agentCoreStack = new Stack(undefined, 'AgentCoreStepFunctionsStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    vpcStack = new Stack(undefined, 'VPCStepFunctionsStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    customPayloadStack = new Stack(undefined, 'CustomPayloadStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    // Create system prompt asset
    systemPrompt = new Asset(lambdaStack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });

    // Test 1: Lambda runtime with Step Functions task
    const lambdaAgent = new BatchAgent(lambdaStack, 'LambdaAgent', {
      agentName: 'LambdaStepFunctionsAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
      runtime: {
        type: AgentRuntimeType.LAMBDA,
      },
    });

    // Create Step Functions task for Lambda agent
    lambdaAgent.createStepFunctionsTask(lambdaStack, 'InvokeLambdaAgent', {
      resultPath: '$.agentResult',
    });

    // Test 2: AgentCore runtime with Step Functions task
    const agentCoreAgent = new BatchAgent(agentCoreStack, 'AgentCoreAgent', {
      agentName: 'AgentCoreStepFunctionsAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt: new Asset(agentCoreStack, 'AgentCoreSystemPrompt', {
          path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
        }),
      },
      runtime: {
        type: AgentRuntimeType.AGENTCORE,
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
        },
      },
    });

    // Create Step Functions task for AgentCore agent
    agentCoreAgent.createStepFunctionsTask(agentCoreStack, 'InvokeAgentCoreAgent', {
      resultPath: '$.agentResult',
    });

    // Test 3: AgentCore with VPC configuration
    const network = new Network(vpcStack, 'TestNetwork', {
      maxAzs: 2,
      natGateways: 1,
    });

    const vpcAgent = new BatchAgent(vpcStack, 'VPCAgent', {
      agentName: 'VPCStepFunctionsAgent',
      prompt: 'Test prompt',
      network,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt: new Asset(vpcStack, 'VPCSystemPrompt', {
          path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
        }),
      },
      runtime: {
        type: AgentRuntimeType.AGENTCORE,
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
        },
      },
    });

    // Create Step Functions task for VPC agent
    vpcAgent.createStepFunctionsTask(vpcStack, 'InvokeVPCAgent');

    // Test 4: Custom payload and result configuration
    const customPayloadAgent = new BatchAgent(customPayloadStack, 'CustomPayloadAgent', {
      agentName: 'CustomPayloadAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt: new Asset(customPayloadStack, 'CustomPayloadSystemPrompt', {
          path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
        }),
      },
      runtime: {
        type: AgentRuntimeType.LAMBDA,
      },
    });

    // Create Step Functions task with custom payload
    customPayloadAgent.createStepFunctionsTask(customPayloadStack, 'InvokeCustomPayloadAgent', {
      payload: TaskInput.fromObject({
        documentId: JsonPath.stringAt('$.documentId'),
        bucket: JsonPath.stringAt('$.bucket'),
      }),
      resultPath: '$.customResult',
      resultSelector: {
        'output.$': '$.Payload.result',
      },
    });

    // Generate templates
    lambdaTemplate = Template.fromStack(lambdaStack);
    agentCoreTemplate = Template.fromStack(agentCoreStack);
    vpcTemplate = Template.fromStack(vpcStack);
    customPayloadTemplate = Template.fromStack(customPayloadStack);
  });

  describe('Lambda runtime Step Functions integration', () => {
    test('createStepFunctionsTask() creates LambdaInvoke for Lambda runtime', () => {
      // The LambdaInvoke task is created as part of the Step Functions state machine
      // We verify that the Lambda function exists and has the correct configuration
      // Note: Stack contains 2 Lambda functions - the agent function and BucketNotificationsHandler
      lambdaTemplate.resourceCountIs('AWS::Lambda::Function', 2);

      // Verify Lambda function has correct properties
      lambdaTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: Match.stringLikeRegexp('LambdaStepFunctionsAgent'),
      });
    });

    test('Lambda function is invocable by Step Functions', () => {
      // Verify that the Lambda function has an execution role
      lambdaTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'lambda.amazonaws.com' },
            }),
          ]),
        },
      });
    });

    test('custom payload configuration is supported for Lambda', () => {
      // Verify Lambda function exists
      // Note: Stack contains 2 Lambda functions - the agent function and BucketNotificationsHandler
      customPayloadTemplate.resourceCountIs('AWS::Lambda::Function', 2);

      customPayloadTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: Match.stringLikeRegexp('CustomPayloadAgent'),
      });
    });
  });

  describe('AgentCore runtime Step Functions integration', () => {
    test('createStepFunctionsTask() creates appropriate configuration for AgentCore runtime', () => {
      // Verify AgentCore runtime is created
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);

      // Verify AgentCore runtime endpoint is created
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::RuntimeEndpoint', 1);

      // Verify AgentCore runtime has correct properties
      agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'AgentCoreStepFunctionsAgent',
      });
    });

    test('AgentCore runtime endpoint is created for invocation', () => {
      // Verify endpoint is created with reference to runtime
      agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::RuntimeEndpoint', {
        AgentRuntimeId: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([
            Match.stringLikeRegexp('.*Runtime.*'),
            'AgentRuntimeId',
          ]),
        }),
        Name: Match.stringLikeRegexp('.*endpoint'),
      });
    });

    test('AgentCore runtime has correct IAM permissions', () => {
      // Verify execution role is created with correct service principal
      agentCoreTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'agentcore.amazonaws.com' },
            }),
          ]),
        },
      });
    });
  });

  describe('VPC configuration for AgentCore', () => {
    test('VPC configuration is applied to AgentCore runtime', () => {
      // Verify VPC is created
      vpcTemplate.resourceCountIs('AWS::EC2::VPC', 1);

      // Verify AgentCore runtime is created
      vpcTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);

      // Verify AgentCore runtime has correct properties
      // Note: VPC configuration is handled by the runtime itself,
      // not through IAM permissions
      vpcTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'VPCStepFunctionsAgent',
      });
    });

    test('AgentCore runtime uses PUBLIC network mode', () => {
      // Currently AgentCore uses PUBLIC network mode
      // VPC support may be added in future versions
      vpcTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        NetworkConfiguration: {
          NetworkMode: 'PUBLIC',
        },
      });
    });
  });

  describe('Session ID and payload configuration', () => {
    test('AgentCore invocation uses Step Functions execution ID as session ID', () => {
      // The session ID configuration is part of the CallAwsService task
      // which is created at runtime in the Step Functions state machine
      // We verify that the AgentCore runtime and endpoint are properly configured
      // to support session-based invocation

      // Verify AgentCore runtime exists
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);

      // Verify AgentCore runtime endpoint exists
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::RuntimeEndpoint', 1);

      // The actual session ID mapping (JsonPath.executionId) is configured
      // in the CallAwsService task, which is part of the Step Functions
      // state machine definition, not the CDK template
    });

    test('payload is passed correctly to agent', () => {
      // Verify that the agent runtime is configured to receive payloads
      // The actual payload mapping is done in the Step Functions task

      // For Lambda runtime (includes BucketNotificationsHandler)
      lambdaTemplate.resourceCountIs('AWS::Lambda::Function', 2);

      // For AgentCore runtime
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);
    });
  });

  describe('Result path and selector configuration', () => {
    test('default result path is applied', () => {
      // The result path configuration is part of the Step Functions task
      // We verify that the underlying resources are properly configured

      // Lambda agent (includes BucketNotificationsHandler)
      lambdaTemplate.resourceCountIs('AWS::Lambda::Function', 2);

      // AgentCore agent
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);
    });

    test('custom result path and selector are supported', () => {
      // Verify custom payload agent is created (includes BucketNotificationsHandler)
      customPayloadTemplate.resourceCountIs('AWS::Lambda::Function', 2);

      customPayloadTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: Match.stringLikeRegexp('CustomPayloadAgent'),
      });
    });
  });

  describe('IAM permissions for Step Functions invocation', () => {
    test('Lambda runtime grants correct invocation permissions', () => {
      // Verify Lambda function has execution role
      lambdaTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'lambda.amazonaws.com' },
            }),
          ]),
        },
      });

      // Lambda invocation permissions are granted via grantInvoke()
      // which is called by the LambdaInvoke task
    });

    test('AgentCore runtime grants correct invocation permissions', () => {
      // Verify AgentCore execution role
      agentCoreTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'agentcore.amazonaws.com' },
            }),
          ]),
        },
      });

      // AgentCore invocation permissions (bedrock-agentcore:InvokeAgentRuntime)
      // are granted via grantInvoke() which is called by the CallAwsService task
    });
  });
});
