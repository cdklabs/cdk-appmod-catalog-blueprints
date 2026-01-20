import re
from typing import Dict, Any, Optional
from strands import tool


@tool
def extract_document_fields(file_path: str) -> Dict[str, Any]:
    """Extract key fields from financial document
    
    Reads PDF or text files and parses financial documents (receipts, invoices, statements) 
    to extract structured information including vendor name, amounts, dates, and document numbers.
    
    Args:
        file_path (str): Path to the document file (PDF or text)
        
    Returns:
        dict: Extracted fields including:
            - document_text: Full extracted text from the document
            - vendor_name: Business/company name
            - total_amount: Final total amount as float
            - transaction_date: Date in YYYY-MM-DD format
            - document_number: Invoice/receipt number
            - subtotal: Subtotal amount if available
            - tax_amount: Tax amount if available
    """
    # First, extract text from the document
    document_text = _read_document(file_path)
    
    if not document_text:
        return {
            "document_text": "",
            "vendor_name": None,
            "total_amount": 0.0,
            "transaction_date": None,
            "document_number": None,
            "subtotal": None,
            "tax_amount": None,
            "extraction_notes": ["Failed to read document file"]
        }
    
    result = {
        "document_text": document_text,
        "vendor_name": None,
        "total_amount": 0.0,
        "transaction_date": None,
        "document_number": None,
        "subtotal": None,
        "tax_amount": None,
        "extraction_notes": []
    }
    
    # Extract vendor name (usually at the top of the document)
    vendor_name = _extract_vendor_name(document_text)
    if vendor_name:
        result["vendor_name"] = vendor_name
    else:
        result["extraction_notes"].append("Could not extract vendor name")
    
    # Extract total amount
    total_amount = _extract_total_amount(document_text)
    if total_amount is not None:
        result["total_amount"] = total_amount
    else:
        result["extraction_notes"].append("Could not extract total amount - defaulting to 0.0")
    
    # Extract subtotal and tax
    subtotal = _extract_subtotal(document_text)
    if subtotal is not None:
        result["subtotal"] = subtotal
    
    tax_amount = _extract_tax(document_text)
    if tax_amount is not None:
        result["tax_amount"] = tax_amount
    
    # Extract date
    transaction_date = _extract_date(document_text)
    if transaction_date:
        result["transaction_date"] = transaction_date
    else:
        result["extraction_notes"].append("Could not extract transaction date")
    
    # Extract document number
    doc_number = _extract_document_number(document_text)
    if doc_number:
        result["document_number"] = doc_number
    
    return result


def _read_document(file_path: str) -> Optional[str]:
    """Read document and extract text content"""
    try:
        # Try reading as PDF first
        if file_path.lower().endswith('.pdf'):
            try:
                import PyPDF2
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    text = ""
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
                    return text.strip()
            except Exception as pdf_error:
                # If PyPDF2 fails, try reading as text
                pass
        
        # Try reading as plain text
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
            return file.read()
            
    except Exception as e:
        return None


def _extract_vendor_name(text: str) -> Optional[str]:
    """Extract vendor/company name from document"""
    # Look for common patterns at the beginning of the document
    lines = text.strip().split('\n')
    
    # Skip common headers
    skip_words = ['receipt', 'invoice', 'statement', 'bill', 'order']
    
    for line in lines[:10]:  # Check first 10 lines
        line = line.strip()
        if not line or len(line) < 3:
            continue
        
        # Skip lines that are just headers
        if any(word in line.lower() for word in skip_words) and len(line.split()) <= 2:
            continue
        
        # Skip lines with just numbers or dates
        if re.match(r'^[\d\s\-/:.]+$', line):
            continue
        
        # If line has reasonable length and contains letters, it's likely the vendor
        if 3 <= len(line) <= 100 and re.search(r'[a-zA-Z]', line):
            # Clean up the line
            vendor = re.sub(r'\s+', ' ', line).strip()
            return vendor
    
    return None


