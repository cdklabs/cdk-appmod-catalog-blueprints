# InteractiveAgent Architecture Deep Dive

> Reference document — explains how the streaming architecture works,
> the challenges we hit during deployment, and how they were resolved.
> Updated after successful end-to-end deployment on 2026-02-11.

---

## End-to-End Architecture (Verified Working)

```
┌─────────────────────────────────────────────────────────────────────┐
│  React Frontend (CloudFront + S3)                                   │
│  https://d1rfy41tfvzaqo.cloudfront.net                              │
│  - fetch() with ReadableStream to consume SSE                       │
│  - Cognito login (username/password → JWT idToken)                  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ POST /chat
                           │ Authorization: Bearer <JWT>
                           │ Body: { message, session_id? }
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API Gateway REST API                                               │
│  https://3l78e0q5x9.execute-api.us-east-1.amazonaws.com/prod       │
│  - COGNITO_USER_POOLS authorizer (validates JWT natively)           │
│  - responseTransferMode: STREAM on POST /chat                       │
│  - Integration URI: .../response-streaming-invocations              │
│  - Timeout: 15 minutes (900000ms)                                   │
│  - CORS: GatewayResponse on 4XX/5XX for error headers               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ InvokeWithResponseStream
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Lambda (Python 3.13, 1024 MB, 15-min timeout)                      │
│                                                                     │
│  ┌─ Lambda Web Adapter Layer (LWA) ──────────────────────────┐     │
│  │  ARN: arn:aws:lambda:us-east-1:753240598075:layer:         │     │
│  │       LambdaAdapterLayerX86:25                             │     │
│  │  /opt/bootstrap intercepts runtime, proxies HTTP to :8080  │     │
│  │  AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap                    │     │
│  │  AWS_LWA_INVOKE_MODE=response_stream                      │     │
│  │  AWS_LWA_READINESS_CHECK_PATH=/health                     │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌─ run.sh (Lambda handler) ─────────────────────────────────┐     │
│  │  #!/bin/bash                                               │     │
│  │  PATH=$PATH:$LAMBDA_TASK_ROOT/bin \                        │     │
│  │    PYTHONPATH=$PYTHONPATH:/opt/python:$LAMBDA_RUNTIME_DIR \ │     │
│  │    exec python -m uvicorn --port=$PORT index:app           │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌─ FastAPI (index.py) ──────────────────────────────────────┐     │
│  │  GET  /health  → LWA readiness check                      │     │
│  │  POST /chat    → SSE StreamingResponse                     │     │
│  │                                                            │     │
│  │  On each request:                                          │     │
│  │  1. Load session from S3 (if session_id provided)          │     │
│  │  2. Apply sliding window (last 20 messages)                │     │
│  │  3. Create strands.Agent(model, system_prompt, messages)   │     │
│  │  4. Call agent(user_message)                               │     │
│  │  5. Stream response as SSE events                          │     │
│  │  6. Save updated session to S3                             │     │
│  └──────────────────────────────────────────────────────────┘     │
└───────────┬──────────────────────┬──────────────────────────────────┘
            │                      │
            ▼                      ▼
┌───────────────────┐  ┌─────────────────────────────┐
│  Amazon Bedrock   │  │  S3 Session Bucket           │
│  Claude Haiku     │  │  sessions/{id}.json           │
│  (streaming)      │  │  24-hour lifecycle expiry     │
└───────────────────┘  │  KMS encrypted                │
                       └─────────────────────────────┘

Supporting Services:
  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐
  │  S3 Bucket   │  │  Cognito      │  │  CloudWatch     │
  │  (Sessions)  │  │  User Pool    │  │  (Logs/Metrics) │
  │              │  │              │  │                 │
  │  sessions/   │  │  JWT tokens  │  │  Powertools     │
  │  {id}.json   │  │  User mgmt   │  │  X-Ray tracing  │
  └─────────────┘  └──────────────┘  └─────────────────┘
```

---

## Request Flow (Simplified)

