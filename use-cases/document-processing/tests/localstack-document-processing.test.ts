import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { createTestApp } from '../../utilities/test-utils';
import {
  DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
  DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
} from '../../framework/localstack';
import { BedrockDocumentProcessing } from '../bedrock-document-processing';
import { LocalStackBedrockDocumentProcessing } from '../localstack-bedrock-document-processing';

class TestableLocalStackBedrockDocumentProcessing extends LocalStackBedrockDocumentProcessing {
  public runtimeEntryPath(): string {
    return this.resolveBedrockInvokeEntry();
  }
}

class TestableBedrockDocumentProcessing extends BedrockDocumentProcessing {
  public runtimeEntryPath(): string {
    return this.resolveBedrockInvokeEntry();
  }
}

describe('LocalStackBedrockDocumentProcessing', () => {
  test('injects LocalStack endpoint variables into classification Lambda', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'LocalStackBedrockStack');

    new LocalStackBedrockDocumentProcessing(stack, 'LocalStackBedrock', {
      classificationBedrockModel: {
        customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
        useCrossRegionInference: true,
      },
      processingBedrockModel: {
        customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
      },
      localStack: {
        endpointUrl: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          INVOKE_TYPE: 'classification',
          MODEL_ID: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
          LOCALSTACK_ENABLED: 'true',
          AWS_ENDPOINT_URL_BEDROCK_RUNTIME: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
          AWS_ENDPOINT_URL_S3: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
        }),
      },
    });

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          STATE_MACHINE_ARN: Match.anyValue(),
          AWS_ENDPOINT_URL_STEPFUNCTIONS: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
        }),
      },
    });
  });

  test('uses the LocalStack invoke runtime entry', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'LocalStackBedrockRuntimeStack');

    const processing = new TestableLocalStackBedrockDocumentProcessing(stack, 'LocalStackBedrockRuntime', {
      classificationBedrockModel: {
        customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
      },
    });

    expect(processing.runtimeEntryPath()).toContain(path.join('resources', 'default-localstack-invoke'));
  });

  test('keeps existing BedrockDocumentProcessing behavior unchanged', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'AwsBedrockStack');

    new BedrockDocumentProcessing(stack, 'AwsBedrock', {});

    const template = Template.fromStack(stack);
    const lambdas = template.findResources('AWS::Lambda::Function');

    for (const lambda of Object.values(lambdas)) {
      const variables = (lambda as any).Properties?.Environment?.Variables || {};
      expect(variables.LOCALSTACK_ENABLED).toBeUndefined();
      expect(variables.AWS_ENDPOINT_URL).toBeUndefined();
    }
  });

  test('keeps default AWS Bedrock invoke runtime entry', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'AwsBedrockRuntimeStack');

    const processing = new TestableBedrockDocumentProcessing(stack, 'AwsBedrockRuntime', {});

    expect(processing.runtimeEntryPath()).toContain(path.join('resources', 'default-bedrock-invoke'));
  });
});
