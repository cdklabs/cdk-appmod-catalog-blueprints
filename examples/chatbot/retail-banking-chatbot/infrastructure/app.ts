#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RetailBankingChatbotStack } from './retail-banking-chatbot-stack';

const app = new cdk.App();
new RetailBankingChatbotStack(app, 'RetailBankingChatbotStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
