# Implementation Plan: RAG Customer Support Example

## Overview

This implementation plan breaks down the RAG customer support example into discrete coding tasks. The example demonstrates the Knowledge Base integration feature of the Agentic AI Framework, creating a customer support agent that uses Amazon Bedrock Knowledge Bases with S3 Vectors for RAG-based question answering about an e-commerce platform.

## Tasks

- [x] 1. Set up project structure and configuration files
  - Create directory structure: `examples/document-processing/rag-customer-support/`
  - Create subdirectories: `resources/`, `resources/ingestion-handler/`, `sample-docs/`, `sample-questions/`
  - Create `package.json` with dependencies (aws-cdk-lib, constructs, @cdklabs/cdk-appmod-catalog-blueprints)
  - Create `tsconfig.json` with TypeScript configuration
  - Create `cdk.json` with CDK app configuration
  - Create `app.ts` CDK application entry point
  - _Requirements: TR-1_

- [x] 2. Create sample e-commerce documentation
  - [x] 2.1 Create `sample-docs/README.md`
    - Explain purpose of sample documentation
    - List all included documents and their topics
    - _Requirements: TR-3_
  
  - [x] 2.2 Create `sample-docs/product-catalog.md`
    - Write product categories and descriptions
    - Include pricing information
    - Add product availability details
    - _Requirements: FR-3_
  
  - [x] 2.3 Create `sample-docs/orders-shipping.md`
    - Document order placement process
    - List shipping options with prices and timeframes
    - Include order tracking instructions
    - Add delivery issue resolution steps
    - _Requirements: FR-3_
  
  - [x] 2.4 Create `sample-docs/returns-refunds.md`
    - Document return policy (timeframe, conditions)
    - Explain refund process and timeline
    - Include return shipping instructions
    - Add exchange policy details
    - _Requirements: FR-3_
  
  - [x] 2.5 Create `sample-docs/account-help.md`
    - Document account registration process
    - Include password reset instructions
    - Add profile management guide
    - Document notification preferences
    - _Requirements: FR-3_
  
  - [x] 2.6 Create `sample-docs/faq.md`
    - Compile frequently asked questions across all topics
    - Include concise answers for each question
    - _Requirements: FR-3_

- [x] 3. Create ingestion custom resource handler
  - [x] 3.1 Create `resources/ingestion-handler/index.py`
    - Import boto3 and cfnresponse
    - Implement handler function for CloudFormation custom resource
    - Call StartIngestionJob API on Create/Update events
    - Implement wait loop for ingestion completion (with timeout)
    - Handle Delete events gracefully (no-op)
    - Return proper CloudFormation response
    - _Requirements: FR-3_
  
  - [x] 3.2 Create `resources/ingestion-handler/requirements.txt`
    - Add boto3 dependency
    - _Requirements: FR-3_

- [x] 4. Create agent system prompt
  - [x] 4.1 Create `resources/system_prompt.txt`
    - Define agent role as AcmeShop customer support
    - List topics agent can help with (products, orders, returns, account)
    - Instruct agent to use knowledge base for answers
    - Specify response style (friendly, concise, helpful)
    - Handle edge cases (info not found, complex issues)
    - _Requirements: TR-2, FR-1_

- [x] 5. Implement main CDK stack
  - [x] 5.1 Create `rag-customer-support-stack.ts` with KB infrastructure
    - Import required CDK constructs and types
    - Define RagCustomerSupportStack class extending Stack
    - Create S3 bucket for data source with encryption
    - Create IAM role for Bedrock KB with S3 and model permissions
    - Create CfnKnowledgeBase with S3 Vectors storage configuration
    - Create CfnDataSource pointing to S3 bucket
    - _Requirements: FR-2, FR-3, NFR-2_
  
  - [x] 5.2 Add sample docs deployment and ingestion trigger
    - Add BucketDeployment to upload sample-docs to S3
    - Create Lambda function for ingestion handler
    - Create CustomResource to trigger ingestion after deployment
    - Add proper dependencies (docs uploaded before ingestion)
    - _Requirements: FR-3_
  
  - [x] 5.3 Configure BatchAgent with knowledge base
    - Create BedrockKnowledgeBase construct referencing CfnKnowledgeBase
    - Configure retrieval settings (numberOfResults: 5)
    - Create BatchAgent with KB integration
    - Configure system prompt asset
    - Enable observability with namespace "rag-customer-support"
    - _Requirements: FR-1, FR-2, NFR-1_
  
  - [x] 5.4 Add CloudFormation outputs
    - Output KnowledgeBaseId
    - Output DataSourceBucket name
    - Output AgentFunctionArn
    - Output AgentFunctionName
    - _Requirements: FR-4_

- [x] 6. Create helper scripts
  - [x] 6.1 Create `invoke-agent.sh`
    - Add shebang and script header
    - Get function name from CloudFormation stack outputs
    - Accept question as command line argument
    - Invoke Lambda function with question payload
    - Display response in readable format
    - Make script executable (chmod +x)
    - _Requirements: FR-4_
  
  - [x] 6.2 Create `sync-kb.sh`
    - Add shebang and script header
    - Get KB ID and data source ID from stack outputs
    - Call StartIngestionJob via AWS CLI
    - Display status message
    - Make script executable (chmod +x)
    - _Requirements: FR-3_

- [x] 7. Create sample questions for testing
  - [x] 7.1 Create `sample-questions/test-questions.json`
    - Add questions covering product catalog topics
    - Add questions covering orders and shipping
    - Add questions covering returns and refunds
    - Add questions covering account management
    - Include expected topics/keywords for each question
    - _Requirements: FR-3, FR-4_

- [x] 8. Create README documentation
  - [x] 8.1 Write README.md with overview and architecture
    - Add title and badges (Code, Documentation, Construct links)
    - Write overview section describing RAG customer support capabilities
    - Create architecture diagram showing KB + Agent flow
    - Explain what the example demonstrates
    - _Requirements: NFR-3_
  
  - [x] 8.2 Add prerequisites and deployment sections
    - Document prerequisites (AWS CLI, CDK CLI, Node.js, Bedrock access)
    - Write step-by-step deployment instructions
    - Explain what happens during deployment (KB creation, ingestion, agent setup)
    - _Requirements: NFR-3_
  
  - [x] 8.3 Add usage and expected output sections
    - Provide usage examples with invoke-agent.sh commands
    - Show sample questions and expected responses
    - Document how to add custom documentation
    - _Requirements: NFR-3_
  
  - [x] 8.4 Add monitoring, troubleshooting, and cleanup sections
    - Document monitoring commands using AWS CLI
    - List common issues and solutions (ingestion failures, model access)
    - Add cleanup instructions (cdk destroy)
    - _Requirements: NFR-3_

- [ ] 9. Final validation
  - Run `npm install` in example directory
  - Run `cdk synth` to verify stack is valid
  - Deploy stack with `cdk deploy`
  - Wait for ingestion to complete (check Bedrock console)
  - Test with sample questions using invoke-agent.sh
  - Verify responses reference correct documentation
  - Check CloudWatch logs for observability data
  - Run `cdk destroy` to verify clean removal
  - _Requirements: All success criteria_

## Notes

- This example uses L1 constructs (CfnKnowledgeBase, CfnDataSource) for KB creation
- S3 Vectors is used as the vector store - Bedrock auto-manages the vector bucket
- The ingestion custom resource waits for completion before stack deployment finishes
- Sample documentation describes a fictional e-commerce platform "AcmeShop"
- Agent uses natural language responses (not structured JSON)
- Observability is enabled with Lambda Powertools integration
