// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  GatewayResponse,
  LambdaIntegration,
  ResponseType,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient, Mfa, AccountRecovery, UserPoolClientIdentityProvider } from 'aws-cdk-lib/aws-cognito';
import { ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IFunction, Architecture, ILayerVersion, LayerVersion, Function, Code } from 'aws-cdk-lib/aws-lambda';
import { IBucket, Bucket, BucketEncryption, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseAgent, BaseAgentProps } from './base-agent';
import { DefaultAgentConfig } from './default-agent-config';
import { LambdaIamUtils, PowertoolsConfig } from '../../utilities';
import { DefaultObservabilityConfig } from '../../utilities/observability';
import { BedrockModelUtils } from '../bedrock';
import { DefaultRuntimes } from '../custom-resource';

/**
 * Strategy interface for pluggable communication mechanisms.
 * Default implementation is StreamingHttpAdapter (API Gateway REST API with response streaming).
 */
export interface ICommunicationAdapter {
  /**
   * Attach the adapter to a Lambda function and create communication infrastructure.
   * Returns the public endpoint URL for client connections.
   */
  attachToFunction(lambdaFunction: IFunction): string;

  /**
   * Grant the Lambda function permission to send responses back to clients.
   */
  grantInvoke(lambdaFunction: IFunction): void;
}

/**
 * Throttle settings for REST API.
 */
export interface ThrottleSettings {
  /**
   * Rate limit (requests per second).
   */
  readonly rateLimit?: number;

  /**
   * Burst limit (maximum concurrent requests).
   */
  readonly burstLimit?: number;
}

/**
 * Configuration properties for StreamingHttpAdapter.
 */
export interface StreamingHttpAdapterProps {
  /**
   * REST API stage name.
   *
   * @default 'prod'
   */
  readonly stageName?: string;

  /**
   * Throttle settings for REST API.
   *
   * @default No throttling
   */
  readonly throttle?: ThrottleSettings;

  /**
   * Authenticator for securing API endpoints.
   *
   * @default Uses authenticator from InteractiveAgent
   */
  readonly authenticator?: IAuthenticator;
}

/**
 * Streaming HTTP adapter for real-time agent communication via SSE.
 *
 * This adapter creates an API Gateway REST API with response streaming enabled,
 * allowing the Lambda function to stream SSE (Server-Sent Events) responses
 * back to clients as the Strands Agent generates tokens.
 *
 * ## Architecture
 *
 * ```
 * Client → POST /chat → API Gateway REST API (STREAM mode) → Lambda (FastAPI + LWA) → Bedrock
 * Client ← SSE stream ← API Gateway ← Lambda response streaming ← Agent tokens
 * ```
 *
 * ## Features
 *
 * - **Response Streaming**: Progressive SSE delivery via API Gateway response streaming
 * - **15-Minute Timeout**: Extended timeout for long-running agent conversations
 * - **Cognito Auth**: Native COGNITO_USER_POOLS authorizer on REST API
 * - **CORS**: Built-in CORS support for browser clients
 * - **Throttling**: Configurable rate and burst limits
 *
 * ## Example
 *
 * ```typescript
 * import { Asset } from 'aws-cdk-lib/aws-s3-assets';
 * import { InteractiveAgent, StreamingHttpAdapter } from '@cdklabs/cdk-appmod-catalog-blueprints';
 *
 * const myPrompt = new Asset(this, 'Prompt', { path: './prompt.txt' });
 * const adapter = new StreamingHttpAdapter({
 *   stageName: 'prod',
 *   throttle: { rateLimit: 100, burstLimit: 200 }
 * });
 *
 * const agent = new InteractiveAgent(this, 'Agent', {
 *   agentName: 'ChatAgent',
 *   agentDefinition: { bedrockModel: {}, systemPrompt: myPrompt },
 *   communicationAdapter: adapter
 * });
 * ```
 */
export class StreamingHttpAdapter implements ICommunicationAdapter {
  /**
   * The REST API Gateway.
   */
  public readonly restApi?: RestApi;

  /**
   * The API endpoint URL.
   */
  public readonly apiEndpoint?: string;

  private readonly props: StreamingHttpAdapterProps;
  private scope?: Construct;

