"""
Shared Agent Logic

This module contains the core agent logic that is shared between
Lambda and AgentCore runtime implementations.
"""

import json
import os
import boto3
from typing import Dict, Any, List, Optional


class AgentProcessor:
    """
    Core agent processing logic shared across runtime types.
    """
    
    def __init__(self):
        self.bedrock_client = boto3.client('bedrock-runtime')
        self.s3_client = boto3.client('s3')
        
        # Load configuration from environment
        self.model_id = os.environ.get('MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
        self.system_prompt_bucket = os.environ.get('SYSTEM_PROMPT_S3_BUCKET_NAME')
        self.system_prompt_key = os.environ.get('SYSTEM_PROMPT_S3_KEY')
        self.tools_config = json.loads(os.environ.get('TOOLS_CONFIG', '[]'))
        self.prompt = os.environ.get('PROMPT', '')
        self.expect_json = os.environ.get('EXPECT_JSON', '').lower() == 'true'
        
        # Load system prompt
        self.system_prompt = self._load_system_prompt()
        
        # Load tools
        self.tools = self._load_tools()
    
    def _load_system_prompt(self) -> str:
        """Load system prompt from S3."""
        if not self.system_prompt_bucket or not self.system_prompt_key:
            return "You are a helpful AI assistant."
        
        try:
            response = self.s3_client.get_object(
                Bucket=self.system_prompt_bucket,
                Key=self.system_prompt_key
            )
            return response['Body'].read().decode('utf-8')
        except Exception as e:
            print(f"Error loading system prompt: {e}")
            return "You are a helpful AI assistant."
    
    def _load_tools(self) -> List[Dict[str, Any]]:
        """Load tools from S3 based on configuration."""
        tools = []
        
        for tool_config in self.tools_config:
            try:
                bucket = tool_config['bucketName']
                key = tool_config['key']
                
                # Download tool code
                response = self.s3_client.get_object(Bucket=bucket, Key=key)
                tool_code = response['Body'].read().decode('utf-8')
                
                # Execute tool code to get metadata
                tool_namespace = {}
                exec(tool_code, tool_namespace)
                
                if 'TOOL_METADATA' in tool_namespace:
                    tools.append({
                        'metadata': tool_namespace['TOOL_METADATA'],
                        'function': tool_namespace.get(tool_namespace['TOOL_METADATA']['name'])
                    })
                    
            except Exception as e:
                print(f"Error loading tool {tool_config}: {e}")
        
        return tools
    
    def process_request(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process an agent request.
        
        Args:
            event: Request event containing content to analyze
            
        Returns:
            Processing result with analysis
        """
        try:
            # Extract content from event
            content_type = event.get('contentType', 'data')
            content = event.get('content', {})
            
            # Get input text
            if content_type == 'file':
                # Load file from S3
                bucket = content.get('bucket')
                key = content.get('key')
                response = self.s3_client.get_object(Bucket=bucket, Key=key)
                input_text = response['Body'].read().decode('utf-8')
            else:
                # Use data directly
                input_text = content.get('data', '')
            
            # Prepare messages for Bedrock
            messages = [
                {
                    'role': 'user',
                    'content': f"{self.prompt}\n\nInput:\n{input_text}"
                }
            ]
            
            # Prepare tool definitions for Bedrock
            tool_definitions = []
            for tool in self.tools:
                metadata = tool['metadata']
                tool_definitions.append({
                    'name': metadata['name'],
                    'description': metadata['description'],
                    'input_schema': {
                        'type': 'object',
                        'properties': {
                            param_name: {
                                'type': param_info['type'],
                                'description': param_info['description']
                            }
                            for param_name, param_info in metadata['parameters'].items()
                        },
                        'required': [
                            param_name 
                            for param_name, param_info in metadata['parameters'].items() 
                            if param_info.get('required', False)
                        ]
                    }
                })
            
            # Invoke Bedrock with tool support
            request_body = {
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 4096,
                'system': self.system_prompt,
                'messages': messages,
            }
            
            if tool_definitions:
                request_body['tools'] = tool_definitions
            
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body)
            )
            
            # Parse response
            response_body = json.loads(response['body'].read())
            
            # Handle tool use if present
            while response_body.get('stop_reason') == 'tool_use':
                # Execute tools
                tool_results = []
                for content_block in response_body.get('content', []):
                    if content_block.get('type') == 'tool_use':
                        tool_name = content_block['name']
                        tool_input = content_block['input']
                        tool_use_id = content_block['id']
                        
                        # Find and execute tool
                        tool_result = self._execute_tool(tool_name, tool_input)
                        
                        tool_results.append({
                            'type': 'tool_result',
                            'tool_use_id': tool_use_id,
                            'content': json.dumps(tool_result)
                        })
                
                # Continue conversation with tool results
                messages.append({
                    'role': 'assistant',
                    'content': response_body['content']
                })
                messages.append({
                    'role': 'user',
                    'content': tool_results
                })
                
                request_body['messages'] = messages
                response = self.bedrock_client.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(request_body)
                )
                response_body = json.loads(response['body'].read())
            
            # Extract final response
            result_text = ''
            for content_block in response_body.get('content', []):
                if content_block.get('type') == 'text':
                    result_text += content_block['text']
            
            # Parse JSON if expected
            if self.expect_json:
                try:
                    result = json.loads(result_text)
                except json.JSONDecodeError:
                    result = {'raw_response': result_text}
            else:
                result = result_text
            
            return {
                'success': True,
                'result': result,
                'metadata': {
                    'model_id': self.model_id,
                    'tokens_used': response_body.get('usage', {})
                }
            }
            
        except Exception as e:
            print(f"Error processing request: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Error processing request: {str(e)}'
            }
    
    def _execute_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool by name with given input."""
        for tool in self.tools:
            if tool['metadata']['name'] == tool_name:
                try:
                    return tool['function'](**tool_input)
                except Exception as e:
                    return {
                        'success': False,
                        'error': str(e),
                        'message': f'Error executing tool {tool_name}: {str(e)}'
                    }
        
        return {
            'success': False,
            'error': 'Tool not found',
            'message': f'Tool {tool_name} is not available'
        }
