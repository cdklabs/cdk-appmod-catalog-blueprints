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
  /** Cached batch agent to avoid duplicate resource creation */
  private _batchAgent?: BatchAgent;
  /** Counter for generating unique processing step IDs */
  private _agenticProcessingStepCounter?: number;

  constructor(scope: Construct, id: string, props: AgenticDocumentProcessingProps) {
    super(scope, id, props);
  }

  protected processingStep(): DocumentProcessingStepType {
    // Create BatchAgent only once
    if (!this._batchAgent) {
      const agentProps = this.bedrockDocumentProcessingProps as AgenticDocumentProcessingProps;
      const processingAgentProps = agentProps.processingAgentParameters;
      this._batchAgent = new BatchAgent(this, 'IDPBatchAgent', processingAgentProps);

      const adapterPolicyStatements = this.ingressAdapter.generateAdapterIAMPolicies();
      for (const statement of adapterPolicyStatements) {
        this._batchAgent.agentRole.addToPrincipalPolicy(statement);
      }
    }

    // Initialize counter if not yet set (handles case where method is called before constructor completes)
    if (this._agenticProcessingStepCounter === undefined) {
      this._agenticProcessingStepCounter = 0;
    }

    // Always create a new LambdaInvoke task to allow proper state chaining
    const stepId = `ProcessingStep-${this._agenticProcessingStepCounter}`;
    this._agenticProcessingStepCounter++;

    return new LambdaInvoke(this, stepId, {
      lambdaFunction: this._batchAgent.agentFunction,
      resultPath: '$.processingResult',
      resultSelector: {
        'result.$': '$.Payload.result',
      },
    });
  }
}