import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { DataIdentifier } from "aws-cdk-lib/aws-logs";
import { AgenticDocumentProcessing, QueuedS3Adapter, DefaultRuntimes } from '@cdklabs/cdk-appmod-catalog-blueprints';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { LayerVersion, Code } from "aws-cdk-lib/aws-lambda";

export class FraudDetectionStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create KMS-encrypted S3 bucket for document storage
        const bucket = new Bucket(this, 'DocumentStorage', {
            encryption: BucketEncryption.KMS
        });

        // Create Lambda Layer with PyPDF2 and Pillow dependencies
        const toolDependenciesLayer = new LayerVersion(this, 'ToolDependenciesLayer', {
            code: Code.fromAsset(__dirname + "/resources", {
                bundling: {
                    image: DefaultRuntimes.PYTHON.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output/python && cp requirements.txt /asset-output/'
                    ]
                }
            }),
            compatibleRuntimes: [DefaultRuntimes.PYTHON],
            description: 'PyPDF2 and Pillow dependencies for fraud detection tools'
        });

        // Configure AgenticDocumentProcessing construct
        new AgenticDocumentProcessing(this, 'FraudDetectionProcessing', {
            ingressAdapter: new QueuedS3Adapter({
                bucket
            }),
            classificationBedrockModel: {
                useCrossRegionInference: true
            },
            processingAgentParameters: {
                agentName: 'FraudDetectionAgent',
                agentDefinition: {
                    bedrockModel: {
                        useCrossRegionInference: true
                    },
                    systemPrompt: new Asset(this, 'SystemPromptAsset', {
                        path: __dirname + "/resources/system_prompt.txt"
                    }),
                    tools: [
                        new Asset(this, 'DocumentExtractorToolAsset', {
                            path: __dirname + "/resources/tools/document_extractor.py"
                        }),
                        new Asset(this, 'MetadataAnalyzerToolAsset', {
                            path: __dirname + "/resources/tools/metadata_analyzer.py"
                        }),
                        new Asset(this, 'PatternMatcherToolAsset', {
                            path: __dirname + "/resources/tools/pattern_matcher.py"
                        }),
                        new Asset(this, 'AnomalyDetectorToolAsset', {
                            path: __dirname + "/resources/tools/anomaly_detector.py"
                        }),
                        new Asset(this, 'DatabaseLookupToolAsset', {
                            path: __dirname + "/resources/tools/database_lookup.py"
                        })
                    ],
                    lambdaLayers: [toolDependenciesLayer]
                },
                prompt: `
                    Analyze the attached financial document for fraud indicators. The document is stored in S3 bucket: ${bucket.bucketName}
                    
                    You have access to the following fraud detection tools:
                    1. extract_document_fields - CALL THIS FIRST to extract text and key fields from the PDF
                    2. metadata_analyzer - Examines document metadata for tampering indicators
                    3. pattern_matcher - Identifies known fraud patterns and suspicious formatting
                    4. anomaly_detector - Detects statistical outliers and unusual values (including date checks)
                    5. database_lookup - Verifies vendors and checks against blacklists
                    
                    Perform a comprehensive multi-stage fraud analysis:
                    0. Document Field Extraction (use extract_document_fields)
                    1. Document Authenticity Verification (use metadata_analyzer)
                    2. Content Anomaly Detection (use anomaly_detector)
                    3. Pattern Matching (use pattern_matcher)
                    4. Cross-Reference Validation (use database_lookup)
                    5. Calculate overall risk score and provide recommendations
                    
                    CRITICAL RULES FOR INDICATORS:
                    - Your "indicators" array must ONLY contain findings that are explicitly returned by the tools
                    - DO NOT add your own interpretations about dates, amounts, or other fields
                    - DO NOT flag transaction dates as "future" unless anomaly_detector explicitly reports a "future_date" anomaly
                    - If a tool returns empty results (e.g., empty anomalies array), that means NO issues were found
                    - Trust the tools' date logic - they use the current system time and know what "today" is
                    
                    Final output must be in JSON format with the following structure:
                    {
                        "risk_score": <0-100>,
                        "risk_level": "<LOW|MEDIUM|HIGH|CRITICAL>",
                        "findings": {
                            "metadata_analysis": {...},
                            "pattern_matches": [...],
                            "anomalies": [...],
                            "database_checks": {...}
                        },
                        "indicators": [...],
                        "recommended_actions": [...]
                    }
                `,
                enableObservability: true,
                metricNamespace: "fraud-detection",
                metricServiceName: "financial-documents",
                expectJson: true,
                logGroupDataProtection: {
                    dataProtectionIdentifiers: [
                        DataIdentifier.NAME
                    ]
                }
            },
            enableObservability: true,
            metricNamespace: "fraud-detection",
            metricServiceName: "financial-documents",
            logGroupDataProtection: {
                dataProtectionIdentifiers: [
                    DataIdentifier.NAME
                ]
            }
        });
    }
}