  constructor(props: StreamingHttpAdapterProps = {}) {
    this.props = props;
  }

  /**
   * Attach the adapter to a Lambda function and create REST API infrastructure.
   * Creates API Gateway REST API with POST /chat endpoint and response streaming.
   */
  attachToFunction(lambdaFunction: IFunction): string {
    if (!this.scope) {
      throw new Error('StreamingHttpAdapter must be initialized with a scope before calling attachToFunction');
    }

    const stageName = this.props.stageName || 'prod';

    // Create REST API with CORS
    const restApi = new RestApi(this.scope, 'ChatApi', {
      restApiName: `${Stack.of(this.scope).stackName}-ChatApi`,
      description: 'Interactive Agent Chat API with response streaming',
      deployOptions: {
        stageName,
        throttlingRateLimit: this.props.throttle?.rateLimit,
        throttlingBurstLimit: this.props.throttle?.burstLimit,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
    (this as any).restApi = restApi;

    // Add CORS headers to API Gateway error responses (4XX/5XX).
    // Without these, the Cognito authorizer's 401 response won't include
    // Access-Control-Allow-Origin and the browser will block it as a CORS error.
    new GatewayResponse(this.scope, 'GatewayDefault4XX', {
      restApi,
      type: ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'POST,OPTIONS'",
      },
    });
    new GatewayResponse(this.scope, 'GatewayDefault5XX', {
      restApi,
      type: ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'POST,OPTIONS'",
      },
    });

    // Create Lambda integration
    const lambdaIntegration = new LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    // Add /chat resource with POST method
    const chatResource = restApi.root.addResource('chat');

    // Determine authorization type
    let authorizationType = AuthorizationType.NONE;
    let authorizer: CognitoUserPoolsAuthorizer | undefined;

    if (this.props.authenticator instanceof CognitoAuthenticator && this.props.authenticator.userPool) {
      authorizer = new CognitoUserPoolsAuthorizer(this.scope, 'CognitoAuthorizer', {
        cognitoUserPools: [this.props.authenticator.userPool],
        authorizerName: 'CognitoAuthorizer',
      });
      authorizationType = AuthorizationType.COGNITO;
    }

    const postMethod = chatResource.addMethod('POST', lambdaIntegration, {
      authorizationType,
      authorizer,
    });

    // Configure response streaming via CfnMethod escape hatch
    // API Gateway REST API response streaming requires:
    // 1. responseTransferMode: STREAM on the integration
    // 2. Integration URI pointing to /response-streaming-invocations
    const cfnMethod = postMethod.node.defaultChild as any;
    if (cfnMethod) {
      cfnMethod.addPropertyOverride('Integration.ResponseTransferMode', 'STREAM');
      // Override the integration URI to use response-streaming-invocations path
      const region = Stack.of(this.scope).region;
      cfnMethod.addPropertyOverride(
        'Integration.Uri',
        `arn:aws:apigateway:${region}:lambda:path/2021-11-15/functions/${lambdaFunction.functionArn}/response-streaming-invocations`,
      );
      // Set integration timeout to 15 minutes (900000 ms)
      cfnMethod.addPropertyOverride('Integration.TimeoutInMillis', 900000);
    }

    // Grant API Gateway permission to invoke Lambda with response streaming
    lambdaFunction.addPermission('ApiGatewayInvoke', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: restApi.arnForExecuteApi(),
    });

    // Also grant InvokeWithResponseStream permission
    lambdaFunction.addPermission('ApiGatewayStreamInvoke', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: restApi.arnForExecuteApi('POST', '/chat'),
      action: 'lambda:InvokeFunctionUrl',
    });

    // Construct endpoint URL
    const url = restApi.urlForPath('/chat');
    (this as any).apiEndpoint = url;

    return url;
  }

  /**
   * Grant the Lambda function permissions for API Gateway integration.
   * For REST API streaming, no additional permissions are needed beyond the invoke permission.
   */
  grantInvoke(_lambdaFunction: IFunction): void {
    // REST API streaming doesn't need post_to_connection like WebSocket.
    // The Lambda invoke permission is already granted in attachToFunction.
  }

  /**
   * Initialize the adapter with a CDK scope.
   * Must be called before attachToFunction or grantInvoke.
   *
   * @internal
   */
  public _setScope(scope: Construct): void {
    this.scope = scope;
  }
}

