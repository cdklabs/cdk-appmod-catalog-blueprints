import os
import json
from datetime import datetime
from pypdf import PdfReader
from strands import tool
from typing import Dict, Any


def log(level: str, stage: str, document_filename: str, message: str, details: Dict[str, Any] = None):
    """Structured logging function for JSON format logs"""
    log_entry = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'level': level,
        'stage': stage,
        'documentFilename': document_filename,
        'message': message
    }
    if details:
        log_entry['details'] = details
    
    print(json.dumps(log_entry))


@tool
def extract_pdf_text(file_path: str) -> Dict[str, Any]:
    """Extract text content from PDF documents
    
    Reads a PDF file from the local file system and extracts all text content from all pages.
    Handles multi-page PDFs and preserves text structure where possible.
    
    Args:
        file_path (str): Local file path to the PDF file
        
    Returns:
        dict: Extraction results including:
            - success: Boolean indicating if extraction succeeded
            - text: Extracted text content from all pages
            - pageCount: Number of pages in the PDF
            - error: Error message if extraction failed
    """
    # Extract filename for logging
    document_filename = os.path.basename(file_path) if file_path else 'unknown'
    
    log('INFO', 'extraction', document_filename, 'Starting PDF text extraction',
        {'filePath': file_path})
    
    try:
        # Verify file exists
        if not os.path.exists(file_path):
            error_msg = f'File not found: {file_path}'
            log('ERROR', 'extraction', document_filename, 'PDF file not found',
                {'error': error_msg})
            return {
                'success': False,
                'text': '',
                'error': error_msg
            }
        
        # Extract text from all pages
        reader = PdfReader(file_path)
        text = ''
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + '\n'
        
        page_count = len(reader.pages)
        
        log('INFO', 'extraction', document_filename, 'Successfully extracted PDF text',
            {'pageCount': page_count, 'textLength': len(text.strip())})
        
        return {
            'success': True,
            'text': text.strip(),
            'pageCount': str(page_count)  # Convert to string to avoid type errors
        }
    except Exception as e:
        error_msg = str(e)
        log('ERROR', 'extraction', document_filename, 'PDF extraction failed',
            {'error': error_msg, 'errorType': type(e).__name__})
        return {
            'success': False,
            'text': '',
            'error': error_msg
        }