def _extract_total_amount(text: str) -> Optional[float]:
    """Extract total amount from document"""
    # Patterns for total amount - ordered by priority (most specific first)
    total_patterns = [
        r'(?:grand\s+total|total\s+amount|amount\s+due|balance\s+due)[\s:]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        r'(?:^|\n)\s*total[\s:]+\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # "Total:" at start of line
        r'(?:total)[\s:]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
    ]
    
    # Search for total amount (case insensitive)
    for pattern in total_patterns:
        matches = list(re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE))
        if matches:
            # Use the LAST match (typically the final total after subtotal/tax)
            match = matches[-1]
            amount_str = match.group(1).replace(',', '')
            try:
                amount = float(amount_str)
                # Sanity check - amounts should be positive and reasonable
                if 0 < amount < 1000000:
                    return amount
            except ValueError:
                continue
    
    # If no explicit total found, look for the largest amount in the document
    # This is a fallback and might not always be accurate
    all_amounts = re.findall(r'\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', text)
    if all_amounts:
        amounts = []
        for amt_str in all_amounts:
            try:
                amt = float(amt_str.replace(',', ''))
                if 0 < amt < 1000000:
                    amounts.append(amt)
            except ValueError:
                continue
        
        if amounts:
            # Return the largest amount as a best guess
            return max(amounts)
    
    return None


def _extract_subtotal(text: str) -> Optional[float]:
    """Extract subtotal amount from document"""
    subtotal_patterns = [
        r'subtotal[\s:]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        r'sub-total[\s:]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
    ]
    
    for pattern in subtotal_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                return float(amount_str)
            except ValueError:
                continue
    
    return None


def _extract_tax(text: str) -> Optional[float]:
    """Extract tax amount from document"""
    tax_patterns = [
        r'tax[\s:]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        r'sales\s+tax[\s:]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        r'vat[\s:]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
    ]
    
    for pattern in tax_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                return float(amount_str)
            except ValueError:
                continue
    
    return None


def _extract_date(text: str) -> Optional[str]:
    """Extract transaction date and convert to YYYY-MM-DD format"""
    from datetime import datetime
    
    # Date patterns
    date_patterns = [
        (r'date[\s:]*(\w+\s+\d{1,2},?\s+\d{4})', '%B %d, %Y'),  # January 13, 2026
        (r'date[\s:]*(\w+\s+\d{1,2},?\s+\d{4})', '%b %d, %Y'),   # Jan 13, 2026
        (r'date[\s:]*(\d{1,2}/\d{1,2}/\d{4})', '%m/%d/%Y'),      # 01/13/2026
        (r'date[\s:]*(\d{4}-\d{2}-\d{2})', '%Y-%m-%d'),          # 2026-01-13
        (r'(\w+\s+\d{1,2},?\s+\d{4})', '%B %d, %Y'),             # January 13, 2026 (without "date:")
        (r'(\w+\s+\d{1,2},?\s+\d{4})', '%b %d, %Y'),             # Jan 13, 2026 (without "date:")
    ]
    
    for pattern, date_format in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1).strip()
            try:
                parsed_date = datetime.strptime(date_str, date_format)
                return parsed_date.strftime('%Y-%m-%d')
            except ValueError:
                continue
    
    return None


def _extract_document_number(text: str) -> Optional[str]:
    """Extract invoice/receipt number from document"""
    doc_number_patterns = [
        r'(?:invoice|receipt|order|reference)[\s#:]*([A-Z0-9\-]+)',
        r'(?:invoice|receipt|order|reference)\s+(?:number|no|#)[\s:]*([A-Z0-9\-]+)',
        r'#[\s:]*([A-Z0-9\-]{5,})',
    ]
    
    for pattern in doc_number_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            doc_num = match.group(1).strip()
            # Sanity check - should have reasonable length
            if 3 <= len(doc_num) <= 50:
                return doc_num
    
    return None
