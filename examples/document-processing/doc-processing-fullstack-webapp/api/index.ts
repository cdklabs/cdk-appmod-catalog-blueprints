import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const AGENTIC_BUCKET = 'agenticdocumentprocessing-agenticdocumentprocessin-khfneft673zr';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, resource } = event;
    
    if (httpMethod === 'POST' && resource === '/documents/upload') {
      return await handleGetPresignedUrl(event);
    }
    
    if (httpMethod === 'GET' && resource === '/documents/{documentId}/status') {
      return await handleStatus(event);
    }
    
    if (httpMethod === 'GET' && resource === '/documents/{documentId}/results') {
      return await handleResults(event);
    }

    if (httpMethod === 'GET' && resource === '/documents') {
      return await handleList(event);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleGetPresignedUrl(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { filename, contentType, documentType, policyNumber } = body;

  if (!filename || !documentType) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'filename and documentType are required' })
    };
  }

  if (documentType === 'supporting' && !policyNumber) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'policyNumber is required for supporting documents' })
    };
  }

  const timestamp = Date.now();
  const baseFileName = filename.split('.').slice(0, -1).join('.') || 'document';
  const fileExtension = filename.split('.').pop() || 'pdf';
  
  let documentId: string;
  let s3Key: string;
  
  // Handle different document types with specific folder structures
  switch (documentType) {
    case 'policy':
      documentId = baseFileName; 
      s3Key = `policies/${documentId}.${fileExtension}`;
      break;
      
    case 'supporting':
      if (!policyNumber) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Policy number is required for supporting documents' })
        };
      }
      documentId = baseFileName; 
      s3Key = `supporting_documents/${policyNumber}/${documentId}.${fileExtension}`;
      break;
      
    case 'claim':
    default:
      documentId = `${baseFileName.replace(/_/g, '-')}-${timestamp}`; 
      s3Key = `raw/${documentId}.${fileExtension}`;
      break;
  }
  
  const s3Location = `s3://${AGENTIC_BUCKET}/${s3Key}`;

  try {
    // Generate presigned URL for direct S3 upload
    const command = new PutObjectCommand({
      Bucket: AGENTIC_BUCKET,
      Key: s3Key,
      ContentType: contentType || 'application/octet-stream'
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documentId,
        uploadUrl: presignedUrl,
        s3Location,
        uploadStatus: 'ready'
      })
    };
  } catch (error) {
    console.error('Presigned URL error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        documentId,
        s3Location,
        uploadStatus: 'failed',
        error: 'Failed to generate upload URL'
      })
    };
  }
}

async function handleStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const documentId = event.pathParameters?.documentId;
  
  if (!documentId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'documentId is required' })
    };
  }

  try {
    // Convert underscore to dash to match workflow DocumentId format
    const searchDocumentId = documentId.replace(/_/g, '-');
    
    // Search for records that start with the documentId (workflow adds execution timestamp)
    const result = await dynamoClient.send(new ScanCommand({
      TableName: process.env.TABLE_NAME!,
      FilterExpression: 'begins_with(DocumentId, :docId)',
      ExpressionAttributeValues: {
        ':docId': searchDocumentId
      }
      // Removed Limit to scan entire table
    }));

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' })
      };
    }

    const item = result.Items[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documentId: item.DocumentId,
        status: item.WorkflowStatus || 'processing',
        bucket: item.Bucket,
        key: item.Key,
        ...(item.ProcessingResult && {
          processingResult: JSON.parse(item.ProcessingResult)
        }),
        ...(item.ClassificationResult && {
          classificationResult: JSON.parse(item.ClassificationResult)
        })
      })
    };
  } catch (error) {
    console.error('Status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get status' })
    };
  }
}

async function handleResults(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const documentId = event.pathParameters?.documentId;
  
  if (!documentId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'documentId is required' })
    };
  }

  try {
    const result = await dynamoClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { DocumentId: documentId }  // Capital D to match agentic table schema
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documentId,
        status: result.Item.status,
        filename: result.Item.filename,
        documentType: result.Item.documentType,
        processingResult: result.Item.processingResult || null,
        claim_approved: result.Item.claim_approved || null,
        justification: result.Item.justification || null,
        documentClassification: result.Item.documentClassification || null
      })
    };
  } catch (error) {
    console.error('Results error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get results' })
    };
  }
}

async function handleList(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const result = await dynamoClient.send(new ScanCommand({
      TableName: process.env.TABLE_NAME!
    }));

    const documents = result.Items?.map(item => ({
      documentId: item.documentId,
      status: item.status,
      filename: item.filename,
      documentType: item.documentType,
      uploadTime: item.uploadTime,
      processingResult: item.processingResult || null
    })) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documents,
        total: documents.length
      })
    };
  } catch (error) {
    console.error('List error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to list documents' })
    };
  }
}
