#!/bin/bash
# Smoke test script for Synthetic Dataset Generator
# Run after every deployment to catch regressions

# Don't exit on error - we want to run all tests

API_URL="https://h0u2svvs7f.execute-api.us-east-1.amazonaws.com/prod"
FRONTEND_URL="https://d28m3jkath3pa1.cloudfront.net"
AWS_PROFILE="appmod-blueprints"
SESSION_BUCKET="syntheticdatasetgenerator-chatagentsessionmanagerb-hvtcakzpe2fn"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo " Synthetic Dataset Generator Smoke Test"
echo "========================================"
echo ""

PASS=0
FAIL=0
MANUAL=0

# Test function
test_result() {
    if [ "$1" == "pass" ]; then
        echo -e "${GREEN}PASS${NC}"
        ((PASS++))
    elif [ "$1" == "fail" ]; then
        echo -e "${RED}FAIL${NC} - $2"
        ((FAIL++))
    else
        echo -e "${YELLOW}MANUAL${NC} - $2"
        ((MANUAL++))
    fi
}

# Test 1: Frontend accessible
echo -n "1. Frontend accessible................. "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
    test_result "pass"
else
    test_result "fail" "HTTP $HTTP_CODE"
fi

# Test 2: API base URL accessible
echo -n "2. API base URL accessible............. "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "403" ]; then
    test_result "pass"
else
    test_result "fail" "HTTP $HTTP_CODE (expected 200/401/403)"
fi

# Test 3: Lambda function exists and check last modified
echo -n "3. Lambda function deployed............ "
LAMBDA_INFO=$(aws lambda list-functions \
    --query "Functions[?contains(FunctionName, 'syntheticdatasetgenerator') && contains(FunctionName, 'chatagent')].{Name: FunctionName, Modified: LastModified}" \
    --output json \
    --profile "$AWS_PROFILE" 2>/dev/null)

if [ -n "$LAMBDA_INFO" ] && [ "$LAMBDA_INFO" != "[]" ]; then
    LAST_MODIFIED=$(echo "$LAMBDA_INFO" | jq -r '.[0].Modified' 2>/dev/null)
    test_result "pass"
    echo "   Last modified: $LAST_MODIFIED"
else
    test_result "fail" "Lambda not found"
fi

# Test 4: Session bucket exists
echo -n "4. Session bucket accessible........... "
if aws s3 ls "s3://$SESSION_BUCKET" --profile "$AWS_PROFILE" &>/dev/null; then
    test_result "pass"
else
    test_result "fail" "Bucket not accessible"
fi

# Test 5: Check lib/ vs use-cases/ sync
echo -n "5. Python handler synced (lib/)........ "
HANDLER_USE_CASES="use-cases/framework/agents/resources/interactive-agent-handler/index.py"
HANDLER_LIB="lib/framework/agents/resources/interactive-agent-handler/index.py"

# Go to repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$REPO_ROOT/$HANDLER_USE_CASES" ] && [ -f "$REPO_ROOT/$HANDLER_LIB" ]; then
    if diff -q "$REPO_ROOT/$HANDLER_USE_CASES" "$REPO_ROOT/$HANDLER_LIB" &>/dev/null; then
        test_result "pass"
    else
        test_result "fail" "Files differ! Run: cp use-cases/.../index.py lib/.../index.py"
    fi
else
    test_result "fail" "Handler files not found"
fi

# Test 6: Frontend build exists
echo -n "6. Frontend build exists............... "
if [ -d "$SCRIPT_DIR/frontend/build" ] && [ -f "$SCRIPT_DIR/frontend/build/index.html" ]; then
    test_result "pass"
else
    test_result "fail" "Run: cd frontend && npm run build"
fi

# Test 7: Check CloudFront distribution
echo -n "7. CloudFront distribution active...... "
CF_STATUS=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?contains(DomainName, 'd28m3jkath3pa1')].Status" \
    --output text \
    --profile "$AWS_PROFILE" 2>/dev/null)

if [ "$CF_STATUS" == "Deployed" ]; then
    test_result "pass"
else
    test_result "manual" "Status: $CF_STATUS"
fi

echo ""
echo "========================================"
echo " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$MANUAL manual${NC}"
echo "========================================"

if [ $FAIL -gt 0 ]; then
    echo ""
    echo -e "${RED}Some tests failed! Review above and fix before testing manually.${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo " Manual Testing Required"
echo "========================================"
echo ""
echo "Open: $FRONTEND_URL"
echo ""
echo "Run through these scenarios:"
echo ""
echo "A. FRESH SESSION"
echo "   1. Click 'New Chat'"
echo "   2. Type: 'Create a customer dataset with name, email, age, country, signup_date'"
echo "   3. Verify: Schema panel shows spinner then table"
echo "   4. Verify: Preview panel shows spinner then data"
echo "   5. Verify: Chat shows inline progress indicator"
echo ""
echo "B. EXPORT"
echo "   1. Click 'Export' button"
echo "   2. Verify: Export progress spinner in chat"
echo "   3. Verify: Download buttons appear (CSV, JSON, Schema, Script)"
echo "   4. Click CSV - verify download works"
echo ""
echo "C. SESSION PERSISTENCE (CRITICAL!)"
echo "   1. Note current session in sidebar"
echo "   2. Click 'New Chat'"
echo "   3. Click back on original session"
echo "   4. Verify: Messages restored"
echo "   5. Verify: Schema table restored"
echo "   6. Verify: Preview table restored"
echo "   7. Verify: Download buttons active (not greyed)"
echo ""
echo "D. REFRESH PERSISTENCE"
echo "   1. Press F5 to refresh browser"
echo "   2. Click on session in sidebar"
echo "   3. Verify: All state restored"
echo ""
