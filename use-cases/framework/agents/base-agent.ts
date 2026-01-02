// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { PropertyInjectors, RemovalPolicy } from 'aws-cdk-lib';
import { Grant, IGrantable, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { IChainable, TaskInput } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { LambdaObservabilityPropertyInjector, LogGroupDataProtectionProps, LogGroupDataProtectionUtils, ObservableProps } from '../../utilities';
import { BedrockModelProps, BedrockModelUtils } from '../bedrock';
import { Network } from '../foundation';
import { AgentRuntimeConfig, AgentRuntimeType, IAgentRuntime, LambdaAgentRuntime, AgentCoreAgentRuntime } from './runtime';

export interface AgentToolsLocationDefinition {
  readonly bucketName: string;
  readonly key: string;
  readonly isFile: boolean;
  readonly isZipArchive: boolean;
}

/**
 * Properties for creating a Step Functions task to invoke an agent
 */
export interface AgentTaskProps {
  /**
   * The payload to pass to the agent
   *
   * For Lambda runtime: Passed directly as the Lambda function payload
   * For AgentCore runtime: Passed as the payload field in the HTTP request body
   *
   * @default TaskInput.fromJsonPathAt('$') - passes entire Step Functions input
   */
  readonly payload?: TaskInput;

  /**
   * JSONPath expression to store the task result
   *
   * @default '$.processingResult'
   */
  readonly resultPath?: string;

  /**
   * JSONPath expression to select a portion of the state to be the output
   *
   * @default undefined - entire result is used
   */
  readonly resultSelector?: { [key: string]: any };
}

/**
 * Parameters that influences the behavior of the agent
 */
export interface AgentDefinitionProps {
  /**
     * Configuration for the Bedrock Model to be used
     */
  readonly bedrockModel: BedrockModelProps;

  /**
     * The system prompt of the agent
     *
     */
  readonly systemPrompt: Asset;

  /**
     * List of tools defined in python files. This tools would automatically
     * be loaded by the agent. You can also use this to incorporate other specialized
     * agents as tools.
     */
  readonly tools?: Asset[];

  /**
     * Any dependencies needed by the provided tools
     */
  readonly lambdaLayers?: LayerVersion[];

  /**
     * If tools need additional IAM permissions, these statements
     * would be attached to the Agent's IAM role
     */
  readonly additionalPolicyStatementsForTools?: PolicyStatement[];
}

export interface BaseAgentProps extends ObservableProps {

  /**
     * Name of the agent
     */
  readonly agentName: string;

  /**
     * Agent related parameters
     */
  readonly agentDefinition: AgentDefinitionProps;

  /**
     * Runtime configuration for the agent
     *
     * Specifies the execution environment (Lambda or AgentCore) and
     * runtime-specific settings. If not provided, defaults to Lambda runtime.
     *
     * @default Lambda runtime with default configuration
     */
  readonly runtime?: AgentRuntimeConfig;

  /**
     * Enable observability
     *
     * @default false
     */
  readonly enableObservability?: boolean;

  /**
     * If the Agent would be running inside a VPC
     *
     * @default Agent would not be in a VPC
     */
  readonly network?: Network;

  /**
     * Encryption key to encrypt agent environment variables
     *
     * @default new KMS Key would be created
     */
  readonly encryptionKey?: Key;

  /**
     * Removal policy for resources created by this
     * construct
     *
     * @default RemovalPolicy.DESTROY
     */
  readonly removalPolicy?: RemovalPolicy;
}

export abstract class BaseAgent extends Construct {
  /**
   * The runtime implementation for this agent
   *
   * Provides access to the underlying runtime (Lambda or AgentCore) for
   * runtime-specific operations. Use this property to:
   * - Grant invocation permissions
   * - Add environment variables
   * - Add IAM policy statements
   * - Access runtime-specific properties
   */
  public readonly runtime: IAgentRuntime;

  /**
   * The Bedrock model configuration for this agent
   */
  public readonly bedrockModel?: BedrockModelProps;

  /**
   * The encryption key used for agent environment variables
   *
   * This key encrypts sensitive data in environment variables for both
   * Lambda and AgentCore runtimes.
   */
  public readonly encryptionKey: Key;

  /**
   * Log group data protection configuration
   *
   * Applied to CloudWatch log groups to protect sensitive data in logs.
   */
  protected readonly logGroupDataProtection: LogGroupDataProtectionProps;

  /**
   * Tool location definitions for the agent
   *
   * Contains S3 bucket and key information for all tools provided to the agent.
   */
  protected readonly agentToolsLocationDefinitions: AgentToolsLocationDefinition[];

  /**
   * The IAM execution role for the agent
   *
   * @deprecated Use runtime.executionRole instead. This property will be removed in a future version.
   */
  public get agentRole() {
    return this.runtime.executionRole;
  }

  /**
   * The Lambda function for this agent (if using Lambda runtime)
   *
   * @deprecated Use runtime property for Lambda-specific access. This property will be removed in a future version.
   * Returns undefined if the agent is using AgentCore runtime.
   */
  public get agentFunction(): PythonFunction | undefined {
    if (this.runtime.runtimeType === AgentRuntimeType.LAMBDA) {
      return (this.runtime as LambdaAgentRuntime).agentFunction;
    }
    return undefined;
  }

  constructor(scope: Construct, id: string, props: BaseAgentProps) {
    super(scope, id);

    // Initialize common infrastructure
    this.bedrockModel = props.agentDefinition.bedrockModel;
    this.encryptionKey = props.encryptionKey || new Key(this, 'AgentEncryptionKey', {
      enableKeyRotation: true,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
    });

    // Prepare tool configurations
    this.agentToolsLocationDefinitions = this.prepareTools(props);

    // Create runtime using factory (implemented by subclasses)
    const runtimeConfig = props.runtime || {
      type: AgentRuntimeType.LAMBDA,
    };

    this.runtime = this.createRuntime(runtimeConfig, props);

    // Configure permissions
    this.configurePermissions(props);

    // Setup observability
    this.logGroupDataProtection = LogGroupDataProtectionUtils.handleDefault(
      this,
      props.logGroupDataProtection,
      props.removalPolicy,
    );

    this.setupObservability(props);
  }

  /**
   * Create the runtime implementation for this agent
   *
   * Subclasses must implement this method to create the appropriate runtime
   * (Lambda or AgentCore) based on the runtime configuration. This method
   * should use AgentRuntimeFactory to create the runtime instance.
   *
   * @param runtimeConfig The runtime configuration specifying type and settings
   * @param props The agent properties
   * @returns An IAgentRuntime implementation
   */
  protected abstract createRuntime(
    runtimeConfig: AgentRuntimeConfig,
    props: BaseAgentProps,
  ): IAgentRuntime;

  /**
   * Prepare tool configurations and grant access to the runtime
   *
   * This method processes the tool assets provided in the agent definition,
   * grants read access to the runtime's execution role, and builds the tool
   * location definitions that will be passed to the agent code.
   *
   * @param props The agent properties containing tool definitions
   * @returns Array of tool location definitions
   */
  protected prepareTools(props: BaseAgentProps): AgentToolsLocationDefinition[] {
    const definitions: AgentToolsLocationDefinition[] = [];

    if (props.agentDefinition.tools) {
      for (const tool of props.agentDefinition.tools) {
        // Note: We can't grant access here because runtime doesn't exist yet
        // This will be done in configurePermissions after runtime is created
        definitions.push({
          bucketName: tool.s3BucketName,
          key: tool.s3ObjectKey,
          isFile: tool.isFile,
          isZipArchive: tool.isZipArchive,
        });
      }
    }

    return definitions;
  }

  /**
   * Configure IAM permissions for the agent
   *
   * This method sets up all necessary IAM permissions for the agent's execution role:
   * - Bedrock model invocation permissions
   * - Tool asset access permissions
   * - Additional tool-specific permissions
   *
   * @param props The agent properties
   */
  protected configurePermissions(props: BaseAgentProps): void {
    // Grant access to tool assets
    if (props.agentDefinition.tools) {
      for (const tool of props.agentDefinition.tools) {
        tool.grantRead(this.runtime.executionRole);
      }
    }

    // Grant Bedrock model permissions
    this.runtime.addToRolePolicy(
      BedrockModelUtils.generateModelIAMPermissions(this, this.bedrockModel),
    );

    // Add tool-specific permissions
    if (props.agentDefinition.additionalPolicyStatementsForTools) {
      for (const statement of props.agentDefinition.additionalPolicyStatementsForTools) {
        this.runtime.addToRolePolicy(statement);
      }
    }
  }

  /**
   * Setup observability for the agent
   *
   * Configures monitoring and logging based on the runtime type:
   * - Lambda: Uses AWS Lambda Powertools with CloudWatch Logs
   * - AgentCore: Uses ADOT (AWS Distro for OpenTelemetry) with CloudWatch integration
   *
   * @param props The agent properties
   */
  protected setupObservability(props: BaseAgentProps): void {
    if (props.enableObservability) {
      if (this.runtime.runtimeType === AgentRuntimeType.LAMBDA) {
        // Lambda observability using Powertools
        PropertyInjectors.of(this).add(
          new LambdaObservabilityPropertyInjector(this.logGroupDataProtection),
        );
      } else if (this.runtime.runtimeType === AgentRuntimeType.AGENTCORE) {
        // AgentCore observability configuration
        // AgentCore provides built-in observability with CloudWatch integration
        // Reference: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html

        // 1. Enable CloudWatch Transaction Search (one-time account-level setup)
        //    This is a prerequisite that must be done manually or via separate setup
        //    See: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html

        // 2. Configure log destination for runtime logs
        //    AgentCore automatically creates log group: /aws/bedrock-agentcore/runtimes/<runtime-id>-<endpoint-name>/runtime-logs
        //    Apply data protection policy to the log group if configured
        //    Note: The log group is created by the AgentCore runtime construct
        //    Data protection is applied via the logGroupDataProtection configuration

        // 3. Add ADOT (AWS Distro for OpenTelemetry) environment variables
        //    These enable custom metrics and traces from agent code
        const agentCoreRuntime = this.runtime as AgentCoreAgentRuntime;
        const agentRuntimeArn = agentCoreRuntime.agentCoreAgent.attrAgentRuntimeArn;
        const endpointName = agentCoreRuntime.agentCoreEndpoint.name;

        this.runtime.addEnvironment('AGENT_OBSERVABILITY_ENABLED', 'true');
        this.runtime.addEnvironment('OTEL_PYTHON_DISTRO', 'aws_distro');
        this.runtime.addEnvironment('OTEL_PYTHON_CONFIGURATOR', 'aws_configurator');
        this.runtime.addEnvironment('OTEL_RESOURCE_ATTRIBUTES',
          `service.name=${props.agentName},aws.log.group.names=/aws/bedrock-agentcore/runtimes/${agentRuntimeArn},cloud.resource_id=${agentRuntimeArn}:${endpointName}`,
        );
        this.runtime.addEnvironment('OTEL_EXPORTER_OTLP_LOGS_HEADERS',
          `x-aws-log-group=/aws/bedrock-agentcore/runtimes/${agentRuntimeArn},x-aws-log-stream=runtime-logs,x-aws-metric-namespace=bedrock-agentcore`,
        );
        this.runtime.addEnvironment('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf');
        this.runtime.addEnvironment('OTEL_TRACES_EXPORTER', 'otlp');

        // 4. AgentCore automatically provides:
        //    - Runtime metrics (invocations, throttles, errors, latency) at 1-minute intervals
        //    - Resource usage metrics (CPU, memory) at 1-minute resolution
        //    - Structured spans in CloudWatch Logs under aws/spans log group
        //    - Application logs in /aws/bedrock-agentcore/runtimes/<runtime-id>-<endpoint-name>/runtime-logs
        //
        //    All data is available in CloudWatch GenAI Observability dashboard
        //    See: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-runtime-metrics.html
      }
    }
  }

  /**
   * Grant permission to invoke this agent
   *
   * Adds the appropriate IAM permissions to the grantee to allow invocation
   * of this agent. The specific permissions granted depend on the runtime type:
   * - Lambda: lambda:InvokeFunction
   * - AgentCore: bedrock-agentcore:InvokeAgentRuntime
   *
   * @param grantee The principal to grant invocation permissions to
   * @returns Grant object representing the permission grant
   */
  public grantInvoke(grantee: IGrantable): Grant {
    return this.runtime.grantInvoke(grantee);
  }

  /**
   * Create a Step Functions task for invoking this agent
   *
   * This method creates the appropriate Step Functions task based on the agent's
   * runtime type:
   * - Lambda Runtime: Creates a LambdaInvoke task that directly invokes the Lambda function
   * - AgentCore Runtime: NOT YET SUPPORTED - throws an error
   *
   * **Important**: AWS Step Functions does not currently support the bedrock-agentcore service
   * in CallAwsService tasks. AgentCore Runtime cannot be used with Step Functions at this time.
   * Please use Lambda runtime for Step Functions integration.
   *
   * For Lambda runtime, this method automatically:
   * - Creates a LambdaInvoke task
   * - Passes the specified payload to the Lambda function
   * - Configures the result path for the task output
   *
   * Permissions:
   * For Lambda runtime, the Step Functions execution role will be granted lambda:InvokeFunction.
   *
   * @param scope The construct scope for creating the task
   * @param id The construct ID for the task
   * @param props Task configuration properties
   * @returns Step Functions task (IChainable) for agent invocation
   * @throws Error if AgentCore runtime is used (not yet supported by Step Functions)
   */
  public createStepFunctionsTask(
    scope: Construct,
    id: string,
    props: AgentTaskProps = {},
  ): IChainable {
    const payload = props.payload || TaskInput.fromJsonPathAt('$');
    const resultPath = props.resultPath || '$.processingResult';

    if (this.runtime.runtimeType === AgentRuntimeType.LAMBDA) {
      // Direct Lambda invocation using LambdaInvoke task
      const lambdaRuntime = this.runtime as LambdaAgentRuntime;

      return new LambdaInvoke(scope, id, {
        lambdaFunction: lambdaRuntime.agentFunction,
        payload: payload,
        resultPath: resultPath,
        ...(props.resultSelector && { resultSelector: props.resultSelector }),
      });
    } else {
      // AgentCore Runtime is not yet supported in Step Functions
      throw new Error(
        '[UnsupportedRuntime] Step Functions integration with AgentCore Runtime is not yet supported.\n\n' +
        'AWS Step Functions does not currently support the bedrock-agentcore service in CallAwsService tasks.\n' +
        'Attempting to use bedrock-agentcore results in the error:\n' +
        '  "SCHEMA_VALIDATION_FAILED: The resource provided arn:aws:states:::aws-sdk:bedrock-agentcore:invokeAgentRuntime is not recognized"\n\n' +
        'Workarounds:\n' +
        '  1. Use Lambda runtime instead of AgentCore runtime for Step Functions integration\n' +
        '  2. Invoke AgentCore Runtime directly from Lambda functions (not through Step Functions)\n' +
        '  3. Wait for AWS to add bedrock-agentcore support to Step Functions\n\n' +
        'Monitor https://docs.aws.amazon.com/step-functions/latest/dg/supported-services-awssdk.html for updates.',
      );
    }
  }
}