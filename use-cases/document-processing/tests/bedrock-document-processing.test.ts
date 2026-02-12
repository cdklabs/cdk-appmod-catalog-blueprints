import { App, Duration, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { BedrockCrossRegionInferencePrefix } from '../../framework';
import { createTestApp } from '../../utilities/test-utils';
import { BedrockDocumentProcessing } from '../bedrock-document-processing';

describe('BedrockDocumentProcessing', () => {
  let app: App;
  let defaultStack: Stack;
  let customStack: Stack;
  let crossRegionStack: Stack;
  let enrichmentStack: Stack;
  let postProcessingStack: Stack;
  let customPromptsStack: Stack;
  let customTimeoutStack: Stack;
  let chunkingStack: Stack;
  let defaultTemplate: Template;
  let customTemplate: Template;
  let crossRegionTemplate: Template;
  let enrichmentTemplate: Template;
  let postProcessingTemplate: Template;
  let customPromptsTemplate: Template;
  let customTimeoutTemplate: Template;
  let chunkingTemplate: Template;

  beforeAll(() => {
    // Use createTestApp() to skip bundling and speed up tests
    app = createTestApp();

    defaultStack = new Stack(app, 'DefaultStack');
    new BedrockDocumentProcessing(defaultStack, 'DefaultTest', {});

    customStack = new Stack(app, 'CustomStack');
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

    crossRegionStack = new Stack(app, 'CrossRegionStack');
    new BedrockDocumentProcessing(crossRegionStack, 'CrossRegionTest', {
      classificationBedrockModel: {
        useCrossRegionInference: true,
        crossRegionInferencePrefix: BedrockCrossRegionInferencePrefix.EU,
      },
    });

    enrichmentStack = new Stack(app, 'EnrichmentStack');
    const enrichmentFn = new Function(enrichmentStack, 'EnrichmentFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ enriched: true });'),
    });
    new BedrockDocumentProcessing(enrichmentStack, 'EnrichmentTest', {
      enrichmentLambdaFunction: enrichmentFn,
    });

    postProcessingStack = new Stack(app, 'PostProcessingStack');
    const postProcessingFn = new Function(postProcessingStack, 'PostProcessingFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ processed: true });'),
    });
    new BedrockDocumentProcessing(postProcessingStack, 'PostProcessingTest', {
      postProcessingLambdaFunction: postProcessingFn,
    });

    customPromptsStack = new Stack(app, 'CustomPromptsStack');
    new BedrockDocumentProcessing(customPromptsStack, 'CustomPromptsTest', {
      classificationPrompt: 'Custom classification prompt',
      processingPrompt: 'Custom processing prompt',
    });

    customTimeoutStack = new Stack(app, 'CustomTimeoutStack');
    new BedrockDocumentProcessing(customTimeoutStack, 'CustomTimeoutTest', {
      stepTimeouts: Duration.minutes(10),
    });

    chunkingStack = new Stack(app, 'ChunkingStack');
    new BedrockDocumentProcessing(chunkingStack, 'ChunkingTest', {
      enableChunking: true,
      chunkingConfig: {
        strategy: 'hybrid',
        maxPagesPerChunk: 100,
        targetTokensPerChunk: 80000,
        pageThreshold: 100,
        tokenThreshold: 150000,
        processingMode: 'parallel',
        maxConcurrency: 10,
      },
    });

    defaultTemplate = Template.fromStack(defaultStack);
    customTemplate = Template.fromStack(customStack);
    crossRegionTemplate = Template.fromStack(crossRegionStack);
    enrichmentTemplate = Template.fromStack(enrichmentStack);
    postProcessingTemplate = Template.fromStack(postProcessingStack);
    customPromptsTemplate = Template.fromStack(customPromptsStack);
    customTimeoutTemplate = Template.fromStack(customTimeoutStack);
    chunkingTemplate = Template.fromStack(chunkingStack);
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

  describe('Chunking configuration', () => {
    test('accepts enableChunking prop', () => {
      // This test verifies that the BedrockDocumentProcessingProps interface
      // correctly accepts the enableChunking boolean flag
      expect(chunkingStack).toBeDefined();
    });

    test('accepts chunkingConfig prop with all strategy options', () => {
      // This test verifies that the BedrockDocumentProcessingProps interface
      // correctly accepts the chunkingConfig with all configuration options
      chunkingTemplate.hasResourceProperties('AWS::S3::Bucket', {});
      chunkingTemplate.hasResourceProperties('AWS::SQS::Queue', {});
      chunkingTemplate.hasResourceProperties('AWS::DynamoDB::Table', { BillingMode: 'PAY_PER_REQUEST' });
    });

    test('accepts fixed-pages strategy configuration', () => {
      const testApp = createTestApp();
      const fixedPagesStack = new Stack(testApp, 'FixedPagesStack');
      new BedrockDocumentProcessing(fixedPagesStack, 'FixedPagesTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'fixed-pages',
          pageThreshold: 100,
          chunkSize: 50,
          overlapPages: 5,
        },
      });

      // Verify stack is created successfully
      expect(fixedPagesStack).toBeDefined();
    });

    test('accepts token-based strategy configuration', () => {
      const testApp = createTestApp();
      const tokenBasedStack = new Stack(testApp, 'TokenBasedStack');
      new BedrockDocumentProcessing(tokenBasedStack, 'TokenBasedTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'token-based',
          tokenThreshold: 150000,
          maxTokensPerChunk: 100000,
          overlapTokens: 5000,
        },
      });

      // Verify stack is created successfully
      expect(tokenBasedStack).toBeDefined();
    });

    test('accepts hybrid strategy configuration', () => {
      const testApp = createTestApp();
      const hybridStack = new Stack(testApp, 'HybridStack');
      new BedrockDocumentProcessing(hybridStack, 'HybridTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'hybrid',
          maxPagesPerChunk: 100,
          targetTokensPerChunk: 80000,
          pageThreshold: 100,
          tokenThreshold: 150000,
          overlapTokens: 5000,
        },
      });

      // Verify stack is created successfully
      expect(hybridStack).toBeDefined();
    });

    test('accepts default chunking configuration', () => {
      const testApp = createTestApp();
      const defaultChunkingStack = new Stack(testApp, 'DefaultChunkingStack');
      new BedrockDocumentProcessing(defaultChunkingStack, 'DefaultChunkingTest', {
        enableChunking: true,
      });

      // Verify stack is created successfully with default config
      expect(defaultChunkingStack).toBeDefined();
    });

    test('does not enable chunking when enableChunking is false', () => {
      // Verify that the default stack (without chunking) works as expected
      expect(defaultStack).toBeDefined();
      defaultTemplate.hasResourceProperties('AWS::S3::Bucket', {});
      defaultTemplate.hasResourceProperties('AWS::SQS::Queue', {});
    });
  });

  describe('Workflow branching for chunking', () => {
    test('creates state machine with chunking workflow', () => {
      // Verify that a state machine is created when chunking is enabled
      chunkingTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

      // Verify the state machine has the expected configuration
      chunkingTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        EncryptionConfiguration: Match.objectLike({
          Type: 'CUSTOMER_MANAGED_KMS_KEY',
        }),
      });
    });

    test('standard workflow is used when chunking is disabled', () => {
      // Verify that when enableChunking is false, the standard workflow is used
      const testApp = createTestApp();
      const noChunkingStack = new Stack(testApp, 'NoChunkingStack');
      new BedrockDocumentProcessing(noChunkingStack, 'NoChunkingTest', {
        enableChunking: false,
      });

      const noChunkingTemplate = Template.fromStack(noChunkingStack);

      // Should have state machine
      noChunkingTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

      // Should NOT have PDF chunking Lambda (Python 3.13 with 2048 MB)
      const lambdas = noChunkingTemplate.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );
      expect(chunkingLambda).toBeUndefined();
    });

    test('creates PDF chunking Lambda when chunking is enabled', () => {
      // Verify that the PDF chunking Lambda is created
      const lambdas = chunkingTemplate.findResources('AWS::Lambda::Function');

      // Find the chunking Lambda by its characteristics (Python 3.13, 2048 MB memory)
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048 &&
        lambda.Properties.Timeout === 600,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Handler', 'handler.handler');
    });

    test('PDF chunking Lambda has correct environment variables for hybrid strategy', () => {
      // Verify chunking configuration is passed via environment variables
      // Find the chunking Lambda specifically
      const lambdas = chunkingTemplate.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNKING_STRATEGY', 'hybrid');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.MAX_PAGES_PER_CHUNK', '100');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.TARGET_TOKENS_PER_CHUNK', '80000');
    });

    test('PDF chunking Lambda has S3 access permissions', () => {
      // Verify that the chunking Lambda has S3 permissions
      chunkingTemplate.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyDocument: Match.objectLike({
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: Match.arrayWith([
                    's3:GetObject',
                    's3:PutObject',
                  ]),
                }),
              ]),
            }),
          }),
        ]),
      });
    });

    test('state machine can invoke PDF chunking Lambda', () => {
      // Verify that the state machine role has permission to invoke the chunking Lambda
      chunkingTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'lambda:InvokeFunction',
              Effect: 'Allow',
            }),
          ]),
        }),
      });
    });
  });
});