```
┌──────────┐    POST /chat     ┌──────────────┐
│  Browser  │ ───────────────> │  API Gateway  │
│  (React)  │  + JWT token     │  REST API     │
└──────────┘                   └──────┬───────┘
     ▲                                │
     │                                │ InvokeWithResponseStream
     │                                │ (responseTransferMode: STREAM)
     │                                ▼
     │                         ┌──────────────────────────────────┐
     │                         │         LAMBDA                    │
     │                         │                                   │
     │                         │  ┌─────────────────────────────┐ │
     │                         │  │  Lambda Web Adapter (Layer)  │ │
     │                         │  │  /opt/bootstrap intercepts   │ │
     │                         │  │  Runs run.sh → starts uvicorn│ │
     │                         │  │  Proxies HTTP to :8080       │ │
     │                         │  └──────────┬──────────────────┘ │
     │                         │             │                     │
     │                         │             │ POST /chat          │
     │                         │             │ localhost:8080       │
     │                         │             ▼                     │
     │                         │  ┌─────────────────────────────┐ │
     │                         │  │  FastAPI (uvicorn)           │ │
     │                         │  │                              │ │
     │                         │  │  1. Parse request body       │ │
     │                         │  │  2. Load session from S3     │ │
     │                         │  │  3. Create Strands Agent     │ │
     │                         │  │  4. Call agent(message)      │ │
     │                         │  │  5. Stream SSE chunks ──────────> streamed back
     │                         │  │  6. Save session to S3      │ │  via API Gateway
     │                         │  └─────────────────────────────┘ │
     │                         └──────────────────────────────────┘
     │
     │  SSE stream: event: metadata  data: {"session_id":"abc-123"}
     │              data: {"text": "Hello"}
     │              data: {"text": " how can I help?"}
     │              event: done      data: {}
     └─────────────────────────────────────────
```

---

## Why This Architecture?

Normal Lambda gives you ONE response at the end. But for a chatbot, you want
tokens to appear word-by-word as the AI generates them. That requires streaming.

```
NORMAL LAMBDA:
  User sends message → waits 10 seconds → gets full response at once

STREAMING LAMBDA (our approach):
  User sends message → immediately starts seeing words appear → done
```

API Gateway REST API supports response streaming via `responseTransferMode: STREAM`,
but Lambda's native Python runtime doesn't support streaming responses directly.
Lambda Web Adapter bridges this gap by running a real HTTP server (FastAPI/uvicorn)
inside Lambda and streaming the response through.

---

## Component Roles

| Component | Role | Why Not Something Else? |
|-----------|------|------------------------|
| **FastAPI** | Defines HTTP routes and logic (`POST /chat`, `GET /health`) | Lightweight, async, native SSE streaming support |
| **Uvicorn** | ASGI server — listens on port 8080, handles HTTP connections | FastAPI can't listen on a port by itself |
| **run.sh** | Lambda handler — starts uvicorn with correct PATH/PYTHONPATH | Official LWA pattern for ZIP deployments |
| **Lambda Web Adapter** | Bridges Lambda invocations ↔ HTTP requests to localhost | Enables response streaming from managed Python runtime |
| **API Gateway REST API** | Public HTTPS endpoint with auth, throttling, CORS | Only API Gateway type that supports `responseTransferMode: STREAM` |
| **Cognito** | JWT-based authentication | Native `COGNITO_USER_POOLS` authorizer — no custom Lambda needed |
| **S3 Sessions** | Persists conversation history across stateless HTTP requests | Cheap, durable, auto-expiring via lifecycle policies |
| **Strands Agent** | AI reasoning with tool use | Standard `strands.Agent`, not experimental BidiAgent |

---

