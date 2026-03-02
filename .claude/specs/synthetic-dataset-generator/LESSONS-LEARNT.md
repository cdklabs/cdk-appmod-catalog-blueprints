# Lessons Learnt - Synthetic Dataset Generator

## Session: 2026-03-12

### Issue 1: Strands SDK Does Not Emit Tool Results in Stream

**Problem:**
The InteractiveAgent handler expected to capture tool results via SSE events for schema/preview panels, but the panels stayed empty.

**Root Cause:**
Strands `agent.stream_async()` only emits these event types:
```
['init_event_loop']
['start'], ['start_event_loop']
['event']
['data', 'delta', 'agent', 'event_loop_cycle_id', 'request_state', ...]
```

It does **NOT** emit:
- `tool_result`
- `tool_stream_event`
- Any direct access to tool return values

**Why Retail Chatbot Works:**
The retail chatbot only needs text streaming (which works). It doesn't have side panels that need structured data. The dataset generator needs BOTH text AND structured data (schema, preview) for its UI panels.

**Solution:**
Use Python's `contextvars` to create a shared async queue:
1. Handler creates `asyncio.Queue` and stores it in a `ContextVar`
2. Tools import `emit_sse_event()` function
3. Tools push structured data to the queue
4. Handler drains queue during streaming loop and yields SSE events

```python
# In handler - module level
_sse_queue: contextvars.ContextVar[asyncio.Queue] = contextvars.ContextVar('sse_queue')

def emit_sse_event(event_type: str, data: dict):
    try:
        queue = _sse_queue.get()
        queue.put_nowait({'event': event_type, 'data': data})
    except LookupError:
        pass  # Not in SSE context

# In tools
from index import emit_sse_event
emit_sse_event('schema', {'data': schema_columns})
emit_sse_event('preview', {'rows': preview_rows, 'totalRows': row_count})
```

---

### Issue 2: Session History Corruption

**Problem:**
```
ValidationException: The number of toolResult blocks at messages.24.content
exceeds the number of toolUse blocks of previous turn.
```

**Root Cause:**
When a request fails mid-tool-execution, the session history in S3 gets saved in an inconsistent state. Subsequent requests load corrupted history where tool results don't match tool uses.

**Solution:**
Clear the corrupted session from S3:
```bash
aws s3 rm s3://SESSION_BUCKET/session_ID/ --recursive
```

**Prevention:**
Consider adding session validation before sending to Bedrock, or implementing a recovery mechanism that detects and repairs mismatched tool use/result pairs.

---

### Issue 3: S3 Presigned URLs Fail with KMS Encryption

**Problem:**
```xml
<Error>
  <Code>InvalidArgument</Code>
  <Message>Requests specifying Server Side Encryption with AWS KMS managed keys
  require AWS Signature Version 4.</Message>
</Error>
```

**Root Cause:**
The S3 bucket uses KMS encryption, but presigned URLs were generated without specifying signature version 4.

**Solution:**
Configure boto3 client with signature version:
```python
from botocore.config import Config

s3_client = boto3.client('s3', config=Config(signature_version='s3v4'))
url = s3_client.generate_presigned_url(...)
```

---

### Issue 4: Tools Run in Isolated Context

**Problem:**
Tools loaded via Strands' tool loading mechanism run in a separate context. Simply importing from the handler module doesn't work because:
1. Tools are loaded from S3 as separate modules
2. They don't share the same Python process context as expected

**Solution:**
The `contextvars` approach works because:
- `ContextVar` values propagate across async boundaries
- As long as tools run in the same async context as the handler, they can access the queue

**Alternative approaches considered:**
1. **S3 polling** - Tools write to S3, frontend polls (adds latency)
2. **Parse agent text** - Extract JSON from agent's text response (fragile)
3. **Strands callback handler** - Use custom callbacks (limited documentation)

---

### Architecture Insight: Chat-Only vs Structured Data Apps

| Feature | Chat-Only Apps (Retail Chatbot) | Structured Data Apps (Dataset Gen) |
|---------|--------------------------------|-----------------------------------|
| Text streaming | Works via Strands | Works via Strands |
| Tool execution | Works (results in agent response) | Works (but need structured access) |
| Structured UI data | Not needed | **Requires workaround** |

**Key Learning:**
Strands is optimized for conversational AI where tool results are naturally described in text. For apps that need to display structured tool outputs in dedicated UI components, you need to implement a side-channel (like the contextvars queue) to extract that data.

---

### Frontend SSE Event Expectations

The frontend expects these SSE events:

| Event | Payload | Purpose |
|-------|---------|---------|
| `metadata` | `{session_id, user_id}` | Session info |
| `message` (default) | `{text: "..."}` | Streamed text chunks |
| `schema` | `{data: [{name, type, description}]}` | Schema panel |
| `preview` | `{rows: [...], totalRows: N}` | Preview panel |
| `download` | `{data: {csv, json}}` | Export URLs |
| `done` | `{}` | Stream complete |
| `error` | `{error: "..."}` | Error message |

---

### Debug Techniques Used

1. **CloudWatch Logs with filter pattern:**
   ```bash
   aws logs filter-log-events --filter-pattern "Stream event keys" --limit 30
   ```

2. **Add debug logging to see actual event structure:**
   ```python
   event_keys = list(event.keys())
   if event_keys != ['data']:
       logger.debug(f'Stream event keys: {event_keys}')
   ```

3. **Inspect S3 session files:**
   ```bash
   aws s3 ls s3://SESSION_BUCKET/ --recursive
   aws s3 cp s3://SESSION_BUCKET/session_X/messages/message_N.json - | python3 -m json.tool
   ```

---

### Files Modified

- `use-cases/framework/agents/resources/interactive-agent-handler/index.py` - Added contextvars SSE queue
- `examples/synthetic-dataset-generator/resources/tools/execute_script.py` - Emit schema/preview events
- `examples/synthetic-dataset-generator/resources/export/handler.py` - Fix S3 signature version
- `lib/` copies of above files

---

### Testing Checklist

After making SSE changes:
1. Clear any corrupted sessions: `aws s3 rm s3://SESSION_BUCKET/session_X/ --recursive`
2. Deploy: `npx cdk deploy --require-approval never`
3. Refresh browser (new session)
4. Test: "Create customer dataset with 5 fields, 1000 rows"
5. Verify Schema panel populates
6. Verify Preview panel populates
7. Test export and verify download links work

