import { Stack, StackProps, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { RestApi, LambdaIntegration, Cors } from 'aws-cdk-lib/aws-apigateway';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';

export class ApiStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Import bucket, table, and KMS keys from AgenticDocumentProcessingStack exports
    const bucketName = Fn.importValue('AgenticDocProcessing-BucketName');
    const tableName = Fn.importValue('AgenticDocProcessing-TableName');
    const bucketKeyArn = Fn.importValue('AgenticDocProcessing-BucketKeyArn');
    const tableKeyArn = Fn.importValue('AgenticDocProcessing-TableKeyArn');

    // Reference existing agentic processing resources using imported values
    const agenticBucket = Bucket.fromBucketName(this, 'AgenticBucket', bucketName);
    const agenticTable = Table.fromTableName(this, 'AgenticTable', tableName);
    const bucketKey = Key.fromKeyArn(this, 'BucketKey', bucketKeyArn);
    const tableKey = Key.fromKeyArn(this, 'TableKey', tableKeyArn);

    // API Lambda - uploads to agentic bucket (NodejsFunction handles TypeScript)
    const apiFunction = new NodejsFunction(this, 'ApiFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: './api/index.ts',
      handler: 'handler',
      environment: {
        CORS_ORIGIN: '*',
        TABLE_NAME: tableName,
        BUCKET_NAME: bucketName
      },
      bundling: {
        externalModules: [
          '@aws-sdk/*',
        ],
      }
    });

    // Grant permissions to agentic resources
    agenticBucket.grantReadWrite(apiFunction);
    agenticTable.grantReadWriteData(apiFunction);
    bucketKey.grantEncryptDecrypt(apiFunction);
    tableKey.grantEncryptDecrypt(apiFunction);

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
