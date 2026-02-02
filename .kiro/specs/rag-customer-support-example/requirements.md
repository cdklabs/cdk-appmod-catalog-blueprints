# Requirements: RAG Customer Support Agent Example

## Overview

This example demonstrates the Knowledge Base integration feature of the Agentic AI Framework. It creates a customer support agent that uses Amazon Bedrock Knowledge Bases for Retrieval-Augmented Generation (RAG) to answer customer questions using product documentation.

## Functional Requirements

### FR-1: Customer Support Agent with Knowledge Base

**Description:** Deploy a BatchAgent configured with a Bedrock Knowledge Base to answer customer support questions.

**Acceptance Criteria:**
- Agent uses BedrockKnowledgeBase construct to reference an existing KB
- Agent can query the knowledge base to retrieve relevant documentation
- Agent generates helpful responses based on retrieved context
- System prompt guides the agent to use KB for answering questions

### FR-2: Knowledge Base Configuration

**Description:** Configure the knowledge base with appropriate retrieval settings.

**Acceptance Criteria:**
- Knowledge base ID is configurable via CDK context or environment variable
- Default retrieval configuration (numberOfResults: 5) is used
- Knowledge base description helps agent understand when to query it
- IAM permissions are automatically generated for KB access

### FR-3: Knowledge Base Creation in CDK

**Description:** Create the Bedrock Knowledge Base with S3 Vectors and sample data entirely within CDK.

**Acceptance Criteria:**
- CDK stack creates:
  - S3 bucket for source documents (data source)
  - IAM role for Bedrock KB service
  - Bedrock Knowledge Base with S3 Vectors as vector store (`CfnKnowledgeBase`)
  - Data source pointing to S3 bucket (`CfnDataSource`)
- Sample documentation deployed to S3 via CDK `BucketDeployment`
- Custom resource triggers initial ingestion/sync after deployment
- KB ID output for reference and passed to BatchAgent automatically
- Single `cdk deploy` creates everything end-to-end

**Note:** S3 Vectors integration means Bedrock automatically:
- Fetches data from S3 data source
- Converts content into text blocks  
- Generates embeddings using configured model (default: Titan)
- Stores embeddings in managed S3 vector bucket

### FR-4: Agent Invocation

**Description:** Provide a mechanism to invoke the agent with customer questions.

**Acceptance Criteria:**
- Helper script to invoke the agent Lambda function directly
- Support for passing customer questions as input
- Display agent response in readable format
- Include example invocations in documentation

## Non-Functional Requirements

### NFR-1: Observability

**Description:** Enable comprehensive observability for production monitoring.

**Acceptance Criteria:**
- Lambda Powertools integration for structured logging
- X-Ray tracing enabled for request tracking
- CloudWatch metrics for agent performance
- Log group data protection for PII masking

### NFR-2: Security

**Description:** Follow AWS security best practices.

**Acceptance Criteria:**
- Least-privilege IAM permissions for KB access
- KMS encryption for environment variables
- Cross-region inference support for high availability
- No hardcoded credentials or KB IDs in code

### NFR-3: Documentation

**Description:** Provide comprehensive documentation including KB setup tutorial.

**Acceptance Criteria:**
- Step-by-step guide for creating Bedrock Knowledge Base
- Prerequisites including required AWS permissions
- Deployment instructions with all configuration options
- Usage examples with sample questions and expected outputs
- Monitoring and troubleshooting guidance
- Complete cleanup instructions

## Technical Requirements

### TR-1: Stack Structure

**Description:** Standard CDK example structure.

**Files Required:**
- `app.ts` - CDK app entry point
- `rag-customer-support-stack.ts` - Stack definition
- `cdk.json` - CDK configuration
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript configuration

### TR-2: Agent Resources

**Description:** Agent configuration files.

**Files Required:**
- `resources/system_prompt.txt` - Customer support agent instructions
- `sample-questions/` - Directory with test questions

### TR-3: Sample Data

**Description:** Sample documentation for KB creation.

**Files Required:**
- `sample-docs/README.md` - Instructions for using sample docs
- `sample-docs/product-guide.md` - Sample product documentation
- `sample-docs/faq.md` - Sample FAQ content
- `sample-docs/troubleshooting.md` - Sample troubleshooting guide

### TR-4: Helper Scripts

**Description:** Scripts for testing the deployed agent.

**Files Required:**
- `invoke-agent.sh` - Script to invoke agent with a question
- `sync-kb.sh` - Script to trigger KB re-sync after adding new documents (optional, for iterating on docs)

## Constraints

### C-1: Knowledge Base Created via CDK

The example creates everything in CDK using L1 constructs:
- `CfnKnowledgeBase` with S3 Vectors storage configuration
- `CfnDataSource` pointing to S3 documents bucket
- Custom resource to trigger initial ingestion after deployment
- Bedrock automatically manages the vector bucket

Single `cdk deploy` creates the full stack. `cdk destroy` cleans up everything.

### C-2: Bedrock Model Access

Users must have access to Claude models in Amazon Bedrock (specifically Claude 3.5 Sonnet or configured alternative).

### C-3: Region Support

The example should work in any region that supports:
- Amazon Bedrock Knowledge Bases
- Amazon Bedrock Claude models
- Cross-region inference (optional)

## Out of Scope

- ACL or guardrail configuration (basic example)
- Multiple knowledge bases (single KB for simplicity)
- Document processing pipeline (separate use case)
- Custom embedding models (uses default Titan embeddings)

## Success Criteria

1. Single `cdk deploy` creates KB, uploads sample docs, triggers ingestion, and deploys agent
2. User can invoke the agent with customer questions via `invoke-agent.sh`
3. Agent retrieves relevant context from the knowledge base
4. Agent generates helpful, contextual responses based on sample documentation
5. Observability data is available in CloudWatch
6. `cdk destroy` cleanly removes all resources including KB
