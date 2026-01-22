import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BedrockDocumentProcessing, QueuedS3Adapter } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';

export class MinimalBedrockDocProcessingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for document storage
    const bucket = new Bucket(this, 'DocumentBucket', {
      encryption: BucketEncryption.KMS,
    });

    // Deploy complete document processing with minimal configuration!
    const docProcessor = new BedrockDocumentProcessing(this, 'MinimalDocProcessor', {
      ingressAdapter: new QueuedS3Adapter({ bucket }),
      // Enable cross-region inference for Claude Sonnet 4
      classificationBedrockModel: {
        useCrossRegionInference: true,
      },
      processingBedrockModel: {
        useCrossRegionInference: true,
      },
    });

    // Export important resource identifiers for easy access
    new cdk.CfnOutput(this, 'DocumentBucketName', {
      value: bucket.bucketName,
      description: 'S3 bucket for document uploads',
      exportName: `${this.stackName}-DocumentBucket`,
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: docProcessor.stateMachine.stateMachineArn,
      description: 'Step Functions state machine ARN',
      exportName: `${this.stackName}-StateMachineArn`,
    });

    new cdk.CfnOutput(this, 'ProcessingTableName', {
      value: docProcessor.documentProcessingTable.tableName,
      description: 'DynamoDB table for processing results',
      exportName: `${this.stackName}-ProcessingTable`,
    });
  }
}
