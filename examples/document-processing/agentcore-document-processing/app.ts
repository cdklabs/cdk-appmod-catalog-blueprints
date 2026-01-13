#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DocumentProcessingLambdaStack } from './lambda-stack';
import { DocumentProcessingAgentCoreDirectStack } from './agentcore-direct-stack';
import { DocumentProcessingAgentCoreContainerStack } from './agentcore-container-stack';

const app = new cdk.App();

// Lambda runtime stack (baseline)
new DocumentProcessingLambdaStack(app, 'DocumentProcessingLambdaStack', {
  description: 'Document Processing with Lambda Runtime (baseline)',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// AgentCore runtime with DIRECT_CODE deployment
// NOTE: DIRECT_CODE deployment is not yet fully supported. Uncomment when available.
// new DocumentProcessingAgentCoreDirectStack(app, 'DocumentProcessingAgentCoreDirectStack', {
//   description: 'Document Processing with AgentCore Runtime (DIRECT_CODE deployment)',
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION,
//   },
// });

// AgentCore runtime with CONTAINER deployment
new DocumentProcessingAgentCoreContainerStack(app, 'DocumentProcessingAgentCoreContainerStack', {
  description: 'Document Processing with AgentCore Runtime (CONTAINER deployment)',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
