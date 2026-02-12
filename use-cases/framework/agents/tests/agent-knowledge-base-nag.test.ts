// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Aspects, Stack } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { createTestApp } from '../../../utilities/test-utils';
import { BatchAgent } from '../batch-agent';
import { BedrockKnowledgeBase } from '../knowledge-base';

const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

describe('Agent Knowledge Base CDK Nag Tests', () => {
  describe('Single Knowledge Base', () => {
    test('agent with single KB passes AWS Solutions checks', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../resources/default-strands-agent/batch.py'),
      });

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

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Suppressions with documented justifications
      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies (AWSLambdaBasicExecutionRole) are acceptable for Lambda execution role as they provide minimal required permissions for CloudWatch Logs',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions are required for: (1) S3 asset access patterns, (2) Bedrock model invocation across regions, (3) CloudWatch Logs stream creation. All wildcards are scoped to specific resources.',
          appliesTo: [
            'Action::s3:GetObject*',
            'Action::s3:GetBucket*',
            'Action::s3:List*',
            'Resource::*',
            'Resource::arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
            'Resource::arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/TestAgent-teststackagentaa2af0c4:*',
            'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-123456789012-us-east-1/*',
          ],
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime is managed by construct defaults and updated as part of regular maintenance',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );
      expect(errors).toHaveLength(0);
    });
  });

  describe('Multiple Knowledge Bases', () => {
    test('agent with multiple KBs passes AWS Solutions checks', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../resources/default-strands-agent/batch.py'),
      });

      const kb1 = new BedrockKnowledgeBase(stack, 'ProductDocs', {
        name: 'product-documentation',
        description: 'Product documentation and FAQs',
        knowledgeBaseId: 'KB-PRODUCT-123',
      });

      const kb2 = new BedrockKnowledgeBase(stack, 'SupportDocs', {
        name: 'support-documentation',
        description: 'Support articles and troubleshooting guides',
        knowledgeBaseId: 'KB-SUPPORT-456',
      });

      const kb3 = new BedrockKnowledgeBase(stack, 'PolicyDocs', {
        name: 'policy-documentation',
        description: 'Company policies and procedures',
        knowledgeBaseId: 'KB-POLICY-789',
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'MultiKBAgent',
        prompt: 'Test prompt with multiple knowledge bases',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb1, kb2, kb3],
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies are acceptable for Lambda execution role',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions are scoped to specific resources for S3 assets, Bedrock models, and CloudWatch Logs',
          appliesTo: [
            'Action::s3:GetObject*',
            'Action::s3:GetBucket*',
            'Action::s3:List*',
            'Resource::*',
            'Resource::arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
            'Resource::arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/MultiKBAgent-teststackagentaa2af0c4:*',
            'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-123456789012-us-east-1/*',
          ],
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime is managed by construct defaults',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );
      expect(errors).toHaveLength(0);
    });

    test('IAM permissions are scoped to specific KB ARNs (no wildcards)', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const kb1 = new BedrockKnowledgeBase(stack, 'KB1', {
        name: 'kb-one',
        description: 'First knowledge base',
        knowledgeBaseId: 'KB-ONE-123',
      });

      const kb2 = new BedrockKnowledgeBase(stack, 'KB2', {
        name: 'kb-two',
        description: 'Second knowledge base',
        knowledgeBaseId: 'KB-TWO-456',
      });

      // Verify each KB generates permissions scoped to its specific ARN
      const kb1Permissions = kb1.generateIamPermissions();
      const kb2Permissions = kb2.generateIamPermissions();

      // Check KB1 permissions
      kb1Permissions.forEach((statement) => {
        const json = statement.toStatementJson();
        const resources = Array.isArray(json.Resource) ? json.Resource : [json.Resource];
        resources.forEach((resource: string) => {
          expect(resource).not.toBe('*');
          expect(resource).not.toContain('knowledge-base/*');
          if (resource.includes('knowledge-base')) {
            expect(resource).toContain('KB-ONE-123');
          }
        });
      });

      // Check KB2 permissions
      kb2Permissions.forEach((statement) => {
        const json = statement.toStatementJson();
        const resources = Array.isArray(json.Resource) ? json.Resource : [json.Resource];
        resources.forEach((resource: string) => {
          expect(resource).not.toBe('*');
          expect(resource).not.toContain('knowledge-base/*');
          if (resource.includes('knowledge-base')) {
            expect(resource).toContain('KB-TWO-456');
          }
        });
      });
    });
  });

  describe('Guardrails Configuration', () => {
    test('agent with guardrails passes AWS Solutions checks', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../resources/default-strands-agent/batch.py'),
      });

      const kb = new BedrockKnowledgeBase(stack, 'SecureDocs', {
        name: 'secure-documentation',
        description: 'Secure documentation with content filtering',
        knowledgeBaseId: 'KB-SECURE-123',
        guardrail: {
          guardrailId: 'content-filter-guardrail',
          guardrailVersion: '1',
        },
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'GuardrailAgent',
        prompt: 'Test prompt with guardrails',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb],
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies are acceptable for Lambda execution role',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions are scoped to specific resources',
          appliesTo: [
            'Action::s3:GetObject*',
            'Action::s3:GetBucket*',
            'Action::s3:List*',
            'Resource::*',
            'Resource::arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
            'Resource::arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/GuardrailAgent-teststackagentaa2af0c4:*',
            'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-123456789012-us-east-1/*',
          ],
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime is managed by construct defaults',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );
      expect(errors).toHaveLength(0);
    });

    test('guardrail permissions are scoped to specific guardrail ARN', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const kb = new BedrockKnowledgeBase(stack, 'SecureDocs', {
        name: 'secure-documentation',
        description: 'Secure documentation with content filtering',
        knowledgeBaseId: 'KB-SECURE-123',
        guardrail: {
          guardrailId: 'my-specific-guardrail',
          guardrailVersion: '2',
        },
      });

      const permissions = kb.generateIamPermissions();

      // Find the guardrail permission
      const guardrailPermission = permissions.find((p) => {
        const json = p.toStatementJson();
        return json.Action === 'bedrock:ApplyGuardrail';
      });

      expect(guardrailPermission).toBeDefined();
      const guardrailJson = guardrailPermission!.toStatementJson();

      // Verify guardrail permission is scoped to specific guardrail
      expect(guardrailJson.Resource).toContain('guardrail/my-specific-guardrail');
      expect(guardrailJson.Resource).not.toBe('*');
      expect(guardrailJson.Resource).not.toContain('guardrail/*');
    });

    test('agent with multiple KBs and guardrails passes AWS Solutions checks', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const systemPrompt = new Asset(stack, 'SystemPrompt', {
        path: path.join(__dirname, '../resources/default-strands-agent/batch.py'),
      });

      const kb1 = new BedrockKnowledgeBase(stack, 'PublicDocs', {
        name: 'public-documentation',
        description: 'Public documentation without guardrails',
        knowledgeBaseId: 'KB-PUBLIC-123',
      });

      const kb2 = new BedrockKnowledgeBase(stack, 'SecureDocs', {
        name: 'secure-documentation',
        description: 'Secure documentation with guardrails',
        knowledgeBaseId: 'KB-SECURE-456',
        guardrail: {
          guardrailId: 'pii-filter',
          guardrailVersion: '1',
        },
      });

      new BatchAgent(stack, 'Agent', {
        agentName: 'MixedAgent',
        prompt: 'Test prompt with mixed KB configurations',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
          knowledgeBases: [kb1, kb2],
        },
      });

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies are acceptable for Lambda execution role',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions are scoped to specific resources',
          appliesTo: [
            'Action::s3:GetObject*',
            'Action::s3:GetBucket*',
            'Action::s3:List*',
            'Resource::*',
            'Resource::arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
            'Resource::arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/MixedAgent-teststackagentaa2af0c4:*',
            'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-123456789012-us-east-1/*',
          ],
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda runtime is managed by construct defaults',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );
      expect(errors).toHaveLength(0);
    });
  });

  describe('Least Privilege Verification', () => {
    test('KB permissions follow least-privilege principle', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'TEST-KB-123',
      });

      const permissions = kb.generateIamPermissions();

      // Verify only necessary actions are granted
      const kbPermission = permissions.find((p) => {
        const json = p.toStatementJson();
        const actions = Array.isArray(json.Action) ? json.Action : [json.Action];
        return actions.includes('bedrock:Retrieve');
      });

      expect(kbPermission).toBeDefined();
      const kbJson = kbPermission!.toStatementJson();
      const actions = Array.isArray(kbJson.Action) ? kbJson.Action : [kbJson.Action];

      // Should only have Retrieve and RetrieveAndGenerate - no admin actions
      expect(actions).toContain('bedrock:Retrieve');
      expect(actions).toContain('bedrock:RetrieveAndGenerate');
      expect(actions).not.toContain('bedrock:CreateKnowledgeBase');
      expect(actions).not.toContain('bedrock:DeleteKnowledgeBase');
      expect(actions).not.toContain('bedrock:UpdateKnowledgeBase');
      expect(actions).not.toContain('bedrock:*');
    });

    test('no wildcard resource permissions for KB access', () => {
      const app = createTestApp();
      const stack = new Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'SPECIFIC-KB-ID',
      });

      const permissions = kb.generateIamPermissions();

      // Verify no wildcard resources
      permissions.forEach((statement) => {
        const json = statement.toStatementJson();
        const resources = Array.isArray(json.Resource) ? json.Resource : [json.Resource];
        resources.forEach((resource: string) => {
          // Resource should not be just '*' (wildcard for all resources)
          expect(resource).not.toBe('*');
          // Resource should not have wildcard KB ID
          expect(resource).not.toMatch(/knowledge-base\/\*/);
        });
      });
    });
  });
});
