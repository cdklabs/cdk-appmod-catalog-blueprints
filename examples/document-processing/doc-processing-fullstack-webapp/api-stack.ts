import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime, Code, Function } from 'aws-cdk-lib/aws-lambda';
import { RestApi, LambdaIntegration, Cors } from 'aws-cdk-lib/aws-apigateway';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

export class ApiStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Reference existing agentic processing resources
    const agenticBucket = Bucket.fromBucketName(this, 'AgenticBucket', 
      'agenticdocumentprocessing-agenticdocumentprocessin-khfneft673zr');
    
    const agenticTable = Table.fromTableName(this, 'AgenticTable',
      'AgenticDocumentProcessingStack-AgenticDocumentProcessingDocumentProcessingTableF8B5B3B5-1Q2THRROQCT9A');

    // API Lambda - uploads to agentic bucket
    const apiFunction = new Function(this, 'ApiFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset('./api'),
      environment: {
        CORS_ORIGIN: '*',
        TABLE_NAME: agenticTable.tableName
      }
    });

    // Grant permissions to agentic resources
    agenticBucket.grantReadWrite(apiFunction);
    agenticTable.grantReadWriteData(apiFunction);

    // API Gateway
    const api = new RestApi(this, 'DocumentProcessingApi', {
      restApiName: 'Insurance Claims Document Processing API',
      description: 'API for processing insurance claim documents',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    const integration = new LambdaIntegration(apiFunction);

    // API Routes
    const documents = api.root.addResource('documents');
    const upload = documents.addResource('upload');
    upload.addMethod('POST', integration);
    documents.addMethod('GET', integration);

    const documentById = documents.addResource('{documentId}');
    const status = documentById.addResource('status');
    const results = documentById.addResource('results');
    
    status.addMethod('GET', integration);
    results.addMethod('GET', integration);

    this.apiUrl = api.url;
  }
}
