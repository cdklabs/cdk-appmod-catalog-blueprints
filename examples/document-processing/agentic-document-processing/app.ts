#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AgenticDocumentProcessingStack } from './agentic-document-processing-stack';

const app = new cdk.App();
new AgenticDocumentProcessingStack(app, 'AgenticDocumentProcessingStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
