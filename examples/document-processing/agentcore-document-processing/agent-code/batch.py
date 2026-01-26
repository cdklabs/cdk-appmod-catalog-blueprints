"""
Lambda Runtime Entry Point

This module provides the Lambda handler for batch agent processing.
"""

import json
from shared_agent_logic import AgentProcessor

# Initialize processor (reused across invocations)
processor = AgentProcessor()


def handler(event, context):
    """
    Lambda handler for batch agent processing.
    
    Args:
        event: Lambda event containing request data
        context: Lambda context object
        
    Returns:
        Processing result
    """
    print(f"Processing batch request: {json.dumps(event)}")
    
    try:
        # Process request using shared logic
        result = processor.process_request(event)
        
        print(f"Processing complete: {json.dumps(result)}")
        return result
        
    except Exception as e:
        print(f"Error in Lambda handler: {e}")
        return {
            'success': False,
            'error': str(e),
            'message': f'Lambda handler error: {str(e)}'
        }
