import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
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
    const systemPrompt = new Asset(basicStack, 'SystemPrompt', {
      path: __dirname + '/../resources/default-strands-agent',
    });
    new AgenticDocumentProcessing(basicStack, 'BasicTest', {
      processingAgentParameters: {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: {},
          systemPrompt,
        },
        prompt: 'Custom processing prompt',
      },
    });

    crossRegionStack = new Stack();
    const crossRegionPrompt = new Asset(crossRegionStack, 'SystemPrompt', {
      path: __dirname + '/../resources/default-strands-agent',
    });
    new AgenticDocumentProcessing(crossRegionStack, 'CrossRegionTest', {
      processingAgentParameters: {
        agentName: 'CrossRegionAgent',
        agentDefinition: {
          bedrockModel: { useCrossRegionInference: true },
          systemPrompt: crossRegionPrompt,
        },
        prompt: 'Test prompt',
      },
    });

    defaultModelStack = new Stack();
    const defaultPrompt = new Asset(defaultModelStack, 'SystemPrompt', {
      path: __dirname + '/../resources/default-strands-agent',
    });
    new AgenticDocumentProcessing(defaultModelStack, 'DefaultModelTest', {
      processingAgentParameters: {
        agentName: 'DefaultAgent',
        agentDefinition: {
          bedrockModel: { useCrossRegionInference: false },
          systemPrompt: defaultPrompt,
        },
        prompt: 'Test prompt',
      },
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
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            }),
          ]),
        },
        PolicyName: 'BedrockInvokePolicy',
      }],
    });
  });

  test('configures timeout and memory for processing function', () => {
    basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Timeout: 600,
      MemorySize: 1024,
    });
  });

  test('uses cross-region inference when enabled', () => {
    crossRegionTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          MODEL_ID: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        },
      },
    });
  });

  test('uses default model when cross-region inference is disabled', () => {
    defaultModelTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          MODEL_ID: 'anthropic.claude-sonnet-4-20250514-v1:0',
        },
      },
    });
  });
});