## Lambda Cold Start Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAMBDA COLD START                            │
│                                                                 │
│  1. Lambda runtime starts                                       │
│     - Handler is set to "run.sh"                                │
│     - AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap (LWA layer)        │
│                                                                 │
│  2. LWA's /opt/bootstrap intercepts the runtime                 │
│     - Executes run.sh as the startup script                     │
│     - run.sh sets PATH and PYTHONPATH                           │
│     - run.sh execs: python -m uvicorn --port=8080 index:app     │
│                                                                 │
│  3. Uvicorn starts, imports index.py                            │
│     ├── Loads FastAPI app, routes, middleware                   │
│     ├── Initializes boto3 S3 client                             │
│     ├── Initializes Lambda Powertools (Logger, Tracer, Metrics) │
│     ├── Loads system prompt from S3 (cold start only)           │
│     ├── Loads agent tools from S3 (cold start only)             │
│     └── Uvicorn begins listening on 0.0.0.0:8080                │
│                                                                 │
│  4. LWA polls GET http://127.0.0.1:8080/health                  │
│     ├── Retries until 200 OK                                    │
│     └── 200 OK {"status": "ok"} → READY                        │
│                                                                 │
│  5. LWA proxies incoming Lambda invocation as HTTP to :8080     │
│     └── FastAPI handles POST /chat                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Key difference from earlier iterations: `run.sh` is the handler, not `index.handler`.
LWA's bootstrap (`/opt/bootstrap`) executes `run.sh` which starts uvicorn directly.
No daemon thread needed — uvicorn IS the process.

---

## SSE (Server-Sent Events) Protocol

The frontend uses `fetch()` + `ReadableStream` to consume SSE events:

```
SERVER SENDS:                          CLIENT RECEIVES:
─────────────                          ────────────────
event: metadata\n                      → { session_id: "abc-123" }
data: {"session_id":"abc-123"}\n\n

data: {"text":"Hello"}\n\n             → append "Hello" to message
data: {"text":" how"}\n\n             → append " how"
data: {"text":" can"}\n\n             → append " can"
data: {"text":" I help?"}\n\n         → append " I help?"

event: done\n                          → mark message complete
data: {}\n\n
```

Each SSE event is:
- `event: <type>` (optional, defaults to "message")
- `data: <json>` (the payload)
- Blank line (`\n\n`) terminates the event

---

## Session Management

```
REQUEST 1: "What is Lambda?"
  ├── No session_id → generate new UUID
  ├── Load session from S3 → empty (new session)
  ├── Agent responds: "Lambda is a serverless compute service..."
  └── Save to S3: [user msg, assistant msg]

REQUEST 2: "How does it scale?" (same session_id)
  ├── Load session from S3 → [2 messages]
  ├── Apply sliding window (keep last 20 messages)
  ├── Agent sees context + new question
  ├── Agent responds: "Lambda scales automatically by..."
  └── Save to S3: [4 messages]

REQUEST 3: ... and so on

S3 STRUCTURE:
  s3://session-bucket/
    sessions/
      abc-123.json    ← { session_id, messages: [...], updated_at }
      def-456.json
      ...

  Lifecycle policy: auto-delete after 24 hours
  Encryption: KMS at rest, SSL in transit
```

---

## Challenges & Solutions (Chronological)

### Challenge 1: CORS on Error Responses

**Problem:** When Cognito authorizer rejects a request (401), API Gateway returns
the error directly — without CORS headers. Browser blocks it as a CORS error,
hiding the real "unauthorized" message.

**Solution:** Added `GatewayResponse` resources for `DEFAULT_4XX` and `DEFAULT_5XX`
that inject `Access-Control-Allow-Origin: *` headers on all error responses.

```
BEFORE:  401 response → no CORS headers → browser: "CORS error"
AFTER:   401 response → has CORS headers → browser: "Unauthorized"
```

---

### Challenge 2: Wrong Token Type

**Problem:** Frontend was sending `accessToken` in the Authorization header.
API Gateway's `COGNITO_USER_POOLS` authorizer expects an `idToken`.

**Solution:** Changed `AuthWrapper.tsx` to send `idToken` instead.

```
accessToken: proves "this user is authenticated" (for APIs you own)
idToken:     proves "this user is authenticated" + contains user claims
             (what COGNITO_USER_POOLS authorizer validates)
```

---

### Challenge 3: LWA Tried to Execute `index.handler` as a File Path

**Problem:** With `handler: index.handler` set, Lambda Web Adapter's bootstrap
tried to execute `index.handler` as a shell command/file path, which doesn't exist.

**Root cause:** LWA with `AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap` intercepts the
handler and tries to run it as the startup script. `index.handler` is a Python
module path, not an executable.

