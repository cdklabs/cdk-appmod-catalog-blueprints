import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import {
  DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
  DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
} from '../../framework/localstack';
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
        customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
      },
      processingAgentParameters: {
        agentName: 'LocalAgenticProcessor',
        prompt: 'Process the insurance claim document',
        agentDefinition: {
          bedrockModel: {
            customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
          },
          systemPrompt,
        },
      },
      localStack: {
        endpointUrl: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          PROMPT: 'Process the insurance claim document',
          LOCALSTACK_ENABLED: 'true',
          AWS_ENDPOINT_URL: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
          AWS_ENDPOINT_URL_BEDROCK_RUNTIME: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
          AWS_ENDPOINT_URL_BEDROCK_AGENT_RUNTIME: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
          AWS_ENDPOINT_URL_S3: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
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
        customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
      },
      processingAgentParameters: {
        agentName: 'LocalAgenticProcessorRuntime',
        prompt: 'Process the insurance claim document',
        agentDefinition: {
          bedrockModel: {
            customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
          },
          systemPrompt,
        },
      },
    });

    expect(processing.runtimeEntryPath()).toContain(path.join('resources', 'default-localstack-invoke'));
  });
});
