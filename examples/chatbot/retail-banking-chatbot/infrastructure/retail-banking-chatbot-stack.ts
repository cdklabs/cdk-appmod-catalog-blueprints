import * as path from 'path';
import { CfnOutput, CustomResource, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CfnDataSource, CfnKnowledgeBase } from 'aws-cdk-lib/aws-bedrock';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { CfnVectorBucket, CfnIndex } from 'aws-cdk-lib/aws-s3vectors';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import {
  InteractiveAgent,
  BedrockKnowledgeBase,
  Frontend,
} from '@cdklabs/cdk-appmod-catalog-blueprints';

export class RetailBankingChatbotStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // =========================================================================
    // DynamoDB Transactions Table
    // =========================================================================

    const transactionsTable = new Table(this, 'TransactionsTable', {
      partitionKey: { name: 'customerId', type: AttributeType.STRING },
      sortKey: { name: 'transactionId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // =========================================================================
    // Knowledge Base Infrastructure (adapted from rag-customer-support)
    // =========================================================================

    const dataSourceBucket = new Bucket(this, 'DataSourceBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    const vectorBucket = new CfnVectorBucket(this, 'VectorBucket', {
      vectorBucketName: `retail-banking-kb-vectors-${this.account}`,
    });

    const vectorIndex = new CfnIndex(this, 'VectorIndex', {
      vectorBucketArn: vectorBucket.attrVectorBucketArn,
      dimension: 1024,
      distanceMetric: 'cosine',
      dataType: 'float32',
      metadataConfiguration: {
        nonFilterableMetadataKeys: [
          'AMAZON_BEDROCK_TEXT',
          'AMAZON_BEDROCK_METADATA',
        ],
      },
    });

    const kbRole = new Role(this, 'KnowledgeBaseRole', {
      assumedBy: new ServicePrincipal('bedrock.amazonaws.com'),
      inlinePolicies: {
        BedrockKBPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject', 's3:ListBucket'],
              resources: [dataSourceBucket.bucketArn, `${dataSourceBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['bedrock:InvokeModel'],
              resources: [`arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3vectors:PutVectors', 's3vectors:GetVectors', 's3vectors:QueryVectors', 's3vectors:DeleteVectors', 's3vectors:ListVectors'],
              resources: [vectorBucket.attrVectorBucketArn, vectorIndex.attrIndexArn],
            }),
          ],
        }),
      },
    });

    const knowledgeBase = new CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: 'retail-banking-faq-kb',
      description: 'Retail banking FAQs for AWSome Bank',
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

    const dataSource = new CfnDataSource(this, 'DataSource', {
      knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
      name: 'banking-faq-docs',
      description: 'Retail banking FAQ documentation',
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: { bucketArn: dataSourceBucket.bucketArn },
      },
    });
    dataSource.addDependency(knowledgeBase);

    // Deploy sample FAQ docs and trigger ingestion
    const bucketDeployment = new BucketDeployment(this, 'DeployFAQDocs', {
      sources: [Source.asset(path.join(__dirname, '../sample-docs'))],
      destinationBucket: dataSourceBucket,
    });

    const ingestionHandler = new Function(this, 'IngestionHandler', {
      runtime: Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../resources/ingestion-handler')),
      timeout: Duration.minutes(10),
    });
    ingestionHandler.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['bedrock:StartIngestionJob', 'bedrock:GetIngestionJob'],
      resources: [`arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${knowledgeBase.attrKnowledgeBaseId}`],
    }));

    const ingestionProvider = new Provider(this, 'IngestionProvider', {
      onEventHandler: ingestionHandler,
    });
    const ingestionTrigger = new CustomResource(this, 'IngestionTrigger', {
      serviceToken: ingestionProvider.serviceToken,
      properties: {
        KnowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
        DataSourceId: dataSource.attrDataSourceId,
        Timestamp: Date.now().toString(),
      },
    });
    ingestionTrigger.node.addDependency(bucketDeployment);
    ingestionTrigger.node.addDependency(dataSource);

    // =========================================================================
    // Interactive Agent
    // =========================================================================

    const kbConstruct = new BedrockKnowledgeBase(this, 'BankingFAQ', {
      name: 'banking-faq',
      description: 'Retail banking FAQs including account types, fees, transfers, cards, loans, and digital banking. Use when answering questions about AWSome Bank products and policies.',
      knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
      retrieval: { numberOfResults: 5 },
    });

    const systemPrompt = new Asset(this, 'SystemPrompt', {
      path: path.join(__dirname, '../resources/system_prompt.txt'),
    });

    const transactionTool = new Asset(this, 'TransactionTool', {
      path: path.join(__dirname, '../resources/tools/lookup_transactions.py'),
    });

    const agent = new InteractiveAgent(this, 'BankingAgent', {
      agentName: 'retail-banking',
      agentDefinition: {
        bedrockModel: { useCrossRegionInference: true },
        systemPrompt,
        tools: [transactionTool],
        knowledgeBases: [kbConstruct],
      },
      messageHistoryLimit: 20,
      sessionTTL: Duration.hours(24),
      enableObservability: true,
      metricNamespace: 'retail-banking-chatbot',
      metricServiceName: 'banking-agent',
    });

    // Grant the agent Lambda access to DynamoDB
    transactionsTable.grantReadData(agent.agentFunction);
    // Pass table name as env var to the agent function
    const cfnFunction = agent.agentFunction.node.defaultChild as any;
    cfnFunction.addPropertyOverride(
      'Environment.Variables.TRANSACTIONS_TABLE_NAME',
      transactionsTable.tableName,
    );

    agent.node.addDependency(ingestionTrigger);

    // =========================================================================
    // Frontend
    // =========================================================================

    const frontend = new Frontend(this, 'Frontend', {
      sourceDirectory: path.join(__dirname, '../frontend'),
      buildCommand: 'npm run build',
      skipBuild: true,
      buildOutputDirectory: path.join(__dirname, '../frontend/build'),
      enableObservability: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // =========================================================================
    // Outputs
    // =========================================================================

    new CfnOutput(this, 'ChatApiEndpoint', {
      value: agent.apiEndpoint,
      description: 'Chat API endpoint',
    });

    const cognitoAuth = agent.authenticator as any;
    new CfnOutput(this, 'UserPoolId', {
      value: cognitoAuth?.userPool?.userPoolId || 'N/A',
    });
    new CfnOutput(this, 'UserPoolClientId', {
      value: cognitoAuth?.userPoolClient?.userPoolClientId || 'N/A',
    });
    new CfnOutput(this, 'Region', { value: this.region });
    new CfnOutput(this, 'FrontendUrl', { value: frontend.url() });
    new CfnOutput(this, 'TransactionsTableName', { value: transactionsTable.tableName });
    new CfnOutput(this, 'KnowledgeBaseId', { value: knowledgeBase.attrKnowledgeBaseId });
    new CfnOutput(this, 'AgentFunctionName', { value: agent.agentFunction.functionName });
  }
}
