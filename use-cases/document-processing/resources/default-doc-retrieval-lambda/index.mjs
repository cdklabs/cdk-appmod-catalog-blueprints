// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Mock masking function for local development
// In production, this would come from a Lambda layer
const maskDocument = (document, config) => {
  console.log('Applying masking with config:', config);
  return document;
};

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Lambda handler for retrieving documents with sensitive data masking
 */
export const handler = async (event) => {
  try {
    // Get document ID from path parameters
    const documentId = event.pathParameters?.documentId;
    
    if (!documentId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Missing document ID'
        })
      };
    }
    
    // Get document from DynamoDB
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.METADATA_TABLE,
        Key: { id: documentId }
      })
    );
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Document not found'
        })
      };
    }
    
    // Get masking configuration from environment variable
    let maskingConfig = {};
    if (process.env.MASKING_CONFIG) {
      try {
        maskingConfig = JSON.parse(process.env.MASKING_CONFIG);
      } catch (error) {
        console.warn('Invalid masking configuration:', error);
      }
    }
    
    // Apply masking to the document
    const maskedDocument = maskDocument(result.Item, maskingConfig);
    
    // Return the masked document
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(maskedDocument)
    };
  } catch (error) {
    console.error('Error retrieving document:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Error retrieving document',
        error: error.message
      })
    };
  }
};