/**
 * Strategy interface for session persistence.
 *
 * Session stores manage conversation state persistence across HTTP requests.
 * The default implementation (S3SessionManager) uses S3 for durable storage.
 */
export interface ISessionStore {
  /**
   * The S3 bucket used for session storage (if S3-based).
   */
  readonly sessionBucket?: IBucket;

  /**
   * Grant read/write permissions to a Lambda function.
   *
   * @param lambdaFunction - The Lambda function that needs access to the session store
   */
  grantReadWrite(lambdaFunction: IFunction): void;
}

/**
 * Configuration properties for S3SessionManager.
 */
export interface S3SessionManagerProps {
  /**
   * S3 bucket for session storage.
   *
   * @default Auto-created bucket with KMS encryption
   */
  readonly bucket?: IBucket;

  /**
   * Time-to-live for sessions.
   * Sessions older than this duration will be automatically deleted.
   *
   * @default Duration.hours(24)
   */
  readonly sessionTTL?: Duration;

  /**
   * KMS encryption key for the session bucket.
   *
   * @default Auto-created KMS key with rotation enabled
   */
  readonly encryptionKey?: IKey;

  /**
   * Removal policy for the session bucket.
   *
   * @default RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: RemovalPolicy;
}

/**
 * S3-based session manager for persisting conversation state.
 *
 * Uses S3 for durable storage of session data with automatic expiration
 * via lifecycle policies. Each HTTP request loads/saves session state,
 * enabling multi-turn conversations over stateless HTTP.
 *
 * ## Features
 *
 * - **Durable Storage**: Sessions persisted to S3 survive Lambda restarts
 * - **Automatic Expiration**: Lifecycle policy removes old sessions
 * - **Encryption**: KMS encryption at rest
 * - **Cost Optimization**: S3 Standard storage with lifecycle management
 *
 * ## Usage
 *
 * ```typescript
 * import { Asset } from 'aws-cdk-lib/aws-s3-assets';
 * import { InteractiveAgent, S3SessionManager } from '@cdklabs/cdk-appmod-catalog-blueprints';
 * import { Duration } from 'aws-cdk-lib';
 *
 * const myPrompt = new Asset(this, 'Prompt', { path: './prompt.txt' });
 * const sessionManager = new S3SessionManager(this, 'SessionManager', {
 *   sessionTTL: Duration.hours(48)
 * });
 *
 * const agent = new InteractiveAgent(this, 'Agent', {
 *   agentName: 'ChatAgent',
 *   agentDefinition: { bedrockModel: {}, systemPrompt: myPrompt },
 *   sessionStore: sessionManager
 * });
 * ```
 */
export class S3SessionManager implements ISessionStore {
  /**
   * The S3 bucket used for session storage.
   */
  public readonly bucket: IBucket;

  /**
   * The session TTL duration.
   */
  public readonly sessionTTL: Duration;

  constructor(scope: Construct, id: string, props: S3SessionManagerProps = {}) {
    const removalPolicy = props.removalPolicy || RemovalPolicy.DESTROY;
    const sessionTTL = props.sessionTTL || Duration.hours(24);

    // Use provided bucket or create new one
    this.bucket = props.bucket || new Bucket(scope, `${id}Bucket`, {
      encryption: BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      removalPolicy: removalPolicy,
      autoDeleteObjects: removalPolicy === RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          id: 'DeleteOldSessions',
          expiration: sessionTTL,
          enabled: true,
        },
      ],
      enforceSSL: true,
      versioned: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    this.sessionTTL = sessionTTL;
  }

  /**
   * The S3 bucket used for session storage (ISessionStore interface).
   */
  public get sessionBucket(): IBucket | undefined {
    return this.bucket;
  }