**Solution:** Changed handler to `run.sh` — a bash script that starts uvicorn.
This matches the [official AWS LWA ZIP example](https://github.com/awslabs/aws-lambda-web-adapter/blob/main/examples/fastapi-response-streaming-zip/).

```bash
# run.sh (the Lambda handler)
#!/bin/bash
PATH=$PATH:$LAMBDA_TASK_ROOT/bin \
    PYTHONPATH=$PYTHONPATH:/opt/python:$LAMBDA_RUNTIME_DIR \
    exec python -m uvicorn --port=$PORT index:app
```

---

### Challenge 4: run.sh Missing PATH and PYTHONPATH Setup

**Problem:** After switching to `run.sh`, uvicorn started but couldn't find
Python modules. The `strands` and `aws_lambda_powertools` imports failed.

**Root cause:** The initial `run.sh` was just `uvicorn index:app --port $PORT`
without setting up the Python path to include Lambda's runtime directories.

**Solution:** Matched the official LWA example format exactly:
- `PATH=$PATH:$LAMBDA_TASK_ROOT/bin` — finds executables in the Lambda task root
- `PYTHONPATH=$PYTHONPATH:/opt/python:$LAMBDA_RUNTIME_DIR` — finds Lambda layers and runtime packages
- `python -m uvicorn` instead of bare `uvicorn` — ensures correct Python interpreter

---

### Challenge 5: Platform Mismatch (macOS → Lambda Linux)

**Problem:** `ModuleNotFoundError: No module named 'pydantic_core._pydantic_core'`

**Root cause:** pip packages were installed on macOS, producing Darwin `.so` files:
```
_pydantic_core.cpython-313-darwin.so    ← macOS binary
```
Lambda runs Amazon Linux x86_64 and needs:
```
_pydantic_core.cpython-313-x86_64-linux-gnu.so    ← Linux binary
```

**Solution:** Rebuild with platform-specific pip install:
```bash
pip install \
  --platform manylinux2014_x86_64 \
  --target /tmp/lambda-package-linux \
  --implementation cp \
  --python-version 3.13 \
  --only-binary=:all: \
  -r requirements.txt
```

The `--platform` and `--only-binary=:all:` flags force pip to download
pre-compiled Linux wheels instead of using the local macOS platform.

---

### Challenge 6: Missing aws-xray-sdk

**Problem:** After fixing the platform mismatch, a new error appeared:
`ModuleNotFoundError: No module named 'aws_xray_sdk'`

**Root cause:** Lambda Powertools' `Tracer()` imports `aws_xray_sdk` at module
level during `index.py` initialization. This package wasn't in `requirements.txt`
because it's typically pre-installed in Lambda's Python runtime — but with a
custom ZIP deployment, we need to bundle everything ourselves.

**Solution:** Added `aws-xray-sdk` to the pip install. It pulls in `wrapt`
(which has a compiled `.so`), so the platform-specific install was essential.

---

### Challenge 7: Code Changes Not Reaching AWS (Build Pipeline Caching)

**Problem:** After fixing `index.py`, deploying still showed the old error.
The fix existed in `use-cases/` but never made it to the deployed Lambda.

**Root cause:** Multi-layer caching in the JSII build pipeline:

```
use-cases/.../index.py          ← you edit here
        │
        │  JSII compile (npx jsii)
        │  ⚠️ Only compiles .ts → .js/.d.ts
        │  ⚠️ Does NOT copy .py, .sh, .txt files
        ▼
lib/.../index.py                ← STALE (old version)
        │
        │  Need manual: cp -R use-cases/.../resources lib/.../
        ▼
lib/.../index.py                ← now updated
        │
        │  npx projen package:js
        ▼
dist/js/....tgz                 ← npm tarball (updated)
        │
        │  npm install
        │  ⚠️ npm caches tarballs by path
        │  ⚠️ Same path = serves cached version
        ▼
node_modules/.../index.py       ← STALE (cached)
        │
        │  Need: npm cache clean --force
        │        + delete package-lock.json
        │        + delete node_modules
        │        + npm install
        ▼
node_modules/.../index.py       ← now updated
        │
        │  cdk deploy
        │  ⚠️ CDK asset hash may not change
        │  ⚠️ Need: delete cdk.out to force re-bundling
        ▼
Lambda function                 ← finally gets new code
```

**Workaround for rapid iteration:** Upload the Lambda zip directly via AWS CLI,
bypassing the entire CDK pipeline:

```bash
aws lambda update-function-code \
  --function-name "FUNCTION_NAME" \
  --zip-file fileb:///tmp/lambda-upload-linux.zip
```

---

## CDK Construct Design (Strategy Pattern)

The InteractiveAgent uses the Strategy pattern for pluggable components:

```
InteractiveAgent (extends BaseAgent)
  ├── ICommunicationAdapter  → StreamingHttpAdapter (REST API + LWA)
  ├── ISessionStore          → S3SessionManager (S3 bucket + lifecycle)
  ├── IContextStrategy       → SlidingWindowConversationManager
  └── IAuthenticator         → CognitoAuthenticator (User Pool)
```

Key CDK escape hatch for response streaming:

```typescript
// API Gateway REST API doesn't natively support response streaming
// in CDK. We use CfnMethod escape hatch to set it:
const cfnMethod = postMethod.node.defaultChild as any;
cfnMethod.addPropertyOverride('Integration.ResponseTransferMode', 'STREAM');
cfnMethod.addPropertyOverride(
  'Integration.Uri',
  `arn:aws:apigateway:${region}:lambda:path/2021-11-15/functions/${fn.functionArn}/response-streaming-invocations`
);
cfnMethod.addPropertyOverride('Integration.TimeoutInMillis', 900000);
```

This overrides the CloudFormation template directly because CDK's L2 construct
for REST API doesn't expose response streaming configuration yet.

---

## Key Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `AWS_LAMBDA_EXEC_WRAPPER` | `/opt/bootstrap` | Tells Lambda to use LWA's bootstrap |
| `AWS_LWA_INVOKE_MODE` | `response_stream` | LWA streams responses back |
| `AWS_LWA_READINESS_CHECK_PATH` | `/health` | LWA health check endpoint |
| `AWS_LWA_PORT` | `8080` | Port LWA proxies to |
| `PORT` | `8080` | Port uvicorn listens on |
| `MODEL_ID` | `anthropic.claude-3-haiku-...` | Bedrock model |
| `SYSTEM_PROMPT_S3_BUCKET_NAME` | (auto) | S3 bucket with system prompt |
| `SYSTEM_PROMPT_S3_KEY` | (auto) | S3 key for system prompt file |
| `TOOLS_CONFIG` | `[...]` | JSON array of tool S3 locations |
| `SESSION_BUCKET` | (auto) | S3 bucket for session storage |
| `CONTEXT_ENABLED` | `true` | Enable conversation context |
| `CONTEXT_STRATEGY` | `SlidingWindow` | Context windowing strategy |
| `CONTEXT_WINDOW_SIZE` | `20` | Max messages in context |
| `AUTH_TYPE` | `Cognito` | Authentication type |

---

## Lambda ZIP Package Contents

Since we're using `Code.fromAsset` (not `PythonFunction` with Docker), the ZIP
must contain all Python dependencies pre-installed for Linux x86_64:

```
lambda-upload-linux.zip
├── index.py                    ← FastAPI app (the handler code)
├── run.sh                      ← Lambda handler (starts uvicorn)
├── strands/                    ← Strands Agent SDK
├── fastapi/                    ← FastAPI framework
├── uvicorn/                    ← ASGI server
├── pydantic/                   ← Data validation
├── pydantic_core/              ← Compiled Rust core (.so for linux-x86_64)
├── aws_lambda_powertools/      ← Observability (Logger, Tracer, Metrics)
├── aws_xray_sdk/               ← X-Ray tracing (required by Powertools Tracer)
├── wrapt/                      ← Compiled C extension (.so for linux-x86_64)
├── boto3/                      ← AWS SDK
├── botocore/                   ← AWS SDK core
├── starlette/                  ← ASGI toolkit (FastAPI dependency)
├── sse_starlette/              ← SSE support
├── httpx/                      ← HTTP client (Strands dependency)
├── cryptography/               ← Compiled (.so for linux-x86_64)
└── ...                         ← Other pure-Python dependencies
```

Build command for Linux-compatible packages:
```bash
pip install \
  --platform manylinux2014_x86_64 \
  --target /tmp/lambda-package-linux \
  --implementation cp \
  --python-version 3.13 \
  --only-binary=:all: \
  strands-agents fastapi uvicorn pydantic-settings \
  aws-lambda-powertools boto3 sse-starlette aws-xray-sdk
```

---

## Remaining Work

### Construct Code Fix (interactive-agent.ts)

The construct currently uses `PythonFunction` (requires Docker for bundling).
Needs to switch to `Function` with `Code.fromAsset` and a bundling command:

```typescript
// Current (requires Docker):
this.agentFunction = new PythonFunction(this, 'InteractiveAgentFunction', {
  entry: path.join(__dirname, 'resources/interactive-agent-handler'),
  ...
});

// Target (no Docker, uses pip with --platform flag):
this.agentFunction = new Function(this, 'InteractiveAgentFunction', {
  runtime: Runtime.PYTHON_3_13,
  handler: 'run.sh',
  code: Code.fromAsset(path.join(__dirname, 'resources/interactive-agent-handler'), {
    bundling: {
      image: Runtime.PYTHON_3_13.bundlingImage,
      command: ['bash', '-c', 'pip install -r requirements.txt -t /asset-output && cp -r . /asset-output'],
      // OR use local bundling with --platform flag for non-Docker environments
    },
  }),
  ...
});
```

### Example Cleanup (chatbot-stack.ts)

Before committing:
- Remove `skipBuild: true` from Frontend construct
- Revert tarball reference to `"^0.0.0"` in `package.json`

---

## Lessons Learned

1. **run.sh is the handler**: For LWA ZIP deployments, set the Lambda handler to
   `run.sh` (not `index.handler`). LWA's bootstrap executes it as the startup script.
   Match the [official example](https://github.com/awslabs/aws-lambda-web-adapter/blob/main/examples/fastapi-response-streaming-zip/).

2. **PATH and PYTHONPATH matter**: `run.sh` must set
   `PYTHONPATH=$PYTHONPATH:/opt/python:$LAMBDA_RUNTIME_DIR` to find Lambda layers
   and runtime packages. Use `python -m uvicorn` not bare `uvicorn`.

3. **Platform-specific pip install**: When building Lambda ZIPs on macOS, compiled
   extensions (pydantic_core, wrapt, cryptography) produce Darwin `.so` files.
   Use `--platform manylinux2014_x86_64 --only-binary=:all:` to get Linux binaries.

4. **Bundle aws-xray-sdk**: Lambda Powertools' `Tracer()` imports `aws_xray_sdk`
   at module level. It's pre-installed in Lambda's default runtime but NOT in
   custom ZIP deployments. Must be explicitly included.

5. **JSII build pipeline**: Non-TypeScript files (`.py`, `.sh`) need explicit
   copy steps. `npx projen build` handles this, but `npx jsii` alone doesn't.

6. **npm caching**: When using `file:` references to local tarballs, npm aggressively
   caches by path. Always `npm cache clean --force` when the tarball content changes.

7. **API Gateway CORS**: The REST API CORS preflight config only handles OPTIONS.
   Error responses (4XX/5XX) from authorizers need separate `GatewayResponse` resources.

8. **Cognito token types**: `COGNITO_USER_POOLS` authorizer requires `idToken`,
   not `accessToken`. They look similar but serve different purposes.

9. **CDK escape hatches**: Response streaming on REST API isn't exposed in CDK's
   L2 constructs yet. Use `CfnMethod` escape hatch to set CloudFormation properties.

10. **Direct Lambda upload for iteration**: During development, bypass the full
    CDK pipeline by uploading ZIPs directly via `aws lambda update-function-code`.
    Much faster feedback loop than rebuilding the entire JSII → npm → CDK chain.
