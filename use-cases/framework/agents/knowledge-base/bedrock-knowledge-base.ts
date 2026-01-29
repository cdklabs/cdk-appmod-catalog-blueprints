// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';
import { BaseKnowledgeBase } from './base-knowledge-base';
import {
  BedrockKnowledgeBaseProps,
  CreateKnowledgeBaseConfiguration,
  GuardrailConfiguration,
  KnowledgeBaseRuntimeConfig,
  VectorStoreConfiguration,
} from './knowledge-base-props';

/**
 * Amazon Bedrock Knowledge Base implementation.
 *
 * This class provides integration with Amazon Bedrock Knowledge Bases,
 * which use vector stores (S3 Vectors by default) for semantic search.
 * It is the default knowledge base implementation when none is specified.
 *
 * The implementation handles:
 * - ARN construction from knowledge base ID (if ARN not provided)
 * - IAM permission generation for Bedrock Retrieve and RetrieveAndGenerate APIs
 * - Optional guardrail configuration for content filtering
 * - Runtime configuration export for the retrieval tool
 */
export class BedrockKnowledgeBase extends BaseKnowledgeBase {
  /**
   * The unique identifier for the Bedrock Knowledge Base.
   *
   * This is the ID assigned by Bedrock when the knowledge base was created.
   */
  public readonly knowledgeBaseId: string;

  /**
   * The ARN of the Bedrock Knowledge Base.
   *
   * If not provided in props, this is constructed from the knowledgeBaseId
   * using the current region and account.
   */
  public readonly knowledgeBaseArn: string;

  /**
   * Guardrail configuration for content filtering.
   *
   * When configured, the guardrail will be applied during retrieval
   * operations to filter inappropriate or sensitive content.
   */
  private readonly guardrailConfig?: GuardrailConfiguration;

  /**
   * Vector store configuration.
   *
   * Defines the type of vector store used by this knowledge base.
   * Defaults to S3 Vectors if not specified.
   */
  private readonly vectorStoreConfig: VectorStoreConfiguration;

  /**
   * Configuration for creating a new knowledge base.
   *
   * When provided, indicates that this construct should create a new
   * Bedrock Knowledge Base rather than reference an existing one.
   *
   * Note: KB creation is an advanced feature. Currently, this property
   * stores the configuration for future implementation.
   */
  private readonly createConfig?: CreateKnowledgeBaseConfiguration;

  /**
   * The AWS region where the knowledge base is deployed.
   */
  private readonly region: string;

  /**
   * The AWS account ID where the knowledge base is deployed.
   */
  private readonly account: string;

  /**
   * Creates a new BedrockKnowledgeBase instance.
   *
   * @param scope - The scope in which to define this construct
   * @param id - The scoped construct ID
   * @param props - Configuration properties for the Bedrock Knowledge Base
   * @throws Error if knowledgeBaseId is empty or not provided
   */
  constructor(scope: Construct, id: string, props: BedrockKnowledgeBaseProps) {
    super(scope, id, props);

    this.validateBedrockProps(props);

    const stack = Stack.of(this);
    this.region = stack.region;
    this.account = stack.account;

    this.knowledgeBaseId = props.knowledgeBaseId;
    this.knowledgeBaseArn =
      props.knowledgeBaseArn ??
      `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${props.knowledgeBaseId}`;
    this.guardrailConfig = props.guardrail;
    // Default to S3 Vectors if not specified
    this.vectorStoreConfig = props.vectorStore ?? { type: 's3-vectors' };
    this.createConfig = props.create;

    // Note: KB creation is handled separately when create config is provided
    // This is an advanced feature that will create actual AWS resources
    if (this.createConfig) {
      this.setupKnowledgeBaseCreation();
    }
  }

  /**
   * Sets up knowledge base creation when create configuration is provided.
   *
   * This method is called during construction when the `create` property
   * is specified. It prepares the necessary resources for creating a new
   * Bedrock Knowledge Base.
   *
   * Note: Full KB creation implementation requires CloudFormation custom
   * resources or L1 constructs. This is a placeholder for future implementation.
   */
  private setupKnowledgeBaseCreation(): void {
    // KB creation is an advanced feature
    // The actual implementation would involve:
    // 1. Creating an IAM role for Bedrock KB
    // 2. Creating the Bedrock KB via CfnKnowledgeBase
    // 3. Creating a data source pointing to the S3 bucket
    // 4. Configuring the embedding model
    // 5. Setting up the vector store (S3 Vectors by default)
    //
    // For now, this stores the configuration for reference.
    // Users should create KBs via the Bedrock console or CLI
    // and reference them by ID.
  }

