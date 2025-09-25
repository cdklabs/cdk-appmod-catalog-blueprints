// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Duration, Stack } from 'aws-cdk-lib';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { Role, ServicePrincipal, PolicyStatement, PolicyDocument, Effect } from 'aws-cdk-lib/aws-iam';
import { Function, Architecture } from 'aws-cdk-lib/aws-lambda';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { BaseDocumentProcessing, BaseDocumentProcessingProps, DocumentProcessingStepType } from './base-document-processing';
import { DefaultRuntimes } from '../framework';
import { LambdaIamUtils } from '../utilities';
import { PowertoolsConfig } from '../utilities/observability/powertools-config';

/**
 * Configuration properties for BedrockDocumentProcessing construct.
 * Extends BaseDocumentProcessingProps with Bedrock-specific options.
 */
export interface BedrockDocumentProcessingProps extends BaseDocumentProcessingProps {
  /**
   * Bedrock foundation model for document classification step.
   * @default FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_7_SONNET_20250219_V1_0
   */
  readonly classificationModelId?: FoundationModelIdentifier;
  /**
   * Bedrock foundation model for document extraction step.
   * @default FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_7_SONNET_20250219_V1_0
   */
  readonly processingModelId?: FoundationModelIdentifier;
  /**
   * Custom prompt template for document classification.
   * Must include placeholder for document content.
   * @default DEFAULT_CLASSIFICATION_PROMPT
   */
  readonly classificationPrompt?: string;
  /**
   * Custom prompt template for document extraction.
   * Must include placeholder for document content and classification result.
   * @default DEFAULT_EXTRACTION_PROMPT
   */
  readonly processingPrompt?: string;
  /**
   * Optional Lambda function for document enrichment step.
   * If provided, will be invoked after extraction with workflow state.
   */
  readonly enrichmentLambdaFunction?: Function;
  /**
   * Optional Lambda function for post-processing step.
   * If provided, will be invoked after enrichment with workflow state.
   */
  readonly postProcessingLambdaFunction?: Function;
  /**
   * Timeout for individual Step Functions tasks (classification, extraction, etc.).
   * @default Duration.minutes(5)
   */
  readonly stepTimeouts?: Duration;
  /**
   * Enable cross-region inference for Bedrock models to improve availability and performance.
   * When enabled, uses inference profiles instead of direct model invocation.
   * @default false
   */
  readonly useCrossRegionInference?: boolean;
  /**
   * Prefix for cross-region inference configuration.
   * Only used when useCrossRegionInference is true.
   * @default BedrockCrossRegionInferencePrefix.US
   */
  readonly crossRegionInferencePrefix?: BedrockCrossRegionInferencePrefix;
}

/**
 * Cross-region inference prefix options for Bedrock models.
 * Used to configure inference profiles for improved availability and performance.
 */
export enum BedrockCrossRegionInferencePrefix {
  /** US-based cross-region inference profile */
  US = 'us',
  /** EU-based cross-region inference profile */
  EU = 'eu',
}

/**
 * Document processing workflow powered by Amazon Bedrock foundation models.
 *
 * Extends BaseDocumentProcessing to provide AI-powered document classification and extraction
 * using Amazon Bedrock foundation models. This implementation offers:
 *
 * ## Key Features
 * - **AI-Powered Classification**: Uses Claude 3.7 Sonnet (configurable) to classify document types
 * - **Intelligent Extraction**: Extracts structured data from documents using foundation models
 * - **Cross-Region Inference**: Optional support for improved availability via inference profiles
 * - **Flexible Processing**: Optional enrichment and post-processing Lambda functions
 * - **Cost Optimized**: Configurable timeouts and model selection for cost control
 *
 * ## Processing Workflow
 * S3 Upload → Classification (Bedrock) → Extraction (Bedrock) → [Enrichment] → [Post-Processing] → Results
 *
 * ## Default Models
 * - Classification: Claude 3.7 Sonnet (anthropic.claude-3-7-sonnet-20250219-v1:0)
 * - Extraction: Claude 3.7 Sonnet (anthropic.claude-3-7-sonnet-20250219-v1:0)
 *
 * ## Prompt Templates
 * The construct uses default prompts that can be customized:
 * - **Classification**: Analyzes document and returns JSON with documentClassification field
 * - **Extraction**: Uses classification result to extract entities in structured JSON format
 *
 * ## Cross-Region Inference
 * When enabled, uses Bedrock inference profiles for improved availability:
 * - US prefix: Routes to US-based regions for lower latency
 * - EU prefix: Routes to EU-based regions for data residency compliance
 */
