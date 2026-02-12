import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Construct } from 'constructs';
import { 
  InteractiveAgent,
} from '@cdklabs/cdk-appmod-catalog-blueprints';

/**
 * Properties for the ChatbotStack (Backend Only)
 */
export interface ChatbotStackBackendOnlyProps extends cdk.StackProps {
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
 * Customer Support Chatbot Stack (Backend Only - for testing)
 * 
 * This stack deploys only the backend components:
 * - Real-time WebSocket communication via InteractiveAgent
 * - Cognito authentication
 * - Conversation context management (20-message sliding window)
 * - Extended sessions (24-hour TTL)
 * - Comprehensive observability
 */
export class ChatbotStackBackendOnly extends cdk.Stack {
  /** The InteractiveAgent construct */
  public readonly agent: InteractiveAgent;

  constructor(scope: Construct, id: string, props?: ChatbotStackBackendOnlyProps) {
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

    // CloudFormation Outputs
    new CfnOutput(this, 'WebSocketUrl', {
      value: this.agent.apiEndpoint,
      description: 'WebSocket API endpoint for chat',
      exportName: `${this.stackName}-WebSocketUrl`,
    });

    new CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
      exportName: `${this.stackName}-Region`,
    });

    // Output Lambda function name for testing
    new CfnOutput(this, 'AgentFunctionName', {
      value: this.agent.agentFunction.functionName,
      description: 'Lambda function name',
      exportName: `${this.stackName}-AgentFunctionName`,
    });

    // Output session table name
    new CfnOutput(this, 'SessionTableName', {
      value: this.agent.sessionTable.tableName,
      description: 'DynamoDB session table name',
      exportName: `${this.stackName}-SessionTableName`,
    });
  }
}
