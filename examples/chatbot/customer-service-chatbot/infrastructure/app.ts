#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ChatbotStack } from './chatbot-stack';

const app = new cdk.App();
new ChatbotStack(app, 'CustomerSupportChatbotStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
