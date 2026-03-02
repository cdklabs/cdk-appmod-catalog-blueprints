# External Integrations

**Analysis Date:** 2026-03-01

## AWS Services & APIs

**AI & Machine Learning:**
- Amazon Bedrock - Large language model inference
  - SDK/Client: aws-cdk-lib/aws-bedrock
  - Models: Claude 3 Sonnet (default), supports cross-region inference profiles
  - IAM Actions: `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`, `bedrock:Retrieve`, `bedrock:RetrieveAndGenerate`, `bedrock:ApplyGuardrail`
  - Usage: `use-cases/framework/bedrock/bedrock.ts` provides `BedrockModelUtils` for model management and IAM permissions

**Document & Data Processing:**
- Amazon Textract - Document analysis and extraction (referenced in comments, integration-ready)
- Amazon Comprehend - Natural language processing (integration-ready)
- Amazon Textract via Step Functions - Document processing workflows

**Compute:**
- AWS Lambda - Serverless functions
  - SDK/Client: aws-cdk-lib/aws-lambda
  - Runtimes: Node.js, Python (via @aws-cdk/aws-lambda-python-alpha)
  - Usage: Document processing, data loading, workflow steps in `use-cases/document-processing/`, `use-cases/utilities/`
- AWS Step Functions - Workflow orchestration
  - SDK/Client: aws-cdk-lib/aws-stepfunctions, aws-cdk-lib/aws-stepfunctions-tasks
  - Tasks: BedrockInvokeModel, LambdaInvoke, DynamoUpdateItem, DynamoPutItem, StepFunctionsStartExecution
  - Usage: `use-cases/document-processing/base-document-processing.ts` orchestrates document workflows

**Storage & Databases:**
- Amazon S3 - Object storage
  - SDK/Client: aws-cdk-lib/aws-s3, aws-cdk-lib/aws-s3-assets, aws-cdk-lib/aws-s3-deployment, aws-cdk-lib/aws-s3-notifications
  - Usage: Document storage, vector embeddings, Lambda layer distribution in `use-cases/` modules
  - Features: Encryption, versioning, bucket policies, event notifications to SQS
- Amazon DynamoDB - NoSQL database
  - SDK/Client: aws-cdk-lib/aws-dynamodb
  - Usage: Document processing metadata, workflow state tracking in `use-cases/document-processing/`
  - Table keys: DocumentId as partition key
  - Encryption: KMS-managed
- Amazon RDS - Relational database
  - SDK/Client: aws-cdk-lib/aws-rds
  - Engines: PostgreSQL, MySQL
  - Usage: Data loading via `use-cases/utilities/data-loader.ts`
  - Features: Aurora clusters and instances, Secrets Manager integration for credentials
- Amazon Aurora - Managed relational database
  - Supported in DataLoader construct for SQL/mysqldump/pgdump loading

**Vector Databases (Knowledge Base Integration):**
- Amazon OpenSearch Serverless - Vector store for Bedrock knowledge bases
  - Type: 'opensearch-serverless' in `use-cases/framework/agents/knowledge-base/knowledge-base-props.ts`
- Pinecone - Third-party vector database
  - Type: 'pinecone' in knowledge base configuration
- Amazon RDS with pgvector - PostgreSQL vector extensions
  - Type: 'rds' in knowledge base configuration
- S3 Vectors - Default vector storage in S3
  - Type: 's3-vectors' in knowledge base configuration

**Networking:**
- Amazon VPC - Virtual private cloud
  - SDK/Client: aws-cdk-lib/aws-ec2
  - Components: Subnets, security groups, VPC endpoints, NAT providers
  - Usage: `use-cases/framework/foundation/network.ts` provides VPC configuration
  - VPC Endpoints: Step Functions, EventBridge, CloudWatch Logs, CloudWatch Monitoring
- AWS API Gateway - HTTP API endpoints
  - SDK/Client: aws-cdk-lib/aws-apigateway
  - Usage: Interactive agent REST API exposure in `use-cases/framework/agents/interactive-agent.ts`

**Authentication & Authorization:**
- Amazon Cognito - User identity and authentication
  - SDK/Client: aws-cdk-lib/aws-cognito
  - Components: UserPool, UserPoolClient, MFA, account recovery
  - Usage: Interactive agent authentication in `use-cases/framework/agents/interactive-agent.ts`
  - Features: Multi-factor authentication, identity provider integration

**Message Queue:**
- Amazon SQS - Message queuing
  - SDK/Client: aws-cdk-lib/aws-sqs
  - Usage: Document ingestion queue in `use-cases/document-processing/adapter.ts`
  - Features: Dead letter queue, visibility timeout configuration

**Events:**
- Amazon EventBridge - Event bus and routing
  - SDK/Client: aws-cdk-lib/aws-events, aws-cdk-lib/aws-stepfunctions-tasks
  - Usage: Custom event publishing in `use-cases/framework/foundation/eventbridge-broker.ts`
  - Features: Event routing, custom event bus, KMS encryption

