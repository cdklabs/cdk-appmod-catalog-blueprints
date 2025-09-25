# Document Processing Full-Stack WebApp

A complete full-stack application demonstrating AI-powered document processing with presigned URL uploads and real-time status polling.

![](/examples/document-processing/doc-processing-fullstack-webapp/img/doc-processing-web-app-ui.png)

## Architecture

```
Frontend (React/TS) → API Gateway → Lambda (Presigned URL)
        ↓                                    ↓
   CloudFront+S3                      Returns Presigned URL
        ↓                                    ↓
Direct S3 Upload ←─────────────────────────────
        ↓
   S3 Event Trigger → Step Functions → Bedrock AI → DynamoDB
                           ↓                          ↑
                    Agentic Processing              Status
                                                     ↑
Frontend Polling ← API Gateway ← Lambda ←───────────
```

### Key Components

**Frontend Stack:**
- React TypeScript application
- CloudFront distribution with S3 static hosting
- Direct S3 uploads using presigned URLs
- Real-time status polling (10-second intervals)

**API Stack:**
- API Gateway with Lambda integration
- Presigned URL generation for secure S3 uploads
- DynamoDB status polling with begins_with() filtering
- CORS-enabled for browser uploads

**Document Processing Stack:**
- Agentic document processing workflow
- Step Functions orchestration
- Amazon Bedrock AI processing
- S3 event triggers for automatic processing

## Data Flow

1. **Upload Request**: Frontend requests presigned URL from API
2. **Direct Upload**: Browser uploads file directly to S3 using presigned URL
3. **Processing Trigger**: S3 upload triggers Step Functions workflow
4. **AI Processing**: Bedrock analyzes document and generates results
5. **Status Updates**: Workflow updates DynamoDB with processing status
6. **Result Polling**: Frontend polls API for status and retrieves results

## Project Structure

```
doc-processing-fullstack-webapp/
├── frontend-app/                    # React TypeScript application
│   ├── src/
│   │   ├── App.tsx                 # Main application component
│   │   └── index.tsx               # Application entry point
│   ├── public/                     # Static assets
│   └── package.json                # Frontend dependencies
├── api/                            # Lambda function code
│   ├── index.ts                    # API Lambda handler
│   └── package.json                # API dependencies
├── api-stack.ts                    # API Gateway + Lambda stack
├── frontend-stack.ts               # CloudFront + S3 stack
├── app.ts                          # CDK application entry point
└── README.md
```

## Key Features

**Secure File Upload:**
- Presigned URLs for direct S3 uploads
- No file data passes through API Gateway

**Real-time Processing:**
- Automatic workflow triggering on S3 upload
- Status polling with exponential backoff
- Processing results retrieval

**AI-Powered Analysis:**
- Document classification using Amazon Bedrock
- Content extraction and analysis
- Structured result formatting

## Deployment

```bash
# Install dependencies
npm install

# Build and deploy all stacks
npx cdk deploy --all --require-approval never

# Deploy individual stacks
npx cdk deploy InsuranceClaimsApiStack
npx cdk deploy InsuranceClaimsFrontendStack
```

## Configuration

**Environment Variables:**
- `API_BASE_URL`: API Gateway endpoint URL
- `TABLE_NAME`: DynamoDB table for document metadata
- `AGENTIC_BUCKET`: S3 bucket for document processing

Required: enable CORS in document processing S3 bucket.

## Usage

1. **Access Application**: Navigate to CloudFront distribution URL
2. **Upload Document**: Select file and document type
3. **Monitor Processing**: View real-time status updates
4. **Review Results**: Access AI-generated analysis and recommendations

## Technical Notes

**DocumentId Format:**
- API generates: `filename-timestamp` (e.g., `travel-claim-1756614134842`)
- Workflow creates: `filename-timestamp-executionTimestamp` for uniqueness

**Status Polling:**
- 10-second intervals for up to 30 attempts (5 minutes total)