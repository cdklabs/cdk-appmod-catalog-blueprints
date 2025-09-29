exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract document info from event
    const { documentId, bucket, key, status } = event;
    
    // Check if document was valid
    if (status !== 'VALID') {
      throw new Error('Cannot process invalid document');
    }
    
    // Simulate processing
    console.log(`Processing document ${documentId} from ${bucket}/${key}`);
    
    // In a real implementation, this would:
    // 1. Download the PDF from S3
    // 2. Process it (OCR, text extraction, etc)
    // 3. Apply data masking
    // 4. Upload processed result back to S3
    
    return {
      statusCode: 200,
      documentId,
      bucket,
      key,
      status: 'PROCESSED',
      outputKey: `processed/${documentId}.pdf`,
      metadata: {
        pageCount: 5, // Example metadata
        processedAt: new Date().toISOString(),
        contentType: 'application/pdf'
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Processing error:', error);
    return {
      statusCode: 500,
      documentId: event.documentId,
      error: error.message,
      status: 'PROCESSING_FAILED',
      timestamp: new Date().toISOString()
    };
  }
};
