import { Construct } from 'constructs';
import { BatchAgent, BatchAgentProps } from './batch-agent';
import { LocalStackIntegrationConfig, LocalStackIntegrationUtils } from '../localstack';

export interface LocalStackBatchAgentProps extends BatchAgentProps {
  /**
   * LocalStack endpoint routing configuration for Lambda runtime SDK calls.
   *
   * @default { enabled: true }
   */
  readonly localStack?: Omit<LocalStackIntegrationConfig, 'enabled'>;
}

export class LocalStackBatchAgent extends BatchAgent {
  constructor(scope: Construct, id: string, props: LocalStackBatchAgentProps) {
    super(scope, id, props);

    const localStackEnv = LocalStackIntegrationUtils.toLambdaEnvironment({
      enabled: true,
      ...props.localStack,
    });

    for (const [key, value] of Object.entries(localStackEnv)) {
      this.agentFunction.addEnvironment(key, value);
    }
  }
}

