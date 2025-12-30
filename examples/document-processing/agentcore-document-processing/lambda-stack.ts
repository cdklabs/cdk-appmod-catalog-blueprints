import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
import * as path from 'path';

/**
 * Stack demonstrating insurance claims processing with BatchAgent using Lambda runtime
 * 
 * This is the baseline implementation using traditional Lambda functions.
 * Best for: Short-duration tasks (<15 min), event-driven workloads, cost-sensitive applications
 */
export class DocumentProcessingLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create system prompt asset
    const systemPrompt = new Asset(this, 'SystemPrompt', {
      path: path.join(__dirname, 'prompts', 'system_prompt.txt'),
    });

    // Create document storage bucket
    const documentBucket = new Bucket(this, 'DocumentBucket', {
      encryption: BucketEncryption.KMS,
    });

    // Create tool assets
    const downloadPolicyTool = new Asset(this, 'DownloadPolicyTool', {
      path: path.join(__dirname, 'tools', 'download_policy.py'),
    });

    const downloadSupportingDocsTool = new Asset(this, 'DownloadSupportingDocsTool', {
      path: path.join(__dirname, 'tools', 'download_supporting_documents.py'),
    });

    // Create BatchAgent with Lambda runtime (default)
    const agent = new BatchAgent(this, 'InsuranceClaimsAgent', {
      agentName: 'InsuranceClaimsLambda',
      agentDefinition: {
        bedrockModel: {
          useCrossRegionInference: true,
        },
        systemPrompt: systemPrompt,
        tools: [downloadPolicyTool, downloadSupportingDocsTool],
      },
      prompt: `
        Analyze the attached insurance claim document and verify if this is a valid claim.
        The policy number is in the claim form.
        
        The policies and supporting documents are in S3 bucket: ${documentBucket.bucketName}
        
        Steps:
        1. Download and verify the claim against the policy
        2. Download supporting documents listed in the claim form
        3. Cross-reference claim details with supporting documents
        4. Provide final determination
        
        For each document (policy, claim, supporting docs), summarize the content before including in context.
        
        Output in JSON format:
        {
          "claim_approved": <true/false>,
          "justification": "<detailed reason for approval/denial>"
        }
      `,
      expectJson: true,
      enableObservability: true,
      metricNamespace: 'insurance-claims',
      metricServiceName: 'claims-processing-lambda',
      // No runtime configuration = Lambda runtime by default
    });

    // Grant bucket access to agent
    documentBucket.grantRead(agent.agentRole);

    // Outputs
    new CfnOutput(this, 'DocumentBucketName', {
      value: documentBucket.bucketName,
      description: 'S3 bucket for policies and supporting documents',
    });

    new CfnOutput(this, 'AgentFunctionName', {
      value: agent.agentFunction?.functionName || 'N/A',
      description: 'Lambda function name for the agent',
    });

    new CfnOutput(this, 'AgentFunctionArn', {
      value: agent.agentFunction?.functionArn || 'N/A',
      description: 'Lambda function ARN for the agent',
    });

    new CfnOutput(this, 'AgentRoleArn', {
      value: agent.agentRole.roleArn,
      description: 'IAM role ARN for the agent',
    });

    new CfnOutput(this, 'RuntimeType', {
      value: 'Lambda',
      description: 'Runtime type used for this agent',
    });

    new CfnOutput(this, 'MaxExecutionTime', {
      value: '15 minutes',
      description: 'Maximum execution time for Lambda runtime',
    });
  }
}
