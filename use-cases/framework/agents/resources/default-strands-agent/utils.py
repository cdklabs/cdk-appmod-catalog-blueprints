import os
import boto3
import json
import zipfile
import glob
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
            # Single file tool - download directly
            local_location = f"/tmp/{os.path.basename(t.key)}"
            s3.download_file(t.bucketName, t.key, local_location)
            local_tools_location.append(local_location)
        elif t.isZipArchive:
            # Directory tool packaged as zip - download and extract
            zip_location = f"/tmp/{os.path.basename(t.key)}"
            s3.download_file(t.bucketName, t.key, zip_location)
            
            # Extract to a directory based on the zip name (without .zip extension)
            extract_dir = zip_location.replace('.zip', '')
            os.makedirs(extract_dir, exist_ok=True)
            
            with zipfile.ZipFile(zip_location, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            # Find all Python files in the extracted directory (excluding test files)
            for py_file in glob.glob(f"{extract_dir}/**/*.py", recursive=True):
                if not os.path.basename(py_file).startswith('test_'):
                    local_tools_location.append(py_file)
            
            # Clean up the zip file
            os.remove(zip_location)
    
    return local_tools_location

def download_and_load_system_prompt(bucketName, key) -> str:
    local_location = '/tmp/system_prompt.txt'
    s3.download_file(bucketName, key, local_location)
    
    with open(local_location, 'r') as file:
        data = file.read()
        
    return data