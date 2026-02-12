#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RagCustomerSupportStack } from './rag-customer-support-stack';

const app = new cdk.App();
new RagCustomerSupportStack(app, 'RagCustomerSupportStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
