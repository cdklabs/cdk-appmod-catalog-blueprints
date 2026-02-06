import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DataIdentifier } from "aws-cdk-lib/aws-logs";
import { AgenticDocumentProcessing, QueuedS3Adapter, CloudWatchTransactionSearch } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Bucket, BucketEncryption, HttpMethods } from "aws-cdk-lib/aws-s3";
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class AgenticDocumentProcessingStack extends Stack {
    public readonly bucketName: string;
    public readonly tableName: string;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)
        
        // Enable CloudWatch Transaction Search for X-Ray traces
        // This provides cost-effective collection of all X-Ray spans through CloudWatch Logs
        new CloudWatchTransactionSearch(this, 'TransactionSearch', {
            samplingPercentage: 1  // 1% of spans indexed for trace summaries
        });
        
        // const network = new Network(this, 'AgenticIDPNetwork', {
        //     private: true
        // })

        const bucket = new Bucket(this, 'DocumentStorage', {
            encryption: BucketEncryption.KMS,
            cors: [
                {
                    allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST, HttpMethods.HEAD],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    exposedHeaders: ['ETag'],
                    maxAge: 3000
                }
            ]
        })

        // Export the KMS key ARN for cross-stack reference
        new CfnOutput(this, 'DocumentBucketKeyArn', {
            value: bucket.encryptionKey!.keyArn,
            exportName: 'AgenticDocProcessing-BucketKeyArn',
            description: 'KMS key ARN for document bucket encryption'
        });

        const toolDependenciesLayer = new lambda.LayerVersion(this, 'ToolDependenciesLayer', {
            code: lambda.Code.fromAsset('resources', {
                bundling: {
                image: lambda.Runtime.PYTHON_3_13.bundlingImage,
                command: [
                    'bash', '-c',
                    'pip install -r requirements.txt -t /asset-output/python --no-cache-dir --upgrade && cp requirements.txt /asset-output/'
                ],
                },
            }),
            compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
            description: 'pypdf dependencies for PDF extraction',
        });

        const agenticProcessing = new AgenticDocumentProcessing(this, 'AgenticDocumentProcessing', {
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
                        new Asset(this, 'DownloadSupportingDocumentsToolAsset', {path: __dirname+"/resources/tools/download_supporting_documents.py"}),
                        new Asset(this, 'PdfExtractorToolAsset', {path: __dirname+'/resources/tools/pdf_extractor.py'})
                    ],
                    lambdaLayers: [toolDependenciesLayer]
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

        // Export bucket and table names for cross-stack reference
        this.bucketName = bucket.bucketName;
        this.tableName = agenticProcessing.documentProcessingTable.tableName;

        new CfnOutput(this, 'DocumentBucketName', {
            value: bucket.bucketName,
            exportName: 'AgenticDocProcessing-BucketName',
            description: 'S3 bucket for document storage'
        });

        new CfnOutput(this, 'DocumentTableName', {
            value: agenticProcessing.documentProcessingTable.tableName,
            exportName: 'AgenticDocProcessing-TableName',
            description: 'DynamoDB table for document metadata'
        });

        // Export the table's KMS key ARN
        new CfnOutput(this, 'DocumentTableKeyArn', {
            value: agenticProcessing.encryptionKey.keyArn,
            exportName: 'AgenticDocProcessing-TableKeyArn',
            description: 'KMS key ARN for DynamoDB table encryption'
        });
    }
}