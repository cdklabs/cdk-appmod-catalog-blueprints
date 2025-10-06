import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { DataIdentifier } from "aws-cdk-lib/aws-logs";
import { AgenticDocumentProcessing, Network, QueuedS3Adapter} from '@cdklabs/cdk-appmod-catalog-blueprints';

export class AgenticDocumentProcessingStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)
        const network = new Network(this, 'AgenticIDPNetwork', {
            private: true
        })

        const bucket = new Bucket(this, 'AgenticDocumentProcessingBucket', {
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: BucketEncryption.KMS,
            bucketKeyEnabled: true
        })

        new BucketDeployment(this, 'DeployTools', {
            sources: [
                Source.asset(__dirname+"/resources/tools/")
            ],
            destinationBucket: bucket,
            destinationKeyPrefix: 'agentic-tools/'
        })

        new AgenticDocumentProcessing(this, 'AgenticDocumentProcessing', {
            ingressAdapter: new QueuedS3Adapter({
                bucket
            }),
            useCrossRegionInference: true,
            processingAgentParameters: {
                agentSystemPrompt: `
                    You're an insurance claims specialist. Use the provided tools to ensure that the submitted claims and supporting documents are valid and there are no discrepancies.
                `,
                toolsLocation: [
                    `s3://${bucket.bucketName}/agentic-tools/download_policy.py`,
                    `s3://${bucket.bucketName}/agentic-tools/download_supporting_documents.py`
                ]
            },
            processingPrompt: `
                Analyze the attached insurance claim document and check if this is a valid claim or not. The policy number of the insurance is in the claim form.
                The policies and the supporting documents are all in the S3 bucket: ${bucket.bucketName}
                Tools are provided for the following: 1/ downloading of the policy, 2/ downloading of all supporting documents outlined in the claim
                Do the following: 1/ verify the claim against the policy, 2/ download the supporting documents and verify the list of supporting documents per the claim form,
                3/ provide a final determination.

                For each of the document (policy, claims, supporting documents) summarize the content before including in the context.

                Final output should in JSON with the following format:

                {
                    "claim_approved": <true/false whether the claim is approved or not>
                    "justification": <reason for not approving, justification for approving>
                }
            `,
            enableObservability: true,
            metricNamespace: "agentic-document-processing",
            metricServiceName: "insurance-claims",
            network,
            logGroupDataProtection: {
                dataProtectionIdentifiers: [
                    DataIdentifier.NAME
                ]
            }
        })
    }
}