"""Transaction lookup tool for the retail banking chatbot agent."""

import json
import os
from typing import Any, Dict, Optional

import boto3
from strands import tool

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TRANSACTIONS_TABLE_NAME', '')


@tool
def lookup_transactions(
    customer_id: str,
    limit: Optional[int] = 10,
) -> Dict[str, Any]:
    """
    Look up transaction history for a customer from DynamoDB.

    Use this tool when a customer asks about their recent transactions,
    account activity, or spending history.

    Args:
        customer_id: The customer's unique identifier (e.g. "CUST-001").
        limit: Maximum number of transactions to return. Defaults to 10.

    Returns:
        Dictionary with success status and transaction records.
    """
    if not TABLE_NAME:
        return {'success': False, 'error': 'Transaction table not configured'}

    try:
        table = dynamodb.Table(TABLE_NAME)
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('customerId').eq(customer_id),
            ScanIndexForward=False,
            Limit=limit,
        )

        items = response.get('Items', [])
        # Convert Decimal to float for JSON serialization
        for item in items:
            for k, v in item.items():
                if hasattr(v, 'as_integer_ratio'):
                    item[k] = float(v)

        return {
            'success': True,
            'customerId': customer_id,
            'transactionCount': len(items),
            'transactions': items,
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'errorType': type(e).__name__,
        }
