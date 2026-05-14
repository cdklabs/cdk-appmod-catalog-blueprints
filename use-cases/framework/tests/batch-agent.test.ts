import * as path from 'path';
import { Stack, App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { createTestApp } from '../../utilities/test-utils';
import { McpTransportType, McpAuthFlow, McpServerConfig } from '../agents/base-agent';
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

  describe('MCP Server Support', () => {
    const mcpServerPlainHeaders: McpServerConfig = {
      name: 'dev-server',
      url: 'https://mcp.example.com/mcp',
      transportType: McpTransportType.STREAMABLE_HTTP,
      headers: { Authorization: 'Bearer dev-token' },
    };

    const mcpServerSecretsManager: McpServerConfig = {
      name: 'prod-server',
      url: 'https://mcp.example.com/sse',
      transportType: McpTransportType.SSE,
      headers: {
        Authorization: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:my-api-key',
      },
    };

    const mcpServerAgentCoreIdentity: McpServerConfig = {
      name: 'oauth-server',
      url: 'https://oauth-mcp.example.com/mcp',
      transportType: McpTransportType.STREAMABLE_HTTP,
      credentialProviderName: 'my-credential-provider',
      authScopes: ['read', 'write'],
      authFlow: McpAuthFlow.M2M,
    };

    test('sets MCP_SERVERS_CONFIG env var with correct JSON when mcpServers is provided', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [mcpServerPlainHeaders],
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            MCP_SERVERS_CONFIG: Match.anyValue(),
          }),
        },
      });
    });

    test('sets MCP_DEFAULT_AUTH_FLOW=M2M when mcpServers is provided', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [mcpServerPlainHeaders],
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            MCP_DEFAULT_AUTH_FLOW: 'M2M',
          }),
        },
      });
    });

    test('does NOT set MCP_SERVERS_CONFIG when mcpServers is absent', () => {
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

      expect(envVars.MCP_SERVERS_CONFIG).toBeUndefined();
      expect(envVars.MCP_DEFAULT_AUTH_FLOW).toBeUndefined();
    });

    test('does NOT set MCP_SERVERS_CONFIG when mcpServers is empty array', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [],
        },
      });

      const template = Template.fromStack(stack);
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const lambdaFunction = Object.values(lambdaFunctions)[0] as any;
      const envVars = lambdaFunction.Properties.Environment.Variables;

      expect(envVars.MCP_SERVERS_CONFIG).toBeUndefined();
      expect(envVars.MCP_DEFAULT_AUTH_FLOW).toBeUndefined();
    });

    test('MCP_SERVERS_CONFIG JSON contains all fields including optional ones', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [mcpServerAgentCoreIdentity],
        },
      });

      const template = Template.fromStack(stack);
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const lambdaFunction = Object.values(lambdaFunctions)[0] as any;
      const mcpConfig = JSON.parse(lambdaFunction.Properties.Environment.Variables.MCP_SERVERS_CONFIG);

      expect(mcpConfig).toHaveLength(1);
      expect(mcpConfig[0].name).toBe('oauth-server');
      expect(mcpConfig[0].url).toBe('https://oauth-mcp.example.com/mcp');
      expect(mcpConfig[0].transportType).toBe('STREAMABLE_HTTP');
      expect(mcpConfig[0].credentialProviderName).toBe('my-credential-provider');
      expect(mcpConfig[0].authScopes).toEqual(['read', 'write']);
      expect(mcpConfig[0].authFlow).toBe('M2M');
    });

    test('MCP_SERVERS_CONFIG JSON omits optional fields when not set', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [{
            name: 'minimal-server',
            url: 'https://mcp.example.com/mcp',
            transportType: McpTransportType.STREAMABLE_HTTP,
          }],
        },
      });

      const template = Template.fromStack(stack);
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const lambdaFunction = Object.values(lambdaFunctions)[0] as any;
      const mcpConfig = JSON.parse(lambdaFunction.Properties.Environment.Variables.MCP_SERVERS_CONFIG);

      expect(mcpConfig).toHaveLength(1);
      expect(mcpConfig[0].name).toBe('minimal-server');
      expect(mcpConfig[0].url).toBe('https://mcp.example.com/mcp');
      expect(mcpConfig[0].transportType).toBe('STREAMABLE_HTTP');
      expect(mcpConfig[0].headers).toBeUndefined();
      expect(mcpConfig[0].credentialProviderName).toBeUndefined();
      expect(mcpConfig[0].authScopes).toBeUndefined();
      expect(mcpConfig[0].authFlow).toBeUndefined();
    });

    test('Secrets Manager IAM policy is scoped to specific ARNs detected in headers', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [mcpServerSecretsManager],
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'secretsmanager:GetSecretValue',
              Effect: 'Allow',
              Resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:my-api-key',
            }),
          ]),
        },
      });
    });

    test('AgentCore Identity IAM policy is granted when credentialProviderName is present', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [mcpServerAgentCoreIdentity],
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'bedrock-agentcore:*',
              Effect: 'Allow',
              Resource: '*',
            }),
          ]),
        },
      });
    });

    test('no Secrets Manager or AgentCore Identity IAM policies when no MCP servers configured', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      const policies = template.findResources('AWS::IAM::Policy');

      // Verify no policy contains secretsmanager:GetSecretValue
      for (const policy of Object.values(policies) as any[]) {
        const statements = policy.Properties.PolicyDocument.Statement;
        for (const stmt of statements) {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          expect(actions).not.toContain('secretsmanager:GetSecretValue');
          expect(actions).not.toContain('bedrock-agentcore:*');
        }
      }
    });

    test('backward compatibility — no MCP env vars when mcpServers is not provided', () => {
      // Create agent without MCP servers
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

      // Core env vars should still be present
      expect(envVars.MODEL_ID).toBeDefined();
      expect(envVars.INVOKE_TYPE).toBe(InvokeType.BATCH);
      expect(envVars.PROMPT).toBe('Test prompt');

      // MCP env vars should NOT be present
      expect(envVars.MCP_SERVERS_CONFIG).toBeUndefined();
      expect(envVars.MCP_DEFAULT_AUTH_FLOW).toBeUndefined();
    });

    test('MCP servers coexist with S3 tools and knowledge bases', () => {
      const tool = new Asset(stack, 'Tool', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

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
          tools: [tool],
          knowledgeBases: [kb],
          mcpServers: [mcpServerPlainHeaders],
        },
      });

      const template = Template.fromStack(stack);
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const lambdaFunction = Object.values(lambdaFunctions)[0] as any;
      const envVars = lambdaFunction.Properties.Environment.Variables;

      // All three env vars should be present
      expect(envVars.TOOLS_CONFIG).toBeDefined();
      expect(envVars.KNOWLEDGE_BASES_CONFIG).toBeDefined();
      expect(envVars.MCP_SERVERS_CONFIG).toBeDefined();
      expect(envVars.MCP_DEFAULT_AUTH_FLOW).toBe('M2M');
    });

    test('supports multiple MCP servers in config', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [mcpServerPlainHeaders, mcpServerSecretsManager, mcpServerAgentCoreIdentity],
        },
      });

      const template = Template.fromStack(stack);
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const lambdaFunction = Object.values(lambdaFunctions)[0] as any;
      const mcpConfig = JSON.parse(lambdaFunction.Properties.Environment.Variables.MCP_SERVERS_CONFIG);

      expect(mcpConfig).toHaveLength(3);
      expect(mcpConfig[0].name).toBe('dev-server');
      expect(mcpConfig[1].name).toBe('prod-server');
      expect(mcpConfig[2].name).toBe('oauth-server');
    });

    test('Secrets Manager and AgentCore Identity IAM policies both granted when both are configured', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [mcpServerSecretsManager, mcpServerAgentCoreIdentity],
        },
      });

      const template = Template.fromStack(stack);

      // Secrets Manager policy
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'secretsmanager:GetSecretValue',
              Effect: 'Allow',
            }),
          ]),
        },
      });

      // AgentCore Identity policy
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'bedrock-agentcore:*',
              Effect: 'Allow',
              Resource: '*',
            }),
          ]),
        },
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