  /**
   * Grant read/write permissions to a Lambda function.
   */
  grantReadWrite(lambdaFunction: IFunction): void {
    this.bucket.grantReadWrite(lambdaFunction);
  }
}

/**
 * Strategy interface for conversation history management.
 *
 * Context strategies control how conversation history is maintained and provided
 * to the agent. Different strategies enable different conversation patterns.
 */
export interface IContextStrategy {
  /**
   * Get environment variables for Lambda configuration.
   *
   * @returns Environment variables to configure the context manager
   */
  environmentVariables(): Record<string, string>;
}

/**
 * Configuration properties for SlidingWindowConversationManager.
 */
export interface SlidingWindowConversationManagerProps {
  /**
   * Maximum number of messages to keep in conversation history.
   *
   * @default 20 messages
   */
  readonly windowSize?: number;
}

/**
 * Sliding window conversation manager for maintaining recent conversation history.
 *
 * Keeps a fixed-size window of recent messages, automatically discarding older
 * messages as new ones arrive. Provides consistent context size for the agent.
 *
 * ## Usage
 *
 * ```typescript
 * import { Asset } from 'aws-cdk-lib/aws-s3-assets';
 * import { InteractiveAgent, SlidingWindowConversationManager } from '@cdklabs/cdk-appmod-catalog-blueprints';
 *
 * const myPrompt = new Asset(this, 'Prompt', { path: './prompt.txt' });
 * const contextManager = new SlidingWindowConversationManager({ windowSize: 30 });
 *
 * const agent = new InteractiveAgent(this, 'Agent', {
 *   agentName: 'ChatAgent',
 *   agentDefinition: { bedrockModel: {}, systemPrompt: myPrompt },
 *   contextStrategy: contextManager
 * });
 * ```
 */
export class SlidingWindowConversationManager implements IContextStrategy {
  /**
   * The window size (number of messages to keep).
   */
  public readonly windowSize: number;

  constructor(props: SlidingWindowConversationManagerProps = {}) {
    const windowSize = props.windowSize !== undefined ? props.windowSize : 20;

    if (windowSize < 1 || windowSize > 1000) {
      throw new Error('windowSize must be between 1 and 1000');
    }

    this.windowSize = windowSize;
  }

  /**
   * Get environment variables for Lambda configuration.
   */
  environmentVariables(): Record<string, string> {
    return {
      CONTEXT_ENABLED: 'true',
      CONTEXT_STRATEGY: 'SlidingWindow',
      CONTEXT_WINDOW_SIZE: this.windowSize.toString(),
    };
  }
}

/**
 * Null conversation manager for stateless interactions.
 *
 * Disables conversation history, treating each message as independent.
 * Useful for stateless use cases where context is not needed.
 */
export class NullConversationManager implements IContextStrategy {
  /**
   * Get environment variables for Lambda configuration.
   */
  environmentVariables(): Record<string, string> {
    return {
      CONTEXT_ENABLED: 'false',
      CONTEXT_STRATEGY: 'Null',
    };
  }
}

/**
 * Strategy interface for authentication mechanisms.
 *
 * Authenticators control how API endpoints are secured.
 * Different implementations support various authentication methods.
 */
export interface IAuthenticator {
  /**
   * Grant authentication permissions to a Lambda function.
   */
  grantAuthenticate(lambdaFunction: IFunction): void;

  /**
   * Get environment variables for Lambda configuration.
   */
  environmentVariables(): Record<string, string>;
}

/**
 * Configuration properties for CognitoAuthenticator.
 */
export interface CognitoAuthenticatorProps {
  /**
   * Cognito User Pool for authentication.
   *
   * @default Auto-created User Pool with secure defaults
   */
  readonly userPool?: UserPool;

  /**
   * Cognito User Pool Client.
   *
   * @default Auto-created client with appropriate auth flows
   */
  readonly userPoolClient?: UserPoolClient;

