// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Key } from 'aws-cdk-lib/aws-kms';
import { DataIdentifier } from 'aws-cdk-lib/aws-logs';

/**
 * Props to enable various data protection configuration
 * for CloudWatch Log Groups
 */
export interface LogGroupDataProtectionProps {
  /**
   * Encryption key that would be used to encrypt the relevant log group
   * @default a new KMS key would automatically be created
   */
  readonly logGroupEncryptionKey?: Key;

  /**
   * List of DataIdentifiers that would be used as part of the
   * Data Protection Policy that would be created for the log group
   * @default Data Protection Policy won't be enabled
   */
  readonly dataProtectionIdentifiers?: DataIdentifier[];
}