export class BedrockDocumentProcessing extends BaseDocumentProcessing {

  protected static readonly DEFAULT_CLASSIFICATION_MODEL_ID: FoundationModelIdentifier
    = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_7_SONNET_20250219_V1_0;
  protected static readonly DEFAULT_PROCESSING_MODEL_ID: FoundationModelIdentifier
    = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_7_SONNET_20250219_V1_0;
  protected static readonly DEFAULT_CLASSIFICATION_PROMPT = `
  Analyze the document below, and classify the type of document it is (eg. INVOICE, IDENTITY_DOCUMENT, RECEIPT, etc). The result should be in JSON and should follow the following structure (only respond in JSON with the following structure and do not use markdown to indicate the json, just output plain old json with nothing else):

  {
      documentClassification: <CLASSIFICATION>
  }

  Attached document is as follows:

  `;

  protected static readonly DEFAULT_PROCESSING_PROMPT = `
  The document below has been classified as [ACTUAL_CLASSIFICATION]. Extract important entities from the document and return the result as JSON following the structure below (only respond in JSON with the following structure and do not use markdown to indicate the json, just output plain old json with nothing else):

  {
      documentClassification: <CLASSIFICATION>,
      result: {
        entities: [
            {
                type: <TYPE OF ENTITY>
                value: <VALUE OF ENTITY>
            },
            ...
        ]
      }
  }

  Attached document is as follows:

  `;

  /** Configuration properties specific to Bedrock document processing */
  protected readonly bedrockDocumentProcessingProps: BedrockDocumentProcessingProps;
  /** Cross-region inference prefix for Bedrock model routing */
  protected readonly crossRegionInferencePrefix: BedrockCrossRegionInferencePrefix;
  /** The Step Functions state machine that orchestrates the document processing workflow */
  readonly stateMachine: StateMachine;

  /**
   * Creates a new BedrockDocumentProcessing construct.
   *
   * Initializes the Bedrock-powered document processing pipeline with AI classification
   * and extraction capabilities. Creates Lambda functions with appropriate IAM roles
   * for Bedrock model invocation and S3 access.
   *
   * @param scope - The scope in which to define this construct
   * @param id - The scoped construct ID. Must be unique within the scope.
   * @param props - Configuration properties for the Bedrock document processing pipeline
   */
  constructor(scope: Construct, id: string, props: BedrockDocumentProcessingProps) {
    super(scope, id, props);
    if (props.network) {
      props.network.createServiceEndpoint('vpce-bedrock', InterfaceVpcEndpointAwsService.BEDROCK);
      props.network.createServiceEndpoint('vpce-bedrock-runtime', InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME);
    }

    this.bedrockDocumentProcessingProps = props;
    this.crossRegionInferencePrefix = props.crossRegionInferencePrefix || BedrockCrossRegionInferencePrefix.US;
    this.stateMachine = this.handleStateMachineCreation('bedrock-document-processing-workflow');
  }

