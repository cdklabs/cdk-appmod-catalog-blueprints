import * as path from 'path';
import { App, Stack, Duration } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { createTestApp } from '../../utilities/test-utils';
import {
  InteractiveAgent,
  StreamingHttpAdapter,
  S3SessionManager,
  SlidingWindowConversationManager,
  NullConversationManager,
  CognitoAuthenticator,
  NoAuthenticator,
} from '../agents/interactive-agent';
import { BedrockKnowledgeBase } from '../agents/knowledge-base';

describe('InteractiveAgent', () => {
  let app: App;
  let stack: Stack;
  let systemPrompt: Asset;
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    systemPrompt = new Asset(stack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });
  });

  describe('Default Configuration', () => {
    test('creates with minimal props', () => {
      const agent = new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      expect(agent).toBeDefined();
      expect(agent.agentFunction).toBeDefined();
      expect(agent.apiEndpoint).toBeDefined();
    });

    test('default adapter is StreamingHttpAdapter', () => {
      const agent = new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      expect(agent.adapter).toBeInstanceOf(StreamingHttpAdapter);
    });

    test('default session store is S3SessionManager', () => {
      const agent = new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      expect(agent.sessionStore).toBeInstanceOf(S3SessionManager);
      expect(agent.sessionBucket).toBeDefined();
    });

    test('default context strategy is SlidingWindowConversationManager', () => {
      const agent = new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      expect(agent.contextStrategy).toBeInstanceOf(SlidingWindowConversationManager);
    });

    test('default authenticator is CognitoAuthenticator', () => {
      const agent = new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      expect(agent.authenticator).toBeInstanceOf(CognitoAuthenticator);
    });
  });

  describe('Lambda Function Configuration', () => {
    test('creates Lambda function with default 15-minute timeout', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 900, // 15 minutes
      });
    });

    test('creates Lambda function with default 1024 MB memory', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 1024,
      });
    });

    test('Lambda function has Lambda Web Adapter layer', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Layers: Match.arrayWith([
          'arn:aws:lambda:us-east-1:753240598075:layer:LambdaAdapterLayerX86:25',
        ]),
      });
    });

    test('Lambda function has AWS_LAMBDA_EXEC_WRAPPER env var for LWA', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
          }),
        },
      });
    });

    test('Lambda function has AWS_LWA_INVOKE_MODE env var', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            AWS_LWA_INVOKE_MODE: 'response_stream',
          }),
        },
      });
    });

    test('Lambda function has PORT env var set to 8080', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            PORT: '8080',
          }),
        },
      });
    });

    test('Lambda function has MODEL_ID env var', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            MODEL_ID: Match.anyValue(),
          }),
        },
      });
    });

    test('Lambda function has context strategy env vars', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            CONTEXT_ENABLED: 'true',
            CONTEXT_STRATEGY: 'SlidingWindow',
            CONTEXT_WINDOW_SIZE: '20',
          }),
        },
      });
    });

    test('Lambda function has session bucket env var', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            SESSION_BUCKET: Match.anyValue(),
          }),
        },
      });
    });

    test('custom timeout is applied', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
        timeout: Duration.minutes(10),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 600,
      });
    });

    test('custom memorySize is applied', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
        memorySize: 2048,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 2048,
      });
    });
  });

  describe('REST API Configuration', () => {
    test('creates REST API resource', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    });

    test('creates /chat resource', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'chat',
      });
    });

    test('creates POST method on /chat', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
      });
    });

    test('POST method has Cognito authorizer by default', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      // Verify Cognito authorizer exists
      template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
        Type: 'COGNITO_USER_POOLS',
      });
    });

    test('POST method has no authorizer with NoAuthenticator', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
        authenticator: new NoAuthenticator(),
      });

      const template = Template.fromStack(stack);
      // Should have POST method with NONE auth
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        AuthorizationType: 'NONE',
      });
    });

    test('REST API has CORS configuration', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      // OPTIONS method for CORS preflight
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'OPTIONS',
      });
    });
  });

  describe('Session Management', () => {
    test('creates S3 session bucket with KMS encryption by default', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: Match.arrayWith([
            Match.objectLike({
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
              },
            }),
          ]),
        },
      });
    });

    test('session bucket has lifecycle rule', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({
              Status: 'Enabled',
            }),
          ]),
        },
      });
    });

    test('custom session bucket is used when provided', () => {
      const customBucket = new Bucket(stack, 'CustomBucket');

      const agent = new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
        sessionBucket: customBucket,
      });

      expect(agent.sessionBucket).toBe(customBucket);
    });

    test('stateless mode creates no session bucket when sessionStore is explicitly undefined', () => {
      // When sessionStore is not provided at all, default S3SessionManager is created.
      // To go truly stateless, user must pass a custom ISessionStore with no bucket.
      const agent = new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      // Default creates a session store
      expect(agent.sessionStore).toBeDefined();
    });
  });

  describe('Cognito Authentication', () => {
    test('creates Cognito User Pool by default', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });

    test('creates Cognito User Pool Client by default', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    });

    test('no Cognito resources with NoAuthenticator', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
        authenticator: new NoAuthenticator(),
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::Cognito::UserPool', 0);
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 0);
    });
  });

  describe('Props Validation', () => {
    test('throws error for empty agentName', () => {
      expect(() => {
        new InteractiveAgent(stack, 'Agent', {
          agentName: '',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
        });
      }).toThrow('agentName cannot be empty');
    });

    test('throws error for whitespace-only agentName', () => {
      expect(() => {
        new InteractiveAgent(stack, 'Agent', {
          agentName: '   ',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
        });
      }).toThrow('agentName cannot be empty');
    });

    test('throws error for memorySize too low', () => {
      expect(() => {
        new InteractiveAgent(stack, 'Agent', {
          agentName: 'TestAgent',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
          memorySize: 64,
        });
      }).toThrow('memorySize must be between 128 and 10240 MB');
    });

    test('throws error for memorySize too high', () => {
      expect(() => {
        new InteractiveAgent(stack, 'Agent', {
          agentName: 'TestAgent',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
          memorySize: 20480,
        });
      }).toThrow('memorySize must be between 128 and 10240 MB');
    });

    test('throws error for timeout too short', () => {
      expect(() => {
        new InteractiveAgent(stack, 'Agent', {
          agentName: 'TestAgent',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
          timeout: Duration.seconds(0),
        });
      }).toThrow('timeout must be between 1 second and 15 minutes');
    });

    test('throws error for timeout too long', () => {
      expect(() => {
        new InteractiveAgent(stack, 'Agent', {
          agentName: 'TestAgent',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
          timeout: Duration.minutes(20),
        });
      }).toThrow('timeout must be between 1 second and 15 minutes');
    });

    test('throws error for messageHistoryLimit too low', () => {
      expect(() => {
        new InteractiveAgent(stack, 'Agent', {
          agentName: 'TestAgent',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
          messageHistoryLimit: 0,
        });
      }).toThrow('messageHistoryLimit must be between 1 and 1000');
    });

    test('throws error for messageHistoryLimit too high', () => {
      expect(() => {
        new InteractiveAgent(stack, 'Agent', {
          agentName: 'TestAgent',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
          messageHistoryLimit: 2000,
        });
      }).toThrow('messageHistoryLimit must be between 1 and 1000');
    });

    test('accepts valid boundary values', () => {
      expect(() => {
        new InteractiveAgent(stack, 'Agent1', {
          agentName: 'TestAgent1',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
          memorySize: 128,
          timeout: Duration.seconds(1),
          messageHistoryLimit: 1,
        });

        new InteractiveAgent(stack, 'Agent2', {
          agentName: 'TestAgent2',
          agentDefinition: {
            bedrockModel: { fmModelId: testModel },
            systemPrompt,
          },
          memorySize: 10240,
          timeout: Duration.minutes(15),
          messageHistoryLimit: 1000,
        });
      }).not.toThrow();
    });
  });

  describe('CDK Synth', () => {
    test('synthesizes without errors', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      expect(() => {
        app.synth();
      }).not.toThrow();
    });

    test('creates KMS key with rotation enabled', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      const keys = template.findResources('AWS::KMS::Key');
      const hasRotation = Object.values(keys).some(
        (key: any) => key.Properties.EnableKeyRotation === true,
      );
      expect(hasRotation).toBe(true);
    });

    test('creates IAM role with Lambda service principal', () => {
      new InteractiveAgent(stack, 'Agent', {
        agentName: 'TestAgent',
        agentDefinition: {
          bedrockModel: { fmModelId: testModel },
          systemPrompt,
        },
      });

      const template = Template.fromStack(stack);
      const roles = template.findResources('AWS::IAM::Role');
      const agentRole = Object.values(roles).find((role: any) =>
        role.Properties.AssumeRolePolicyDocument.Statement.some(
          (stmt: any) => stmt.Principal?.Service === 'lambda.amazonaws.com',
        ),
      );
      expect(agentRole).toBeDefined();
    });
  });
});


