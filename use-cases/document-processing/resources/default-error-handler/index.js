exports.handler = async (event) => {
  console.log('Received error event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract error info from event
    const { documentId, bucket, key, error, status } = event;
    
    // Log the error details
    console.error('Document processing failed:', {
      documentId,
      bucket,
      key,
      error,
      status
    });
    
    // In a real implementation, this would:
    // 1. Move the failed document to error prefix in S3
    // 2. Update metadata in DynamoDB
    // 3. Trigger notifications if configured
    // 4. Handle cleanup if needed
    
    return {
      statusCode: 200,
      documentId,
      bucket,
      key,
      status: 'ERROR_HANDLED',
      error: {
        message: error,
        handledAt: new Date().toISOString()
      },
      errorLocation: `failed/${documentId}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error handler failed:', error);
    return {
      statusCode: 500,
      documentId: event.documentId,
      error: error.message,
      status: 'ERROR_HANDLER_FAILED',
      timestamp: new Date().toISOString()
    };
  }
};
