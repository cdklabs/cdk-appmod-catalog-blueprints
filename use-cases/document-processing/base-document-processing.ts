// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'node:path';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Duration, Names, PropertyInjectors, RemovalPolicy } from 'aws-cdk-lib';
import { IMetric } from 'aws-cdk-lib/aws-cloudwatch';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket, BucketEncryption, EventType } from 'aws-cdk-lib/aws-s3';
import { SqsDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { CustomerManagedEncryptionConfiguration, DefinitionBody, JsonPath, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { BedrockInvokeModel, DynamoAttributeValue, DynamoPutItem, DynamoUpdateItem, LambdaInvoke, CallAwsService, StepFunctionsStartExecution } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { DefaultRuntimes, Network } from '../framework';
import { EventbridgeBroker } from '../framework/foundation/eventbridge-broker';
import { LambdaIamUtils, LogGroupDataProtectionProps } from '../utilities';
import { LambdaObservabilityPropertyInjector } from '../utilities/observability/lambda-observability-property-injector';
import { IObservable, ObservableProps } from '../utilities/observability/observable';
import { PowertoolsConfig } from '../utilities/observability/powertools-config';
import { StateMachineObservabilityPropertyInjector } from '../utilities/observability/state-machine-observability-property-injector';

/**
 * Configuration properties for BaseDocumentProcessing construct.
 */
export interface BaseDocumentProcessingProps extends ObservableProps {
  /**
   * S3 bucket for document storage with organized prefixes (raw/, processed/, failed/).
   * If not provided, a new bucket will be created with auto-delete enabled based on removalPolicy.
   */
  readonly bucket?: Bucket;
  /**
   * DynamoDB table for storing document processing metadata and workflow state.
   * If not provided, a new table will be created with DocumentId as partition key.
   */
  readonly documentProcessingTable?: Table;
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

  /**
   * Maximum execution time for the Step Functions workflow.
   * @default Duration.minutes(30)
   */
  readonly workflowTimeout?: Duration;
  /**
   * Removal policy for created resources (bucket, table, queue).
   * @default RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: RemovalPolicy;
  /**
   * Optional EventBridge broker for publishing custom events during processing.
   * If not provided, no custom events will be sent out.
   */
  readonly eventbridgeBroker?: EventbridgeBroker;

  /**
   * Enable logging and tracing for all supporting resource
   * @default false
   */
  readonly enableObservability?: boolean;

  /**
   * Resources that can run inside a VPC will follow the provided network configuration
   * @default resources will run outside of a VPC
   */
  readonly network?: Network;

  /**
   * KMS key to be used.
   * @default A new key would be created
   */
  readonly encryptionKey?: Key;
}

/**
 * S3 prefix constants for organizing documents throughout the processing lifecycle.
 *
 * Documents flow through these prefixes based on processing outcomes:
 * - Upload → raw/ (triggers processing)
 * - Success → processed/ (workflow completed successfully)
 * - Failure → failed/ (workflow encountered errors)
 */
export enum DocumentProcessingPrefix {
  /** Prefix for newly uploaded documents awaiting processing */
  RAW = 'raw/',
  /** Prefix for documents that failed processing */
  FAILED = 'failed/',
  /** Prefix for successfully processed documents */
  PROCESSED = 'processed/',
}

/**
 * Union type for Step Functions tasks that can be used in document processing workflows.
 * Supports Bedrock model invocation, Lambda function invocation, and nested Step Functions execution.
 */
export type DocumentProcessingStepType = BedrockInvokeModel | LambdaInvoke | StepFunctionsStartExecution;

/**
 * Abstract base class for serverless document processing workflows.
 *
 * Provides a complete document processing pipeline with:
 * - **S3 Storage**: Organized with prefixes (raw/, processed/, failed/) for document lifecycle management
 * - **SQS Queue**: Reliable message processing with configurable visibility timeout and dead letter queue
 * - **DynamoDB Table**: Workflow metadata tracking with DocumentId as partition key
 * - **Step Functions**: Orchestrated workflow with automatic file movement based on processing outcome
 * - **Auto-triggering**: S3 event notifications automatically start processing when files are uploaded to raw/ prefix
 * - **Error Handling**: Failed documents are moved to failed/ prefix with error details stored in DynamoDB
 * - **EventBridge Integration**: Optional custom event publishing for workflow state changes
 *
 * ## Architecture Flow
 * S3 Upload (raw/) → SQS → Lambda Consumer → Step Functions → Processing Steps → S3 (processed/failed/)
 *
 * ## Implementation Requirements
 * Subclasses must implement four abstract methods to define the processing workflow:
 * - `classificationStep()`: Document type classification
 * - `extractionStep()`: Data extraction from documents
 * - `enrichmentStep()`: Optional data enrichment (return undefined to skip)
 * - `postProcessingStep()`: Optional post-processing (return undefined to skip)
 */
export abstract class BaseDocumentProcessing extends Construct implements IObservable {
  /** Business metric service name. This is part of the initial service dimension */
  readonly metricServiceName: string;
  /** Business metric namespace. */
  readonly metricNamespace: string;
  /** log group data protection configuration */
  readonly logGroupDataProtection: LogGroupDataProtectionProps;
  /** S3 bucket for document storage with organized prefixes (raw/, processed/, failed/) */
  readonly bucket: Bucket;
  /** SQS queue for reliable message processing with dead letter queue support */
  readonly queue: Queue;
  /** DynamoDB table for storing document processing metadata and workflow state */
  readonly documentProcessingTable: Table;
  /** Configuration properties for the document processing pipeline */
  private readonly props: BaseDocumentProcessingProps;
  /** Dead letter queue  */
  readonly deadLetterQueue: Queue;
  /** KMS key */
  readonly encryptionKey: Key;
  /** Encryption key used by the DocumentProcessingBucket */
  readonly bucketEncryptionKey?: IKey;

  /**
   * Creates a new BaseDocumentProcessing construct.
   *
   * Initializes the complete document processing infrastructure including S3 bucket,
   * SQS queue, DynamoDB table, and sets up S3 event notifications to trigger processing.
   *
   * @param scope - The scope in which to define this construct
   * @param id - The scoped construct ID. Must be unique within the scope.
   * @param props - Configuration properties for the document processing pipeline
   */
  constructor(scope: Construct, id: string, props: BaseDocumentProcessingProps) {
    super(scope, id);
    this.props = props;
    if (props.network) {
      props.network.createServiceEndpoint('vpce-sqs', InterfaceVpcEndpointAwsService.SQS);
      props.network.createServiceEndpoint('vpce-s3', InterfaceVpcEndpointAwsService.S3);
      props.network.createServiceEndpoint('vpce-sfn', InterfaceVpcEndpointAwsService.STEP_FUNCTIONS);
      props.network.createServiceEndpoint('vpce-eb', InterfaceVpcEndpointAwsService.EVENTBRIDGE);
      if (props.enableObservability) {
        props.network.createServiceEndpoint('vpce-logs', InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS);
        props.network.createServiceEndpoint('vpce-metrics', InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING);
      }
    }

    this.encryptionKey = props.encryptionKey || new Key(this, 'IDPEncryptionKey', {
      enableKeyRotation: true,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
    });

    const bucketName = `documentprocessingbucket-${Names.uniqueResourceName(this, {
      maxLength: 60 - 'documentprocessingbucket-'.length,
    })}`.toLowerCase();

    const bucketArn = `arn:aws:s3:::${bucketName}`;

    this.encryptionKey.grantEncryptDecrypt(new ServicePrincipal('s3.amazonaws.com', {
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:s3:arn': bucketArn,
        },
      },
    }));

    this.bucket = props.bucket || new Bucket(this, 'DocumentProcessingBucket', {
      bucketName,
      autoDeleteObjects: (props.removalPolicy && props.removalPolicy === RemovalPolicy.DESTROY) || !props.removalPolicy ? true : false,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      encryption: BucketEncryption.KMS,
      enforceSSL: true,
      bucketKeyEnabled: true,
    });


    this.bucketEncryptionKey = this.bucket.encryptionKey;

    const tempLogGroupDataProtection = props.logGroupDataProtection || {
      logGroupEncryptionKey: new Key(this, 'LogGroupEncryptionKey', {
        enableKeyRotation: true,
        removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      }),
    };

    if (!tempLogGroupDataProtection.logGroupEncryptionKey) {
      this.logGroupDataProtection = {
        dataProtectionIdentifiers: tempLogGroupDataProtection.dataProtectionIdentifiers,
        logGroupEncryptionKey: new Key(this, 'LogGroupEncryptionKey', {
          enableKeyRotation: true,
          removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
        }),
      };
    } else {
      this.logGroupDataProtection = tempLogGroupDataProtection;
    }

    this.deadLetterQueue = new Queue(this, 'DocumentProcessingDLQ', {
      visibilityTimeout: props.queueVisibilityTimeout || Duration.seconds(300),
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      enforceSSL: true,
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: this.encryptionKey,
    });

    this.queue = new Queue(this, 'DocumentProcessingQueue', {
      visibilityTimeout: props.queueVisibilityTimeout || Duration.seconds(300),
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      enforceSSL: true,
      deadLetterQueue: {
        maxReceiveCount: props.dlqMaxReceiveCount || 5,
        queue: this.deadLetterQueue,
      },
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: this.encryptionKey,
    });

    this.documentProcessingTable = props.documentProcessingTable || new Table(this, 'DocumentProcessingTable', {
      partitionKey: {
        name: 'DocumentId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.encryptionKey,
    });

    if (props.enableObservability) {
      PropertyInjectors.of(this).add(
        new StateMachineObservabilityPropertyInjector(this.logGroupDataProtection),
        new LambdaObservabilityPropertyInjector(this.logGroupDataProtection),
      );
    }

    this.metricNamespace = props.metricNamespace || 'appmod-catalog';
    this.metricServiceName = props.metricServiceName || 'document-processing';
  }


  protected handleStateMachineCreation(stateMachineId: string) {
    const classificationStep = this.classificationStep();
    const processingStep = this.processingStep();
    const enrichmentStep = this.enrichmentStep();
    const postProcessingStep = this.postProcessingStep();

    const initMetadataEntry = new DynamoPutItem(this, 'InitMetadataEntry', {
      table: this.documentProcessingTable,
      item: {
        DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
        Bucket: DynamoAttributeValue.fromString(JsonPath.stringAt('$.bucket')),
        Key: DynamoAttributeValue.fromString(JsonPath.stringAt('$.key')),
        WorkflowStatus: DynamoAttributeValue.fromString('pending'),
        StateMachineExecId: DynamoAttributeValue.fromString(JsonPath.stringAt('$$.Execution.Id')),
      },
      resultPath: JsonPath.DISCARD,
    });

    // File movement operations
    const moveToFailed = this.createMoveToFailedChain();
    const moveToProcessed = this.createMoveToProcessedChain();

    const processingChain = processingStep
      .addCatch(new DynamoUpdateItem(this, 'ProcessingFailDDBUpdate', {
        table: this.documentProcessingTable,
        key: {
          DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
        },
        updateExpression: 'SET WorkflowStatus = :newStatus',
        expressionAttributeValues: {
          ':newStatus': DynamoAttributeValue.fromString('processing-failure'),
        },
        resultPath: JsonPath.DISCARD,
      }).next(moveToFailed), {
        resultPath: JsonPath.DISCARD,
      })
      .next(
        new DynamoUpdateItem(this, 'ProcessingSuccessUpdate', {
          table: this.documentProcessingTable,
          key: {
            DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
          },
          updateExpression: 'SET WorkflowStatus = :newStatus, ProcessingResult = :processingResult',
          expressionAttributeValues: {
            ':newStatus': DynamoAttributeValue.fromString('processing-complete'),
            ':processingResult': DynamoAttributeValue.fromString(JsonPath.jsonToString(JsonPath.objectAt('$.processingResult'))),
          },
          resultPath: JsonPath.DISCARD,
        }),
      );

    // Build the complete chain including optional steps
    if (enrichmentStep) {
      const enrichmentChain = enrichmentStep
        .addCatch(new DynamoUpdateItem(this, 'EnrichmentFailDDBUpdate', {
          table: this.documentProcessingTable,
          key: {
            DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
          },
          updateExpression: 'SET WorkflowStatus = :newStatus',
          expressionAttributeValues: {
            ':newStatus': DynamoAttributeValue.fromString('enrichment-failure'),
          },
          resultPath: JsonPath.DISCARD,
        }).next(moveToFailed), {
          resultPath: JsonPath.DISCARD,
        })
        .next(
          new DynamoUpdateItem(this, 'EnrichmentSuccessUpdate', {
            table: this.documentProcessingTable,
            key: {
              DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
            },
            updateExpression: 'SET WorkflowStatus = :newStatus, EnrichmentResult = :enrichmentResult',
            expressionAttributeValues: {
              ':newStatus': postProcessingStep ? DynamoAttributeValue.fromString('enrichment-complete') : DynamoAttributeValue.fromString('complete'),
              ':enrichmentResult': DynamoAttributeValue.fromString(JsonPath.jsonToString(JsonPath.objectAt('$.enrichedResult'))),
            },
            resultPath: JsonPath.DISCARD,
          }),
        );

      processingChain.next(enrichmentChain);

      if (postProcessingStep) {
        const postProcessingChain = postProcessingStep
          .addCatch(new DynamoUpdateItem(this, 'PostProcessingFailDDBUpdate', {
            table: this.documentProcessingTable,
            key: {
              DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
            },
            updateExpression: 'SET WorkflowStatus = :newStatus',
            expressionAttributeValues: {
              ':newStatus': DynamoAttributeValue.fromString('post-processing-failure'),
            },
            resultPath: JsonPath.DISCARD,
          }).next(moveToFailed), {
            resultPath: JsonPath.DISCARD,
          })
          .next(
            new DynamoUpdateItem(this, 'PostProcessingSuccessUpdate', {
              table: this.documentProcessingTable,
              key: {
                DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
              },
              updateExpression: 'SET WorkflowStatus = :newStatus, PostProcessingResult = :postProcessingResult',
              expressionAttributeValues: {
                ':newStatus': DynamoAttributeValue.fromString('complete'),
                ':postProcessingResult': DynamoAttributeValue.fromString(JsonPath.jsonToString(JsonPath.objectAt('$.postProcessedResult'))),
              },
              resultPath: JsonPath.DISCARD,
            }).next(moveToProcessed),
          );
        enrichmentChain.next(postProcessingChain);
      } else {
        enrichmentChain.next(moveToProcessed);
      }
    } else if (postProcessingStep) {
      const postProcessingChain = postProcessingStep
        .addCatch(new DynamoUpdateItem(this, 'PostProcessingFailDDBUpdate', {
          table: this.documentProcessingTable,
          key: {
            DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
          },
          updateExpression: 'SET WorkflowStatus = :newStatus',
          expressionAttributeValues: {
            ':newStatus': DynamoAttributeValue.fromString('post-processing-failure'),
          },
          resultPath: JsonPath.DISCARD,
        }).next(moveToFailed), {
          resultPath: JsonPath.DISCARD,
        })
        .next(
          new DynamoUpdateItem(this, 'PostProcessingSuccessUpdate', {
            table: this.documentProcessingTable,
            key: {
              DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
            },
            updateExpression: 'SET WorkflowStatus = :newStatus, PostProcessingResult = :postProcessingResult',
            expressionAttributeValues: {
              ':newStatus': DynamoAttributeValue.fromString('complete'),
              ':postProcessingResult': DynamoAttributeValue.fromString(JsonPath.jsonToString(JsonPath.objectAt('$.postProcessedResult'))),
            },
            resultPath: JsonPath.DISCARD,
          }).next(moveToProcessed),
        );
      processingChain.next(postProcessingChain);
    } else {
      // No optional steps - mark as complete after extraction
      processingChain.next(
        new DynamoUpdateItem(this, 'WorkflowCompleteUpdate', {
          table: this.documentProcessingTable,
          key: {
            DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
          },
          updateExpression: 'SET WorkflowStatus = :newStatus',
          expressionAttributeValues: {
            ':newStatus': DynamoAttributeValue.fromString('complete'),
          },
          resultPath: JsonPath.DISCARD,
        }).next(moveToProcessed),
      );
    }

    const workflowDefinition = initMetadataEntry.next(
      classificationStep
        .addCatch(new DynamoUpdateItem(this, 'ClassificationFailDDBUpdate', {
          table: this.documentProcessingTable,
          key: {
            DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
          },
          updateExpression: 'SET WorkflowStatus = :newStatus',
          expressionAttributeValues: {
            ':newStatus': DynamoAttributeValue.fromString('classification-failure'),
          },
          resultPath: JsonPath.DISCARD,
        }).next(moveToFailed), {
          resultPath: JsonPath.DISCARD,
        })
        .next(
          new DynamoUpdateItem(this, 'ClassificationSuccessUpdate', {
            table: this.documentProcessingTable,
            key: {
              DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
            },
            updateExpression: 'SET WorkflowStatus = :newStatus, ClassificationResult = :classificationResult',
            expressionAttributeValues: {
              ':newStatus': DynamoAttributeValue.fromString('classification-complete'),
              ':classificationResult': DynamoAttributeValue.fromString(JsonPath.jsonToString(JsonPath.objectAt('$.classificationResult'))),
            },
            resultPath: JsonPath.DISCARD,
          }),
        ),
    ).next(processingChain);

    const role = this.createStateMachineRole();
    this.encryptionKey.grantEncryptDecrypt(role);
    if (this.bucketEncryptionKey) {
      this.bucketEncryptionKey.grantEncryptDecrypt(role);
    }
    const stateMachine = new StateMachine(this, stateMachineId, {
      definitionBody: DefinitionBody.fromChainable(workflowDefinition),
      timeout: this.props.workflowTimeout || Duration.minutes(15),
      role,
      encryptionConfiguration: new CustomerManagedEncryptionConfiguration(this.encryptionKey),
    });

    this.handleWorkflowTrigger(stateMachine);

    return stateMachine;
  }

  protected handleWorkflowTrigger(stateMachine: StateMachine) {
    this.bucket.addEventNotification(EventType.OBJECT_CREATED, new SqsDestination(this.queue), {
      prefix: DocumentProcessingPrefix.RAW,
    });
    this.createSQSConsumerLambda(stateMachine);
  }

  private createSQSConsumerLambda(stateMachine: StateMachine): Function {
    const { region, account } = LambdaIamUtils.getStackInfo(this);
    // Create logs permissions and get unique function name
    const logsPermissions = LambdaIamUtils.createLogsPermissions({
      scope: this,
      functionName: 'SQSConsumer',
      region,
      account,
      enableObservability: this.props.enableObservability,
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

    if (this.props.network) {
      policyStatements.push(LambdaIamUtils.generateLambdaVPCPermissions());
    }

    // Create IAM role for SQS consumer Lambda
    const sqsConsumerRole = new Role(this, 'SQSConsumerRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        SQSConsumerExecutionPolicy: new PolicyDocument({
          statements: policyStatements,
        }),
      },
    });

    this.encryptionKey.grantEncryptDecrypt(sqsConsumerRole);

    // Create SQS consumer Lambda function
    const sqsConsumerLambda = new PythonFunction(this, 'SQSConsumer', {
      functionName: logsPermissions.uniqueFunctionName,
      runtime: DefaultRuntimes.PYTHON,
      role: sqsConsumerRole,
      entry: path.join(__dirname, '/resources/default-sqs-consumer'),
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn,
        ...PowertoolsConfig.generateDefaultLambdaConfig(this.props.enableObservability, this.metricNamespace, this.metricServiceName),
      },
      timeout: Duration.minutes(5),
      description: 'Consumes SQS messages and triggers Step Functions executions for document processing',
      environmentEncryption: this.encryptionKey,
      vpc: this.props.network ? this.props.network.vpc : undefined,
      vpcSubnets: this.props.network ? this.props.network.applicationSubnetSelection() : undefined,
    });

    // Add SQS event source to Lambda
    sqsConsumerLambda.addEventSource(
      new SqsEventSource(this.queue, {
        batchSize: 10,
        maxBatchingWindow: Duration.seconds(5),
        reportBatchItemFailures: true,
      }),
    );

    return sqsConsumerLambda;
  }

  private createStateMachineRole(): Role {
    return new Role(this, 'StateMachineRole', {
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        StateMachineExecutionPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject', 's3:CopyObject', 's3:DeleteObject', 's3:PutObject'],
              resources: [`${this.bucket.bucketArn}/*`],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem'],
              resources: [this.documentProcessingTable.tableArn],
            }),
          ],
        }),
      },
    });
  }

  private createMoveToFailedChain() {
    const failedChain = new CallAwsService(this, 'CopyToFailed', {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: JsonPath.stringAt('$.bucket'),
        CopySource: JsonPath.format('{}/{}', JsonPath.stringAt('$.bucket'), JsonPath.stringAt('$.key')),
        Key: JsonPath.format('failed/{}', JsonPath.stringAt('$.filename')),
      },
      iamResources: [`${this.bucket.bucketArn}/*`],
      resultPath: JsonPath.DISCARD,
    }).next(
      new CallAwsService(this, 'DeleteFromRaw', {
        service: 's3',
        action: 'deleteObject',
        parameters: {
          Bucket: JsonPath.stringAt('$.bucket'),
          Key: JsonPath.stringAt('$.key'),
        },
        iamResources: [`${this.bucket.bucketArn}/*`],
        resultPath: JsonPath.DISCARD,
      }),
    );

    if (this.props.eventbridgeBroker) {
      failedChain.next(
        this.props.eventbridgeBroker.sendViaSfnChain(
          'document-processing-failed',
          {
            documentId: JsonPath.stringAt('$.documentId'),
            bucket: JsonPath.stringAt('$.bucket'),
            filename: JsonPath.stringAt('$.filename'),
          },
        ),
      );
    }

    return failedChain;
  }

  private createMoveToProcessedChain() {
    const processedChain = new CallAwsService(this, 'CopyToProcessed', {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: JsonPath.stringAt('$.bucket'),
        CopySource: JsonPath.format('{}/{}', JsonPath.stringAt('$.bucket'), JsonPath.stringAt('$.key')),
        Key: JsonPath.format('processed/{}', JsonPath.stringAt('$.filename')),
      },
      iamResources: [`${this.bucket.bucketArn}/*`],
      resultPath: JsonPath.DISCARD,
    }).next(
      new CallAwsService(this, 'DeleteFromRawSuccess', {
        service: 's3',
        action: 'deleteObject',
        parameters: {
          Bucket: JsonPath.stringAt('$.bucket'),
          Key: JsonPath.stringAt('$.key'),
        },
        iamResources: [`${this.bucket.bucketArn}/*`],
        resultPath: JsonPath.DISCARD,
      }),
    );

    if (this.props.eventbridgeBroker) {
      processedChain.next(
        this.props.eventbridgeBroker.sendViaSfnChain(
          'document-processed-successful',
          {
            documentId: JsonPath.stringAt('$.documentId'),
            bucket: JsonPath.stringAt('$.bucket'),
            filename: JsonPath.stringAt('$.filename'),
            classification: JsonPath.stringAt('$.classificationResult.documentClassification'),
          },
        ),
      );
    }

    return processedChain;
  }

  public metrics(): IMetric[] {
    return [];
  }

  /**
   * Defines the document classification step of the workflow.
   *
   * **CRITICAL**: Must set `outputPath` to preserve workflow state for subsequent steps.
   * The classification result should be available at `$.classificationResult` for DynamoDB storage.
   *
   * @returns Step Functions task for document classification
   */
  protected abstract classificationStep(): DocumentProcessingStepType;

  /**
   * Defines the document processing step of the workflow.
   *
   * **CRITICAL**: Must set `outputPath` to preserve workflow state for subsequent steps.
   * The extraction result should be available at `$.processingResult` for DynamoDB storage.
   *
   * @returns Step Functions task for document extraction
   */
  protected abstract processingStep(): DocumentProcessingStepType;

  /**
   * Defines the optional document enrichment step of the workflow.
   *
   * **CRITICAL**: If implemented, must set `outputPath` to preserve workflow state.
   * The enrichment result should be available at `$.enrichedResult` for DynamoDB storage.
   *
   * @returns Step Functions task for document enrichment, or undefined to skip this step
   */
  protected abstract enrichmentStep(): DocumentProcessingStepType | undefined;

  /**
   * Defines the optional post-processing step of the workflow.
   *
   * **CRITICAL**: If implemented, must set `outputPath` to preserve workflow state.
   * The post-processing result should be available at `$.postProcessedResult` for DynamoDB storage.
   *
   * @returns Step Functions task for post-processing, or undefined to skip this step
   */
  protected abstract postProcessingStep(): DocumentProcessingStepType | undefined;
}
