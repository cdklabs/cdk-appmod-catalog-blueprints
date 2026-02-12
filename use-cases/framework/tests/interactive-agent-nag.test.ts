import * as path from 'path';
import { Aspects, Stack } from 'aws-cdk-lib';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { createTestApp } from '../../utilities/test-utils';
import { InteractiveAgent } from '../agents/interactive-agent';

describe('InteractiveAgent CDK Nag', () => {
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  test('passes AWS Solutions checks for all configurations', () => {
    // Create a single app and stack for all scenarios
    // Use createTestApp() to skip Docker bundling and avoid ECR rate limiting
    const app = createTestApp();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    const systemPrompt = new Asset(stack, 'SystemPrompt', {
      path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
    });

    // Scenario 1: Minimal configuration (with session storage)
    const minimalAgent = new InteractiveAgent(stack, 'MinimalAgent', {
      agentName: 'MinimalAgent',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
    });

    // Scenario 2: With observability enabled
    const observableAgent = new InteractiveAgent(stack, 'ObservableAgent', {
      agentName: 'ObservableAgent',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
      enableObservability: true,
    });

    // Scenario 3: Stateless mode (no session storage)
    new InteractiveAgent(stack, 'StatelessAgent', {
      agentName: 'StatelessAgent',
      agentDefinition: {
        bedrockModel: { fmModelId: testModel },
        systemPrompt,
      },
      sessionStore: undefined,
    });

    // Apply suppressions for all agents at once
    // AwsSolutions-IAM4: Lambda execution role uses AWS managed policy
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Lambda execution role requires AWSLambdaBasicExecutionRole managed policy for CloudWatch Logs access',
      },
    ]);

    // AwsSolutions-IAM5: Wildcard permissions for Bedrock, S3, and KMS
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Bedrock InvokeModel requires wildcard permissions as it does not support resource-level permissions. S3 and KMS require wildcards for object-level operations.',
        appliesTo: [
          'Resource::*',
          'Action::s3:Abort*',
          'Action::s3:DeleteObject*',
          'Action::s3:GetBucket*',
          'Action::s3:GetObject*',
          'Action::s3:List*',
          'Resource::<MinimalAgentSessionManagerBucket*>/*',
          'Resource::<ObservableAgentSessionManagerBucket*>/*',
          'Action::kms:ReEncrypt*',
          'Action::kms:GenerateDataKey*',
        ],
      },
    ]);

    // AwsSolutions-S1: S3 bucket access logging
    NagSuppressions.addResourceSuppressions(
      minimalAgent,
      [
        {
          id: 'AwsSolutions-S1',
          reason: 'Session storage bucket does not require access logging as it contains temporary session data',
        },
      ],
      true,
    );

    NagSuppressions.addResourceSuppressions(
      observableAgent,
      [
        {
          id: 'AwsSolutions-S1',
          reason: 'Session storage bucket does not require access logging as it contains temporary session data',
        },
      ],
      true,
    );

    // AwsSolutions-L1: Lambda runtime version
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-L1',
        reason: 'Using Python 3.13 which is the latest stable runtime supported by Strands framework',
      },
    ]);

    // Run CDK Nag checks once for all scenarios
    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

    // Synthesize once - validates all three agent configurations
    expect(() => {
      app.synth();
    }).not.toThrow();
  });
});
