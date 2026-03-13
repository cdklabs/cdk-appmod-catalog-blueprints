import * as path from 'path';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BatchAgent, BatchAgentProps } from './batch-agent';
import { LocalStackEndpointOverrides, LocalStackIntegrationUtils } from '../localstack';

export interface LocalStackBatchAgentProps extends BatchAgentProps {
  /**
   * LocalStack endpoint routing configuration for Lambda runtime SDK calls.
   *
   * @default { enabled: true }
   */
  readonly localStack?: LocalStackEndpointOverrides;
}

export class LocalStackBatchAgent extends BatchAgent {
  constructor(scope: Construct, id: string, props: LocalStackBatchAgentProps) {
    super(scope, id, props);

    const localStackEnv = LocalStackIntegrationUtils.toLambdaEnvironment({
      enabled: true,
      ...props.localStack,
    });

    for (const child of this.node.findAll()) {
      if (!(child instanceof LambdaFunction)) {
        continue;
      }
      for (const [key, value] of Object.entries(localStackEnv)) {
        child.addEnvironment(key, value);
      }
    }
  }

  protected resolveAgentRuntimeEntry(): string {
    return path.join(__dirname, 'resources/default-ollama-agent');
  }
}
