import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from 'file-type';

const s3Client = new S3Client({});

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  const { documentId, key } = event;
  const bucket = process.env.INPUT_BUCKET;
  
  try {
    if (!documentId || !bucket || !key) {
      throw new Error('Missing required fields: documentId, bucket, or key');
    }

    // Get the claimed extension from the filename
    const claimedExt = key.split('.').pop().toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'tiff'];
    
    if (!validExtensions.includes(claimedExt)) {
      throw new Error(`Invalid file format. Supported formats: JPG, PNG, TIFF. Received: ${claimedExt}`);
    }

    // Get the file from S3
    const getObjectResponse = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    // Read the file content
    const chunks = [];
    for await (const chunk of getObjectResponse.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Detect actual file type from content
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      throw new Error('Could not determine file type from content');
    }

    // Validate that actual content type matches claimed extension
    const actualExt = fileType.ext.toLowerCase();
    if (actualExt !== claimedExt && !(actualExt === 'jpg' && claimedExt === 'jpeg')) {
      throw new Error(`File extension mismatch. Claimed: ${claimedExt}, Actual: ${actualExt}`);
    }

    return {
      documentId,
      bucket,
      key,
      status: 'VALID',
      metadata: {
        validatedAt: new Date().toISOString(),
        format: actualExt,
        mimeType: fileType.mime
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Validation error:', error);
    return {
      documentId,
      bucket,
      key,
      error: error.message,
      status: 'INVALID',
      timestamp: new Date().toISOString()
    };
  }
};