  /**
   * Removal policy for Cognito resources.
   *
   * @default RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: RemovalPolicy;
}

/**
 * Cognito-based authenticator for securing REST API endpoints.
 *
 * Creates a Cognito User Pool and integrates with API Gateway REST API
 * using the native COGNITO_USER_POOLS authorizer type. Clients send
 * JWT tokens in the Authorization header.
 *
 * ## Features
 *
 * - **Native JWT Validation**: API Gateway validates tokens without custom Lambda
 * - **User Management**: Built-in user registration and management
 * - **Password Policies**: Enforces strong password requirements
 * - **Account Recovery**: Email-based account recovery
 *
 * ## Usage
 *
 * ```typescript
 * import { Asset } from 'aws-cdk-lib/aws-s3-assets';
 * import { RemovalPolicy } from 'aws-cdk-lib';
 * import { InteractiveAgent, CognitoAuthenticator } from '@cdklabs/cdk-appmod-catalog-blueprints';
 *
 * const myPrompt = new Asset(this, 'Prompt', { path: './prompt.txt' });
 * const authenticator = new CognitoAuthenticator({
 *   removalPolicy: RemovalPolicy.RETAIN
 * });
 *
 * const agent = new InteractiveAgent(this, 'Agent', {
 *   agentName: 'ChatAgent',
 *   agentDefinition: { bedrockModel: {}, systemPrompt: myPrompt },
 *   authenticator
 * });
 * ```
 */
export class CognitoAuthenticator implements IAuthenticator {
  /**
   * The Cognito User Pool.
   */
  public readonly userPool?: UserPool;

  /**
   * The Cognito User Pool Client.
   */
  public readonly userPoolClient?: UserPoolClient;

  private scope?: Construct;
  private readonly removalPolicy: RemovalPolicy;

  constructor(props: CognitoAuthenticatorProps = {}) {
    this.userPool = props.userPool;
    this.userPoolClient = props.userPoolClient;
    this.removalPolicy = props.removalPolicy || RemovalPolicy.DESTROY;
  }

  /**
   * Grant authentication permissions to a Lambda function.
   * Grants permissions to verify Cognito tokens.
   */
  grantAuthenticate(lambdaFunction: IFunction): void {
    if (!this.scope) {
      throw new Error('CognitoAuthenticator must be initialized with a scope before calling grantAuthenticate');
    }

    if (!this.userPool) {
      throw new Error('User Pool must be created before granting permissions. Call _setScope first.');
    }

    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'cognito-idp:GetUser',
          'cognito-idp:AdminGetUser',
        ],
        resources: [this.userPool.userPoolArn],
      }),
    );
  }

  /**
   * Get environment variables for Lambda configuration.
   */
  environmentVariables(): Record<string, string> {
    return {
      AUTH_TYPE: 'Cognito',
      USER_POOL_ID: this.userPool?.userPoolId || '',
      USER_POOL_CLIENT_ID: this.userPoolClient?.userPoolClientId || '',
    };
  }

  /**
   * Initialize the authenticator with a CDK scope.
   * Creates User Pool and Client if not provided.
   *
   * @internal
   */
  public _setScope(scope: Construct): void {
    this.scope = scope;

    if (!this.userPool) {
      (this as any).userPool = new UserPool(scope, 'UserPool', {
        userPoolName: `${Stack.of(scope).stackName}-UserPool`,
        selfSignUpEnabled: true,
        signInAliases: {
          email: true,
          username: true,
        },
        autoVerify: {
          email: true,
        },
        passwordPolicy: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: true,
        },
        mfa: Mfa.OPTIONAL,
        mfaSecondFactor: {
          sms: true,
          otp: true,
        },
        accountRecovery: AccountRecovery.EMAIL_ONLY,
        removalPolicy: this.removalPolicy,
      });
    }

    if (!this.userPoolClient && this.userPool) {
      (this as any).userPoolClient = new UserPoolClient(scope, 'UserPoolClient', {
        userPool: this.userPool,
        userPoolClientName: `${Stack.of(scope).stackName}-UserPoolClient`,
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
        generateSecret: false,
        supportedIdentityProviders: [
          UserPoolClientIdentityProvider.COGNITO,
        ],
      });
    }
  }
}

/**
 * No-authentication authenticator for development and testing.
 *
 * Disables authentication entirely, allowing any client to connect
 * without credentials. This should ONLY be used for development
 * and testing environments.
 *
 * ## Security Warning
 *
 * This authenticator provides NO security. Never use in production.
 */
export class NoAuthenticator implements IAuthenticator {
  /**
   * No-op for NoAuthenticator since no authentication is performed.
   */
  grantAuthenticate(_lambdaFunction: IFunction): void {
    // No permissions needed
  }

  /**
   * Get environment variables for Lambda configuration.
   */
  environmentVariables(): Record<string, string> {
    return {
      AUTH_TYPE: 'None',
    };
  }
}