  /**
   * Implements the document classification step using Amazon Bedrock.
   *
   * Creates a Lambda function that invokes the configured Bedrock model to classify
   * the document type. The function reads the document from S3 and sends it to
   * Bedrock with the classification prompt.
   *
   * @returns LambdaInvoke task configured for document classification
   */
  protected classificationStep(): DocumentProcessingStepType {
    const prompt = this.bedrockDocumentProcessingProps.classificationPrompt || BedrockDocumentProcessing.DEFAULT_CLASSIFICATION_PROMPT;
    const fmModel = this.bedrockDocumentProcessingProps.classificationModelId || BedrockDocumentProcessing.DEFAULT_CLASSIFICATION_MODEL_ID;
    const adjustedModelId = this.bedrockDocumentProcessingProps.useCrossRegionInference ? `${this.crossRegionInferencePrefix}.${fmModel.modelId}` : fmModel.modelId;
    const role = this.generateLambdaRoleForBedrock(fmModel, 'ClassificationLambdaRole');
    const { region, account } = Stack.of(this);
    const generatedLogPermissions = LambdaIamUtils.createLogsPermissions({
      account,
      functionName: 'bedrock-idp-classification',
      region,
      scope: this,
    });

    this.encryptionKey.grantEncryptDecrypt(role);

    if (this.bucketEncryptionKey) {
      this.bucketEncryptionKey.grantEncryptDecrypt(role);
    }

    const bedrockFunction = new PythonFunction(this, 'BedrockClassificationFunction', {
      functionName: generatedLogPermissions.uniqueFunctionName,
      architecture: Architecture.X86_64,
      runtime: DefaultRuntimes.PYTHON,
      entry: path.join(__dirname, 'resources/default-bedrock-invoke'),
      role,
      memorySize: 512,
      timeout: this.bedrockDocumentProcessingProps.stepTimeouts || Duration.minutes(5),
      environment: {
        MODEL_ID: adjustedModelId,
        PROMPT: prompt,
        INVOKE_TYPE: 'classification',
        ...PowertoolsConfig.generateDefaultLambdaConfig(
          this.bedrockDocumentProcessingProps.enableObservability,
          this.metricNamespace,
          this.metricServiceName,
        ),
      },
      environmentEncryption: this.encryptionKey,
      vpc: this.bedrockDocumentProcessingProps.network ? this.bedrockDocumentProcessingProps.network.vpc : undefined,
      vpcSubnets: this.bedrockDocumentProcessingProps.network ? this.bedrockDocumentProcessingProps.network.applicationSubnetSelection() : undefined,
    });

    for (const statement of generatedLogPermissions.policyStatements) {
      bedrockFunction.role?.addToPrincipalPolicy(statement);
    }

    if (this.bedrockDocumentProcessingProps.network) {
      bedrockFunction.role?.addToPrincipalPolicy(LambdaIamUtils.generateLambdaVPCPermissions());
    }

    return new LambdaInvoke(this, 'ClassificationStep', {
      lambdaFunction: bedrockFunction,
      resultPath: '$.classificationResult',
      resultSelector: {
        'documentClassification.$': '$.Payload.documentClassification',
      },
    });
  }

