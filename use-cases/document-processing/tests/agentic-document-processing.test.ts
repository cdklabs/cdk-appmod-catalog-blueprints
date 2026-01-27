import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { createTestApp } from '../../utilities/test-utils';
import { AgenticDocumentProcessing } from '../agentic-document-processing';
import { BedrockDocumentProcessing } from '../bedrock-document-processing';

describe('AgenticDocumentProcessing', () => {
  let app: App;
  let basicStack: Stack;
  let crossRegionStack: Stack;
  let defaultModelStack: Stack;
  let basicTemplate: Template;
  let crossRegionTemplate: Template;
  let defaultModelTemplate: Template;

  beforeAll(() => {
    // Use createTestApp() to skip bundling and speed up tests
    app = createTestApp();

    basicStack = new Stack(app, 'BasicStack');
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

    crossRegionStack = new Stack(app, 'CrossRegionStack');
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

    defaultModelStack = new Stack(app, 'DefaultModelStack');
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

    basicTemplate = Template.fromStack(basicStack);
    crossRegionTemplate = Template.fromStack(crossRegionStack);
    defaultModelTemplate = Template.fromStack(defaultModelStack);
  });

  describe('Basic infrastructure', () => {
    test('creates basic infrastructure', () => {
      basicTemplate.hasResourceProperties('AWS::S3::Bucket', {});
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'python3.13',
      });
      basicTemplate.resourceCountIs('AWS::Lambda::Function', 5);
    });

    test('inherits bedrock document processing functionality', () => {
      basicTemplate.hasResourceProperties('AWS::S3::Bucket', {});
      basicTemplate.hasResourceProperties('AWS::DynamoDB::Table', {});
      basicTemplate.hasResourceProperties('AWS::SQS::Queue', {});
      basicTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {});
    });
  });

  describe('Agent configuration', () => {
    test('configures all agent parameters', () => {
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            PROMPT: 'Custom processing prompt',
          },
        },
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

  describe('IAM permissions', () => {
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

    test('grants S3 access to agent function', () => {
      basicTemplate.hasResourceProperties('AWS::IAM::Role', {
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

  describe('State machine integration', () => {
    test('integrates agent as processing step in workflow', () => {
      basicTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.objectLike({
          'Fn::Join': Match.arrayWith(['']),
        }),
      });
    });

    test('creates state machine with encryption', () => {
      basicTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        EncryptionConfiguration: Match.objectLike({
          Type: 'CUSTOMER_MANAGED_KMS_KEY',
        }),
      });
    });
  });

  describe('Resource counts', () => {
    test('creates expected number of Lambda functions', () => {
      basicTemplate.resourceCountIs('AWS::Lambda::Function', 5);
    });

    test('creates single state machine', () => {
      basicTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });
  });

  describe('Chunking inheritance from BedrockDocumentProcessing', () => {
    describe('preprocessingStep() inheritance', () => {
      test('inherits preprocessingStep() from BedrockDocumentProcessing', () => {
        // Verify that AgenticDocumentProcessing extends BedrockDocumentProcessing
        // and inherits the preprocessingStep() method
        const testApp = createTestApp();
        const chunkingStack = new Stack(testApp, 'AgenticChunkingStack');
        const systemPrompt = new Asset(chunkingStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        const agenticProcessor = new AgenticDocumentProcessing(chunkingStack, 'AgenticChunkingTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'hybrid',
            maxPagesPerChunk: 100,
            targetTokensPerChunk: 80000,
            pageThreshold: 100,
            tokenThreshold: 150000,
          },
          processingAgentParameters: {
            agentName: 'ChunkingTestAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Test prompt',
          },
        });

        // Verify the construct is created successfully
        expect(agenticProcessor).toBeDefined();

        const template = Template.fromStack(chunkingStack);

        // Verify PDF chunking Lambda is created (inherited from BedrockDocumentProcessing)
        const lambdas = template.findResources('AWS::Lambda::Function');
        const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
          lambda.Properties.Runtime === 'python3.13' &&
          lambda.Properties.MemorySize === 2048 &&
          lambda.Properties.Timeout === 600,
        );

        expect(chunkingLambda).toBeDefined();
        expect(chunkingLambda).toHaveProperty('Properties.Handler', 'handler.handler');
      });

      test('preprocessingStep() returns undefined when chunking is disabled', () => {
        // Verify that when enableChunking is false, no chunking Lambda is created
        const testApp = createTestApp();
        const noChunkingStack = new Stack(testApp, 'AgenticNoChunkingStack');
        const systemPrompt = new Asset(noChunkingStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        new AgenticDocumentProcessing(noChunkingStack, 'AgenticNoChunkingTest', {
          enableChunking: false,
          processingAgentParameters: {
            agentName: 'NoChunkingAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Test prompt',
          },
        });

        const template = Template.fromStack(noChunkingStack);

        // Verify NO PDF chunking Lambda is created
        const lambdas = template.findResources('AWS::Lambda::Function');
        const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
          lambda.Properties.Runtime === 'python3.13' &&
          lambda.Properties.MemorySize === 2048 &&
          lambda.Properties.Timeout === 600,
        );

        expect(chunkingLambda).toBeUndefined();
      });

      test('chunking Lambda has correct environment variables', () => {
        const testApp = createTestApp();
        const chunkingStack = new Stack(testApp, 'AgenticChunkingEnvStack');
        const systemPrompt = new Asset(chunkingStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        new AgenticDocumentProcessing(chunkingStack, 'AgenticChunkingEnvTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'token-based',
            tokenThreshold: 200000,
            maxTokensPerChunk: 120000,
          },
          processingAgentParameters: {
            agentName: 'EnvTestAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Test prompt',
          },
        });

        const template = Template.fromStack(chunkingStack);

        // Find the chunking Lambda
        const lambdas = template.findResources('AWS::Lambda::Function');
        const chunkingLambda = Object.values(lambdas).find((lambda: any) =>
          lambda.Properties.Runtime === 'python3.13' &&
          lambda.Properties.MemorySize === 2048,
        );

        expect(chunkingLambda).toBeDefined();
        expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNKING_STRATEGY', 'token-based');
        expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.TOKEN_THRESHOLD', '200000');
        expect(chunkingLambda).toHaveProperty('Properties.Environment.Variables.MAX_TOKENS_PER_CHUNK', '120000');
      });
    });

    describe('createProcessingWorkflow() inheritance', () => {
      test('inherits createProcessingWorkflow() from BedrockDocumentProcessing', () => {
        // Verify that the state machine includes the Choice state for chunking
        const testApp = createTestApp();
        const chunkingStack = new Stack(testApp, 'AgenticWorkflowStack');
        const systemPrompt = new Asset(chunkingStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        new AgenticDocumentProcessing(chunkingStack, 'AgenticWorkflowTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'hybrid',
            processingMode: 'parallel',
            maxConcurrency: 5,
          },
          processingAgentParameters: {
            agentName: 'WorkflowTestAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Test prompt',
          },
        });

        const template = Template.fromStack(chunkingStack);

        // Verify state machine is created
        template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

        // Verify state machine has encryption (inherited behavior)
        template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
          EncryptionConfiguration: Match.objectLike({
            Type: 'CUSTOMER_MANAGED_KMS_KEY',
          }),
        });
      });

      test('creates aggregation Lambda when chunking is enabled', () => {
        const testApp = createTestApp();
        const chunkingStack = new Stack(testApp, 'AgenticAggregationStack');
        const systemPrompt = new Asset(chunkingStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        new AgenticDocumentProcessing(chunkingStack, 'AgenticAggregationTest', {
          enableChunking: true,
          processingAgentParameters: {
            agentName: 'AggregationTestAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Test prompt',
          },
        });

        const template = Template.fromStack(chunkingStack);

        // Verify aggregation Lambda is created (inherited from BedrockDocumentProcessing)
        const lambdas = template.findResources('AWS::Lambda::Function');
        const aggregationLambda = Object.values(lambdas).find((lambda: any) =>
          lambda.Properties.Runtime === 'python3.13' &&
          lambda.Properties.MemorySize === 1024 &&
          lambda.Properties.Timeout === 300,
        );

        expect(aggregationLambda).toBeDefined();
      });

      test('creates cleanup Lambda when chunking is enabled', () => {
        const testApp = createTestApp();
        const chunkingStack = new Stack(testApp, 'AgenticCleanupStack');
        const systemPrompt = new Asset(chunkingStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        new AgenticDocumentProcessing(chunkingStack, 'AgenticCleanupTest', {
          enableChunking: true,
          processingAgentParameters: {
            agentName: 'CleanupTestAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Test prompt',
          },
        });

        const template = Template.fromStack(chunkingStack);

        // Verify cleanup Lambda is created (inherited from BedrockDocumentProcessing)
        const lambdas = template.findResources('AWS::Lambda::Function');
        const cleanupLambda = Object.values(lambdas).find((lambda: any) =>
          lambda.Properties.Runtime === 'python3.13' &&
          lambda.Properties.MemorySize === 512 &&
          lambda.Properties.Timeout === 300,
        );

        expect(cleanupLambda).toBeDefined();
      });
    });

    describe('Agent-based processing with chunking', () => {
      test('uses BatchAgent for processing step in chunked workflow', () => {
        const testApp = createTestApp();
        const chunkingStack = new Stack(testApp, 'AgenticBatchAgentStack');
        const systemPrompt = new Asset(chunkingStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        new AgenticDocumentProcessing(chunkingStack, 'AgenticBatchAgentTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'hybrid',
            maxConcurrency: 10,
          },
          processingAgentParameters: {
            agentName: 'BatchAgentTest',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Process this document chunk',
          },
        });

        const template = Template.fromStack(chunkingStack);

        // Verify BatchAgent Lambda is created with correct configuration
        template.hasResourceProperties('AWS::Lambda::Function', {
          Environment: {
            Variables: {
              PROMPT: 'Process this document chunk',
            },
          },
        });
      });

      test('BatchAgent has S3 access for chunk processing', () => {
        const testApp = createTestApp();
        const chunkingStack = new Stack(testApp, 'AgenticS3AccessStack');
        const systemPrompt = new Asset(chunkingStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        new AgenticDocumentProcessing(chunkingStack, 'AgenticS3AccessTest', {
          enableChunking: true,
          processingAgentParameters: {
            agentName: 'S3AccessAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Test prompt',
          },
        });

        const template = Template.fromStack(chunkingStack);

        // Verify S3 access permissions are granted
        template.hasResourceProperties('AWS::IAM::Role', {
          Policies: Match.arrayWith([
            Match.objectLike({
              PolicyDocument: Match.objectLike({
                Statement: Match.arrayWith([
                  Match.objectLike({
                    Action: Match.arrayWith(['s3:GetObject']),
                    Effect: 'Allow',
                  }),
                ]),
              }),
            }),
          ]),
        });
      });
    });

    describe('Chunking configuration validation', () => {
      test('validates chunking configuration (inherited from BedrockDocumentProcessing)', () => {
        const testApp = createTestApp();
        const stack = new Stack(testApp, 'AgenticValidationStack');
        const systemPrompt = new Asset(stack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        // Should throw error for invalid chunkSize
        expect(() => {
          new AgenticDocumentProcessing(stack, 'AgenticValidationTest', {
            enableChunking: true,
            chunkingConfig: {
              strategy: 'fixed-pages',
              chunkSize: 0,
            },
            processingAgentParameters: {
              agentName: 'ValidationAgent',
              agentDefinition: {
                bedrockModel: {},
                systemPrompt,
              },
              prompt: 'Test prompt',
            },
          });
        }).toThrow('ChunkingConfig validation error: chunkSize must be greater than 0');
      });

      test('validates overlap configuration (inherited from BedrockDocumentProcessing)', () => {
        const testApp = createTestApp();
        const stack = new Stack(testApp, 'AgenticOverlapValidationStack');
        const systemPrompt = new Asset(stack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });

        // Should throw error for overlapPages >= chunkSize
        expect(() => {
          new AgenticDocumentProcessing(stack, 'AgenticOverlapValidationTest', {
            enableChunking: true,
            chunkingConfig: {
              strategy: 'fixed-pages',
              chunkSize: 50,
              overlapPages: 60,
            },
            processingAgentParameters: {
              agentName: 'OverlapValidationAgent',
              agentDefinition: {
                bedrockModel: {},
                systemPrompt,
              },
              prompt: 'Test prompt',
            },
          });
        }).toThrow('ChunkingConfig validation error: overlapPages must be less than chunkSize');
      });
    });

    describe('Comparison with BedrockDocumentProcessing', () => {
      test('AgenticDocumentProcessing creates same chunking infrastructure as BedrockDocumentProcessing', () => {
        const testApp = createTestApp();

        // Create BedrockDocumentProcessing with chunking
        const bedrockStack = new Stack(testApp, 'BedrockCompareStack');
        new BedrockDocumentProcessing(bedrockStack, 'BedrockCompareTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'hybrid',
            maxPagesPerChunk: 100,
            targetTokensPerChunk: 80000,
          },
        });

        // Create AgenticDocumentProcessing with same chunking config
        const agenticStack = new Stack(testApp, 'AgenticCompareStack');
        const systemPrompt = new Asset(agenticStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });
        new AgenticDocumentProcessing(agenticStack, 'AgenticCompareTest', {
          enableChunking: true,
          chunkingConfig: {
            strategy: 'hybrid',
            maxPagesPerChunk: 100,
            targetTokensPerChunk: 80000,
          },
          processingAgentParameters: {
            agentName: 'CompareAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Test prompt',
          },
        });

        const bedrockTemplate = Template.fromStack(bedrockStack);
        const agenticTemplate = Template.fromStack(agenticStack);

        // Both should have PDF chunking Lambda
        const bedrockLambdas = bedrockTemplate.findResources('AWS::Lambda::Function');
        const agenticLambdas = agenticTemplate.findResources('AWS::Lambda::Function');

        const bedrockChunkingLambda = Object.values(bedrockLambdas).find((lambda: any) =>
          lambda.Properties.Runtime === 'python3.13' &&
          lambda.Properties.MemorySize === 2048,
        );

        const agenticChunkingLambda = Object.values(agenticLambdas).find((lambda: any) =>
          lambda.Properties.Runtime === 'python3.13' &&
          lambda.Properties.MemorySize === 2048,
        );

        expect(bedrockChunkingLambda).toBeDefined();
        expect(agenticChunkingLambda).toBeDefined();

        // Both should have same chunking strategy
        expect(bedrockChunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNKING_STRATEGY', 'hybrid');
        expect(agenticChunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNKING_STRATEGY', 'hybrid');
      });

      test('both implementations create same number of chunking-related Lambdas', () => {
        const testApp = createTestApp();

        // Create BedrockDocumentProcessing with chunking
        const bedrockStack = new Stack(testApp, 'BedrockLambdaCountStack');
        new BedrockDocumentProcessing(bedrockStack, 'BedrockLambdaCountTest', {
          enableChunking: true,
        });

        // Create AgenticDocumentProcessing with chunking
        const agenticStack = new Stack(testApp, 'AgenticLambdaCountStack');
        const systemPrompt = new Asset(agenticStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });
        new AgenticDocumentProcessing(agenticStack, 'AgenticLambdaCountTest', {
          enableChunking: true,
          processingAgentParameters: {
            agentName: 'LambdaCountAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Test prompt',
          },
        });

        const bedrockTemplate = Template.fromStack(bedrockStack);
        const agenticTemplate = Template.fromStack(agenticStack);

        // Count chunking-related Lambdas (chunking, aggregation, cleanup)
        const bedrockLambdas = bedrockTemplate.findResources('AWS::Lambda::Function');
        const agenticLambdas = agenticTemplate.findResources('AWS::Lambda::Function');

        // Find chunking Lambda (2048 MB)
        const bedrockChunking = Object.values(bedrockLambdas).filter((l: any) =>
          l.Properties.MemorySize === 2048);
        const agenticChunking = Object.values(agenticLambdas).filter((l: any) =>
          l.Properties.MemorySize === 2048);

        // Find aggregation Lambda (1024 MB, 300s timeout)
        const bedrockAggregation = Object.values(bedrockLambdas).filter((l: any) =>
          l.Properties.MemorySize === 1024 && l.Properties.Timeout === 300);
        const agenticAggregation = Object.values(agenticLambdas).filter((l: any) =>
          l.Properties.MemorySize === 1024 && l.Properties.Timeout === 300);

        // Both should have same number of chunking and aggregation Lambdas
        // (chunking infrastructure is inherited)
        expect(bedrockChunking.length).toBe(agenticChunking.length);
        expect(bedrockAggregation.length).toBe(agenticAggregation.length);

        // Both should have at least one cleanup Lambda
        // Note: AgenticDocumentProcessing may have additional Lambdas due to BatchAgent
        const bedrockCleanup = Object.values(bedrockLambdas).filter((l: any) =>
          l.Properties.MemorySize === 512 && l.Properties.Timeout === 300);
        const agenticCleanup = Object.values(agenticLambdas).filter((l: any) =>
          l.Properties.MemorySize === 512 && l.Properties.Timeout === 300);

        expect(bedrockCleanup.length).toBeGreaterThanOrEqual(1);
        expect(agenticCleanup.length).toBeGreaterThanOrEqual(1);
      });

      test('AgenticDocumentProcessing uses agent for processing while BedrockDocumentProcessing uses Bedrock Lambda', () => {
        const testApp = createTestApp();

        // Create BedrockDocumentProcessing with chunking
        const bedrockStack = new Stack(testApp, 'BedrockProcessingStack');
        new BedrockDocumentProcessing(bedrockStack, 'BedrockProcessingTest', {
          enableChunking: true,
        });

        // Create AgenticDocumentProcessing with chunking
        const agenticStack = new Stack(testApp, 'AgenticProcessingStack');
        const systemPrompt = new Asset(agenticStack, 'SystemPrompt', {
          path: __dirname + '/../resources/default-strands-agent',
        });
        new AgenticDocumentProcessing(agenticStack, 'AgenticProcessingTest', {
          enableChunking: true,
          processingAgentParameters: {
            agentName: 'ProcessingAgent',
            agentDefinition: {
              bedrockModel: {},
              systemPrompt,
            },
            prompt: 'Agent processing prompt',
          },
        });

        const bedrockTemplate = Template.fromStack(bedrockStack);
        const agenticTemplate = Template.fromStack(agenticStack);

        // BedrockDocumentProcessing should have processing Lambda with INVOKE_TYPE=processing
        bedrockTemplate.hasResourceProperties('AWS::Lambda::Function', {
          Environment: {
            Variables: {
              INVOKE_TYPE: 'processing',
            },
          },
        });

        // AgenticDocumentProcessing should have agent Lambda with PROMPT
        agenticTemplate.hasResourceProperties('AWS::Lambda::Function', {
          Environment: {
            Variables: {
              PROMPT: 'Agent processing prompt',
            },
          },
        });
      });

      test('both implementations support all three chunking strategies', () => {
        const strategies: Array<'fixed-pages' | 'token-based' | 'hybrid'> = ['fixed-pages', 'token-based', 'hybrid'];

        for (const strategy of strategies) {
          const testApp = createTestApp();

          // Create BedrockDocumentProcessing
          const bedrockStack = new Stack(testApp, `Bedrock${strategy}Stack`);
          new BedrockDocumentProcessing(bedrockStack, `Bedrock${strategy}Test`, {
            enableChunking: true,
            chunkingConfig: { strategy },
          });

          // Create AgenticDocumentProcessing
          const agenticStack = new Stack(testApp, `Agentic${strategy}Stack`);
          const systemPrompt = new Asset(agenticStack, 'SystemPrompt', {
            path: __dirname + '/../resources/default-strands-agent',
          });
          new AgenticDocumentProcessing(agenticStack, `Agentic${strategy}Test`, {
            enableChunking: true,
            chunkingConfig: { strategy },
            processingAgentParameters: {
              agentName: `${strategy}Agent`,
              agentDefinition: {
                bedrockModel: {},
                systemPrompt,
              },
              prompt: 'Test prompt',
            },
          });

          const bedrockTemplate = Template.fromStack(bedrockStack);
          const agenticTemplate = Template.fromStack(agenticStack);

          // Both should have chunking Lambda with correct strategy
          const bedrockLambdas = bedrockTemplate.findResources('AWS::Lambda::Function');
          const agenticLambdas = agenticTemplate.findResources('AWS::Lambda::Function');

          const bedrockChunkingLambda = Object.values(bedrockLambdas).find((l: any) =>
            l.Properties.MemorySize === 2048);
          const agenticChunkingLambda = Object.values(agenticLambdas).find((l: any) =>
            l.Properties.MemorySize === 2048);

          expect(bedrockChunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNKING_STRATEGY', strategy);
          expect(agenticChunkingLambda).toHaveProperty('Properties.Environment.Variables.CHUNKING_STRATEGY', strategy);
        }
      });
    });
  });
});
