import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { 
  AgenticDocumentProcessing,
  QueuedS3Adapter,
  AgentRuntimeType, 
  AgentCoreDeploymentMethod 
} from '@cdklabs/cdk-appmod-catalog-blueprints';
import * as path from 'path';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { DataIdentifier } from 'aws-cdk-lib/aws-logs';

/**
 * Stack demonstrating insurance claims processing with AgentCore runtime using CONTAINER deployment
 * 
 * This approach deploys the full document processing workflow with AgentCore runtime.
 * The workflow includes: S3 ingestion → Classification → Extraction → Agentic Processing
 * 
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
    const repository = new Repository(this, 'AgentRepository');

    // Build and push Docker image
    // AgentCore requires ARM64 architecture
    const dockerImage = new DockerImageAsset(this, 'AgentDockerImage', {
      directory: path.join(__dirname),
      file: 'docker/Dockerfile',
      platform: Platform.LINUX_ARM64,
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

    // Create full document processing workflow with AgentCore runtime
    const documentProcessing = new AgenticDocumentProcessing(this, 'AgenticDocumentProcessing', {
      ingressAdapter: new QueuedS3Adapter({
        bucket: documentBucket,
      }),
      classificationBedrockModel: {
        useCrossRegionInference: true,
      },
      processingAgentParameters: {
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
          },
        },
        logGroupDataProtection: {
          dataProtectionIdentifiers: [DataIdentifier.NAME],
        },
      },
      enableObservability: true,
      metricNamespace: 'insurance-claims',
      metricServiceName: 'document-processing-agentcore-container',
      logGroupDataProtection: {
        dataProtectionIdentifiers: [DataIdentifier.NAME],
      },
    });

    // Outputs
    new CfnOutput(this, 'DocumentBucketName', {
      value: documentBucket.bucketName,
      description: 'S3 bucket for document ingestion and storage',
    });

    new CfnOutput(this, 'RepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR repository URI for agent container',
    });

    new CfnOutput(this, 'ImageUri', {
      value: dockerImage.imageUri,
      description: 'Docker image URI for the agent',
    });

    new CfnOutput(this, 'StateMachineArn', {
      value: documentProcessing.stateMachine.stateMachineArn,
      description: 'Step Functions state machine ARN for document processing workflow',
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