---

### Debugging Strategy: Parallel Subagents

**Lesson:** Use subagents liberally for parallel investigation:
- Agent 1: Analyze handler SSE flow
- Agent 2: Analyze frontend SSE expectations
- Agent 3: Analyze tool return formats
- Agent 4: Research Strands SDK documentation

This kept main context clean and allowed faster root cause discovery.

---

### Strands SDK Documentation

**Where to find streaming docs:**
- https://strandsagents.com/docs/user-guide/concepts/streaming/
- https://strandsagents.com/docs/user-guide/concepts/streaming/callback-handlers/

**Key insight:** Strands docs show `tool_stream_event` for TypeScript but Python behavior differs. Always verify with actual CloudWatch logs, not just documentation.

---

### Architecture Pattern: Contextvars for Cross-Boundary Communication

```
┌─────────────────────────────────────────────────────────────────┐
│  Handler (async context)                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  asyncio.Queue() ──► _sse_queue.set(queue)              │   │
│  │       ▲                                                  │   │
│  │       │ put_nowait()                                     │   │
│  │       │                                                  │   │
│  │  ┌────┴────────────────────────────────────────────┐    │   │
│  │  │  Tool execution (same async context)            │    │   │
│  │  │  emit_sse_event('schema', data)                 │    │   │
│  │  │  emit_sse_event('preview', data)                │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │       │                                                  │   │
│  │       ▼ get_nowait()                                     │   │
│  │  yield format_sse(event_data, event=event_type)         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

This pattern is reusable for any Strands-based app needing structured tool outputs.

---

### When to Use This Pattern

Use contextvars SSE queue when:
- App has UI panels beyond just chat (schema, preview, status panels)
- Tools return structured data that UI needs to display directly
- Real-time updates are required (vs polling S3)

Don't need this when:
- Chat-only interface (text streaming is sufficient)
- Tool results naturally fit in agent's text response
- Latency-tolerant (can poll S3 for results)

---

## Session: 2026-03-12 (Continued)

### Issue 5: API Gateway 29s Timeout with Response Streaming

**Problem:**
Despite enabling response streaming (`ResponseTransferMode: STREAM`), connections died at ~29 seconds with `ERR_HTTP2_PROTOCOL_ERROR`.

**Root Cause:**
API Gateway endpoint type was defaulting to **EDGE** (edge-optimized), which has a **30 second idle timeout**. REGIONAL endpoints have a **5 minute idle timeout**.

**Solution:**
```typescript
const restApi = new RestApi(this.scope, 'ChatApi', {
  endpointTypes: [EndpointType.REGIONAL],  // 5min idle timeout
  // ...
});
```

**Key Learning:**
Response streaming doesn't bypass timeouts - it just allows data to flow for longer once started. The idle timeout (how long without data) is what matters, and it varies by endpoint type.

---

### Issue 6: Blank Screen During Streaming (Schema Format Mismatch)

**Problem:**
Frontend went blank mid-stream while showing "fixing the data generation script".

**Root Cause:**
Backend sent schema as dict: `{'col_name': {'type': '...'}}`
Frontend expected array: `[{name: 'col_name', type: '...'}]`

When `schema.length` was called on an object, it returned `undefined`, causing React to crash (no ErrorBoundary).

**Solution:**
Convert dict to array in `api.ts`:
```typescript
if (typeof rawSchema === 'object' && rawSchema !== null) {
  schemaArray = Object.entries(rawSchema).map(([name, value]) => ({
    name,
    type: value?.type || 'unknown',
    description: value?.description || '',
  }));
}
```

---

### Issue 7: Schema Shows Null Names and Unknown Types

**Problem:**
Schema panel displayed columns but with null names and "unknown" types.

**Root Cause:**
Backend sends: `{columns: [{columnName, dataType, description}]}`
Frontend expected: `[{name, type, description}]`

Field name mismatch: `columnName` vs `name`, `dataType` vs `type`.

**Solution:**
Map field names in `api.ts`:
```typescript
schemaArray = rawSchema.columns.map((col) => ({
  name: col.columnName || col.name || '',
  type: col.dataType || col.type || 'unknown',
  description: col.description || '',
}));
```

---

### Issue 8: KMS AccessDenied on Presigned URLs

**Problem:**
```
AccessDenied: not authorized to perform: kms:Decrypt on resource
```

**Root Cause:**
Export bucket uses KMS encryption. Chat agent had `s3:GetObject` permission but was missing `kms:Decrypt`.

**Solution:**
```typescript
exportBucketKey.grantDecrypt(this.chatAgent.agentFunction!);
```

**Key Learning:**
When using KMS-encrypted S3 buckets, presigned URLs require BOTH `s3:GetObject` AND `kms:Decrypt` permissions on the signing role.

---

### Issue 9: Export Button Always Greyed Out

**Problem:**
Export button stayed disabled even after downloads were available.

**Root Cause:**
Disabled condition was `disabled={!downloads || isStreaming}`. The `downloads` state was null initially, and the condition checked truthiness before the ExportButton's internal `hasDownloads` check.

**Solution:**
```typescript
// Before
<ExportButton downloads={downloads} disabled={!downloads || isStreaming} />

