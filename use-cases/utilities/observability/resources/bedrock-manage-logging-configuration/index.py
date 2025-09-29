import boto3

client = boto3.client('bedrock')

def handler(event, context):
    request_type = event['RequestType']
    
    # Only process CREATE and UPDATE events
    if request_type not in ['Create', 'Update']:
        return
    
    current_logging_config = client.get_model_invocation_logging_configuration()
    
    # Check if logging is already configured and override is not set
    if current_logging_config.get('loggingConfig') and not event.get('ResourceProperties', {}).get('override', False):
        return
    
    # Update logging configuration
    props = event['ResourceProperties']
    client.put_model_invocation_logging_configuration(
        loggingConfig={
            'cloudWatchConfig': {
                'logGroupName': props['logGroupName'],
                'roleArn': props['roleArn']
            }
        }
    )