# Sample Files for Insurance Claims Processing

This directory should contain sample PDF files for testing the insurance claims processing agent.

## Required Files

To test the example, you'll need the following PDF files:

### 1. Insurance Policy
- **Filename**: `GTI-2024-789456.pdf`
- **Description**: Travel insurance policy document
- **Upload to**: `s3://bucket/policies/GTI-2024-789456.pdf`

### 2. Claim Document
- **Filename**: `travel_claim.pdf`
- **Description**: Insurance claim form with flight delay details
- **Note**: This is provided as text in `sample-claim.json` for testing

### 3. Supporting Documents
- **Filename**: `hotel_receipt.pdf`
  - Hotel accommodation receipt
  - Upload to: `s3://bucket/supporting_documents/GTI-2024-789456/`

- **Filename**: `meal_receipts.pdf`
  - Food expense receipts during delay
  - Upload to: `s3://bucket/supporting_documents/GTI-2024-789456/`

- **Filename**: `airline_delay_notification.pdf`
  - Official airline delay notification
  - Upload to: `s3://bucket/supporting_documents/GTI-2024-789456/`

## Creating Sample Files

You can create sample PDF files using any of these methods:

### Option 1: Use Real Documents (Redacted)
If you have real insurance documents, redact any PII and use them for testing.

### Option 2: Generate Sample PDFs
Use online tools or scripts to generate sample PDFs with the required content:

```bash
# Example using wkhtmltopdf (if installed)
echo "<h1>Travel Insurance Policy</h1><p>Policy Number: GTI-2024-789456</p>" | wkhtmltopdf - GTI-2024-789456.pdf
```

### Option 3: Use the Agentic Document Processing Example
Copy sample files from the agentic-document-processing example:

```bash
cp ../agentic-document-processing/sample-files/*.pdf .
```

## Uploading Files

Use the provided upload script:

```bash
# Upload all files to the Lambda stack's bucket
./upload-documents.sh DocumentProcessingLambdaStack

# Or upload to AgentCore stack's bucket
./upload-documents.sh DocumentProcessingAgentCoreDirectStack
```

## File Structure in S3

After uploading, your S3 bucket should have this structure:

```
s3://your-bucket/
├── policies/
│   └── GTI-2024-789456.pdf
└── supporting_documents/
    └── GTI-2024-789456/
        ├── hotel_receipt.pdf
        ├── meal_receipts.pdf
        └── airline_delay_notification.pdf
```

## Testing Without PDF Files

You can test the agent logic without actual PDF files by using the `sample-claim.json` file, which contains the claim text inline. The agent will attempt to download the policy and supporting documents, but will gracefully handle missing files.

For full testing, ensure all PDF files are uploaded to S3 before invoking the agent.
