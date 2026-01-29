// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';
import { IKnowledgeBase } from './i-knowledge-base';
import {
  AclConfiguration,
  BaseKnowledgeBaseProps,
  KnowledgeBaseRuntimeConfig,
  RetrievalConfiguration,
} from './knowledge-base-props';

/**
 * Abstract base class for knowledge base implementations.
 *
 * This class provides common functionality for all knowledge base implementations,
 * including configuration management, validation, and default behaviors. Concrete
 * implementations (like BedrockKnowledgeBase) extend this class and implement
 * the abstract methods.
 *
 * The base class handles:
 * - Props validation (name and description are required)
 * - Default retrieval configuration (numberOfResults defaults to 5)
 * - ACL configuration storage
 * - Base runtime configuration export
 *
 * Subclasses must implement:
 * - `generateIamPermissions()`: Return IAM permissions specific to the KB type
 */
export abstract class BaseKnowledgeBase extends Construct implements IKnowledgeBase {
  /**
   * Human-readable name for this knowledge base.
   *
   * This name is used for logging, display purposes, and to help the agent
   * identify which knowledge base to query.
   */
  public readonly name: string;

  /**
   * Human-readable description of what this knowledge base contains.
   *
   * This description is included in the agent's system prompt to help
   * the agent decide when to query this knowledge base.
   */
  public readonly description: string;

  /**
   * Retrieval configuration for this knowledge base.
   *
   * Contains settings like numberOfResults and optional metadata filters.
   * Defaults to { numberOfResults: 5 } if not provided.
   */
  protected readonly retrievalConfig: RetrievalConfiguration;

  /**
   * ACL configuration for identity-aware retrieval.
   *
   * When enabled, retrieval queries will be filtered based on user
   * identity context.
   */
  protected readonly aclConfig?: AclConfiguration;

  /**
   * Creates a new BaseKnowledgeBase instance.
   *
   * @param scope - The scope in which to define this construct
   * @param id - The scoped construct ID
   * @param props - Configuration properties for the knowledge base
   * @throws Error if name is empty or not provided
   * @throws Error if description is empty or not provided
   */
  constructor(scope: Construct, id: string, props: BaseKnowledgeBaseProps) {
    super(scope, id);

    this.validateProps(props);

    this.name = props.name;
    this.description = props.description;
    this.retrievalConfig = props.retrieval ?? { numberOfResults: 5 };
    this.aclConfig = props.acl;
  }

  /**
   * Validates the provided props at construction time.
   *
   * Ensures that required fields (name and description) are provided
   * and not empty. Subclasses can override this method to add additional
   * validation, but should call super.validateProps() first.
   *
   * @param props - The props to validate
   * @throws Error if name is empty or not provided
   * @throws Error if description is empty or not provided
   */
  protected validateProps(props: BaseKnowledgeBaseProps): void {
    if (!props.name || props.name.trim() === '') {
      throw new Error('name is required and cannot be empty');
    }
    if (!props.description || props.description.trim() === '') {
      throw new Error('description is required and cannot be empty');
    }
  }

  /**
   * Generate IAM policy statements required for accessing this knowledge base.
   *
   * This abstract method must be implemented by subclasses to return the
   * specific IAM permissions needed for their knowledge base type.
   *
   * @returns Array of IAM PolicyStatement objects granting necessary permissions
   */
  public abstract generateIamPermissions(): PolicyStatement[];

  /**
   * Export configuration for runtime use by the retrieval tool.
   *
   * Returns a configuration object containing the base knowledge base
   * settings. Subclasses should override this method to add implementation-
   * specific configuration, calling super.exportConfiguration() to include
   * the base configuration.
   *
   * @returns Runtime configuration object for the retrieval tool
   */
  public exportConfiguration(): KnowledgeBaseRuntimeConfig {
    return {
      name: this.name,
      description: this.description,
      retrieval: this.retrievalConfig,
      acl: this.aclConfig,
    };
  }

  /**
   * Provide the retrieval tool asset for this knowledge base type.
   *
   * By default, returns undefined to use the framework's default retrieval
   * tool. Subclasses can override this method to provide a custom retrieval
   * tool implementation.
   *
   * @returns undefined to use the default retrieval tool
   */
  public retrievalToolAsset(): Asset | undefined {
    return undefined;
  }
}
