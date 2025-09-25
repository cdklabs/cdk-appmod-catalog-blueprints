#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BedrockDocumentProcessingStack } from './bedrock-document-processing-stack';

const app = new cdk.App();
new BedrockDocumentProcessingStack(app, 'BedrockDocumentProcessingStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
