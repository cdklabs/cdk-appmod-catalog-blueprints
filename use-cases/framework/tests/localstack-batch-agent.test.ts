import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { createTestApp } from '../../utilities/test-utils';
import { LocalStackBatchAgent } from '../agents/localstack-batch-agent';

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
          customModelId: 'ollama.llama3.2',
        },
        systemPrompt,
      },
      localStack: {
        endpointUrl: 'http://host.docker.internal:4566',
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          LOCALSTACK_ENABLED: 'true',
          AWS_ENDPOINT_URL: 'http://host.docker.internal:4566',
          AWS_ENDPOINT_URL_S3: 'http://host.docker.internal:4566',
          AWS_ENDPOINT_URL_BEDROCK_RUNTIME: 'http://host.docker.internal:4566',
          AWS_ENDPOINT_URL_BEDROCK_AGENT_RUNTIME: 'http://host.docker.internal:4566',
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
          customModelId: 'ollama.llama3.2',
        },
        systemPrompt,
      },
    });

    expect(agent.runtimeEntryPath()).toContain(path.join('resources', 'default-ollama-agent'));
  });
});