/**
 * Configuration properties for InteractiveAgent.
 *
 * Extends BaseAgentProps with communication, session, context, and authentication
 * strategy interfaces for building real-time conversational AI agents.
 */
export interface InteractiveAgentProps extends BaseAgentProps {
  /**
   * Communication adapter for client-agent interaction.
   *
   * @default StreamingHttpAdapter with CognitoAuthenticator
   */
  readonly communicationAdapter?: ICommunicationAdapter;

  /**
   * Session store for persisting conversation state.
   * Set to undefined to disable session persistence (stateless mode).
   *
   * @default S3SessionManager with 24-hour TTL
   */
  readonly sessionStore?: ISessionStore;

  /**
   * S3 bucket for session storage (shorthand for S3SessionManager).
   * Ignored if sessionStore is provided.
   *
   * @default Auto-created bucket
   */
  readonly sessionBucket?: IBucket;

  /**
   * Time-to-live for sessions.
   *
   * @default Duration.hours(24)
   */
  readonly sessionTTL?: Duration;

  /**
   * Context strategy for conversation history management.
   *
   * @default SlidingWindowConversationManager with 20 messages
   */
  readonly contextStrategy?: IContextStrategy;

  /**
   * Maximum number of messages to keep in conversation history.
   * Shorthand for SlidingWindowConversationManager windowSize.
   * Ignored if contextStrategy is provided.
   *
   * @default 20
   */
  readonly messageHistoryLimit?: number;

  /**
   * Authenticator for securing API endpoints.
   *
   * @default CognitoAuthenticator
   */
  readonly authenticator?: IAuthenticator;

  /**
   * Lambda function memory size in MB.
   *
   * @default 1024
   */
  readonly memorySize?: number;

  /**
   * Lambda function timeout.
   *
   * @default Duration.minutes(15)
   */
  readonly timeout?: Duration;

  /**
   * Lambda function architecture.
   *
   * @default Architecture.X86_64
   */
  readonly architecture?: Architecture;

  /**
   * Reserved concurrent executions for the Lambda function.
   *
   * @default No reserved concurrency
   */
  readonly reservedConcurrentExecutions?: number;
}

/**
 * Interactive Agent for real-time conversational AI with SSE streaming.
 *
 * Creates a complete serverless infrastructure for interactive AI conversations
 * using API Gateway REST API with response streaming, Lambda Web Adapter,
 * FastAPI, and standard Strands Agent.
 *
 * ## Architecture
 *
 * ```
 * Client (fetch + ReadableStream)
 *     ↓ POST /chat (Authorization: Bearer JWT)
 * API Gateway REST API (responseTransferMode: STREAM)
 *     ↓ InvokeWithResponseStream
 * Lambda (Python + Lambda Web Adapter + FastAPI)
 *     ↓ strands.Agent streaming
 * Amazon Bedrock (Claude)
 * ```
 *
 * ## Features
 *
 * - **SSE Streaming**: Real-time token-by-token response streaming
 * - **15-Minute Timeout**: Extended timeout for long conversations
 * - **Session Management**: S3-based conversation persistence
 * - **Context Windowing**: Sliding window conversation history
 * - **Cognito Auth**: Native JWT validation on REST API
 * - **Strategy Interfaces**: Pluggable adapters for all components
 * - **Observability**: Lambda Powertools integration
 *
 * ## Usage
 *
 * ```typescript
 * import { Asset } from 'aws-cdk-lib/aws-s3-assets';
 * import { InteractiveAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
 *
 * const systemPrompt = new Asset(this, 'Prompt', { path: './prompt.txt' });
 *
 * const agent = new InteractiveAgent(this, 'ChatAgent', {
 *   agentName: 'MyChatbot',
 *   agentDefinition: {
 *     bedrockModel: { useCrossRegionInference: true },
 *     systemPrompt: systemPrompt,
 *   },
 * });
 *
 * // Access outputs
 * agent.apiEndpoint;       // REST API endpoint URL
 * agent.sessionBucket;     // S3 session bucket
 * agent.authenticator;     // Cognito authenticator (for User Pool info)
 * ```
 */
