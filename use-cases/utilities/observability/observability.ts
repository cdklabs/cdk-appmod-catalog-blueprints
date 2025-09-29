// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

/**
 * Configuration for observability features
 */
export interface ObservabilityConfig {
  /** Enable CloudWatch Dashboard */
  readonly enableDashboard?: boolean;

  /** Enable CloudWatch Alarms */
  readonly enableAlarms?: boolean;

  /** Enable AWS X-Ray tracing */
  readonly enableTracing?: boolean;

  /** Log retention period in days */
  readonly logRetentionDays?: logs.RetentionDays;

  /** Custom dashboard name */
  readonly dashboardName?: string;

  /** SNS topic ARN for alarm notifications */
  readonly alarmNotificationTopicArn?: string;

  /** Custom metric namespace */
  readonly metricsNamespace?: string;
}

/**
 * Resources that need observability monitoring
 */
export interface ObservabilityResources {
  /** Step Functions state machine (optional) */
  readonly stateMachine?: stepfunctions.StateMachine;

  /** Lambda functions to monitor */
  readonly lambdaFunctions: lambda.Function[];

  /** SQS queues to monitor (optional) */
  readonly sqsQueues?: sqs.Queue[];

  /** S3 buckets for storage (optional) */
  readonly s3Buckets?: s3.IBucket[];

  /** Dead letter queue (optional) */
  readonly deadLetterQueue?: sqs.IQueue;

  /** Use case name for labeling */
  readonly useCaseName: string;
}

/**
 * Comprehensive observability construct for serverless use cases
 */
export class ServerlessObservability extends Construct {
  /** CloudWatch Dashboard for monitoring */
  public readonly dashboard?: cloudwatch.Dashboard;

  /** CloudWatch Log Groups */
  public readonly logGroups: logs.LogGroup[];

  /** CloudWatch Alarms */
  public readonly alarms: cloudwatch.Alarm[];

  /** Metrics namespace */
  public readonly metricsNamespace: string;

  constructor(
    scope: Construct,
    id: string,
    resources: ObservabilityResources,
    config: ObservabilityConfig = {},
  ) {
    super(scope, id);

    // Configuration with defaults
    const observabilityConfig = {
      enableDashboard: true,
      enableAlarms: true,
      enableTracing: true,
      logRetentionDays: logs.RetentionDays.ONE_MONTH,
      dashboardName: `${resources.useCaseName}-${cdk.Stack.of(this).stackName}`,
      metricsNamespace: resources.useCaseName,
      ...config,
    };

    this.metricsNamespace = observabilityConfig.metricsNamespace;
    this.logGroups = [];
    this.alarms = [];

    // Create log groups for Lambda functions
    this.createLogGroups(resources.lambdaFunctions, observabilityConfig);

    // Enable X-Ray tracing
    if (observabilityConfig.enableTracing) {
      this.enableTracing(resources);
    }

    // Create CloudWatch alarms
    if (observabilityConfig.enableAlarms) {
      this.createAlarms(resources, observabilityConfig);
    }

    // Create CloudWatch dashboard
    if (observabilityConfig.enableDashboard) {
      this.dashboard = this.createDashboard(resources, observabilityConfig);
    }
  }

  /**
   * Create log groups for Lambda functions with proper retention
   */
  private createLogGroups(
    lambdaFunctions: lambda.Function[],
    config: ObservabilityConfig,
  ): void {
    lambdaFunctions.forEach((fn, index) => {
      const logGroup = new logs.LogGroup(this, `LogGroup-${index}`, {
        logGroupName: `/aws/lambda/${fn.functionName}`,
        retention: config.logRetentionDays!,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      this.logGroups.push(logGroup);
    });
  }

  /**
   * Enable AWS X-Ray tracing for all resources
   */
  private enableTracing(resources: ObservabilityResources): void {
    // Enable X-Ray tracing for Lambda functions
    resources.lambdaFunctions.forEach(fn => {
      // Enable X-Ray tracing via Lambda configuration (not environment variables)
      const cfnFunction = fn.node.defaultChild as lambda.CfnFunction;
      cfnFunction.tracingConfig = {
        mode: lambda.Tracing.ACTIVE,
      };

      // Add X-Ray permissions
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
        resources: ['*'],
      }));

      // Note: _X_AMZN_TRACE_ID is automatically managed by Lambda runtime
    });

