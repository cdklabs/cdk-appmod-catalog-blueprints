// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { BundlingOptions } from '@aws-cdk/aws-lambda-python-alpha';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

/**
 * Contains default runtimes that would be referenced
 * by Lambda functions in the various use cases. Updating of
 * Runtime versions should be done here.
 */
export class DefaultRuntimes {

  /**
     * Default runtime for all Lambda functions in the use cases.
     */
  public static readonly NODEJS = Runtime.NODEJS_22_X;

  /**
   * Default runtime for Python based Lambda functions.
   */
  public static readonly PYTHON = Runtime.PYTHON_3_13;

  /**
   * Default bundling arguments for Python function
   */
  public static readonly PYTHON_FUNCTION_BUNDLING: BundlingOptions = {
    buildArgs: {
      '--platform': 'linux/amd64',
    },
    image: this.PYTHON.bundlingImage,
  };

  public static readonly PYTHON_BUNDLING_IMAGE = 'python:3.13.7-bookworm';
}