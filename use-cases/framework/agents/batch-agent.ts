// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Duration, Stack } from 'aws-cdk-lib';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Architecture, ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BaseAgent, BaseAgentProps } from './base-agent';
import { InvokeType } from './invoke-type';
import { DefaultObservabilityConfig, LambdaIamUtils, PowertoolsConfig } from '../../utilities';
import { BedrockModelUtils } from '../bedrock';
import { DefaultRuntimes } from '../custom-resource';
import { DefaultAgentConfig } from './default-agent-config';
import { KnowledgeBaseRuntimeConfig } from './knowledge-base';

export interface BatchAgentProps extends BaseAgentProps {
  readonly prompt: string;
  readonly expectJson?: boolean;

  /**
   * Agent invocation type.
   *
   * Defines how the agent is invoked and what processing mode to use.
   *
   * @default InvokeType.BATCH
   */
  readonly invokeType?: InvokeType;
}

/**
 * Generates the knowledge base information to append to the system prompt.
 *
 * This function creates a formatted string containing:
 * - Description of the retrieval tool and how to use it
 * - List of available knowledge bases with their names and descriptions
 *
 * The generated text helps the agent understand when and how to use
 * the knowledge base retrieval capability.
 *
 * @param knowledgeBaseConfigs - Array of knowledge base runtime configurations
 * @returns Formatted string to append to system prompt, or empty string if no KBs
 */
export function generateKnowledgeBaseSystemPromptAddition(
  knowledgeBaseConfigs: KnowledgeBaseRuntimeConfig[],
): string {
  if (knowledgeBaseConfigs.length === 0) {
    return '';
  }

  const kbList = knowledgeBaseConfigs
    .map((kb) => `- **${kb.name}**: ${kb.description}`)
    .join('\n');

  return `

## Knowledge Base Retrieval

You have access to a knowledge base retrieval tool called \`retrieve_from_knowledge_base\`. Use this tool to search for relevant information when answering questions.

### How to use the retrieval tool:
- Call the tool with a search query to find relevant information
- You can optionally specify a knowledge_base_id to search a specific knowledge base
- If no knowledge_base_id is provided, all knowledge bases will be searched

### Available Knowledge Bases:
${kbList}

When a user asks a question that might be answered by information in these knowledge bases, use the retrieval tool to find relevant context before responding.
`;
}

export class BatchAgent extends BaseAgent {
  public readonly agentFunction: PythonFunction;

  constructor(scope: Construct, id: string, props: BatchAgentProps) {
    super(scope, id, props);
    const modelId = BedrockModelUtils.deriveActualModelId(this.bedrockModel);
    const metricNamespace = props.metricNamespace || DefaultObservabilityConfig.DEFAULT_METRIC_NAMESPACE;
    const metricServiceName = props.metricServiceName || DefaultAgentConfig.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME;

    // Generate knowledge base system prompt addition if KBs are configured
    const kbSystemPromptAddition = generateKnowledgeBaseSystemPromptAddition(this.knowledgeBaseConfigs);

    const env: Record<string, string> = {
      SYSTEM_PROMPT_S3_BUCKET_NAME: props.agentDefinition.systemPrompt.s3BucketName,
      SYSTEM_PROMPT_S3_KEY: props.agentDefinition.systemPrompt.s3ObjectKey,
      TOOLS_CONFIG: JSON.stringify(this.agentToolsLocationDefinitions),
      MODEL_ID: modelId,
      INVOKE_TYPE: props.invokeType || InvokeType.BATCH,
      PROMPT: props.prompt,
      EXPECT_JSON: props.expectJson ? 'True' : '',
      ...PowertoolsConfig.generateDefaultLambdaConfig(
        props.enableObservability,
        metricNamespace,
        metricServiceName,
      ),
    };

    // Add knowledge base configuration if KBs are configured
    if (this.knowledgeBaseConfigs.length > 0) {
      env.KNOWLEDGE_BASES_CONFIG = JSON.stringify(this.knowledgeBaseConfigs);
      env.KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION = kbSystemPromptAddition;
    }

    // Add AgentCore observability environment variables when enabled
    if (props.enableObservability) {
      env.AGENT_OBSERVABILITY_ENABLED = 'true';
      env.OTEL_RESOURCE_ATTRIBUTES = `service.name=${metricServiceName},aws.log.group.names=/aws/bedrock-agentcore/runtimes/${props.agentName}`;
      env.OTEL_EXPORTER_OTLP_LOGS_HEADERS = `x-aws-log-group=/aws/bedrock-agentcore/runtimes/${props.agentName},x-aws-log-stream=runtime-logs,x-aws-metric-namespace=bedrock-agentcore`;
      env.AWS_LAMBDA_EXEC_WRAPPER = '/opt/otel-instrument';
      env.OTEL_PYTHON_DISTRO = 'aws_distro';
      env.OTEL_PYTHON_CONFIGURATOR = 'aws_configurator';
      env.OTEL_EXPORTER_OTLP_PROTOCOL = 'http/protobuf';
      env.OTEL_TRACES_EXPORTER = 'otlp';

      this.agentRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLambdaApplicationSignalsExecutionRolePolicy'));
    }

    const { account, region } = Stack.of(this);
    const agentLambdaLogPermissionsResult = LambdaIamUtils.createLogsPermissions({
      account,
      region,
      scope: this,
      functionName: props.agentName,
      enableObservability: props.enableObservability,
    });

    // Define Lambda architecture (currently hardcoded, but centralized for future configurability)
    const lambdaArchitecture = props.agentArchitecture || Architecture.ARM_64;

    // Build layers array with ADOT layer when observability is enabled
    const layers: ILayerVersion[] = [
      ...(props.agentDefinition.lambdaLayers || []),
      ...this.knowledgeBaseLayers,
    ];

    if (props.enableObservability) {
      layers.push(this.createADOTLayer());
    }

    this.agentFunction = new PythonFunction(this, 'BatchAgentFunction', {
      functionName: agentLambdaLogPermissionsResult.uniqueFunctionName,
      architecture: lambdaArchitecture,
      entry: path.join(__dirname, 'resources/default-strands-agent'),
      role: this.agentRole,
      index: 'batch.py',
      runtime: DefaultRuntimes.PYTHON,
      layers,
      timeout: Duration.minutes(10),
      memorySize: 1024,
      environment: env,
      environmentEncryption: this.encryptionKey,
      vpc: props.network ? props.network.vpc : undefined,
      vpcSubnets: props.network ? props.network.applicationSubnetSelection() : undefined,
    });

    for (const s of agentLambdaLogPermissionsResult.policyStatements) {
      this.agentRole.addToPrincipalPolicy(s);
    }
  }
}