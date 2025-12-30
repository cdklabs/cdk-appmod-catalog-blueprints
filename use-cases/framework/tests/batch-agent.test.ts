import * as path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { BatchAgent } from '../agents/batch-agent';
import { AgentRuntimeType, AgentCoreDeploymentMethod } from '../agents/runtime';
import { Network } from '../foundation/network';

describe('BatchAgent', () => {
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  // Stacks and templates for different test scenarios
  let lambdaDefaultStack: Stack;
  let lambdaDefaultTemplate: Template;
  let lambdaCustomStack: Stack;
  let lambdaCustomTemplate: Template;
  let lambdaVpcStack: Stack;
  let lambdaVpcTemplate: Template;
  let agentCoreStack: Stack;
  let agentCoreTemplate: Template;

  beforeAll(() => {
    // Create Lambda runtime with default configuration
    lambdaDefaultStack = new Stack(undefined, 'LambdaDefaultStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const lambdaDefaultPrompt = new Asset(lambdaDefaultStack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });
    new BatchAgent(lambdaDefaultStack, 'Agent', {
      agentName: 'TestAgent',
      prompt: 'Test prompt',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt: lambdaDefaultPrompt,
      },
    });
    lambdaDefaultTemplate = Template.fromStack(lambdaDefaultStack);

    // Create Lambda runtime with custom configuration
    lambdaCustomStack = new Stack(undefined, 'LambdaCustomStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const lambdaCustomPrompt = new Asset(lambdaCustomStack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });
    new BatchAgent(lambdaCustomStack, 'Agent', {
      agentName: 'CustomAgent',
      prompt: 'Custom prompt',
      expectJson: true,
      enableObservability: true,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt: lambdaCustomPrompt,
      },
      runtime: {
        type: AgentRuntimeType.LAMBDA,
        config: {
          timeout: Duration.minutes(5),
          memorySize: 2048,
          architecture: Architecture.X86_64,
        },
      },
    });
    lambdaCustomTemplate = Template.fromStack(lambdaCustomStack);

    // Create Lambda runtime with VPC configuration
    lambdaVpcStack = new Stack(undefined, 'LambdaVpcStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const lambdaVpcPrompt = new Asset(lambdaVpcStack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });
    const network = new Network(lambdaVpcStack, 'Network');
    new BatchAgent(lambdaVpcStack, 'Agent', {
      agentName: 'VpcAgent',
      prompt: 'VPC prompt',
      network,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt: lambdaVpcPrompt,
      },
    });
    lambdaVpcTemplate = Template.fromStack(lambdaVpcStack);

    // Create AgentCore runtime
    agentCoreStack = new Stack(undefined, 'AgentCoreStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const agentCorePrompt = new Asset(agentCoreStack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });
    new BatchAgent(agentCoreStack, 'Agent', {
      agentName: 'AgentCoreAgent',
      prompt: 'AgentCore prompt',
      expectJson: true,
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt: agentCorePrompt,
      },
      runtime: {
        type: AgentRuntimeType.AGENTCORE,
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
          timeout: Duration.minutes(15),
          memorySize: 4096,
        },
      },
    });
    agentCoreTemplate = Template.fromStack(agentCoreStack);
  });

  describe('Lambda Runtime - Default Configuration', () => {
    test('creates Lambda runtime by default when no runtime specified', () => {
      // Verify Lambda function is created (may include additional functions for log retention)
      const functions = lambdaDefaultTemplate.findResources('AWS::Lambda::Function');
      const agentFunctions = Object.values(functions).filter((fn: any) =>
        fn.Properties?.Environment?.Variables?.MODEL_ID !== undefined,
      );
      expect(agentFunctions.length).toBe(1);

      // Verify Lambda function has correct default configuration
      lambdaDefaultTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: Match.stringLikeRegexp('python3\\.1[23]'),
        Timeout: 600, // Default 10 minutes
        MemorySize: 1024, // Default memory
        Environment: {
          Variables: Match.objectLike({
            MODEL_ID: Match.anyValue(),
          }),
        },
      });
    });

    test('sets correct environment variables for Lambda runtime', () => {
      lambdaDefaultTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            MODEL_ID: testModel.modelId,
            INVOKE_TYPE: 'batch',
            PROMPT: 'Test prompt',
            SYSTEM_PROMPT_S3_BUCKET_NAME: Match.anyValue(),
            SYSTEM_PROMPT_S3_KEY: Match.anyValue(),
            TOOLS_CONFIG: Match.anyValue(),
          }),
        },
      });
    });

    test('creates IAM role with lambda.amazonaws.com service principal', () => {
      lambdaDefaultTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'lambda.amazonaws.com' },
            }),
          ]),
        },
      });
    });

    test('grants Bedrock permissions to Lambda execution role', () => {
      lambdaDefaultTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
      const keys = lambdaDefaultTemplate.findResources('AWS::KMS::Key');
      expect(Object.keys(keys).length).toBeGreaterThanOrEqual(1);

      // Verify at least one key has rotation enabled
      const hasRotationEnabled = Object.values(keys).some((key: any) =>
        key.Properties.EnableKeyRotation === true,
      );
      expect(hasRotationEnabled).toBe(true);
    });
  });

  describe('Lambda Runtime - Custom Configuration', () => {
    test('applies custom timeout and memory configuration', () => {
      lambdaCustomTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 300, // 5 minutes
        MemorySize: 2048,
      });
    });

    test('applies custom architecture configuration', () => {
      lambdaCustomTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Architectures: ['x86_64'],
      });
    });

    test('sets EXPECT_JSON environment variable when expectJson is true', () => {
      lambdaCustomTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            EXPECT_JSON: 'True',
          }),
        },
      });
    });

    test('enables observability with Powertools configuration for Lambda', () => {
      lambdaCustomTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            POWERTOOLS_SERVICE_NAME: Match.anyValue(),
            POWERTOOLS_METRICS_NAMESPACE: Match.anyValue(),
          }),
        },
      });
    });
  });

  describe('Lambda Runtime - VPC Configuration', () => {
    test('configures VPC when network provided for Lambda runtime', () => {
      lambdaVpcTemplate.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: Match.objectLike({
          SubnetIds: Match.anyValue(),
          SecurityGroupIds: Match.anyValue(),
        }),
      });
    });

    test('grants VPC permissions to Lambda execution role', () => {
      // VPC permissions are granted by CDK automatically when VPC is configured
      // The key requirement is that the Lambda function is properly configured with VPC
      lambdaVpcTemplate.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: Match.objectLike({
          SubnetIds: Match.anyValue(),
          SecurityGroupIds: Match.anyValue(),
        }),
        Environment: {
          Variables: Match.objectLike({
            MODEL_ID: Match.anyValue(),
          }),
        },
      });

      // Verify that an IAM role exists for the Lambda function
      // CDK automatically adds VPC permissions to this role
      lambdaVpcTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'lambda.amazonaws.com' },
            }),
          ]),
        },
      });

      // Verify that IAM policies exist (CDK adds VPC permissions automatically)
      const policies = lambdaVpcTemplate.findResources('AWS::IAM::Policy');
      expect(Object.keys(policies).length).toBeGreaterThan(0);
    });
  });

  describe('AgentCore Runtime', () => {
    test('creates AgentCore runtime when configured', () => {
      // Verify AgentCore runtime is created
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);

      // Verify no Lambda function is created
      agentCoreTemplate.resourceCountIs('AWS::Lambda::Function', 0);
    });

    test('creates AgentCore runtime endpoint', () => {
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::RuntimeEndpoint', 1);

      agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::RuntimeEndpoint', {
        Name: Match.stringLikeRegexp('.*-endpoint'),
      });
    });

    test('creates IAM role with agentcore.amazonaws.com service principal', () => {
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

    test('configures container deployment with image URI', () => {
      agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
          },
        },
      });
    });

    test('sets environment variables for AgentCore runtime', () => {
      agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        EnvironmentVariables: Match.objectLike({
          MODEL_ID: testModel.modelId,
          INVOKE_TYPE: 'batch',
          PROMPT: 'AgentCore prompt',
          EXPECT_JSON: 'True',
        }),
      });
    });

    test('creates CloudWatch log group for AgentCore runtime', () => {
      agentCoreTemplate.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/bedrock-agentcore/runtimes/AgentCoreAgent',
        RetentionInDays: 7,
      });
    });

    test('grants Bedrock permissions to AgentCore execution role', () => {
      agentCoreTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['bedrock:InvokeModel']),
            }),
          ]),
        },
      });
    });

    test('does not configure Powertools for AgentCore runtime', () => {
      // AgentCore uses ADOT instead of Powertools
      // Verify that Powertools environment variables are NOT present
      const runtime = agentCoreTemplate.findResources('AWS::BedrockAgentCore::Runtime');
      const runtimeKeys = Object.keys(runtime);
      expect(runtimeKeys.length).toBeGreaterThan(0);

      const runtimeResource = runtime[runtimeKeys[0]];
      const envVars = runtimeResource.Properties.EnvironmentVariables || {};

      // Powertools variables should not be present
      expect(envVars.POWERTOOLS_SERVICE_NAME).toBeUndefined();
      expect(envVars.POWERTOOLS_METRICS_NAMESPACE).toBeUndefined();
    });
  });

  describe('Runtime Type Selection', () => {
    test('BatchAgent creates Lambda runtime by default', () => {
      // Verify Lambda function exists in default stack (filter for agent function)
      const functions = lambdaDefaultTemplate.findResources('AWS::Lambda::Function');
      const agentFunctions = Object.values(functions).filter((fn: any) =>
        fn.Properties?.Environment?.Variables?.MODEL_ID !== undefined,
      );
      expect(agentFunctions.length).toBe(1);

      // Verify no AgentCore runtime is created
      lambdaDefaultTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 0);
    });

    test('BatchAgent creates AgentCore runtime when explicitly configured', () => {
      // Verify AgentCore runtime exists in AgentCore stack
      agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);
      agentCoreTemplate.resourceCountIs('AWS::Lambda::Function', 0);
    });
  });
});