export class InteractiveAgent extends BaseAgent {
  public readonly agentFunction: Function;
  public readonly adapter?: ICommunicationAdapter;
  public readonly sessionStore?: ISessionStore;
  public readonly contextStrategy?: IContextStrategy;
  public readonly authenticator?: IAuthenticator;
  public readonly apiEndpoint: string;
  public readonly sessionBucket?: IBucket;

  constructor(scope: Construct, id: string, props: InteractiveAgentProps) {
    super(scope, id, props);

    // Validate props
    this.validateProps(props);

    const modelId = BedrockModelUtils.deriveActualModelId(this.bedrockModel);
    const metricNamespace = props.metricNamespace || DefaultObservabilityConfig.DEFAULT_METRIC_NAMESPACE;
    const metricServiceName = props.metricServiceName || DefaultAgentConfig.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME;

    // Initialize authenticator
    this.authenticator = props.authenticator !== undefined ? props.authenticator : new CognitoAuthenticator();
    if (this.authenticator instanceof CognitoAuthenticator) {
      this.authenticator._setScope(this);
    }

    // Initialize communication adapter
    const adapter = props.communicationAdapter || new StreamingHttpAdapter({
      authenticator: this.authenticator,
    });
    this.adapter = adapter;
    if (adapter instanceof StreamingHttpAdapter) {
      adapter._setScope(this);
    }

    // Initialize session store
    if (props.sessionStore !== undefined) {
      this.sessionStore = props.sessionStore;
    } else if (props.sessionStore === undefined && props.sessionBucket) {
      this.sessionStore = new S3SessionManager(this, 'SessionManager', {
        bucket: props.sessionBucket,
        sessionTTL: props.sessionTTL,
      });
    } else {
      // Default: create S3SessionManager
      this.sessionStore = new S3SessionManager(this, 'SessionManager', {
        sessionTTL: props.sessionTTL,
        encryptionKey: props.encryptionKey,
        removalPolicy: props.removalPolicy,
      });
    }
    this.sessionBucket = this.sessionStore?.sessionBucket;

    // Initialize context strategy
    if (props.contextStrategy) {
      this.contextStrategy = props.contextStrategy;
    } else {
      this.contextStrategy = new SlidingWindowConversationManager({
        windowSize: props.messageHistoryLimit,
      });
    }

    // Build environment variables
    const env: Record<string, string> = {
      MODEL_ID: modelId,
      SYSTEM_PROMPT_S3_BUCKET_NAME: props.agentDefinition.systemPrompt.s3BucketName,
      SYSTEM_PROMPT_S3_KEY: props.agentDefinition.systemPrompt.s3ObjectKey,
      TOOLS_CONFIG: JSON.stringify(this.agentToolsLocationDefinitions),
      // Lambda Web Adapter configuration
      // AWS_LAMBDA_EXEC_WRAPPER tells Lambda to use LWA's bootstrap script
      // which intercepts the runtime and proxies requests to the web app
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
      AWS_LWA_INVOKE_MODE: 'response_stream',
      AWS_LWA_READINESS_CHECK_PATH: '/health',
      AWS_LWA_PORT: '8080',
      PORT: '8080',
      ...this.contextStrategy.environmentVariables(),
      ...this.authenticator.environmentVariables(),
      ...PowertoolsConfig.generateDefaultLambdaConfig(
        props.enableObservability,
        metricNamespace,
        metricServiceName,
      ),
    };

    // Add session bucket env var if session store exists
    if (this.sessionBucket) {
      env.SESSION_BUCKET = this.sessionBucket.bucketName;
    }

    // Create Lambda function with Lambda Web Adapter layer
    const { account, region } = Stack.of(this);
    const agentLambdaLogPermissionsResult = LambdaIamUtils.createLogsPermissions({
      account,
      region,
      scope: this,
      functionName: props.agentName,
      enableObservability: props.enableObservability,
    });

    // Lambda Web Adapter layer
    const webAdapterLayer = LayerVersion.fromLayerVersionArn(
      this,
      'LambdaWebAdapterLayer',
      `arn:aws:lambda:${region}:753240598075:layer:LambdaAdapterLayerX86:25`,
    );

    const allLayers: ILayerVersion[] = [webAdapterLayer];
    if (props.agentDefinition.lambdaLayers) {
      allLayers.push(...props.agentDefinition.lambdaLayers);
    }

    const handlerPath = path.join(__dirname, 'resources/interactive-agent-handler');

    // All Python version references derived from DefaultRuntimes.PYTHON
    const pythonRuntime = DefaultRuntimes.PYTHON;
    const pyVersion = pythonRuntime.name.replace('python', ''); // e.g. "3.13"

    this.agentFunction = new Function(this, 'InteractiveAgentFunction', {
      functionName: agentLambdaLogPermissionsResult.uniqueFunctionName,
      architecture: props.architecture || Architecture.X86_64,
      code: Code.fromAsset(handlerPath, {
        bundling: {
          image: pythonRuntime.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -a . /asset-output',
          ],
          local: {
            tryBundle(outputDir: string): boolean {
              try {
                const proc = require('child_process'); // eslint-disable-line @typescript-eslint/no-require-imports
                // Find a local Python >= 3.11 for pip (system default may be too old)
                const pythonCandidates = [`python${pyVersion}`, 'python3', 'python'];
                let pythonBin = 'python3';
                for (const candidate of pythonCandidates) {
                  try {
                    const ver = proc.execSync(`${candidate} --version 2>&1`, { encoding: 'utf-8' }).trim();
                    const match = ver.match(/Python (\d+)\.(\d+)/);
                    if (match && (parseInt(match[1]) > 3 || (parseInt(match[1]) === 3 && parseInt(match[2]) >= 11))) {
                      pythonBin = candidate;
                      break;
                    }
                  } catch {
                    continue;
                  }
                }
                proc.execSync(
                  `${pythonBin} -m pip install -r requirements.txt -t "${outputDir}" --platform manylinux2014_x86_64 --only-binary=:all: --python-version ${pyVersion}`,
                  { cwd: handlerPath, stdio: 'inherit' },
                );
                proc.execSync(
                  `cp -r . "${outputDir}"`,
                  { cwd: handlerPath, stdio: 'inherit' },
                );
                return true;
              } catch {
                return false;
              }
            },
          },
        },
      }),
      role: this.agentRole,
      handler: 'run.sh',
      runtime: pythonRuntime,
      layers: allLayers,
      timeout: props.timeout || Duration.minutes(15),
      memorySize: props.memorySize || 1024,
      environment: env,
      environmentEncryption: this.encryptionKey,
      vpc: props.network ? props.network.vpc : undefined,
      vpcSubnets: props.network ? props.network.applicationSubnetSelection() : undefined,
      reservedConcurrentExecutions: props.reservedConcurrentExecutions,
    });