**Content Delivery:**
- Amazon CloudFront - Content delivery network
  - SDK/Client: aws-cdk-lib/aws-cloudfront, aws-cdk-lib/aws-cloudfront-origins
  - Usage: Global static asset distribution in `use-cases/webapp/frontend-construct.ts`
  - Features: Cache behaviors, error responses (SPA support), custom domains, security headers

**DNS:**
- Amazon Route 53 - Domain name system
  - SDK/Client: aws-cdk-lib/aws-route53, aws-cdk-lib/aws-route53-targets
  - Usage: DNS records and hosting zones in webapp deployments
  - Features: Alias records, CloudFront target integration

**Security & Encryption:**
- AWS KMS - Key management service
  - SDK/Client: aws-cdk-lib/aws-kms
  - Usage: Encryption key management for S3, DynamoDB, SQS, EventBridge
  - Features: Key rotation enabled, cross-service encryption
- AWS IAM - Identity and access management
  - SDK/Client: aws-cdk-lib/aws-iam
  - Usage: Roles, policies, service principals throughout all constructs
- AWS Secrets Manager - Secrets storage
  - SDK/Client: aws-cdk-lib/aws-secretsmanager
  - Usage: Database credentials in `use-cases/utilities/data-loader.ts`
- AWS Certificate Manager - SSL/TLS certificates
  - SDK/Client: aws-cdk-lib/aws-certificatemanager
  - Usage: Custom domain certificates in `use-cases/webapp/frontend-construct.ts`

**Monitoring & Logging:**
- Amazon CloudWatch - Monitoring and logging
  - SDK/Client: aws-cdk-lib/aws-cloudwatch, aws-cdk-lib/aws-logs
  - Usage: Comprehensive observability in `use-cases/utilities/observability/`
  - Features: Log groups, metrics, alarms, Lambda Powertools integration
  - Data Protection: Log data masking for PII in `use-cases/utilities/`

## External Third-Party Services

**Vector Database Integrations:**
- Pinecone - Third-party vector database
  - Configuration: Bedrock knowledge base support via `pinecone` vector store type
  - Usage: Alternative to S3 Vectors or OpenSearch Serverless
  - Integration: `use-cases/framework/agents/knowledge-base/knowledge-base-props.ts` supports Pinecone configuration

## Authentication & Identity

**Auth Provider:**
- AWS Cognito (Primary) - Built-in user authentication
  - Implementation: UserPool with MFA, account recovery, identity provider support
  - Usage: Interactive agent web interface authentication

**Bedrock Guardrails:**
- Optional content filtering during retrieval operations
- IAM Action: `bedrock:ApplyGuardrail`
- Configuration: `use-cases/framework/agents/knowledge-base/knowledge-base-props.ts` supports guardrail integration

## Webhooks & Callbacks

**Incoming:**
- API Gateway - REST endpoints for interactive agents
  - Endpoints: Lambda proxy integration for request/response handling
  - Auth: Cognito user pool integration

**Outgoing:**
- EventBridge Custom Events - Custom event publishing from document processing workflows
  - Broker: `use-cases/framework/foundation/eventbridge-broker.ts`
  - Usage: Notifications during workflow state changes (classification, extraction, enrichment, completion)

## Data Flow Integrations

**Document Processing Pipeline:**
- S3 Upload (raw/) → S3 Event Notification → SQS → Lambda Consumer → Step Functions
- Step Functions orchestrates:
  - Bedrock InvokeModel (classification, extraction, enrichment)
  - Lambda custom processing steps
  - DynamoDB state updates
  - EventBridge event publication
  - S3 result storage (processed/ or failed/ prefix)

**Knowledge Base Integration:**
- Source documents: S3 bucket → Bedrock Knowledge Base ingestion
- Vector storage: S3 Vectors (default), OpenSearch Serverless, Pinecone, or RDS
- Retrieval: Bedrock RetrieveAndGenerate with optional ACL and Guardrail filtering
- Access control: Metadata-based ACL filtering for user-scoped retrieval

**Data Loading:**
- SQL files → S3 → Step Functions → Lambda → Database (Aurora/RDS)
- Supported formats: SQL, mysqldump, pgdump
- Execution: Parallel or ordered execution with error handling

## Configuration & Secrets

**Required Environment Configuration:**
- AWS_REGION - Target AWS region for deployment
- AWS_PROFILE - AWS credential profile (optional)
- Bedrock model availability - Some models may be region-restricted

**Secrets Storage:**
- AWS Secrets Manager - Database credentials for data loading
- CloudFormation parameters - Stack configuration (passed at deploy time)

## CI/CD Integration

**Integration Tests:**
- @aws-cdk/integ-runner - Runs CDK integration tests
- @aws-cdk/integ-tests-alpha - Integration testing utilities
- Test commands: `npm run integ` and `npm run integ:update`

**Security Scanning:**
- cdk-nag - AWS well-architected framework checks
- Test tasks: `npm run test:cdk-nag:*` for targeted security validation

---

*Integration audit: 2026-03-01*
