import os
import re
import json
from typing import Dict, List, Any
from strands import tool

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None


# Embedded fraud pattern database
FRAUD_PATTERNS = {
    "duplicate_invoice": {
        "description": "Invoice number appears multiple times across different vendors",
        "severity": "high"
    },
    "rounded_amounts": {
        "description": "All amounts are rounded to whole numbers (ending in .00)",
        "severity": "medium"
    },
    "sequential_invoices": {
        "description": "Sequential invoice numbers from different vendors",
        "severity": "high"
    },
    "suspicious_keywords": {
        "description": "Document contains suspicious keywords or phrases",
        "keywords": [
            "urgent payment", "wire transfer immediately", "confidential",
            "do not verify", "bypass approval", "emergency payment"
        ],
        "severity": "medium"
    }
}


@tool
def match_patterns(file_path: str, document_text: str) -> Dict[str, Any]:
    """Check document against known fraud patterns
    
    Analyzes financial documents for known fraud patterns including duplicate
    invoice numbers, rounded amounts, sequential invoice numbers from different
    vendors, and suspicious formatting issues.
    
    Args:
        file_path (str): Local path to the document file
        document_text (str): Extracted text content from the document
        
    Returns:
        dict: A structured dictionary containing:
            - patterns_detected: List of detected fraud patterns with type, confidence, and description
            - formatting_issues: List of formatting anomalies that may indicate forgery
    """
    result = {
        "patterns_detected": [],
        "formatting_issues": []
    }
    
    if not document_text:
        result["patterns_detected"].append({
            "pattern_type": "empty_document",
            "description": "No text content provided for analysis",
            "confidence": 1.0,
            "details": {}
        })
        return result
    
    # Check for rounded amounts
    result = _check_rounded_amounts(document_text, result)
    
    # Check for duplicate invoice numbers (requires context from multiple documents)
    result = _check_duplicate_invoices(document_text, result)
    
    # Check for sequential invoice numbers
    result = _check_sequential_invoices(document_text, result)
    
    # Check for suspicious keywords
    result = _check_suspicious_keywords(document_text, result)
    
    # Analyze formatting if PDF
    if file_path and os.path.exists(file_path):
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == '.pdf':
            result = _analyze_pdf_formatting(file_path, result)
    
    return result


