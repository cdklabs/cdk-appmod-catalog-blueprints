import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import * as s3vectors from 'aws-cdk-lib/aws-s3vectors';
import * as logs from 'aws-cdk-lib/aws-logs';
import { AgenticDocumentProcessing, BedrockDocumentProcessing, QueuedS3Adapter } from '@cdklabs/cdk-appmod-catalog-blueprints';

export class DocumentSummarizationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for document storage with KMS encryption
    const documentBucket = new s3.Bucket(this, 'DocumentStorage', {
      encryption: s3.BucketEncryption.KMS_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create S3 Vector Bucket for storing embeddings
    const vectorBucket = new s3vectors.CfnVectorBucket(this, 'VectorBucket', {
      vectorBucketName: 'document-summarization-vectors',
    });

    // Create S3 Vectors index for storing embeddings
    const vectorIndex = new s3vectors.CfnIndex(this, 'VectorIndex', {
      vectorBucketArn: vectorBucket.attrVectorBucketArn,
      dimension: 3072,  // Nova embeddings dimension
      distanceMetric: 'cosine',
      dataType: 'float32',
      metadataConfiguration: {
        nonFilterableMetadataKeys: ["originalFilename", "summary"]
      }
    });

    // Create Lambda Layer for tool dependencies (pypdf and boto3)
    const toolDependenciesLayer = new lambda.LayerVersion(this, 'ToolDependenciesLayer', {
      code: lambda.Code.fromAsset('resources', {
        bundling: {
          image: lambda.Runtime.PYTHON_3_13.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output/python && cp requirements.txt /asset-output/'
          ],
        },
      }),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
      description: 'pypdf and boto3 dependencies for PDF extraction',
    });

    // Create Post Processor Lambda function
    const postProcessorLambda = new lambda.Function(this, 'PostProcessor', {
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'post_processor.lambda_handler',
      code: lambda.Code.fromAsset('resources'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        VECTOR_INDEX_ARN: vectorIndex.ref,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,  // Configure CloudWatch Logs retention
    });

    // Grant Bedrock permissions for Nova embeddings
    postProcessorLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:*::foundation-model/amazon.nova-2-multimodal-embeddings-v1:0`,
      ],
    }));

    // Grant S3 Vectors permissions
    postProcessorLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3vectors:PutVectors',
        's3vectors:GetVectors',
        's3vectors:QueryVectors',
      ],
      resources: [vectorIndex.ref],
    }));

    // Package system prompt as S3 Asset
    const systemPromptAsset = new s3assets.Asset(this, 'SystemPromptAsset', {
      path: 'resources/system_prompt.txt',
    });

    // Package PDF extractor tool as S3 Asset
    const pdfExtractorToolAsset = new s3assets.Asset(this, 'PdfExtractorToolAsset', {
      path: 'resources/tools/pdf_extractor.py',
    });

    // Configure AgenticDocumentProcessing construct
    // Note: Lambda functions created by this construct (including PDF extractor tool)
    // will have CloudWatch Logs configured automatically by the construct
    new AgenticDocumentProcessing(this, 'DocumentSummarization', {
      enableChunking: true,
      ingressAdapter: new QueuedS3Adapter({
        bucket: documentBucket,
        processedPrefix: 'processed',
        failedPrefix: 'failed'
      }),
      processingBedrockModel: {
        useCrossRegionInference: true
      },
      classificationBedrockModel: {
        useCrossRegionInference: true,  // Enable cross-region inference for Claude Sonnet 4.5
      },
      processingAgentParameters: {
        agentName: 'DocumentSummarizationAgent',
        agentDefinition: {
          bedrockModel: {
            useCrossRegionInference: true,  // Enable cross-region inference for Claude Sonnet 4.5
          },
          systemPrompt: systemPromptAsset,
          tools: [pdfExtractorToolAsset],
          lambdaLayers: [toolDependenciesLayer]
        },
        prompt: 'Use the appropriate tool to extract the content, then generate a concise summary.',
        enableObservability: true,
        metricNamespace: 'document-summarization',
        metricServiceName: 'summarization',
        expectJson: true
      },
      postProcessingLambdaFunction: postProcessorLambda,
      enableObservability: true,
      metricNamespace: 'document-summarization',
      metricServiceName: 'pipeline',
    });
  }
}
