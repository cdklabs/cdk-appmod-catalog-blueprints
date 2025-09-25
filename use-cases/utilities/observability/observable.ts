// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { IMetric } from 'aws-cdk-lib/aws-cloudwatch';
import { LogGroupDataProtectionProps } from './log-group-data-protection-props';

/**
 * Additional properties that constructs implementing the IObservable
 * interface should extend as part of their input props
 */
export interface ObservableProps {
  /**
   * Business metric service name dimension
   * @default would be defined per use case
   */
  readonly metricServiceName?: string;

  /**
   * Business metric namespace
   * @default would be defined per use case
   */
  readonly metricNamespace?: string;

  /**
   * Data protection related configuration
   * @default a new KMS key would be generated
   */
  readonly logGroupDataProtection?: LogGroupDataProtectionProps;
}

/**
 * Interface providing configuration parameters for constructs that support Observability
 */
export interface IObservable {
  readonly metricServiceName: string;
  readonly metricNamespace: string;
  readonly logGroupDataProtection: LogGroupDataProtectionProps;

  metrics(): IMetric[];
}