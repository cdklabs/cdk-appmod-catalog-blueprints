import os
import json
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from strands import tool


# Embedded historical data for baseline statistics
HISTORICAL_DATA = {
    "vendors": {
        "Acme Corp": {
            "average_amount": 1500.00,
            "std_dev": 300.00,
            "typical_range": [800, 2500],
            "transaction_count": 45
        },
        "Global Supplies Inc": {
            "average_amount": 3200.00,
            "std_dev": 650.00,
            "typical_range": [2000, 5000],
            "transaction_count": 32
        },
        "Tech Solutions LLC": {
            "average_amount": 5500.00,
            "std_dev": 1200.00,
            "typical_range": [3000, 8000],
            "transaction_count": 28
        },
        "Office Depot": {
            "average_amount": 450.00,
            "std_dev": 150.00,
            "typical_range": [200, 800],
            "transaction_count": 67
        },
        "Premier Services": {
            "average_amount": 2800.00,
            "std_dev": 500.00,
            "typical_range": [1500, 4500],
            "transaction_count": 38
        }
    },
    "categories": {
        "office_supplies": {
            "average_amount": 350.00,
            "std_dev": 120.00,
            "typical_range": [100, 700]
        },
        "software": {
            "average_amount": 2500.00,
            "std_dev": 800.00,
            "typical_range": [500, 5000]
        },
        "consulting": {
            "average_amount": 4500.00,
            "std_dev": 1500.00,
            "typical_range": [2000, 8000]
        },
        "equipment": {
            "average_amount": 3800.00,
            "std_dev": 1200.00,
            "typical_range": [1000, 7000]
        }
    },
    "overall": {
        "average_amount": 2100.00,
        "std_dev": 1800.00,
        "typical_range": [20, 8000]
    }
}

# US Federal Holidays (2024-2025)
FEDERAL_HOLIDAYS = [
    "2024-01-01", "2024-01-15", "2024-02-19", "2024-05-27", "2024-06-19",
    "2024-07-04", "2024-09-02", "2024-10-14", "2024-11-11", "2024-11-28",
    "2024-12-25",
    "2025-01-01", "2025-01-20", "2025-02-17", "2025-05-26", "2025-06-19",
    "2025-07-04", "2025-09-01", "2025-10-13", "2025-11-11", "2025-11-27",
    "2025-12-25"
]


@tool
def detect_anomalies(
    document_text: str,
    vendor_name: str,
    amount: float,
    date: str
) -> Dict[str, Any]:
    """Detect statistical anomalies in document data
    
    Analyzes financial documents for statistical anomalies including amount outliers,
    unusual date patterns (weekends, holidays), and geographic anomalies. Compares
    transaction amounts against historical baselines and calculates severity scores.
    
    Args:
        document_text (str): Extracted text content from the document
        vendor_name (str): Vendor name from the document
        amount (float): Transaction amount
        date (str): Transaction date (format: YYYY-MM-DD or similar)
        
    Returns:
        dict: A structured dictionary containing:
            - anomalies: List of detected anomalies with type, value, expected_range, and severity_score
            - statistical_analysis: Statistical metrics including z-score and percentile
    """
    result = {
        "anomalies": [],
        "statistical_analysis": {}
    }
    
    # Validate inputs
    if not vendor_name or amount is None:
        result["anomalies"].append({
            "type": "missing_data",
            "value": None,
            "expected_range": "N/A",
            "severity_score": 0,
            "description": "Missing required data for anomaly detection"
        })
        return result
    
    # Check for amount anomalies
    result = _check_amount_anomalies(vendor_name, amount, result)
    
    # Check for date anomalies
    if date:
        result = _check_date_anomalies(date, result)
    
    # Check for geographic anomalies (if location data available)
    result = _check_geographic_anomalies(document_text, vendor_name, result)
    
    # Check for frequency anomalies (if multiple transactions detected)
    result = _check_frequency_anomalies(document_text, result)
    
    return result


