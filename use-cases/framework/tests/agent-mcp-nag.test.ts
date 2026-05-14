import * as path from 'path';
import { Aspects, Stack } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { createTestApp } from '../../utilities/test-utils';
import { BatchAgent } from '../agents/batch-agent';
import { McpTransportType, McpAuthFlow } from '../agents/base-agent';
import { InteractiveAgent, AgentCoreRuntimeHostingAdapter, NetworkMode } from '../agents/interactive-agent';

const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

describe('Agent MCP CDK Nag Tests', () => {
  describe('BatchAgent with MCP servers', () => {
    test('passes AWS Solutions checks with MCP servers configured', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new BatchAgent(stack, 'McpAgent', {
        agentName: 'McpBatchAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [
            {
              name: 'plain-server',
              url: 'https://mcp.example.com/mcp',
              transportType: McpTransportType.STREAMABLE_HTTP,
              headers: { 'X-Custom': 'value' },
            },
            {
              name: 'secrets-server',
              url: 'https://mcp-prod.example.com/sse',
              transportType: McpTransportType.SSE,
              headers: {
                'Authorization': 'arn:aws:secretsmanager:us-east-1:123456789012:secret:my-api-key-AbCdEf',
              },
            },
            {
              name: 'oauth-server',
              url: 'https://mcp-oauth.example.com/mcp',
              transportType: McpTransportType.STREAMABLE_HTTP,
              credentialProviderName: 'my-credential-provider',
              authScopes: ['read', 'write'],
              authFlow: McpAuthFlow.M2M,
            },
          ],
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda execution role requires AWSLambdaBasicExecutionRole managed policy for CloudWatch Logs access',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for Bedrock model invocation, S3 asset access, AgentCore Identity (bedrock-agentcore:*), and CloudWatch Logs. Secrets Manager permissions are scoped to specific ARNs following least-privilege.',
          appliesTo: [
            'Action::s3:GetObject*',
            'Action::s3:GetBucket*',
            'Action::s3:List*',
            'Action::bedrock-agentcore:*',
            'Resource::*',
            'Resource::arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
            {
              regex: '/Resource::arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/McpBatchAgent-.*/',
            },
            'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-123456789012-us-east-1/*',
          ],
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Using Python 3.13 which is the latest stable runtime supported by Strands framework',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('InteractiveAgent with MCP servers', () => {
    test('passes AWS Solutions checks with MCP servers configured', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'InteractiveTestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      const agent = new InteractiveAgent(stack, 'McpInteractiveAgent', {
        agentName: 'McpInteractiveAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [
            {
              name: 'secrets-server',
              url: 'https://mcp-prod.example.com/sse',
              transportType: McpTransportType.SSE,
              headers: {
                'Authorization': 'arn:aws:secretsmanager:us-east-1:123456789012:secret:my-api-key-AbCdEf',
              },
            },
            {
              name: 'oauth-server',
              url: 'https://mcp-oauth.example.com/mcp',
              transportType: McpTransportType.STREAMABLE_HTTP,
              credentialProviderName: 'my-credential-provider',
              authScopes: ['read', 'write'],
              authFlow: McpAuthFlow.USER_FEDERATION,
            },
          ],
        },
      });

      NagSuppressions.addResourceSuppressions(
        agent,
        [
          {
            id: 'AwsSolutions-S1',
            reason: 'Session storage bucket does not require access logging as it contains temporary session data',
          },
        ],
        true,
      );

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda execution role requires AWSLambdaBasicExecutionRole managed policy for CloudWatch Logs access',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions required for Bedrock model invocation, S3 asset access, AgentCore Identity (bedrock-agentcore:*), session bucket operations, and CloudWatch Logs. Secrets Manager permissions are scoped to specific ARNs.',
          appliesTo: [
            'Action::s3:GetObject*',
            'Action::s3:GetBucket*',
            'Action::s3:List*',
            'Action::s3:Abort*',
            'Action::s3:DeleteObject*',
            'Action::kms:ReEncrypt*',
            'Action::kms:GenerateDataKey*',
            'Action::bedrock-agentcore:*',
            'Resource::*',
            'Resource::arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
            {
              regex: '/Resource::<McpInteractiveAgentSessionManagerBucket.*>/',
            },
            {
              regex: '/Resource::arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/McpInteractiveAgent-.*/',
            },
            'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-123456789012-us-east-1/*',
          ],
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Using Python 3.13 which is the latest stable runtime supported by Strands framework',
        },
        {
          id: 'AwsSolutions-COG3',
          reason: 'Cognito User Pool AdvancedSecurityMode is optional and can be configured by consumers based on requirements',
        },
        {
          id: 'AwsSolutions-COG4',
          reason: 'Cognito User Pool authorizer is configured at the API level for the interactive agent WebSocket/REST API',
        },
        {
          id: 'AwsSolutions-APIG2',
          reason: 'Request validation is handled by the Lambda function for the interactive agent API',
        },
        {
          id: 'AwsSolutions-APIG1',
          reason: 'API Gateway access logging is optional for the interactive agent and can be enabled via construct props',
        },
        {
          id: 'AwsSolutions-APIG3',
          reason: 'WAF is optional for the interactive agent API and can be configured separately',
        },
        {
          id: 'AwsSolutions-APIG6',
          reason: 'API Gateway CloudWatch logging is optional for the interactive agent and can be enabled via construct props',
        },
      ]);

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });

    test('passes AWS Solutions checks with AgentCore Runtime hosting and MCP servers', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'AgentCoreMcpTestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
      });

      new InteractiveAgent(stack, 'AgentCoreMcpAgent', {
        agentName: 'AgentCoreMcpAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          mcpServers: [
            {
              name: 'oauth-server',
              url: 'https://mcp-oauth.example.com/mcp',
              transportType: McpTransportType.STREAMABLE_HTTP,
              credentialProviderName: 'my-credential-provider',
              authScopes: ['read', 'write'],
              authFlow: McpAuthFlow.USER_FEDERATION,
            },
          ],
        },
        hostingAdapter: new AgentCoreRuntimeHostingAdapter({
          containerImageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
          networkMode: NetworkMode.PUBLIC,
        }),
      });

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'AgentCore runtime role requires managed policies',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'ECR GetAuthorizationToken requires wildcard resource. S3, KMS, and AgentCore Identity wildcards are for session bucket and MCP operations.',
          appliesTo: [
            'Resource::*',
            'Action::s3:GetObject*',
            'Action::s3:GetBucket*',
            'Action::s3:List*',
            'Action::s3:Abort*',
            'Action::s3:DeleteObject*',
            'Action::kms:ReEncrypt*',
            'Action::kms:GenerateDataKey*',
            'Action::bedrock-agentcore:*',
            'Resource::arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
            'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-123456789012-us-east-1/*',
            {
              regex: '/Resource::<AgentCoreMcpAgentSessionManagerBucket.*>/',
            },
          ],
        },
        {
          id: 'AwsSolutions-S1',
          reason: 'Session storage bucket does not require access logging as it contains temporary session data',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Auto-delete custom resource Lambda uses runtime managed by CDK',
        },
      ]);

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
      expect(errors).toHaveLength(0);
    });
  });
});