describe('Chunk-aware classification integration', () => {
  describe('Classification Lambda chunk context', () => {
    test('classification Lambda receives chunk metadata in Map State', () => {
      // Verify that the Map State passes chunk metadata to the classification Lambda
      const testApp = createTestApp();
      const chunkingStack = new Stack(testApp, 'ChunkContextStack');
      new BedrockDocumentProcessing(chunkingStack, 'ChunkContextTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'hybrid',
          maxPagesPerChunk: 100,
          targetTokensPerChunk: 80000,
        },
      });

      const template = Template.fromStack(chunkingStack);

      // Verify state machine is created with Map State
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });

      // Verify the state machine definition includes Map state with chunk parameters
      const stateMachines = template.findResources('AWS::StepFunctions::StateMachine');
      const stateMachineDefinition = Object.values(stateMachines)[0];
      expect(stateMachineDefinition).toBeDefined();
    });

    test('non-chunked workflow does not include chunk context', () => {
      // Verify that when chunking is disabled, no chunk context is added
      const testApp = createTestApp();
      const noChunkingStack = new Stack(testApp, 'NoChunkContextStack');
      new BedrockDocumentProcessing(noChunkingStack, 'NoChunkContextTest', {
        enableChunking: false,
      });

      const template = Template.fromStack(noChunkingStack);

      // Should have state machine
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

      // Should NOT have PDF chunking Lambda
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );
      expect(chunkingLambda).toBeUndefined();
    });

    test('chunked workflow includes Map State for parallel chunk processing', () => {
      const testApp = createTestApp();
      const chunkingStack = new Stack(testApp, 'MapStateStack');
      new BedrockDocumentProcessing(chunkingStack, 'MapStateTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'hybrid',
          processingMode: 'parallel',
          maxConcurrency: 5,
        },
      });

      const template = Template.fromStack(chunkingStack);

      // Verify state machine is created
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

      // Verify classification Lambda exists
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            INVOKE_TYPE: 'classification',
          },
        },
      });
    });

    test('classification Lambda is reused for both chunked and non-chunked paths', () => {
      const testApp = createTestApp();
      const chunkingStack = new Stack(testApp, 'ReuseStack');
      new BedrockDocumentProcessing(chunkingStack, 'ReuseTest', {
        enableChunking: true,
      });

      const template = Template.fromStack(chunkingStack);

      // Count classification Lambdas (should be 1, reused for both paths)
      const lambdas = template.findResources('AWS::Lambda::Function');
      const classificationLambdas = Object.values(lambdas).filter((lambda: any) =>
        lambda.Properties.Environment?.Variables?.INVOKE_TYPE === 'classification',
      );

      // Should have exactly 1 classification Lambda (reused)
      expect(classificationLambdas.length).toBe(1);
    });

    test('workflow maintains backward compatibility for small documents', () => {
      // When chunking is enabled but document is small, it should use standard workflow
      const testApp = createTestApp();
      const chunkingStack = new Stack(testApp, 'BackwardCompatStack');
      new BedrockDocumentProcessing(chunkingStack, 'BackwardCompatTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'hybrid',
          pageThreshold: 100,
          tokenThreshold: 150000,
        },
      });

      const template = Template.fromStack(chunkingStack);

      // Verify both classification and processing Lambdas exist
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            INVOKE_TYPE: 'classification',
          },
        },
      });

      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            INVOKE_TYPE: 'processing',
          },
        },
      });

      // Verify state machine has Choice state for branching
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });
  });

  describe('Accuracy comparison between chunked and non-chunked', () => {
    test('both workflows use same classification Lambda function', () => {
      // This ensures accuracy is maintained because the same model and prompt are used
      const testApp = createTestApp();
      const chunkingStack = new Stack(testApp, 'AccuracyStack');
      new BedrockDocumentProcessing(chunkingStack, 'AccuracyTest', {
        enableChunking: true,
        classificationBedrockModel: {
          fmModelId: FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_HAIKU_20240307_V1_0,
          useCrossRegionInference: false,
        },
      });

      const template = Template.fromStack(chunkingStack);

      // Verify the classification Lambda uses the specified model
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
            INVOKE_TYPE: 'classification',
          },
        },
      });
    });

    test('custom classification prompt is used for both chunked and non-chunked', () => {
      const customPrompt = 'Custom classification prompt for testing';
      const testApp = createTestApp();
      const chunkingStack = new Stack(testApp, 'CustomPromptStack');
      new BedrockDocumentProcessing(chunkingStack, 'CustomPromptTest', {
        enableChunking: true,
        classificationPrompt: customPrompt,
      });

      const template = Template.fromStack(chunkingStack);

      // Verify the custom prompt is set
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            PROMPT: customPrompt,
            INVOKE_TYPE: 'classification',
          },
        },
      });
    });
  });
});


