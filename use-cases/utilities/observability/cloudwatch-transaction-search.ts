// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

/**
 * Configuration properties for CloudWatch Transaction Search
 */
export interface CloudWatchTransactionSearchProps {
  /**
   * Sampling percentage for span indexing
   *
   * @default 1 (1% of spans indexed)
   */
  readonly samplingPercentage?: number;

  /**
   * Name of the CloudWatch Logs resource policy
   *
   * @default 'TransactionSearchXRayAccess'
   */
  readonly policyName?: string;
}

/**
 * Enables CloudWatch Transaction Search for X-Ray traces
 *
 * This construct configures account-level settings to enable cost-effective
 * collection of all X-Ray spans through CloudWatch Logs. It performs three steps:
 *
 * 1. Creates a CloudWatch Logs resource-based policy allowing X-Ray to send traces
 * 2. Configures X-Ray to send trace segments to CloudWatch Logs
 * 3. Sets the sampling percentage for span indexing (default 1%)
 *
 * The construct checks if Transaction Search is already enabled and only applies
 * configuration if needed. It's idempotent and safe to deploy multiple times.
 *
 * ## Benefits
 * - Cost-effective: Uses CloudWatch Logs pricing instead of X-Ray pricing
 * - Full visibility: All spans are collected and searchable
 * - Automatic indexing: 1% of spans indexed by default for trace summaries
 *
 * ## Usage
 * ```typescript
 * new CloudWatchTransactionSearch(this, 'TransactionSearch', {
 *   samplingPercentage: 1  // Optional: 1% is default
 * });
 * ```
 *
 * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Enable-TransactionSearch.html
 */
export class CloudWatchTransactionSearch extends Construct {
  constructor(scope: Construct, id: string, props: CloudWatchTransactionSearchProps = {}) {
    super(scope, id);

    const samplingPercentage = props.samplingPercentage ?? 1;
    const policyName = props.policyName ?? 'TransactionSearchXRayAccess';

    // Create Lambda function for custom resource
    const onEventHandler = new Function(this, 'Handler', {
      runtime: Runtime.PYTHON_3_11,
      handler: 'index.on_event',
      code: Code.fromAsset(path.join(__dirname, 'resources/transaction-search-handler')),
      timeout: Duration.minutes(5),
      environment: {
        SAMPLING_PERCENTAGE: samplingPercentage.toString(),
        POLICY_NAME: policyName,
      },
    });

    // Grant permissions to configure Transaction Search
    // Based on: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Enable-TransactionSearch.html

    // X-Ray permissions
    onEventHandler.addToRolePolicy(new PolicyStatement({
      sid: 'TransactionSearchXRayPermissions',
      effect: Effect.ALLOW,
      actions: [
        'xray:GetTraceSegmentDestination',
        'xray:UpdateTraceSegmentDestination',
        'xray:GetIndexingRules',
        'xray:UpdateIndexingRule',
      ],
      resources: ['*'],
    }));

    // CloudWatch Logs permissions for log groups
    onEventHandler.addToRolePolicy(new PolicyStatement({
      sid: 'TransactionSearchLogGroupPermissions',
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutRetentionPolicy',
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/application-signals/data:*',
        'arn:aws:logs:*:*:log-group:aws/spans:*',
      ],
    }));

    // CloudWatch Logs resource policy permissions
    onEventHandler.addToRolePolicy(new PolicyStatement({
      sid: 'TransactionSearchLogsPermissions',
      effect: Effect.ALLOW,
      actions: [
        'logs:PutResourcePolicy',
        'logs:DescribeResourcePolicies',
        'logs:DeleteResourcePolicy', // Added for cleanup on stack deletion
        'logs:DescribeLogGroups', // Added for checking log group status
      ],
      resources: ['*'],
    }));

    // Application Signals permissions
    onEventHandler.addToRolePolicy(new PolicyStatement({
      sid: 'TransactionSearchApplicationSignalsPermissions',
      effect: Effect.ALLOW,
      actions: ['application-signals:StartDiscovery'],
      resources: ['*'],
    }));

    // IAM service-linked role creation
    onEventHandler.addToRolePolicy(new PolicyStatement({
      sid: 'CloudWatchApplicationSignalsCreateServiceLinkedRolePermissions',
      effect: Effect.ALLOW,
      actions: ['iam:CreateServiceLinkedRole'],
      resources: [
        'arn:aws:iam::*:role/aws-service-role/application-signals.cloudwatch.amazonaws.com/AWSServiceRoleForCloudWatchApplicationSignals',
      ],
      conditions: {
        StringLike: {
          'iam:AWSServiceName': 'application-signals.cloudwatch.amazonaws.com',
        },
      },
    }));

    // IAM get role permissions
    onEventHandler.addToRolePolicy(new PolicyStatement({
      sid: 'CloudWatchApplicationSignalsGetRolePermissions',
      effect: Effect.ALLOW,
      actions: ['iam:GetRole'],
      resources: [
        'arn:aws:iam::*:role/aws-service-role/application-signals.cloudwatch.amazonaws.com/AWSServiceRoleForCloudWatchApplicationSignals',
      ],
    }));

    // CloudTrail permissions for Application Signals event channel
    onEventHandler.addToRolePolicy(new PolicyStatement({
      sid: 'CloudWatchApplicationSignalsCloudTrailPermissions',
      effect: Effect.ALLOW,
      actions: [
        'cloudtrail:CreateServiceLinkedChannel',
        'cloudtrail:GetChannel', // Added for checking channel status
      ],
      resources: [
        'arn:aws:cloudtrail:*:*:channel/aws-service-channel/application-signals/*',
      ],
    }));

    // Create custom resource provider
    const provider = new Provider(this, 'Provider', {
      onEventHandler,
    });

    // Create custom resource
    new CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      properties: {
        SamplingPercentage: samplingPercentage,
        PolicyName: policyName,
        Region: Stack.of(this).region,
        Account: Stack.of(this).account,
      },
    });
  }
}
