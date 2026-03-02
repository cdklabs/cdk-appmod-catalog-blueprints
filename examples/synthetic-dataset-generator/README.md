# Synthetic Dataset Generator

An AI-powered application that generates realistic synthetic datasets through natural conversation. Users describe their data requirements, and the agent generates Python scripts using pandas, numpy, and faker.

## Architecture

```
User
  |
  +-> API Gateway (REST + SSE streaming)
        |
        +-> InteractiveAgent (Cognito Auth)
              |
              +-> Conversation (Claude Sonnet)
              |     |
              |     +-> When requirements gathered:
              |           |
              |           +-> generate_script tool
              |                 |
              |                 +-> BatchAgent Lambda
              |                       |
              |                       +-> Returns Python DataGenerator script
              |
              +-> Streams response back to user
```

## Components

| Component | Purpose |
|-----------|---------|
| InteractiveAgent | Handles chat conversation with Cognito authentication and SSE streaming |
| BatchAgent | Generates Python DataGenerator scripts via Bedrock |
| generate_script tool | Bridges conversation to script generation with input sanitization |

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js >= 18.12.0
- AWS CDK CLI (`npm install -g aws-cdk`)
- An AWS account with Bedrock model access enabled for Claude models

### Enable Bedrock Model Access

1. Open the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock/)
2. Navigate to **Model access** in the left sidebar
3. Click **Manage model access**
4. Enable access for **Anthropic Claude** models
5. Wait for access to be granted (usually immediate)

## Deployment

1. **Install dependencies:**
   ```bash
   cd examples/synthetic-dataset-generator
   npm install
   ```

2. **Bootstrap CDK (if not already done):**
   ```bash
   cdk bootstrap
   ```

3. **Deploy the stack:**
   ```bash
   cdk deploy
   ```

4. **Note the outputs:**
   After deployment, note these CloudFormation outputs:
   - `ChatApiEndpoint` - API URL for chat requests
   - `UserPoolId` - Cognito User Pool ID
   - `UserPoolClientId` - Cognito Client ID

## Usage

### Create a Cognito User

Before using the chat API, create a user in the Cognito User Pool:

```bash
# Get the User Pool ID from stack outputs
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name SyntheticDatasetGeneratorStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Create a user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username testuser \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username testuser \
  --password YourPassword123! \
  --permanent
```

### Chat with the Agent

The chat API uses SSE (Server-Sent Events) for streaming responses. Example with curl:

```bash
# Get outputs
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name SyntheticDatasetGeneratorStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ChatApiEndpoint`].OutputValue' \
  --output text)

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name SyntheticDatasetGeneratorStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name SyntheticDatasetGeneratorStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

# Authenticate
TOKEN=$(aws cognito-idp initiate-auth \
  --client-id $CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=testuser,PASSWORD=YourPassword123! \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Chat with the agent
curl -X POST "$API_ENDPOINT/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "I need customer data for fraud detection with name, email, transaction amount, and is_fraud flag", "sessionId": "test-session-1"}'
```

### Example Conversation

**User:** "I need customer data for testing"

**Agent:** "What will you use this data for? (e.g., testing, ML training, demo)"

**User:** "ML training for fraud detection"

**Agent:** "What fields do you need? Give me a few examples."

**User:** "Customer ID, name, email, transaction amount, timestamp, and whether it's fraudulent"

**Agent:** "Got it - I'll generate a script for fraud detection training data with those 6 fields..."

*[Agent calls generate_script tool and returns Python code]*

## Generated Script Format

All generated scripts follow the DataGenerator class template:

```python
import pandas as pd
import numpy as np
from faker import Faker
import random
from datetime import datetime, timedelta

class DataGenerator:
    def __init__(self, num_rows: int = 10000):
        self.num_rows = num_rows
        self.fake = Faker()
        # Seeds for reproducibility
        random.seed(42)
        np.random.seed(42)
        Faker.seed(42)

    def generate_datasets(self) -> list:
        """Generate synthetic datasets."""
        # Implementation varies based on requirements
        return [pd.DataFrame(data)]

    def generate_schema(self) -> dict:
        """Generate schema documentation."""
        return {"columns": [...]}
```

## Cleanup

To remove all resources:

```bash
cdk destroy
```

## Troubleshooting

### "AccessDeniedException" when calling Bedrock

Ensure Bedrock model access is enabled for Claude models in your AWS account. See Prerequisites above.

### "User does not exist" errors

Create a user in the Cognito User Pool using the commands in the Usage section.

### Streaming not working

Ensure your client supports SSE (Server-Sent Events). The API returns a stream of tokens, not a single JSON response.

## Next Steps

- **Phase 2**: Script execution with preview (sandboxed Lambda execution)
- **Phase 3**: Export to CSV/JSON with S3 persistence
- **Phase 4**: Frontend UI with split-panel layout
