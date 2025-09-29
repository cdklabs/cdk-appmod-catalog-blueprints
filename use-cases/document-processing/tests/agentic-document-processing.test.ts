import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AgenticDocumentProcessing } from '../agentic-document-processing';

describe('AgenticDocumentProcessing', () => {
  let basicStack: Stack;
  let crossRegionStack: Stack;
  let defaultModelStack: Stack;
  let basicTemplate: Template;
  let crossRegionTemplate: Template;
  let defaultModelTemplate: Template;

  beforeAll(() => {
    // Create all stacks and constructs first
    basicStack = new Stack();
    new AgenticDocumentProcessing(basicStack, 'BasicTest', {
      processingPrompt: 'Custom processing prompt',
      processingAgentParameters: {
        agentSystemPrompt: 'Test system prompt',
        toolsLocation: ['tool1', 'tool2'],
      },
    });

    crossRegionStack = new Stack();
    new AgenticDocumentProcessing(crossRegionStack, 'CrossRegionTest', {
      useCrossRegionInference: true,
    });

    defaultModelStack = new Stack();
    new AgenticDocumentProcessing(defaultModelStack, 'DefaultModelTest', {
      useCrossRegionInference: false,
    });

    // Generate templates once after all constructs are created
    basicTemplate = Template.fromStack(basicStack);
    crossRegionTemplate = Template.fromStack(crossRegionStack);
    defaultModelTemplate = Template.fromStack(defaultModelStack);
  });

  test('creates basic infrastructure', () => {
    basicTemplate.hasResourceProperties('AWS::S3::Bucket', {});
    basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
    basicTemplate.resourceCountIs('AWS::Lambda::Function', 5);
  });

  test('configures all agent parameters', () => {
    basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          SYSTEM_PROMPT: 'Test system prompt',
          TOOLS_CONFIG: '["tool1","tool2"]',
          PROMPT: 'Custom processing prompt',
        },
      },
    });
  });

  test('inherits bedrock document processing functionality', () => {
    basicTemplate.hasResourceProperties('AWS::S3::Bucket', {});
    basicTemplate.hasResourceProperties('AWS::DynamoDB::Table', {});
    basicTemplate.hasResourceProperties('AWS::SQS::Queue', {});
    basicTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {});
  });

  test('creates IAM role with correct permissions', () => {
    basicTemplate.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
        }],
      },
    });

    basicTemplate.hasResourceProperties('AWS::IAM::Role', {
      Policies: [{
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] },
                    '/*',
                  ],
                ],
              },
            },
            {
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              Resource: Match.anyValue(),
            },
          ],
        },
        PolicyName: 'BedrockInvokePolicy',
      }],
    });
  });

  test('configures timeout and memory for processing function', () => {
    basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Timeout: 300,
      MemorySize: 1024,
    });
  });

  test('uses cross-region inference when enabled', () => {
    crossRegionTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          MODEL_ID: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        },
      },
    });
  });

  test('uses default model when cross-region inference is disabled', () => {
    defaultModelTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          MODEL_ID: 'anthropic.claude-3-7-sonnet-20250219-v1:0',
        },
      },
    });
  });
});
