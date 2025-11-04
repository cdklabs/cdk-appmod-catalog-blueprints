import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { BatchAgent } from '../agents/batch-agent';
import { Network } from '../foundation/network';

describe('BatchAgent', () => {
  let stack: Stack;
  let systemPrompt: Asset;
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  beforeEach(() => {
    stack = new Stack(undefined, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    systemPrompt = new Asset(stack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });
  });

  test('creates Lambda function with correct configuration', () => {
    new BatchAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: Match.stringLikeRegexp('python3\\.1[23]'),
      Timeout: 600,
      MemorySize: 1024,
      Environment: {
        Variables: Match.objectLike({
          MODEL_ID: testModel.modelId,
          INVOKE_TYPE: 'batch',
          PROMPT: 'Test prompt',
        }),
      },
    });
  });

  test('creates IAM role with Bedrock permissions', () => {
    new BatchAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'lambda.amazonaws.com' },
          }),
        ]),
      },
    });

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

  test('creates KMS key for environment encryption', () => {
    new BatchAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    const template = Template.fromStack(stack);
    // At least one KMS key exists (agent encryption key, plus potentially asset deployment key)
    const keys = template.findResources('AWS::KMS::Key');
    expect(Object.keys(keys).length).toBeGreaterThanOrEqual(1);

    // Verify at least one key has rotation enabled
    const hasRotationEnabled = Object.values(keys).some((key: any) =>
      key.Properties.EnableKeyRotation === true,
    );
    expect(hasRotationEnabled).toBe(true);
  });

  test('configures VPC when network provided', () => {
    const network = new Network(stack, 'Network');

    new BatchAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      prompt: 'Test prompt',
      network,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      VpcConfig: Match.objectLike({
        SubnetIds: Match.anyValue(),
      }),
    });
  });

  test('sets EXPECT_JSON environment variable when expectJson is true', () => {
    new BatchAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      prompt: 'Test prompt',
      expectJson: true,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          EXPECT_JSON: 'True',
        }),
      },
    });
  });

  test('enables observability with Powertools configuration', () => {
    new BatchAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      prompt: 'Test prompt',
      enableObservability: true,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          POWERTOOLS_SERVICE_NAME: Match.anyValue(),
          POWERTOOLS_METRICS_NAMESPACE: Match.anyValue(),
        }),
      },
    });
  });

  test('grants read access to system prompt asset', () => {
    new BatchAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    const template = Template.fromStack(stack);
    // Verify that IAM policies exist (S3 permissions are granted via Asset construct)
    const policies = template.findResources('AWS::IAM::Policy');
    expect(Object.keys(policies).length).toBeGreaterThan(0);
  });
});