    // Grant system prompt read access
    props.agentDefinition.systemPrompt.grantRead(this.agentRole);

    // Grant log permissions
    for (const s of agentLambdaLogPermissionsResult.policyStatements) {
      this.agentRole.addToPrincipalPolicy(s);
    }

    // Grant session store access
    if (this.sessionStore) {
      this.sessionStore.grantReadWrite(this.agentFunction);
    }

    // Grant authenticator permissions
    if (this.authenticator) {
      this.authenticator.grantAuthenticate(this.agentFunction);
    }

    // Attach communication adapter and get endpoint
    this.apiEndpoint = this.adapter!.attachToFunction(this.agentFunction);
    this.adapter!.grantInvoke(this.agentFunction);
  }

  /**
   * Validates InteractiveAgent props.
   */
  private validateProps(props: InteractiveAgentProps): void {
    if (!props.agentName || props.agentName.trim() === '') {
      throw new Error('agentName cannot be empty');
    }

    if (props.memorySize !== undefined && (props.memorySize < 128 || props.memorySize > 10240)) {
      throw new Error('memorySize must be between 128 and 10240 MB');
    }

    if (props.timeout !== undefined) {
      const timeoutSeconds = props.timeout.toSeconds();
      if (timeoutSeconds < 1 || timeoutSeconds > 900) {
        throw new Error('timeout must be between 1 second and 15 minutes');
      }
    }

    if (props.messageHistoryLimit !== undefined && (props.messageHistoryLimit < 1 || props.messageHistoryLimit > 1000)) {
      throw new Error('messageHistoryLimit must be between 1 and 1000');
    }
  }
}
