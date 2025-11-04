import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { EventbridgeBroker } from '../foundation/eventbridge-broker';

describe('EventbridgeBroker', () => {
  let stack: Stack;

  beforeEach(() => {
    stack = new Stack();
  });

  test('creates EventBus with KMS encryption', () => {
    new EventbridgeBroker(stack, 'Broker', {
      eventSource: 'test.source',
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Events::EventBus', 1);
    template.resourceCountIs('AWS::KMS::Key', 1);

    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('uses custom KMS key when provided', () => {
    const customKey = new Key(stack, 'CustomKey');
    new EventbridgeBroker(stack, 'Broker', {
      eventSource: 'test.source',
      kmsKey: customKey,
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('sets custom event bus name', () => {
    new EventbridgeBroker(stack, 'Broker', {
      eventSource: 'test.source',
      name: 'CustomEventBus',
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Events::EventBus', {
      Name: 'CustomEventBus',
    });
  });

  test('applies RETAIN removal policy', () => {
    new EventbridgeBroker(stack, 'Broker', {
      eventSource: 'test.source',
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const template = Template.fromStack(stack);
    template.hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Retain',
    });
  });

  test('applies DESTROY removal policy by default', () => {
    new EventbridgeBroker(stack, 'Broker', {
      eventSource: 'test.source',
    });

    const template = Template.fromStack(stack);
    template.hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Delete',
    });
  });

  test('sendViaSfnChain creates EventBridge PutEvents task', () => {
    const broker = new EventbridgeBroker(stack, 'Broker', {
      eventSource: 'test.source',
    });

    const task = broker.sendViaSfnChain('TestEvent', { key: 'value' });

    expect(task).toBeDefined();
    const stateJson = task.toStateJson() as any;
    expect(stateJson.Type).toBe('Task');
    expect(stateJson.Parameters.Entries[0].Source).toBe('test.source');
    expect(stateJson.Parameters.Entries[0].DetailType).toBe('TestEvent');
  });
});
