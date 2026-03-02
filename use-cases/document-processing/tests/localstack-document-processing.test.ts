import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { createTestApp } from '../../utilities/test-utils';
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
        customModelId: 'ollama.llama3.2',
        useCrossRegionInference: true,
      },
      processingBedrockModel: {
        customModelId: 'ollama.llama3.2',
      },
      localStack: {
        endpointUrl: 'http://host.docker.internal:4566',
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          INVOKE_TYPE: 'classification',
          MODEL_ID: 'ollama.llama3.2',
          LOCALSTACK_ENABLED: 'true',
          AWS_ENDPOINT_URL_BEDROCK_RUNTIME: 'http://host.docker.internal:4566',
          AWS_ENDPOINT_URL_S3: 'http://host.docker.internal:4566',
        }),
      },
    });

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          STATE_MACHINE_ARN: Match.anyValue(),
          AWS_ENDPOINT_URL_STEPFUNCTIONS: 'http://host.docker.internal:4566',
        }),
      },
    });
  });

  test('uses the LocalStack invoke runtime entry', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'LocalStackBedrockRuntimeStack');

    const processing = new TestableLocalStackBedrockDocumentProcessing(stack, 'LocalStackBedrockRuntime', {
      classificationBedrockModel: {
        customModelId: 'ollama.llama3.2',
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
