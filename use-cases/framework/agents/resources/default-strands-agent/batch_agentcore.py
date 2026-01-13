"""
AgentCore entrypoint for batch agent processing.

This module provides the AgentCore runtime entrypoint that processes batch agent requests.
It uses the Strands SDK @app.entrypoint decorator and shared agent logic that is compatible
with both Lambda and AgentCore runtimes.

The entrypoint is instrumented with OpenTelemetry (ADOT) for observability when executed
with: opentelemetry-instrument python batch_agentcore.py
"""

import os
from typing import Dict, Any
from strands import app
from shared_agent_logic import process_batch_request, initialize_agent_configuration

# Initialize agent configuration at startup
tools_config, agent_tools, system_prompt = initialize_agent_configuration()


@app.entrypoint
def batch_agent(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    AgentCore entrypoint for batch agent processing.
    
    This function is invoked by AgentCore Runtime when the agent receives a request.
    It processes the request using shared agent logic and returns the result.
    
    The @app.entrypoint decorator from Strands SDK handles:
    - HTTP request/response conversion
    - Session management
    - Error handling
    - Automatic OpenTelemetry instrumentation (when using opentelemetry-instrument)
    
    Args:
        event: Event data containing document and processing information
               Expected format:
               {
                   "contentType": "file" | "data",
                   "content": {
                       "bucket": "...",  # for file type
                       "key": "...",     # for file type
                       "location": "s3", # for file type
                       "data": "..."     # for data type
                   },
                   "classificationResult": {  # optional
                       "documentClassification": "..."
                   }
               }
        
    Returns:
        Dictionary with 'result' key containing processed output
        Format: {"result": <string or JSON object>}
    """
    # Get configuration from environment
    model_id = os.getenv("MODEL_ID")
    prompt = os.getenv("PROMPT")
    expect_json = bool(os.getenv("EXPECT_JSON", ""))
    
    # Process the request using shared logic
    result = process_batch_request(
        event=event,
        model_id=model_id,
        base_prompt=prompt,
        expect_json=expect_json,
        agent_tools=agent_tools,
        system_prompt=system_prompt
    )
    
    return result


# For AgentCore Runtime with DIRECT_CODE deployment, the entrypoint is automatically
# discovered by the Strands SDK. No additional server setup is required.
#
# For AgentCore Runtime with CONTAINER deployment, you may need to add:
# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=8080)
