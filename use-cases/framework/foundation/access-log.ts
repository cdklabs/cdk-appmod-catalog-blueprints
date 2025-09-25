// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Configuration options for the AccessLog construct
 */
export interface AccessLogProps {
  /**
   * The name of the S3 bucket for access logs
   * @default 'access-logs'
   */
  readonly bucketName?: string;

  /**
   * Lifecycle rules for the access logs
   * @default Transition to IA after 30 days, delete after 90 days
   */
  readonly lifecycleRules?: s3.LifecycleRule[];

  /**
   * Whether to enable versioning on the access logs bucket
   * @default false
   */
  readonly versioned?: boolean;

  /**
   * Custom bucket prefix for organizing access logs
   * @default 'access-logs'
   */
  readonly bucketPrefix?: string;
}

/**
 * AccessLog construct that provides a centralized S3 bucket for storing access logs.
 * This construct creates a secure S3 bucket with appropriate policies for AWS services
 * to deliver access logs.
 *
 * Usage:
 *
 * const accessLog = new AccessLog(this, 'AccessLog');
 * const bucket = accessLog.bucket;
 * const bucketName = accessLog.bucketName;
 */
export class AccessLog extends Construct {
  /**
   * The S3 bucket for storing access logs
   */
  public readonly bucket: s3.Bucket;

  /**
   * The name of the S3 bucket
   */
  public readonly bucketName: string;

  /**
   * The bucket prefix used for organizing access logs
   */
  public readonly bucketPrefix: string;

  constructor(scope: Construct, id: string, props: AccessLogProps = {}) {
    super(scope, id);

    // Store the bucket prefix
    this.bucketPrefix = props.bucketPrefix || 'access-logs';

    // Generate unique bucket name with account and region to avoid conflicts
    const accountId = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;
    const baseName = props.bucketName || 'access-logs';
    this.bucketName = `${baseName}-${accountId}-${region}`;

    // Default lifecycle rules
    const defaultLifecycleRules: s3.LifecycleRule[] = [
      {
        id: 'AccessLogLifecycle',
        enabled: true,
        transitions: [
          {
            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
            transitionAfter: cdk.Duration.days(30),
          },
          {
            storageClass: s3.StorageClass.GLACIER,
            transitionAfter: cdk.Duration.days(90),
          },
        ],
        expiration: cdk.Duration.days(365), // Delete after 1 year
      },
    ];

    // Create the S3 bucket for access logs
    this.bucket = new s3.Bucket(this, 'AccessLogBucket', {
      bucketName: this.bucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: props.versioned || false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: props.lifecycleRules || defaultLifecycleRules,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Retain logs for compliance
      enforceSSL: true, // Enforce SSL for all requests
      eventBridgeEnabled: false, // Disable EventBridge for cost optimization
    });

    // Add bucket policy to allow access log delivery from AWS services
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowAccessLogDelivery',
      effect: iam.Effect.ALLOW,
      principals: [
        new iam.ServicePrincipal('logging.s3.amazonaws.com'),
        new iam.ServicePrincipal('delivery.logs.amazonaws.com'),
      ],
      actions: [
        's3:PutObject',
        's3:GetBucketAcl',
        's3:ListBucket',
      ],
      resources: [
        this.bucket.bucketArn,
        `${this.bucket.bucketArn}/*`,
      ],
      conditions: {
        StringEquals: {
          's3:x-amz-acl': 'bucket-owner-full-control',
        },
      },
    }));

    // Allow ELB service to write access logs
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowELBAccessLogDelivery',
      effect: iam.Effect.ALLOW,
      principals: [
        new iam.ServicePrincipal('elasticloadbalancing.amazonaws.com'),
      ],
      actions: ['s3:PutObject'],
      resources: [`${this.bucket.bucketArn}/*`],
    }));
  }

  /**
   * Get the S3 bucket path for a specific service's access logs
   *
   * @param serviceName The name of the service (e.g., 'alb', 'cloudfront', 's3')
   * @param resourceName Optional resource name for further organization
   * @returns The S3 path for the service's access logs
   */
  public getLogPath(serviceName: string, resourceName?: string): string {
    const basePath = `${this.bucketName}/${this.bucketPrefix}/${serviceName}`;
    return resourceName ? `${basePath}/${resourceName}` : basePath;
  }

  /**
   * Get the S3 URI for a specific service's access logs
   *
   * @param serviceName The name of the service (e.g., 'alb', 'cloudfront', 's3')
   * @param resourceName Optional resource name for further organization
   * @returns The S3 URI for the service's access logs
   */
  public getLogUri(serviceName: string, resourceName?: string): string {
    return `s3://${this.getLogPath(serviceName, resourceName)}`;
  }
}
