import json
import os
import boto3
import base64
from aws_lambda_powertools import Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit

s3 = boto3.client('s3')
bedrock = boto3.client('bedrock-runtime')
metrics = Metrics()
tracer = Tracer()

@metrics.log_metrics
@tracer.capture_lambda_handler
def handler(event, context):
    bucket = event['bucket']
    key = event['key']
    invoke_type = os.environ["INVOKE_TYPE"]
    tracer.put_annotation(key="invoke_type", value=invoke_type)
    tracer.put_annotation(key="documentId", value=event["documentId"])
    metrics.add_dimension(name="invoke_type", value=invoke_type)
    
    # Check file type
    ext = key.lower().split('.')[-1]
    if ext not in ['jpg', 'jpeg', 'png', 'pdf']:
        raise ValueError(f"Unsupported file type: {ext}")
    
    media_type = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'pdf': 'application/pdf'}[ext]
    
    # Download file to /tmp
    local_path = f"/tmp/{key.split('/')[-1]}"
    s3.download_file(bucket, key, local_path)
    
    # Read and encode file
    with open(local_path, 'rb') as f:
        file_data = base64.b64encode(f.read()).decode('utf-8')
    
    # Format prompt if classification result exists
    prompt = os.environ['PROMPT']
    if 'classificationResult' in event:
        classification = event['classificationResult']['documentClassification']
        prompt = prompt.replace("[ACTUAL_CLASSIFICATION]", classification)
    
    # Build content based on file type
    content = [{'type': 'text', 'text': prompt}]
    if ext == 'pdf':
        content.append({'type': 'document', 'source': {'type': 'base64', 'media_type': media_type, 'data': file_data}})
    else:
        content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': media_type, 'data': file_data}})
    
    # Invoke Bedrock
    response = bedrock.invoke_model(
        modelId=os.environ['MODEL_ID'],
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 1000,
            'messages': [{'role': 'user', 'content': content}]
        })
    )
    
    response_payload = response['body'].read()
    metrics.add_metric(name="SuccessfulInvocation", unit=MetricUnit.Count, value=1)
    return json.loads(json.loads(response_payload)["content"][0]["text"])
