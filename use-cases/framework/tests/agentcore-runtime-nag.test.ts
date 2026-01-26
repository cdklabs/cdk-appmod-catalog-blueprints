// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack, Aspects } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { AgentCoreAgentRuntime } from '../agents/runtime/agentcore-runtime';
import { AgentCoreDeploymentMethod } from '../agents/runtime/types';

describe('AgentCoreAgentRuntime CDK Nag', () => {
  test('passes CDK Nag checks with basic CONTAINER deployment', () => {
    const stack = new Stack(undefined, 'BasicRuntimeStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    new AgentCoreAgentRuntime(stack, 'BasicRuntime', {
      agentName: 'basic-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are a helpful assistant',
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/basic-agent:latest',
      },
    });

    // Suppress ECR GetAuthorizationToken wildcard requirement
    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'ECR GetAuthorizationToken requires wildcard resource by AWS design - see https://docs.aws.amazon.com/AmazonECR/latest/userguide/security_iam_id-based-policy-examples.html',
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

  test('passes CDK Nag checks with environment variables', () => {
    const stack = new Stack(undefined, 'EnvRuntimeStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    new AgentCoreAgentRuntime(stack, 'EnvRuntime', {
      agentName: 'env-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are a specialized assistant',
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/env-agent:latest',
        memorySize: 2048,
      },
      environment: {
        MODEL_ID: 'anthropic.claude-v2',
        DEBUG: 'true',
        TEMPERATURE: '0.7',
      },
    });

    // Suppress ECR GetAuthorizationToken wildcard requirement
    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'ECR GetAuthorizationToken requires wildcard resource by AWS design - see https://docs.aws.amazon.com/AmazonECR/latest/userguide/security_iam_id-based-policy-examples.html',
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

  test('passes CDK Nag checks with VPC configuration', () => {
    const stack = new Stack(undefined, 'VpcRuntimeStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    const vpc = new Vpc(stack, 'Vpc', {
      maxAzs: 2,
    });

    new AgentCoreAgentRuntime(stack, 'VpcRuntime', {
      agentName: 'vpc-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are a VPC-enabled assistant',
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/vpc-agent:latest',
      },
      network: {
        vpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      },
    });

    // Suppress VPC Flow Logs requirement for test VPC
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/VpcRuntimeStack/Vpc/Resource',
      [
        {
          id: 'AwsSolutions-VPC7',
          reason: 'Test VPC does not require Flow Logs for runtime testing purposes',
        },
      ],
    );

    // Suppress VPC-related wildcard permissions for AgentCore execution role
    NagSuppressions.addResourceSuppressions(
      stack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'AgentCore VPC execution requires wildcard permissions for EC2 describe operations to validate VPC configuration',
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
