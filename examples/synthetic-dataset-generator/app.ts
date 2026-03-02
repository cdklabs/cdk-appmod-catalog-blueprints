#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SyntheticDatasetGeneratorStack } from './synthetic-dataset-generator-stack';

const app = new cdk.App();
new SyntheticDatasetGeneratorStack(app, 'SyntheticDatasetGeneratorStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
