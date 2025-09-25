import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Duration, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { DocumentProcessingStepType } from './base-document-processing';
import { BedrockDocumentProcessing, BedrockDocumentProcessingProps } from './bedrock-document-processing';
import { DefaultRuntimes } from '../framework';
import { LambdaIamUtils } from '../utilities';
import { PowertoolsConfig } from '../utilities/observability/powertools-config';

export interface AgentProps {
  readonly agentSystemPrompt?: string;
  readonly toolsLocation?: string[];
  readonly lambdaLayers?: LayerVersion[];
}

export interface AgenticDocumentProcessingProps extends BedrockDocumentProcessingProps {
  readonly processingAgentParameters?: AgentProps;
}

export class AgenticDocumentProcessing extends BedrockDocumentProcessing {
  constructor(scope: Construct, id: string, props: AgenticDocumentProcessingProps) {
    super(scope, id, props);
  }

  protected processingStep(): DocumentProcessingStepType {
    const agentProps = this.bedrockDocumentProcessingProps as AgenticDocumentProcessingProps;
    const fmModel = this.bedrockDocumentProcessingProps.processingModelId || BedrockDocumentProcessing.DEFAULT_PROCESSING_MODEL_ID;
    const adjustedModelId = this.bedrockDocumentProcessingProps.useCrossRegionInference ? `${this.crossRegionInferencePrefix}.${fmModel.modelId}` : fmModel.modelId;
    const role = this.generateLambdaRoleForBedrock(fmModel, 'ProcessingAgentLambdaRole');
    role.addToPrincipalPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:ListBucket',
      ],
      resources: [
        this.bucket.bucketArn,
      ],
    }));
    const environmentVariables:Record<string, string> = {
      MODEL_ID: adjustedModelId,
      INVOKE_TYPE: 'agent',
      ...PowertoolsConfig.generateDefaultLambdaConfig(
        this.bedrockDocumentProcessingProps.enableObservability,
        this.metricNamespace,
        this.metricServiceName,
      ),
    };

    this.encryptionKey.grantEncryptDecrypt(role);
    if (this.bucketEncryptionKey) {
      this.bucketEncryptionKey.grantEncryptDecrypt(role);
    }

    if (agentProps.processingAgentParameters?.toolsLocation) {
      environmentVariables.TOOLS_CONFIG = JSON.stringify(agentProps.processingAgentParameters?.toolsLocation);
    }

    if (agentProps.processingAgentParameters?.agentSystemPrompt) {
      environmentVariables.SYSTEM_PROMPT = agentProps.processingAgentParameters?.agentSystemPrompt;
    }

    if (agentProps.processingPrompt) {
      environmentVariables.PROMPT = agentProps.processingPrompt;
    }

    const { region, account } = Stack.of(this);
    const generatedLogPermissions = LambdaIamUtils.createLogsPermissions({
      account,
      functionName: 'agentic-idp-processing',
      region,
      scope: this,
    });

    const agenticFunction = new PythonFunction(this, 'ProcessingAgentFunction', {
      functionName: generatedLogPermissions.uniqueFunctionName,
      architecture: Architecture.X86_64,
      entry: `${__dirname}/resources/default-strands-agent`,
      runtime: DefaultRuntimes.PYTHON,
      layers: agentProps.processingAgentParameters?.lambdaLayers,
      environment: environmentVariables,
      role,
      timeout: this.bedrockDocumentProcessingProps.stepTimeouts || Duration.minutes(5),
      memorySize: 1024,
      environmentEncryption: this.encryptionKey,
      vpc: this.bedrockDocumentProcessingProps.network ? this.bedrockDocumentProcessingProps.network.vpc : undefined,
      vpcSubnets: this.bedrockDocumentProcessingProps.network ? this.bedrockDocumentProcessingProps.network.applicationSubnetSelection() : undefined,
    });

    for (const statement of generatedLogPermissions.policyStatements) {
      agenticFunction.role?.addToPrincipalPolicy(statement);
    }

    if (this.bedrockDocumentProcessingProps.network) {
      agenticFunction.role?.addToPrincipalPolicy(LambdaIamUtils.generateLambdaVPCPermissions());
    }

    return new LambdaInvoke(this, 'ProcessingStep', {
      lambdaFunction: agenticFunction,
      resultPath: '$.processingResult',
      resultSelector: {
        'result.$': '$.Payload.result',
      },
    });
  }
}