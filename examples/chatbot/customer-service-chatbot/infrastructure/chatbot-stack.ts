import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Construct } from 'constructs';
import { 
  InteractiveAgent,
  Frontend,
} from '@cdklabs/cdk-appmod-catalog-blueprints';

/**
 * Properties for the ChatbotStack
 */
export interface ChatbotStackProps extends cdk.StackProps {
  /**
   * System prompt file path
   * @default '../resources/system_prompt.txt'
   */
  readonly systemPromptPath?: string;
  
  /**
   * Number of messages to retain in context
   * @default 20
   */
  readonly contextWindowSize?: number;
  
  /**
   * Session TTL
   * @default Duration.hours(24)
   */
  readonly sessionTTL?: Duration;
  
  /**
   * Bedrock model ID
   * @default FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_HAIKU_20240307_V1_0
   */
  readonly modelId?: FoundationModelIdentifier;
  
  /**
   * Enable observability
   * @default true
   */
  readonly enableObservability?: boolean;
}

/**
 * Customer Support Chatbot Stack
 * 
 * This stack deploys a production-ready customer support chatbot with:
 * - Real-time streaming via InteractiveAgent (REST API + SSE)
 * - Cognito authentication
 * - Conversation context management (20-message sliding window)
 * - Extended sessions (24-hour TTL)
 * - React frontend hosted on S3 + CloudFront
 * - Comprehensive observability
 */
export class ChatbotStack extends cdk.Stack {
  /** The InteractiveAgent construct */
  public readonly agent: InteractiveAgent;
  
  /** The Frontend construct */
  public readonly frontend: Frontend;

  constructor(scope: Construct, id: string, props?: ChatbotStackProps) {
    super(scope, id, props);

    // Get configuration with defaults
    const systemPromptPath = props?.systemPromptPath || path.join(__dirname, '../resources/system_prompt.txt');
    const contextWindowSize = props?.contextWindowSize || 20;
    const sessionTTL = props?.sessionTTL || Duration.hours(24);
    const enableObservability = props?.enableObservability ?? true;

    // Create system prompt asset
    const systemPrompt = new Asset(this, 'SystemPrompt', {
      path: systemPromptPath,
    });

    // Create InteractiveAgent
    this.agent = new InteractiveAgent(this, 'ChatAgent', {
      agentName: 'customer-support',
      agentDefinition: {
        bedrockModel: {
          fmModelId: props?.modelId || FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_HAIKU_20240307_V1_0,
        },
        systemPrompt: systemPrompt,
      },
      
      // Context management
      messageHistoryLimit: contextWindowSize,
      sessionTTL: sessionTTL,
      
      // Observability
      enableObservability: enableObservability,
      metricNamespace: 'customer-support-chatbot',
      metricServiceName: 'chat-agent',
    });

    // Create Frontend
    this.frontend = new Frontend(this, 'Frontend', {
      sourceDirectory: path.join(__dirname, '../frontend'),
      buildCommand: 'npm run build',
      skipBuild: true, // Using pre-built frontend with correct .env.production
      buildOutputDirectory: path.join(__dirname, '../frontend/build'),
      enableObservability: enableObservability,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // CloudFormation Outputs - All Real Values
    
    // Chat API (REST API with response streaming)
    new CfnOutput(this, 'ChatApiEndpoint', {
      value: this.agent.apiEndpoint,
      description: 'REST API endpoint for chat (POST /chat with SSE streaming)',
      exportName: `${this.stackName}-ChatApiEndpoint`,
    });

    // Cognito Authentication (from InteractiveAgent's CognitoAuthenticator)
    const cognitoAuthenticator = this.agent.authenticator as any; // CognitoAuthenticator
    new CfnOutput(this, 'UserPoolId', {
      value: cognitoAuthenticator?.userPool?.userPoolId || 'Not available',
      description: 'Cognito User Pool ID for authentication',
      exportName: `${this.stackName}-UserPoolId`,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: cognitoAuthenticator?.userPoolClient?.userPoolClientId || 'Not available',
      description: 'Cognito User Pool Client ID for authentication',
      exportName: `${this.stackName}-UserPoolClientId`,
    });

    // Session Management (from InteractiveAgent's S3SessionManager)
    new CfnOutput(this, 'SessionBucket', {
      value: this.agent.sessionBucket?.bucketName || 'Not available',
      description: 'S3 bucket for session storage',
      exportName: `${this.stackName}-SessionBucket`,
    });

    // Lambda Function
    new CfnOutput(this, 'AgentFunctionName', {
      value: this.agent.agentFunction.functionName,
      description: 'Lambda function name for the chat agent',
      exportName: `${this.stackName}-AgentFunctionName`,
    });

    new CfnOutput(this, 'AgentFunctionArn', {
      value: this.agent.agentFunction.functionArn,
      description: 'Lambda function ARN for the chat agent',
      exportName: `${this.stackName}-AgentFunctionArn`,
    });

    // Frontend
    new CfnOutput(this, 'FrontendUrl', {
      value: this.frontend.url(),
      description: 'Frontend application URL (CloudFront)',
      exportName: `${this.stackName}-FrontendUrl`,
    });

    new CfnOutput(this, 'DistributionDomain', {
      value: this.frontend.distributionDomainName(),
      description: 'CloudFront distribution domain',
      exportName: `${this.stackName}-DistributionDomain`,
    });

    new CfnOutput(this, 'FrontendBucket', {
      value: this.frontend.bucketName(),
      description: 'S3 bucket for frontend assets',
      exportName: `${this.stackName}-FrontendBucket`,
    });

    // Region
    new CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
      exportName: `${this.stackName}-Region`,
    });
  }
}
