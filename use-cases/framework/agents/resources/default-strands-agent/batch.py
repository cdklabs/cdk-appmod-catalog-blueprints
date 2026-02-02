"""
Batch agent Lambda handler for processing documents with AI agents.

This module provides the Lambda handler for batch processing of documents
using Amazon Bedrock agents with tool integration.
"""

import json
import os
import re
from enum import Enum
from typing import Any, Dict, Optional

import boto3
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from strands import Agent
from strands_tools import file_read

from utils import (
    convert_tools_config_into_model,
    download_and_load_system_prompt,
    download_tools,
)


class ContentType(str, Enum):
    """
    Document content type enumeration.
    
    Defines how document content is provided to the agent.
    """
    FILE = "file"  # Document stored in S3 or file system
    DATA = "data"  # Document content provided inline


class ContentLocation(str, Enum):
    """
    Document storage location enumeration.
    
    Defines where file-based documents are stored.
    """
    S3 = "s3"  # Document stored in Amazon S3


class InvokeType(str, Enum):
    """
    Agent invocation type enumeration.
    
    Defines the processing mode for the agent.
    """
    BATCH = "batch"                    # Batch processing (one document at a time)
    INTERACTIVE = "interactive"        # Interactive conversation mode (future)
    ATTACH_DIRECTLY = "attach-directly"  # Direct invocation (e.g., RAG, API endpoints)
    CLASSIFICATION = "classification"  # Document classification step
    PROCESSING = "processing"          # Document processing step
    AGGREGATION = "aggregation"        # Document aggregation step

# Initialize AWS Lambda Powertools
logger = Logger()
metrics = Metrics()
tracer = Tracer()

# Initialize AWS clients
s3_client = boto3.client('s3')

# Load configuration at module initialization
TOOLS_CONFIG = convert_tools_config_into_model(os.getenv('TOOLS_CONFIG', '{}'))
AGENT_TOOLS = download_tools(TOOLS_CONFIG)
SYSTEM_PROMPT = download_and_load_system_prompt(
    os.environ['SYSTEM_PROMPT_S3_BUCKET_NAME'],
    os.environ['SYSTEM_PROMPT_S3_KEY']
)


def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract JSON object from text containing JSON in code blocks or raw format.
    
    Attempts to extract JSON in the following order:
    1. JSON within ```json code blocks
    2. Raw JSON objects in the text
    
    Args:
        text: Text potentially containing JSON data
        
    Returns:
        Parsed JSON dictionary if found, None otherwise
    """
    # Try to find JSON in ```json blocks first
    json_block_match = re.search(r'```json\s*({.*?})\s*```', text, re.DOTALL)
    if json_block_match:
        try:
            return json.loads(json_block_match.group(1))
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse JSON from code block", extra={"error": str(e)})
    
    # Fall back to finding raw JSON objects
    raw_json_match = re.search(r'({[^{}]*(?:{[^{}]*}[^{}]*)*})', text, re.DOTALL)
    if raw_json_match:
        try:
            return json.loads(raw_json_match.group(1))
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse raw JSON", extra={"error": str(e)})
    
    logger.info("No valid JSON found in text")
    return None


def download_document_from_s3(bucket: str, key: str) -> str:
    """
    Download a document from S3 to local /tmp directory.
    
    Args:
        bucket: S3 bucket name
        key: S3 object key
        
    Returns:
        Local file path where document was downloaded
        
    Raises:
        ClientError: If S3 download fails
    """
    filename = key.split('/')[-1]
    local_path = f"/tmp/{filename}"
    
    logger.info("Downloading document from S3", extra={
        "bucket": bucket,
        "key": key,
        "local_path": local_path
    })
    
    s3_client.download_file(bucket, key, local_path)
    return local_path


