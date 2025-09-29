#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from './api-stack';
import { FrontendStack } from './frontend-stack';

const app = new cdk.App();

const apiStack = new ApiStack(app, 'InsuranceClaimsApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const frontendStack = new FrontendStack(app, 'InsuranceClaimsFrontendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

frontendStack.addDependency(apiStack);
