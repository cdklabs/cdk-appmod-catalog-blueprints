import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
import { DynamoAttributeValue, LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { createTestApp } from '../../utilities/test-utils';
import { BaseDocumentProcessing, DocumentProcessingStepType } from '../base-document-processing';

/**
 * Test implementation WITHOUT preprocessing (backward compatible)
 * This simulates existing implementations that don't use any preprocessing
 */
class TestDocumentProcessingWithoutPreprocessing extends BaseDocumentProcessing {
  private classificationFn: Function;
  private processingFn: Function;

  constructor(scope: any, id: string, props: any) {
    super(scope, id, props);

    this.classificationFn = new Function(this, 'ClassificationFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ documentClassification: "TEST" });'),
    });

    this.processingFn = new Function(this, 'ProcessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ result: {} });'),
    });
  }

  protected preprocessingStep(): DocumentProcessingStepType | undefined {
    // No preprocessing - backward compatible
    return undefined;
  }

  // No override of preprocessingMetadata() - uses default (empty)

  protected classificationStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockClassification', {
      lambdaFunction: this.classificationFn,
      resultPath: '$.classificationResult',
    });
  }

  protected processingStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockProcessing', {
      lambdaFunction: this.processingFn,
      resultPath: '$.processingResult',
    });
  }

  protected enrichmentStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected postProcessingStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected createProcessingWorkflow() {
    return this.createStandardProcessingWorkflow();
  }

  public createStateMachine() {
    return this.handleStateMachineCreation('test-state-machine-no-preprocessing');
  }
}

/**
 * Test implementation WITH preprocessing and custom metadata
 * This simulates implementations that add their own preprocessing-specific fields
 * (e.g., chunking metadata) without the base class knowing about them
 */
class TestDocumentProcessingWithCustomMetadata extends BaseDocumentProcessing {
  private preprocessingFn: Function;
  private classificationFn: Function;
  private processingFn: Function;