// After
<ExportButton downloads={downloads} disabled={isStreaming} />
```

---

### Issue 10: Raw S3 URLs Cluttering Chat

**Problem:**
Presigned S3 URLs displayed as raw text in chat messages - security/UX concern.

**Solution:**
Filter URLs from message content before rendering:
```typescript
function filterDownloadUrls(content: string): string {
  return content
    .split('\n')
    .filter(line => !line.includes('X-Amz-Signature') && !line.match(/https:\/\/.*s3.*amazonaws\.com/))
    .join('\n');
}
```

---

### Architecture Pattern: REGIONAL vs EDGE Endpoints

| Endpoint Type | Idle Timeout | Use Case |
|---------------|--------------|----------|
| EDGE (default) | 30 seconds | Low-latency global access |
| REGIONAL | 5 minutes | Long-running operations, streaming |

**Always use REGIONAL for agents with tool calls that may take >30 seconds.**

---

### Debugging Pattern: Multi-Agent Parallel Investigation

When facing multiple potential root causes, spawn parallel agents:
1. Agent 1: Check Lambda logs
2. Agent 2: Check frontend build/errors
3. Agent 3: Check API/session state
4. Agent 4: Check permissions

This keeps main context clean and finds issues faster than sequential investigation

---

## Session: 2026-03-12 (Continued - UI/UX Fixes)

### Issue 11: Export Button Field Name Mismatch

**Problem:**
Export button stayed greyed out even when downloads were available.

**Root Cause:**
Backend sends: `{csv, json, schema, script}`
Frontend expected: `{csv_url, json_url, schema_url, script_url}`

**Solution:**
Updated `types/index.ts` and `ExportButton.tsx` to use correct field names without `_url` suffix.

---

### Issue 12: Markdown Not Rendering in Chat

**Problem:**
Bold text like `**Customer Data**` showed raw asterisks instead of bold formatting.

**Root Cause:**
Custom `renderContent` function only handled newlines/lists, not markdown syntax.

**Solution:**
Added `react-markdown` package with custom component styling:
```typescript
import ReactMarkdown from 'react-markdown';

<ReactMarkdown
  components={{
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    // ... other components
  }}
>
  {filteredContent}
