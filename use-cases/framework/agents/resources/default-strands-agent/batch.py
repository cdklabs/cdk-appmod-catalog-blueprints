import os
import json
from strands import Agent, tool
from strands_tools import file_read
from aws_lambda_powertools import Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from utils import download_and_load_system_prompt, download_tools, convert_tools_config_into_model
import boto3

metrics = Metrics()
tracer = Tracer()
s3 = boto3.client('s3')

def extract_json_from_text(text):
    """Extract JSON object from text body enclosed in ```json blocks or raw JSON."""
    import re
    
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

def parse_s3_path(s3_path):
    # Remove s3:// prefix if present
    path = s3_path.replace('s3://', '')

    # Split into parts
    parts = path.split('/', 1)
    bucket = parts[0]

    if len(parts) == 1:
        return bucket, '', ''

    # Key is the prefix (includes filename)
    prefix = parts[1]
    filename = prefix.split('/')[-1]

    return bucket, prefix, filename

def download_attached_document(event):
    bucket = event['content']['bucket']
    key = event['content']['key']
    
    # Download file to /tmp
    local_path = f"/tmp/{key.split('/')[-1]}"
    s3.download_file(bucket, key, local_path)
    
    return local_path

tools_config = convert_tools_config_into_model(os.getenv('TOOLS_CONFIG', '{}'))
agent_tools = download_tools(tools_config)
system_prompt = download_and_load_system_prompt(os.environ['SYSTEM_PROMPT_S3_BUCKET_NAME'], os.environ['SYSTEM_PROMPT_S3_KEY'])

@metrics.log_metrics
@tracer.capture_lambda_handler
def handler(event, context):
    model_id = os.getenv("MODEL_ID")
    prompt = os.getenv("PROMPT")
    expect_json:bool = bool(os.getenv("EXPECT_JSON", ""))
    invoke_type = os.environ["INVOKE_TYPE"]
    content_type = event['contentType']
    
    tracer.put_annotation(key="invoke_type", value=invoke_type)
    metrics.add_dimension(name="invoke_type", value=invoke_type)
        
    if prompt is None:
        prompt = "Analyze the attached document and verify the information using the provided tools."
    
    if 'classificationResult' in event:
        classification = event['classificationResult']['documentClassification']
        prompt = prompt.replace("[ACTUAL_CLASSIFICATION]", classification)

    if content_type == 'file' and event['content']['location'] == 's3':
        local_path_attached_doc = download_attached_document(event)
        prompt += f" Attached document is located in {local_path_attached_doc}"
    elif content_type == 'data':
        prompt += f" Attached document content are as follows: {event['content']['data']}"
    
    agent = Agent(model=model_id, tools=agent_tools + [file_read], system_prompt=system_prompt)
    response = agent(prompt)
    
    metrics.add_metric(name="SuccessfulAgentInvocation", unit=MetricUnit.Count, value=1)
    response_text = response.message["content"][0]["text"] # type: ignore
    return {
        "result": extract_json_from_text(response_text) if expect_json else response_text
    }