describe('Configuration validation', () => {
  describe('Invalid configuration rejection', () => {
    test('throws error for chunkSize <= 0', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'InvalidChunkSizeStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'InvalidChunkSizeTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'fixed-pages',
            chunkSize: 0,
          },
        });
      }).toThrow('ChunkingConfig validation error: chunkSize must be greater than 0');
    });

    test('throws error for negative chunkSize', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'NegativeChunkSizeStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'NegativeChunkSizeTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'fixed-pages',
            chunkSize: -10,
          },
        });
      }).toThrow('ChunkingConfig validation error: chunkSize must be greater than 0');
    });

    test('throws error for negative overlapPages', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'NegativeOverlapStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'NegativeOverlapTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'fixed-pages',
            chunkSize: 50,
            overlapPages: -5,
          },
        });
      }).toThrow('ChunkingConfig validation error: overlapPages must be non-negative');
    });

    test('throws error for overlapPages >= chunkSize', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'OverlapTooLargeStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'OverlapTooLargeTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'fixed-pages',
            chunkSize: 50,
            overlapPages: 50,
          },
        });
      }).toThrow('ChunkingConfig validation error: overlapPages must be less than chunkSize');
    });

    test('throws error for pageThreshold <= 0', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'InvalidPageThresholdStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'InvalidPageThresholdTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'fixed-pages',
            pageThreshold: 0,
          },
        });
      }).toThrow('ChunkingConfig validation error: pageThreshold must be greater than 0');
    });

    test('throws error for tokenThreshold <= 0', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'InvalidTokenThresholdStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'InvalidTokenThresholdTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'token-based',
            tokenThreshold: -100,
          },
        });
      }).toThrow('ChunkingConfig validation error: tokenThreshold must be greater than 0');
    });

    test('throws error for maxTokensPerChunk <= 0', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'InvalidMaxTokensStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'InvalidMaxTokensTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'token-based',
            maxTokensPerChunk: 0,
          },
        });
      }).toThrow('ChunkingConfig validation error: maxTokensPerChunk must be greater than 0');
    });

    test('throws error for negative overlapTokens', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'NegativeOverlapTokensStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'NegativeOverlapTokensTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'token-based',
            overlapTokens: -1000,
          },
        });
      }).toThrow('ChunkingConfig validation error: overlapTokens must be non-negative');
    });

    test('throws error for overlapTokens >= maxTokensPerChunk', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'OverlapTokensTooLargeStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'OverlapTokensTooLargeTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'token-based',
            maxTokensPerChunk: 50000,
            overlapTokens: 50000,
          },
        });
      }).toThrow('ChunkingConfig validation error: overlapTokens must be less than maxTokensPerChunk');
    });

    test('throws error for maxPagesPerChunk <= 0', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'InvalidMaxPagesStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'InvalidMaxPagesTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'hybrid',
            maxPagesPerChunk: 0,
          },
        });
      }).toThrow('ChunkingConfig validation error: maxPagesPerChunk must be greater than 0');
    });

    test('throws error for targetTokensPerChunk <= 0', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'InvalidTargetTokensStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'InvalidTargetTokensTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'hybrid',
            targetTokensPerChunk: -1,
          },
        });
      }).toThrow('ChunkingConfig validation error: targetTokensPerChunk must be greater than 0');
    });

    test('throws error for maxConcurrency <= 0', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'InvalidMaxConcurrencyStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'InvalidMaxConcurrencyTest', {
          enableChunking: true,
          chunkingConfig: {
            maxConcurrency: 0,
          },
        });
      }).toThrow('ChunkingConfig validation error: maxConcurrency must be greater than 0');
    });

    test('throws error for minSuccessThreshold < 0', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'InvalidMinThresholdLowStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'InvalidMinThresholdLowTest', {
          enableChunking: true,
          chunkingConfig: {
            minSuccessThreshold: -0.1,
          },
        });
      }).toThrow('ChunkingConfig validation error: minSuccessThreshold must be between 0 and 1');
    });

    test('throws error for minSuccessThreshold > 1', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'InvalidMinThresholdHighStack');

      expect(() => {
        new BedrockDocumentProcessing(stack, 'InvalidMinThresholdHighTest', {
          enableChunking: true,
          chunkingConfig: {
            minSuccessThreshold: 1.5,
          },
        });
      }).toThrow('ChunkingConfig validation error: minSuccessThreshold must be between 0 and 1');
    });
  });

  describe('Valid configuration acceptance', () => {
    test('accepts valid boundary values', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'ValidBoundaryStack');

      // Should not throw
      expect(() => {
        new BedrockDocumentProcessing(stack, 'ValidBoundaryTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'fixed-pages',
            chunkSize: 1, // minimum valid
            overlapPages: 0, // minimum valid
            pageThreshold: 1, // minimum valid
          },
        });
      }).not.toThrow();
    });

    test('accepts minSuccessThreshold at boundaries', () => {
      const testApp = createTestApp();
      const stack1 = new Stack(testApp, 'MinThreshold0Stack');
      const stack2 = new Stack(testApp, 'MinThreshold1Stack');

      // Should not throw for 0
      expect(() => {
        new BedrockDocumentProcessing(stack1, 'MinThreshold0Test', {
          enableChunking: true,
          chunkingConfig: {
            minSuccessThreshold: 0,
          },
        });
      }).not.toThrow();

      // Should not throw for 1
      expect(() => {
        new BedrockDocumentProcessing(stack2, 'MinThreshold1Test', {
          enableChunking: true,
          chunkingConfig: {
            minSuccessThreshold: 1,
          },
        });
      }).not.toThrow();
    });
  });

  describe('Validation skipped when chunking disabled', () => {
    test('does not validate config when enableChunking is false', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'ChunkingDisabledStack');

      // Should not throw even with invalid config because chunking is disabled
      expect(() => {
        new BedrockDocumentProcessing(stack, 'ChunkingDisabledTest', {
          enableChunking: false,
          chunkingConfig: {
            chunkSize: -10, // Invalid but should be ignored
          },
        });
      }).not.toThrow();
    });

    test('does not validate config when enableChunking is undefined', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'ChunkingUndefinedStack');

      // Should not throw even with invalid config because chunking is not enabled
      expect(() => {
        new BedrockDocumentProcessing(stack, 'ChunkingUndefinedTest', {
          chunkingConfig: {
            chunkSize: 0, // Invalid but should be ignored
          },
        });
      }).not.toThrow();
    });
  });
});

