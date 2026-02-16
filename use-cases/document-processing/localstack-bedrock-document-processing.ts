import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BedrockDocumentProcessing, BedrockDocumentProcessingProps } from './bedrock-document-processing';
import { LocalStackIntegrationConfig, LocalStackIntegrationUtils } from '../framework/localstack';

export interface LocalStackBedrockDocumentProcessingProps extends BedrockDocumentProcessingProps {
  /**
   * LocalStack endpoint routing configuration for Lambda runtime SDK calls.
   *
   * @default { enabled: true }
   */
  readonly localStack?: Omit<LocalStackIntegrationConfig, 'enabled'>;
}

export class LocalStackBedrockDocumentProcessing extends BedrockDocumentProcessing {
  constructor(scope: Construct, id: string, props: LocalStackBedrockDocumentProcessingProps) {
    super(scope, id, props);
    this.applyLocalStackEnvironment(props.localStack);
  }

  private applyLocalStackEnvironment(localStack?: Omit<LocalStackIntegrationConfig, 'enabled'>): void {
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

