# Agentic Document Processing

AI-powered insurance claims processing using Amazon Bedrock with multi-agent workflow. The system automatically analyzes travel insurance claims, verifies them against policies, and provides approval decisions.

## Architecture

```
S3 Upload → S3 Event → SQS → SQS Consumer Lambda → Step Functions → [Classification Lambda + Agentic Processing Lambda] → Final Decision
```

**Flow:**
1. Document uploaded to `raw/` folder triggers S3 event
2. S3 event sent to SQS queue
3. SQS Consumer Lambda processes event and starts Step Functions workflow
4. Step Functions orchestrates document classification and agentic processing
5. Agentic Processing Lambda uses Bedrock Claude 3.5 Sonnet with specialized tools

The agent uses specialized tools to:
- Download insurance policies
- Retrieve supporting documents  
- Perform cross-document verification
- Generate structured claim decisions

## Prerequisites

- AWS CLI configured
- CDK CLI installed (`npm install -g aws-cdk`)
- Node.js 18+

## Deployment

1. **Build the project:**
   ```bash
   cd examples/document-processing/agentic-document-processing
   npm install
   ```

2. **Deploy the stack:**
   ```bash
   AWS_PROFILE=your-profile npx cdk deploy --require-approval never
   ```

3. **Configure environment:**
   ```bash
   # Update .env with your values
   AWS_PROFILE=your-aws-profile
   S3_BUCKET=your-deployed-bucket-name
   ```

## Usage

### Upload Documents

The system expects documents in specific S3 locations:

```bash
# 1. Upload policy document
./upload-document.sh sample-files/GTI-2024-789456.pdf policy

# 2. Upload supporting documents
./upload-document.sh sample-files/hotel_receipt.pdf supporting GTI-2024-789456
./upload-document.sh sample-files/meal_receipts.pdf supporting GTI-2024-789456
./upload-document.sh sample-files/airline_delay_notification.pdf supporting GTI-2024-789456

# 3. Upload claim to trigger processing
./upload-document.sh sample-files/travel_claim.pdf
```

### Expected S3 Structure

```
s3://bucket/
├── raw/                           # Triggers processing
│   └── travel_claim.pdf
├── policies/                      # Agent downloads from here
│   └── GTI-2024-789456.pdf
└── supporting_documents/          # Agent downloads from here
    └── GTI-2024-789456/
        ├── hotel_receipt.pdf
        ├── meal_receipts.pdf
        └── airline_delay_notification.pdf
```

## Monitoring

1. **Step Functions Console:** Monitor workflow execution
2. **CloudWatch Logs:** View detailed agent processing logs
3. **AWS CLI:** Get execution results

```bash
# List recent executions
aws stepfunctions list-executions --state-machine-arn <state-machine-arn>

# Get execution output
aws stepfunctions describe-execution --execution-arn <execution-arn>
```

## Expected Results

The agent provides structured JSON output:

```json
{
  "documentId": "travel-claim-1756401373049",
  "classificationResult": {
    "documentClassification": "INSURANCE_CLAIM"
  },
  "processingResult": {
    "result": {
      "claim_approved": false,
      "justification": "While most of the claim is valid and within policy limits, there is missing documentation for the ground transportation expenses ($25.00). The flight delay of 18 hours is covered under the policy and the hotel and meal expenses are properly documented. However, to approve the full claim amount, documentation for the ground transportation expenses must be provided."
    }
  }
}
```

## Agent Capabilities

The insurance claims specialist agent:

1. **Document Analysis:** Extracts key information from travel claims
2. **Policy Verification:** Downloads and analyzes insurance policies
3. **Supporting Document Review:** Validates receipts and supporting evidence
4. **Cross-Reference Checking:** Ensures claim details match supporting documents
5. **Decision Making:** Provides approval/denial with detailed justification

## Sample Files

The `sample-files/` directory contains a complete test dataset:
- `travel_claim.pdf` - Flight delay compensation claim
- `GTI-2024-789456.pdf` - Travel insurance policy
- `hotel_receipt.pdf` - Hotel accommodation receipt
- `meal_receipts.pdf` - Food expense receipts
- `airline_delay_notification.pdf` - Official delay notification

## Troubleshooting

**Issue:** Agent returns `null` result
- **Cause:** Missing policy or supporting documents
- **Solution:** Ensure all referenced documents are uploaded to correct S3 locations

**Issue:** Step Functions not triggered
- **Cause:** Upload to wrong S3 prefix
- **Solution:** Upload claims to `raw/` folder only