  /**
   * Implements the document extraction step using Amazon Bedrock.
   *
   * Creates a Lambda function that invokes the configured Bedrock model to extract
   * structured data from the document. Uses the classification result from the
   * previous step to provide context for more accurate extraction.
   *
   * @returns LambdaInvoke task configured for document extraction
   */
  protected processingStep(): DocumentProcessingStepType {
    const prompt = this.bedrockDocumentProcessingProps.processingPrompt || BedrockDocumentProcessing.DEFAULT_PROCESSING_PROMPT;
    const fmModel = this.bedrockDocumentProcessingProps.processingModelId || BedrockDocumentProcessing.DEFAULT_PROCESSING_MODEL_ID;
    const adjustedModelId = this.bedrockDocumentProcessingProps.useCrossRegionInference ? `${this.crossRegionInferencePrefix}.${fmModel.modelId}` : fmModel.modelId;
    const role = this.generateLambdaRoleForBedrock(fmModel, 'ProcessingLambdaRole');
    const { region, account } = Stack.of(this);

    const generatedLogPermissions = LambdaIamUtils.createLogsPermissions({
      account,
      functionName: 'bedrock-idp-processing',
      region,
      scope: this,
    });
    this.encryptionKey.grantEncryptDecrypt(role);
    if (this.bucketEncryptionKey) {
      this.bucketEncryptionKey.grantEncryptDecrypt(role);
    }
    const bedrockFunction = new PythonFunction(this, 'BedrockExtractionFunction', {
      functionName: generatedLogPermissions.uniqueFunctionName,
      runtime: DefaultRuntimes.PYTHON,
      architecture: Architecture.X86_64,
      entry: path.join(__dirname, 'resources/default-bedrock-invoke'),
      role,
      memorySize: 512,
      timeout: this.bedrockDocumentProcessingProps.stepTimeouts || Duration.minutes(5),
      environment: {
        MODEL_ID: adjustedModelId,
        PROMPT: prompt,
        INVOKE_TYPE: 'processing',
        ...PowertoolsConfig.generateDefaultLambdaConfig(
          this.bedrockDocumentProcessingProps.enableObservability,
          this.metricNamespace,
          this.metricServiceName,
        ),
      },
      environmentEncryption: this.encryptionKey,
      vpc: this.bedrockDocumentProcessingProps.network ? this.bedrockDocumentProcessingProps.network.vpc : undefined,
      vpcSubnets: this.bedrockDocumentProcessingProps.network ? this.bedrockDocumentProcessingProps.network.applicationSubnetSelection() : undefined,
    });

    for (const statement of generatedLogPermissions.policyStatements) {
      bedrockFunction.role?.addToPrincipalPolicy(statement);
    }

    if (this.bedrockDocumentProcessingProps.network) {
      bedrockFunction.role?.addToPrincipalPolicy(LambdaIamUtils.generateLambdaVPCPermissions());
    }

    return new LambdaInvoke(this, 'ProcessingStep', {
      lambdaFunction: bedrockFunction,
      resultPath: '$.processingResult',
      resultSelector: {
        'documentClassification.$': '$.Payload.documentClassification',
        'result.$': '$.Payload.result',
      },
    });
  }

  protected generateLambdaRoleForBedrock(fmModel: FoundationModelIdentifier, id: string) {
    const { region, account } = Stack.of(this);
    return new Role(this, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        BedrockInvokePolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject'],
              resources: [`${this.bucket.bucketArn}/*`],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
              ],
              resources: [
                `arn:aws:bedrock:*::foundation-model/${fmModel.modelId}`,
                `arn:aws:bedrock:${region}:${account}:inference-profile/${this.crossRegionInferencePrefix}.${fmModel.modelId}`,
              ],
            }),
          ],
        }),
      },
    });
  }

  /**
   * Implements the optional document enrichment step.
   *
   * If an enrichment Lambda function is provided in the props, creates a LambdaInvoke
   * task to perform additional processing on the extracted data. This step is useful
   * for data validation, transformation, or integration with external systems.
   *
   * @returns LambdaInvoke task for enrichment, or undefined to skip this step
   */
  protected enrichmentStep(): DocumentProcessingStepType | undefined {
    if (!this.bedrockDocumentProcessingProps.enrichmentLambdaFunction) {
      return undefined;
    }

    return new LambdaInvoke(this, 'EnrichmentStep', {
      lambdaFunction: this.bedrockDocumentProcessingProps.enrichmentLambdaFunction,
      resultPath: '$.enrichedResult',
    });
  }

  /**
   * Implements the optional post-processing step.
   *
   * If a post-processing Lambda function is provided in the props, creates a LambdaInvoke
   * task to perform final processing on the workflow results. This step is useful for
   * data formatting, notifications, or integration with downstream systems.
   *
   * @returns LambdaInvoke task for post-processing, or undefined to skip this step
   */
  protected postProcessingStep(): DocumentProcessingStepType | undefined {
    if (!this.bedrockDocumentProcessingProps.postProcessingLambdaFunction) {
      return undefined;
    }

    return new LambdaInvoke(this, 'PostProcessingStep', {
      lambdaFunction: this.bedrockDocumentProcessingProps.postProcessingLambdaFunction,
      resultPath: '$.postProcessedResult',
    });
  }
}