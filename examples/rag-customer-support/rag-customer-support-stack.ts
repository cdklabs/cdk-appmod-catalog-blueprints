import { CfnOutput, CustomResource, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CfnDataSource, CfnKnowledgeBase } from 'aws-cdk-lib/aws-bedrock';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { CfnVectorBucket, CfnIndex } from 'aws-cdk-lib/aws-s3vectors';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { BatchAgent, BedrockKnowledgeBase, InvokeType } from '@cdklabs/cdk-appmod-catalog-blueprints';

/**
 * RAG Customer Support Stack
 *
 * This stack demonstrates the Knowledge Base integration feature of the
 * Agentic AI Framework. It creates a customer support agent for a fictional
 * e-commerce platform (AcmeShop) that uses Amazon Bedrock Knowledge Bases
 * with S3 Vectors for RAG-based question answering.
 *
 * Components:
 * - S3 bucket for source documents (data source)
 * - Bedrock Knowledge Base with S3 Vectors storage
 * - Data source pointing to S3 bucket
 * - Sample documentation deployed via BucketDeployment
 * - Custom resource to trigger initial ingestion
 * - BatchAgent with knowledge base integration
 */
export class RagCustomerSupportStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // =========================================================================
    // Knowledge Base Infrastructure
    // =========================================================================

    // Create S3 bucket for data source with encryption
    const dataSourceBucket = new Bucket(this, 'DataSourceBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    // Create S3 Vector Bucket for storing embeddings
    const vectorBucket = new CfnVectorBucket(this, 'VectorBucket', {
      vectorBucketName: `rag-customer-support-vectors-${this.account}`,
    });

    // Create S3 Vectors index for storing embeddings
    // Titan Embed Text v2 produces 1024-dimensional vectors
    // Non-filterable metadata keys required for Bedrock KB integration:
    // https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html
    // (See S3 Vectors tab > "Create S3 vector bucket and index" > Step 4)
    const vectorIndex = new CfnIndex(this, 'VectorIndex', {
      vectorBucketArn: vectorBucket.attrVectorBucketArn,
      dimension: 1024,
      distanceMetric: 'cosine',
      dataType: 'float32',
      metadataConfiguration: {
        // Required for Bedrock Knowledge Base integration
        // These fields store text chunks and metadata that exceed filterable limits
        nonFilterableMetadataKeys: [
          'AMAZON_BEDROCK_TEXT',
          'AMAZON_BEDROCK_METADATA',
        ],
      },
    });

    // Create IAM role for Bedrock Knowledge Base
    const kbRole = new Role(this, 'KnowledgeBaseRole', {
      assumedBy: new ServicePrincipal('bedrock.amazonaws.com'),
      inlinePolicies: {
        BedrockKBPolicy: new PolicyDocument({
          statements: [
            // S3 access for data source
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject', 's3:ListBucket'],
              resources: [
                dataSourceBucket.bucketArn,
                `${dataSourceBucket.bucketArn}/*`,
              ],
            }),
            // Bedrock foundation model access for embeddings
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['bedrock:InvokeModel'],
              resources: [
                `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
              ],
            }),
            // S3 Vectors permissions for knowledge base
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                's3vectors:PutVectors',
                's3vectors:GetVectors',
                's3vectors:QueryVectors',
                's3vectors:DeleteVectors',
                's3vectors:ListVectors',
              ],
              resources: [
                vectorBucket.attrVectorBucketArn,
                vectorIndex.attrIndexArn,
              ],
            }),
          ],
        }),
      },
    });

    // Create Bedrock Knowledge Base with S3 Vectors storage
    const knowledgeBase = new CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: 'rag-customer-support-kb',
      description: 'E-commerce customer support documentation for AcmeShop',
      roleArn: kbRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        },
      },
      storageConfiguration: {
        type: 'S3_VECTORS',
        s3VectorsConfiguration: {
          vectorBucketArn: vectorBucket.attrVectorBucketArn,
          indexArn: vectorIndex.attrIndexArn,
        },
      },
    });

    // Create Data Source pointing to S3 bucket
    const dataSource = new CfnDataSource(this, 'DataSource', {
      knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
      name: 'ecommerce-docs',
      description: 'E-commerce platform documentation',
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: dataSourceBucket.bucketArn,
        },
      },
    });

    // Ensure data source is created after knowledge base
    dataSource.addDependency(knowledgeBase);

    // =========================================================================
    // Sample Documentation Deployment
    // =========================================================================

    // Deploy sample documentation to S3 bucket
    const bucketDeployment = new BucketDeployment(this, 'DeploySampleDocs', {
      sources: [Source.asset('./sample-docs')],
      destinationBucket: dataSourceBucket,
    });

    // =========================================================================
    // Ingestion Custom Resource
    // =========================================================================

    // Create Lambda function for ingestion handler
    const ingestionHandler = new Function(this, 'IngestionHandler', {
      runtime: Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: Code.fromAsset('./resources/ingestion-handler'),
      timeout: Duration.minutes(10),
      description: 'Triggers and monitors Bedrock Knowledge Base ingestion',
    });

    // Grant permissions to start and monitor ingestion jobs
    ingestionHandler.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'bedrock:StartIngestionJob',
        'bedrock:GetIngestionJob',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${knowledgeBase.attrKnowledgeBaseId}`,
      ],
    }));

    // Create custom resource provider
    const ingestionProvider = new Provider(this, 'IngestionProvider', {
      onEventHandler: ingestionHandler,
    });

    // Create custom resource to trigger ingestion after deployment
    const ingestionTrigger = new CustomResource(this, 'IngestionTrigger', {
      serviceToken: ingestionProvider.serviceToken,
      properties: {
        KnowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
        DataSourceId: dataSource.attrDataSourceId,
        // Add timestamp to force update on each deployment
        Timestamp: Date.now().toString(),
      },
    });

    // Ensure docs are uploaded before ingestion
    ingestionTrigger.node.addDependency(bucketDeployment);
    ingestionTrigger.node.addDependency(dataSource);

    // =========================================================================
    // Agent Infrastructure
    // =========================================================================

    // Create BedrockKnowledgeBase construct referencing the CfnKnowledgeBase
    const kbConstruct = new BedrockKnowledgeBase(this, 'KBReference', {
      name: 'ecommerce-support',
      description: 'E-commerce customer support documentation including products, orders, shipping, returns, and account help. Use for answering customer questions about AcmeShop.',
      knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
      retrieval: {
        numberOfResults: 5,
      },
    });

    // Create system prompt asset
    const systemPromptAsset = new Asset(this, 'SystemPrompt', {
      path: './resources/system_prompt.txt',
    });

    // Create BatchAgent with knowledge base integration
    const supportAgent = new BatchAgent(this, 'CustomerSupportAgent', {
      agentName: 'EcommerceSupport',
      agentDefinition: {
        bedrockModel: {
          useCrossRegionInference: true,
        },
        systemPrompt: systemPromptAsset,
        knowledgeBases: [kbConstruct],
      },
      prompt: 'Answer the customer question using the knowledge base. Be helpful, friendly, and provide accurate information based on the documentation.',
      enableObservability: true,
      metricNamespace: 'rag-customer-support',
      metricServiceName: 'customer-support-agent',
      invokeType: InvokeType.ATTACH_DIRECTLY,
    });

    // Ensure agent is created after ingestion completes
    supportAgent.node.addDependency(ingestionTrigger);

    // =========================================================================
    // CloudFormation Outputs
    // =========================================================================

    new CfnOutput(this, 'KnowledgeBaseId', {
      value: knowledgeBase.attrKnowledgeBaseId,
      description: 'Bedrock Knowledge Base ID',
    });

    new CfnOutput(this, 'DataSourceBucketName', {
      value: dataSourceBucket.bucketName,
      description: 'S3 bucket containing source documents',
    });

    new CfnOutput(this, 'AgentFunctionArn', {
      value: supportAgent.agentFunction.functionArn,
      description: 'Lambda function ARN for invoking the agent',
    });

    new CfnOutput(this, 'AgentFunctionName', {
      value: supportAgent.agentFunction.functionName,
      description: 'Lambda function name for invoke-agent.sh',
    });
  }
}
