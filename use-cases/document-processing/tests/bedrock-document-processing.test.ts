import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { BedrockCrossRegionInferencePrefix } from '../../framework';
import { BedrockDocumentProcessing } from '../bedrock-document-processing';

describe('BedrockDocumentProcessing', () => {
  let defaultStack: Stack;
  let customStack: Stack;
  let crossRegionStack: Stack;
  let defaultTemplate: Template;
  let customTemplate: Template;
  let crossRegionTemplate: Template;

  beforeAll(() => {
    // Create all stacks and constructs first
    defaultStack = new Stack();
    new BedrockDocumentProcessing(defaultStack, 'DefaultTest', {});

    customStack = new Stack();
    new BedrockDocumentProcessing(customStack, 'CustomTest', {
      classificationBedrockModel: {
        fmModelId: FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_HAIKU_20240307_V1_0,
        useCrossRegionInference: false,
      },
    });

    crossRegionStack = new Stack();
    new BedrockDocumentProcessing(crossRegionStack, 'CrossRegionTest', {
      classificationBedrockModel: {
        useCrossRegionInference: true,
        crossRegionInferencePrefix: BedrockCrossRegionInferencePrefix.EU,
      },
    });

    // Generate templates once after all constructs are created
    defaultTemplate = Template.fromStack(defaultStack);
    customTemplate = Template.fromStack(customStack);
    crossRegionTemplate = Template.fromStack(crossRegionStack);
  });

  test('creates basic infrastructure', () => {
    defaultTemplate.hasResourceProperties('AWS::S3::Bucket', {});
    defaultTemplate.hasResourceProperties('AWS::SQS::Queue', {});
    defaultTemplate.hasResourceProperties('AWS::DynamoDB::Table', { BillingMode: 'PAY_PER_REQUEST' });
    defaultTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {});
    defaultTemplate.resourceCountIs('AWS::Lambda::Function', 5);
  });

  test('uses default model with cross-region prefix disabled', () => {
    defaultTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          MODEL_ID: 'anthropic.claude-sonnet-4-20250514-v1:0',
        },
      },
    });
  });

  test('uses custom model without cross-region prefix', () => {
    customTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
        },
      },
    });
  });

  test('configures custom cross-region prefix', () => {
    crossRegionTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          MODEL_ID: 'eu.anthropic.claude-sonnet-4-20250514-v1:0',
        },
      },
    });
  });

  test('creates bedrock permissions', () => {
    defaultTemplate.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { Service: 'lambda.amazonaws.com' },
        }],
      },
    });
  });
});
