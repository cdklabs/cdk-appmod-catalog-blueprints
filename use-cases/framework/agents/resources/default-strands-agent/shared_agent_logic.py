"""
Shared agent logic for batch processing.

This module contains the core agent processing logic that is shared between
Lambda and AgentCore runtime implementations. It handles document processing,
tool loading, and agent invocation.
"""

import os
import json
import re
import boto3
from typing import Optional, Dict, Any, List
from strands import Agent
from strands_tools import file_read
from utils import download_and_load_system_prompt, download_tools, convert_tools_config_into_model

s3 = boto3.client('s3')


def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract JSON object from text body enclosed in ```json blocks or raw JSON.
    
    Args:
        text: Text containing JSON data
        
    Returns:
        Parsed JSON object or None if no valid JSON found
    """
    # First try to find JSON in ```json blocks
    match = re.search(r'```json\s*({.*?})\s*```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    
    # If no ```json blocks, look for raw JSON objects in the text
    json_match = re.search(r'({[^{}]*(?:{[^{}]*}[^{}]*)*})', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    
    return None


def download_attached_document(bucket: str, key: str) -> str:
    """
    Download a document from S3 to local temporary storage.
    
    Args:
        bucket: S3 bucket name
        key: S3 object key
        
    Returns:
        Local file path where document was downloaded
    """
    local_path = f"/tmp/{key.split('/')[-1]}"
    s3.download_file(bucket, key, local_path)
    return local_path


def build_prompt_with_context(
    base_prompt: str,
    event: Dict[str, Any],
    content_type: str
) -> str:
    """
    Build the complete prompt with document context and classification.
    
    Args:
        base_prompt: Base prompt template
        event: Event data containing document information
        content_type: Type of content ('file' or 'data')
        
    Returns:
        Complete prompt with context
    """
    prompt = base_prompt
    
    # Replace classification placeholder if present
    if 'classificationResult' in event:
        classification = event['classificationResult']['documentClassification']
        prompt = prompt.replace("[ACTUAL_CLASSIFICATION]", classification)
    
    # Add document context based on content type
    if content_type == 'file' and event['content']['location'] == 's3':
        local_path = download_attached_document(
            event['content']['bucket'],
            event['content']['key']
        )
        prompt += f" Attached document is located in {local_path}"
    elif content_type == 'data':
        prompt += f" Attached document content are as follows: {event['content']['data']}"
    
    return prompt


def process_batch_request(
    event: Dict[str, Any],
    model_id: str,
    base_prompt: Optional[str],
    expect_json: bool,
    agent_tools: List[str],
    system_prompt: str
) -> Dict[str, Any]:
    """
    Process a batch agent request with the given configuration.
    
    This is the core shared logic that works for both Lambda and AgentCore runtimes.
    It handles document processing, tool loading, agent invocation, and response formatting.
    
    Args:
        event: Event data containing document and processing information
        model_id: Bedrock model ID to use
        base_prompt: Base prompt template (None for default)
        expect_json: Whether to extract JSON from response
        agent_tools: List of tool file paths
        system_prompt: System prompt for the agent
        
    Returns:
        Dictionary with 'result' key containing processed output
    """
    content_type = event['contentType']
    
    # Use default prompt if none provided
    if base_prompt is None:
        base_prompt = "Analyze the attached document and verify the information using the provided tools."
    
    # Build complete prompt with context
    prompt = build_prompt_with_context(base_prompt, event, content_type)
    
    # Create and invoke agent
    agent = Agent(
        model=model_id,
        tools=agent_tools + [file_read],
        system_prompt=system_prompt
    )
    response = agent(prompt)
    
    # Extract response text
    response_text = response.message["content"][0]["text"]  # type: ignore
    
    # Format result based on expected output type
    result = extract_json_from_text(response_text) if expect_json else response_text
    
    return {"result": result}


def initialize_agent_configuration() -> tuple:
    """
    Initialize agent configuration from environment variables.
    
    This function loads tools and system prompt from S3 based on environment
    variables. It's called once at module initialization for Lambda (cold start)
    or at startup for AgentCore.
    
    Returns:
        Tuple of (tools_config, agent_tools, system_prompt)
    """
    # Load tools configuration
    tools_config = convert_tools_config_into_model(os.getenv('TOOLS_CONFIG', '{}'))
    agent_tools = download_tools(tools_config)
    
    # Load system prompt
    system_prompt = download_and_load_system_prompt(
        os.environ['SYSTEM_PROMPT_S3_BUCKET_NAME'],
        os.environ['SYSTEM_PROMPT_S3_KEY']
    )
    
    return tools_config, agent_tools, system_prompt