def build_agent_prompt(base_prompt: str, event: Dict[str, Any], invoke_type: InvokeType) -> str:
    """
    Build the complete agent prompt from base prompt and event data.
    
    Args:
        base_prompt: Base prompt template
        event: Lambda event containing document and classification data
        
    Returns:
        Complete prompt with document information and classification
        
    Raises:
        ValueError: If content_type is invalid or required fields are missing
    """
    prompt = base_prompt or "Analyze the attached document and verify the information using the provided tools."
    
    # Replace classification placeholder if present
    if 'classificationResult' in event:
        classification = event['classificationResult']['documentClassification']
        prompt = prompt.replace("[ACTUAL_CLASSIFICATION]", classification)
        logger.info("Added classification to prompt", extra={"classification": classification})
    
    # Validate and process content based on type
    content_type_str = event.get('contentType', '')
    content = event.get('content', {})
    
    try:
        content_type = ContentType(content_type_str)
    except ValueError:
        logger.error("Invalid content type", extra={
            "content_type": content_type_str,
            "valid_types": [ct.value for ct in ContentType]
        })
        raise ValueError(
            f"Invalid content_type '{content_type_str}'. "
            f"Must be one of: {', '.join(ct.value for ct in ContentType)}"
        )
    
    # Process based on content type
    if content_type == ContentType.FILE:
        location = content.get('location', '')
        
        # Validate location
        try:
            location_enum = ContentLocation(location)
        except ValueError:
            logger.error("Invalid content location", extra={
                "location": location,
                "valid_locations": [loc.value for loc in ContentLocation]
            })
            raise ValueError(
                f"Invalid content location '{location}'. "
                f"Must be one of: {', '.join(loc.value for loc in ContentLocation)}"
            )
        
        if location_enum == ContentLocation.S3:
            if 'bucket' not in content or 'key' not in content:
                raise ValueError("S3 content must include 'bucket' and 'key' fields")
            
            local_path = download_document_from_s3(content['bucket'], content['key'])
            prompt += f" Attached document is located in {local_path}"
            logger.info("Added file location to prompt", extra={"path": local_path})
    
    elif content_type == ContentType.DATA:
        if 'data' not in content:
            raise ValueError("Data content must include 'data' field")
        
        if invoke_type == InvokeType.BATCH:
            prompt += f" Attached document content are as follows: {content['data']}"
        elif invoke_type == InvokeType.ATTACH_DIRECTLY:
            prompt += f" {content['data']}"
        logger.info("Added inline data to prompt")
    
    return prompt


@metrics.log_metrics
@tracer.capture_lambda_handler
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for batch agent processing.
    
    Processes documents using an AI agent with tool integration.
    Supports both file-based (S3) and inline data inputs.
    
    Args:
        event: Lambda event containing:
            - contentType: 'file' or 'data' (see ContentType enum)
            - content: Document location or inline data
            - classificationResult: Optional document classification
        context: Lambda context object
        
    Returns:
        Dictionary with 'result' key containing agent response
        (parsed as JSON if EXPECT_JSON is enabled)
        
    Raises:
        KeyError: If required environment variables are missing
        ValueError: If event contains invalid content_type or missing required fields
        Exception: If agent invocation fails
    """
    # Load configuration
    model_id = os.getenv("MODEL_ID")
    base_prompt = os.getenv("PROMPT")
    expect_json = bool(os.getenv("EXPECT_JSON", ""))
    invoke_type_str = os.environ.get("INVOKE_TYPE", InvokeType.BATCH.value)
    
    # Validate invoke type
    try:
        invoke_type = InvokeType(invoke_type_str)
    except ValueError:
        logger.warning("Invalid invoke type, using default", extra={
            "invoke_type": invoke_type_str,
            "default": InvokeType.BATCH.value
        })
        invoke_type = InvokeType.BATCH
    
    # Add observability metadata
    tracer.put_annotation(key="invoke_type", value=invoke_type.value)
    tracer.put_annotation(key="expect_json", value=expect_json)
    metrics.add_dimension(name="invoke_type", value=invoke_type.value)
    
    logger.info("Processing batch agent request", extra={
        "model_id": model_id,
        "expect_json": expect_json,
        "invoke_type": invoke_type.value,
        "content_type": event.get('contentType')
    })
    
    try:
        # Build complete prompt (validates content_type and structure)
        prompt = build_agent_prompt(base_prompt, event, invoke_type)
        
        # Initialize and invoke agent
        agent = Agent(
            model=model_id,
            tools=AGENT_TOOLS + [file_read],
            system_prompt=SYSTEM_PROMPT
        )
        
        logger.info("Invoking agent", extra={"prompt_length": len(prompt)})
        response = agent(prompt)
        
        # Extract response text
        response_text = response.message["content"][0]["text"]  # type: ignore
        logger.info("Agent invocation successful", extra={
            "response_length": len(response_text)
        })
        
        # Record success metric
        metrics.add_metric(
            name="SuccessfulAgentInvocation",
            unit=MetricUnit.Count,
            value=1
        )
        
        # Parse JSON if requested
        if expect_json:
            result = extract_json_from_text(response_text)
            if result is None:
                logger.warning("Expected JSON but none found in response")
                result = {"raw_response": response_text}
        else:
            result = response_text
        
        return {"result": result}
    
    except ValueError as e:
        # Validation errors (invalid content_type, missing fields, etc.)
        logger.error("Validation error", extra={
            "error": str(e),
            "error_type": "ValidationError"
        })
        metrics.add_metric(
            name="ValidationError",
            unit=MetricUnit.Count,
            value=1
        )
        raise
        
    except Exception as e:
        logger.error("Agent invocation failed", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        metrics.add_metric(
            name="FailedAgentInvocation",
            unit=MetricUnit.Count,
            value=1
        )
        raise