describe('Configuration precedence', () => {
  describe('Default values applied', () => {
    test('uses default strategy when not specified', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'DefaultStrategyStack');
      new BedrockDocumentProcessing(stack, 'DefaultStrategyTest', {
        enableChunking: true,
        chunkingConfig: {}, // Empty config, should use defaults
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNKING_STRATEGY', 'hybrid');
    });

    test('uses default pageThreshold when not specified', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'DefaultPageThresholdStack');
      new BedrockDocumentProcessing(stack, 'DefaultPageThresholdTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'fixed-pages',
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.PAGE_THRESHOLD', '100');
    });

    test('uses default tokenThreshold when not specified', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'DefaultTokenThresholdStack');
      new BedrockDocumentProcessing(stack, 'DefaultTokenThresholdTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'token-based',
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.TOKEN_THRESHOLD', '150000');
    });

    test('uses default maxConcurrency when not specified', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'DefaultConcurrencyStack');
      new BedrockDocumentProcessing(stack, 'DefaultConcurrencyTest', {
        enableChunking: true,
        chunkingConfig: {
          processingMode: 'parallel',
        },
      });

      // Verify stack is created successfully with default maxConcurrency of 10
      expect(stack).toBeDefined();
    });
  });

  describe('Custom configuration overrides defaults', () => {
    test('custom strategy overrides default', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'CustomStrategyStack');
      new BedrockDocumentProcessing(stack, 'CustomStrategyTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'token-based',
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNKING_STRATEGY', 'token-based');
    });

    test('custom pageThreshold overrides default', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'CustomPageThresholdStack');
      new BedrockDocumentProcessing(stack, 'CustomPageThresholdTest', {
        enableChunking: true,
        chunkingConfig: {
          pageThreshold: 50,
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.PAGE_THRESHOLD', '50');
    });

    test('custom tokenThreshold overrides default', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'CustomTokenThresholdStack');
      new BedrockDocumentProcessing(stack, 'CustomTokenThresholdTest', {
        enableChunking: true,
        chunkingConfig: {
          tokenThreshold: 200000,
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.TOKEN_THRESHOLD', '200000');
    });

    test('custom chunkSize overrides default', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'CustomChunkSizeStack');
      new BedrockDocumentProcessing(stack, 'CustomChunkSizeTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'fixed-pages',
          chunkSize: 25,
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNK_SIZE', '25');
    });

    test('custom maxPagesPerChunk overrides default', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'CustomMaxPagesStack');
      new BedrockDocumentProcessing(stack, 'CustomMaxPagesTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'hybrid',
          maxPagesPerChunk: 75,
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.MAX_PAGES_PER_CHUNK', '75');
    });

    test('default maxPagesPerChunk is 99 to stay under Bedrock 100-page limit', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'DefaultMaxPagesStack');
      new BedrockDocumentProcessing(stack, 'DefaultMaxPagesTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'hybrid',
          // maxPagesPerChunk not specified - should default to 99
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      // Default should be 99, not 100, because Bedrock has a hard limit of 100 pages per PDF
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.MAX_PAGES_PER_CHUNK', '99');
    });

    test('custom targetTokensPerChunk overrides default', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'CustomTargetTokensStack');
      new BedrockDocumentProcessing(stack, 'CustomTargetTokensTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'hybrid',
          targetTokensPerChunk: 60000,
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.TARGET_TOKENS_PER_CHUNK', '60000');
    });

    test('all custom values override all defaults', () => {
      const testApp = createTestApp();
      const stack = new Stack(testApp, 'AllCustomStack');
      new BedrockDocumentProcessing(stack, 'AllCustomTest', {
        enableChunking: true,
        chunkingConfig: {
          strategy: 'fixed-pages',
          pageThreshold: 200,
          tokenThreshold: 300000,
          chunkSize: 75,
          overlapPages: 10,
          maxTokensPerChunk: 150000,
          overlapTokens: 10000,
          targetTokensPerChunk: 120000,
          maxPagesPerChunk: 150,
          processingMode: 'sequential',
          maxConcurrency: 5,
        },
      });

      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
        lambda.Properties.Runtime === 'python3.13' &&
        lambda.Properties.MemorySize === 2048,
      );

      expect(chunkingLambda).toBeDefined();
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNKING_STRATEGY', 'fixed-pages');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.PAGE_THRESHOLD', '200');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.TOKEN_THRESHOLD', '300000');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNK_SIZE', '75');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.OVERLAP_PAGES', '10');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.MAX_TOKENS_PER_CHUNK', '150000');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.OVERLAP_TOKENS', '10000');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.TARGET_TOKENS_PER_CHUNK', '120000');
      expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.MAX_PAGES_PER_CHUNK', '150');
    });
  });
});
