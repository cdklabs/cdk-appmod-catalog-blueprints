import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { AgenticDocumentProcessing, AgenticDocumentProcessingProps } from './agentic-document-processing';
import { DocumentProcessingStepType } from './base-document-processing';
import { LocalStackBatchAgent } from '../framework/agents/localstack-batch-agent';
import { LocalStackIntegrationConfig, LocalStackIntegrationUtils } from '../framework/localstack';

export interface LocalStackAgenticDocumentProcessingProps extends AgenticDocumentProcessingProps {
  /**
   * LocalStack endpoint routing configuration for Lambda runtime SDK calls.
   *
   * @default { enabled: true }
   */
  readonly localStack?: Omit<LocalStackIntegrationConfig, 'enabled'>;
}

export class LocalStackAgenticDocumentProcessing extends AgenticDocumentProcessing {
  private _localStackBatchAgent?: LocalStackBatchAgent;
  private _localStackProcessingStepCounter?: number;

  constructor(scope: Construct, id: string, props: LocalStackAgenticDocumentProcessingProps) {
    super(scope, id, props);
    this.applyLocalStackEnvironment(props.localStack || {});
  }

  protected processingStep(): DocumentProcessingStepType {
    if (!this._localStackBatchAgent) {
      const agentProps = this.bedrockDocumentProcessingProps as LocalStackAgenticDocumentProcessingProps;
      const processingAgentProps = agentProps.processingAgentParameters;

      this._localStackBatchAgent = new LocalStackBatchAgent(this, 'IDPLocalStackBatchAgent', {
        ...processingAgentProps,
        localStack: agentProps.localStack,
      });

      const adapterPolicyStatements = this.ingressAdapter.generateAdapterIAMPolicies();
      for (const statement of adapterPolicyStatements) {
        this._localStackBatchAgent.agentRole.addToPrincipalPolicy(statement);
      }
    }

    if (this._localStackProcessingStepCounter === undefined) {
      this._localStackProcessingStepCounter = 0;
    }

    const stepId = `ProcessingStep-${this._localStackProcessingStepCounter}`;
    this._localStackProcessingStepCounter++;

    return new LambdaInvoke(this, stepId, {
      lambdaFunction: this._localStackBatchAgent.agentFunction,
      resultPath: '$.processingResult',
      resultSelector: {
        'result.$': '$.Payload.result',
      },
    });
  }

  private applyLocalStackEnvironment(localStack: Omit<LocalStackIntegrationConfig, 'enabled'>): void {
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
