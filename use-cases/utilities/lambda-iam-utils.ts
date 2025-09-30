// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as cdk from 'aws-cdk-lib';
import { Names } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Stack information
 */
export interface LambdaIamUtilsStackInfo {
  readonly region: string;
  readonly account: string;
}

/**
 * Configuration options for Lambda CloudWatch Logs permissions
 */
export interface LambdaLogsPermissionsProps {
  /**
   * The construct scope (used to generate unique names)
   */
  readonly scope: Construct;

  /**
   * The base name of the Lambda function
   */
  readonly functionName: string;

  /**
   * Custom log group name pattern
   * @default '/aws/lambda/{uniqueFunctionName}'
   */
  readonly logGroupName?: string;

  /**
   * AWS region for the log group ARN
   */
  readonly region: string;

  /**
   * AWS account ID for the log group ARN
   */
  readonly account: string;

  /**
   * Whether observability is enabled or not. This would have an impact
   * on the result IAM policy for the LogGroup for the Lambda function
   *
   * @default false
   */
  readonly enableObservability?: boolean;
}

/**
 * Result of creating Lambda logs permissions
 */
export interface LambdaLogsPermissionsResult {
  /**
   * The policy statements for CloudWatch Logs
   */
  readonly policyStatements: iam.PolicyStatement[];

  /**
   * The unique function name that was generated
   */
  readonly uniqueFunctionName: string;
}

/**
 * Utility class for creating secure Lambda IAM policy statements with minimal permissions
 */
