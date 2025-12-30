"""
Lambda handler for batch agent processing.

This module provides the Lambda function handler that processes batch agent requests.
It uses shared agent logic that is compatible with both Lambda and AgentCore runtimes.
"""

import os
from aws_lambda_powertools import Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from shared_agent_logic import process_batch_request, initialize_agent_configuration

# Initialize metrics and tracing
metrics = Metrics()
tracer = Tracer()

# Initialize agent configuration at cold start
tools_config, agent_tools, system_prompt = initialize_agent_configuration()


@metrics.log_metrics
@tracer.capture_lambda_handler
def handler(event, context):
    """
    Lambda handler for batch agent processing.
    
    Args:
        event: Lambda event containing document and processing information
        context: Lambda context object
        
    Returns:
        Dictionary with 'result' key containing processed output
    """
    # Get configuration from environment
    model_id = os.getenv("MODEL_ID")
    prompt = os.getenv("PROMPT")
    expect_json = bool(os.getenv("EXPECT_JSON", ""))
    invoke_type = os.environ["INVOKE_TYPE"]
    
    # Add observability annotations
    tracer.put_annotation(key="invoke_type", value=invoke_type)
    metrics.add_dimension(name="invoke_type", value=invoke_type)
    
    # Process the request using shared logic
    result = process_batch_request(
        event=event,
        model_id=model_id,
        base_prompt=prompt,
        expect_json=expect_json,
        agent_tools=agent_tools,
        system_prompt=system_prompt
    )
    
    # Record success metric
    metrics.add_metric(name="SuccessfulAgentInvocation", unit=MetricUnit.Count, value=1)
    
    return result