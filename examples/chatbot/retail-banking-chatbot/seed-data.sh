#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

# Get table name from outputs.json
TABLE_NAME=$(node -e "const d=require('./outputs.json');const k=Object.keys(d)[0];const v=Object.entries(d[k]).find(([k])=>k.includes('TransactionsTable'));console.log(v[1])" 2>/dev/null)

if [ -z "$TABLE_NAME" ]; then
  echo "Error: Could not find TransactionsTable in outputs.json"
  echo "Deploy first: cd infrastructure && npx cdk deploy --outputs-file ../outputs.json"
  exit 1
fi

# Create venv if needed
if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment..."
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install -q boto3
fi

echo "Seeding transactions into $TABLE_NAME..."

"$VENV_DIR/bin/python" -c "
import json, boto3
from decimal import Decimal
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('$TABLE_NAME')
with open('$SCRIPT_DIR/sample-data/transactions.json') as f:
    items = json.loads(f.read(), parse_float=Decimal)
with table.batch_writer() as batch:
    for item in items:
        batch.put_item(Item=item)
print(f'Seeded {len(items)} transactions')
"

echo "Done!"
