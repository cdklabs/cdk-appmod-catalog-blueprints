import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { EventbridgeBroker } from '../foundation/eventbridge-broker';

describe('EventbridgeBroker', () => {
  let defaultStack: Stack;
  let customKeyStack: Stack;
  let customNameStack: Stack;
  let retainStack: Stack;
  let destroyStack: Stack;
  let sendViaSfnStack: Stack;
  let defaultTemplate: Template;
  let customKeyTemplate: Template;
  let customNameTemplate: Template;
  let retainTemplate: Template;
  let destroyTemplate: Template;
  let broker: EventbridgeBroker;

  beforeAll(() => {
    // Default configuration
    defaultStack = new Stack();
    new EventbridgeBroker(defaultStack, 'Broker', {
      eventSource: 'test.source',
    });
    defaultTemplate = Template.fromStack(defaultStack);

    // Custom KMS key
    customKeyStack = new Stack();
    const customKey = new Key(customKeyStack, 'CustomKey');
    new EventbridgeBroker(customKeyStack, 'Broker', {
      eventSource: 'test.source',
      kmsKey: customKey,
    });
    customKeyTemplate = Template.fromStack(customKeyStack);

    // Custom event bus name
    customNameStack = new Stack();
    new EventbridgeBroker(customNameStack, 'Broker', {
      eventSource: 'test.source',
      name: 'CustomEventBus',
    });
    customNameTemplate = Template.fromStack(customNameStack);

    // RETAIN removal policy
    retainStack = new Stack();
    new EventbridgeBroker(retainStack, 'Broker', {
      eventSource: 'test.source',
      removalPolicy: RemovalPolicy.RETAIN,
    });
    retainTemplate = Template.fromStack(retainStack);

    // DESTROY removal policy (default)
    destroyStack = new Stack();
    new EventbridgeBroker(destroyStack, 'Broker', {
      eventSource: 'test.source',
    });
    destroyTemplate = Template.fromStack(destroyStack);

    // sendViaSfnChain test
    sendViaSfnStack = new Stack();
    broker = new EventbridgeBroker(sendViaSfnStack, 'Broker', {
      eventSource: 'test.source',
    });
  });

  test('creates EventBus with KMS encryption', () => {
    defaultTemplate.resourceCountIs('AWS::Events::EventBus', 1);
    defaultTemplate.resourceCountIs('AWS::KMS::Key', 1);

    defaultTemplate.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('uses custom KMS key when provided', () => {
    customKeyTemplate.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('sets custom event bus name', () => {
    customNameTemplate.hasResourceProperties('AWS::Events::EventBus', {
      Name: 'CustomEventBus',
    });
  });

  test('applies RETAIN removal policy', () => {
    retainTemplate.hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Retain',
    });
  });

  test('applies DESTROY removal policy by default', () => {
    destroyTemplate.hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Delete',
    });
  });

  test('sendViaSfnChain creates EventBridge PutEvents task', () => {
    const task = broker.sendViaSfnChain('TestEvent', { key: 'value' });

    expect(task).toBeDefined();
    const stateJson = task.toStateJson() as any;
    expect(stateJson.Type).toBe('Task');
    expect(stateJson.Parameters.Entries[0].Source).toBe('test.source');
    expect(stateJson.Parameters.Entries[0].DetailType).toBe('TestEvent');
  });
});
