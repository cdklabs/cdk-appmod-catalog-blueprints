#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

# Parse outputs.json for stack values
OUTPUTS_FILE="$SCRIPT_DIR/outputs.json"
if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "Error: outputs.json not found. Deploy first:"
  echo "  cd infrastructure && npx cdk deploy --outputs-file ../outputs.json"
  exit 1
fi

TABLE_NAME=$(node -e "const d=require('$OUTPUTS_FILE');const k=Object.keys(d)[0];const v=Object.entries(d[k]).find(([k])=>k.includes('TransactionsTable'));console.log(v[1])" 2>/dev/null)
USER_POOL_ID=$(node -e "const d=require('$OUTPUTS_FILE');const k=Object.keys(d)[0];const v=Object.entries(d[k]).find(([k])=>k.includes('UserPoolId'));console.log(v[1])" 2>/dev/null)
REGION=$(node -e "const d=require('$OUTPUTS_FILE');const k=Object.keys(d)[0];const v=Object.entries(d[k]).find(([k])=>k==='Region');console.log(v[1])" 2>/dev/null)

if [ -z "$TABLE_NAME" ] || [ -z "$USER_POOL_ID" ] || [ -z "$REGION" ]; then
  echo "Error: Could not read required outputs (TransactionsTable, UserPoolId, Region)"
  exit 1
fi

# Configurable user credentials
USERNAME="${1:-testuser}"
PASSWORD="${2:-Test123!!}"

echo "=== Retail Banking Chatbot - Data Seed ==="
echo "Region:     $REGION"
echo "Table:      $TABLE_NAME"
echo "User Pool:  $USER_POOL_ID"
echo "Username:   $USERNAME"
echo ""

# Create venv if needed
if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment..."
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install -q boto3
fi

"$VENV_DIR/bin/python" <<PYEOF
import json, sys
from decimal import Decimal
import boto3

region = '$REGION'
user_pool_id = '$USER_POOL_ID'
table_name = '$TABLE_NAME'
username = '$USERNAME'
password = '$PASSWORD'

cognito = boto3.client('cognito-idp', region_name=region)
dynamodb = boto3.resource('dynamodb', region_name=region)

# ---- Step 1: Create or retrieve Cognito user ----
print(f'[1/3] Setting up Cognito user: {username}')

try:
    cognito.admin_create_user(
        UserPoolId=user_pool_id,
        Username=username,
        TemporaryPassword=password,
        MessageAction='SUPPRESS',
    )
    # Set permanent password so user is CONFIRMED
    cognito.admin_set_user_password(
        UserPoolId=user_pool_id,
        Username=username,
        Password=password,
        Permanent=True,
    )
    print(f'  Created user: {username}')
except cognito.exceptions.UsernameExistsException:
    print(f'  User already exists: {username}')

# ---- Step 2: Get the user's sub (unique ID) ----
print(f'[2/3] Retrieving user sub...')

user_resp = cognito.admin_get_user(
    UserPoolId=user_pool_id,
    Username=username,
)
user_sub = None
for attr in user_resp['UserAttributes']:
    if attr['Name'] == 'sub':
        user_sub = attr['Value']
        break

if not user_sub:
    print('  Error: Could not retrieve user sub')
    sys.exit(1)

print(f'  User sub: {user_sub}')

# ---- Step 3: Seed transactions linked to the Cognito user ----
print(f'[3/3] Seeding transactions for {username} (sub={user_sub})...')

with open('$SCRIPT_DIR/sample-data/transactions.json') as f:
    items = json.loads(f.read(), parse_float=Decimal)

# Replace CUST-001 with the actual Cognito user sub.
# CUST-002 and CUST-003 remain unchanged (simulates other customers' data
# that this user cannot access).
table = dynamodb.Table(table_name)
seeded = 0
with table.batch_writer() as batch:
    for item in items:
        if item['customerId'] == 'CUST-001':
            item['customerId'] = user_sub
        batch.put_item(Item=item)
        seeded += 1

print(f'  Seeded {seeded} transactions ({username} mapped to sub {user_sub})')
print()
print('Done! Login with:')
print(f'  Username: {username}')
print(f'  Password: {password}')
PYEOF
