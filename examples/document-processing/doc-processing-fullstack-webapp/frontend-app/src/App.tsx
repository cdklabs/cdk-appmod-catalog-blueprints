// Configure API endpoint in .env file: REACT_APP_API_BASE_URL=your-api-gateway-url
import React, { useState } from 'react';
import './App.css';

type DocumentType = 'claim' | 'policy' | 'supporting';

interface ProcessingStatus {
  documentId: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'complete' | 'failed';
  filename: string;
  documentType: DocumentType;
  policyNumber?: string;
  processingResult?: {
    result: {
      claim_approved: boolean;
      justification: string;
    };
  };
  classificationResult?: {
    documentClassification: string;
  };
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

function App() {
  const [documentType, setDocumentType] = useState<DocumentType>('claim');
  const [policyNumber, setPolicyNumber] = useState('');
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleDocumentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDocumentType(e.target.value as DocumentType);
    // Clear previous upload status when document type changes
    setUploadSuccess(false);
    setStatus(null);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data:type;base64, prefix
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate policy number for supporting documents
    if (documentType === 'supporting' && !policyNumber.trim()) {
      alert('Policy number is required for supporting documents');
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);
    
    try {
      console.log('Starting upload process...');
      console.log('File:', selectedFile.name, selectedFile.type, selectedFile.size + ' bytes');

      // Step 1: Get presigned URL from API
      const presignedResponse = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          documentType,
          ...(policyNumber.trim() && { policyNumber: policyNumber.trim() })
        })
      });

      console.log('Presigned URL request:', presignedResponse.status);

      if (!presignedResponse.ok) {
        const errorText = await presignedResponse.text();
        console.error('Presigned URL request failed:', errorText);
        throw new Error(`Failed to get upload URL: ${presignedResponse.status}`);
      }

      const presignedResult = await presignedResponse.json();
      console.log('Document ID:', presignedResult.documentId);

      // Step 2: Upload file directly to S3 using presigned URL
      console.log('Starting S3 upload...');
      
      const uploadResponse = await fetch(presignedResult.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
        },
        body: selectedFile
      });

      console.log('S3 upload completed:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 upload failed:', errorText);
        throw new Error(`S3 upload failed: ${uploadResponse.status}`);
      }

      console.log('Upload successful.');
      
      // Show upload success with appropriate message
      setUploadSuccess(true);
      
      // Only start processing workflow for claims
      if (documentType === 'claim') {
        setStatus({
          documentId: presignedResult.documentId,
          status: 'processing',
          filename: selectedFile.name,
          documentType,
          policyNumber: policyNumber.trim() || undefined
        });

        // Poll for status updates
        pollStatus(presignedResult.documentId);
      } else {
        // For policies and supporting documents, just show upload success
        setStatus({
          documentId: presignedResult.documentId,
          status: 'uploaded',
          filename: selectedFile.name,
          documentType,
          policyNumber: policyNumber.trim() || undefined
        });
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setStatus({
        documentId: 'error',
        status: 'failed',
        filename: selectedFile.name,
        documentType,
        policyNumber: policyNumber.trim() || undefined
      });
    } finally {
      setIsUploading(false);
    }
  };

  const pollStatus = async (documentId: string) => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        console.log(`Polling attempt ${attempts + 1}/${maxAttempts} for document: ${documentId}`);
        const statusResponse = await fetch(`${API_BASE_URL}/documents/${documentId}/status`);
        
        if (statusResponse.status === 404) {
          console.log('Document not found yet, continuing to poll...');
          // Document not found yet, continue polling
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000); // Poll every 10 seconds
          } else {
            console.log('Max polling attempts reached');
            setStatus(prev => prev ? { ...prev, status: 'failed' } : null);
          }
          return;
        }
        
        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`);
        }
        
        const statusData = await statusResponse.json();
        console.log('Status data received:', statusData);
        
        setStatus(prev => prev ? { 
          ...prev, 
          status: statusData.status === 'classification-complete' ? 'processing' : statusData.status,
          ...(statusData.processingResult && { processingResult: statusData.processingResult }),
          ...(statusData.classificationResult && { classificationResult: statusData.classificationResult })
        } : null);

        if (statusData.status === 'completed' || statusData.status === 'complete') {
          console.log('Document processing completed');
          return;
        }

        if (statusData.status === 'failed' || statusData.status === 'processing-failure') {
          console.log('Document processing failed');
          return;
        }

        // Continue polling if still processing (including classification_complete)
        console.log('Still processing, continuing to poll...');
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          console.log('Max polling attempts reached');
          setStatus(prev => prev ? { ...prev, status: 'failed' } : null);
        }
      } catch (error) {
        console.error('Status polling error:', error);
        // Continue polling on error (except 404 which is handled above)
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setStatus(prev => prev ? { ...prev, status: 'failed' } : null);
        }
      }
    };

    poll();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return '#3498db';
      case 'processing': return '#f39c12';
      case 'completed': return '#27ae60';
      case 'failed': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading': return '↑';
      case 'processing': return '○';
      case 'completed': return '✓';
      case 'failed': return '✗';
      default: return '•';
    }
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="header">
          <h1 className="title">AI-Powered Insurance Claims Document Processor</h1>
          <p className="subtitle">Upload documents for intelligent analysis and data extraction</p>
        </div>

        <div className="upload-section">
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="document-type" className="form-label">Document Type</label>
              <select 
                id="document-type"
                value={documentType}
                onChange={handleDocumentTypeChange}
                className="form-select"
              >
                <option value="claim">Insurance Claim</option>
                <option value="policy">Policy Document</option>
                <option value="supporting">Supporting Document</option>
              </select>
            </div>

            {(documentType === 'supporting' || documentType === 'policy') && (
              <div className="form-group">
                <label htmlFor="policy-number" className="form-label">
                  Policy Number {documentType === 'supporting' ? '*' : ''}
                </label>
                <input
                  id="policy-number"
                  type="text"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="Enter policy number"
                  className="form-input"
                  required={documentType === 'supporting'}
                />
              </div>
            )}
          </div>

          <div className="upload-area">
            <input 
              type="file" 
              accept=".pdf,.jpg,.png,.jpeg"
              onChange={handleFileUpload}
              id="file-input"
              className="file-input"
              disabled={isUploading}
            />
            <label htmlFor="file-input" className={`upload-button ${isUploading ? 'disabled' : ''}`}>
              {isUploading ? 'Uploading...' : 'Choose Document'}
            </label>
            <p className="upload-hint">Supports PDF, JPG, PNG files</p>
          </div>
        </div>

        {uploadSuccess && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '5px',
            color: '#155724'
          }}>
            <strong>Upload Successful!</strong> {
              status?.documentType === 'claim' 
                ? 'Please check back in a few moments for the results of your insurance claims application.'
                : status?.documentType === 'policy'
                ? 'Your policy document has been uploaded successfully. Please proceed to file your claim.'
                : 'Your supporting document has been uploaded successfully. Please proceed to file your claim.'
            }
          </div>
        )}

        {status && (
          <div className="status-card">
            <div className="status-header">
              <h3>Processing Status</h3>
            </div>
            
            <div className="status-info">
              <div className="info-row">
                <span className="label">File:</span>
                <span className="value">{status.filename}</span>
              </div>
              <div className="info-row">
                <span className="label">Type:</span>
                <span className="value">{status.documentType}</span>
              </div>
              {status.policyNumber && (
                <div className="info-row">
                  <span className="label">Policy:</span>
                  <span className="value">{status.policyNumber}</span>
                </div>
              )}
              <div className="info-row">
                <span className="label">Status:</span>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(status.status) }}
                >
                  {status.status.toUpperCase()}
                </span>
              </div>
            </div>

            {status.status === 'processing' && (
              <div className="loading-bar">
                <div className="loading-progress"></div>
              </div>
            )}
            
            {(status.status === 'completed' || status.status === 'complete') && status.processingResult?.result && (
              <div className="results-section">
                <h4 className="results-title">Processing Results</h4>
                <div className="document-type">
                  <span className="type-label">Classification:</span>
                  <span className="type-value">{status.classificationResult?.documentClassification || 'Unknown'}</span>
                </div>
                
                <div className="approval-section">
                  <div className="approval-status">
                    <span className="approval-label">Claim Status:</span>
                    <span className={`approval-badge ${status.processingResult.result.claim_approved ? 'approved' : 'rejected'}`}>
                      {status.processingResult.result.claim_approved ? 'APPROVED' : 'REJECTED'}
                    </span>
                  </div>
                  <div className="justification">
                    <span className="justification-label">Justification:</span>
                    <p className="justification-text">{status.processingResult.result.justification}</p>
                  </div>
                </div>
              </div>
            )}

            {status.status === 'failed' && (
              <div className="error-section">
                <p className="error-message">Processing failed. Please try again.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