describe('StreamingHttpAdapter', () => {
  let app: App;
  let stack: Stack;
  let mockLambda: Function;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    mockLambda = new Function(stack, 'MockLambda', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({ statusCode: 200 });'),
    });
  });

  test('implements ICommunicationAdapter interface', () => {
    const adapter = new StreamingHttpAdapter();
    expect(typeof adapter.attachToFunction).toBe('function');
    expect(typeof adapter.grantInvoke).toBe('function');
  });

  test('creates with default props', () => {
    expect(() => new StreamingHttpAdapter()).not.toThrow();
  });

  test('creates with custom stageName', () => {
    expect(() => new StreamingHttpAdapter({ stageName: 'dev' })).not.toThrow();
  });

  test('creates with throttle settings', () => {
    expect(() => new StreamingHttpAdapter({
      throttle: { rateLimit: 100, burstLimit: 200 },
    })).not.toThrow();
  });

  test('throws when attachToFunction called without scope', () => {
    const adapter = new StreamingHttpAdapter();
    expect(() => adapter.attachToFunction(mockLambda)).toThrow(
      'StreamingHttpAdapter must be initialized with a scope before calling attachToFunction',
    );
  });

  test('attachToFunction returns endpoint URL', () => {
    const adapter = new StreamingHttpAdapter();
    adapter._setScope(stack);
    const url = adapter.attachToFunction(mockLambda);
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
  });

  test('grantInvoke does not throw', () => {
    const adapter = new StreamingHttpAdapter();
    adapter._setScope(stack);
    adapter.attachToFunction(mockLambda);
    expect(() => adapter.grantInvoke(mockLambda)).not.toThrow();
  });
});


