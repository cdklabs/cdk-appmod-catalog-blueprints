import json
import logging
import boto3
import re
from generate_data import handle_generation
import uuid

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
   # logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        apiPath = event['apiPath']
        parameters = event['parameters']
        action_group = event['actionGroup']
        http_method = event['httpMethod']

      #  logger.info(f"API Path: {apiPath}")
      #  logger.info(f"Parameters: {parameters}")

        if apiPath == "/generate-data":
            # Generate a unique session ID
            session_id = event.get('sessionId')

            # Extract properties from the correct location
            properties = event['requestBody']['content']['application/json']['properties']
          #  logger.info(f"Properties: {json.dumps(properties, indent=2)}")
            
            # Extract use_case, field_definitions, and num_files
            use_case = next((prop['value'] for prop in properties if prop['name'] == 'use_case'), '')
            field_definitions_str = next((prop['value'] for prop in properties if prop['name'] == 'field_definitions'), '[]')
            num_files = int(next((prop['value'] for prop in properties if prop['name'] == 'num_files'), 1))

            # Parse field_definitions
            field_definitions = json.loads(field_definitions_str)

         #   logger.info(f"Use Case: {use_case}")
         #   logger.info(f"Number of Files: {num_files}")
         #   logger.info(f"Field Definitions: {json.dumps(field_definitions, indent=2)}")

            try:
                # Pass session_id to handle_generation
                result = handle_generation(use_case, field_definitions, num_files, session_id)
                logger.info(f"result: {result}")

                # Prepare response body
                # response_body = {
                #     'application/json': {
                #         'script_url': result['script_url'],
                #         'explanation_url': result['explanation_url'],
                #         'schema_url': result['schema_url'],
                #         'datasets': [
                #             {
                #                 'csv_url': dataset['csv_url'],
                #                 'json_url': dataset['json_url']
                #             } for dataset in result['generated_datasets']
                #         ]
                #     }
                # }

                action_response = {
                    'actionGroup': action_group,
                    'apiPath': apiPath,
                    'httpMethod': http_method,
                    'httpStatusCode': 200,
                    # 'responseBody': response_body,
                }

                response = {
                    'messageVersion': '1.0',
                    'response': action_response
                }

            except Exception as e:
                logger.error(f"Error in handle_generation: {str(e)}")
                raise
            
        else:
            raise ValueError(f"Unknown apiPath: {apiPath}")

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        response = {
            "messageVersion": "1.0",
            "response": {
                "actionGroup": event.get('actionGroup', 'unknown'),
                "apiPath": apiPath,
                "httpStatusCode": 500,
                "responseBody": {
                    "application/json": {
                        "body": json.dumps({
                            "error": str(e)
                        })
                    }
                }
            }
        }

 #   logger.info(f"Returning response: {json.dumps(response)}")
    return response