def _check_rounded_amounts(document_text: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check if all amounts are rounded to whole numbers"""
    # Extract monetary amounts using regex
    amount_patterns = [
        r'\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # $1,234.56
        r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|dollars?)',  # 1234.56 USD
        r'(?:total|amount|price|cost):\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # Total: $1234.56
    ]
    
    amounts = []
    for pattern in amount_patterns:
        matches = re.finditer(pattern, document_text, re.IGNORECASE)
        for match in matches:
            amount_str = match.group(1).replace(',', '')
            try:
                amounts.append(float(amount_str))
            except ValueError:
                continue
    
    if len(amounts) >= 3:  # Need at least 3 amounts to detect pattern
        rounded_count = sum(1 for amt in amounts if amt == int(amt) or str(amt).endswith('.00') or str(amt).endswith('.0'))
        rounded_percentage = rounded_count / len(amounts)
        
        if rounded_percentage >= 0.8:  # 80% or more are rounded
            result["patterns_detected"].append({
                "pattern_type": "rounded_amounts",
                "description": f"{rounded_count}/{len(amounts)} amounts are rounded to whole numbers, suggesting fabricated expenses",
                "confidence": min(0.95, rounded_percentage),
                "details": {
                    "total_amounts": len(amounts),
                    "rounded_amounts": rounded_count,
                    "percentage": round(rounded_percentage * 100, 2),
                    "sample_amounts": amounts[:5]
                }
            })
    
    return result


def _check_duplicate_invoices(document_text: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check for duplicate invoice numbers"""
    # Extract invoice numbers using common patterns
    invoice_patterns = [
        r'invoice\s*#?\s*:?\s*([A-Z0-9-]+)',
        r'inv\s*#?\s*:?\s*([A-Z0-9-]+)',
        r'invoice\s+number\s*:?\s*([A-Z0-9-]+)',
        r'#\s*([A-Z0-9]{5,})',
    ]
    
    invoice_numbers = []
    for pattern in invoice_patterns:
        matches = re.finditer(pattern, document_text, re.IGNORECASE)
        for match in matches:
            invoice_num = match.group(1).strip()
            if len(invoice_num) >= 4:  # Minimum length for valid invoice number
                invoice_numbers.append(invoice_num)
    
    # Check for duplicates within the document
    if len(invoice_numbers) != len(set(invoice_numbers)):
        duplicates = [num for num in invoice_numbers if invoice_numbers.count(num) > 1]
        result["patterns_detected"].append({
            "pattern_type": "duplicate_invoice",
            "description": f"Duplicate invoice numbers found within document: {', '.join(set(duplicates))}",
            "confidence": 0.9,
            "details": {
                "duplicate_numbers": list(set(duplicates)),
                "occurrences": {num: invoice_numbers.count(num) for num in set(duplicates)}
            }
        })
    
    return result


def _check_sequential_invoices(document_text: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check for sequential invoice numbers from different vendors"""
    # Extract invoice numbers
    invoice_pattern = r'invoice\s*#?\s*:?\s*([A-Z]*\d+)'
    matches = re.finditer(invoice_pattern, document_text, re.IGNORECASE)
    
    invoice_numbers = []
    for match in matches:
        inv_num = match.group(1).strip()
        # Extract numeric part
        numeric_part = re.search(r'\d+', inv_num)
        if numeric_part:
            invoice_numbers.append(int(numeric_part.group()))
    
    # Check if numbers are sequential
    if len(invoice_numbers) >= 2:
        invoice_numbers.sort()
        sequential_count = 0
        for i in range(len(invoice_numbers) - 1):
            if invoice_numbers[i+1] - invoice_numbers[i] == 1:
                sequential_count += 1
        
        if sequential_count >= 2:
            result["patterns_detected"].append({
                "pattern_type": "sequential_invoices",
                "description": "Sequential invoice numbers detected, which is unusual for different vendors",
                "confidence": 0.75,
                "details": {
                    "invoice_numbers": invoice_numbers,
                    "sequential_pairs": sequential_count
                }
            })
    
    return result


def _check_suspicious_keywords(document_text: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check for suspicious keywords that may indicate fraud"""
    suspicious_keywords = FRAUD_PATTERNS["suspicious_keywords"]["keywords"]
    
    found_keywords = []
    for keyword in suspicious_keywords:
        if re.search(r'\b' + re.escape(keyword) + r'\b', document_text, re.IGNORECASE):
            found_keywords.append(keyword)
    
    if found_keywords:
        result["patterns_detected"].append({
            "pattern_type": "suspicious_keywords",
            "description": f"Document contains suspicious keywords: {', '.join(found_keywords)}",
            "confidence": 0.6,
            "details": {
                "keywords_found": found_keywords,
                "total_found": len(found_keywords)
            }
        })
    
    return result


def _analyze_pdf_formatting(file_path: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze PDF formatting for inconsistencies"""
    if PyPDF2 is None:
        result["formatting_issues"].append({
            "issue_type": "analysis_unavailable",
            "description": "PyPDF2 library not available for formatting analysis",
            "severity": "low"
        })
        return result
    
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            # Check for inconsistent page sizes (may indicate document manipulation)
            if len(pdf_reader.pages) > 1:
                page_sizes = []
                for page in pdf_reader.pages:
                    if hasattr(page, 'mediabox'):
                        width = float(page.mediabox.width)
                        height = float(page.mediabox.height)
                        page_sizes.append((width, height))
                
                if len(set(page_sizes)) > 1:
                    result["formatting_issues"].append({
                        "issue_type": "inconsistent_page_sizes",
                        "description": "Document has inconsistent page sizes, which may indicate pages from different sources",
                        "severity": "medium",
                        "details": {
                            "unique_sizes": len(set(page_sizes)),
                            "page_sizes": page_sizes
                        }
                    })
            
            # Check for embedded fonts (lack of embedded fonts may indicate forgery)
            # Note: This is a simplified check; full font analysis requires more complex parsing
            metadata = pdf_reader.metadata
            if metadata:
                # Check if document was created with unusual software
                producer = str(metadata.get('/Producer', ''))
                creator = str(metadata.get('/Creator', ''))
                
                suspicious_creators = ['scanner', 'scan', 'online', 'converter', 'free']
                for suspicious in suspicious_creators:
                    if suspicious in producer.lower() or suspicious in creator.lower():
                        result["formatting_issues"].append({
                            "issue_type": "suspicious_creation_software",
                            "description": f"Document created with potentially suspicious software: {producer or creator}",
                            "severity": "low",
                            "details": {
                                "producer": producer,
                                "creator": creator
                            }
                        })
                        break
    
    except Exception as e:
        result["formatting_issues"].append({
            "issue_type": "formatting_analysis_error",
            "description": f"Error analyzing PDF formatting: {str(e)}",
            "severity": "low"
        })
    
    return result