    // Enable tracing for Step Functions
    // Note: Tracing should be enabled during state machine creation with tracingEnabled: true
  }

  /**
   * Create CloudWatch alarms for monitoring critical metrics
   */
  private createAlarms(
    resources: ObservabilityResources,
    config: ObservabilityConfig,
  ): void {
    // Step Functions execution failure alarm (if state machine exists)
    if (resources.stateMachine) {
      const stepFunctionFailureAlarm = new cloudwatch.Alarm(this, 'StepFunctionFailureAlarm', {
        alarmName: `${config.dashboardName}-StepFunction-Failures`,
        alarmDescription: 'Step Function execution failures',
        metric: resources.stateMachine.metricFailed({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      this.alarms.push(stepFunctionFailureAlarm);
    }

    // Lambda function error rate alarms
    resources.lambdaFunctions.forEach((fn, index) => {
      const errorAlarm = new cloudwatch.Alarm(this, `LambdaErrorAlarm-${index}`, {
        alarmName: `${config.dashboardName}-Lambda-${fn.functionName}-Errors`,
        alarmDescription: `High error rate for Lambda function ${fn.functionName}`,
        metric: fn.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      this.alarms.push(errorAlarm);

      // Lambda function duration alarm
      const durationAlarm = new cloudwatch.Alarm(this, `LambdaDurationAlarm-${index}`, {
        alarmName: `${config.dashboardName}-Lambda-${fn.functionName}-Duration`,
        alarmDescription: `High duration for Lambda function ${fn.functionName}`,
        metric: fn.metricDuration({
          period: cdk.Duration.minutes(5),
          statistic: 'Average',
        }),
        threshold: 30000, // 30 seconds
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      this.alarms.push(durationAlarm);
    });

    // SQS queue depth alarm (if queues exist)
    if (resources.sqsQueues) {
      resources.sqsQueues.forEach((queue, index) => {
        const queueDepthAlarm = new cloudwatch.Alarm(this, `SQSDepthAlarm-${index}`, {
          alarmName: `${config.dashboardName}-SQS-${queue.queueName}-Depth`,
          alarmDescription: `High message count in SQS queue ${queue.queueName}`,
          metric: queue.metricApproximateNumberOfMessagesVisible({
            period: cdk.Duration.minutes(5),
            statistic: 'Average',
          }),
          threshold: 100,
          evaluationPeriods: 2,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        this.alarms.push(queueDepthAlarm);
      });
    }

    // Dead letter queue alarm
    if (resources.deadLetterQueue) {
      const dlqAlarm = new cloudwatch.Alarm(this, 'DeadLetterQueueAlarm', {
        alarmName: `${config.dashboardName}-DeadLetterQueue-Messages`,
        alarmDescription: 'Messages in dead letter queue',
        metric: resources.deadLetterQueue.metricApproximateNumberOfMessagesVisible({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      this.alarms.push(dlqAlarm);
    }
  }

  /**
   * Create comprehensive CloudWatch dashboard
   */
  private createDashboard(
    resources: ObservabilityResources,
    config: ObservabilityConfig,
  ): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: config.dashboardName,
    });

    // Step Functions metrics (if state machine exists)
    if (resources.stateMachine) {
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Step Functions Executions',
          left: [
            resources.stateMachine.metricStarted({
              label: 'Started',
              color: cloudwatch.Color.BLUE,
            }),
            resources.stateMachine.metricSucceeded({
              label: 'Succeeded',
              color: cloudwatch.Color.GREEN,
            }),
            resources.stateMachine.metricFailed({
              label: 'Failed',
              color: cloudwatch.Color.RED,
            }),
          ],
          width: 12,
          height: 6,
        }),
      );

      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Step Functions Execution Duration',
          left: [
            resources.stateMachine.metricTime({
              label: 'Execution Time',
              statistic: 'Average',
              color: cloudwatch.Color.PURPLE,
            }),
          ],
          width: 12,
          height: 6,
        }),
      );
    }

    // Lambda functions metrics
    const lambdaInvocations = resources.lambdaFunctions.map(fn =>
      fn.metricInvocations({
        label: fn.functionName,
      }),
    );

    const lambdaErrors = resources.lambdaFunctions.map(fn =>
      fn.metricErrors({
        label: `${fn.functionName} Errors`,
        color: cloudwatch.Color.RED,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Function Invocations',
        left: lambdaInvocations,
        width: 12,
        height: 6,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Function Errors',
        left: lambdaErrors,
        width: 12,
        height: 6,
      }),
    );

    // SQS queue metrics (if queues exist)
    if (resources.sqsQueues && resources.sqsQueues.length > 0) {
      const sqsMessages = resources.sqsQueues.map(queue =>
        queue.metricApproximateNumberOfMessagesVisible({
          label: `${queue.queueName} Messages`,
        }),
      );

      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'SQS Queue Depth',
          left: sqsMessages,
          width: 12,
          height: 6,
        }),
      );
    }

    // Custom metrics widget for use case specific metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: `${resources.useCaseName} Metrics`,
        left: [
          new cloudwatch.Metric({
            namespace: this.metricsNamespace,
            metricName: 'ProcessedItems',
            statistic: 'Sum',
            label: 'Items Processed',
            color: cloudwatch.Color.GREEN,
          }),
          new cloudwatch.Metric({
            namespace: this.metricsNamespace,
            metricName: 'FailedItems',
            statistic: 'Sum',
            label: 'Items Failed',
            color: cloudwatch.Color.RED,
          }),
        ],
        width: 12,
        height: 6,
      }),
    );

    return dashboard;
  }

  /**
   * Add custom widget to the dashboard
   */
  public addCustomWidget(widget: cloudwatch.IWidget): void {
    if (this.dashboard) {
      this.dashboard.addWidgets(widget);
    }
  }

  /**
   * Create a custom metric for use case specific events
   */
  public createCustomMetric(
    metricName: string,
    dimensionsMap?: { [key: string]: string },
  ): cloudwatch.Metric {
    return new cloudwatch.Metric({
      namespace: this.metricsNamespace,
      metricName,
      dimensionsMap,
      statistic: 'Sum',
    });
  }
}
