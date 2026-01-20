#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FraudDetectionStack } from './fraud-detection-stack';

const app = new cdk.App();
new FraudDetectionStack(app, 'FraudDetectionStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