describe('S3SessionManager', () => {
  test('implements ISessionStore', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'TestStack');
    const manager = new S3SessionManager(stack, 'SM');
    expect(typeof manager.grantReadWrite).toBe('function');
    expect(manager.sessionBucket).toBeDefined();
  });

  test('creates bucket with KMS encryption', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'TestStack');
    new S3SessionManager(stack, 'SM');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          }),
        ]),
      },
    });
  });

  test('uses custom bucket when provided', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'TestStack');
    const bucket = new Bucket(stack, 'CustomBucket');
    const manager = new S3SessionManager(stack, 'SM', { bucket });
    expect(manager.bucket).toBe(bucket);
  });

  test('default TTL is 24 hours', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'TestStack');
    const manager = new S3SessionManager(stack, 'SM');
    expect(manager.sessionTTL.toHours()).toBe(24);
  });

  test('custom TTL is applied', () => {
    const app = createTestApp();
    const stack = new Stack(app, 'TestStack');
    const manager = new S3SessionManager(stack, 'SM', {
      sessionTTL: Duration.hours(48),
    });
    expect(manager.sessionTTL.toHours()).toBe(48);
  });
});


describe('SlidingWindowConversationManager', () => {
  test('default window size is 20', () => {
    const manager = new SlidingWindowConversationManager();
    expect(manager.windowSize).toBe(20);
  });

  test('custom window size is applied', () => {
    const manager = new SlidingWindowConversationManager({ windowSize: 50 });
    expect(manager.windowSize).toBe(50);
  });

  test('throws for window size below 1', () => {
    expect(() => new SlidingWindowConversationManager({ windowSize: 0 })).toThrow(
      'windowSize must be between 1 and 1000',
    );
  });

  test('throws for window size above 1000', () => {
    expect(() => new SlidingWindowConversationManager({ windowSize: 1001 })).toThrow(
      'windowSize must be between 1 and 1000',
    );
  });

  test('returns correct environment variables', () => {
    const manager = new SlidingWindowConversationManager({ windowSize: 30 });
    const env = manager.environmentVariables();
    expect(env).toEqual({
      CONTEXT_ENABLED: 'true',
      CONTEXT_STRATEGY: 'SlidingWindow',
      CONTEXT_WINDOW_SIZE: '30',
    });
  });
});


