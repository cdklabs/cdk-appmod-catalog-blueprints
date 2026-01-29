// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App, Aspects, Stack } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { createTestApp } from '../../../../utilities/test-utils';
import { BedrockKnowledgeBase } from '../bedrock-knowledge-base';

describe('BedrockKnowledgeBase CDK Nag Tests', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  describe('IAM Policy Compliance', () => {
    test('IAM policies follow least-privilege - basic KB', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
      });

      // Create a role and attach the KB permissions to test IAM compliance
      const role = new Role(stack, 'TestRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      });

      const permissions = kb.generateIamPermissions();
      permissions.forEach((statement) => role.addToPolicy(statement));

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Suppress expected warnings for test role
      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Test role uses managed policies which is acceptable for testing',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );
      expect(errors).toHaveLength(0);
    });

    test('no wildcard permissions in basic KB configuration', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
      });

      const permissions = kb.generateIamPermissions();

      // Verify no wildcard resources
      permissions.forEach((statement) => {
        const json = statement.toStatementJson();
        const resources = Array.isArray(json.Resource) ? json.Resource : [json.Resource];
        resources.forEach((resource: string) => {
          // Resource should not be just '*' (wildcard for all resources)
          expect(resource).not.toBe('*');
        });
      });
    });

    test('guardrail permissions scoped correctly', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
        guardrail: {
          guardrailId: 'my-guardrail',
          guardrailVersion: '1',
        },
      });

      // Create a role and attach the KB permissions
      const role = new Role(stack, 'TestRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      });

      const permissions = kb.generateIamPermissions();
      permissions.forEach((statement) => role.addToPolicy(statement));

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Test role uses managed policies which is acceptable for testing',
        },
      ]);

      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );
      expect(errors).toHaveLength(0);

      // Verify guardrail permission is scoped to specific guardrail
      const guardrailPermission = permissions.find((p) => {
        const json = p.toStatementJson();
        return json.Action === 'bedrock:ApplyGuardrail';
      });

      expect(guardrailPermission).toBeDefined();
      const guardrailJson = guardrailPermission!.toStatementJson();
      expect(guardrailJson.Resource).toContain('guardrail/my-guardrail');
      expect(guardrailJson.Resource).not.toBe('*');
    });

    test('vector store permissions scoped correctly', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
        vectorStore: {
          type: 's3-vectors',
          bucketName: 'my-vectors-bucket',
          prefix: 'vectors/',
        },
      });

      // Create a role and attach the KB permissions
      const role = new Role(stack, 'TestRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      });

      const permissions = kb.generateIamPermissions();
      permissions.forEach((statement) => role.addToPolicy(statement));

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Test role uses managed policies which is acceptable for testing',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'S3 wildcard is scoped to specific bucket and prefix path',
          appliesTo: ['Resource::arn:aws:s3:::my-vectors-bucket/vectors/*'],
        },
      ]);

      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );
      expect(errors).toHaveLength(0);

      // Verify S3 permission is scoped to specific bucket and prefix
      const s3Permission = permissions.find((p) => {
        const json = p.toStatementJson();
        return json.Action === 's3:GetObject';
      });

      expect(s3Permission).toBeDefined();
      const s3Json = s3Permission!.toStatementJson();
      expect(s3Json.Resource).toContain('my-vectors-bucket');
      expect(s3Json.Resource).toContain('vectors/');
      expect(s3Json.Resource).not.toBe('*');
    });

    test('KB permissions scoped to specific ARN', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'SPECIFIC-KB-ID',
      });

      const permissions = kb.generateIamPermissions();

      // Find the Bedrock KB permission
      const kbPermission = permissions.find((p) => {
        const json = p.toStatementJson();
        const actions = Array.isArray(json.Action) ? json.Action : [json.Action];
        return actions.includes('bedrock:Retrieve');
      });

      expect(kbPermission).toBeDefined();
      const kbJson = kbPermission!.toStatementJson();

      // Verify it's scoped to the specific KB ARN
      expect(kbJson.Resource).toContain('knowledge-base/SPECIFIC-KB-ID');
      expect(kbJson.Resource).not.toBe('*');
      expect(kbJson.Resource).not.toContain('knowledge-base/*');
    });
  });

  describe('Full Configuration Compliance', () => {
    test('passes CDK Nag with all features enabled', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'full-featured-kb',
        description: 'Knowledge base with all features',
        knowledgeBaseId: 'FULL-KB-123',
        guardrail: {
          guardrailId: 'content-filter',
          guardrailVersion: '1',
        },
        vectorStore: {
          type: 's3-vectors',
          bucketName: 'vectors-bucket',
          prefix: 'embeddings/',
        },
        acl: {
          enabled: true,
          metadataField: 'team',
        },
        retrieval: {
          numberOfResults: 10,
          retrievalFilter: { category: 'docs' },
        },
      });

      // Create a role and attach all permissions
      const role = new Role(stack, 'TestRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      });

      const permissions = kb.generateIamPermissions();
      permissions.forEach((statement) => role.addToPolicy(statement));

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Test role uses managed policies which is acceptable for testing',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'S3 wildcard is scoped to specific bucket and prefix path',
          appliesTo: ['Resource::arn:aws:s3:::vectors-bucket/embeddings/*'],
        },
      ]);

      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );
      expect(errors).toHaveLength(0);
    });
  });
});
