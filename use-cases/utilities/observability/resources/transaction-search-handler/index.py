# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
import boto3
from typing import Dict, Any

logs_client = boto3.client('logs')
xray_client = boto3.client('xray')


def on_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Custom resource handler for CloudWatch Transaction Search configuration
    
    Handles CREATE, UPDATE, and DELETE events to configure Transaction Search.
    """
    request_type = event['RequestType']
    props = event['ResourceProperties']
    
    sampling_percentage = float(props['SamplingPercentage'])
    policy_name = props['PolicyName']
    region = props['Region']
    account = props['Account']
    
    print(f"Request type: {request_type}")
    print(f"Sampling percentage: {sampling_percentage}")
    print(f"Policy name: {policy_name}")
    
    if request_type == 'Create' or request_type == 'Update':
        return configure_transaction_search(
            sampling_percentage, 
            policy_name, 
            region, 
            account
        )
    elif request_type == 'Delete':
        return cleanup_transaction_search(policy_name)
    
    return {'PhysicalResourceId': 'transaction-search-config'}


def configure_transaction_search(
    sampling_percentage: float,
    policy_name: str,
    region: str,
    account: str
) -> Dict[str, Any]:
    """
    Configure CloudWatch Transaction Search
    
    Steps:
    1. Create CloudWatch Logs resource policy (if not exists)
    2. Configure X-Ray to send traces to CloudWatch Logs
    3. Set sampling percentage for span indexing
    """
    
    # Step 1: Create CloudWatch Logs resource policy
    print("Step 1: Configuring CloudWatch Logs resource policy...")
    policy_document = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "TransactionSearchXRayAccess",
            "Effect": "Allow",
            "Principal": {"Service": "xray.amazonaws.com"},
            "Action": "logs:PutLogEvents",
            "Resource": [
                f"arn:aws:logs:{region}:{account}:log-group:aws/spans:*",
                f"arn:aws:logs:{region}:{account}:log-group:/aws/application-signals/data:*"
            ],
            "Condition": {
                "ArnLike": {
                    "aws:SourceArn": f"arn:aws:xray:{region}:{account}:*"
                },
                "StringEquals": {
                    "aws:SourceAccount": account
                }
            }
        }]
    }
    
    try:
        # Check if policy already exists
        existing_policies = logs_client.describe_resource_policies()
        policy_exists = any(
            p['policyName'] == policy_name 
            for p in existing_policies.get('resourcePolicies', [])
        )
        
        if policy_exists:
            print(f"Policy '{policy_name}' already exists, updating...")
        else:
            print(f"Creating new policy '{policy_name}'...")
        
        logs_client.put_resource_policy(
            policyName=policy_name,
            policyDocument=json.dumps(policy_document)
        )
        print("✓ CloudWatch Logs resource policy configured")
    except Exception as e:
        print(f"Error configuring CloudWatch Logs policy: {e}")
        raise
    
    # Step 2: Configure X-Ray trace segment destination
    print("Step 2: Configuring X-Ray trace segment destination...")
    try:
        # Check current destination
        current_destination = xray_client.get_trace_segment_destination()
        current_dest = current_destination.get('Destination', 'XRay')
        current_status = current_destination.get('Status', 'PENDING')
        
        print(f"Current destination: {current_dest}, Status: {current_status}")
        
        if current_dest != 'CloudWatchLogs':
            print("Updating trace segment destination to CloudWatchLogs...")
            xray_client.update_trace_segment_destination(
                Destination='CloudWatchLogs'
            )
            print("✓ X-Ray trace segment destination updated")
        else:
            print("✓ X-Ray already configured to send to CloudWatchLogs")
    except Exception as e:
        print(f"Error configuring X-Ray destination: {e}")
        raise
    
    # Step 3: Configure sampling percentage
    print(f"Step 3: Configuring sampling percentage to {sampling_percentage}%...")
    try:
        # Get current indexing rules
        indexing_rules = xray_client.get_indexing_rules()
        print(f"Current indexing rules: {indexing_rules}")
        
        # Update the Default rule
        xray_client.update_indexing_rule(
            Name='Default',
            Rule={
                'Probabilistic': {
                    'DesiredSamplingPercentage': sampling_percentage
                }
            }
        )
        print(f"✓ Sampling percentage set to {sampling_percentage}%")
    except Exception as e:
        print(f"Error configuring sampling percentage: {e}")
        raise
    
    # Verify configuration
    print("Step 4: Verifying configuration...")
    try:
        destination_status = xray_client.get_trace_segment_destination()
        print(f"Final status: {destination_status}")
        
        if destination_status.get('Destination') == 'CloudWatchLogs':
            print("✓ Transaction Search successfully configured!")
        else:
            print("⚠ Transaction Search configuration may still be pending")
    except Exception as e:
        print(f"Error verifying configuration: {e}")
    
    return {
        'PhysicalResourceId': 'transaction-search-config',
        'Data': {
            'Destination': 'CloudWatchLogs',
            'SamplingPercentage': sampling_percentage,
            'PolicyName': policy_name
        }
    }


def cleanup_transaction_search(policy_name: str) -> Dict[str, Any]:
    """
    Cleanup Transaction Search configuration on stack deletion
    
    Note: This does NOT disable Transaction Search completely, as that would
    affect other stacks. It only removes the CloudWatch Logs resource policy.
    X-Ray destination and sampling rules are left as-is.
    """
    print(f"Cleanup: Removing CloudWatch Logs resource policy '{policy_name}'...")
    
    try:
        logs_client.delete_resource_policy(policyName=policy_name)
        print(f"✓ Policy '{policy_name}' removed")
    except logs_client.exceptions.ResourceNotFoundException:
        print(f"Policy '{policy_name}' not found, nothing to clean up")
    except Exception as e:
        print(f"Error removing policy: {e}")
        # Don't fail deletion if cleanup fails
    
    print("Note: X-Ray destination and sampling rules are preserved")
    print("To fully disable Transaction Search, run:")
    print("  aws xray update-trace-segment-destination --destination XRay")
    
    return {'PhysicalResourceId': 'transaction-search-config'}
