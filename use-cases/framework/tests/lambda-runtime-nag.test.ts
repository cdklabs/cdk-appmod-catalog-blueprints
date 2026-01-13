// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Stack, Aspects, Duration } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { LambdaAgentRuntime } from '../agents/runtime/lambda-runtime';

// Helper to get valid entry path for tests
const getTestEntry = (): string => path.join(__dirname, '../agents/resources/default-strands-agent');

describe('LambdaAgentRuntime CDK Nag', () => {
  test('passes CDK Nag checks with all runtime configurations', () => {
    const stack = new Stack(undefined, 'LambdaRuntimeStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    // Create VPC for testing VPC configuration
    const vpc = new Vpc(stack, 'Vpc', {
      maxAzs: 2,
    });

    // Create KMS key for encryption
    const key = new Key(stack, 'Key', {
      enableKeyRotation: true,
    });

    // Create Lambda runtime with basic configuration
    new LambdaAgentRuntime(stack, 'BasicRuntime', {
      functionName: 'basic-agent',
      entry: getTestEntry(),
      index: 'batch.py',
    });

    // Create Lambda runtime with VPC configuration
    new LambdaAgentRuntime(stack, 'VpcRuntime', {
      functionName: 'vpc-agent',
      entry: getTestEntry(),
      index: 'batch.py',
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Create Lambda runtime with encryption
    new LambdaAgentRuntime(stack, 'EncryptedRuntime', {
      functionName: 'encrypted-agent',
      entry: getTestEntry(),
      index: 'batch.py',
      environmentEncryption: key,
      environment: {
        MODEL_ID: 'anthropic.claude-v2',
      },
    });

    // Create Lambda runtime with all options
    new LambdaAgentRuntime(stack, 'FullRuntime', {
      functionName: 'full-agent',
      entry: getTestEntry(),
      index: 'batch.py',
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      environmentEncryption: key,
      config: {
        timeout: Duration.minutes(15),
        memorySize: 3008,
        architecture: Architecture.X86_64,
      },
      environment: {
        MODEL_ID: 'anthropic.claude-v2',
        DEBUG: 'true',
      },
    });

    // Suppress VPC Flow Logs requirement for test VPC
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/LambdaRuntimeStack/Vpc/Resource',
      [
        {
          id: 'AwsSolutions-VPC7',
          reason: 'Test VPC does not require Flow Logs for runtime testing purposes',
        },
      ],
    );

    // Suppress Lambda runtime version check
    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda functions use Python 3.12 which is a supported and current runtime version',
        },
      ],
      true,
    );

    // Suppress Lambda VPC execution role AWS managed policy
    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda functions in VPC require AWSLambdaVPCAccessExecutionRole managed policy for ENI management',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'],
        },
      ],
      true,
    );

    // Suppress Lambda log retention custom resource managed policy
    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'CDK-managed LogRetention custom resource requires AWSLambdaBasicExecutionRole for CloudWatch Logs management',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        },
      ],
      true,
    );

    // Suppress Lambda log stream wildcard permissions
    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda log stream ARN is only known at runtime, wildcard required for CloudWatch Logs access',
        },
      ],
      true,
    );

    // Suppress VPC-related wildcard permissions for Lambda execution role
    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda VPC execution requires wildcard permissions for ENI management across subnets',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );

    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

    const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'));
    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

    if (warnings.length > 0) {
      console.log('CDK Nag Warnings:', JSON.stringify(warnings, null, 2));
    }
    if (errors.length > 0) {
      console.log('CDK Nag Errors:', JSON.stringify(errors, null, 2));
    }

    expect(warnings).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});
