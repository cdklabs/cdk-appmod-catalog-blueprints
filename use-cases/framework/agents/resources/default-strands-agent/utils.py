import os
import boto3
import json
from models import ToolLocationDefinition

s3 = boto3.client('s3')

def convert_tools_config_into_model(config: str) -> list[ToolLocationDefinition]:
    definitions: list[ToolLocationDefinition] = []
    
    tools_raw = json.loads(config)
    
    for t in tools_raw:
        definitions.append(ToolLocationDefinition.model_validate_json(json.dumps(t)))
    
    return definitions

def download_tools(tools: list[ToolLocationDefinition]) -> list[str]:
    local_tools_location: list[str] = []
    
    for t in tools:
        if t.isFile:
            local_location = f"/tmp/{os.path.basename(t.key)}"
            s3.download_file(t.bucketName, t.key, local_location)
            local_tools_location.append(local_location)
    
    return local_tools_location

def download_and_load_system_prompt(bucketName, key) -> str:
    local_location = '/tmp/system_prompt.txt'
    s3.download_file(bucketName, key, local_location)
    
    with open(local_location, 'r') as file:
        data = file.read()
        
    return data