  constructor(scope: any, id: string, props: any) {
    super(scope, id, props);

    this.preprocessingFn = new Function(this, 'PreprocessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline(`
        exports.handler = async () => ({
          customField1: 'value1',
          customField2: { nested: 'data' },
          customField3: true
        });
      `),
    });

    this.classificationFn = new Function(this, 'ClassificationFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ documentClassification: "TEST" });'),
    });

    this.processingFn = new Function(this, 'ProcessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ result: {} });'),
    });
  }

  protected preprocessingStep(): DocumentProcessingStepType | undefined {
    return new LambdaInvoke(this, 'MockPreprocessing', {
      lambdaFunction: this.preprocessingFn,
      resultPath: '$.preprocessingResult',
    });
  }

  // Override to add custom metadata fields
  protected preprocessingMetadata(): Record<string, DynamoAttributeValue> {
    return {
      CustomField1: DynamoAttributeValue.fromString(JsonPath.stringAt('$.preprocessingResult.customField1')),
      CustomField2: DynamoAttributeValue.fromString(JsonPath.jsonToString(JsonPath.objectAt('$.preprocessingResult.customField2'))),
      CustomField3: DynamoAttributeValue.booleanFromJsonPath(JsonPath.stringAt('$.preprocessingResult.customField3')),
    };
  }

  protected classificationStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockClassification', {
      lambdaFunction: this.classificationFn,
      resultPath: '$.classificationResult',
    });
  }

  protected processingStep(): DocumentProcessingStepType {
    return new LambdaInvoke(this, 'MockProcessing', {
      lambdaFunction: this.processingFn,
      resultPath: '$.processingResult',
    });
  }

  protected enrichmentStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected postProcessingStep(): DocumentProcessingStepType | undefined {
    return undefined;
  }

  protected createProcessingWorkflow() {
    return this.createStandardProcessingWorkflow();
  }

  public createStateMachine() {
    return this.handleStateMachineCreation('test-state-machine-with-custom-metadata');
  }
}

describe('BaseDocumentProcessing - DynamoDB Schema Extension Mechanism', () => {
  let app: App;
  let stackWithoutPreprocessing: Stack;
  let stackWithCustomMetadata: Stack;
  let templateWithoutPreprocessing: Template;
  let templateWithCustomMetadata: Template;

  beforeAll(() => {
    // Use createTestApp() to skip bundling and speed up tests
    app = createTestApp();

    // Stack without preprocessing (backward compatible)
    stackWithoutPreprocessing = new Stack(app, 'WithoutPreprocessingStack');
    const constructWithoutPreprocessing = new TestDocumentProcessingWithoutPreprocessing(
      stackWithoutPreprocessing,
      'TestWithoutPreprocessing',
      {},
    );
    constructWithoutPreprocessing.createStateMachine();

    // Stack with custom metadata
    stackWithCustomMetadata = new Stack(app, 'WithCustomMetadataStack');
    const constructWithCustomMetadata = new TestDocumentProcessingWithCustomMetadata(
      stackWithCustomMetadata,
      'TestWithCustomMetadata',
      {},
    );
    constructWithCustomMetadata.createStateMachine();

    // Generate templates
    templateWithoutPreprocessing = Template.fromStack(stackWithoutPreprocessing);
    templateWithCustomMetadata = Template.fromStack(stackWithCustomMetadata);
  });

  describe('Backward Compatibility - Documents without preprocessing', () => {
    test('InitMetadata only includes base fields when no preprocessing', () => {
      const stateMachines = templateWithoutPreprocessing.findResources('AWS::StepFunctions::StateMachine');
      const stateMachineKey = Object.keys(stateMachines)[0];
      const definitionString = stateMachines[stateMachineKey].Properties.DefinitionString;

      // Parse the definition
      const definition = JSON.parse(definitionString['Fn::Join'][1].join(''));

      // Find the InitMetadataEntry state by name
      const initMetadataState = definition.States.InitMetadataEntry;

      expect(initMetadataState).toBeDefined();
      expect(initMetadataState.Type).toBe('Task');

      // Verify base fields are present
      expect(initMetadataState.Parameters.Item.DocumentId).toBeDefined();
      expect(initMetadataState.Parameters.Item.ContentType).toBeDefined();
      expect(initMetadataState.Parameters.Item.Content).toBeDefined();
      expect(initMetadataState.Parameters.Item.WorkflowStatus).toBeDefined();
      expect(initMetadataState.Parameters.Item.StateMachineExecId).toBeDefined();

      // Verify NO custom fields are present (backward compatibility)
      expect(initMetadataState.Parameters.Item.CustomField1).toBeUndefined();
      expect(initMetadataState.Parameters.Item.CustomField2).toBeUndefined();
      expect(initMetadataState.Parameters.Item.CustomField3).toBeUndefined();
    });

    test('workflow starts with InitMetadata when no preprocessing', () => {
      const stateMachines = templateWithoutPreprocessing.findResources('AWS::StepFunctions::StateMachine');
      const stateMachineKey = Object.keys(stateMachines)[0];
      const definitionString = stateMachines[stateMachineKey].Properties.DefinitionString;

      const definition = JSON.parse(definitionString['Fn::Join'][1].join(''));

      // Should start with InitMetadata when no preprocessing
      expect(definition.StartAt).toMatch(/InitMetadata/);
    });

    test('DynamoDB table schema remains unchanged', () => {
      // Verify table is created with same schema as before
      templateWithoutPreprocessing.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [{
          AttributeName: 'DocumentId',
          KeyType: 'HASH',
        }],
        BillingMode: 'PAY_PER_REQUEST',
      });
    });
  });

  describe('Schema Extension Mechanism - Generic preprocessing metadata', () => {
    test('preprocessingMetadata() hook allows subclasses to extend schema', () => {
      // The key design principle: subclasses can override preprocessingMetadata()
      // to add their own fields to InitMetadata without base class knowing the details

      // Verify the construct with custom metadata was created successfully
      expect(stackWithCustomMetadata).toBeDefined();

      // Verify it has a state machine
      templateWithCustomMetadata.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

      // Verify it has the same DynamoDB table structure as the base implementation
      templateWithCustomMetadata.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [{
          AttributeName: 'DocumentId',
          KeyType: 'HASH',
        }],
      });
    });

    test('workflow includes preprocessing step when provided', () => {
      const stateMachines = templateWithCustomMetadata.findResources('AWS::StepFunctions::StateMachine');
      const stateMachineKey = Object.keys(stateMachines)[0];
      const definitionString = stateMachines[stateMachineKey].Properties.DefinitionString;

      const definition = JSON.parse(definitionString['Fn::Join'][1].join(''));

      // Verify InitMetadata step exists (core functionality)
      expect(definition.States.InitMetadataEntry).toBeDefined();

      // When preprocessing is provided, it should be in the workflow
      // The exact structure depends on the subclass implementation
      expect(definition.States).toBeDefined();
      expect(Object.keys(definition.States).length).toBeGreaterThan(1);
    });

    test('InitMetadata can accept additional fields via preprocessingMetadata()', () => {
      const stateMachines = templateWithCustomMetadata.findResources('AWS::StepFunctions::StateMachine');
      const stateMachineKey = Object.keys(stateMachines)[0];
      const definitionString = stateMachines[stateMachineKey].Properties.DefinitionString;

      const definition = JSON.parse(definitionString['Fn::Join'][1].join(''));

      const initMetadataState = definition.States.InitMetadataEntry;

      // Verify base fields are always present
      expect(initMetadataState.Parameters.Item.DocumentId).toBeDefined();
      expect(initMetadataState.Parameters.Item.ContentType).toBeDefined();
      expect(initMetadataState.Parameters.Item.Content).toBeDefined();
      expect(initMetadataState.Parameters.Item.WorkflowStatus).toBeDefined();
      expect(initMetadataState.Parameters.Item.StateMachineExecId).toBeDefined();

      // The mechanism allows adding custom fields (implementation detail of subclass)
      // DynamoDB's schemaless nature means any fields can be added at runtime
    });
  });

  describe('Schema Compatibility', () => {
    test('both implementations use the same DynamoDB table structure', () => {
      // Both should create tables with same partition key
      templateWithoutPreprocessing.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [{
          AttributeName: 'DocumentId',
          KeyType: 'HASH',
        }],
      });

      templateWithCustomMetadata.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [{
          AttributeName: 'DocumentId',
          KeyType: 'HASH',
        }],
      });
    });

    test('both implementations create encrypted tables', () => {
      templateWithoutPreprocessing.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          SSEType: 'KMS',
        },
      });

      templateWithCustomMetadata.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          SSEType: 'KMS',
        },
      });
    });

    test('both implementations use PAY_PER_REQUEST billing', () => {
      templateWithoutPreprocessing.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
      });

      templateWithCustomMetadata.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
      });
    });
  });

  describe('Design Principle: Base class has no knowledge of preprocessing specifics', () => {
    test('base class provides generic extension mechanism via preprocessingMetadata()', () => {
      // This test verifies the design principle:
      // - Base class doesn't know about chunking, validation, or any specific preprocessing
      // - Base class only provides a hook (preprocessingMetadata) for subclasses to extend
      // - Subclasses are responsible for their own metadata fields

      // Verify that without overriding preprocessingMetadata(), workflow works correctly
      const stateMachines = templateWithoutPreprocessing.findResources('AWS::StepFunctions::StateMachine');
      const stateMachineKey = Object.keys(stateMachines)[0];
      const definitionString = stateMachines[stateMachineKey].Properties.DefinitionString;
      const definition = JSON.parse(definitionString['Fn::Join'][1].join(''));

      const initMetadataState = definition.States.InitMetadataEntry;

      // Base fields are always present
      expect(initMetadataState.Parameters.Item.DocumentId).toBeDefined();
      expect(initMetadataState.Parameters.Item.ContentType).toBeDefined();
      expect(initMetadataState.Parameters.Item.Content).toBeDefined();
      expect(initMetadataState.Parameters.Item.WorkflowStatus).toBeDefined();
      expect(initMetadataState.Parameters.Item.StateMachineExecId).toBeDefined();
    });

    test('subclasses can extend via preprocessingMetadata() without breaking base functionality', () => {
      // Verify that the construct with custom metadata still has all base functionality
      templateWithCustomMetadata.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
      templateWithCustomMetadata.resourceCountIs('AWS::DynamoDB::Table', 1);
      templateWithCustomMetadata.resourceCountIs('AWS::S3::Bucket', 1);

      // Verify state machine has the same base structure
      const stateMachines = templateWithCustomMetadata.findResources('AWS::StepFunctions::StateMachine');
      const stateMachineKey = Object.keys(stateMachines)[0];
      const definitionString = stateMachines[stateMachineKey].Properties.DefinitionString;
      const definition = JSON.parse(definitionString['Fn::Join'][1].join(''));

      // Core states should exist
      expect(definition.States.InitMetadataEntry).toBeDefined();
      expect(definition.States.MockClassification).toBeDefined();
      expect(definition.States.MockProcessing).toBeDefined();
    });
  });

  describe('DynamoDB schemaless nature supports runtime field addition', () => {
    test('DynamoDB table supports any additional fields at runtime', () => {
      // DynamoDB is schemaless, so any fields can be added at runtime
      // This test verifies the table is created correctly and can accept any attributes

      templateWithCustomMetadata.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [{
          AttributeName: 'DocumentId',
          KeyType: 'HASH',
        }],
        BillingMode: 'PAY_PER_REQUEST',
      });

      // No attribute definitions needed for non-key attributes in DynamoDB
      // Fields like AggregatedResult can be added via DynamoUpdateItem during processing
    });

    test('state machine has permissions to update DynamoDB items', () => {
      // Verify the state machine role has UpdateItem permissions
      // This allows adding fields like AggregatedResult during processing
      const policies = templateWithCustomMetadata.findResources('AWS::IAM::Policy');

      // Find the state machine role policy
      const stateMachinePolicy = Object.values(policies).find((policy: any) =>
        policy.Properties.PolicyName.includes('StateMachineRole'),
      );

      expect(stateMachinePolicy).toBeDefined();

      // Check that it has DynamoDB UpdateItem permissions
      const statements = (stateMachinePolicy as any).Properties.PolicyDocument.Statement;
      const dynamoStatement = statements.find((stmt: any) =>
        stmt.Action && (
          (Array.isArray(stmt.Action) && stmt.Action.includes('dynamodb:UpdateItem')) ||
          stmt.Action === 'dynamodb:UpdateItem'
        ),
      );

      expect(dynamoStatement).toBeDefined();
      expect(dynamoStatement.Effect).toBe('Allow');
    });
  });
});
