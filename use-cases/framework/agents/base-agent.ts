// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PropertyInjectors, RemovalPolicy } from 'aws-cdk-lib';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { IFunction, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';
import { LambdaIamUtils } from '../../utilities/lambda-iam-utils';
import { LambdaObservabilityPropertyInjector, LogGroupDataProtectionProps, LogGroupDataProtectionUtils, ObservableProps } from '../../utilities/observability';
import { BedrockModelProps, BedrockModelUtils } from '../bedrock';
import { Network } from '../foundation';

export interface AgentToolsLocationDefinition {
  readonly bucketName: string;
  readonly key: string;
  readonly isFile: boolean;
  readonly isZipArchive: boolean;
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
  public abstract readonly agentFunction: IFunction;
  public readonly bedrockModel?: BedrockModelProps;
  public readonly agentRole: Role;
  public readonly encryptionKey: Key;
  /** log group data protection configuration */
  protected readonly logGroupDataProtection: LogGroupDataProtectionProps;
  protected readonly agentToolsLocationDefinitions: AgentToolsLocationDefinition[];

  constructor(scope: Construct, id: string, props: BaseAgentProps) {
    super(scope, id);
    this.bedrockModel = props.agentDefinition.bedrockModel;
    this.encryptionKey = props.encryptionKey || new Key(this, 'AgentEncryptionKey', {
      enableKeyRotation: true,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
    });


    const inlinePolicies: Record<string, PolicyDocument> = {};

    if (props.agentDefinition.additionalPolicyStatementsForTools && props.agentDefinition.additionalPolicyStatementsForTools.length > 0) {
      inlinePolicies.ToolPermissions = new PolicyDocument({
        statements: props.agentDefinition.additionalPolicyStatementsForTools,
      });
    }

    this.agentRole = new Role(this, `Agent-${props.agentName}-Role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies,
    });

    if (props.network) {
      this.agentRole.addToPrincipalPolicy(LambdaIamUtils.generateLambdaVPCPermissions());
    }

    this.agentToolsLocationDefinitions = [];

    if (props.agentDefinition.tools) {
      for (const tool of props.agentDefinition.tools) {
        tool.grantRead(this.agentRole);

        this.agentToolsLocationDefinitions.push({
          bucketName: tool.s3BucketName,
          key: tool.s3ObjectKey,
          isFile: tool.isFile,
          isZipArchive: tool.isZipArchive,
        });
      }
    }

    this.agentRole.addToPrincipalPolicy(BedrockModelUtils.generateModelIAMPermissions(this, this.bedrockModel));
    this.logGroupDataProtection = LogGroupDataProtectionUtils.handleDefault(this, props.logGroupDataProtection, props.removalPolicy);

    if (props.enableObservability) {
      PropertyInjectors.of(this).add(
        new LambdaObservabilityPropertyInjector(this.logGroupDataProtection),
      );
    }
  }
}