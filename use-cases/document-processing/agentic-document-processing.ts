import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { DocumentProcessingStepType } from './base-document-processing';
import { BedrockDocumentProcessing, BedrockDocumentProcessingProps } from './bedrock-document-processing';
import { BatchAgent, BatchAgentProps } from '../framework';


export interface AgenticDocumentProcessingProps extends BedrockDocumentProcessingProps {
  /**
   * This parameter takes precedence over the
   * `processingBedrockModel` parameter.
   */
  readonly processingAgentParameters: BatchAgentProps;
}

export class AgenticDocumentProcessing extends BedrockDocumentProcessing {
  constructor(scope: Construct, id: string, props: AgenticDocumentProcessingProps) {
    super(scope, id, props);
  }

  protected processingStep(): DocumentProcessingStepType {
    const agentProps = this.bedrockDocumentProcessingProps as AgenticDocumentProcessingProps;
    const processingAgentProps = agentProps.processingAgentParameters;
    const batchAgent = new BatchAgent(this, 'IDPBatchAgent', processingAgentProps);

    const adapterPolicyStatements = this.ingressAdapter.generateAdapterIAMPolicies();
    for (const statement of adapterPolicyStatements) {
      batchAgent.agentRole.addToPrincipalPolicy(statement);
    }

    return new LambdaInvoke(this, 'ProcessingStep', {
      lambdaFunction: batchAgent.agentFunction,
      resultPath: '$.processingResult',
      resultSelector: {
        'result.$': '$.Payload.result',
      },
    });
  }
}