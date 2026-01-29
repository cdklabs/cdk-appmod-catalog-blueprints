// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App, Stack } from 'aws-cdk-lib';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { createTestApp } from '../../../../utilities/test-utils';
import { BaseKnowledgeBase } from '../base-knowledge-base';
import { BaseKnowledgeBaseProps } from '../knowledge-base-props';

/**
 * Concrete implementation of BaseKnowledgeBase for testing purposes.
 * This allows us to test the abstract base class functionality.
 */
class TestKnowledgeBase extends BaseKnowledgeBase {
  constructor(scope: Construct, id: string, props: BaseKnowledgeBaseProps) {
    super(scope, id, props);
  }

  public generateIamPermissions(): PolicyStatement[] {
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['test:Query'],
        resources: ['*'],
      }),
    ];
  }
}

describe('BaseKnowledgeBase', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  describe('Validation', () => {
    test('throws error for empty name', () => {
      expect(() => {
        new TestKnowledgeBase(stack, 'TestKB', {
          name: '',
          description: 'Test description',
        });
      }).toThrow('name is required and cannot be empty');
    });

    test('throws error for whitespace-only name', () => {
      expect(() => {
        new TestKnowledgeBase(stack, 'TestKB', {
          name: '   ',
          description: 'Test description',
        });
      }).toThrow('name is required and cannot be empty');
    });

    test('throws error for empty description', () => {
      expect(() => {
        new TestKnowledgeBase(stack, 'TestKB', {
          name: 'test-kb',
          description: '',
        });
      }).toThrow('description is required and cannot be empty');
    });

    test('throws error for whitespace-only description', () => {
      expect(() => {
        new TestKnowledgeBase(stack, 'TestKB', {
          name: 'test-kb',
          description: '   ',
        });
      }).toThrow('description is required and cannot be empty');
    });
  });

  describe('Default Configuration', () => {
    test('default numberOfResults is 5', () => {
      const kb = new TestKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
      });

      const config = kb.exportConfiguration();
      expect(config.retrieval.numberOfResults).toBe(5);
    });

    test('uses provided numberOfResults when specified', () => {
      const kb = new TestKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        retrieval: {
          numberOfResults: 10,
        },
      });

      const config = kb.exportConfiguration();
      expect(config.retrieval.numberOfResults).toBe(10);
    });
  });

  describe('exportConfiguration', () => {
    test('returns correct structure with required fields', () => {
      const kb = new TestKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base description',
      });

      const config = kb.exportConfiguration();

      expect(config.name).toBe('test-kb');
      expect(config.description).toBe('Test knowledge base description');
      expect(config.retrieval).toBeDefined();
      expect(config.retrieval.numberOfResults).toBe(5);
      expect(config.acl).toBeUndefined();
    });

    test('includes ACL configuration when provided', () => {
      const kb = new TestKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        acl: {
          enabled: true,
          metadataField: 'permissions',
        },
      });

      const config = kb.exportConfiguration();

      expect(config.acl).toBeDefined();
      expect(config.acl?.enabled).toBe(true);
      expect(config.acl?.metadataField).toBe('permissions');
    });

    test('includes retrieval filter when provided', () => {
      const kb = new TestKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
        retrieval: {
          numberOfResults: 5,
          retrievalFilter: { category: 'docs' },
        },
      });

      const config = kb.exportConfiguration();

      expect(config.retrieval.retrievalFilter).toEqual({ category: 'docs' });
    });
  });

  describe('retrievalToolAsset', () => {
    test('returns undefined by default', () => {
      const kb = new TestKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'Test knowledge base',
      });

      expect(kb.retrievalToolAsset()).toBeUndefined();
    });
  });

  describe('Public Properties', () => {
    test('exposes name as public readonly', () => {
      const kb = new TestKnowledgeBase(stack, 'TestKB', {
        name: 'my-knowledge-base',
        description: 'Test knowledge base',
      });

      expect(kb.name).toBe('my-knowledge-base');
    });

    test('exposes description as public readonly', () => {
      const kb = new TestKnowledgeBase(stack, 'TestKB', {
        name: 'test-kb',
        description: 'My test knowledge base description',
      });

      expect(kb.description).toBe('My test knowledge base description');
    });
  });
});
