#!/usr/bin/env python3
"""
Ingestion Handler for Bedrock Knowledge Base

This Lambda function is a CloudFormation custom resource handler that triggers
and monitors the ingestion of documents into a Bedrock Knowledge Base.
"""

import json
import logging
import time
import boto3
import urllib.request

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Bedrock Agent client
bedrock_agent = boto3.client('bedrock-agent')

# Constants
MAX_WAIT_TIME_SECONDS = 300  # 5 minutes timeout
POLL_INTERVAL_SECONDS = 10


def send_cfn_response(event, context, status, reason=None, data=None, physical_resource_id=None):
    """
    Send response to CloudFormation.
    
    Args:
        event: CloudFormation event
        context: Lambda context
        status: SUCCESS or FAILED
        reason: Reason for failure (optional)
        data: Response data (optional)
        physical_resource_id: Physical resource ID (optional)
    """
    response_url = event.get('ResponseURL')
    if not response_url:
        logger.warning("No ResponseURL found in event, skipping CFN response")
        return
    
    physical_id = physical_resource_id or event.get('PhysicalResourceId', context.log_stream_name)
    
    response_body = {
        'Status': status,
        'Reason': reason or f"See CloudWatch Log Stream: {context.log_stream_name}",
        'PhysicalResourceId': physical_id,
        'StackId': event.get('StackId'),
        'RequestId': event.get('RequestId'),
        'LogicalResourceId': event.get('LogicalResourceId'),
        'Data': data or {}
    }
    
    json_response = json.dumps(response_body)
    logger.info(f"Sending CFN response: {json_response}")
    
    try:
        request = urllib.request.Request(
            response_url,
            data=json_response.encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PUT'
        )
        with urllib.request.urlopen(request) as response:
            logger.info(f"CFN response sent successfully: {response.status}")
    except Exception as e:
        logger.error(f"Failed to send CFN response: {str(e)}")
        raise


def wait_for_ingestion(knowledge_base_id, data_source_id, ingestion_job_id):
    """
    Wait for ingestion job to complete.
    
    Args:
        knowledge_base_id: Knowledge Base ID
        data_source_id: Data Source ID
        ingestion_job_id: Ingestion Job ID
        
    Returns:
        Final job status
        
    Raises:
        TimeoutError: If ingestion takes longer than MAX_WAIT_TIME_SECONDS
        RuntimeError: If ingestion fails
    """
    start_time = time.time()
    
    while True:
        elapsed_time = time.time() - start_time
        if elapsed_time > MAX_WAIT_TIME_SECONDS:
            raise TimeoutError(
                f"Ingestion job {ingestion_job_id} did not complete within "
                f"{MAX_WAIT_TIME_SECONDS} seconds"
            )
        
        response = bedrock_agent.get_ingestion_job(
            knowledgeBaseId=knowledge_base_id,
            dataSourceId=data_source_id,
            ingestionJobId=ingestion_job_id
        )
        
        job = response.get('ingestionJob', {})
        status = job.get('status')
        
        logger.info(
            f"Ingestion job {ingestion_job_id} status: {status} "
            f"(elapsed: {int(elapsed_time)}s)"
        )
        
        if status == 'COMPLETE':
            statistics = job.get('statistics', {})
            logger.info(
                f"Ingestion completed successfully. "
                f"Documents scanned: {statistics.get('numberOfDocumentsScanned', 0)}, "
                f"Documents indexed: {statistics.get('numberOfNewDocumentsIndexed', 0)}, "
                f"Documents modified: {statistics.get('numberOfModifiedDocumentsIndexed', 0)}, "
                f"Documents deleted: {statistics.get('numberOfDocumentsDeleted', 0)}, "
                f"Documents failed: {statistics.get('numberOfDocumentsFailed', 0)}"
            )
            return status
        
        if status == 'FAILED':
            failure_reasons = job.get('failureReasons', [])
            raise RuntimeError(
                f"Ingestion job {ingestion_job_id} failed: {failure_reasons}"
            )
        
        if status in ['STARTING', 'IN_PROGRESS']:
            time.sleep(POLL_INTERVAL_SECONDS)
            continue
        
        # Unknown status
        logger.warning(f"Unknown ingestion status: {status}")
        time.sleep(POLL_INTERVAL_SECONDS)


def start_ingestion(knowledge_base_id, data_source_id):
    """
    Start an ingestion job for the knowledge base.
    
    Args:
        knowledge_base_id: Knowledge Base ID
        data_source_id: Data Source ID
        
    Returns:
        Ingestion job ID
    """
    logger.info(
        f"Starting ingestion job for KB: {knowledge_base_id}, "
        f"DataSource: {data_source_id}"
    )
    
    response = bedrock_agent.start_ingestion_job(
        knowledgeBaseId=knowledge_base_id,
        dataSourceId=data_source_id
    )
    
    ingestion_job = response.get('ingestionJob', {})
    ingestion_job_id = ingestion_job.get('ingestionJobId')
    
    logger.info(f"Started ingestion job: {ingestion_job_id}")
    return ingestion_job_id


def handler(event, context):
    """
    Lambda handler for CloudFormation custom resource.
    
    Handles Create, Update, and Delete events for triggering
    Bedrock Knowledge Base ingestion.
    
    Args:
        event: CloudFormation custom resource event
        context: Lambda context
        
    Returns:
        None (response sent via CloudFormation callback URL)
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    request_type = event.get('RequestType')
    properties = event.get('ResourceProperties', {})
    
    knowledge_base_id = properties.get('KnowledgeBaseId')
    data_source_id = properties.get('DataSourceId')
    
    # Generate physical resource ID
    physical_resource_id = f"{knowledge_base_id}-{data_source_id}-ingestion"
    
    try:
        if request_type == 'Delete':
            # Nothing to do on delete - ingestion is a one-time operation
            logger.info("Delete request - no action required")
            send_cfn_response(
                event, context, 'SUCCESS',
                physical_resource_id=physical_resource_id,
                data={'Message': 'Delete completed - no action required'}
            )
            return
        
        if request_type in ['Create', 'Update']:
            # Validate required properties
            if not knowledge_base_id:
                raise ValueError("KnowledgeBaseId is required")
            if not data_source_id:
                raise ValueError("DataSourceId is required")
            
            # Start ingestion job
            ingestion_job_id = start_ingestion(knowledge_base_id, data_source_id)
            
            # Wait for completion
            final_status = wait_for_ingestion(
                knowledge_base_id, data_source_id, ingestion_job_id
            )
            
            send_cfn_response(
                event, context, 'SUCCESS',
                physical_resource_id=physical_resource_id,
                data={
                    'IngestionJobId': ingestion_job_id,
                    'Status': final_status,
                    'KnowledgeBaseId': knowledge_base_id,
                    'DataSourceId': data_source_id
                }
            )
            return
        
        # Unknown request type
        logger.warning(f"Unknown request type: {request_type}")
        send_cfn_response(
            event, context, 'SUCCESS',
            physical_resource_id=physical_resource_id,
            data={'Message': f'Unknown request type: {request_type}'}
        )
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        send_cfn_response(
            event, context, 'FAILED',
            reason=str(e),
            physical_resource_id=physical_resource_id
        )
