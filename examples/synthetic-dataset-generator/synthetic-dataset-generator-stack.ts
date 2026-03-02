import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Construct } from 'constructs';
import { BatchAgent, CognitoAuthenticator, DefaultRuntimes, Frontend, InteractiveAgent, InvokeType } from '@cdklabs/cdk-appmod-catalog-blueprints';
import * as path from 'path';

/**
 * Synthetic Dataset Generator Stack
 *
 * This stack creates an AI-powered synthetic data generation application using:
 * - InteractiveAgent: Handles real-time chat with users via Cognito + API Gateway
 * - BatchAgent: Generates Python DataGenerator scripts via Bedrock
 *
 * Architecture:
 * User -> API Gateway -> InteractiveAgent -> generate_script tool -> BatchAgent -> Python script
 */
export class SyntheticDatasetGeneratorStack extends Stack {
  /** The chat agent handling user conversations */
  public readonly chatAgent: InteractiveAgent;

  /** The script generation agent */
  public readonly scriptGenerator: BatchAgent;

  /** The script execution Lambda (isolated, minimal permissions) */
  public readonly executionLambda: PythonFunction;

  /** S3 bucket for exported datasets */
  public readonly exportBucket: s3.Bucket;

  /** Export Lambda for full dataset generation */
  public readonly exportLambda: PythonFunction;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // =========================================================================
    // Load Agent Resources
    // =========================================================================

    // System prompt for conversation agent
    const conversationPrompt = new Asset(this, 'ConversationPrompt', {
      path: path.join(__dirname, './resources/system-prompt/conversation-prompt.txt'),
    });

    // System prompt for script generation agent
    const generationPrompt = new Asset(this, 'GenerationPrompt', {
      path: path.join(__dirname, './resources/generation/script-generation-prompt.txt'),
    });

    // Tool that invokes BatchAgent
    const generateScriptTool = new Asset(this, 'GenerateScriptTool', {
      path: path.join(__dirname, './resources/tools/generate_script.py'),
    });

    // Tool that validates and executes scripts
    const executeScriptTool = new Asset(this, 'ExecuteScriptTool', {
      path: path.join(__dirname, './resources/tools/execute_script.py'),
    });

    // Tool that exports datasets to S3 and generates presigned URLs
    const exportDatasetTool = new Asset(this, 'ExportDatasetTool', {
      path: path.join(__dirname, './resources/tools/export_dataset.py'),
    });

    // =========================================================================
    // BatchAgent - Script Generation
    // =========================================================================

