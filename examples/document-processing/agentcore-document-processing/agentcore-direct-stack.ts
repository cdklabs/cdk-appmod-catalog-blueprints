import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { 
  BatchAgent, 
  AgentRuntimeType, 
  AgentCoreDeploymentMethod 
} from '@cdklabs/cdk-appmod-catalog-blueprints';
import * as path from 'path';

/**
 * Stack demonstrating insurance claims processing with AgentCore runtime using DIRECT_CODE deployment
 * 
 * This approach deploys agent code as a ZIP archive in S3.
 * Best for: Long-running tasks, Python-based agents, teams without Docker expertise
 */
export class DocumentProcessingAgentCoreDirectStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create document storage bucket
    const documentBucket = new Bucket(this, 'DocumentBucket', {
      encryption: BucketEncryption.KMS,
    });

    // Create S3 bucket for agent code
    const codeBucket = new Bucket(this, 'AgentCodeBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Package and upload agent code to S3
    // In production, this would be done via CI/CD pipeline
    new BucketDeployment(this, 'AgentCodeDeployment', {
      sources: [Source.asset(path.join(__dirname, 'agent-code'))],
      destinationBucket: codeBucket,
      destinationKeyPrefix: 'agents',
    });

    // Create system prompt asset
    const systemPrompt = new Asset(this, 'SystemPrompt', {
      path: path.join(__dirname, 'prompts', 'system_prompt.txt'),
    });

    // Create tool assets
    const downloadPolicyTool = new Asset(this, 'DownloadPolicyTool', {
      path: path.join(__dirname, 'tools', 'download_policy.py'),
    });

    const downloadSupportingDocsTool = new Asset(this, 'DownloadSupportingDocsTool', {
      path: path.join(__dirname, 'tools', 'download_supporting_documents.py'),
    });

    // Create BatchAgent with AgentCore runtime (DIRECT_CODE)
    const agent = new BatchAgent(this, 'InsuranceClaimsAgent', {
      agentName: 'InsuranceClaimsAgentCoreDirect',
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
      metricServiceName: 'claims-processing-agentcore-direct',
      runtime: {
        type: AgentRuntimeType.AGENTCORE,
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
          codeBucket: codeBucket.bucketName,
          codeKey: 'agents/agent-code.zip', // BucketDeployment creates this
          timeout: Duration.hours(2),
          memorySize: 2048,
          minCapacity: 1,
          maxCapacity: 5,
        },
      },
    });

    // Grant bucket access to agent
    documentBucket.grantRead(agent.agentRole);

    // Outputs
    new CfnOutput(this, 'DocumentBucketName', {
      value: documentBucket.bucketName,
      description: 'S3 bucket for policies and supporting documents',
    });

    new CfnOutput(this, 'CodeBucketName', {
      value: codeBucket.bucketName,
      description: 'S3 bucket containing agent code',
    });

    new CfnOutput(this, 'AgentRuntimeArn', {
      value: agent.runtime.invocationArn,
      description: 'AgentCore runtime ARN for invocation',
    });

    new CfnOutput(this, 'AgentRoleArn', {
      value: agent.agentRole.roleArn,
      description: 'IAM role ARN for the agent',
    });

    new CfnOutput(this, 'RuntimeType', {
      value: 'AgentCore (DIRECT_CODE)',
      description: 'Runtime type used for this agent',
    });

    new CfnOutput(this, 'MaxExecutionTime', {
      value: '2 hours',
      description: 'Maximum execution time for AgentCore runtime',
    });

    new CfnOutput(this, 'DeploymentMethod', {
      value: 'ZIP archive in S3',
      description: 'Code deployment method',
    });
  }
}
