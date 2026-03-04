import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { createTestApp } from '../../utilities/test-utils';
import { LocalStackBatchAgent } from '../agents/localstack-batch-agent';
import { DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID, DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL } from '../localstack';

class TestableLocalStackBatchAgent extends LocalStackBatchAgent {
  public runtimeEntryPath(): string {
    return this.resolveAgentRuntimeEntry();
  }
}

describe('LocalStackBatchAgent', () => {
  test('injects LocalStack endpoint environment variables', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'LocalStackBatchAgentStack');

    const systemPrompt = new Asset(stack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });

    new LocalStackBatchAgent(stack, 'LocalStackBatchAgent', {
      agentName: 'LocalAgent',
      prompt: 'Analyze this document',
      agentDefinition: {
        bedrockModel: {
          customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
        },
        systemPrompt,
      },
      localStack: {
        endpointUrl: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          LOCALSTACK_ENABLED: 'true',
          AWS_ENDPOINT_URL: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
          AWS_ENDPOINT_URL_S3: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
          AWS_ENDPOINT_URL_BEDROCK_RUNTIME: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
          AWS_ENDPOINT_URL_BEDROCK_AGENT_RUNTIME: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
        }),
      },
    });
  });

  test('uses the LocalStack/Ollama runtime entry', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'LocalStackBatchAgentRuntimeStack');

    const systemPrompt = new Asset(stack, 'RuntimeSystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });

    const agent = new TestableLocalStackBatchAgent(stack, 'LocalStackBatchAgentRuntime', {
      agentName: 'LocalAgentRuntime',
      prompt: 'Analyze this document',
      agentDefinition: {
        bedrockModel: {
          customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
        },
        systemPrompt,
      },
    });

    expect(agent.runtimeEntryPath()).toContain(path.join('resources', 'default-ollama-agent'));
  });
});
