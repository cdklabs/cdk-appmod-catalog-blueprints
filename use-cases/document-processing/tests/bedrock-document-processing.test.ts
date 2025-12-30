import { Duration, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { BedrockCrossRegionInferencePrefix, DEFAULT_BEDROCK_MODEL } from '../../framework';
import { BedrockDocumentProcessing } from '../bedrock-document-processing';

describe('BedrockDocumentProcessing', () => {
  let defaultStack: Stack;
  let customStack: Stack;
  let crossRegionStack: Stack;
  let enrichmentStack: Stack;
  let postProcessingStack: Stack;
  let customPromptsStack: Stack;
  let customTimeoutStack: Stack;
  let defaultTemplate: Template;
  let customTemplate: Template;
  let crossRegionTemplate: Template;
  let enrichmentTemplate: Template;
  let postProcessingTemplate: Template;
  let customPromptsTemplate: Template;
  let customTimeoutTemplate: Template;

  beforeAll(() => {
    defaultStack = new Stack();
    new BedrockDocumentProcessing(defaultStack, 'DefaultTest', {});

    customStack = new Stack();
    new BedrockDocumentProcessing(customStack, 'CustomTest', {
      classificationBedrockModel: {
        fmModelId: FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_HAIKU_20240307_V1_0,
        useCrossRegionInference: false,
      },
      processingBedrockModel: {
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

    enrichmentStack = new Stack();
    const enrichmentFn = new Function(enrichmentStack, 'EnrichmentFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ enriched: true });'),
    });
    new BedrockDocumentProcessing(enrichmentStack, 'EnrichmentTest', {
      enrichmentLambdaFunction: enrichmentFn,
    });

    postProcessingStack = new Stack();
    const postProcessingFn = new Function(postProcessingStack, 'PostProcessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ processed: true });'),
    });
    new BedrockDocumentProcessing(postProcessingStack, 'PostProcessingTest', {
      postProcessingLambdaFunction: postProcessingFn,
    });

    customPromptsStack = new Stack();
    new BedrockDocumentProcessing(customPromptsStack, 'CustomPromptsTest', {
      classificationPrompt: 'Custom classification prompt',
      processingPrompt: 'Custom processing prompt',
    });

    customTimeoutStack = new Stack();
    new BedrockDocumentProcessing(customTimeoutStack, 'CustomTimeoutTest', {
      stepTimeouts: Duration.minutes(10),
    });

    defaultTemplate = Template.fromStack(defaultStack);
    customTemplate = Template.fromStack(customStack);
    crossRegionTemplate = Template.fromStack(crossRegionStack);
    enrichmentTemplate = Template.fromStack(enrichmentStack);
    postProcessingTemplate = Template.fromStack(postProcessingStack);
    customPromptsTemplate = Template.fromStack(customPromptsStack);
    customTimeoutTemplate = Template.fromStack(customTimeoutStack);
  });

  describe('Basic infrastructure', () => {
    test('creates basic infrastructure', () => {
      defaultTemplate.hasResourceProperties('AWS::S3::Bucket', {});
      defaultTemplate.hasResourceProperties('AWS::SQS::Queue', {});
      defaultTemplate.hasResourceProperties('AWS::DynamoDB::Table', { BillingMode: 'PAY_PER_REQUEST' });
      defaultTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {});
      defaultTemplate.resourceCountIs('AWS::Lambda::Function', 5);
    });

    test('creates classification and processing Lambda functions', () => {
      defaultTemplate.resourceCountIs('AWS::Lambda::Function', 5);
    });
  });

  describe('Model configuration', () => {
    test('uses default model with cross-region prefix disabled', () => {
      defaultTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            MODEL_ID: DEFAULT_BEDROCK_MODEL.modelId,
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
            MODEL_ID: `eu.${DEFAULT_BEDROCK_MODEL.modelId}`,
          },
        },
      });
    });

    test('configures different models for classification and processing', () => {
      customTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
            INVOKE_TYPE: 'classification',
          },
        },
      });
      customTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
            INVOKE_TYPE: 'processing',
          },
        },
      });
    });
  });

  describe('IAM permissions', () => {
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

    test('grants Bedrock invoke permissions', () => {
      defaultTemplate.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                  Effect: 'Allow',
                }),
              ]),
            },
          }),
        ]),
      });
    });

    test('grants S3 access permissions', () => {
      defaultTemplate.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: Match.arrayWith(['s3:GetObject']),
                  Effect: 'Allow',
                }),
              ]),
            },
          }),
        ]),
      });
    });
  });

  describe('Optional workflow steps', () => {
    test('includes enrichment Lambda when provided', () => {
      enrichmentTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
      });
      enrichmentTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });

    test('includes post-processing Lambda when provided', () => {
      postProcessingTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
      });
      postProcessingTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });
  });

  describe('Custom configuration', () => {
    test('uses custom classification prompt', () => {
      customPromptsTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            PROMPT: 'Custom classification prompt',
            INVOKE_TYPE: 'classification',
          },
        },
      });
    });

    test('uses custom processing prompt', () => {
      customPromptsTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            PROMPT: 'Custom processing prompt',
            INVOKE_TYPE: 'processing',
          },
        },
      });
    });

    test('configures custom step timeout', () => {
      customTimeoutTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 600,
      });
    });
  });

  describe('Lambda configuration', () => {
    test('configures Lambda memory and timeout', () => {
      defaultTemplate.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 512,
        Timeout: 300,
      });
    });

    test('sets correct invoke type for classification', () => {
      defaultTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            INVOKE_TYPE: 'classification',
          },
        },
      });
    });

    test('sets correct invoke type for processing', () => {
      defaultTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            INVOKE_TYPE: 'processing',
          },
        },
      });
    });
  });
});
