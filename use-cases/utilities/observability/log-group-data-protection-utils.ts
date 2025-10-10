// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { RemovalPolicy } from 'aws-cdk-lib';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { LogGroupDataProtectionProps } from './log-group-data-protection-props';

export class LogGroupDataProtectionUtils {
  public static handleDefault(scope: Construct, props?: LogGroupDataProtectionProps, removalPolicy?: RemovalPolicy): LogGroupDataProtectionProps {
    let logGroupDataProtection: LogGroupDataProtectionProps;
    const tempLogGroupDataProtection = props || {
      logGroupEncryptionKey: new Key(scope, 'LogGroupEncryptionKey', {
        enableKeyRotation: true,
        removalPolicy: removalPolicy || RemovalPolicy.DESTROY,
      }),
    };

    if (!tempLogGroupDataProtection.logGroupEncryptionKey) {
      logGroupDataProtection = {
        dataProtectionIdentifiers: tempLogGroupDataProtection.dataProtectionIdentifiers,
        logGroupEncryptionKey: new Key(scope, 'LogGroupEncryptionKey', {
          enableKeyRotation: true,
          removalPolicy: removalPolicy || RemovalPolicy.DESTROY,
        }),
      };
    } else {
      logGroupDataProtection = tempLogGroupDataProtection;
    }

    return logGroupDataProtection;
  }
}