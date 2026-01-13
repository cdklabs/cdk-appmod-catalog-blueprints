// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Aspects, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { BatchAgent } from '../agents/batch-agent';
import { AgentCoreAgentRuntime } from '../agents/runtime/agentcore-runtime';
import { LambdaAgentRuntime } from '../agents/runtime/lambda-runtime';
import { AgentRuntimeType, AgentCoreDeploymentMethod } from '../agents/runtime/types';
import { Network } from '../foundation/network';

const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

// Helper to get valid entry path for tests
const getTestEntry = (): string => path.join(__dirname, '../agents/resources/default-strands-agent');

describe('Runtime CDK Nag Tests', () => {
  describe('LambdaAgentRuntime', () => {
    test('passes CDK Nag checks with basic configuration', () => {
      const stack = new Stack(undefined, 'LambdaBasicStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      new LambdaAgentRuntime(stack, 'BasicRuntime', {
        functionName: 'basic-agent',
        entry: getTestEntry(),
        index: 'batch.py',
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda execution role uses AWSLambdaBasicExecutionRole managed policy',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda log stream ARN is only known at runtime, wildcard required',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime version is managed by construct defaults',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks with VPC configuration', () => {
      const stack = new Stack(undefined, 'LambdaVpcStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const vpc = new Vpc(stack, 'Vpc');

      new LambdaAgentRuntime(stack, 'VpcRuntime', {
        functionName: 'vpc-agent',
        entry: getTestEntry(),
        index: 'batch.py',
        vpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda execution role uses managed policies for VPC and basic execution',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda requires wildcard permissions for VPC ENI management and CloudWatch Logs',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime version is managed by construct defaults',
        },
        {
          id: 'AwsSolutions-VPC7',
          reason: 'VPC Flow Logs are optional and should be enabled by users based on requirements',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks with encryption', () => {
      const stack = new Stack(undefined, 'LambdaEncryptionStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const encryptionKey = new Key(stack, 'EncryptionKey', {
        enableKeyRotation: true,
      });

      new LambdaAgentRuntime(stack, 'EncryptedRuntime', {
        functionName: 'encrypted-agent',
        entry: getTestEntry(),
        index: 'batch.py',
        environmentEncryption: encryptionKey,
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda execution role uses AWSLambdaBasicExecutionRole managed policy',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda log stream ARN is only known at runtime, wildcard required',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime version is managed by construct defaults',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('AgentCoreAgentRuntime', () => {
    test('passes CDK Nag checks with CONTAINER deployment', () => {
      const stack = new Stack(undefined, 'AgentCoreContainerStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      new AgentCoreAgentRuntime(stack, 'ContainerRuntime', {
        agentName: 'container-agent',
        foundationModel: 'anthropic.claude-v2',
        instruction: 'Test agent instruction',
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-agent:latest',
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks with VPC configuration', () => {
      const stack = new Stack(undefined, 'AgentCoreVpcStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const vpc = new Vpc(stack, 'Vpc');

      new AgentCoreAgentRuntime(stack, 'VpcRuntime', {
        agentName: 'vpc-agent',
        foundationModel: 'anthropic.claude-v2',
        instruction: 'Test agent instruction',
        network: {
          vpc,
          vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        },
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-agent:latest',
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'AgentCore requires wildcard permissions for VPC resource discovery',
          appliesTo: ['Resource::*'],
        },
        {
          id: 'AwsSolutions-VPC7',
          reason: 'VPC Flow Logs are optional and should be enabled by users based on requirements',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks with custom removal policy', () => {
      const stack = new Stack(undefined, 'AgentCoreRemovalStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      new AgentCoreAgentRuntime(stack, 'RemovalRuntime', {
        agentName: 'removal-agent',
        foundationModel: 'anthropic.claude-v2',
        instruction: 'Test agent instruction',
        removalPolicy: RemovalPolicy.DESTROY,
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-agent:latest',
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('BatchAgent with Lambda Runtime', () => {
    test('passes CDK Nag checks with default Lambda runtime', () => {
      const stack = new Stack(undefined, 'BatchAgentLambdaDefaultStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'test-agent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda execution role uses AWSLambdaBasicExecutionRole managed policy',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for S3 asset access, Bedrock model invocation, and CloudWatch Logs',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime version is managed by construct defaults',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks with explicit Lambda runtime configuration', () => {
      const stack = new Stack(undefined, 'BatchAgentLambdaExplicitStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'test-agent',
        prompt: 'Test prompt',
        runtime: {
          type: AgentRuntimeType.LAMBDA,
          config: {
            timeout: Duration.minutes(5),
            memorySize: 2048,
            architecture: Architecture.X86_64,
          },
        },
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda execution role uses AWSLambdaBasicExecutionRole managed policy',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for S3 asset access, Bedrock model invocation, and CloudWatch Logs',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime version is managed by construct defaults',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks with VPC configuration', () => {
      const stack = new Stack(undefined, 'BatchAgentLambdaVpcStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const network = new Network(stack, 'Network');
      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'test-agent',
        prompt: 'Test prompt',
        network,
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda execution role uses managed policies for VPC and basic execution',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for VPC ENI management, S3, Bedrock, and CloudWatch Logs',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime version is managed by construct defaults',
        },
        {
          id: 'AwsSolutions-VPC7',
          reason: 'VPC Flow Logs are optional and should be enabled by users based on requirements',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('BatchAgent with AgentCore Runtime', () => {
    test('passes CDK Nag checks with AgentCore runtime', () => {
      const stack = new Stack(undefined, 'BatchAgentAgentCoreStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'test-agent',
        prompt: 'Test prompt',
        runtime: {
          type: AgentRuntimeType.AGENTCORE,
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
            imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-agent:latest',
            timeout: Duration.hours(1),
            memorySize: 4096,
          },
        },
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for S3 asset access and Bedrock model invocation',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks with AgentCore runtime and VPC', () => {
      const stack = new Stack(undefined, 'BatchAgentAgentCoreVpcStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const network = new Network(stack, 'Network');
      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'test-agent',
        prompt: 'Test prompt',
        network,
        runtime: {
          type: AgentRuntimeType.AGENTCORE,
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
            imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-agent:latest',
          },
        },
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for VPC resource discovery, S3 asset access, and Bedrock model invocation',
        },
        {
          id: 'AwsSolutions-VPC7',
          reason: 'VPC Flow Logs are optional and should be enabled by users based on requirements',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks with observability enabled', () => {
      const stack = new Stack(undefined, 'BatchAgentAgentCoreObservabilityStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'test-agent',
        prompt: 'Test prompt',
        enableObservability: true,
        runtime: {
          type: AgentRuntimeType.AGENTCORE,
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
            imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-agent:latest',
          },
        },
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for S3 asset access and Bedrock model invocation',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('Cross-Runtime Security Compliance', () => {
    test('both runtimes follow encryption best practices', () => {
      const stack = new Stack(undefined, 'EncryptionComplianceStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const encryptionKey = new Key(stack, 'EncryptionKey', {
        enableKeyRotation: true,
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      // Lambda runtime with encryption
      new BatchAgent(stack, 'LambdaAgent', {
        agentName: 'lambda-agent',
        prompt: 'Test prompt',
        encryptionKey,
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      // AgentCore runtime with encryption
      new BatchAgent(stack, 'AgentCoreAgent', {
        agentName: 'agentcore-agent',
        prompt: 'Test prompt',
        encryptionKey,
        runtime: {
          type: AgentRuntimeType.AGENTCORE,
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
            imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-agent:latest',
          },
        },
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda execution role uses AWSLambdaBasicExecutionRole managed policy',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for S3 asset access, Bedrock model invocation, and CloudWatch Logs',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime version is managed by construct defaults',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });
});