export class LambdaIamUtils {
  public static readonly OBSERVABILITY_SUFFIX = '-secured';
  /**
   * Creates CloudWatch Logs policy statements for Lambda execution
   *
   * @param props Configuration properties
   * @returns Object containing policy statements and the unique function name
   */
  public static createLogsPermissions(props: LambdaLogsPermissionsProps): LambdaLogsPermissionsResult {
    // Generate unique function name using construct node path
    const uniqueFunctionName = LambdaIamUtils.generateUniqueFunctionName(props.scope, props.functionName);
    const logGroupName = props.logGroupName || `/aws/lambda/${uniqueFunctionName}` + props.enableObservability ? LambdaIamUtils.OBSERVABILITY_SUFFIX : '';
    let logGroupArn = `arn:aws:logs:${props.region}:${props.account}:log-group:${logGroupName}`;
    const policyStatements = [
      // Permission to create log group
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:CreateLogGroup'],
        resources: [
          logGroupArn,
        ],
      }),
      // Permission to create log streams and put log events
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [
          `${logGroupArn}:*`,
        ],
      }),
    ];

    return {
      policyStatements,
      uniqueFunctionName,
    };
  }

  public static generateLambdaVPCPermissions(): iam.PolicyStatement {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DescribeSubnets',
        'ec2:DeleteNetworkInterface',
        'ec2:AssignPrivateIpAddresses',
        'ec2:UnassignPrivateIpAddresses',
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeVpcs',
        'ec2:GetSecurityGroupsForVpc',
      ],
      resources: ['*'],
    });
  }

  /**
   * Generates a unique function name using CDK's built-in functionality
   *
   * @param scope The construct scope
   * @param baseName The base name for the function
   * @returns Unique function name
   */
  public static generateUniqueFunctionName(scope: Construct, baseName: string): string {
    return `${baseName}-${Names.uniqueResourceName(scope, { maxLength: 64 - (baseName.length + 1) }).toLowerCase()}`;
  }

  /**
   * Creates VPC permissions for Lambda functions running in VPC
   *
   * @returns Array of IAM PolicyStatements for VPC access
   */
  public static createVpcPermissions(): iam.PolicyStatement[] {
    return [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ec2:CreateNetworkInterface',
          'ec2:DescribeNetworkInterfaces',
          'ec2:DeleteNetworkInterface',
          'ec2:AttachNetworkInterface',
          'ec2:DetachNetworkInterface',
        ],
        resources: ['*'], // VPC permissions require wildcard resources
      }),
    ];
  }

  /**
   * Creates X-Ray tracing permissions for Lambda functions
   *
   * @returns Array of IAM PolicyStatements for X-Ray tracing
   */
  public static createXRayPermissions(): iam.PolicyStatement[] {
    return [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
        ],
        resources: ['*'], // X-Ray permissions require wildcard resources
      }),
    ];
  }

  /**
   * Helper method to get region and account from a construct
   *
   * @param scope The construct scope
   * @returns LambdaIamUtilsStackInfo
   */
  public static getStackInfo(scope: Construct): LambdaIamUtilsStackInfo {
    const stack = cdk.Stack.of(scope);
    return {
      region: stack.region,
      account: stack.account,
    };
  }

  /**
   * Creates a policy statement for DynamoDB table access
   *
   * @param tableArn The ARN of the DynamoDB table
   * @param actions The DynamoDB actions to allow
   * @returns PolicyStatement for DynamoDB access
   */
  public static createDynamoDbPolicyStatement(
    tableArn: string,
    actions: string[] = ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  ): iam.PolicyStatement {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: [tableArn, `${tableArn}/index/*`], // Include GSI access
    });
  }

  /**
   * Creates a policy statement for S3 bucket access
   *
   * @param bucketArn The ARN of the S3 bucket
   * @param actions The S3 actions to allow
   * @param includeObjects Whether to include object-level permissions
   * @returns PolicyStatement for S3 access
   */
  public static createS3PolicyStatement(
    bucketArn: string,
    actions: string[] = ['s3:GetObject', 's3:PutObject'],
    includeObjects: boolean = true,
  ): iam.PolicyStatement {
    const resources = [bucketArn];
    if (includeObjects) {
      resources.push(`${bucketArn}/*`);
    }

    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources,
    });
  }

  /**
   * Creates a policy statement for SQS queue access
   *
   * @param queueArn The ARN of the SQS queue
   * @param actions The SQS actions to allow
   * @returns PolicyStatement for SQS access
   */
  public static createSqsPolicyStatement(
    queueArn: string,
    actions: string[] = ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
  ): iam.PolicyStatement {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: [queueArn],
    });
  }

  /**
   * Creates a policy statement for SNS topic access
   *
   * @param topicArn The ARN of the SNS topic
   * @param actions The SNS actions to allow
   * @returns PolicyStatement for SNS access
   */
  public static createSnsPolicyStatement(
    topicArn: string,
    actions: string[] = ['sns:Publish'],
  ): iam.PolicyStatement {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: [topicArn],
    });
  }

  /**
   * Creates a policy statement for Step Functions execution
   *
   * @param stateMachineArn The ARN of the Step Functions state machine
   * @param actions The Step Functions actions to allow
   * @returns PolicyStatement for Step Functions access
   */
  public static createStepFunctionsPolicyStatement(
    stateMachineArn: string,
    actions: string[] = ['states:StartExecution'],
  ): iam.PolicyStatement {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: [stateMachineArn],
    });
  }

  /**
   * Creates a policy statement for Secrets Manager access
   *
   * @param secretArn The ARN of the secret
   * @param actions The Secrets Manager actions to allow
   * @returns PolicyStatement for Secrets Manager access
   */
  public static createSecretsManagerPolicyStatement(
    secretArn: string,
    actions: string[] = ['secretsmanager:GetSecretValue'],
  ): iam.PolicyStatement {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: [secretArn],
    });
  }

  /**
   * Creates a policy statement for KMS key access
   *
   * @param keyArn The ARN of the KMS key
   * @param actions The KMS actions to allow
   * @returns PolicyStatement for KMS access
   */
  public static createKmsPolicyStatement(
    keyArn: string,
    actions: string[] = ['kms:Decrypt', 'kms:GenerateDataKey'],
  ): iam.PolicyStatement {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: [keyArn],
    });
  }
}
