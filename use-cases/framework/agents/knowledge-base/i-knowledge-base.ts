// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { KnowledgeBaseRuntimeConfig } from './knowledge-base-props';

/**
 * Interface for knowledge base implementations.
 *
 * This interface defines the contract that all knowledge base implementations must satisfy,
 * allowing different KB backends (Bedrock KB, OpenSearch, custom) to be used interchangeably
 * with the agent framework.
 *
 * Implementations of this interface are responsible for:
 * - Providing metadata about the knowledge base (name, description)
 * - Generating the IAM permissions required for the agent to access the KB
 * - Exporting runtime configuration for the retrieval tool
 * - Optionally providing a custom retrieval tool implementation
 */
export interface IKnowledgeBase {
  /**
   * Human-readable name for this knowledge base.
   *
   * This name is used for logging, display purposes, and to help the agent
   * identify which knowledge base to query. It should be unique within
   * the set of knowledge bases configured for an agent.
   *
   * @example 'product-documentation'
   */
  readonly name: string;

  /**
   * Human-readable description of what this knowledge base contains.
   *
   * This description is included in the agent's system prompt to help
   * the agent decide when to query this knowledge base. It should clearly
   * indicate what type of information the KB contains and when it should
   * be used.
   *
   * @example 'Contains product documentation, user guides, and FAQs. Use when answering questions about product features or troubleshooting.'
   */
  readonly description: string;

  /**
   * Generate IAM policy statements required for accessing this knowledge base.
   *
   * This method returns the IAM permissions that the agent's Lambda function
   * role needs to query this knowledge base. The permissions should follow
   * the principle of least privilege, scoped to the specific resources.
   *
   * @returns Array of IAM PolicyStatement objects granting necessary permissions
   */
  generateIamPermissions(): PolicyStatement[];

  /**
   * Export configuration for runtime use by the retrieval tool.
   *
   * This method returns a configuration object that will be serialized
   * and passed to the retrieval tool via environment variables. The
   * configuration includes all information needed to query the KB at runtime.
   *
   * @returns Runtime configuration object for the retrieval tool
   */
  exportConfiguration(): KnowledgeBaseRuntimeConfig;

  /**
   * Provide the retrieval tool asset for this knowledge base type.
   *
   * This optional method allows knowledge base implementations to provide
   * a custom retrieval tool. If not implemented or returns undefined,
   * the framework's default retrieval tool will be used.
   *
   * @returns S3 Asset containing the retrieval tool code, or undefined to use the default
   */
  retrievalToolAsset?(): Asset | undefined;

  /**
   * Provide Lambda layers required by the retrieval tool.
   *
   * This optional method allows knowledge base implementations to provide
   * Lambda layers containing dependencies needed by their retrieval tool.
   * For example, a knowledge base might need specific boto3 versions,
   * custom libraries, or SDK extensions.
   *
   * The layers will be added to the agent's Lambda function, making the
   * dependencies available to the retrieval tool at runtime.
   *
   * @returns Array of Lambda LayerVersion objects, or undefined if no layers needed
   */
  retrievalToolLayers?(): LayerVersion[] | undefined;
}
