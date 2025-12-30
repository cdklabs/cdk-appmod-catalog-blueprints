// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnRuntime, CfnRuntimeEndpoint } from 'aws-cdk-lib/aws-bedrockagentcore';
import { IVpc, SubnetSelection, ISecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Grant, IGrantable, IRole, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays, ILogGroup } from 'aws-cdk-lib/aws-logs';
import { IBucket, Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { IAgentRuntime } from './runtime-interface';
import { AgentRuntimeType, AgentCoreRuntimeConfig, AgentCoreDeploymentMethod } from './types';

/**
 * Network configuration for AgentCore runtime
 */
export interface AgentCoreNetworkConfig {
  /**
   * VPC to run the AgentCore runtime in
   */
  readonly vpc: IVpc;

  /**
   * VPC subnets to use for the AgentCore runtime
   */
  readonly vpcSubnets?: SubnetSelection;

  /**
   * Security groups for the AgentCore runtime
   */
  readonly securityGroups?: ISecurityGroup[];
}

/**
 * Properties for creating an AgentCore-based agent runtime
 */
export interface AgentCoreAgentRuntimeProps {
  /**
   * Name of the AgentCore agent runtime
   */
  readonly agentName: string;

  /**
   * Foundation model to use for the agent
   */
  readonly foundationModel: string;

  /**
   * System instruction/prompt for the agent
   */
  readonly instruction: string;

  /**
   * IAM role for the AgentCore runtime
   *
   * If not provided, a new role will be created with agentcore.amazonaws.com
   * as the service principal.
   */
  readonly role?: Role;

  /**
   * Environment variables for the AgentCore runtime
   *
   * @default {}
   */
  readonly environment?: Record<string, string>;

  /**
   * Network configuration for VPC access
   */
  readonly network?: AgentCoreNetworkConfig;

  /**
   * AgentCore-specific runtime configuration
   */
  readonly config?: AgentCoreRuntimeConfig;

  /**
   * Removal policy for the log group
   *
   * @default RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: RemovalPolicy;
}


/**
 * AgentCore-based agent runtime implementation
 *
 * This class provides an AgentCore Runtime implementation that conforms to the
 * IAgentRuntime interface, allowing agents to use AgentCore as an execution
 * environment alongside Lambda functions.
 *
 * AgentCore Runtime is suitable for:
 * - Long-running, stateful operations (up to 8 hours)
 * - Complex agent orchestration with session management
 * - Workloads requiring extended execution time
 * - Stateful conversations and multi-turn interactions
 *
 * AgentCore currently supports container-based deployment:
 * - **CONTAINER**: Deploy as Docker container in ECR
 *   - Full control over runtime environment
 *   - Support for any programming language
 *   - Custom system dependencies
 *   - ARM64 architecture required
 *
 * Note: Direct code deployment (ZIP archive) may be supported in future versions.
 * Check AWS documentation for the latest deployment options.
 */
export class AgentCoreAgentRuntime extends Construct implements IAgentRuntime {
  /**
   * The runtime type identifier
   */
  public readonly runtimeType = AgentRuntimeType.AGENTCORE;

  /**
   * The IAM execution role for the AgentCore runtime
   */
  public readonly executionRole: IRole;

  /**
   * The ARN of the AgentCore runtime for invocation
   */
  public readonly invocationArn: string;

  /**
   * The underlying AgentCore runtime construct
   */
  public readonly agentCoreAgent: CfnRuntime;

  /**
   * The AgentCore runtime endpoint construct
   */
  public readonly agentCoreEndpoint: CfnRuntimeEndpoint;

  /**
   * The CloudWatch log group for the AgentCore runtime
   */
  public readonly logGroup?: ILogGroup;

  /**
   * Environment variables for the AgentCore runtime
   * Stored internally since AgentCore uses a different mechanism
   */
  private readonly environmentVariables: Record<string, string> = {};

  constructor(scope: Construct, id: string, props: AgentCoreAgentRuntimeProps) {
    super(scope, id);

    // Store initial environment variables
    if (props.environment) {
      Object.assign(this.environmentVariables, props.environment);
    }

    // Create execution role for AgentCore
    this.executionRole = props.role || new Role(this, 'ExecutionRole', {
      assumedBy: new ServicePrincipal('agentcore.amazonaws.com'),
      description: `Execution role for AgentCore runtime: ${props.agentName}`,
    });

    // Determine deployment configuration based on deployment method
    const deploymentMethod = props.config?.deploymentMethod || AgentCoreDeploymentMethod.CONTAINER;
    let agentRuntimeArtifact: CfnRuntime.AgentRuntimeArtifactProperty;

    if (deploymentMethod === AgentCoreDeploymentMethod.CONTAINER) {
      // Container-based deployment using ECR image
      if (!props.config?.imageUri) {
        throw new Error(
          '[InvalidRuntimeConfig] imageUri is required for CONTAINER deployment method',
        );
      }
      agentRuntimeArtifact = {
        containerConfiguration: {
          containerUri: props.config.imageUri,
        },
      };
    } else {
      // Direct code deployment using S3 ZIP archive
      // Note: As of the current CDK version, direct code deployment may not be fully supported
      // Container deployment is the primary method for AgentCore Runtime
      if (!props.config?.codeBucket || !props.config?.codeKey) {
        throw new Error(
          '[InvalidRuntimeConfig] codeBucket and codeKey are required for DIRECT_CODE deployment method',
        );
      }

      // Grant read permissions to the code bucket
      const codeBucket: IBucket = Bucket.fromBucketName(
        this,
        'CodeBucket',
        props.config.codeBucket,
      );
      codeBucket.grantRead(this.executionRole, props.config.codeKey);

      // For DIRECT_CODE, we still use container configuration but reference the code location
      // The actual implementation may vary based on AWS service capabilities
      throw new Error(
        '[InvalidRuntimeConfig] DIRECT_CODE deployment method is not yet fully supported. Please use CONTAINER deployment method with an ECR image URI.',
      );
    }

    // Configure network mode
    // AgentCore Runtime currently supports PUBLIC network mode
    // VPC support may be added in future versions
    const networkConfiguration: CfnRuntime.NetworkConfigurationProperty = {
      networkMode: 'PUBLIC',
    };

    if (props.network) {
      // Note: VPC configuration for AgentCore Runtime may require additional setup
      // For now, we log a warning and use PUBLIC mode
      console.warn(
        'VPC configuration for AgentCore Runtime is not yet fully supported in this version. ' +
        'Using PUBLIC network mode. Please check AWS documentation for the latest VPC support.',
      );

      // Grant VPC permissions to execution role for future compatibility
      // AgentCore uses service-linked role AWSServiceRoleForBedrockAgentCoreNetwork
      // for creating ENIs, but execution role needs permissions for VPC resources
      this.executionRole.addToPrincipalPolicy(new PolicyStatement({
        actions: [
          'ec2:DescribeNetworkInterfaces',
          'ec2:DescribeSubnets',
          'ec2:DescribeSecurityGroups',
          'ec2:DescribeVpcs',
        ],
        resources: ['*'],
      }));
    }

    // Create AgentCore agent runtime configuration
    this.agentCoreAgent = new CfnRuntime(this, 'Runtime', {
      agentRuntimeName: props.agentName,
      roleArn: this.executionRole.roleArn,
      agentRuntimeArtifact,
      networkConfiguration,
      description: props.instruction, // Use instruction as description
      environmentVariables: this.environmentVariables,
    });

    // Create AgentCore runtime endpoint
    // The endpoint is required for invoking the agent runtime
    this.agentCoreEndpoint = new CfnRuntimeEndpoint(this, 'Endpoint', {
      agentRuntimeId: this.agentCoreAgent.attrAgentRuntimeId,
      name: `${props.agentName}-endpoint`,
    });

    this.invocationArn = this.agentCoreAgent.attrAgentRuntimeArn;

    // Create log group for AgentCore agent runtime logs
    // AgentCore automatically creates logs at: /aws/bedrock-agentcore/runtimes/<runtime-id>-<endpoint-name>/runtime-logs
    // This log group is for additional application logs if needed
    this.logGroup = new LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/bedrock-agentcore/runtimes/${props.agentName}`,
      removalPolicy: props.removalPolicy || RemovalPolicy.RETAIN,
      retention: RetentionDays.ONE_WEEK,
    });

    // Note: For observability, agent code should include ADOT dependencies:
    // - aws-opentelemetry-distro>=0.10.0
    // - boto3
    // And be executed with: opentelemetry-instrument python agent_code.py
    // See: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
  }

  /**
   * Grant permission to invoke this AgentCore runtime
   *
   * Adds bedrock-agentcore:InvokeAgentRuntime permission to the grantee for
   * this agent runtime. The permission requires both runtime and runtime-endpoint ARNs.
   *
   * Reference: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-invoke-agent.html
   * Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonbedrockagentcore.html
   *
   * @param grantee The principal to grant invocation permissions to
   * @returns Grant object representing the permission grant
   */
  public grantInvoke(grantee: IGrantable): Grant {
    // AgentCore Runtime requires bedrock-agentcore:InvokeAgentRuntime permission
    // The permission requires both runtime and runtime-endpoint ARNs
    return Grant.addToPrincipal({
      grantee,
      actions: [
        'bedrock-agentcore:InvokeAgentRuntime',
      ],
      resourceArns: [
        this.agentCoreAgent.attrAgentRuntimeArn, // Runtime ARN
        this.agentCoreEndpoint.attrAgentRuntimeEndpointArn, // Runtime endpoint ARN
      ],
    });
  }

  /**
   * Add an environment variable to the AgentCore runtime
   *
   * AgentCore uses a different mechanism for configuration compared to Lambda.
   * Environment variables are stored internally and can be used for runtime
   * configuration. The actual mechanism for passing these to the agent code
   * depends on AgentCore capabilities.
   *
   * @param key The environment variable name
   * @param value The environment variable value
   */
  public addEnvironment(key: string, value: string): void {
    // AgentCore uses different mechanism for configuration
    // Store in internal map for future reference
    // Implementation depends on AgentCore capabilities
    this.environmentVariables[key] = value;

    // Note: In production, this would configure the AgentCore runtime
    // with the environment variable through the appropriate mechanism
    // (e.g., parameter store, environment configuration, etc.)
  }

  /**
   * Add an IAM policy statement to the AgentCore execution role
   *
   * Grants the AgentCore runtime additional permissions to access AWS resources.
   *
   * @param statement The IAM policy statement to add
   */
  public addToRolePolicy(statement: PolicyStatement): void {
    this.executionRole.addToPrincipalPolicy(statement);
  }

}
