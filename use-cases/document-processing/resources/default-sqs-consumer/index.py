import json
import os
import boto3
from urllib.parse import unquote_plus
import time
import re
from aws_lambda_powertools import Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit

sfn_client = boto3.client('stepfunctions')
metrics = Metrics()
tracer = Tracer()

@metrics.log_metrics
@tracer.capture_lambda_handler
def handler(event, context):
    tracer.put_annotation(key="invoke_type", value="sqsconsumer")
    metrics.add_dimension(name="invoke_type", value="sqsconsumer")
    print(f'SQS Consumer: Received event: {json.dumps(event, indent=2)}')
    
    results = []
    
    for record in event['Records']:
        try:
            print(f'Processing SQS record: {record["messageId"]}')
            
            # Parse S3 event from SQS message body
            s3_event = json.loads(record['body'])
            print(f'Parsed S3 event: {json.dumps(s3_event, indent=2)}')
            
            # Skip S3 test events
            if "Event" in s3_event and s3_event["Event"] == 's3:TestEvent':
                print(f'Skipping S3 test event: {s3_event["Event"]}')
                continue
            
            if "Records" in s3_event:
                # Process each S3 record in the event
                for s3_record in s3_event['Records']:
                    event_name = s3_record['eventName']
                    
                    bucket = s3_record['s3']['bucket']['name']
                    key = unquote_plus(s3_record['s3']['object']['key'])
                    
                    # Skip folder creation events (keys ending with '/')
                    if key.endswith('/'):
                        print(f'Skipping folder creation event: s3://{bucket}/{key}')
                        continue
                    
                    event_time = s3_record['eventTime']
                    
                    print(f'Processing S3 object: s3://{bucket}/{key}')
                    
                    # Generate unique document ID from S3 key and timestamp
                    timestamp = int(time.time() * 1000)
                    document_id = (key
                        .replace('raw/', '', 1)  # Remove raw/ prefix
                        .rsplit('.', 1)[0]       # Remove file extension
                        )
                    document_id = re.sub(r'[^a-zA-Z0-9-]', '-', document_id) + '-' + str(timestamp)
                    
                    # Extract filename from key
                    filename = key.replace('raw/', '', 1)  # Remove raw/ prefix
                    
                    # Prepare Step Functions execution input
                    step_function_input = {
                        'documentId': document_id,
                        'bucket': bucket,
                        'key': key,
                        'filename': filename,
                        'eventTime': event_time,
                        'eventName': event_name,
                        'source': 'sqs-consumer'
                    }
                    
                    print(f'Starting Step Functions execution with input: {json.dumps(step_function_input, indent=2)}')
                    
                    # Start Step Functions execution
                    execution_name = f'{document_id}-execution'[:80]  # AWS limit
                    
                    response = sfn_client.start_execution(
                        stateMachineArn=os.environ['STATE_MACHINE_ARN'],
                        input=json.dumps(step_function_input),
                        name=execution_name
                    )
                    
                    print(f'Step Functions execution started: {response["executionArn"]}')
                    
                    results.append({
                        'documentId': document_id,
                        'executionArn': response['executionArn'],
                        's3Location': f's3://{bucket}/{key}'
                    })
            else:
                print(f"Skipping")
                
        except Exception as error:
            metrics.add_metric(name="FailedToProcessed", unit=MetricUnit.Count, value=1)
            print(f'Error processing SQS record: {record["messageId"]} {str(error)}')
            
            # Re-raise error to trigger SQS retry mechanism
            # After max retries, message will go to Dead Letter Queue
            raise Exception(f'Failed to process SQS record {record["messageId"]}: {str(error)}')
    
    metrics.add_metric(name="SuccessfullyProcessed", unit=MetricUnit.Count, value=len(results))
    print(f'Successfully processed {len(results)} documents: {results}')
    
    return {
        'statusCode': 200,
        'processedCount': len(results),
        'results': results
    }