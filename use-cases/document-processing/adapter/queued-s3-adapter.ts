// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'node:path';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket, BucketEncryption, EventType } from 'aws-cdk-lib/aws-s3';
import { SqsDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { Chain, JsonPath, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { CallAwsService } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { BaseDocumentProcessingProps } from '../base-document-processing';
import { IAdapter } from './adapter';
import { DefaultRuntimes } from '../../framework';
import { DefaultObservabilityConfig, LambdaIamUtils, PowertoolsConfig } from '../../utilities';
import { DefaultDocumentProcessingConfig } from '../default-document-processing-config';

/**
 * Struct for S3 Prefixes
 */
interface S3Prefixes {
  readonly raw: string;
  readonly processed: string;
  readonly failed: string;
}

/**
 * Props for the Queued S3 Adapter
 */
export interface QueuedS3AdapterProps {
  /**
   * S3 bucket for document storage with organized prefixes (raw/, processed/, failed/).
   * If not provided, a new bucket will be created with auto-delete enabled based on removalPolicy.
   *
   * @default create a new bucket
   */
  readonly bucket?: Bucket;

  /**
   * S3 prefix where the raw files would be stored.
   * This serves as the trigger point for processing
   *
   * @default "raw/"
   */
  readonly rawPrefix?: string;

  /**
   * S3 prefix where the processed files would be stored.
   *
   * @default "processed/"
   */
  readonly processedPrefix?: string;

  /**
   * S3 prefix where the files that failed processing would be stored.
   *
   * @default "failed/"
   */
  readonly failedPrefix?: string;

  /**
   * SQS queue visibility timeout for processing messages.
   * Should be longer than expected processing time to prevent duplicate processing.
   * @default Duration.seconds(300)
   */
  readonly queueVisibilityTimeout?: Duration;

  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
   *
   * @default 5
   */
  readonly dlqMaxReceiveCount?: number;
}

/**
 * This adapter allows the intelligent document processing workflow
 * to be triggered by files that are uploaded into a S3 Bucket.
 */
export class QueuedS3Adapter implements IAdapter {
  private readonly adapterProps: QueuedS3AdapterProps;
  private readonly resources: Record<string, any>;
  private readonly prefixes: S3Prefixes;

  constructor(adapterProps: QueuedS3AdapterProps = {}) {
    this.adapterProps = adapterProps;
    this.resources = {};
    this.prefixes = {
      raw: this.normalizePrefix(this.adapterProps.rawPrefix, 'raw/'),
      processed: this.normalizePrefix(this.adapterProps.processedPrefix, 'processed/'),
      failed: this.normalizePrefix(this.adapterProps.failedPrefix, 'failed/'),
    };
  }

  /**
   * Ensures a prefix ends with '/'.
   * @param prefix - The prefix to normalize
   * @param defaultValue - Default value if prefix is undefined
   * @returns The normalized prefix ending with '/'
   */
  private normalizePrefix(prefix: string | undefined, defaultValue: string): string {
    if (prefix === undefined) {
      return defaultValue;
    }
    return prefix.endsWith('/') ? prefix : `${prefix}/`;
  }

  init(scope: Construct, props: BaseDocumentProcessingProps): void {
    if (props.network) {
      props.network.createServiceEndpoint('vpce-sqs', InterfaceVpcEndpointAwsService.SQS);
      props.network.createServiceEndpoint('vpce-s3', InterfaceVpcEndpointAwsService.S3);
    }

    const encryptionKey = props.encryptionKey || new Key(scope, 'QueuedS3AdapterEncryptionKey', {
      enableKeyRotation: true,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
    });

    this.resources.encryptionKey = encryptionKey;

    const bucket = this.adapterProps.bucket || new Bucket(scope, 'DocumentProcessingBucket', {
      autoDeleteObjects: (props.removalPolicy && props.removalPolicy === RemovalPolicy.DESTROY) || !props.removalPolicy ? true : false,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      encryption: BucketEncryption.KMS, // Uses AWS-managed KMS key for encryption at rest
      enforceSSL: true,
      bucketKeyEnabled: true, // Reduces KMS costs by using S3 Bucket Keys
    });

    this.resources.bucket = bucket;

    const deadLetterQueue = new Queue(scope, 'DocumentProcessingDLQ', {
      visibilityTimeout: this.adapterProps.queueVisibilityTimeout || Duration.seconds(300),
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      enforceSSL: true,
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
    });

    const queue = new Queue(scope, 'DocumentProcessingQueue', {
      visibilityTimeout: this.adapterProps.queueVisibilityTimeout || Duration.seconds(300),
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      enforceSSL: true,
      deadLetterQueue: {
        maxReceiveCount: this.adapterProps.dlqMaxReceiveCount || 5,
        queue: deadLetterQueue,
      },
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
    });

    this.resources.deadLetterQueue = deadLetterQueue;
    this.resources.queue = queue;
  }

  createIngressTrigger(scope: Construct, stateMachine: StateMachine, props: BaseDocumentProcessingProps): Record<string, any> {
    const bucket: Bucket = this.resources.bucket;
    const queue: Queue = this.resources.queue;
    const encryptionKey: Key = this.resources.encryptionKey;

    bucket.addEventNotification(EventType.OBJECT_CREATED, new SqsDestination(queue), {
      prefix: this.prefixes.raw,
    });

    const sqsConsumerLambdaFn = this.createSQSConsumerLambda(scope, stateMachine, props, encryptionKey, queue);

    this.resources.sqsConsumerLambdaFunction = sqsConsumerLambdaFn;

    return this.resources;
  }

  private createSQSConsumerLambda(scope: Construct, stateMachine: StateMachine
    , props: BaseDocumentProcessingProps, encryptionKey: Key, queue: Queue): Function {
    const metricNamespace = props.metricNamespace || DefaultObservabilityConfig.DEFAULT_METRIC_NAMESPACE;
    const metricServiceName = props.metricServiceName || DefaultDocumentProcessingConfig.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME;

    const { region, account } = LambdaIamUtils.getStackInfo(scope);
    // Create logs permissions and get unique function name
    const logsPermissions = LambdaIamUtils.createLogsPermissions({
      scope,
      functionName: 'SQSConsumer',
      region,
      account,
      enableObservability: props.enableObservability,
    });

    // Create policy statements for SQS consumer Lambda
    const policyStatements = [
      ...logsPermissions.policyStatements,
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['states:StartExecution'],
        resources: [stateMachine.stateMachineArn],
      }),
    ];

    if (props.network) {
      policyStatements.push(LambdaIamUtils.generateLambdaVPCPermissions());
    }

    // Create IAM role for SQS consumer Lambda
    const sqsConsumerRole = new Role(scope, 'SQSConsumerRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        SQSConsumerExecutionPolicy: new PolicyDocument({
          statements: policyStatements,
        }),
      },
    });

    encryptionKey.grantEncryptDecrypt(sqsConsumerRole);

    // Create SQS consumer Lambda function
    const sqsConsumerLambda = new PythonFunction(scope, 'SQSConsumer', {
      functionName: logsPermissions.uniqueFunctionName,
      runtime: DefaultRuntimes.PYTHON,
      role: sqsConsumerRole,
      entry: path.join(__dirname, '/../resources/default-sqs-consumer'),
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn,
        RAW_PREFIX: this.prefixes.raw,
        ...PowertoolsConfig.generateDefaultLambdaConfig(props.enableObservability, metricNamespace, metricServiceName),
      },
      timeout: Duration.minutes(5),
      description: 'Consumes SQS messages and triggers Step Functions executions for document processing',
      environmentEncryption: encryptionKey,
      vpc: props.network ? props.network.vpc : undefined,
      vpcSubnets: props.network ? props.network.applicationSubnetSelection() : undefined,
    });

    // Add SQS event source to Lambda
    sqsConsumerLambda.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 10,
        maxBatchingWindow: Duration.seconds(5),
        reportBatchItemFailures: true,
      }),
    );

    return sqsConsumerLambda;
  }

  generateAdapterIAMPolicies(additionalIAMActions?: string[], narrowActions?: boolean): PolicyStatement[] {
    const bucket: Bucket = this.resources.bucket;

    const normalizedIAMActions = additionalIAMActions || [];

    const statements = [];
    if (!narrowActions) {
      statements.push(new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:CopyObject', 's3:DeleteObject', 's3:PutObject', ...normalizedIAMActions],
        resources: [`${bucket.bucketArn}/*`],
      }));

      if (bucket.encryptionKey) {
        statements.push(new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'kms:Encrypt',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*',
            'kms:Decrypt',
          ],
          resources: [bucket.encryptionKey.keyArn],
        }));
      }

    } else {
      statements.push(new PolicyStatement({
        effect: Effect.ALLOW,
        actions: normalizedIAMActions,
        resources: [`${bucket.bucketArn}/*`],
      }));
    }

    return statements;
  }

  createFailedChain(scope: Construct, idPrefix?: string): Chain {
    const bucket: Bucket = this.resources.bucket;
    const prefix = idPrefix ? `${idPrefix}-` : '';

    const failedChain = new CallAwsService(scope, `${prefix}CopyToFailed`, {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: JsonPath.stringAt('$.content.bucket'),
        CopySource: JsonPath.format('{}/{}', JsonPath.stringAt('$.content.bucket'), JsonPath.stringAt('$.content.key')),
        Key: JsonPath.format(`${this.prefixes.failed}{}/{}`, JsonPath.stringAt('$.documentId'), JsonPath.stringAt('$.content.filename')),
      },
      iamResources: [`${bucket.bucketArn}/*`],
      resultPath: JsonPath.DISCARD,
    }).next(
      new CallAwsService(scope, `${prefix}DeleteFromRaw`, {
        service: 's3',
        action: 'deleteObject',
        parameters: {
          Bucket: JsonPath.stringAt('$.content.bucket'),
          Key: JsonPath.stringAt('$.content.key'),
        },
        iamResources: [`${bucket.bucketArn}/*`],
        resultPath: JsonPath.DISCARD,
      }),
    );

    return failedChain;
  }

  createSuccessChain(scope: Construct, idPrefix?: string): Chain {
    const bucket: Bucket = this.resources.bucket;
    const prefix = idPrefix ? `${idPrefix}-` : '';

    const chain = new CallAwsService(scope, `${prefix}CopyToProcessed`, {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: JsonPath.stringAt('$.content.bucket'),
        CopySource: JsonPath.format('{}/{}', JsonPath.stringAt('$.content.bucket'), JsonPath.stringAt('$.content.key')),
        Key: JsonPath.format(`${this.prefixes.processed}{}/{}`, JsonPath.stringAt('$.documentId'), JsonPath.stringAt('$.content.filename')),
      },
      iamResources: [`${bucket.bucketArn}/*`],
      resultPath: JsonPath.DISCARD,
    }).next(
      new CallAwsService(scope, `${prefix}DeleteFromRawSuccess`, {
        service: 's3',
        action: 'deleteObject',
        parameters: {
          Bucket: JsonPath.stringAt('$.content.bucket'),
          Key: JsonPath.stringAt('$.content.key'),
        },
        iamResources: [`${bucket.bucketArn}/*`],
        resultPath: JsonPath.DISCARD,
      }),
    );

    return chain;
  }
}