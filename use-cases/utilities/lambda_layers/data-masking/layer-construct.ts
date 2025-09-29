// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Properties for the DataMaskingLayerConstruct
 */
export interface DataMaskingLayerProps {
  /**
   * Description for the Lambda layer
   * @default 'Lambda layer for masking sensitive data in document processing'
   */
  description?: string;

  /**
   * Custom masking patterns to add to the default ones
   * @default {}
   */
  customPatterns?: Record<string, {
    /**
     * Regular expression pattern as string
     */
    regex: string;

    /**
     * Mask to apply (string or function name)
     */
    mask: string;
  }>;
}

/**
 * Construct that creates a Lambda layer for data masking
 */
export class DataMaskingLayerConstruct extends Construct {
  /**
   * The Lambda layer containing masking utilities
   */
  public readonly layer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: DataMaskingLayerProps = {}) {
    super(scope, id);

    // Create the Lambda layer
    this.layer = new lambda.LayerVersion(this, 'DataMaskingLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../utilities/lambda_layers/data-masking')),
      compatibleRuntimes: [
        lambda.Runtime.NODEJS_16_X,
        lambda.Runtime.NODEJS_18_X,
        lambda.Runtime.NODEJS_20_X,
      ],
      description: props.description || 'Lambda layer for masking sensitive data',
      license: 'Apache-2.0',
    });

    // Add metadata about available masking patterns
    const defaultPatterns = [
      'nric', 'ssn', 'creditCard', 'email', 'phone', 'passport',
    ];

    // Add custom patterns if provided
    const allPatterns = [...defaultPatterns];
    if (props.customPatterns) {
      allPatterns.push(...Object.keys(props.customPatterns));
    }

    // Add metadata to the construct
    this.node.addMetadata('maskingPatterns', allPatterns.join(', '));
  }

  /**
   * Adds the masking layer to a Lambda function
   * @param fn Lambda function to add the layer to
   * @param maskingConfig Optional masking configuration to add as environment variable
   */
  public addToFunction(fn: lambda.Function, maskingConfig?: Record<string, string[]>): void {
    // Add the layer to the function
    fn.addLayers(this.layer);

    // Add masking configuration if provided
    if (maskingConfig) {
      fn.addEnvironment('MASKING_CONFIG', JSON.stringify(maskingConfig));
    }
  }
}