</ReactMarkdown>
```

---

### Issue 13: Markdown S3 Links Still Appearing

**Problem:**
Agent outputs markdown links `[Download JSON](https://...s3...)` that weren't being filtered.

**Root Cause:**
Original filter only caught raw URLs, not markdown link syntax.

**Solution:**
Enhanced `filterDownloadUrls()` with multiple patterns:
```typescript
const s3UrlPattern = /https?:\/\/[^\s\)]+\.s3(?:\.[^\/\s\)]+)?\.amazonaws\.com[^\s\)]*/i;
const markdownS3LinkPattern = /\[([^\]]*)\]\(https?:\/\/[^\)]+\.s3(?:\.[^\)]+)?\.amazonaws\.com[^\)]*\)/i;
```

---

### Issue 14: Export Progress Timing Confusion

**Problem:**
4-step progress indicator showed fake progress that didn't match backend timing.

**Root Cause:**
Backend sends ALL 4 download URLs at once after export Lambda completes. Simulated step-by-step progress was misleading.

**Solution:**
Simplified to single honest indicator:
```
⏳ Generating full dataset...  → when export starts
✓ Dataset ready for download   → when all 4 URLs arrive
  4 files ready: CSV, JSON, Schema, Script
```

**Key Learning:**
Don't fake progress. If you can't track real progress, show a single honest spinner.

---

### Issue 15: Streaming Stalls During Tool Execution

**Problem:**
Chat appears frozen during tool calls (generate_script, execute_script, export_dataset) - no visual feedback.

**Root Cause:**
LLM streams text, then calls tool (no streaming), then resumes. User sees "stall" with no indication something is happening.

**Solution:**
Added stall detection with bouncing 3-dots indicator:
```typescript
// Track content changes
const [isStalled, setIsStalled] = useState(false);

useEffect(() => {
  if (isStreaming && contentNotChangedFor2Seconds) {
    setIsStalled(true);
  }
}, [messages, isStreaming]);

// Show indicator
{isStreaming && isStalled && <MessageLoading />}
```

**MessageLoading component:** Animated SVG with 3 bouncing dots.

---

### Issue 16: Disappearing Text Mystery

**Problem:**
Text appears in chat then disappears. NO console logs appear during disappearance.

**Investigation:**
Added comprehensive debug logging:
- `[START_STREAMING]` - streaming message created
- `[APPEND]` - content chunk appended
- `[STOP_STREAMING]` - streaming finalized
- `[LOAD_SESSION]` - session reload (could reset state)
- `[RESET_CHAT]` - chat cleared
- `[RENDER]` - component rendering

**Most Likely Causes:**
1. `filterDownloadUrls()` filtering too aggressively
2. React key change causing remount
3. Unexpected session reload
4. ReactMarkdown rendering issue

**Status:** Debug logging deployed, awaiting user test with DevTools console.

---

### Architecture Pattern: Stall Detection

```
User sends message
    ↓
START_STREAMING → create empty message
    ↓
SSE chunks arrive → APPEND_CONTENT → update lastContentTime
    ↓
Tool execution starts → streaming pauses
    ↓
setTimeout(2000ms) → no new content → setIsStalled(true)
    ↓
Show ⬤ ⬤ ⬤ bouncing dots
    ↓
Tool returns → streaming resumes → setIsStalled(false)
    ↓
Continue appending content
```

---

### UX Pattern: Honest Progress Indicators

| Scenario | Good | Bad |
|----------|------|-----|
| Know exact progress | Show percentage/steps | N/A |
| Don't know progress | Single spinner | Fake step-by-step |
| Long operation | Spinner + "this may take a minute" | Nothing |
| Tool execution | Bouncing dots after 2s delay | Frozen UI |

**Rule:** If you can't accurately report progress, don't pretend you can.

---

## Issue 17: Stream Truncation Done Wrong

**Symptom:** Content keeps overwriting at same line after truncation point

**Root cause:** Truncating in reducer but stream keeps coming → endless truncate cycles

**Fix:** Check if content already ends with stop phrase, then `return state` (skip append entirely)

```typescript
case 'APPEND_CONTENT': {
  const prevContent = lastMsg.content;
  // Stop appending if already truncated
  if (/ready for download!?\s*$/i.test(prevContent)) {
    return state; // Don't append anything more
  }
  // ... rest of logic
}
```

---

## Issue 18: API Gateway Route Not Exposed

**Symptom:** CORS error when calling `/history` endpoint

**Root cause:** Added endpoint to FastAPI handler but API Gateway only routes `/chat`. InteractiveAgent doesn't expose `restApi` publicly.

**Workaround:** Agent still has S3 context - just UI doesn't display history on refresh

**Proper fix:** Expose `restApi` and `cognitoAuthorizer` from InteractiveAgent construct

---

## Issue 19: Button Disabled During Streaming

**Symptom:** Export button stays grey until streaming finishes

**Root cause:** `<ExportButton disabled={isStreaming} />` 

**Fix:** Remove the `disabled` prop - let ExportButton's internal `hasDownloads` check handle it

---

## UX Pattern: Enable Actions Early

| Component | Enable When | Not When |
|-----------|-------------|----------|
| Export button | Any download ready | Streaming finishes |
| Download buttons | Individual file ready | All files ready |
| Submit button | Input valid | Processing complete |

**Rule:** Enable user actions as soon as they're meaningful, not when everything is done.

---

## Session: 2026-03-12 (Continued - Deployment Issue)

### Issue 20: Python Handler Changes Not Deployed (lib/ vs use-cases/)

**Problem:**
Made changes to `use-cases/framework/agents/resources/interactive-agent-handler/index.py` but Lambda wasn't updated after `cdk deploy`. New `/sessions` endpoint returned 404.

**Root Cause:**
CDK uses the **`lib/`** folder for deployment, NOT `use-cases/`. The build process:
1. `npm run compile` runs JSII which compiles **TypeScript only**
2. Python files in `use-cases/` are **NOT automatically copied** to `lib/`
3. CDK asset hashing uses `lib/` files → no hash change → no Lambda update

**The `lib/` folder had stale Python code** while `use-cases/` had the new code.

**Solution:**
Manually copy the handler file:
```bash
cp use-cases/framework/agents/resources/interactive-agent-handler/index.py \
   lib/framework/agents/resources/interactive-agent-handler/index.py
```

Then redeploy:
```bash
npx cdk deploy --profile appmod-blueprints
```

**Prevention:**
After modifying Python handler files in `use-cases/`, ALWAYS:
1. Copy to `lib/`: `cp use-cases/.../index.py lib/.../index.py`
2. Verify with diff: `diff use-cases/.../index.py lib/.../index.py`
3. Then deploy

**Or** create a script:
```bash
#!/bin/bash
# sync-handlers.sh
cp -r use-cases/framework/agents/resources/ lib/framework/agents/resources/
echo "Handler files synced to lib/"
```

---

### Architecture Insight: CDK Asset Resolution

```
use-cases/          ← Source code (you edit here)
     │
     │ npm run compile (JSII)
     ▼
lib/                ← Compiled output (CDK reads from here)
     │
     │ cdk synth / deploy
     ▼
cdk.out/            ← CloudFormation + asset bundles
     │
     │ upload
     ▼
S3/Lambda           ← Deployed resources
```

**Key insight:** JSII only handles `.ts` → `.js` compilation. Python/other files must be manually synced or handled by custom build scripts.

---

### Quick Diagnostic Commands

```bash
# Check if lib/ is stale
diff use-cases/framework/agents/resources/interactive-agent-handler/index.py \
     lib/framework/agents/resources/interactive-agent-handler/index.py

# Check Lambda last modified time
aws lambda list-functions --query "Functions[?contains(FunctionName,'ChatAgent')].{Name:FunctionName,Modified:LastModified}" --output table

# Force redeploy (won't work if asset hash unchanged!)
npx cdk deploy --force

# Check CloudWatch for 404s on new endpoints
aws logs tail "/aws/lambda/FUNCTION_NAME" --since 10m | grep -E "404|/sessions"
```

---

### Deployment Checklist for Handler Changes

- [ ] Edit `use-cases/.../index.py`
- [ ] Copy to `lib/.../index.py`
- [ ] Verify: `diff use-cases/.../index.py lib/.../index.py` (should show no diff)
- [ ] Deploy: `npx cdk deploy`
- [ ] Verify Lambda updated: check `LastModified` timestamp
- [ ] Test new endpoints in browser/curl

---

### Issue 21: Strands S3SessionManager Uses Leading Slash in Keys

**Problem:**
After "fixing" S3 prefixes by removing leading slashes, `/history` endpoint returned empty arrays.

**Root Cause:**
Strands `S3SessionManager` **intentionally** stores sessions with a leading slash:
```
/session_{uuid}/agents/agent_default/messages/message_0.json
```

This is NOT a bug - it's how Strands works.

**Wrong fix (broke it):**
```python
prefix = f'session_{session_id}/...'  # ❌ Won't find anything
```

**Correct code:**
```python
prefix = f'/session_{session_id}/...'  # ✅ Matches Strands storage
```

**Key Learning:**
Always verify actual S3 key format before "fixing" paths:
```bash
aws s3 ls s3://BUCKET/ --recursive | head -20
```

Strands stores with leading slash - don't remove it!

---

### Issue 22: Lambda Web Adapter Incompatible with Standard API Gateway Proxy

**Problem:**
`/history` and `/sessions` endpoints returned 502 errors. CloudWatch showed Lambda returning 200 OK, but browser received 502.

**Root Cause:**
Lambda Web Adapter (LWA) is designed for **response streaming** invocations, not standard API Gateway proxy invocations:

- `/chat` uses `response-streaming-invocations` → LWA handles correctly ✅
- `/history` uses standard `invocations` → LWA returns malformed response ❌

When invoked directly, LWA returned two concatenated JSON objects:
```
{"statusCode":404,"headers":{...}}{"detail":"Not Found"}
```

This is invalid JSON that API Gateway cannot parse → 502.

**Solution:**
Create a **separate simple Lambda** for non-streaming endpoints:
```typescript
const historyLambda = new PythonFunction(this, 'HistoryHandler', {
  entry: path.join(__dirname, './resources/history-handler'),
  // ... no Lambda Web Adapter
});

// Use this Lambda for /history and /sessions routes
const historyIntegration = new LambdaIntegration(historyLambda);
```

**Key Learning:**
Lambda Web Adapter only works reliably with:
- Response streaming invocations (`/response-streaming-invocations`)
- Lambda Function URLs
- ALB integrations

For standard API Gateway proxy integration, use a plain Lambda handler.

---

### Issue 23: Strands Message Content Format Mismatch

**Problem:**
History Lambda found S3 objects but returned 0 messages.

**Root Cause:**
Code expected Anthropic/OpenAI format:
```python
# Expected format
{"type": "text", "text": "hello"}

# Actual Strands format
{"text": "hello"}  # No "type" field!
```

The `extract_text_content()` function checked for `block.get('type') == 'text'` which never matched.

**Solution:**
```python
# Before (wrong)
if isinstance(block, dict) and block.get('type') == 'text':
    text_parts.append(block.get('text', ''))

# After (correct)
if isinstance(block, dict):
    if 'text' in block:
        text_parts.append(block['text'])
```

**Key Learning:**
Always check actual S3 message format before writing parsing code:
```bash
aws s3 cp s3://BUCKET/session_X/messages/message_0.json - | python3 -m json.tool
```

---

### Architecture Pattern: Streaming vs Non-Streaming Lambdas

```
┌─────────────────────────────────────────────────────────────────┐
│  /chat (streaming)                                              │
│  ────────────────                                               │
│  API Gateway → response-streaming-invocations → LWA → FastAPI   │
│       ← SSE stream ←                                            │
│  ✅ Works: Lambda Web Adapter designed for this                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  /history, /sessions (non-streaming)                            │
│  ───────────────────────────────────                            │
│  API Gateway → standard invocations → Simple Lambda (no LWA)    │
│       ← JSON response ←                                         │
│  ✅ Works: Plain Lambda returns proper proxy response           │
└─────────────────────────────────────────────────────────────────┘
```

**Rule:** Don't reuse streaming-optimized Lambdas for non-streaming endpoints.

---

### Debug Pattern: Trace Data Flow Layer by Layer

When facing 502s with 200 in logs:

1. **Check Lambda logs** - is the handler executing?
2. **Invoke Lambda directly** - what's the actual response format?
3. **Check API Gateway config** - correct integration type?
4. **Check S3 data format** - does it match what code expects?

```bash
# Layer 1: Lambda executing?
aws logs filter-log-events --log-group-name "/aws/lambda/X" --filter-pattern "History"

# Layer 2: Direct invoke
aws lambda invoke --function-name X --payload '...' response.json
cat response.json

# Layer 3: API Gateway method
aws apigateway get-method --rest-api-id X --resource-id Y --http-method GET

# Layer 4: S3 data format
aws s3 cp s3://bucket/session_X/messages/message_0.json - | python3 -m json.tool
```

---

### Summary: Session History Feature

**Components:**
1. `HistoryHandler` Lambda - reads from S3, returns JSON
2. `/history/{session_id}` route - fetches conversation for UI display
3. `/sessions` route - lists all user sessions from S3 index
4. Frontend `switchSession()` - calls `/history`, loads messages

**S3 Structure (Strands format):**
```
/session_{uuid}/
  ├── session.json
  └── agents/agent_default/
      ├── agent.json
      └── messages/
          ├── message_0.json  # {message: {role, content: [{text}]}}
          ├── message_1.json
          └── ...

session-index/{user_id}/
  └── {session_id}.json  # {sessionId, createdAt, lastMessage}
```

---

## Session: 2026-03-13 (CORS & Construct Best Practices)

### Issue 24-25: CORS for Custom HTTP Methods (RESOLVED)

**Problem:**
1. Delete button clicked but session not deleted - browser blocked by CORS preflight
2. Attempted fix with custom `StreamingHttpAdapter` broke existing routes

**Root Causes:**
1. CORS preflight only allowed `POST,OPTIONS` - missing `DELETE`
2. External construct creation changed CloudFormation logical IDs → deleted routes

**Solution: Pass-Through Props Pattern**

Added `corsAllowMethods` prop to `InteractiveAgentProps` and `LambdaHostingAdapterProps`:

```typescript
// use-cases/framework/agents/interactive-agent.ts
export interface InteractiveAgentProps extends BaseAgentProps {
  readonly corsAllowMethods?: string[];  // @default ['POST', 'OPTIONS']
}

// Usage - construct tree stays stable:
new InteractiveAgent(this, 'ChatAgent', {
  corsAllowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
});
```

**Why pass-through works but external constructs break:**
- CloudFormation IDs are generated from construct tree paths
- External `new StreamingHttpAdapter()` changes the tree → new IDs → resources deleted
- Pass-through props configure the **same internal construct** → tree unchanged

**Debugging CORS:**
```bash
# Test preflight
curl -X OPTIONS "https://api/endpoint" \
  -H "Origin: https://frontend" \
  -H "Access-Control-Request-Method: DELETE" -i

# Look for: access-control-allow-methods: DELETE,OPTIONS
```

**Key Learnings:**
1. **Pass-through props** - don't require external construct creation for config
2. **Test construct tree stability** - deploy should show "(no changes)" to IDs
3. **CORS debugging** - browser silently blocks; check preflight response headers

---

### Issue 26: Schema/Preview Not Persisted Across Sessions

**Problem:**
Switching to old session loaded messages but Schema/Preview panels empty.

**Root Cause:**
Schema/preview only emitted via SSE during active streaming - never persisted to S3.

**Solution:**
1. `execute_script.py` saves to `session-metadata/{session_id}/latest_result.json`
2. `history-handler` fetches metadata alongside messages
3. Frontend `LOAD_SESSION` action restores schema/preview

**Key Learning:**
For apps with persistent sessions, persist ALL relevant state - not just conversation history.

---

### Issue 27: Invalid Date in Restored Messages

**Problem:**
Switching sessions showed "Invalid Date" on all messages.

**Root Cause:**
Backend didn't include timestamps. Frontend did `new Date(undefined)` → Invalid Date.

**Solution:**
Defense in depth:
```typescript
// api.ts - fallback to now
timestamp: m.timestamp ? new Date(m.timestamp as string) : new Date(),

// ChatContext.tsx - validate Date object
timestamp: msg.timestamp instanceof Date && !isNaN(msg.timestamp.getTime())
  ? msg.timestamp : new Date(),

// MessageBubble.tsx - guard display
if (!(date instanceof Date) || isNaN(date.getTime())) return '';
```

---

### CDK Construct Design Best Practices

| Practice | Good | Bad |
|----------|------|-----|
| Configuration | Pass-through props | Require external construct creation |
| Defaults | Optional props with sensible defaults | Required props |
| Backwards compat | New props don't change behavior | Breaking changes |
| Construct tree | Stable IDs across deploys | IDs change with config |

---

## Session: 2026-03-13 (Continued - Loading States & Session Persistence)

### Issue 28: PreviewProgress Spinner Not Showing

**Problem:**
Spinner in chat ("Generating preview data...") never showed during preview generation.

**Root Cause:**
React batches state updates. `schema` and `preview` SSE events arrive in same buffer read → both dispatched in same render cycle → condition `schema.length > 0 && preview.length === 0` never true.

**Solution:**
Show PreviewProgress when schema arrived but preview hasn't:
```tsx
{isStreaming && schema.length > 0 && preview.length === 0 && (
  <PreviewProgress hasPreview={false} hasSchema={true} />
)}
```

---

### Issue 29: PreviewProgress Showing During Clarifying Questions

**Problem:**
Spinner showed when AI asked "What fields do you need?" - before any tool execution.

**Root Cause:**
Condition `isStreaming && isStalled` triggered on ANY pause >1 second, including natural text composition pauses.

**Solution:**
Only show when schema exists (tool actually ran):
```tsx
// Before: isStreaming && isStalled && preview.length === 0
// After: isStreaming && schema.length > 0 && preview.length === 0
```

---

### Issue 30: Schema/Preview Not Persisted When AI Doesn't Pass session_id

**Problem:**
Schema/preview sometimes not saved to S3, causing empty panels on session switch.

**Root Cause:**
`execute_script` tool has `session_id: str = ""` parameter. AI agent doesn't always pass it.

```python
# Tool only saves if session_id provided
if session_id and 'schema' in result:
    save_result_to_s3(session_id, ...)  # Never called if empty!
```

**Solution:**
Pass session_id via environment variable as fallback:
```python
# In handler - set env before running agent
os.environ['CURRENT_SESSION_ID'] = session_id

# In tool - fallback to env var
effective_session_id = session_id or os.environ.get('CURRENT_SESSION_ID', '')
```

---

### Issue 31: Export Download Buttons Gone After Session Switch

**Problem:**
Exported a dataset, switched sessions, switched back → download buttons greyed out/gone.

**Root Causes (3 places):**
1. `export_dataset.py` - Downloads NOT persisted to S3 (only emitted via SSE)
2. `/history` endpoint - Didn't return `downloads` field
3. Frontend - Didn't expect/restore `downloads` in LOAD_SESSION

**Solution:**
1. Added `save_downloads_to_s3()` function in `export_dataset.py`
2. Added `downloads` to /history response in `index.py`
3. Updated `api.ts`, `types/index.ts`, `ChatContext.tsx` to handle downloads

**Presigned URL caveat:** URLs expire in 24 hours. If user returns after 24h, links are broken. Future improvement: save S3 keys and regenerate presigned URLs on history fetch.

---

### Issue 32: SchemaPanel Missing Loading Spinner

**Problem:**
PreviewPanel had spinner during streaming, but SchemaPanel just showed skeleton table.

**Solution:**
Added same pattern to SchemaPanel:
```tsx
if (schema.length === 0 && isStreaming) {
  return (
    <div>
      <Loader2 className="animate-spin" />
      <span>Preparing schema...</span>
      <SkeletonTable rows={5} columns={3} />
    </div>
  );
}
```

---

### Architecture Pattern: Session State Persistence

For apps with persistent sessions, persist ALL relevant UI state:

| State | Where Saved | When Saved |
|-------|-------------|------------|
| Messages | Strands S3SessionManager | Auto by Strands |
| Schema | `session-metadata/{id}/latest_result.json` | On execute_script |
| Preview | `session-metadata/{id}/latest_result.json` | On execute_script |
| Downloads | `session-metadata/{id}/latest_result.json` | On export_dataset |

**Key Learning:** SSE events are ephemeral. Anything the UI needs to restore must be persisted to S3.

---

### Debugging Pattern: Environment Variables for Tool Context

When tools need session context that AI might not pass:

```python
# 1. Handler sets environment before agent runs
os.environ['CURRENT_SESSION_ID'] = session_id
os.environ['CURRENT_USER_ID'] = user_id

# 2. Tool reads from param OR env var
effective_id = param_value or os.environ.get('ENV_VAR_NAME', '')
```

This ensures tools always have context, regardless of whether AI remembered to pass it.

---

### Files Modified This Session

**Loading states:**
- `frontend/src/components/data/PreviewPanel.tsx` - Spinner during streaming
- `frontend/src/components/data/SchemaPanel.tsx` - Added spinner
- `frontend/src/components/data/PreviewProgress.tsx` - New inline chat component
- `frontend/src/components/chat/ChatPanel.tsx` - Show PreviewProgress

**Session persistence:**
- `resources/tools/execute_script.py` - Use env var fallback for session_id
- `resources/tools/export_dataset.py` - Save downloads to S3
- `use-cases/.../interactive-agent-handler/index.py` - Set env vars, return downloads
- `frontend/src/services/api.ts` - Handle downloads in history response
- `frontend/src/types/index.ts` - Add downloads to LOAD_SESSION action
- `frontend/src/context/ChatContext.tsx` - Restore downloads on session load

---

## Session: 2026-03-13 (Continued - Session Switching & Delete UX)

### Issue 33: Session Switching Race Condition

**Problem:**
Rapidly clicking between sessions showed wrong data. Click A → Click B → UI showed A (because A's fetch finished last).

**Root Cause:**
No cancellation of in-flight fetches. Multiple `fetchSessionHistory()` calls race; last to complete wins, not last clicked.

```typescript
// BEFORE: Both fetches race
switchSession(A) → fetch(A) starts
switchSession(B) → fetch(B) starts
B completes → UI shows B
A completes → UI shows A ← WRONG!
```

**Solution:**
Use `AbortController` to cancel previous fetch when user clicks new session:

```typescript
// ChatContext.tsx
const fetchAbortControllerRef = useRef<AbortController | null>(null);

const switchSession = useCallback(async (targetSessionId: string) => {
  // Cancel any in-flight fetch
  fetchAbortControllerRef.current?.abort();
  fetchAbortControllerRef.current = new AbortController();

  try {
    const response = await fetchSessionHistory(targetSessionId, signal);
    // ... apply response
  } catch (error) {
    if (error.name === 'AbortError') return;  // Intentional, ignore
    // ... handle real errors
  }
}, []);
```

**Key Learning:**
For any UI with cancellable async operations (session switching, search-as-you-type), use AbortController to prevent stale responses from overwriting fresh ones.

---

### Issue 34: Delete Not Awaited - UI/Backend Inconsistency

**Problem:**
Delete button clicked → session disappeared → page refresh → session reappeared!

**Root Cause:**
`deleteSession()` called without `await`. UI updated immediately but S3 delete might not have completed before refresh.

```typescript
// Sidebar.tsx - BEFORE
const handleDeleteSession = (e, sessionId) => {
  deleteSession(sessionId);  // Fire and forget!
};
```

**Solution:**
Optimistic UI pattern - update UI instantly from localStorage (survives refresh), S3 delete in background:

```typescript
// ChatContext.tsx
const deleteSession = useCallback(async (targetSessionId) => {
  // 1. INSTANT: Update localStorage (survives refresh)
  sessionStorage.deleteSession(userId, targetSessionId);
  setSessions(updatedSessions);

  // 2. BACKGROUND: S3 cleanup (fire and forget)
  apiDeleteSession(targetSessionId)
    .then(() => console.debug('S3 cleanup complete'))
    .catch((e) => console.warn('S3 cleanup failed (orphan):', e));
}, [userId]);
```

**Key Learning:**
Optimistic UI = instant feedback + eventual consistency. Use localStorage as UI source of truth, cloud storage as backup. Orphaned cloud data is acceptable if user never sees it.

---

### Issue 35: Incomplete S3 Deletion

**Problem:**
Deleted session reappeared with old schema/preview data after refresh.

**Root Cause:**
Delete only removed messages, not metadata:
```
session-index/{user}/{session}.json  ← Deleted ✓
/session_{id}/messages/              ← Deleted ✓
session-metadata/{session}/          ← NOT DELETED ✗
```

**Solution:**
Delete ALL session-related S3 prefixes:

```python
# history-handler/index.py
# 1. Delete Strands session tree
session_prefix = f'/session_{session_id}/'  # Everything, not just messages/

# 2. Delete metadata
metadata_prefix = f'session-metadata/{session_id}/'

# 3. Delete index
index_key = f'session-index/{user_id}/{session_id}.json'
```

**Key Learning:**
When deleting distributed data, audit ALL storage locations. A session isn't "deleted" until every related object is gone.

---

### Issue 36: Wrong Sort Field Name (snake_case vs camelCase)

**Problem:**
Session list appeared in random order instead of newest first.

**Root Cause:**
Backend stored `created_at` (snake_case) but sorted by `createdAt` (camelCase):
```python
sessions.sort(key=lambda x: x.get('createdAt', ''))  # Always ''!
```

**Solution:**
```python
sessions.sort(key=lambda x: x.get('updated_at', x.get('created_at', '')), reverse=True)
```

**Key Learning:**
Consistency in naming conventions matters. When debugging "random" ordering, check field name casing first.

---

### Architecture Pattern: Cancel + Redirect vs Ignore

| Approach | UX | Implementation |
|----------|-----|----------------|
| **Ignore clicks during loading** | Frustrating - "why didn't it switch?" | Simple flag check |
| **Cancel + redirect** | Natural - goes where you last clicked | AbortController |

**Always prefer cancel + redirect for navigation-style actions.**

---

### Architecture Pattern: Optimistic UI for Deletes

```
User clicks Delete
        │
        ├──► localStorage.delete()  ← SYNC (instant, survives refresh)
        │           │
        │           ▼
        │    UI updated immediately ✓
        │
        └──► S3.delete()            ← ASYNC (background)
                    │
                    ▼
             Cleanup happens eventually
             If fails? Orphan data, but invisible to user
```

**Rule:** localStorage = UI truth, Cloud = backup. Update local first, sync to cloud in background.

---

### Architecture Insight: S3 Session Index Is Wrong Pattern

**Current (problematic):**
```
session-index/{user}/{session}.json  ← One file per session
```

Problems:
- ListObjects is slow at scale
- No atomic operations
- Cross-device requires localStorage hack

**Better (DynamoDB):**
```
DynamoDB Table
  PK: user_id
  SK: session_id
  Attrs: created_at, updated_at, last_message
```

Benefits:
- Fast Query by user_id
- Atomic Put/Delete
- Single source of truth across devices
- Optional TTL for auto-cleanup

**Next step:** Replace S3 session-index with DynamoDB table.

---

### Files Modified This Session

**Session switching:**
- `frontend/src/context/ChatContext.tsx` - AbortController, optimistic delete
- `frontend/src/services/api.ts` - Accept AbortSignal in fetchSessionHistory
- `frontend/src/components/layout/Sidebar.tsx` - Await delete handler

**Backend delete:**
- `resources/history-handler/index.py` - Delete metadata prefix, fix sort field

**Testing:**
- `TESTING.md` - Comprehensive test checklist
- `smoke-test.sh` - Automated pre-deploy checks


---

## Session: 2026-03-13

### Issue 37: DynamoDB Session Index Implementation

**What:** Replaced S3 `session-index/{user_id}/` with DynamoDB table for fast user→session lookups.

**Architecture:**
- `ISessionIndex` interface (strategy pattern) in InteractiveAgent construct
- `DynamoDBSessionIndex` default implementation (PK: user_id, SK: session_id)
- Optional TTL support with DynamoDB Streams for coordinated S3 cleanup

**Key Files:**
- `use-cases/framework/agents/interactive-agent.ts` - ISessionIndex, DynamoDBSessionIndex
- `interactive-agent-handler/index.py` - update_session_index() on chat
- `history-handler/index.py` - query DynamoDB for list, delete from both

---

### Issue 38: localStorage Cache Merge Bug (CRITICAL)

**Problem:** After deleting session, refreshing page showed wrong sessions or "resurrected" deleted ones.

**Root Cause:** `fetchSessions()` MERGED backend data into localStorage instead of REPLACING it:
```typescript
// BUGGY - upserts, never removes deleted sessions
backendSessions.forEach(s => {
  sessionStorage.updateSession(userId, s.sessionId, s.lastMessage);
});
```

**Fix:** Replace entire cache with backend data:
```typescript
// FIXED - replaces, deleted sessions gone
sessionStorage.saveSessions(userId, backendSessions);
```

**Lesson:** When backend is source of truth, **replace** local cache entirely on sync - never merge.

---

### Issue 39: Tool-Triggered Loading Spinners

**Problem:** "Preparing schema/dataset" spinners showed during entire stream, not just when tools were actually running.

**Solution:** Emit `tool_start`/`tool_end` SSE events from tools:
- `generate_script.py` emits `tool_start` at beginning
- `execute_script.py` emits `tool_end` after schema/preview
- Frontend `isPreparingData` state triggered by these events

---

### Parallel Debug Agents Pattern

Used 5 parallel agents to debug session issues:
1. history-handler DynamoDB logic
2. interactive-agent-handler session writes
3. Frontend ChatContext state management
4. CDK stack env vars/IAM
5. API service layer parsing

All 5 converged on same root cause (localStorage merge bug) - validates the approach.

---

## Session: 2026-03-26

### Issue 40: Session Rename Feature - API Gateway PATCH Method Missing

**Problem:** Implemented session rename with PATCH endpoint in backend Lambda, but frontend got "Failed to rename session" error.

**Root Cause:** Adding the `rename_session()` function to `history-handler/index.py` is not enough. The API Gateway route for PATCH must also be configured in CDK.

**Symptom:** Backend code was correct, but requests never reached Lambda - API Gateway returned 403/404.

**Fix:** Add PATCH method to CDK stack:
```typescript
// synthetic-dataset-generator-stack.ts
sessionIdForDeleteResource.addMethod('PATCH', historyIntegration, {
  authorizationType: AuthorizationType.COGNITO,
  authorizer: this.chatAgent.cognitoAuthorizer,
});
```

**Lesson:** When adding new HTTP endpoints, remember the full stack:
1. Lambda handler code (routing + function)
2. API Gateway method (CDK `addMethod()`)
3. CORS configuration (see Issue 41)

---

### Issue 41: CORS Preflight Missing PATCH Method (CRITICAL)

**Problem:** After adding PATCH method to API Gateway, rename still failed silently in browser.

**Root Cause:** CORS preflight (OPTIONS) response only included `DELETE,OPTIONS` in `Access-Control-Allow-Methods`. Browser blocked PATCH before it reached Lambda.

**How CORS Preflight Works:**
```
1. Browser: OPTIONS /sessions/123
            "Can I use PATCH from this origin?"

2. API:     Access-Control-Allow-Methods: DELETE,OPTIONS
            "Only DELETE and OPTIONS allowed"

3. Browser: Blocks PATCH request (never sent!)
```

**Two Fixes Required:**

1. **CDK `corsAllowMethods` prop:**
```typescript
this.chatAgent = new InteractiveAgent(this, 'ChatAgent', {
  corsAllowMethods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'], // Add PATCH
});
```

2. **Existing OPTIONS mock response** (if resource already deployed):
```bash
# CDK "no changes" because OPTIONS mock was already created without PATCH
# Must update via CLI:
aws apigateway update-integration-response \
  --rest-api-id xxx --resource-id yyy --http-method OPTIONS --status-code 204 \
  --patch-operations "op=replace,path=/responseParameters/method.response.header.Access-Control-Allow-Methods,value=\"'DELETE,PATCH,OPTIONS'\""

# Then deploy:
aws apigateway create-deployment --rest-api-id xxx --stage-name prod

# Flush cache if needed:
aws apigateway flush-stage-cache --rest-api-id xxx --stage-name prod
```

**Lesson:** When adding new HTTP methods to existing API Gateway resources:
- The OPTIONS mock integration response is created once and not updated by CDK
- Must manually update or recreate the resource to include new methods in CORS

---

### Issue 42: localStorage Cache Not Reading All Fields

**Problem:** Session rename worked (saved to DynamoDB), but switching sessions reverted the name in sidebar.

**Root Cause:** `sessionStorage.getSessions()` read from localStorage but didn't include `name` field:
```typescript
// BUGGY - name field missing
.map((s: Record<string, unknown>) => ({
  sessionId: s.sessionId as string,
  createdAt: s.createdAt ? new Date(s.createdAt as string) : new Date(),
  lastMessage: s.lastMessage as string | undefined,
  // name: MISSING!
}));
```

When `switchSession()` called `setSessions(sessionStorage.getSessions(userId))`, it overwrote state with sessions missing the `name` field.

**Fix:** Include all fields when deserializing from cache:
```typescript
.map((s: Record<string, unknown>) => ({
  sessionId: s.sessionId as string,
  createdAt: s.createdAt ? new Date(s.createdAt as string) : new Date(),
  lastMessage: s.lastMessage as string | undefined,
  name: s.name as string | undefined, // ADD THIS
}));
```

**Lesson:** When adding new fields to a data model:
1. Backend API returns the field ✓
2. Frontend API parses the field ✓
3. Frontend state includes the field ✓
4. **localStorage serialization includes the field** ✓
5. **localStorage deserialization includes the field** ← Easy to miss!

---

### Issue 43: Export State Not Restored on Session Switch

**Problem:** Switching to a session that had already exported showed greyed-out export button.

**Root Cause:** `history-handler/index.py` `get_history()` wasn't returning the `downloads` field from session metadata.

**Fix:**
```python
# In get_history()
if 'downloads' in metadata:
    result['downloads'] = metadata['downloads']
```

---

### Issue 44: Export Spinner Not Showing

**Problem:** Export operation had no loading indicator - UI appeared frozen.

**Root Cause:** `export_dataset.py` didn't emit `tool_start`/`tool_end` SSE events.

**Fix:**
```python
# export_dataset.py
emit_sse_event('tool_start', {'tool': 'export_dataset'})
# ... do export ...
emit_sse_event('tool_end', {'tool': 'export_dataset'})
```

Frontend handles via `onToolStart`:
```typescript
if (tool === 'export_dataset') {
  dispatch({ type: 'START_EXPORTING' });
}
```

---

### Debugging Pattern: Parallel Agents

For complex bugs spanning multiple layers, launch parallel agents to investigate simultaneously:

```
Agent 1: Backend Lambda code
Agent 2: Frontend API service
Agent 3: API Gateway / CloudWatch logs
Agent 4: CORS configuration
Agent 5: State management / caching
```

All agents report findings → triangulate to root cause. Faster than sequential debugging and validates conclusions when multiple agents converge on same issue.
