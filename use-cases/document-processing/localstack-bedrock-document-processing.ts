import * as path from 'path';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BedrockDocumentProcessing, BedrockDocumentProcessingProps } from './bedrock-document-processing';
import { LocalStackEndpointOverrides, LocalStackIntegrationUtils } from '../framework/localstack';

export interface LocalStackBedrockDocumentProcessingProps extends BedrockDocumentProcessingProps {
  /**
   * LocalStack endpoint routing configuration for Lambda runtime SDK calls.
   *
   * @default { enabled: true }
   */
  readonly localStack?: LocalStackEndpointOverrides;
}

export class LocalStackBedrockDocumentProcessing extends BedrockDocumentProcessing {
  constructor(scope: Construct, id: string, props: LocalStackBedrockDocumentProcessingProps) {
    super(scope, id, {
      ...props,
      _skipBedrockVpcEndpoints: true,
    } as BedrockDocumentProcessingProps);
    this.applyLocalStackEnvironment(props.localStack);
  }

  protected resolveBedrockInvokeEntry(): string {
    return path.join(__dirname, 'resources/default-localstack-invoke');
  }

  private applyLocalStackEnvironment(localStack?: LocalStackEndpointOverrides): void {
    const localStackEnv = LocalStackIntegrationUtils.toLambdaEnvironment({
      enabled: true,
      ...localStack,
    });

    for (const child of this.node.findAll()) {
      if (child instanceof LambdaFunction) {
        for (const [key, value] of Object.entries(localStackEnv)) {
          child.addEnvironment(key, value);
        }
      }
    }
  }
}
