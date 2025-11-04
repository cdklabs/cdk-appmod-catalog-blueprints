import * as path from 'path';
import { Aspects, Stack } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { BatchAgent } from '../agents/batch-agent';
import { AccessLog } from '../foundation/access-log';
import { EventbridgeBroker } from '../foundation/eventbridge-broker';
import { Network } from '../foundation/network';

const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

describe('Framework CDK Nag Tests', () => {
  describe('AccessLog', () => {
    test('passes CDK Nag checks', () => {
      const stack = new Stack(undefined, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      new AccessLog(stack, 'AccessLog');

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-S1',
          reason: 'Access log bucket does not need its own access logging to avoid circular dependency',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('Network', () => {
    test('passes CDK Nag checks for public VPC', () => {
      const stack = new Stack();
      new Network(stack, 'Network');

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-VPC7',
          reason: 'VPC Flow Logs are optional and should be enabled by users based on requirements',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks for private VPC', () => {
      const stack = new Stack();
      new Network(stack, 'Network', { private: true });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-VPC7',
          reason: 'VPC Flow Logs are optional and should be enabled by users based on requirements',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('EventbridgeBroker', () => {
    test('passes CDK Nag checks', () => {
      const stack = new Stack();
      new EventbridgeBroker(stack, 'Broker', {
        eventSource: 'test.source',
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('BatchAgent', () => {
    test('passes CDK Nag checks', () => {
      const stack = new Stack(undefined, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
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
          reason: 'Managed policies are acceptable for Lambda execution role',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for S3 asset access, Bedrock model invocation, and CloudWatch Logs',
          appliesTo: [
            'Action::s3:GetObject*',
            'Action::s3:GetBucket*',
            'Action::s3:List*',
            'Resource::*',
            'Resource::arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
            'Resource::arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/TestAgent-teststackagentaa2af0c4:*',
          ],
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime is managed by construct defaults',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes CDK Nag checks with VPC configuration', () => {
      const stack = new Stack(undefined, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const network = new Network(stack, 'Network');
      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
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
          reason: 'Managed policies are acceptable for Lambda execution role',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for VPC, S3, and Bedrock access',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime is managed by construct defaults',
        },
        {
          id: 'AwsSolutions-VPC7',
          reason: 'VPC Flow Logs are optional',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });
});