    this.scriptGenerator = new BatchAgent(this, 'ScriptGenerator', {
      agentName: 'DataSynthScriptGen',
      agentDefinition: {
        bedrockModel: {
          useCrossRegionInference: true,
        },
        systemPrompt: generationPrompt,
      },
      prompt: 'Generate a Python DataGenerator class based on the provided requirements.',
      expectJson: true, // Extract JSON from response for structured output
      invokeType: InvokeType.ATTACH_DIRECTLY,
      enableObservability: true,
      metricNamespace: 'SyntheticDatasetGenerator',
      metricServiceName: 'script-generator',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // =========================================================================
    // Execution Lambda - Isolated Script Runner
    // =========================================================================

    // Execution Lambda - minimal permissions, runs validated scripts
    this.executionLambda = new PythonFunction(this, 'ExecutionLambda', {
      functionName: 'DataSynthExecutor',
      entry: path.join(__dirname, './resources/execution'),
      index: 'handler.py',
      handler: 'handler',
      runtime: DefaultRuntimes.PYTHON, // Python 3.13, matches framework
      memorySize: 3072, // 3GB for pandas operations
      timeout: Duration.minutes(5),
      description: 'Isolated Lambda for executing validated DataGenerator scripts',
    });

    // Note: NO additional IAM permissions granted
    // This Lambda only needs basic execution role (logs)
    // It has NO access to S3, DynamoDB, Bedrock, or other AWS services

    // =========================================================================
    // Export Storage - S3 Bucket with KMS Encryption
    // =========================================================================

    // KMS key for S3 bucket encryption
    const exportBucketKey = new kms.Key(this, 'ExportBucketKey', {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY,
      description: 'KMS key for DataSynth export bucket encryption',
    });

    // S3 bucket for storing exported datasets
    this.exportBucket = new s3.Bucket(this, 'ExportBucket', {
      bucketName: `datasynth-exports-${Stack.of(this).account}-${Stack.of(this).region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: exportBucketKey,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // For dev/example - allows clean teardown
      lifecycleRules: [
        {
          // Clean up old exports after 7 days
          expiration: Duration.days(7),
          prefix: 'exports/',
        },
      ],
    });

    // =========================================================================
    // Export Lambda - Generates Full Datasets and Uploads to S3
    // =========================================================================

    this.exportLambda = new PythonFunction(this, 'ExportLambda', {
      functionName: 'DataSynthExporter',
      entry: path.join(__dirname, './resources/export'),
      index: 'handler.py',
      handler: 'handler',
      runtime: DefaultRuntimes.PYTHON,
      memorySize: 3072, // 3GB for large dataset operations
      timeout: Duration.minutes(10), // Longer timeout for full dataset generation
      description: 'Generates full datasets and uploads to S3',
      environment: {
        EXPORT_BUCKET_NAME: this.exportBucket.bucketName,
      },
    });

    // Grant S3 write permissions to export Lambda
    this.exportBucket.grantReadWrite(this.exportLambda);
    exportBucketKey.grantEncryptDecrypt(this.exportLambda);

    // =========================================================================
    // InteractiveAgent - Chat Interface
    // =========================================================================

    this.chatAgent = new InteractiveAgent(this, 'ChatAgent', {
      agentName: 'DataSynthChat',
      agentDefinition: {
        bedrockModel: {
          useCrossRegionInference: true,
        },
        systemPrompt: conversationPrompt,
        tools: [generateScriptTool, executeScriptTool, exportDatasetTool],
        // Grant the tools permission to invoke BatchAgent, Execution, and Export Lambdas
        // Also grant S3 GetObject for presigned URL generation in export tool
        additionalPolicyStatementsForTools: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['lambda:InvokeFunction'],
            resources: [
              this.scriptGenerator.agentFunction.functionArn,
              this.executionLambda.functionArn,
              this.exportLambda.functionArn,
            ],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:GetObject'],
            resources: [this.exportBucket.arnForObjects('*')],
          }),
        ],
      },
      messageHistoryLimit: 20,
      sessionTTL: Duration.hours(24),
      memorySize: 1024,
      timeout: Duration.minutes(15),
      enableObservability: true,
      metricNamespace: 'SyntheticDatasetGenerator',
      metricServiceName: 'chat-agent',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // =========================================================================
    // Wire BatchAgent Function Name to Tool
    // =========================================================================

    // The generate_script tool needs to know which Lambda to invoke.
    // Pass the BatchAgent function name via environment variable.
    const cfnFunction = this.chatAgent.agentFunction.node.defaultChild as CfnFunction;
    cfnFunction.addPropertyOverride(
      'Environment.Variables.BATCH_AGENT_FUNCTION_NAME',
      this.scriptGenerator.agentFunction.functionName,
    );

    // The execute_script tool needs to know which Execution Lambda to invoke.
    cfnFunction.addPropertyOverride(
      'Environment.Variables.EXECUTION_LAMBDA_NAME',
      this.executionLambda.functionName,
    );

    // The export tool needs to know which Export Lambda and bucket to use.
    cfnFunction.addPropertyOverride(
      'Environment.Variables.EXPORT_LAMBDA_NAME',
      this.exportLambda.functionName,
    );
    cfnFunction.addPropertyOverride(
      'Environment.Variables.EXPORT_BUCKET_NAME',
      this.exportBucket.bucketName,
    );

    // =========================================================================
    // Frontend - React Application
    // =========================================================================

    // Note: Frontend environment variables (VITE_API_ENDPOINT, VITE_USER_POOL_ID,
    // VITE_USER_POOL_CLIENT_ID) must be set in frontend/.env before deployment.
    // Copy frontend/.env.example to frontend/.env and fill in values from
    // a previous deployment, or deploy backend first, then redeploy with
    // frontend env vars set.

    const frontend = new Frontend(this, 'Frontend', {
      sourceDirectory: path.join(__dirname, './frontend'),
      buildOutputDirectory: path.join(__dirname, './frontend/build'),
      skipBuild: true, // Use local build to avoid Docker issues
      removalPolicy: RemovalPolicy.DESTROY,
      enableObservability: true,
    });

    // =========================================================================
    // CloudFormation Outputs
    // =========================================================================

    // Get authenticator for Cognito output values
    const cognitoAuth = this.chatAgent.authenticator as CognitoAuthenticator;

    // API endpoint for chat (used by frontend in Phase 4)
    new CfnOutput(this, 'ChatApiEndpoint', {
      value: this.chatAgent.apiEndpoint || '',
      description: 'Chat API endpoint URL for sending messages',
      exportName: 'DataSynthChatApiEndpoint',
    });

    // Cognito User Pool ID (for frontend authentication)
    new CfnOutput(this, 'UserPoolId', {
      value: cognitoAuth?.userPool?.userPoolId || 'N/A',
      description: 'Cognito User Pool ID for authentication',
      exportName: 'DataSynthUserPoolId',
    });

    // Cognito User Pool Client ID (for frontend authentication)
    new CfnOutput(this, 'UserPoolClientId', {
      value: cognitoAuth?.userPoolClient?.userPoolClientId || 'N/A',
      description: 'Cognito User Pool Client ID for authentication',
      exportName: 'DataSynthUserPoolClientId',
    });

    // Script generator function name (for testing/debugging)
    new CfnOutput(this, 'ScriptGeneratorFunctionName', {
      value: this.scriptGenerator.agentFunction.functionName,
      description: 'Lambda function name for script generation agent',
    });

    // Chat agent function name (for testing/debugging)
    new CfnOutput(this, 'ChatAgentFunctionName', {
      value: this.chatAgent.agentFunction.functionName,
      description: 'Lambda function name for chat agent',
    });

    // Execution Lambda function name (for testing/debugging)
    new CfnOutput(this, 'ExecutionLambdaName', {
      value: this.executionLambda.functionName,
      description: 'Lambda function name for script execution',
    });

    // Export bucket name (for export functionality)
    new CfnOutput(this, 'ExportBucketName', {
      value: this.exportBucket.bucketName,
      description: 'S3 bucket for exported datasets',
      exportName: 'DataSynthExportBucket',
    });

    // Export Lambda function name (for testing/debugging)
    new CfnOutput(this, 'ExportLambdaName', {
      value: this.exportLambda.functionName,
      description: 'Lambda function name for dataset export',
    });

    // Frontend URL (CloudFront distribution)
    new CfnOutput(this, 'FrontendUrl', {
      value: frontend.url(),
      description: 'URL for the DataSynth frontend application',
      exportName: 'DataSynthFrontendUrl',
    });

    // Frontend CloudFront distribution ID (for cache invalidation)
    new CfnOutput(this, 'FrontendDistributionId', {
      value: frontend.distribution.distributionId,
      description: 'CloudFront distribution ID for frontend',
    });
  }
}
