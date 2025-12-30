import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { AgentRuntimeType, AgentCoreDeploymentMethod } from '../../framework/agents/runtime';
import { DEFAULT_BEDROCK_MODEL } from '../../framework/bedrock/bedrock';
import { AgenticDocumentProcessing } from '../agentic-document-processing';

describe('AgenticDocumentProcessing', () => {
  let basicStack: Stack;
  let crossRegionStack: Stack;
  let defaultModelStack: Stack;
  let agentCoreStack: Stack;
  let basicTemplate: Template;
  let crossRegionTemplate: Template;
  let defaultModelTemplate: Template;
  let agentCoreTemplate: Template;

  beforeAll(() => {
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

    // AgentCore runtime stack
    agentCoreStack = new Stack(undefined, 'AgentCoreDocProcessingStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const agentCorePrompt = new Asset(agentCoreStack, 'SystemPrompt', {
      path: __dirname + '/../resources/default-strands-agent',
    });
    new AgenticDocumentProcessing(agentCoreStack, 'AgentCoreTest', {
      processingAgentParameters: {
        agentName: 'AgentCoreAgent',
        agentDefinition: {
          bedrockModel: {},
          systemPrompt: agentCorePrompt,
        },
        prompt: 'AgentCore processing prompt',
        runtime: {
          type: AgentRuntimeType.AGENTCORE,
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
            imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/doc-processing-agent:latest',
          },
        },
      },
    });

    basicTemplate = Template.fromStack(basicStack);
    crossRegionTemplate = Template.fromStack(crossRegionStack);
    defaultModelTemplate = Template.fromStack(defaultModelStack);
    agentCoreTemplate = Template.fromStack(agentCoreStack);
  });

  describe('Basic infrastructure', () => {
    test('creates basic infrastructure', () => {
      basicTemplate.hasResourceProperties('AWS::S3::Bucket', {});
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'python3.13',
      });
      // 6 Lambda functions: SQS Consumer, Classification, Extraction, BatchAgent,
      // BucketNotificationsHandler, and LogRetention
      basicTemplate.resourceCountIs('AWS::Lambda::Function', 6);
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
            MODEL_ID: `us.${DEFAULT_BEDROCK_MODEL.modelId}`,
          },
        },
      });
    });

    test('uses default model when cross-region inference is disabled', () => {
      defaultModelTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            MODEL_ID: DEFAULT_BEDROCK_MODEL.modelId,
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
      // 6 Lambda functions: SQS Consumer, Classification, Extraction, BatchAgent,
      // BucketNotificationsHandler, and LogRetention
      basicTemplate.resourceCountIs('AWS::Lambda::Function', 6);
    });

    test('creates single state machine', () => {
      basicTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });
  });

  describe('Runtime integration tests', () => {
    describe('Lambda runtime workflow', () => {
      test('document processing workflow uses Lambda runtime by default', () => {
        // Verify Lambda function is created for the batch agent
        basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
          FunctionName: Match.stringLikeRegexp('TestAgent'),
        });

        // Verify Lambda execution role
        basicTemplate.hasResourceProperties('AWS::IAM::Role', {
          AssumeRolePolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Principal: { Service: 'lambda.amazonaws.com' },
              }),
            ]),
          },
        });
      });

      test('Lambda runtime integrates with Step Functions workflow', () => {
        // Verify state machine is created
        basicTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

        // Verify state machine has encryption
        basicTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
          EncryptionConfiguration: Match.objectLike({
            Type: 'CUSTOMER_MANAGED_KMS_KEY',
          }),
        });
      });

      test('adapter permissions are granted to Lambda runtime', () => {
        // Verify Lambda execution role has S3 permissions for adapter
        // The adapter grants S3 read permissions to the agent execution role
        basicTemplate.hasResourceProperties('AWS::IAM::Policy', {
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['s3:GetObject']),
                Effect: 'Allow',
              }),
            ]),
          },
        });

        // Verify SQS permissions for adapter
        // The adapter grants SQS permissions to the agent execution role
        basicTemplate.hasResourceProperties('AWS::IAM::Policy', {
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith([
                  'sqs:ReceiveMessage',
                  'sqs:ChangeMessageVisibility',
                  'sqs:GetQueueUrl',
                  'sqs:DeleteMessage',
                  'sqs:GetQueueAttributes',
                ]),
                Effect: 'Allow',
              }),
            ]),
          },
        });
      });
    });

    describe('AgentCore runtime workflow', () => {
      test('document processing workflow uses AgentCore runtime when configured', () => {
        // Verify AgentCore runtime is created
        agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::Runtime', 1);

        // Verify AgentCore runtime has correct name
        agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
          AgentRuntimeName: 'AgentCoreAgent',
        });

        // Verify AgentCore runtime endpoint is created
        agentCoreTemplate.resourceCountIs('AWS::BedrockAgentCore::RuntimeEndpoint', 1);
      });

      test('AgentCore runtime has correct execution role', () => {
        // Verify execution role with agentcore service principal
        agentCoreTemplate.hasResourceProperties('AWS::IAM::Role', {
          AssumeRolePolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Principal: { Service: 'agentcore.amazonaws.com' },
              }),
            ]),
          },
        });
      });

      test('AgentCore runtime integrates with Step Functions workflow', () => {
        // Verify state machine is created
        agentCoreTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

        // Verify state machine has encryption
        agentCoreTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
          EncryptionConfiguration: Match.objectLike({
            Type: 'CUSTOMER_MANAGED_KMS_KEY',
          }),
        });
      });

      test('adapter permissions are granted to AgentCore runtime', () => {
        // Verify AgentCore execution role has S3 permissions for adapter
        // The adapter grants S3 read permissions to the agent execution role
        agentCoreTemplate.hasResourceProperties('AWS::IAM::Policy', {
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['s3:GetObject']),
                Effect: 'Allow',
              }),
            ]),
          },
        });

        // Verify SQS permissions for adapter
        // The adapter grants SQS permissions to the agent execution role
        agentCoreTemplate.hasResourceProperties('AWS::IAM::Policy', {
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith([
                  'sqs:ReceiveMessage',
                  'sqs:ChangeMessageVisibility',
                  'sqs:GetQueueUrl',
                  'sqs:DeleteMessage',
                  'sqs:GetQueueAttributes',
                ]),
                Effect: 'Allow',
              }),
            ]),
          },
        });
      });

      test('AgentCore runtime uses container deployment method', () => {
        // Verify container image configuration
        // AgentCore uses AgentRuntimeArtifact.ContainerConfiguration.ContainerUri
        agentCoreTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
          AgentRuntimeArtifact: {
            ContainerConfiguration: {
              ContainerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/doc-processing-agent:latest',
            },
          },
        });
      });

      test('AgentCore runtime has Bedrock permissions', () => {
        // Verify Bedrock model invocation permissions
        agentCoreTemplate.hasResourceProperties('AWS::IAM::Role', {
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
    });

    describe('Runtime-agnostic workflow components', () => {
      test('both runtimes create same document processing infrastructure', () => {
        // Both should have S3 bucket
        basicTemplate.resourceCountIs('AWS::S3::Bucket', 1);
        agentCoreTemplate.resourceCountIs('AWS::S3::Bucket', 1);

        // Both should have DynamoDB table
        basicTemplate.resourceCountIs('AWS::DynamoDB::Table', 1);
        agentCoreTemplate.resourceCountIs('AWS::DynamoDB::Table', 1);

        // Both should have SQS queues (main queue + DLQ)
        basicTemplate.resourceCountIs('AWS::SQS::Queue', 2);
        agentCoreTemplate.resourceCountIs('AWS::SQS::Queue', 2);

        // Both should have Step Functions state machine
        basicTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
        agentCoreTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
      });

      test('both runtimes have encryption configured', () => {
        // Lambda runtime encryption
        basicTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
          EncryptionConfiguration: Match.objectLike({
            Type: 'CUSTOMER_MANAGED_KMS_KEY',
          }),
        });

        // AgentCore runtime encryption
        agentCoreTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
          EncryptionConfiguration: Match.objectLike({
            Type: 'CUSTOMER_MANAGED_KMS_KEY',
          }),
        });
      });

      test('both runtimes have classification and extraction Lambda functions', () => {
        // Lambda runtime: 6 functions (SQS Consumer, Classification, Extraction, BatchAgent, BucketNotifications, LogRetention)
        basicTemplate.resourceCountIs('AWS::Lambda::Function', 6);

        // AgentCore runtime: 4 functions (SQS Consumer, Classification, Extraction, BucketNotifications)
        // Note: BatchAgent is replaced by AgentCore runtime, LogRetention is not created
        agentCoreTemplate.resourceCountIs('AWS::Lambda::Function', 4);
      });
    });
  });
});
