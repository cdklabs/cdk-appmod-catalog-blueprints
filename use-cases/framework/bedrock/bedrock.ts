// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack } from 'aws-cdk-lib';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Cross-region inference prefix options for Bedrock models.
 * Used to configure inference profiles for improved availability and performance.
 */
export enum BedrockCrossRegionInferencePrefix {
  /** US-based cross-region inference profile */
  US = 'us',
  /** EU-based cross-region inference profile */
  EU = 'eu',
}

export interface BedrockModelProps {
  /**
     * Foundation model to use
     *
     * @default FoundationModelIdentifier.ANTHROPIC_CLAUDE_SONNET_4_20250514_V1_0
     */
  readonly fmModelId?: FoundationModelIdentifier;

  /**
   * Direct model ID override.
   *
   * Use this when invoking a model ID not available in `FoundationModelIdentifier`,
   * for example LocalStack Bedrock/Ollama-backed model IDs.
   *
   * When provided, this value is used as-is for runtime invocation.
   */
  readonly customModelId?: string;

  /**
     * Enable cross-region inference for Bedrock models to improve availability and performance.
     * When enabled, uses inference profiles instead of direct model invocation.
     * @default false
     */
  readonly useCrossRegionInference?: boolean;
  /**
     * Prefix for cross-region inference configuration.
     * Only used when useCrossRegionInference is true.
     * @default BedrockCrossRegionInferencePrefix.US
     */
  readonly crossRegionInferencePrefix?: BedrockCrossRegionInferencePrefix;
}

export class BedrockModelUtils {
  public static deriveActualModelId(props?: BedrockModelProps): string {
    const { modelId, crossRegionPrefix, usingCustomModelId } = BedrockModelUtils.deriveDefaults(props);
    if (usingCustomModelId) {
      return modelId;
    }
    return props?.useCrossRegionInference ? `${crossRegionPrefix}.${modelId}` : modelId;
  }

  public static generateModelIAMPermissions(scope: Construct, props?: BedrockModelProps): PolicyStatement {
    const { account, region } = Stack.of(scope);
    const { modelId, crossRegionPrefix, usingCustomModelId } = BedrockModelUtils.deriveDefaults(props);

    const resources = [
      `arn:aws:bedrock:*::foundation-model/${modelId}`,
    ];

    // Preserve current behavior for AWS foundation models with optional inference profile access.
    if (!usingCustomModelId) {
      resources.push(`arn:aws:bedrock:${region}:${account}:inference-profile/${crossRegionPrefix}.${modelId}`);
    }

    return new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources,
    });
  }

  private static deriveDefaults(props?: BedrockModelProps): Record<string, any> {
    const fmModelId = props?.fmModelId || FoundationModelIdentifier.ANTHROPIC_CLAUDE_SONNET_4_20250514_V1_0;
    const usingCustomModelId = !!props?.customModelId;
    const modelId = props?.customModelId || fmModelId.modelId;
    const crossRegionPrefix = props?.crossRegionInferencePrefix || BedrockCrossRegionInferencePrefix.US;

    return {
      modelId,
      usingCustomModelId,
      crossRegionPrefix,
    };
  }
}
