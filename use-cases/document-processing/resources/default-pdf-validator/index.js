exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract document info from event
    const { documentId, bucket, key } = event;
    
    // Basic validation
    if (!documentId || !bucket || !key) {
      throw new Error('Missing required fields: documentId, bucket, or key');
    }
    
    // Check file extension
    if (!key.toLowerCase().endsWith('.pdf')) {
      throw new Error('Invalid file format. Only PDF files are supported.');
    }
    
    return {
      statusCode: 200,
      documentId,
      bucket,
      key,
      status: 'VALID',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      statusCode: 400,
      documentId: event.documentId,
      error: error.message,
      status: 'INVALID',
      timestamp: new Date().toISOString()
    };
  }
};