def _check_amount_anomalies(vendor_name: str, amount: float, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check for amount outliers using Z-score analysis"""
    
    # Try to find vendor-specific baseline
    vendor_data = None
    for vendor_key in HISTORICAL_DATA["vendors"]:
        if vendor_key.lower() in vendor_name.lower() or vendor_name.lower() in vendor_key.lower():
            vendor_data = HISTORICAL_DATA["vendors"][vendor_key]
            break
    
    # Use vendor-specific data if available, otherwise use overall baseline
    if vendor_data:
        avg_amount = vendor_data["average_amount"]
        std_dev = vendor_data["std_dev"]
        typical_range = vendor_data["typical_range"]
        baseline_type = f"vendor-specific ({vendor_name})"
    else:
        avg_amount = HISTORICAL_DATA["overall"]["average_amount"]
        std_dev = HISTORICAL_DATA["overall"]["std_dev"]
        typical_range = HISTORICAL_DATA["overall"]["typical_range"]
        baseline_type = "overall baseline"
    
    # Calculate Z-score
    if std_dev > 0:
        z_score = (amount - avg_amount) / std_dev
    else:
        z_score = 0
    
    # Store statistical analysis
    result["statistical_analysis"]["z_score"] = round(z_score, 2)
    result["statistical_analysis"]["baseline_average"] = avg_amount
    result["statistical_analysis"]["baseline_std_dev"] = std_dev
    result["statistical_analysis"]["baseline_type"] = baseline_type
    
    # Calculate percentile (approximate)
    if z_score > 0:
        percentile = min(99.9, 50 + (z_score / 6) * 50)
    else:
        percentile = max(0.1, 50 + (z_score / 6) * 50)
    result["statistical_analysis"]["percentile"] = round(percentile, 1)
    
    # Detect outliers based on Z-score
    if abs(z_score) >= 3:
        severity_score = min(10, int(abs(z_score)))
        
        if amount > avg_amount:
            description = f"Amount ${amount:,.2f} is significantly higher than expected (Z-score: {z_score:.2f})"
        else:
            description = f"Amount ${amount:,.2f} is significantly lower than expected (Z-score: {z_score:.2f})"
        
        result["anomalies"].append({
            "type": "amount_outlier",
            "value": amount,
            "expected_range": f"${typical_range[0]:,.2f} - ${typical_range[1]:,.2f}",
            "severity_score": severity_score,
            "description": description
        })
    
    elif abs(z_score) >= 2:
        severity_score = 5
        result["anomalies"].append({
            "type": "amount_unusual",
            "value": amount,
            "expected_range": f"${typical_range[0]:,.2f} - ${typical_range[1]:,.2f}",
            "severity_score": severity_score,
            "description": f"Amount ${amount:,.2f} is moderately unusual (Z-score: {z_score:.2f})"
        })
    
    # Check if amount is outside typical range
    if amount < typical_range[0] or amount > typical_range[1]:
        if not any(a["type"] in ["amount_outlier", "amount_unusual"] for a in result["anomalies"]):
            severity_score = 3
            result["anomalies"].append({
                "type": "amount_outside_range",
                "value": amount,
                "expected_range": f"${typical_range[0]:,.2f} - ${typical_range[1]:,.2f}",
                "severity_score": severity_score,
                "description": f"Amount ${amount:,.2f} is outside typical range for {baseline_type}"
            })
    
    return result


def _check_date_anomalies(date_str: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check for unusual date patterns"""
    
    # Parse date
    parsed_date = _parse_date(date_str)
    if not parsed_date:
        result["anomalies"].append({
            "type": "invalid_date",
            "value": date_str,
            "expected_range": "Valid date format",
            "severity_score": 2,
            "description": f"Unable to parse date: {date_str}"
        })
        return result
    
    # Check if date is a weekend
    if parsed_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
        day_name = parsed_date.strftime("%A")
        result["anomalies"].append({
            "type": "weekend_transaction",
            "value": parsed_date.strftime("%Y-%m-%d"),
            "expected_range": "Monday-Friday",
            "severity_score": 4,
            "description": f"Transaction occurred on {day_name}, which is unusual for business transactions"
        })
    
    # Check if date is a federal holiday
    date_str_normalized = parsed_date.strftime("%Y-%m-%d")
    if date_str_normalized in FEDERAL_HOLIDAYS:
        result["anomalies"].append({
            "type": "holiday_transaction",
            "value": date_str_normalized,
            "expected_range": "Non-holiday business days",
            "severity_score": 6,
            "description": f"Transaction occurred on a federal holiday: {date_str_normalized}"
        })
    
    # Check if date is in the future (allow 1 day grace period for timezone differences)
    current_date = datetime.now().date()
    parsed_date_only = parsed_date.date()
    
    # Initialize statistical_analysis if it doesn't exist
    if "statistical_analysis" not in result:
        result["statistical_analysis"] = {}
    
    # Debug: Add current date to result for troubleshooting
    result["statistical_analysis"]["current_date"] = current_date.strftime('%Y-%m-%d')
    result["statistical_analysis"]["transaction_date"] = parsed_date_only.strftime('%Y-%m-%d')
    
    # Only flag dates that are significantly in the future (more than 7 days)
    # This avoids false positives from timezone issues or recent transactions
    if parsed_date_only > current_date + timedelta(days=7):
        days_future = (parsed_date_only - current_date).days
        result["anomalies"].append({
            "type": "future_date",
            "value": date_str_normalized,
            "expected_range": f"On or before {current_date.strftime('%Y-%m-%d')}",
            "severity_score": 9,
            "description": f"Transaction date is {days_future} days in the future"
        })
    
    # Check if date is very old (more than 2 years ago)
    if parsed_date_only < current_date - timedelta(days=730):
        years_old = (current_date - parsed_date_only).days / 365
        result["anomalies"].append({
            "type": "very_old_transaction",
            "value": date_str_normalized,
            "expected_range": "Within last 2 years",
            "severity_score": 5,
            "description": f"Transaction date is {years_old:.1f} years old, which is unusual for current processing"
        })
    
    return result


def _check_geographic_anomalies(document_text: str, vendor_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check for geographic anomalies if location data is available"""
    
    # Extract location information from document text
    # Common patterns for addresses and locations
    location_patterns = [
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b',  # City, ST
        r'\b([A-Z]{2})\s+\d{5}\b',  # ST ZIP
        r'\bcountry:\s*([A-Za-z\s]+)',  # Country: Name
    ]
    
    import re
    locations_found = []
    
    for pattern in location_patterns:
        matches = re.finditer(pattern, document_text, re.IGNORECASE)
        for match in matches:
            locations_found.append(match.group(0))
    
    # Check for international transactions (simplified check)
    international_indicators = [
        'international', 'foreign', 'overseas', 'wire transfer',
        'swift', 'iban', 'gbp', 'eur', 'cad', 'aud'
    ]
    
    is_international = any(
        indicator in document_text.lower() 
        for indicator in international_indicators
    )
    
    if is_international:
        result["anomalies"].append({
            "type": "international_transaction",
            "value": "International payment detected",
            "expected_range": "Domestic transactions",
            "severity_score": 6,
            "description": "Transaction appears to be international, which may require additional verification"
        })
    
    # Check for multiple locations in document (may indicate forgery)
    if len(set(locations_found)) > 2:
        result["anomalies"].append({
            "type": "multiple_locations",
            "value": f"{len(set(locations_found))} different locations",
            "expected_range": "1-2 locations",
            "severity_score": 4,
            "description": f"Document contains multiple different locations: {', '.join(set(locations_found)[:3])}"
        })
    
    return result


def _check_frequency_anomalies(document_text: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check for frequency anomalies (multiple transactions in short period)"""
    
    # Extract multiple dates from document if present
    import re
    date_patterns = [
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
        r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b'
    ]
    
    dates_found = []
    for pattern in date_patterns:
        matches = re.finditer(pattern, document_text, re.IGNORECASE)
        for match in matches:
            parsed = _parse_date(match.group(0))
            if parsed:
                dates_found.append(parsed)
    
    # Check if multiple transactions on same day
    if len(dates_found) > 3:
        unique_dates = set(d.strftime("%Y-%m-%d") for d in dates_found)
        if len(unique_dates) < len(dates_found) / 2:
            result["anomalies"].append({
                "type": "high_frequency_transactions",
                "value": f"{len(dates_found)} transactions",
                "expected_range": "1-3 transactions per document",
                "severity_score": 5,
                "description": f"Document contains {len(dates_found)} transactions, which is unusually high"
            })
    
    return result


def _parse_date(date_str: str) -> Optional[datetime]:
    """Parse date from various formats"""
    if not date_str:
        return None
    
    # Common date formats
    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%m-%d-%Y",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
    ]
    
    # Clean up the date string
    date_str = date_str.strip()
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    return None
