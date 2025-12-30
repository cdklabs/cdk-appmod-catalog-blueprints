import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { 
  BatchAgent, 
  AgentRuntimeType, 
  AgentCoreDeploymentMethod 
} from '@cdklabs/cdk-appmod-catalog-blueprints';
import * as path from 'path';

/**
 * Stack demonstrating insurance claims processing with AgentCore runtime using CONTAINER deployment
 * 
 * This approach deploys agent code as a Docker container in ECR.
 * Best for: Complex dependencies, multi-language agents, production deployments
 */
export class DocumentProcessingAgentCoreContainerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create document storage bucket
    const documentBucket = new Bucket(this, 'DocumentBucket', {
      encryption: BucketEncryption.KMS,
    });

    // Create ECR repository for agent container
    const repository = new Repository(this, 'AgentRepository', {
      repositoryName: 'insurance-claims-agent',
    });

    // Build and push Docker image
    const dockerImage = new DockerImageAsset(this, 'AgentDockerImage', {
      directory: path.join(__dirname, 'docker'),
      platform: Platform.LINUX_AMD64,
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

    // Create BatchAgent with AgentCore runtime (CONTAINER)
    const agent = new BatchAgent(this, 'InsuranceClaimsAgent', {
      agentName: 'InsuranceClaimsAgentCoreContainer',
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
      metricServiceName: 'claims-processing-agentcore-container',
      runtime: {
        type: AgentRuntimeType.AGENTCORE,
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: dockerImage.imageUri,
          timeout: Duration.hours(4),
          memorySize: 4096,
          minCapacity: 2,
          maxCapacity: 10,
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

    new CfnOutput(this, 'RepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR repository URI for agent container',
    });

    new CfnOutput(this, 'ImageUri', {
      value: dockerImage.imageUri,
      description: 'Docker image URI for the agent',
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
      value: 'AgentCore (CONTAINER)',
      description: 'Runtime type used for this agent',
    });

    new CfnOutput(this, 'MaxExecutionTime', {
      value: '4 hours',
      description: 'Maximum execution time for AgentCore runtime',
    });

    new CfnOutput(this, 'DeploymentMethod', {
      value: 'Docker container in ECR',
      description: 'Code deployment method',
    });
  }
}
