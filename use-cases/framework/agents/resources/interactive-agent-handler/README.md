# Interactive Agent Lambda Handler

This Lambda handler processes WebSocket events from API Gateway and uses the Strands BidiAgent framework to provide interactive, bidirectional conversational AI capabilities.

## Features

- **Bidirectional Streaming**: Real-time response streaming using BidiAgent
- **Session Management**: Persistent conversation sessions in S3
- **Context Management**: Configurable conversation history (SlidingWindow, Null)
- **Authentication**: Optional Cognito authentication
- **Observability**: Lambda Powertools integration (logging, metrics, tracing)

## Architecture

```
WebSocket Client → API Gateway → Lambda (BidiAgent) → Bedrock
                                    ↓
                                S3 (Sessions)
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MODEL_ID` | Bedrock model ID | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `SYSTEM_PROMPT_S3_BUCKET_NAME` | S3 bucket for system prompt | - |
| `SYSTEM_PROMPT_S3_KEY` | S3 key for system prompt | - |
| `SESSION_BUCKET` | S3 bucket for session storage | - |
| `CONTEXT_ENABLED` | Enable conversation context | `true` |
| `CONTEXT_STRATEGY` | Context strategy (SlidingWindow, Null) | `SlidingWindow` |
| `CONTEXT_WINDOW_SIZE` | Number of messages to keep | `20` |
| `AUTH_TYPE` | Authentication type (Cognito, None) | `Cognito` |

## Development

### Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest test_handler.py

# Run specific test
pytest test_handler.py::test_handle_message_success

# Run async tests only
pytest -m asyncio
```

### Test Coverage

The test suite covers:
- ✅ System prompt loading (success, missing config, S3 errors)
- ✅ Session management (get, save, delete, disabled mode)
- ✅ Context management (SlidingWindow, Null, add message)
- ✅ WebSocket connection handling ($connect, $disconnect)
- ✅ Message handling with BidiAgent (success, errors, invalid input)
- ✅ Main handler routing (all routes, unknown routes)
- ✅ Error handling and recovery

### Code Structure

```
interactive-agent-handler/
├── index.py              # Main handler
├── test_handler.py       # Unit tests
├── requirements.txt      # Runtime dependencies
├── requirements-dev.txt  # Development dependencies
├── pytest.ini           # Pytest configuration
└── README.md            # This file
```

## WebSocket Message Format

### Client → Server

```json
{
  "message": "Hello, agent!"
}
```

### Server → Client (Streaming)

**Chunk:**
```json
{
  "type": "chunk",
  "content": "Hello ",
  "isComplete": false
}
```

**Complete:**
```json
{
  "type": "complete",
  "isComplete": true
}
```

**Error:**
```json
{
  "type": "error",
  "error": "Error message",
  "details": "Detailed error information"
}
```

## BidiAgent vs Standard Agent

This handler uses **BidiAgent** for bidirectional streaming:

| Feature | Standard Agent | BidiAgent |
|---------|---------------|-----------|
| Streaming | No | Yes (real-time) |
| WebSocket | Not designed for it | Native support |
| Interruption | Not supported | Built-in |
| Multi-modal | Text only | Text + Audio + Video |
| User Experience | Wait for full response | See response as it generates |

## Troubleshooting

### Tests failing with "ModuleNotFoundError"

Ensure virtual environment is activated and dependencies installed:
```bash
source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
```

### Async tests not running

Ensure `pytest-asyncio` is installed:
```bash
pip install pytest-asyncio
```

### Import errors in tests

Ensure you're running tests from the handler directory:
```bash
cd use-cases/framework/agents/resources/interactive-agent-handler
pytest
```

## References

- [Strands BidiAgent Documentation](https://github.com/awslabs/strands-agents)
- [AWS Lambda Powertools](https://awslabs.github.io/aws-lambda-powertools-python/)
- [API Gateway WebSocket APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
