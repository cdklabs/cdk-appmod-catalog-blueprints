// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Construct } from 'constructs';
import { AgentCoreAgentRuntime, AgentCoreAgentRuntimeProps } from './agentcore-runtime';
import { LambdaAgentRuntime, LambdaAgentRuntimeProps } from './lambda-runtime';
import { IAgentRuntime } from './runtime-interface';
import { AgentRuntimeConfig, AgentRuntimeType } from './types';

/**
 * Common properties shared across all runtime types
 *
 * These properties are required by all runtime implementations and are
 * extracted from the runtime-specific props to avoid duplication.
 */
export interface CommonRuntimeProps {
  /**
   * Name of the agent (used for function name or runtime name)
   */
  readonly agentName: string;

  /**
   * Path to the directory containing the agent code
   */
  readonly entry: string;

  /**
   * Name of the entry file (without extension)
   *
   * @default 'index'
   */
  readonly index?: string;

  /**
   * Environment variables for the agent
   *
   * @default {}
   */
  readonly environment?: Record<string, string>;

  /**
   * Foundation model for AgentCore runtime
   * Only used when creating AgentCore runtimes
   */
  readonly foundationModel?: string;

  /**
   * System instruction for AgentCore runtime
   * Only used when creating AgentCore runtimes
   */
  readonly instruction?: string;

  /**
   * Description of the agent
   */
  readonly description?: string;

  /**
   * Lambda layers for Lambda runtime
   * Only used when creating Lambda runtimes
   */
  readonly layers?: any[];
}

/**
 * Factory for creating agent runtime implementations
 *
 * This factory provides a centralized way to create runtime instances based on
 * the runtime type specified in the configuration. It handles the complexity of
 * instantiating the correct runtime implementation (Lambda or AgentCore) with
 * the appropriate properties.
 *
 * The factory pattern enables:
 * - Type-safe runtime creation with compile-time validation
 * - Centralized error handling for invalid configurations
 * - Easy extension to support additional runtime types in the future
 * - Consistent runtime creation across the framework
 */
export class AgentRuntimeFactory {
  /**
   * Create a runtime implementation based on the runtime configuration
   *
   * This method inspects the runtime type in the configuration and instantiates
   * the appropriate runtime implementation (Lambda or AgentCore). It validates
   * that the runtime type is supported and throws an error for unsupported types.
   *
   * The method handles the mapping of common properties to runtime-specific
   * property interfaces, ensuring type safety while minimizing code duplication.
   *
   * @param scope The CDK construct scope
   * @param id The construct ID
   * @param runtimeConfig The runtime configuration specifying type and settings
   * @param commonProps Common properties shared across runtime types
   * @returns An IAgentRuntime implementation for the specified runtime type
   * @throws Error if the runtime type is not supported
   */
  public static create(
    scope: Construct,
    id: string,
    runtimeConfig: AgentRuntimeConfig,
    commonProps: CommonRuntimeProps,
  ): IAgentRuntime {
    switch (runtimeConfig.type) {
      case AgentRuntimeType.LAMBDA:
        return AgentRuntimeFactory.createLambdaRuntime(
          scope,
          id,
          runtimeConfig,
          commonProps,
        );

      case AgentRuntimeType.AGENTCORE:
        return AgentRuntimeFactory.createAgentCoreRuntime(
          scope,
          id,
          runtimeConfig,
          commonProps,
        );

      default:
        throw new Error(
          `[InvalidRuntimeConfig] Unsupported runtime type: ${runtimeConfig.type}. ` +
          `Supported types are: ${Object.values(AgentRuntimeType).join(', ')}`,
        );
    }
  }

  /**
   * Create a Lambda runtime implementation
   *
   * @private
   * @param scope The CDK construct scope
   * @param id The construct ID
   * @param runtimeConfig The runtime configuration
   * @param commonProps Common properties
   * @returns A LambdaAgentRuntime instance
   */
  private static createLambdaRuntime(
    scope: Construct,
    id: string,
    runtimeConfig: AgentRuntimeConfig,
    commonProps: CommonRuntimeProps,
  ): LambdaAgentRuntime {
    // Extract known properties to avoid duplication
    const { agentName, entry, index, environment, ...additionalProps } = commonProps;

    // Build Lambda-specific properties
    const lambdaProps: LambdaAgentRuntimeProps = {
      functionName: agentName,
      entry,
      index,
      environment,
      config: runtimeConfig.config,
      // Pass through any additional properties
      ...additionalProps,
    };

    return new LambdaAgentRuntime(scope, id, lambdaProps);
  }

  /**
   * Create an AgentCore runtime implementation
   *
   * @private
   * @param scope The CDK construct scope
   * @param id The construct ID
   * @param runtimeConfig The runtime configuration
   * @param commonProps Common properties
   * @returns An AgentCoreAgentRuntime instance
   */
  private static createAgentCoreRuntime(
    scope: Construct,
    id: string,
    runtimeConfig: AgentRuntimeConfig,
    commonProps: CommonRuntimeProps,
  ): AgentCoreAgentRuntime {
    // Extract known properties to avoid duplication
    const { agentName, environment, ...additionalProps } = commonProps;

    // Build AgentCore-specific properties
    const agentCoreProps: AgentCoreAgentRuntimeProps = {
      agentName,
      foundationModel: commonProps.foundationModel || '',
      instruction: commonProps.instruction || '',
      environment,
      config: runtimeConfig.config,
      // Pass through any additional properties
      ...additionalProps,
    };

    return new AgentCoreAgentRuntime(scope, id, agentCoreProps);
  }
}
