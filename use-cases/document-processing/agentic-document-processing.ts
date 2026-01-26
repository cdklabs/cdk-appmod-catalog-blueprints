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

    // Grant adapter IAM policies to agent execution role
    // This works for both Lambda and AgentCore runtimes
    const adapterPolicyStatements = this.ingressAdapter.generateAdapterIAMPolicies();
    for (const statement of adapterPolicyStatements) {
      batchAgent.runtime.executionRole.addToPrincipalPolicy(statement);
    }

    // Use createStepFunctionsTask to support both Lambda and AgentCore runtimes
    // The method automatically handles the differences between Lambda and AgentCore invocation
    return batchAgent.createStepFunctionsTask(this, 'ProcessingStep', {
      resultPath: '$.processingResult',
      resultSelector: {
        'result.$': '$.Payload.result',
      },
    }) as DocumentProcessingStepType;
  }
}
