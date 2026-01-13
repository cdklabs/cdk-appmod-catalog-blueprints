// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseAgent, BaseAgentProps } from './base-agent';
import { AgentRuntimeConfig, AgentRuntimeType, IAgentRuntime, AgentRuntimeFactory, CommonRuntimeProps } from './runtime';
import { DefaultObservabilityConfig, LambdaIamUtils, PowertoolsConfig } from '../../utilities';
import { BedrockModelUtils } from '../bedrock';
import { DefaultRuntimes } from '../custom-resource';
import { DefaultAgentConfig } from './default-agent-config';

/**
 * Properties for BatchAgent construct
 */
export interface BatchAgentProps extends BaseAgentProps {
  /**
   * The prompt to be used for batch processing
   */
  readonly prompt: string;

  /**
   * Whether the agent should expect JSON output
   *
   * @default false
   */
  readonly expectJson?: boolean;
}

/**
 * Batch processing agent implementation
 *
 * BatchAgent provides a runtime-agnostic implementation for batch processing
 * scenarios. It supports both Lambda and AgentCore runtimes, automatically
 * selecting the appropriate entry file and configuration based on the runtime type.
 *
 * The agent processes batch requests using the specified prompt and can optionally
 * expect JSON-formatted output for structured data processing.
 */
export class BatchAgent extends BaseAgent {
  constructor(scope: Construct, id: string, props: BatchAgentProps) {
    super(scope, id, props);

    // Configure runtime-specific environment variables
    this.configureEnvironment(props);
  }

  /**
   * Create the runtime implementation for this agent
   *
   * This method uses AgentRuntimeFactory to create the appropriate runtime
   * (Lambda or AgentCore) based on the runtime configuration. It handles:
   * - Entry file selection (batch.py for Lambda, batch_agentcore.py for AgentCore)
   * - Environment variable configuration
   * - Runtime-specific settings (timeout, memory, etc.)
   *
   * @param runtimeConfig The runtime configuration specifying type and settings
   * @param props The agent properties
   * @returns An IAgentRuntime implementation
   */
  protected createRuntime(
    runtimeConfig: AgentRuntimeConfig,
    props: BaseAgentProps,
  ): IAgentRuntime {
    const batchProps = props as BatchAgentProps;
    const modelId = BedrockModelUtils.deriveActualModelId(this.bedrockModel);

    // Build common environment variables for both runtime types
    const commonEnv: Record<string, string> = {
      SYSTEM_PROMPT_S3_BUCKET_NAME: props.agentDefinition.systemPrompt.s3BucketName,
      SYSTEM_PROMPT_S3_KEY: props.agentDefinition.systemPrompt.s3ObjectKey,
      TOOLS_CONFIG: JSON.stringify(this.agentToolsLocationDefinitions),
      MODEL_ID: modelId,
      INVOKE_TYPE: 'batch',
      PROMPT: batchProps.prompt,
      EXPECT_JSON: batchProps.expectJson ? 'True' : '',
    };

    // Common code location for both runtimes
    const codeEntry = path.join(__dirname, 'resources/default-strands-agent');

    // Determine entry file based on runtime type
    // Lambda: batch.py with handler(event, context)
    // AgentCore: batch_agentcore.py with @app.entrypoint
    const indexFile = runtimeConfig.type === AgentRuntimeType.LAMBDA
      ? 'batch.py'
      : 'batch_agentcore.py';

    // Build common runtime properties
    // The factory will pass through additional properties via spread operator
    const commonProps: CommonRuntimeProps & Record<string, any> = {
      agentName: props.agentName,
      entry: codeEntry,
      index: indexFile,
      environment: commonEnv,
      layers: props.agentDefinition.lambdaLayers,
      foundationModel: modelId,
      instruction: props.agentDefinition.systemPrompt.s3ObjectKey,
      // Lambda-specific properties (passed through via spread operator in factory)
      runtime: DefaultRuntimes.PYTHON,
      environmentEncryption: this.encryptionKey,
      vpc: props.network?.vpc,
      vpcSubnets: props.network?.applicationSubnetSelection(),
    };

    // Create runtime using factory
    const runtime = AgentRuntimeFactory.create(
      this,
      'Runtime',
      runtimeConfig,
      commonProps,
    );

    // For Lambda runtime, add log permissions after runtime creation
    if (runtimeConfig.type === AgentRuntimeType.LAMBDA) {
      const { account, region } = Stack.of(this);
      const agentLambdaLogPermissionsResult = LambdaIamUtils.createLogsPermissions({
        account,
        region,
        scope: this,
        functionName: props.agentName,
        enableObservability: props.enableObservability,
      });

      // Add log permissions to the runtime's execution role
      for (const statement of agentLambdaLogPermissionsResult.policyStatements) {
        runtime.addToRolePolicy(statement);
      }
    }

    return runtime;
  }

  /**
   * Configure environment variables for observability
   *
   * This method adds observability-specific environment variables to the runtime.
   * For Lambda runtime, it uses AWS Lambda Powertools configuration.
   * For AgentCore runtime, observability is handled through ADOT configuration
   * in the BaseAgent.setupObservability() method.
   *
   * @param props The agent properties
   */
  protected configureEnvironment(props: BatchAgentProps): void {
    const metricNamespace = props.metricNamespace ||
      DefaultObservabilityConfig.DEFAULT_METRIC_NAMESPACE;
    const metricServiceName = props.metricServiceName ||
      DefaultAgentConfig.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME;

    if (props.enableObservability && this.runtime.runtimeType === AgentRuntimeType.LAMBDA) {
      // Lambda runtime uses Powertools for observability
      const powertoolsConfig = PowertoolsConfig.generateDefaultLambdaConfig(
        true,
        metricNamespace,
        metricServiceName,
      );

      for (const [key, value] of Object.entries(powertoolsConfig)) {
        this.runtime.addEnvironment(key, value);
      }
    }
    // AgentCore observability is configured in BaseAgent.setupObservability()
  }
}