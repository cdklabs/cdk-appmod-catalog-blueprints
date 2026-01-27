#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DocumentSummarizationStack } from '../lib/document-summarization-stack';

const app = new cdk.App();
new DocumentSummarizationStack(app, 'DocumentSummarizationStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Document Summarization Pipeline with AI-powered summarization and vector embeddings'
});
