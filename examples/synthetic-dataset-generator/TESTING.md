# Synthetic Dataset Generator - Testing Guide

## Quick Smoke Test (Before Every Deploy)

Run through this checklist after every deployment to catch regressions early.

### Prerequisites
- Frontend URL: https://d28m3jkath3pa1.cloudfront.net
- Sign in with Cognito credentials

---

## Test Checklist

### 1. Fresh Session Flow

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1.1 | Click "New Chat" | New session created, chat cleared | |
| 1.2 | Type "Create a customer dataset with 5 columns" | AI asks clarifying questions OR generates schema | |
| 1.3 | Answer questions until generation starts | Schema panel shows spinner "Preparing schema..." | |
| 1.4 | Wait for schema to appear | Schema table renders with columns | |
| 1.5 | Check preview panel during generation | Shows spinner "Generating preview data..." | |
| 1.6 | Wait for preview to appear | Preview table renders with sample rows | |
| 1.7 | Check chat panel | Inline PreviewProgress shows checkmark "Preview ready" | |

### 2. Export Flow

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 2.1 | Click "Export" button | ExportProgress spinner appears in chat | |
| 2.2 | Wait for export to complete | Download buttons appear (CSV, JSON, Schema, Script) | |
| 2.3 | Click CSV download | File downloads successfully | |
| 2.4 | Click JSON download | File downloads successfully | |

### 3. Session Persistence (Critical!)

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 3.1 | Note current session ID from sidebar | Record session ID: _______ | |
| 3.2 | Click "New Chat" | New empty session created | |
| 3.3 | Click back on original session | Session loads from sidebar | |
| 3.4 | Check messages | All messages restored | |
| 3.5 | Check schema panel | Schema table restored (not empty) | |
| 3.6 | Check preview panel | Preview table restored (not empty) | |
| 3.7 | Check download buttons | All download buttons active (not greyed) | |
| 3.8 | Click a download button | File downloads (presigned URL still valid) | |

### 4. Browser Refresh Persistence

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 4.1 | With data visible, refresh browser (F5) | Page reloads | |
| 4.2 | Click on the session in sidebar | Session loads | |
| 4.3 | Check all state restored | Messages, schema, preview, downloads all present | |

### 5. Error Handling

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 5.1 | Send empty message | Should be prevented or show error | |
| 5.2 | Rapidly switch sessions | No crashes, state loads correctly | |
| 5.3 | Delete a session | Session removed, UI updates | |

---

## Common Failure Modes & Root Causes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Spinner never shows | React state batching - check conditions | Verify `isStreaming && length === 0` |
| Schema/preview empty after switch | Session metadata not saved to S3 | Check `execute_script.py` saves to S3 |
| Downloads greyed after switch | Downloads not in `/history` response | Check `index.py` returns downloads |
| Stale Lambda code deployed | lib/ not synced from use-cases/ | Run sync command below |
| Presigned URLs expired | URLs only valid 24h | Re-export or implement URL regeneration |

---

## Deployment Checklist

Before deploying, always:

```bash
# 1. Sync Python handlers (CRITICAL!)
cp use-cases/framework/agents/resources/interactive-agent-handler/index.py \
   lib/framework/agents/resources/interactive-agent-handler/index.py

# 2. Verify sync
diff use-cases/framework/agents/resources/interactive-agent-handler/index.py \
     lib/framework/agents/resources/interactive-agent-handler/index.py
# Should show no differences

# 3. Build frontend
cd examples/synthetic-dataset-generator/frontend
npm run build
cd ..

# 4. Deploy
npx cdk deploy --profile appmod-blueprints --require-approval never
```

---

## Automated Smoke Test Script

Save time by running this after deploy:

```bash
#!/bin/bash
# smoke-test.sh - Run after deployment

API_URL="https://h0u2svvs7f.execute-api.us-east-1.amazonaws.com/prod"
FRONTEND_URL="https://d28m3jkath3pa1.cloudfront.net"

echo "=== Synthetic Dataset Generator Smoke Test ==="
echo ""

# Test 1: Frontend accessible
echo -n "1. Frontend accessible... "
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
    echo "PASS"
else
    echo "FAIL"
fi

# Test 2: API health (sessions endpoint)
echo -n "2. API /sessions endpoint... "
# Note: Requires auth token - manual test needed
echo "MANUAL (requires auth)"

# Test 3: Check Lambda was updated recently
echo -n "3. Lambda last modified... "
LAST_MODIFIED=$(aws lambda get-function \
    --function-name SyntheticDatasetGeneratorStack-ChatAgentInteractiveAgen-* \
    --query 'Configuration.LastModified' \
    --output text \
    --profile appmod-blueprints 2>/dev/null | head -1)
if [ -n "$LAST_MODIFIED" ]; then
    echo "$LAST_MODIFIED"
else
    echo "Could not determine (check manually)"
fi

echo ""
echo "=== Manual Tests Required ==="
echo "1. Open $FRONTEND_URL"
echo "2. Sign in and run through test checklist above"
echo "3. Especially test: session switch restores schema, preview, AND downloads"
```

---

## Debug Commands

When something fails, use these to investigate:

```bash
# Check Lambda logs
aws logs tail /aws/lambda/SyntheticDatasetGeneratorStack-ChatAgentInteractiveAgen \
    --follow --profile appmod-blueprints

# Check S3 session metadata
aws s3 ls s3://syntheticdatasetgenerator-chatagentsessionmanagerb-hvtcakzpe2fn/session-metadata/ \
    --recursive --profile appmod-blueprints

# View specific session metadata
aws s3 cp s3://syntheticdatasetgenerator-chatagentsessionmanagerb-hvtcakzpe2fn/session-metadata/{SESSION_ID}/latest_result.json - \
    --profile appmod-blueprints | jq .

# Check if downloads are in metadata
aws s3 cp s3://syntheticdatasetgenerator-chatagentsessionmanagerb-hvtcakzpe2fn/session-metadata/{SESSION_ID}/latest_result.json - \
    --profile appmod-blueprints | jq '.downloads'
```

---

## Architecture Reference

```
User Action          Frontend State       Backend Storage
-----------          --------------       ---------------
Send message    -->  isStreaming=true

Schema arrives  -->  schema=[...]    -->  S3: session-metadata/{id}/latest_result.json
                                          (saved by execute_script.py)

Preview arrives -->  preview=[...]   -->  S3: session-metadata/{id}/latest_result.json
                                          (saved by execute_script.py)

Export clicked  -->  isExporting=true

Downloads ready -->  downloads={...} -->  S3: session-metadata/{id}/latest_result.json
                                          (saved by export_dataset.py)

Switch session  -->  LOAD_SESSION    <--  GET /history/{id}
                     (restores all)       (returns messages, schema, preview, downloads)
```

Key insight: Everything must be saved to S3 AND returned by `/history` endpoint for persistence to work.
