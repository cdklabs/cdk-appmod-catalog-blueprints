// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Duration, Stack } from 'aws-cdk-lib';
import { InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { Role, ServicePrincipal, PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { Function, Architecture } from 'aws-cdk-lib/aws-lambda';
import { IChainable, Choice, Condition, Map, JsonPath, TaskInput, Pass } from 'aws-cdk-lib/aws-stepfunctions';
import { DynamoAttributeValue, DynamoUpdateItem, LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { BaseDocumentProcessing, BaseDocumentProcessingProps, DocumentProcessingStepType } from './base-document-processing';
import { ChunkingConfig } from './chunking-config';
import { DefaultRuntimes } from '../framework';
import { BedrockModelProps, BedrockModelUtils } from '../framework/bedrock';
import { LambdaIamUtils } from '../utilities';
import { PowertoolsConfig } from '../utilities/observability/powertools-config';

/**
 * Configuration properties for BedrockDocumentProcessing construct.
 * Extends BaseDocumentProcessingProps with Bedrock-specific options.
 */
export interface BedrockDocumentProcessingProps extends BaseDocumentProcessingProps {
  /**
   * Bedrock foundation model for document classification step.
   */
  readonly classificationBedrockModel?: BedrockModelProps;

  /**
   * Bedrock foundation model for document extraction step.
   */
  readonly processingBedrockModel?: BedrockModelProps;
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
   * Custom prompt template for aggregating results from multiple chunks.
   * Used when chunking is enabled to merge processing results from all chunks
   * into a single coherent result.
   *
   * The prompt receives the concatenated processing results from all chunks
   * and should instruct the model to synthesize them into a unified output.
   *
   * @default DEFAULT_AGGREGATION_PROMPT
   */
  readonly aggregationPrompt?: string;

  /**
   * Enable PDF chunking for large documents.
   *
   * When enabled, documents exceeding configured thresholds will be automatically
   * split into chunks, processed in parallel or sequentially, and results aggregated.
   *
   * This feature is useful for:
   * - Processing large PDFs (>100 pages)
   * - Handling documents that exceed Bedrock token limits (~200K tokens)
   * - Improving processing reliability for complex documents
   * - Processing documents with variable content density
   *
   * The chunking workflow:
   * 1. Analyzes PDF to determine page count and estimate token count
   * 2. Decides if chunking is needed based on configured thresholds
   * 3. If chunking is needed, splits PDF into chunks and uploads to S3
   * 4. Processes each chunk through classification and extraction
   * 5. Aggregates results using majority voting for classification
   * 6. Deduplicates entities across chunks
   * 7. Cleans up temporary chunk files from S3
   *
   * @default false
   */
  readonly enableChunking?: boolean;

  /**
   * Configuration for PDF chunking behavior.
   *
   * Only applies when `enableChunking` is true. Allows customization of:
   * - **Chunking strategy**: How documents are split (fixed-pages, token-based, or hybrid)
   * - **Thresholds**: When to trigger chunking based on page count or token count
   * - **Chunk size and overlap**: Control chunk boundaries and context preservation
   * - **Processing mode**: Parallel (faster) or sequential (cost-optimized)
   * - **Aggregation strategy**: How to combine results from multiple chunks
   *
   * ## Default Configuration
   *
   * If not provided, uses sensible defaults optimized for most use cases:
   * - Strategy: `'hybrid'` (recommended - balances token and page limits)
   * - Page threshold: 100 pages
   * - Token threshold: 150,000 tokens
   * - Processing mode: `'parallel'`
   * - Max concurrency: 10
   * - Aggregation strategy: `'majority-vote'`
   *
   * ## Strategy Comparison
   *
   * | Strategy | Best For | Pros | Cons |
   * |----------|----------|------|------|
   * | `hybrid` | Most documents | Balances token/page limits | Slightly more complex |
   * | `token-based` | Variable density | Respects model limits | Slower analysis |
   * | `fixed-pages` | Uniform density | Simple, fast | May exceed token limits |
   *
   * @default undefined (uses default configuration when enableChunking is true)
   *
   * @see {@link ChunkingConfig} for detailed configuration options
   */
  readonly chunkingConfig?: ChunkingConfig;
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

  protected static readonly DEFAULT_AGGREGATION_PROMPT = `
  You are given the processing results from multiple chunks of a large document that was split for processing.
  Your task is to synthesize these chunk results into a single, coherent final result.

  Instructions:
  1. Review all the chunk results provided below
  2. Merge and deduplicate any overlapping information (chunks may have overlapping pages)
  3. Synthesize the information into a unified, coherent result
  4. Maintain the same output format as the individual chunk results
  5. If the chunks contain summaries, create a comprehensive summary that covers all sections
  6. If the chunks contain entities, deduplicate and consolidate them
  7. Preserve important details from each chunk while avoiding redundancy

  Return the result as JSON (only respond in JSON without markdown formatting):

  {
      "result": <SYNTHESIZED_RESULT>
  }

  The chunk results to aggregate are as follows:

  `;

  /** Configuration properties specific to Bedrock document processing */
  protected readonly bedrockDocumentProcessingProps: BedrockDocumentProcessingProps;
  /** The Step Functions state machine that orchestrates the document processing workflow */
  readonly stateMachine;
  /** Cached classification Lambda function to avoid duplicate resource creation */
  private _classificationFunction?: Function;
  /** Cached processing Lambda function to avoid duplicate resource creation */
  private _processingFunction?: Function;
  /** Counter for generating unique classification step IDs */
  private _classificationStepCounter = 0;
  /** Counter for generating unique processing step IDs */
  private _processingStepCounter = 0;
  /** Cached aggregation Lambda function to avoid duplicate resource creation */
  private _aggregationFunction?: Function;
  /** Counter for generating unique aggregation step IDs */
  private _aggregationStepCounter = 0;
  /** Cached cleanup Lambda function to avoid duplicate resource creation */
  private _cleanupFunction?: Function;
  /** Counter for generating unique enrichment step IDs */
  private _enrichmentStepCounter = 0;
  /** Counter for generating unique post-processing step IDs */
  private _postProcessingStepCounter = 0;


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
   * @throws Error if chunking configuration is invalid
   */
  constructor(scope: Construct, id: string, props: BedrockDocumentProcessingProps) {
    super(scope, id, props);

    // Validate chunking configuration if provided
    if (props.enableChunking && props.chunkingConfig) {
      this.validateChunkingConfig(props.chunkingConfig);
    }

    if (props.network) {
      props.network.createServiceEndpoint('vpce-bedrock', InterfaceVpcEndpointAwsService.BEDROCK);
      props.network.createServiceEndpoint('vpce-bedrock-runtime', InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME);
    }

    this.bedrockDocumentProcessingProps = props;
    this.stateMachine = this.handleStateMachineCreation('bedrock-document-processing-workflow');
  }

  /**
   * Validates the chunking configuration parameters.
   *
   * Ensures that:
   * - Chunk size is greater than 0
   * - Overlap is non-negative and less than chunk size
   * - Thresholds are greater than 0
   * - Max concurrency is greater than 0
   * - Min success threshold is between 0 and 1
   *
   * @param config - The chunking configuration to validate
   * @throws Error if any configuration parameter is invalid
   */
  private validateChunkingConfig(config: ChunkingConfig): void {
    // Validate chunk size (for fixed-pages strategy)
    if (config.chunkSize !== undefined) {
      if (config.chunkSize <= 0) {
        throw new Error('ChunkingConfig validation error: chunkSize must be greater than 0');
      }
    }

    // Validate overlap pages (for fixed-pages strategy)
    if (config.overlapPages !== undefined) {
      if (config.overlapPages < 0) {
        throw new Error('ChunkingConfig validation error: overlapPages must be non-negative');
      }
      const effectiveChunkSize = config.chunkSize || 50; // default chunk size
      if (config.overlapPages >= effectiveChunkSize) {
        throw new Error('ChunkingConfig validation error: overlapPages must be less than chunkSize');
      }
    }

    // Validate page threshold
    if (config.pageThreshold !== undefined && config.pageThreshold <= 0) {
      throw new Error('ChunkingConfig validation error: pageThreshold must be greater than 0');
    }

    // Validate token threshold
    if (config.tokenThreshold !== undefined && config.tokenThreshold <= 0) {
      throw new Error('ChunkingConfig validation error: tokenThreshold must be greater than 0');
    }

    // Validate max tokens per chunk (for token-based strategy)
    if (config.maxTokensPerChunk !== undefined && config.maxTokensPerChunk <= 0) {
      throw new Error('ChunkingConfig validation error: maxTokensPerChunk must be greater than 0');
    }

    // Validate overlap tokens (for token-based and hybrid strategies)
    if (config.overlapTokens !== undefined) {
      if (config.overlapTokens < 0) {
        throw new Error('ChunkingConfig validation error: overlapTokens must be non-negative');
      }
      const effectiveMaxTokens = config.maxTokensPerChunk || 100000; // default max tokens
      if (config.overlapTokens >= effectiveMaxTokens) {
        throw new Error('ChunkingConfig validation error: overlapTokens must be less than maxTokensPerChunk');
      }
    }

    // Validate max pages per chunk (for hybrid strategy)
    if (config.maxPagesPerChunk !== undefined && config.maxPagesPerChunk <= 0) {
      throw new Error('ChunkingConfig validation error: maxPagesPerChunk must be greater than 0');
    }

    // Validate target tokens per chunk (for hybrid strategy)
    if (config.targetTokensPerChunk !== undefined && config.targetTokensPerChunk <= 0) {
      throw new Error('ChunkingConfig validation error: targetTokensPerChunk must be greater than 0');
    }

    // Validate max concurrency
    if (config.maxConcurrency !== undefined && config.maxConcurrency <= 0) {
      throw new Error('ChunkingConfig validation error: maxConcurrency must be greater than 0');
    }

    // Validate min success threshold
    if (config.minSuccessThreshold !== undefined) {
      if (config.minSuccessThreshold < 0 || config.minSuccessThreshold > 1) {
        throw new Error('ChunkingConfig validation error: minSuccessThreshold must be between 0 and 1');
      }
    }
  }

  /**
   * Implements the document classification step using Amazon Bedrock.
   *
   * Creates a Lambda function that invokes the configured Bedrock model to classify
   * the document type. The function reads the document from S3 and sends it to
   * Bedrock with the classification prompt.
   *
   * This method caches the Lambda function to avoid creating duplicate resources,
   * but creates a new LambdaInvoke task each time to allow proper state chaining.
   *
   * @returns LambdaInvoke task configured for document classification
   */
  protected classificationStep(): DocumentProcessingStepType {
    // Create Lambda function only once
    if (!this._classificationFunction) {
      const prompt = this.bedrockDocumentProcessingProps.classificationPrompt || BedrockDocumentProcessing.DEFAULT_CLASSIFICATION_PROMPT;
      const adjustedModelId = BedrockModelUtils.deriveActualModelId(this.bedrockDocumentProcessingProps.classificationBedrockModel);
      const role = this.generateLambdaRoleForBedrock('ClassificationLambdaRole', this.bedrockDocumentProcessingProps.classificationBedrockModel);
      const { region, account } = Stack.of(this);
      const generatedLogPermissions = LambdaIamUtils.createLogsPermissions({
        account,
        functionName: 'bedrock-idp-classification',
        region,
        scope: this,
        enableObservability: this.bedrockDocumentProcessingProps.enableObservability,
      });

      this.encryptionKey.grantEncryptDecrypt(role);

      this._classificationFunction = new PythonFunction(this, 'BedrockClassificationFunction', {
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
        vpc: this.bedrockDocumentProcessingProps.network
          ? this.bedrockDocumentProcessingProps.network.vpc
          : undefined,
        vpcSubnets: this.bedrockDocumentProcessingProps.network
          ? this.bedrockDocumentProcessingProps.network.applicationSubnetSelection()
          : undefined,
      });

      for (const statement of generatedLogPermissions.policyStatements) {
        this._classificationFunction.role?.addToPrincipalPolicy(statement);
      }

      if (this.bedrockDocumentProcessingProps.network) {
        this._classificationFunction.role?.addToPrincipalPolicy(LambdaIamUtils.generateLambdaVPCPermissions());
      }
    }

    // Always create a new LambdaInvoke task to allow proper state chaining
    const stepId = `ClassificationStep-${this._classificationStepCounter}`;
    this._classificationStepCounter++;

    return new LambdaInvoke(this, stepId, {
      lambdaFunction: this._classificationFunction,
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
   * This method caches the Lambda function to avoid creating duplicate resources,
   * but creates a new LambdaInvoke task each time to allow proper state chaining.
   *
   * @returns LambdaInvoke task configured for document extraction
   */
  protected processingStep(): DocumentProcessingStepType {
    // Create Lambda function only once
    if (!this._processingFunction) {
      const prompt = this.bedrockDocumentProcessingProps.processingPrompt || BedrockDocumentProcessing.DEFAULT_PROCESSING_PROMPT;
      const adjustedModelId = BedrockModelUtils.deriveActualModelId(this.bedrockDocumentProcessingProps.processingBedrockModel);
      const role = this.generateLambdaRoleForBedrock('ProcessingLambdaRole', this.bedrockDocumentProcessingProps.processingBedrockModel);
      const { region, account } = Stack.of(this);

      const generatedLogPermissions = LambdaIamUtils.createLogsPermissions({
        account,
        functionName: 'bedrock-idp-processing',
        region,
        scope: this,
      });
      this.encryptionKey.grantEncryptDecrypt(role);
      this._processingFunction = new PythonFunction(this, 'BedrockExtractionFunction', {
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
        vpc: this.bedrockDocumentProcessingProps.network
          ? this.bedrockDocumentProcessingProps.network.vpc
          : undefined,
        vpcSubnets: this.bedrockDocumentProcessingProps.network
          ? this.bedrockDocumentProcessingProps.network.applicationSubnetSelection()
          : undefined,
      });

      for (const statement of generatedLogPermissions.policyStatements) {
        this._processingFunction.role?.addToPrincipalPolicy(statement);
      }

      if (this.bedrockDocumentProcessingProps.network) {
        this._processingFunction.role?.addToPrincipalPolicy(LambdaIamUtils.generateLambdaVPCPermissions());
      }
    }

    // Always create a new LambdaInvoke task to allow proper state chaining
    const stepId = `ProcessingStep-${this._processingStepCounter}`;
    this._processingStepCounter++;

    return new LambdaInvoke(this, stepId, {
      lambdaFunction: this._processingFunction,
      resultPath: '$.processingResult',
      resultSelector: {
        'documentClassification.$': '$.Payload.documentClassification',
        'result.$': '$.Payload.result',
      },
    });
  }

  protected generateLambdaRoleForBedrock(id: string, model?: BedrockModelProps) {
    return new Role(this, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        BedrockInvokePolicy: new PolicyDocument({
          statements: [
            // S3 read-only access for document retrieval - least privilege
            ...this.ingressAdapter.generateAdapterIAMPolicies(),
            BedrockModelUtils.generateModelIAMPermissions(this, model),
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

    const stepId = `EnrichmentStep-${this._enrichmentStepCounter}`;
    this._enrichmentStepCounter++;

    return new LambdaInvoke(this, stepId, {
      lambdaFunction: this.bedrockDocumentProcessingProps.enrichmentLambdaFunction,
      resultPath: '$.enrichedResult',
      outputPath: '$',
      payloadResponseOnly: true,
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

    const stepId = `PostProcessingStep-${this._postProcessingStepCounter}`;
    this._postProcessingStepCounter++;

    return new LambdaInvoke(this, stepId, {
      lambdaFunction: this.bedrockDocumentProcessingProps.postProcessingLambdaFunction,
      resultPath: '$.postProcessedResult',
      outputPath: '$',
      payloadResponseOnly: true,
    });
  }


  /**
   * Implements the optional preprocessing step for PDF chunking.
   *
   * When chunking is enabled, creates a Lambda function that analyzes PDFs and
   * splits large documents into manageable chunks. The function:
   * 1. Analyzes the PDF to determine page count and token estimates
   * 2. Decides if chunking is needed based on configured thresholds
   * 3. If chunking is needed, splits the PDF and uploads chunks to S3
   *
   * @returns LambdaInvoke task for PDF analysis and chunking, or undefined if chunking is disabled
   */
  protected preprocessingStep(): DocumentProcessingStepType | undefined {
    // Only enable chunking if explicitly configured
    if (!this.bedrockDocumentProcessingProps.enableChunking) {
      return undefined;
    }

    const { region, account } = Stack.of(this);
    const chunkingConfig = this.bedrockDocumentProcessingProps.chunkingConfig || {};

    // Create IAM role for chunking Lambda with least privilege permissions
    // Chunking Lambda needs: GetObject (read raw PDFs), PutObject (write chunks)
    const role = new Role(this, 'ChunkingLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ChunkingPolicy: new PolicyDocument({
          statements: [
            ...this.ingressAdapter.generateAdapterIAMPolicies(),
          ],
        }),
      },
    });

    const generatedLogPermissions = LambdaIamUtils.createLogsPermissions({
      account,
      functionName: 'bedrock-idp-chunking',
      region,
      scope: this,
      enableObservability: this.bedrockDocumentProcessingProps.enableObservability,
    });

    this.encryptionKey.grantEncryptDecrypt(role);

    // Create PDF Analysis & Chunking Lambda
    const chunkingLambda = new PythonFunction(this, 'PDFChunkingFunction', {
      functionName: generatedLogPermissions.uniqueFunctionName,
      entry: path.join(__dirname, 'resources/pdf-chunking'),
      index: 'handler.py',
      handler: 'handler',
      runtime: DefaultRuntimes.PYTHON,
      architecture: Architecture.X86_64,
      role,
      memorySize: 2048,
      timeout: Duration.minutes(10),
      environment: {
        CHUNKING_STRATEGY: chunkingConfig.strategy || 'hybrid',
        PAGE_THRESHOLD: String(chunkingConfig.pageThreshold || 100),
        TOKEN_THRESHOLD: String(chunkingConfig.tokenThreshold || 150000),
        CHUNK_SIZE: String(chunkingConfig.chunkSize || 50),
        OVERLAP_PAGES: String(chunkingConfig.overlapPages || 5),
        MAX_TOKENS_PER_CHUNK: String(chunkingConfig.maxTokensPerChunk || 100000),
        OVERLAP_TOKENS: String(chunkingConfig.overlapTokens || 5000),
        TARGET_TOKENS_PER_CHUNK: String(chunkingConfig.targetTokensPerChunk || 80000),
        MAX_PAGES_PER_CHUNK: String(chunkingConfig.maxPagesPerChunk || 99),
        ...PowertoolsConfig.generateDefaultLambdaConfig(
          this.bedrockDocumentProcessingProps.enableObservability,
          this.metricNamespace,
          this.metricServiceName,
        ),
      },
      environmentEncryption: this.encryptionKey,
      vpc: this.bedrockDocumentProcessingProps.network
        ? this.bedrockDocumentProcessingProps.network.vpc
        : undefined,
      vpcSubnets: this.bedrockDocumentProcessingProps.network
        ? this.bedrockDocumentProcessingProps.network.applicationSubnetSelection()
        : undefined,
    });

    for (const statement of generatedLogPermissions.policyStatements) {
      chunkingLambda.role?.addToPrincipalPolicy(statement);
    }

    if (this.bedrockDocumentProcessingProps.network) {
      chunkingLambda.role?.addToPrincipalPolicy(LambdaIamUtils.generateLambdaVPCPermissions());
    }

    return new LambdaInvoke(this, 'PDFAnalysisAndChunking', {
      lambdaFunction: chunkingLambda,
      resultPath: '$.chunkingResult',
      resultSelector: {
        'requiresChunking.$': '$.Payload.requiresChunking',
        'tokenAnalysis.$': '$.Payload.tokenAnalysis',
        'strategy.$': '$.Payload.strategy',
        'chunks.$': '$.Payload.chunks',
      },
    });
  }

  /**
   * Provides additional metadata fields for chunking to be stored in DynamoDB.
   *
   * When chunking is enabled, adds fields for:
   * - ChunkingEnabled: string representation of boolean flag
   * - ChunkingStrategy: strategy used (fixed-pages, token-based, hybrid)
   * - TokenAnalysis: JSON string with token analysis results
   * - ChunkMetadata: JSON string array with chunk information
   *
   * @returns Record of DynamoDB attribute values for chunking metadata
   */
  protected preprocessingMetadata(): Record<string, DynamoAttributeValue> {
    if (!this.bedrockDocumentProcessingProps.enableChunking) {
      return {};
    }

    return {
      ChunkingEnabled: DynamoAttributeValue.fromString(
        JsonPath.stringAt('States.Format(\'{}\', $.chunkingResult.requiresChunking)'),
      ),
      ChunkingStrategy: DynamoAttributeValue.fromString(
        JsonPath.stringAt('$.chunkingResult.strategy'),
      ),
      TokenAnalysis: DynamoAttributeValue.fromString(
        JsonPath.jsonToString(JsonPath.objectAt('$.chunkingResult.tokenAnalysis')),
      ),
      ChunkMetadata: DynamoAttributeValue.fromString(
        JsonPath.jsonToString(JsonPath.objectAt('$.chunkingResult.chunks')),
      ),
    };
  }

  /**
   * Creates the processing workflow with conditional branching for chunked documents.
   *
   * When chunking is enabled, creates a Choice State that:
   * - Routes to chunked processing flow if document was chunked
   * - Routes to standard processing flow if document was not chunked
   *
   * When chunking is disabled, returns the standard processing workflow.
   *
   * @returns Step Functions chain for processing the document
   */
  protected createProcessingWorkflow(): IChainable {
    // If chunking is not enabled, use standard workflow
    if (!this.bedrockDocumentProcessingProps.enableChunking) {
      return this.createStandardProcessingWorkflow();
    }

    // Create Choice State to check if chunking was applied
    const choiceState = new Choice(this, 'CheckIfChunked');

    choiceState
      .when(
        Condition.booleanEquals('$.chunkingResult.requiresChunking', true),
        this.createChunkedProcessingFlow(),
      )
      .otherwise(
        // Pass 'Standard' prefix to avoid construct ID collisions with chunked flow
        this.createStandardProcessingWorkflow('Standard'),
      );

    return choiceState;
  }


  /**
   * Creates the chunked processing flow for large documents.
   *
   * This flow:
   * 1. Uses a Map State to process each chunk in parallel (or sequentially)
   * 2. Each chunk goes through classification and processing
   * 3. Results are aggregated using the aggregation Lambda
   * 4. DynamoDB is updated with the aggregated result
   * 5. Temporary chunks are cleaned up from S3
   *
   * @returns Step Functions chain for chunked document processing
   */
  private createChunkedProcessingFlow(): IChainable {
    const chunkingConfig = this.bedrockDocumentProcessingProps.chunkingConfig || {};
    const maxConcurrency = chunkingConfig.processingMode === 'sequential'
      ? 1
      : (chunkingConfig.maxConcurrency || 10);

    // Create Map State for processing chunks
    const mapState = new Map(this, 'ProcessChunks', {
      itemsPath: '$.chunkingResult.chunks',
      maxConcurrency,
      parameters: {
        'documentId.$': '$.documentId',
        'chunk.$': '$$.Map.Item.Value',
        'chunkIndex.$': '$$.Map.Item.Index',
        'totalChunks.$': 'States.ArrayLength($.chunkingResult.chunks)',
        // Override content to point to the chunk PDF, not the original document
        'content': {
          'location': 's3',
          'bucket.$': '$$.Map.Item.Value.bucket',
          'key.$': '$$.Map.Item.Value.key',
          'filename.$': '$.content.filename',
        },
        'contentType.$': '$.contentType',
      },
      resultPath: '$.chunkResults',
    });

    // Define per-chunk processing: classification → processing
    const chunkClassification = this.classificationStep();
    const chunkProcessing = this.processingStep();

    mapState.itemProcessor(
      chunkClassification.next(chunkProcessing),
    );

    // Create aggregation step (Lambda invoke only, normalization added separately)
    const aggregationLambdaStep = this.createAggregationStep();

    // Add a Pass state to normalize the aggregated result for downstream compatibility
    // This copies aggregatedResult to processingResult so enrichment/post-processing
    // see a consistent structure regardless of whether chunking was used
    const normalizeState = new Pass(this, 'NormalizeAggregatedResult', {
      parameters: {
        'documentId.$': '$.documentId',
        'contentType.$': '$.contentType',
        'content.$': '$.content',
        'chunkingResult.$': '$.chunkingResult',
        'chunkResults.$': '$.chunkResults',
        'aggregatedResult.$': '$.aggregatedResult',
        // Copy aggregated result to processingResult for downstream compatibility
        'processingResult': {
          'result.$': '$.aggregatedResult.result',
        },
        // Also set classificationResult from the first successful chunk for consistency
        'classificationResult.$': '$.chunkResults[0].classificationResult',
      },
    });

    // Create DynamoDB update step for aggregated result
    const updateAggregatedResultStep = this.createUpdateAggregatedResultStep();

    // Create cleanup step
    const cleanupStep = this.createCleanupStep();

    // Create move to processed chain with 'Chunked' prefix to avoid ID collisions
    const moveToProcessed = this.ingressAdapter.createSuccessChain(this, 'Chunked');

    // Create error handler for aggregation failures
    const aggregationErrorHandler = this.createAggregationErrorHandler();

    // Get optional enrichment and post-processing steps
    const enrichmentStep = this.enrichmentStep();
    const postProcessingStep = this.postProcessingStep();

    // Build the final chain after aggregation
    // Chain: Map State → Aggregation → DynamoDB Update → [Enrichment] → [PostProcessing] → Cleanup → Move to Processed
    let finalChain: IChainable = cleanupStep
      .addRetry({
        errors: ['Lambda.ServiceException', 'Lambda.TooManyRequestsException'],
        interval: Duration.seconds(2),
        maxAttempts: 3,
        backoffRate: 2,
      })
      .next(moveToProcessed);

    // Add post-processing if provided (insert before cleanup)
    if (postProcessingStep) {
      const postProcessingErrorHandler = new DynamoUpdateItem(this, 'ChunkedPostProcessingFailDDBUpdate', {
        table: this.documentProcessingTable,
        key: {
          DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
        },
        updateExpression: 'SET WorkflowStatus = :newStatus',
        expressionAttributeValues: {
          ':newStatus': DynamoAttributeValue.fromString('post-processing-failure'),
        },
        resultPath: JsonPath.DISCARD,
      }).next(this.ingressAdapter.createFailedChain(this, 'ChunkedPostProc'));

      finalChain = postProcessingStep
        .addCatch(postProcessingErrorHandler, {
          resultPath: JsonPath.DISCARD,
        })
        .next(
          new DynamoUpdateItem(this, 'ChunkedPostProcessingSuccessUpdate', {
            table: this.documentProcessingTable,
            key: {
              DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
            },
            updateExpression: 'SET WorkflowStatus = :newStatus, PostProcessingResult = :postProcessingResult',
            expressionAttributeValues: {
              ':newStatus': DynamoAttributeValue.fromString('post-processing-complete'),
              ':postProcessingResult': DynamoAttributeValue.fromString(JsonPath.jsonToString(JsonPath.objectAt('$.postProcessedResult'))),
            },
            resultPath: JsonPath.DISCARD,
          }).next(finalChain),
        );
    }

    // Add enrichment if provided (insert before post-processing or cleanup)
    if (enrichmentStep) {
      const enrichmentErrorHandler = new DynamoUpdateItem(this, 'ChunkedEnrichmentFailDDBUpdate', {
        table: this.documentProcessingTable,
        key: {
          DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
        },
        updateExpression: 'SET WorkflowStatus = :newStatus',
        expressionAttributeValues: {
          ':newStatus': DynamoAttributeValue.fromString('enrichment-failure'),
        },
        resultPath: JsonPath.DISCARD,
      }).next(this.ingressAdapter.createFailedChain(this, 'ChunkedEnrich'));

      finalChain = enrichmentStep
        .addCatch(enrichmentErrorHandler, {
          resultPath: JsonPath.DISCARD,
        })
        .next(
          new DynamoUpdateItem(this, 'ChunkedEnrichmentSuccessUpdate', {
            table: this.documentProcessingTable,
            key: {
              DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
            },
            updateExpression: 'SET WorkflowStatus = :newStatus, EnrichmentResult = :enrichmentResult',
            expressionAttributeValues: {
              ':newStatus': postProcessingStep
                ? DynamoAttributeValue.fromString('enrichment-complete')
                : DynamoAttributeValue.fromString('complete'),
              ':enrichmentResult': DynamoAttributeValue.fromString(JsonPath.jsonToString(JsonPath.objectAt('$.enrichedResult'))),
            },
            resultPath: JsonPath.DISCARD,
          }).next(finalChain),
        );
    }

    // Chain: Map State → Aggregation → Normalize → DynamoDB Update → [Enrichment] → [PostProcessing] → Cleanup → Move to Processed
    return mapState
      .addCatch(aggregationErrorHandler, {
        resultPath: '$.error',
      })
      .next(
        aggregationLambdaStep
          .addCatch(aggregationErrorHandler, {
            resultPath: '$.error',
          })
          .addRetry({
            errors: ['Lambda.ServiceException', 'Lambda.TooManyRequestsException'],
            interval: Duration.seconds(2),
            maxAttempts: 3,
            backoffRate: 2,
          })
          .next(
            normalizeState.next(
              updateAggregatedResultStep
                .addRetry({
                  errors: ['DynamoDB.ProvisionedThroughputExceededException'],
                  interval: Duration.seconds(1),
                  maxAttempts: 3,
                  backoffRate: 2,
                })
                .next(finalChain),
            ),
          ),
      );
  }

  /**
   * Creates the aggregation step for combining chunk results using Bedrock.
   *
   * Uses the same Bedrock invoke Lambda pattern as the processing step but with
   * a different prompt designed for aggregating multiple chunk results.
   * The chunk processing results are passed as text data to the model.
   *
   * @returns LambdaInvoke task for result aggregation
   */
  private createAggregationStep(): LambdaInvoke {
    // Create Lambda function only once (reuses bedrock-invoke pattern)
    if (!this._aggregationFunction) {
      const prompt = this.bedrockDocumentProcessingProps.aggregationPrompt || BedrockDocumentProcessing.DEFAULT_AGGREGATION_PROMPT;
      const adjustedModelId = BedrockModelUtils.deriveActualModelId(this.bedrockDocumentProcessingProps.processingBedrockModel);
      const role = this.generateLambdaRoleForBedrock('AggregationLambdaRole', this.bedrockDocumentProcessingProps.processingBedrockModel);
      const { region, account } = Stack.of(this);

      const generatedLogPermissions = LambdaIamUtils.createLogsPermissions({
        account,
        functionName: 'bedrock-idp-aggregation',
        region,
        scope: this,
        enableObservability: this.bedrockDocumentProcessingProps.enableObservability,
      });

      this.encryptionKey.grantEncryptDecrypt(role);

      this._aggregationFunction = new PythonFunction(this, 'BedrockAggregationFunction', {
        functionName: generatedLogPermissions.uniqueFunctionName,
        architecture: Architecture.X86_64,
        runtime: DefaultRuntimes.PYTHON,
        entry: path.join(__dirname, 'resources/default-bedrock-invoke'),
        role,
        memorySize: 1024,
        timeout: this.bedrockDocumentProcessingProps.stepTimeouts || Duration.minutes(5),
        environment: {
          MODEL_ID: adjustedModelId,
          PROMPT: prompt,
          INVOKE_TYPE: 'aggregation',
          INVOKE_MAX_TOKENS: '64000', // Aggregation may need more tokens for merged output
          ...PowertoolsConfig.generateDefaultLambdaConfig(
            this.bedrockDocumentProcessingProps.enableObservability,
            this.metricNamespace,
            this.metricServiceName,
          ),
        },
        environmentEncryption: this.encryptionKey,
        vpc: this.bedrockDocumentProcessingProps.network
          ? this.bedrockDocumentProcessingProps.network.vpc
          : undefined,
        vpcSubnets: this.bedrockDocumentProcessingProps.network
          ? this.bedrockDocumentProcessingProps.network.applicationSubnetSelection()
          : undefined,
      });

      for (const statement of generatedLogPermissions.policyStatements) {
        this._aggregationFunction.role?.addToPrincipalPolicy(statement);
      }

      if (this.bedrockDocumentProcessingProps.network) {
        this._aggregationFunction.role?.addToPrincipalPolicy(LambdaIamUtils.generateLambdaVPCPermissions());
      }
    }

    // Always create a new LambdaInvoke task to allow proper state chaining
    const stepId = `AggregationStep-${this._aggregationStepCounter}`;
    this._aggregationStepCounter++;

    // Pass chunk results as data content - the Lambda will format them for Bedrock
    return new LambdaInvoke(this, stepId, {
      lambdaFunction: this._aggregationFunction,
      payload: TaskInput.fromObject({
        'documentId.$': '$.documentId',
        'contentType': 'data',
        'content': {
          // Pass the chunk results as JSON string for the Lambda to process
          'data.$': 'States.JsonToString($.chunkResults)',
        },
      }),
      // Store in both aggregatedResult AND processingResult for consistency with non-chunked flow
      // This allows enrichment/post-processing steps to use $.processingResult regardless of chunking
      resultPath: '$.aggregatedResult',
      resultSelector: {
        'result.$': '$.Payload.result',
      },
    });
  }

  /**
   * Creates the DynamoDB update step for storing aggregated results.
   *
   * Updates the document record with:
   * - AggregatedResult: JSON string with classification, entities, and summary
   * - WorkflowStatus: 'complete'
   *
   * @returns DynamoUpdateItem task for storing aggregated results
   */
  private createUpdateAggregatedResultStep(): DynamoUpdateItem {
    return new DynamoUpdateItem(this, 'StoreAggregatedResult', {
      table: this.documentProcessingTable,
      key: {
        DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
      },
      updateExpression: 'SET AggregatedResult = :result, WorkflowStatus = :status',
      expressionAttributeValues: {
        ':result': DynamoAttributeValue.fromString(
          JsonPath.jsonToString(JsonPath.objectAt('$.aggregatedResult')),
        ),
        ':status': DynamoAttributeValue.fromString('complete'),
      },
      resultPath: JsonPath.DISCARD,
    });
  }

  /**
   * Creates the cleanup Lambda step for removing temporary chunk files.
   *
   * The cleanup Lambda:
   * - Deletes all chunk files from S3 chunks/ prefix
   * - Uses batch delete for efficiency (up to 1000 objects per request)
   * - Logs errors but doesn't fail the workflow
   *
   * @returns LambdaInvoke task for chunk cleanup
   */
  private createCleanupStep(): LambdaInvoke {
    // Create Lambda function only once
    if (!this._cleanupFunction) {
      const { region, account } = Stack.of(this);

      const role = new Role(this, 'CleanupLambdaRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          CleanupPolicy: new PolicyDocument({
            statements: [
              // S3 access for deleting chunks only - least privilege
              ...this.ingressAdapter.generateAdapterIAMPolicies(['s3:DeleteObject'], true),
            ],
          }),
        },
      });

      const generatedLogPermissions = LambdaIamUtils.createLogsPermissions({
        account,
        functionName: 'bedrock-idp-cleanup',
        region,
        scope: this,
        enableObservability: this.bedrockDocumentProcessingProps.enableObservability,
      });

      this.encryptionKey.grantEncryptDecrypt(role);

      this._cleanupFunction = new PythonFunction(this, 'CleanupFunction', {
        functionName: generatedLogPermissions.uniqueFunctionName,
        entry: path.join(__dirname, 'resources/cleanup'),
        index: 'handler.py',
        handler: 'handler',
        runtime: DefaultRuntimes.PYTHON,
        architecture: Architecture.X86_64,
        role,
        memorySize: 512,
        timeout: Duration.minutes(5),
        environment: {
          ...PowertoolsConfig.generateDefaultLambdaConfig(
            this.bedrockDocumentProcessingProps.enableObservability,
            this.metricNamespace,
            this.metricServiceName,
          ),
        },
        environmentEncryption: this.encryptionKey,
        vpc: this.bedrockDocumentProcessingProps.network
          ? this.bedrockDocumentProcessingProps.network.vpc
          : undefined,
        vpcSubnets: this.bedrockDocumentProcessingProps.network
          ? this.bedrockDocumentProcessingProps.network.applicationSubnetSelection()
          : undefined,
      });

      for (const statement of generatedLogPermissions.policyStatements) {
        this._cleanupFunction.role?.addToPrincipalPolicy(statement);
      }

      if (this.bedrockDocumentProcessingProps.network) {
        this._cleanupFunction.role?.addToPrincipalPolicy(LambdaIamUtils.generateLambdaVPCPermissions());
      }
    }

    return new LambdaInvoke(this, 'CleanupChunks', {
      lambdaFunction: this._cleanupFunction,
      payload: TaskInput.fromObject({
        'documentId.$': '$.documentId',
        'chunks.$': '$.chunkingResult.chunks',
      }),
      resultPath: JsonPath.DISCARD,
    });
  }

  /**
   * Creates the error handler for aggregation failures.
   *
   * When aggregation fails:
   * - Updates DynamoDB with 'aggregation-failure' status
   * - Moves document to failed/ prefix
   *
   * @returns Step Functions chain for handling aggregation errors
   */
  private createAggregationErrorHandler(): IChainable {
    const updateFailureStatus = new DynamoUpdateItem(this, 'AggregationFailDDBUpdate', {
      table: this.documentProcessingTable,
      key: {
        DocumentId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.documentId')),
      },
      updateExpression: 'SET WorkflowStatus = :newStatus',
      expressionAttributeValues: {
        ':newStatus': DynamoAttributeValue.fromString('aggregation-failure'),
      },
      resultPath: JsonPath.DISCARD,
    });

    // Use 'Chunked' prefix to avoid ID collisions with standard workflow
    const moveToFailed = this.ingressAdapter.createFailedChain(this, 'Chunked');

    return updateFailureStatus.next(moveToFailed);
  }
}
