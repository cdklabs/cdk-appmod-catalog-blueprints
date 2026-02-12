// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App, Stack } from 'aws-cdk-lib';
import { createTestApp } from '../../../../utilities/test-utils';
import { BedrockKnowledgeBase } from '../bedrock-knowledge-base';

describe('BedrockKnowledgeBase', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  describe('Validation', () => {
    test('throws error for empty knowledgeBaseId', () => {
      expect(() => {
        new BedrockKnowledgeBase(stack, 'TestKB', {
          name: 'test-kb',
          description: 'Test knowledge base',
          knowledgeBaseId: '',
        });
      }).toThrow('knowledgeBaseId is required and cannot be empty');
    });

    test('throws error for whitespace-only knowledgeBaseId', () => {
      expect(() => {
        new BedrockKnowledgeBase(stack, 'TestKB', {
          name: 'test-kb',
          description: 'Test knowledge base',
          knowledgeBaseId: '   ',
        });
      }).toThrow('knowledgeBaseId is required and cannot be empty');
    });

    test('throws error for empty name (inherited from base)', () => {
      expect(() => {
        new BedrockKnowledgeBase(stack, 'TestKB', {
          name: '',
          description: 'Test knowledge base',
          knowledgeBaseId: 'ABCD1234',
        });
      }).toThrow('name is required and cannot be empty');
    });

    test('throws error for empty description (inherited from base)', () => {
      expect(() => {
        new BedrockKnowledgeBase(stack, 'TestKB', {
          name: 'test-kb',
          description: '',
          knowledgeBaseId: 'ABCD1234',
        });
      }).toThrow('description is required and cannot be empty');
    });
  });

  describe('ARN Construction', () => {
    test('constructs ARN from knowledgeBaseId when ARN not provided', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
      });

      expect(kb.knowledgeBaseArn).toBe(
        'arn:aws:bedrock:us-east-1:123456789012:knowledge-base/ABCD1234',
      );
    });

    test('uses provided ARN when specified', () => {
      const customArn = 'arn:aws:bedrock:eu-west-1:987654321098:knowledge-base/CUSTOM123';
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
        knowledgeBaseArn: customArn,
      });

      expect(kb.knowledgeBaseArn).toBe(customArn);
    });
  });

  describe('IAM Permissions', () => {
    test('includes Retrieve and RetrieveAndGenerate permissions', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
      });

      const permissions = kb.generateIamPermissions();

      expect(permissions).toHaveLength(1);
      expect(permissions[0].toStatementJson()).toMatchObject({
        Effect: 'Allow',
        Action: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
        Resource: 'arn:aws:bedrock:us-east-1:123456789012:knowledge-base/ABCD1234',
      });
    });

    test('scopes permissions to specific ARN', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'SPECIFIC123',
      });

      const permissions = kb.generateIamPermissions();
      const statement = permissions[0].toStatementJson();

      expect(statement.Resource).toBe(
        'arn:aws:bedrock:us-east-1:123456789012:knowledge-base/SPECIFIC123',
      );
      expect(statement.Resource).not.toContain('*');
    });

    test('adds guardrail permissions when configured', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
        guardrail: {
          guardrailId: 'my-guardrail',
          guardrailVersion: '1',
        },
      });

      const permissions = kb.generateIamPermissions();

      expect(permissions).toHaveLength(2);
      expect(permissions[1].toStatementJson()).toMatchObject({
        Effect: 'Allow',
        Action: 'bedrock:ApplyGuardrail',
        Resource: 'arn:aws:bedrock:us-east-1:123456789012:guardrail/my-guardrail',
      });
    });

    test('adds S3 permissions when vector store bucket is specified', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
        vectorStore: {
          type: 's3-vectors',
          bucketName: 'my-vectors-bucket',
          prefix: 'custom-prefix/',
        },
      });

      const permissions = kb.generateIamPermissions();

      expect(permissions).toHaveLength(2);
      expect(permissions[1].toStatementJson()).toMatchObject({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::my-vectors-bucket/custom-prefix/*',
      });
    });
  });

  describe('exportConfiguration', () => {
    test('includes Bedrock-specific fields', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base description',
        knowledgeBaseId: 'ABCD1234',
      });

      const config = kb.exportConfiguration();

      expect(config.type).toBe('bedrock');
      expect(config.knowledgeBaseId).toBe('ABCD1234');
      expect(config.knowledgeBaseArn).toBe(
        'arn:aws:bedrock:us-east-1:123456789012:knowledge-base/ABCD1234',
      );
      expect(config.name).toBe('test-kb');
      expect(config.description).toBe('Test knowledge base description');
    });

    test('includes guardrail configuration when provided', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
        guardrail: {
          guardrailId: 'my-guardrail',
          guardrailVersion: '2',
        },
      });

      const config = kb.exportConfiguration();

      expect(config.guardrail).toBeDefined();
      expect(config.guardrail?.guardrailId).toBe('my-guardrail');
      expect(config.guardrail?.guardrailVersion).toBe('2');
    });

    test('includes vector store configuration', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
        vectorStore: {
          type: 'opensearch-serverless',
        },
      });

      const config = kb.exportConfiguration();

      expect(config.vectorStore).toBeDefined();
      expect(config.vectorStore?.type).toBe('opensearch-serverless');
    });

    test('defaults vector store to s3-vectors', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
      });

      const config = kb.exportConfiguration();

      expect(config.vectorStore).toBeDefined();
      expect(config.vectorStore?.type).toBe('s3-vectors');
    });

    test('includes retrieval configuration', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
        retrieval: {
          numberOfResults: 15,
          retrievalFilter: { category: 'docs' },
        },
      });

      const config = kb.exportConfiguration();

      expect(config.retrieval.numberOfResults).toBe(15);
      expect(config.retrieval.retrievalFilter).toEqual({ category: 'docs' });
    });

    test('includes ACL configuration when provided', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
        acl: {
          enabled: true,
          metadataField: 'team',
        },
      });

      const config = kb.exportConfiguration();

      expect(config.acl).toBeDefined();
      expect(config.acl?.enabled).toBe(true);
      expect(config.acl?.metadataField).toBe('team');
    });
  });

  describe('Public Properties', () => {
    test('exposes knowledgeBaseId as public readonly', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'MY-KB-ID',
      });

      expect(kb.knowledgeBaseId).toBe('MY-KB-ID');
    });

    test('exposes knowledgeBaseArn as public readonly', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
      });

      expect(kb.knowledgeBaseArn).toBe(
        'arn:aws:bedrock:us-east-1:123456789012:knowledge-base/ABCD1234',
      );
    });
  });

  describe('retrievalToolAsset', () => {
    test('returns an Asset containing the Bedrock retrieval tool', () => {
      const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        knowledgeBaseId: 'ABCD1234',
      });

      const asset = kb.retrievalToolAsset();

      expect(asset).toBeDefined();
      expect(asset.isZipArchive).toBe(true);
      expect(asset.s3ObjectKey).toContain('.zip');
    });
  });
});
