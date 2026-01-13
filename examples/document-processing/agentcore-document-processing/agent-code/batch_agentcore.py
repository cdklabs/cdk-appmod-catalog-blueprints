"""
AgentCore Runtime Entry Point

This module provides the AgentCore entrypoint for batch agent processing.
Uses the Strands SDK @app.entrypoint decorator.
"""

import json
from shared_agent_logic import AgentProcessor

# Note: Strands SDK is a placeholder for AgentCore SDK
# Actual implementation will use the official AgentCore SDK when available
try:
    from strands import app
except ImportError:
    # Fallback for development/testing
    class MockApp:
        def entrypoint(self, func):
            return func
    app = MockApp()

# Initialize processor (reused across invocations)
processor = AgentProcessor()


@app.entrypoint
def process_batch_request(event: dict) -> dict:
    """
    AgentCore entrypoint for batch agent processing.
    
    Args:
        event: AgentCore event containing request data
        
    Returns:
        Processing result
    """
    print(f"Processing batch request (AgentCore): {json.dumps(event)}")
    
    try:
        # Process request using shared logic
        result = processor.process_request(event)
        
        print(f"Processing complete: {json.dumps(result)}")
        return result
        
    except Exception as e:
        print(f"Error in AgentCore handler: {e}")
        return {
            'success': False,
            'error': str(e),
            'message': f'AgentCore handler error: {str(e)}'
        }


# For direct invocation (testing)
if __name__ == '__main__':
    test_event = {
        'contentType': 'data',
        'content': {
            'data': 'Test document content for analysis'
        }
    }
    result = process_batch_request(test_event)
    print(json.dumps(result, indent=2))