  /**
   * Validates Bedrock-specific props at construction time.
   *
   * Ensures that the knowledgeBaseId is provided and not empty.
   *
   * @param props - The props to validate
   * @throws Error if knowledgeBaseId is empty or not provided
   */
  private validateBedrockProps(props: BedrockKnowledgeBaseProps): void {
    if (!props.knowledgeBaseId || props.knowledgeBaseId.trim() === '') {
      throw new Error('knowledgeBaseId is required and cannot be empty');
    }
  }

  /**
   * Generate IAM policy statements required for accessing this Bedrock Knowledge Base.
   *
   * Returns permissions for:
   * - bedrock:Retrieve - Query the knowledge base
   * - bedrock:RetrieveAndGenerate - Query and generate responses
   * - bedrock:ApplyGuardrail - Apply guardrail (if configured)
   * - s3:GetObject - Access S3 vectors (if using S3 Vectors with custom bucket)
   * - s3:GetObject - Access data source bucket (if create config provided)
   *
   * All permissions are scoped to the specific knowledge base ARN
   * following the principle of least privilege.
   *
   * @returns Array of IAM PolicyStatement objects granting necessary permissions
   */
  public generateIamPermissions(): PolicyStatement[] {
    const statements: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
        resources: [this.knowledgeBaseArn],
      }),
    ];

    // Add guardrail permissions if configured
    if (this.guardrailConfig) {
      statements.push(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['bedrock:ApplyGuardrail'],
          resources: [
            `arn:aws:bedrock:${this.region}:${this.account}:guardrail/${this.guardrailConfig.guardrailId}`,
          ],
        }),
      );
    }

    // Add S3 permissions if using S3 Vectors with a custom bucket
    if (this.vectorStoreConfig.type === 's3-vectors' && this.vectorStoreConfig.bucketName) {
      const prefix = this.vectorStoreConfig.prefix ?? 'vectors/';
      statements.push(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject'],
          resources: [
            `arn:aws:s3:::${this.vectorStoreConfig.bucketName}/${prefix}*`,
          ],
        }),
      );
    }

    // Add data source bucket permissions if create config is provided
    if (this.createConfig) {
      const dataSourcePrefix = this.createConfig.dataSourcePrefix ?? '';
      statements.push(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:ListBucket'],
          resources: [
            `arn:aws:s3:::${this.createConfig.dataSourceBucketName}`,
            `arn:aws:s3:::${this.createConfig.dataSourceBucketName}/${dataSourcePrefix}*`,
          ],
        }),
      );
    }

    return statements;
  }

  /**
   * Export configuration for runtime use by the retrieval tool.
   *
   * Returns a configuration object containing all Bedrock-specific
   * settings needed to query the knowledge base at runtime, including:
   * - Base configuration (name, description, retrieval, acl)
   * - Knowledge base type ('bedrock')
   * - Knowledge base ID and ARN
   * - Vector store configuration
   * - Guardrail configuration (if present)
   *
   * @returns Runtime configuration object for the retrieval tool
   */
  public exportConfiguration(): KnowledgeBaseRuntimeConfig {
    return {
      ...super.exportConfiguration(),
      type: 'bedrock',
      knowledgeBaseId: this.knowledgeBaseId,
      knowledgeBaseArn: this.knowledgeBaseArn,
      vectorStore: this.vectorStoreConfig,
      guardrail: this.guardrailConfig,
    };
  }

  /**
   * Provide the Bedrock-specific retrieval tool asset.
   *
   * Returns an Asset containing the Python retrieval tool that uses
   * the Amazon Bedrock Agent Runtime API to query knowledge bases.
   * This tool is automatically added to agents that use Bedrock
   * knowledge bases.
   *
   * @returns Asset containing the Bedrock retrieval tool
   */
  public retrievalToolAsset(): Asset {
    return new Asset(this, 'BedrockRetrievalTool', {
      path: path.join(__dirname, '../resources/knowledge-base-tool'),
    });
  }
}
