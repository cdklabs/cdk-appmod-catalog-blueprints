import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { createTestApp } from '../../utilities/test-utils';
import { LocalStackAgenticDocumentProcessing } from '../localstack-agentic-document-processing';

class TestableLocalStackAgenticDocumentProcessing extends LocalStackAgenticDocumentProcessing {
  public runtimeEntryPath(): string {
    return this.resolveBedrockInvokeEntry();
  }
}

describe('LocalStackAgenticDocumentProcessing', () => {
  test('uses LocalStackBatchAgent and injects LocalStack endpoint env vars', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'LocalStackAgenticStack');

    const systemPrompt = new Asset(stack, 'SystemPrompt', {
      path: path.join(__dirname, '../../framework/agents/resources/default-strands-agent/batch.py'),
    });

    new LocalStackAgenticDocumentProcessing(stack, 'LocalStackAgentic', {
      classificationBedrockModel: {
        customModelId: 'ollama.llama3.2',
      },
      processingAgentParameters: {
        agentName: 'LocalAgenticProcessor',
        prompt: 'Process the insurance claim document',
        agentDefinition: {
          bedrockModel: {
            customModelId: 'ollama.llama3.2',
          },
          systemPrompt,
        },
      },
      localStack: {
        endpointUrl: 'http://host.docker.internal:4566',
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          PROMPT: 'Process the insurance claim document',
          LOCALSTACK_ENABLED: 'true',
          AWS_ENDPOINT_URL: 'http://host.docker.internal:4566',
          AWS_ENDPOINT_URL_BEDROCK_RUNTIME: 'http://host.docker.internal:4566',
          AWS_ENDPOINT_URL_BEDROCK_AGENT_RUNTIME: 'http://host.docker.internal:4566',
          AWS_ENDPOINT_URL_S3: 'http://host.docker.internal:4566',
        }),
      },
    });
  });

  test('uses the LocalStack invoke runtime entry', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'LocalStackAgenticRuntimeStack');

    const systemPrompt = new Asset(stack, 'RuntimeSystemPrompt', {
      path: path.join(__dirname, '../../framework/agents/resources/default-strands-agent/batch.py'),
    });

    const processing = new TestableLocalStackAgenticDocumentProcessing(stack, 'LocalStackAgenticRuntime', {
      classificationBedrockModel: {
        customModelId: 'ollama.llama3.2',
      },
      processingAgentParameters: {
        agentName: 'LocalAgenticProcessorRuntime',
        prompt: 'Process the insurance claim document',
        agentDefinition: {
          bedrockModel: {
            customModelId: 'ollama.llama3.2',
          },
          systemPrompt,
        },
      },
    });

    expect(processing.runtimeEntryPath()).toContain(path.join('resources', 'default-localstack-invoke'));
  });
});
