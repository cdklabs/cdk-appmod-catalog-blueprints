import * as path from 'path';
import { Stack, App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { createTestApp } from '../../utilities/test-utils';
import { BatchAgent, generateKnowledgeBaseSystemPromptAddition } from '../agents/batch-agent';
import { InvokeType } from '../agents/invoke-type';
import { BedrockKnowledgeBase } from '../agents/knowledge-base';
import { Network } from '../foundation/network';

describe('BatchAgent', () => {
  let app: App;
  let stack: Stack;
  let systemPrompt: Asset;
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
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
          INVOKE_TYPE: InvokeType.BATCH,
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

  describe('Knowledge Base Integration', () => {
    test('sets KNOWLEDGE_BASES_CONFIG environment variable when KBs configured', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base for unit testing',
        knowledgeBaseId: 'KB123456',
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            KNOWLEDGE_BASES_CONFIG: Match.anyValue(),
          }),
        },
      });
    });

    test('KNOWLEDGE_BASES_CONFIG contains correct JSON structure', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'product-docs',
        description: 'Product documentation',
        knowledgeBaseId: 'KB123456',
        retrieval: {
          numberOfResults: 10,
        },
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
        },
      });

      const template = Template.fromStack(stack);
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const lambdaFunction = Object.values(lambdaFunctions)[0] as any;
      const kbConfig = JSON.parse(lambdaFunction.Properties.Environment.Variables.KNOWLEDGE_BASES_CONFIG);

      expect(kbConfig).toHaveLength(1);
      expect(kbConfig[0].name).toBe('product-docs');
      expect(kbConfig[0].description).toBe('Product documentation');
      expect(kbConfig[0].knowledgeBaseId).toBe('KB123456');
      expect(kbConfig[0].retrieval.numberOfResults).toBe(10);
    });

    test('sets KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION when KBs configured', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'KB123456',
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION: Match.anyValue(),
          }),
        },
      });
    });

    test('does not set KB environment variables when no KBs configured', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const lambdaFunction = Object.values(lambdaFunctions)[0] as any;
      const envVars = lambdaFunction.Properties.Environment.Variables;

      expect(envVars.KNOWLEDGE_BASES_CONFIG).toBeUndefined();
      expect(envVars.KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION).toBeUndefined();
    });

    test('supports multiple knowledge bases', () => {
      const kb1 = new BedrockKnowledgeBase(stack, 'TestKB1', {
        name: 'product-docs',
        description: 'Product documentation',
        knowledgeBaseId: 'KB111111',
      });

      const kb2 = new BedrockKnowledgeBase(stack, 'TestKB2', {
        name: 'support-articles',
        description: 'Support articles and FAQs',
        knowledgeBaseId: 'KB222222',
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb1, kb2],
        },
      });

      const template = Template.fromStack(stack);
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const lambdaFunction = Object.values(lambdaFunctions)[0] as any;
      const kbConfig = JSON.parse(lambdaFunction.Properties.Environment.Variables.KNOWLEDGE_BASES_CONFIG);

      expect(kbConfig).toHaveLength(2);
      expect(kbConfig[0].name).toBe('product-docs');
      expect(kbConfig[1].name).toBe('support-articles');
    });

    test('system prompt addition lists all configured KBs', () => {
      const kb1 = new BedrockKnowledgeBase(stack, 'TestKB1', {
        name: 'product-docs',
        description: 'Product documentation',
        knowledgeBaseId: 'KB111111',
      });

      const kb2 = new BedrockKnowledgeBase(stack, 'TestKB2', {
        name: 'support-articles',
        description: 'Support articles and FAQs',
        knowledgeBaseId: 'KB222222',
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb1, kb2],
        },
      });

      const template = Template.fromStack(stack);
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const lambdaFunction = Object.values(lambdaFunctions)[0] as any;
      const systemPromptAddition = lambdaFunction.Properties.Environment.Variables.KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION;

      expect(systemPromptAddition).toContain('product-docs');
      expect(systemPromptAddition).toContain('Product documentation');
      expect(systemPromptAddition).toContain('support-articles');
      expect(systemPromptAddition).toContain('Support articles and FAQs');
    });

    test('environment variables are encrypted with KMS key', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'KB123456',
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
        },
      });

      const template = Template.fromStack(stack);
      // Verify Lambda function has KMS key for environment encryption
      template.hasResourceProperties('AWS::Lambda::Function', {
        KmsKeyArn: Match.anyValue(),
      });
    });
  });

  describe('generateKnowledgeBaseSystemPromptAddition', () => {
    test('returns empty string when no KBs configured', () => {
      const result = generateKnowledgeBaseSystemPromptAddition([]);
      expect(result).toBe('');
    });

    test('includes retrieval tool description', () => {
      const result = generateKnowledgeBaseSystemPromptAddition([
        {
          name: 'test-kb',
          description: 'Test KB',
          retrieval: { numberOfResults: 5 },
        },
      ]);

      expect(result).toContain('retrieve_from_knowledge_base');
      expect(result).toContain('Knowledge Base Retrieval');
    });

    test('lists KB name and description', () => {
      const result = generateKnowledgeBaseSystemPromptAddition([
        {
          name: 'product-docs',
          description: 'Product documentation and guides',
          retrieval: { numberOfResults: 5 },
        },
      ]);

      expect(result).toContain('**product-docs**');
      expect(result).toContain('Product documentation and guides');
    });

    test('lists multiple KBs', () => {
      const result = generateKnowledgeBaseSystemPromptAddition([
        {
          name: 'kb1',
          description: 'First KB',
          retrieval: { numberOfResults: 5 },
        },
        {
          name: 'kb2',
          description: 'Second KB',
          retrieval: { numberOfResults: 5 },
        },
      ]);

      expect(result).toContain('**kb1**');
      expect(result).toContain('First KB');
      expect(result).toContain('**kb2**');
      expect(result).toContain('Second KB');
    });

    test('includes usage instructions', () => {
      const result = generateKnowledgeBaseSystemPromptAddition([
        {
          name: 'test-kb',
          description: 'Test KB',
          retrieval: { numberOfResults: 5 },
        },
      ]);

      expect(result).toContain('How to use the retrieval tool');
      expect(result).toContain('knowledge_base_id');
    });
  });
});
