// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PythonFunction, PythonFunctionProps } from '@aws-cdk/aws-lambda-python-alpha';
import { Duration } from 'aws-cdk-lib';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Grant, IGrantable, IRole, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Architecture, ILayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { IAgentRuntime } from './runtime-interface';
import { AgentRuntimeType, LambdaRuntimeConfig } from './types';

/**
 * Properties for creating a Lambda-based agent runtime
 */
export interface LambdaAgentRuntimeProps {
  /**
   * Name of the Lambda function
   */
  readonly functionName: string;

  /**
   * Path to the directory containing the Lambda function code
   */
  readonly entry: string;

  /**
   * Name of the Python file containing the handler (without .py extension)
   *
   * @default 'index'
   */
  readonly index?: string;

  /**
   * Python runtime version
   *
   * @default Runtime.PYTHON_3_12
   */
  readonly runtime?: Runtime;

  /**
   * IAM role for the Lambda function
   *
   * If not provided, a new role will be created with lambda.amazonaws.com
   * as the service principal.
   */
  readonly role?: Role;

  /**
   * Environment variables for the Lambda function
   *
   * @default {}
   */
  readonly environment?: Record<string, string>;

  /**
   * KMS key for encrypting environment variables
   */
  readonly environmentEncryption?: IKey;

  /**
   * VPC to run the Lambda function in
   */
  readonly vpc?: IVpc;

  /**
   * VPC subnets to use for the Lambda function
   */
  readonly vpcSubnets?: SubnetSelection;

  /**
   * Lambda layers to attach to the function
   *
   * @default []
   */
  readonly layers?: ILayerVersion[];

  /**
   * Lambda-specific runtime configuration
   */
  readonly config?: LambdaRuntimeConfig;
}

/**
 * Lambda-based agent runtime implementation
 *
 * This class wraps an AWS Lambda PythonFunction to provide a consistent
 * runtime interface for agents. It implements the IAgentRuntime interface,
 * allowing agents to work with Lambda functions through the same API used
 * for other runtime types like AgentCore.
 *
 * The Lambda runtime is suitable for:
 * - Short-lived, stateless operations (max 15 minutes)
 * - Event-driven invocation patterns
 * - Cost-effective execution for intermittent workloads
 * - Quick iteration and development
 * * const lambdaRuntime = new LambdaAgentRuntime(this, 'AgentRuntime', {
 *   functionName: 'my-agent',
 *   entry: path.join(__dirname, 'agent-code'),
 *   index: 'handler',
 *   environment: {
 *     MODEL_ID: 'anthropic.claude-v2',
 *   },
 *   config: {
 *     timeout: Duration.minutes(5),
 *     memorySize: 2048,
 *     architecture: Architecture.ARM_64,
 *   },
 * });
 *
 * // Grant invocation permissions
 * lambdaRuntime.grantInvoke(someRole);
 *
 * // Add environment variables
 * lambdaRuntime.addEnvironment('DEBUG', 'true');
 * ```
 */
export class LambdaAgentRuntime extends Construct implements IAgentRuntime {
  /**
   * The runtime type identifier
   */
  public readonly runtimeType = AgentRuntimeType.LAMBDA;

  /**
   * The IAM execution role for the Lambda function
   */
  public readonly executionRole: IRole;

  /**
   * The ARN of the Lambda function for invocation
   */
  public readonly invocationArn: string;

  /**
   * The underlying PythonFunction construct
   *
   * Exposed for Lambda-specific operations that are not part of the
   * IAgentRuntime interface.
   */
  public readonly agentFunction: PythonFunction;

  /**
   * The CloudWatch log group for the Lambda function
   */
  public readonly logGroup?: ILogGroup;

  constructor(scope: Construct, id: string, props: LambdaAgentRuntimeProps) {
    super(scope, id);

    // Extract Lambda-specific configuration with defaults
    const timeout = props.config?.timeout || Duration.minutes(10);
    const memorySize = props.config?.memorySize || 1024;
    const architecture = props.config?.architecture || Architecture.X86_64;
    const ephemeralStorageSize = props.config?.ephemeralStorageSize;

    // Build PythonFunction properties
    const functionProps: PythonFunctionProps = {
      functionName: props.functionName,
      entry: props.entry,
      index: props.index || 'index',
      runtime: props.runtime || Runtime.PYTHON_3_12,
      role: props.role,
      timeout,
      memorySize,
      architecture,
      environment: props.environment,
      environmentEncryption: props.environmentEncryption,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      layers: props.layers,
      bundling: {
        assetExcludes: ['.venv', '__pycache__', '*.pyc', '.pytest_cache', '.git'],
      },
    };

    // Add ephemeral storage if specified
    if (ephemeralStorageSize) {
      (functionProps as any).ephemeralStorageSize = ephemeralStorageSize;
    }

    // Create the Lambda function
    this.agentFunction = new PythonFunction(this, 'Function', functionProps);

    // Set interface properties
    this.executionRole = this.agentFunction.role as Role;
    this.invocationArn = this.agentFunction.functionArn;
    this.logGroup = this.agentFunction.logGroup;
  }

  /**
   * Grant permission to invoke this Lambda function
   *
   * Adds lambda:InvokeFunction permission to the grantee for this function.
   *
   * @param grantee The principal to grant invocation permissions to
   * @returns Grant object representing the permission grant
   *   * // Grant a Step Functions state machine permission to invoke
   * const stateMachine = new StateMachine(this, 'StateMachine', {
   *   definition: // ...
   * });
   * lambdaRuntime.grantInvoke(stateMachine);
   * ```
   */
  public grantInvoke(grantee: IGrantable): Grant {
    return this.agentFunction.grantInvoke(grantee);
  }

  /**
   * Add an environment variable to the Lambda function
   *
   * Environment variables are made available to the function code at runtime
   * through the standard process.env mechanism.
   *
   * @param key The environment variable name
   * @param value The environment variable value
   *   * lambdaRuntime.addEnvironment('MODEL_ID', 'anthropic.claude-v2');
   * lambdaRuntime.addEnvironment('TEMPERATURE', '0.7');
   * ```
   */
  public addEnvironment(key: string, value: string): void {
    this.agentFunction.addEnvironment(key, value);
  }

  /**
   * Add an IAM policy statement to the Lambda execution role
   *
   * Grants the Lambda function additional permissions to access AWS resources.
   *
   * @param statement The IAM policy statement to add
   *   * // Grant access to an S3 bucket
   * lambdaRuntime.addToRolePolicy(new PolicyStatement({
   *   actions: ['s3:GetObject'],
   *   resources: ['arn:aws:s3:::my-bucket/*'],
   * }));
   * ```
   */
  public addToRolePolicy(statement: PolicyStatement): void {
    this.executionRole.addToPrincipalPolicy(statement);
  }
}
