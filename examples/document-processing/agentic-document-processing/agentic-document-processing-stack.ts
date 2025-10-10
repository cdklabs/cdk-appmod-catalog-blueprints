import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DataIdentifier } from "aws-cdk-lib/aws-logs";
import { AgenticDocumentProcessing, QueuedS3Adapter } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";

export class AgenticDocumentProcessingStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)
        // const network = new Network(this, 'AgenticIDPNetwork', {
        //     private: true
        // })

        const bucket = new Bucket(this, 'DocumentStorage', {
            encryption: BucketEncryption.KMS
        })

        new AgenticDocumentProcessing(this, 'AgenticDocumentProcessing', {
            ingressAdapter: new QueuedS3Adapter({
                bucket
            }),
            classificationBedrockModel: {
                useCrossRegionInference: true
            },
            processingAgentParameters: {
                agentName: 'AgenticDocumentProcessing',
                agentDefinition: {
                    bedrockModel: {
                        useCrossRegionInference: true
                    },
                    systemPrompt: new Asset(this, 'SystemPromptAsset', {path: __dirname + "/resources/system_prompt.txt"}),
                    tools: [
                        new Asset(this, 'DownloadPolicyToolAsset', {path: __dirname+"/resources/tools/download_policy.py"}),
                        new Asset(this, 'DownloadSupportingDocumentsToolAsset', {path: __dirname+"/resources/tools/download_supporting_documents.py"})
                    ]
                },
                prompt: `
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
                expectJson: true,
                logGroupDataProtection: {
                    dataProtectionIdentifiers: [
                        DataIdentifier.NAME
                    ]
                }
            },
            enableObservability: true,
            metricNamespace: "agentic-document-processing",
            metricServiceName: "insurance-claims",
            logGroupDataProtection: {
                dataProtectionIdentifiers: [
                    DataIdentifier.NAME
                ]
            }
        })
    }
}