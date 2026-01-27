// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Duration, PropertyInjectors, RemovalPolicy } from 'aws-cdk-lib';
import { IMetric } from 'aws-cdk-lib/aws-cloudwatch';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { CustomerManagedEncryptionConfiguration, DefinitionBody, IChainable, JsonPath, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { BedrockInvokeModel, DynamoAttributeValue, DynamoPutItem, DynamoUpdateItem, LambdaInvoke, StepFunctionsStartExecution } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { IAdapter, QueuedS3Adapter } from './adapter';
import { DefaultDocumentProcessingConfig } from './default-document-processing-config';
import { Network } from '../framework';
import { EventbridgeBroker } from '../framework/foundation/eventbridge-broker';
import { LogGroupDataProtectionProps, LogGroupDataProtectionUtils } from '../utilities';
import { DefaultObservabilityConfig } from '../utilities/observability/default-observability-config';
import { LambdaObservabilityPropertyInjector } from '../utilities/observability/lambda-observability-property-injector';
import { IObservable, ObservableProps } from '../utilities/observability/observable';
import { StateMachineObservabilityPropertyInjector } from '../utilities/observability/state-machine-observability-property-injector';

/**
 * Configuration properties for BaseDocumentProcessing construct.
 */
export interface BaseDocumentProcessingProps extends ObservableProps {

  /**
   * Adapter that defines how the document processing workflow is triggered
   *
   * @default QueuedS3Adapter
   */
  readonly ingressAdapter?: IAdapter;

  /**
   * DynamoDB table for storing document processing metadata and workflow state.
   * If not provided, a new table will be created with DocumentId as partition key.
   */
  readonly documentProcessingTable?: Table;

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
  /** DynamoDB table for storing document processing metadata and workflow state */
  readonly documentProcessingTable: Table;
  /** Configuration properties for the document processing pipeline */
  private readonly props: BaseDocumentProcessingProps;
  /** KMS key */
  readonly encryptionKey: Key;
  /** Ingress adapter, responsible for triggering workflow */
  readonly ingressAdapter: IAdapter;

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
    this.ingressAdapter = props.ingressAdapter || new QueuedS3Adapter();

    if (props.network) {
      props.network.createServiceEndpoint('vpce-sfn', InterfaceVpcEndpointAwsService.STEP_FUNCTIONS);
      props.network.createServiceEndpoint('vpce-eb', InterfaceVpcEndpointAwsService.EVENTBRIDGE);
      if (props.enableObservability) {
        props.network.createServiceEndpoint('vpce-logs', InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS);
        props.network.createServiceEndpoint('vpce-metrics', InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING);
      }
    }

    this.ingressAdapter.init(this, props);

    this.encryptionKey = props.encryptionKey || new Key(this, 'IDPEncryptionKey', {
      enableKeyRotation: true,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
    });

    this.logGroupDataProtection = LogGroupDataProtectionUtils.handleDefault(this, props.logGroupDataProtection, props.removalPolicy);

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

    this.metricNamespace = props.metricNamespace || DefaultObservabilityConfig.DEFAULT_METRIC_NAMESPACE;
    this.metricServiceName = props.metricServiceName || DefaultDocumentProcessingConfig.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME;
  }


  protected handleStateMachineCreation(stateMachineId: string) {
    // Check if preprocessing is needed (e.g., for chunking large documents)
    const preprocessingStep = this.preprocessingStep();

    // Initialize metadata entry in DynamoDB
    // Base class only knows about core document fields
    const baseItem: Record<string, DynamoAttributeValue> = {
      DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
      ContentType: DynamoAttributeValue.fromString(JsonPath.stringAt('$.contentType')),
      Content: DynamoAttributeValue.fromString(JsonPath.jsonToString(JsonPath.objectAt('$.content'))),
      WorkflowStatus: DynamoAttributeValue.fromString('pending'),
      StateMachineExecId: DynamoAttributeValue.fromString(JsonPath.stringAt('$$.Execution.Id')),
    };

    // Allow concrete implementations to add preprocessing-specific metadata
    // This is a hook for subclasses to extend the schema without base class knowing the details
    const additionalMetadata = this.preprocessingMetadata();
    Object.assign(baseItem, additionalMetadata);

    const initMetadataEntry = new DynamoPutItem(this, 'InitMetadataEntry', {
      table: this.documentProcessingTable,
      item: baseItem,
      resultPath: JsonPath.DISCARD,
    });

    // Build workflow: if preprocessing exists, chain it before the main workflow
    let workflowDefinition: IChainable;
    if (preprocessingStep) {
      // Preprocessing → InitMetadata → Custom Processing Workflow
      workflowDefinition = preprocessingStep
        .next(initMetadataEntry)
        .next(this.createProcessingWorkflow());
    } else {
      // InitMetadata → Standard Processing Workflow (backward compatible)
      workflowDefinition = initMetadataEntry
        .next(this.createStandardProcessingWorkflow());
    }

    const role = this.createStateMachineRole();
    this.encryptionKey.grantEncryptDecrypt(role);

    const stateMachine = new StateMachine(this, stateMachineId, {
      definitionBody: DefinitionBody.fromChainable(workflowDefinition),
      timeout: this.props.workflowTimeout || Duration.minutes(15),
      role,
      encryptionConfiguration: new CustomerManagedEncryptionConfiguration(this.encryptionKey),
    });

    this.ingressAdapter.createIngressTrigger(this, stateMachine, this.props);

    return stateMachine;
  }

  private createStateMachineRole(): Role {
    return new Role(this, 'StateMachineRole', {
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        StateMachineExecutionPolicy: new PolicyDocument({
          statements: [
            ...this.ingressAdapter.generateAdapterIAMPolicies(),
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

  private createMoveToFailedChain(idPrefix?: string) {
    const failedChain = this.ingressAdapter.createFailedChain(this, idPrefix);

    if (this.props.eventbridgeBroker) {
      const ebChain = this.props.eventbridgeBroker.sendViaSfnChain(
        'document-processing-failed',
        {
          documentId: JsonPath.stringAt('$.documentId'),
          contentType: JsonPath.stringAt('$.contentType'),
          content: JsonPath.jsonToString(JsonPath.objectAt('$.content')),
        },
      );

      failedChain.next(ebChain);
    }

    return failedChain;
  }

  private createMoveToProcessedChain(idPrefix?: string) {
    const processedChain = this.ingressAdapter.createSuccessChain(this, idPrefix);

    if (this.props.eventbridgeBroker) {
      processedChain.next(
        this.props.eventbridgeBroker.sendViaSfnChain(
          'document-processed-successful',
          {
            documentId: JsonPath.stringAt('$.documentId'),
            contentType: JsonPath.stringAt('$.contentType'),
            content: JsonPath.jsonToString(JsonPath.objectAt('$.content')),
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
   * Defines the optional preprocessing step of the workflow.
   *
   * This step runs BEFORE Init Metadata and can be used for:
   * - Document chunking for large files
   * - Document validation
   * - Format conversion
   * - Any other preprocessing needed before classification
   *
   * Concrete implementations can return undefined to skip preprocessing,
   * maintaining backward compatibility with existing workflows.
   *
   * @returns Step Functions task for preprocessing, or undefined to skip this step
   */
  protected abstract preprocessingStep(): DocumentProcessingStepType | undefined;

  /**
   * Hook for concrete implementations to add preprocessing-specific metadata to DynamoDB.
   *
   * This method is called during InitMetadata creation and allows subclasses to extend
   * the DynamoDB schema with their own fields without the base class knowing the details.
   *
   * The base class provides the core document fields (DocumentId, ContentType, etc.),
   * and subclasses can add their own fields (e.g., chunking metadata) by overriding this method.
   *
   * @returns Record of additional DynamoDB attribute values to include in InitMetadata
   * @default {} (no additional metadata)
   */
  protected preprocessingMetadata(): Record<string, DynamoAttributeValue> {
    // Default: no additional metadata
    // Subclasses override this to add their own preprocessing-specific fields
    return {};
  }

  /**
   * Creates the processing workflow after preprocessing and initialization.
   *
   * Concrete implementations can customize this to handle preprocessing results.
   * For example, BedrockDocumentProcessing uses this to add conditional branching
   * for chunked vs non-chunked documents.
   *
   * Implementations can call `createStandardProcessingWorkflow()` to reuse the
   * standard processing flow (Classification → Processing → Enrichment → PostProcessing).
   *
   * @returns Step Functions chain for processing the document
   */
  protected abstract createProcessingWorkflow(): IChainable;

  /**
   * Creates the standard processing workflow (no preprocessing customization).
   *
   * This is the existing workflow: Classification → Processing → Enrichment → PostProcessing
   * Concrete classes can call this method to reuse the standard flow when they don't
   * need custom workflow branching.
   *
   * @param idPrefix Optional prefix for construct IDs to ensure uniqueness when called multiple times
   * @returns Step Functions chain for standard processing
   */
  protected createStandardProcessingWorkflow(idPrefix?: string): IChainable {
    const classificationStep = this.classificationStep();
    const processingStep = this.processingStep();
    const enrichmentStep = this.enrichmentStep();
    const postProcessingStep = this.postProcessingStep();

    // File movement operations
    const moveToFailed = this.createMoveToFailedChain(idPrefix);
    const moveToProcessed = this.createMoveToProcessedChain(idPrefix);

    const prefix = idPrefix ? `${idPrefix}-` : '';

    const processingChain = processingStep
      .addCatch(new DynamoUpdateItem(this, `${prefix}ProcessingFailDDBUpdate`, {
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
        new DynamoUpdateItem(this, `${prefix}ProcessingSuccessUpdate`, {
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
        .addCatch(new DynamoUpdateItem(this, `${prefix}EnrichmentFailDDBUpdate`, {
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
          new DynamoUpdateItem(this, `${prefix}EnrichmentSuccessUpdate`, {
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
          .addCatch(new DynamoUpdateItem(this, `${prefix}PostProcessingFailDDBUpdate`, {
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
            new DynamoUpdateItem(this, `${prefix}PostProcessingSuccessUpdate`, {
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
        .addCatch(new DynamoUpdateItem(this, `${prefix}PostProcessingFailDDBUpdate2`, {
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
          new DynamoUpdateItem(this, `${prefix}PostProcessingSuccessUpdate2`, {
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
        new DynamoUpdateItem(this, `${prefix}WorkflowCompleteUpdate`, {
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

    const classificationChain = classificationStep
      .addCatch(new DynamoUpdateItem(this, `${prefix}ClassificationFailDDBUpdate`, {
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
        new DynamoUpdateItem(this, `${prefix}ClassificationSuccessUpdate`, {
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
      )
      .next(processingChain);

    return classificationChain;
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
