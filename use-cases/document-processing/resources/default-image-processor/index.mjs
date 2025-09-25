// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { processDocument } from './classifier.mjs';

const s3Client = new S3Client({region: process.env.AWS_REGION});
const ddbClient = new DynamoDBClient({region: process.env.AWS_REGION});

async function streamToBuffer(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

async function moveFile(bucket, sourceKey, status) {
  try {
      // Get the appropriate prefix based on status
      const destinationPrefix = status === "PROCESSED" 
          ? process.env.OUTPUT_PREFIX 
          : process.env.FAILED_PREFIX;

      if (!destinationPrefix) {
          throw new Error(`${status === "PROCESSED" ? 'OUTPUT_PREFIX' : 'FAILED_PREFIX'} environment variable is not set`);
      }

      // Extract filename from the source key
      const fileName = sourceKey.split('/').pop();
      const destinationKey = `${destinationPrefix}${fileName}`;

      // Copy the object to new location
      await s3Client.send(new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${sourceKey}`,
          Key: destinationKey
      }));

      // Delete the original object
      await s3Client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: sourceKey
      }));

      return destinationKey;
  } catch (error) {
      console.error('Error moving file:', error);
      throw error;
  }
}

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2))
    const bucket = process.env.INPUT_BUCKET;

    try {
        // Get bucket and key from the event
        const documentId = event.documentId
        const key = event.key;

        // GenAI configuration removed - will be handled by Step Functions integration
        console.log('Using traditional Lambda processing (Textract + rules)');

        const processResults = await processDocument(bucket, key, {
            region: process.env.AWS_REGION,
            processWithRecommendedApi: true,
            genaiConfig: null  // No GenAI in Lambda
        })

        console.log('Classification Method:', processResults.classificationMethod);
        console.log('GenAI Used:', processResults.genaiUsed);
        console.log(processResults.extractedEntities)

        const newLocation = await moveFile(bucket, key, "PROCESSED");

        // Process Textract results
        const metadata = {
            s3Location: newLocation,
            timestamp: new Date().toISOString()
        };

        // 3. Store metadata in DynamoDB
        const tableName = process.env.METADATA_TABLE;
        if (!tableName) {
            throw new Error('METADATA_TABLE environment variable is not set');
        }

        await ddbClient.send(
            new PutItemCommand({
                TableName: tableName, // Fixed the property name from TableItem to TableName
                Item: {
                    documentId: {
                        S: documentId
                    },
                    s3Location: {
                        S: metadata.s3Location
                    },
                    createdAt: {
                        S: metadata.timestamp
                    },
                    classification: {
                        S: JSON.stringify(processResults.classification)
                    },
                    classificationMethod: {
                        S: processResults.classificationMethod || 'rule-based'
                    },
                    genaiUsed: {
                        BOOL: processResults.genaiUsed || false
                    },
                    textractApiUsed: {
                        S: JSON.stringify(processResults.apiUsed)
                    },
                    entities: {
                        S: JSON.stringify(processResults.extractedEntities)
                    }
                }
            })
        );

        

        // 4. Return the metadata
        return {
            status: "PROCESSED",
            message: 'Document processed successfully',
            metadata: metadata,
            newLocation,
            classificationMethod: processResults.classificationMethod,
            genaiUsed: processResults.genaiUsed
        };

    } catch (error) {
        console.error('Error processing document:', error);
        const newLocation = await moveFile(bucket, event.key, "FAILED");
        return {
            status: "FAILED",
            error: error.message || 'Unknown error',
            newLocation
        };
    }
};