// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { createTestApp } from '../../utilities/test-utils';
import { BatchAgent } from '../agents/batch-agent';
import { BedrockKnowledgeBase } from '../agents/knowledge-base';

describe('BaseAgent Knowledge Base Integration', () => {
  let app: App;
  let stack: Stack;
  let systemPrompt: Asset;
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    systemPrompt = new Asset(stack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });
  });

  describe('Backward Compatibility', () => {
    test('creates agent without knowledge bases (no KBs configured)', () => {
      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);

      // Agent should be created successfully
      template.resourceCountIs('AWS::Lambda::Function', 1);

      // No KB permissions should be added - verify no KnowledgeBasePermissions inline policy
      const roles = template.findResources('AWS::IAM::Role');
      const agentRole = Object.values(roles).find((role: any) =>
        role.Properties?.RoleName?.includes?.('Agent') ||
        role.Properties?.AssumeRolePolicyDocument?.Statement?.some?.((s: any) =>
          s.Principal?.Service === 'lambda.amazonaws.com',
        ),
      ) as any;

      // Check that KnowledgeBasePermissions policy doesn't exist
      const policies = agentRole?.Properties?.Policies || [];
      const hasKbPolicy = policies.some((p: any) => p.PolicyName === 'KnowledgeBasePermissions');
      expect(hasKbPolicy).toBe(false);
    });
  });

  describe('Single Knowledge Base', () => {
    test('creates agent with single KB and generates IAM permissions', () => {
      const kb = new BedrockKnowledgeBase(stack, 'ProductDocs', {
        name: 'product-documentation',
        description: 'Product documentation and FAQs',
        knowledgeBaseId: 'ABCD1234',
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
        },
      });

      const template = Template.fromStack(stack);

      // Verify KB permissions are added as inline policy on the role
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyName: 'KnowledgeBasePermissions',
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
                  Effect: 'Allow',
                  Resource: 'arn:aws:bedrock:us-east-1:123456789012:knowledge-base/ABCD1234',
                }),
              ]),
            },
          }),
        ]),
      });
    });

    test('creates retrieval tool asset when KB is configured', () => {
      const kb = new BedrockKnowledgeBase(stack, 'ProductDocs', {
        name: 'product-documentation',
        description: 'Product documentation and FAQs',
        knowledgeBaseId: 'ABCD1234',
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
        },
      });

      const template = Template.fromStack(stack);

      // Verify Lambda function is created (agent function)
      template.resourceCountIs('AWS::Lambda::Function', 1);

      // Verify IAM policies grant S3 read access for assets
      // When KB is configured, the retrieval tool asset should be granted read access
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['s3:GetObject*', 's3:GetBucket*', 's3:List*']),
              Effect: 'Allow',
            }),
          ]),
        },
      });
    });
  });

  describe('Multiple Knowledge Bases', () => {
    test('creates agent with multiple KBs and generates permissions for all', () => {
      const kb1 = new BedrockKnowledgeBase(stack, 'ProductDocs', {
        name: 'product-documentation',
        description: 'Product documentation',
        knowledgeBaseId: 'KB-PRODUCT',
      });

      const kb2 = new BedrockKnowledgeBase(stack, 'SupportDocs', {
        name: 'support-documentation',
        description: 'Support documentation',
        knowledgeBaseId: 'KB-SUPPORT',
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb1, kb2],
        },
      });

      const template = Template.fromStack(stack);

      // Verify permissions for both KBs are added as inline policy
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyName: 'KnowledgeBasePermissions',
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
                  Resource: 'arn:aws:bedrock:us-east-1:123456789012:knowledge-base/KB-PRODUCT',
                }),
                Match.objectLike({
                  Action: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
                  Resource: 'arn:aws:bedrock:us-east-1:123456789012:knowledge-base/KB-SUPPORT',
                }),
              ]),
            },
          }),
        ]),
      });
    });
  });

  describe('Additional KB Policy Statements', () => {
    test('adds additional KB policy statements when provided', () => {
      const kb = new BedrockKnowledgeBase(stack, 'ProductDocs', {
        name: 'product-documentation',
        description: 'Product documentation',
        knowledgeBaseId: 'ABCD1234',
      });

      const additionalStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: ['arn:aws:s3:::my-custom-bucket/*'],
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
          additionalPolicyStatementsForKnowledgeBases: [additionalStatement],
        },
      });

      const template = Template.fromStack(stack);

      // Verify additional statement is included in the KB permissions policy
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyName: 'KnowledgeBasePermissions',
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: 's3:GetObject',
                  Effect: 'Allow',
                  Resource: 'arn:aws:s3:::my-custom-bucket/*',
                }),
              ]),
            },
          }),
        ]),
      });
    });

    test('combines KB permissions with additional statements', () => {
      const kb = new BedrockKnowledgeBase(stack, 'ProductDocs', {
        name: 'product-documentation',
        description: 'Product documentation',
        knowledgeBaseId: 'ABCD1234',
      });

      const additionalStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['dynamodb:GetItem'],
        resources: ['arn:aws:dynamodb:us-east-1:123456789012:table/my-table'],
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
          additionalPolicyStatementsForKnowledgeBases: [additionalStatement],
        },
      });

      const template = Template.fromStack(stack);

      // Verify both KB permissions and additional statements are present
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyName: 'KnowledgeBasePermissions',
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
                }),
                Match.objectLike({
                  Action: 'dynamodb:GetItem',
                }),
              ]),
            },
          }),
        ]),
      });
    });
  });

  describe('Guardrail Permissions', () => {
    test('adds guardrail permissions when KB has guardrail configured', () => {
      const kb = new BedrockKnowledgeBase(stack, 'SecureDocs', {
        name: 'secure-documentation',
        description: 'Secure documentation with guardrails',
        knowledgeBaseId: 'ABCD1234',
        guardrail: {
          guardrailId: 'my-guardrail',
          guardrailVersion: '1',
        },
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        prompt: 'Test prompt',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
        },
      });

      const template = Template.fromStack(stack);

      // Verify guardrail permissions are added as inline policy
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyName: 'KnowledgeBasePermissions',
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: 'bedrock:ApplyGuardrail',
                  Resource: 'arn:aws:bedrock:us-east-1:123456789012:guardrail/my-guardrail',
                }),
              ]),
            },
          }),
        ]),
      });
    });
  });
});