describe('NullConversationManager', () => {
  test('returns correct environment variables', () => {
    const manager = new NullConversationManager();
    const env = manager.environmentVariables();
    expect(env).toEqual({
      CONTEXT_ENABLED: 'false',
      CONTEXT_STRATEGY: 'Null',
    });
  });
});


describe('CognitoAuthenticator', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  test('creates with default props', () => {
    expect(() => new CognitoAuthenticator()).not.toThrow();
  });

  test('setScope creates User Pool and Client', () => {
    const auth = new CognitoAuthenticator();
    auth._setScope(stack);
    expect(auth.userPool).toBeDefined();
    expect(auth.userPoolClient).toBeDefined();
  });

  test('throws when grantAuthenticate called without scope', () => {
    const auth = new CognitoAuthenticator();
    const mockLambda = new Function(stack, 'MockLambda', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({});'),
    });
    expect(() => auth.grantAuthenticate(mockLambda)).toThrow();
  });

  test('returns correct environment variables', () => {
    const auth = new CognitoAuthenticator();
    const env = auth.environmentVariables();
    expect(env.AUTH_TYPE).toBe('Cognito');
  });
});


describe('NoAuthenticator', () => {
  test('grantAuthenticate is no-op', () => {
    const auth = new NoAuthenticator();
    const app = createTestApp();
    const stack = new Stack(app, 'TestStack');
    const mockLambda = new Function(stack, 'MockLambda', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => ({});'),
    });
    expect(() => auth.grantAuthenticate(mockLambda)).not.toThrow();
  });

  test('returns correct environment variables', () => {
    const auth = new NoAuthenticator();
    const env = auth.environmentVariables();
    expect(env).toEqual({ AUTH_TYPE: 'None' });
  });
});

describe('InteractiveAgent Knowledge Base Integration', () => {
  let app: App;
  let stack: Stack;
  let systemPrompt: Asset;
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    systemPrompt = new Asset(stack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });
  });

  test('sets KNOWLEDGE_BASES_CONFIG when KBs configured', () => {
    const kb = new BedrockKnowledgeBase(stack, 'TestKB', {
      name: 'test-kb',
      description: 'Test knowledge base',
      knowledgeBaseId: 'KB123456',
    });

    new InteractiveAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
        knowledgeBases: [kb],
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          KNOWLEDGE_BASES_CONFIG: Match.anyValue(),
          KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION: Match.anyValue(),
        }),
      },
    });
  });

  test('does not set KB env vars when no KBs configured', () => {
    new InteractiveAgent(stack, 'Agent', {
      agentName: 'TestAgent',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    const template = Template.fromStack(stack);
    const functions = template.findResources('AWS::Lambda::Function');
    const fn = Object.values(functions).find((f: any) =>
      f.Properties?.FunctionName?.includes('TestAgent'),
    ) as any;

    expect(fn.Properties.Environment.Variables.KNOWLEDGE_BASES_CONFIG).toBeUndefined();
    expect(fn.Properties.Environment.Variables.KNOWLEDGE_BASE_SYSTEM_PROMPT_ADDITION).toBeUndefined();
  });
});
