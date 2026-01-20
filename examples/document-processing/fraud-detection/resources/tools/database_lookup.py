import os
import json
from typing import Dict, List, Any, Optional
from strands import tool


# Embedded blacklist database
BLACKLIST_DATABASE = {
    "Fake Supplies Co": {
        "reason": "Known fraudulent entity - multiple reports of fake invoices",
        "date_added": "2024-01-15",
        "severity": "critical"
    },
    "Phantom Services LLC": {
        "reason": "Shell company used for invoice fraud schemes",
        "date_added": "2024-02-20",
        "severity": "critical"
    },
    "QuickCash Vendors": {
        "reason": "Associated with payment diversion fraud",
        "date_added": "2024-03-10",
        "severity": "high"
    },
    "Global Trade Partners": {
        "reason": "Suspected money laundering operation",
        "date_added": "2024-04-05",
        "severity": "critical"
    },
    "Express Invoice Solutions": {
        "reason": "Duplicate invoice fraud - multiple victims reported",
        "date_added": "2024-05-12",
        "severity": "high"
    },
    "Premier Consulting Group": {
        "reason": "Fake consulting services - no legitimate business registration",
        "date_added": "2024-06-18",
        "severity": "high"
    },
    "Discount Office Supplies": {
        "reason": "Counterfeit goods and fraudulent billing",
        "date_added": "2024-07-22",
        "severity": "medium"
    },
    "International Trade Corp": {
        "reason": "Wire transfer fraud scheme",
        "date_added": "2024-08-30",
        "severity": "critical"
    },
    "Budget Solutions Inc": {
        "reason": "Identity theft - impersonating legitimate business",
        "date_added": "2024-09-14",
        "severity": "high"
    },
    "Rapid Services Ltd": {
        "reason": "Payment card fraud and fake invoices",
        "date_added": "2024-10-08",
        "severity": "high"
    }
}

# Embedded verified vendors database
VERIFIED_VENDORS = {
    "Acme Corporation": {
        "business_registered": True,
        "registration_number": "REG-2015-001234",
        "tax_id": "12-3456789",
        "address": "123 Business St, New York, NY 10001",
        "phone": "+1-555-0100",
        "verification_date": "2024-01-10",
        "years_in_business": 9
    },
    "Global Supplies Inc": {
        "business_registered": True,
        "registration_number": "REG-2018-005678",
        "tax_id": "23-4567890",
        "address": "456 Commerce Ave, Chicago, IL 60601",
        "phone": "+1-555-0200",
        "verification_date": "2024-02-15",
        "years_in_business": 6
    },
    "Tech Solutions LLC": {
        "business_registered": True,
        "registration_number": "REG-2016-002345",
        "tax_id": "34-5678901",
        "address": "789 Tech Blvd, San Francisco, CA 94102",
        "phone": "+1-555-0300",
        "verification_date": "2024-03-20",
        "years_in_business": 8
    },
    "Office Depot": {
        "business_registered": True,
        "registration_number": "REG-1986-000123",
        "tax_id": "45-6789012",
        "address": "6600 North Military Trail, Boca Raton, FL 33496",
        "phone": "+1-555-0400",
        "verification_date": "2024-01-05",
        "years_in_business": 38
    },
    "Premier Services": {
        "business_registered": True,
        "registration_number": "REG-2019-007890",
        "tax_id": "56-7890123",
        "address": "321 Service Dr, Boston, MA 02101",
        "phone": "+1-555-0500",
        "verification_date": "2024-04-12",
        "years_in_business": 5
    },
    "Reliable Consulting Group": {
        "business_registered": True,
        "registration_number": "REG-2017-003456",
        "tax_id": "67-8901234",
        "address": "555 Consultant Way, Seattle, WA 98101",
        "phone": "+1-555-0600",
        "verification_date": "2024-05-18",
        "years_in_business": 7
    },
    "Quality Equipment Co": {
        "business_registered": True,
        "registration_number": "REG-2014-001567",
        "tax_id": "78-9012345",
        "address": "888 Equipment Rd, Denver, CO 80201",
        "phone": "+1-555-0700",
        "verification_date": "2024-06-22",
        "years_in_business": 10
    },
    "Professional IT Services": {
        "business_registered": True,
        "registration_number": "REG-2020-008901",
        "tax_id": "89-0123456",
        "address": "999 IT Plaza, Austin, TX 78701",
        "phone": "+1-555-0800",
        "verification_date": "2024-07-30",
        "years_in_business": 4
    },
    "Enterprise Solutions Inc": {
        "business_registered": True,
        "registration_number": "REG-2013-001890",
        "tax_id": "90-1234567",
        "address": "777 Enterprise Blvd, Atlanta, GA 30301",
        "phone": "+1-555-0900",
        "verification_date": "2024-08-15",
        "years_in_business": 11
    },
    "Trusted Vendors LLC": {
        "business_registered": True,
        "registration_number": "REG-2021-009012",
        "tax_id": "01-2345678",
        "address": "444 Trust Ave, Miami, FL 33101",
        "phone": "+1-555-1000",
        "verification_date": "2024-09-20",
        "years_in_business": 3
    }
}

# Embedded compromised accounts database
COMPROMISED_ACCOUNTS = {
    "ACC-9876543210": {
        "date_compromised": "2024-08-15",
        "incident_type": "Account takeover",
        "status": "active_fraud"
    },
    "ACC-1234567890": {
        "date_compromised": "2024-09-22",
        "incident_type": "Payment diversion",
        "status": "active_fraud"
    },
    "ACC-5555555555": {
        "date_compromised": "2024-07-10",
        "incident_type": "Unauthorized access",
        "status": "under_investigation"
    },
    "ACC-7777777777": {
        "date_compromised": "2024-10-05",
        "incident_type": "Credential theft",
        "status": "active_fraud"
    },
    "ACC-3333333333": {
        "date_compromised": "2024-06-18",
        "incident_type": "Wire transfer fraud",
        "status": "resolved"
    }
}


@tool
def lookup_vendor(
    vendor_name: str,
    account_number: Optional[str] = None,
    tax_id: Optional[str] = None
) -> Dict[str, Any]:
    """Verify vendor legitimacy and check blacklists
    
    Checks vendor names against a blacklist of known fraudulent entities,
    verifies vendor legitimacy by checking against a database of registered
    businesses, and checks account numbers against a database of compromised
    accounts.
    
    Args:
        vendor_name (str): Name of the vendor to look up
        account_number (str, optional): Account number to verify
        tax_id (str, optional): Tax ID to verify
        
    Returns:
        dict: A structured dictionary containing:
            - blacklist_status: Information about blacklist check results
            - verification_status: Business registration and legitimacy verification
            - risk_indicators: List of identified risk factors
    """
    result = {
        "blacklist_status": {
            "is_blacklisted": False,
            "reason": None,
            "blacklist_entry": None
        },
        "verification_status": {
            "is_verified": False,
            "business_registered": False,
            "registration_details": None
        },
        "risk_indicators": []
    }
    
    if not vendor_name:
        result["risk_indicators"].append("Missing vendor name - unable to perform lookup")
        return result
    
    # Check vendor against blacklist
    result = _check_blacklist(vendor_name, result)
    
    # Verify vendor legitimacy
    result = _verify_vendor(vendor_name, tax_id, result)
    
    # Check account number if provided
    if account_number:
        result = _check_account_number(account_number, result)
    
    # Check tax ID if provided
    if tax_id:
        result = _check_tax_id(tax_id, result)
    
    return result


def _check_blacklist(vendor_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check vendor against blacklist database"""
    
    vendor_name_lower = vendor_name.lower().strip()
    
    # Check for exact match
    for blacklisted_vendor, details in BLACKLIST_DATABASE.items():
        if blacklisted_vendor.lower() == vendor_name_lower:
            result["blacklist_status"]["is_blacklisted"] = True
            result["blacklist_status"]["reason"] = details["reason"]
            result["blacklist_status"]["blacklist_entry"] = {
                "vendor_name": blacklisted_vendor,
                "date_added": details["date_added"],
                "severity": details["severity"]
            }
            result["risk_indicators"].append(
                f"CRITICAL: Vendor '{vendor_name}' is on the fraud blacklist - {details['reason']}"
            )
            return result
    
    # Check for partial match (fuzzy matching)
    for blacklisted_vendor, details in BLACKLIST_DATABASE.items():
        blacklisted_lower = blacklisted_vendor.lower()
        
        # Check if vendor name contains blacklisted name or vice versa
        if (blacklisted_lower in vendor_name_lower or 
            vendor_name_lower in blacklisted_lower):
            
            # Calculate similarity (simple word overlap)
            vendor_words = set(vendor_name_lower.split())
            blacklist_words = set(blacklisted_lower.split())
            overlap = len(vendor_words & blacklist_words)
            
            if overlap >= 2:  # At least 2 words match
                result["blacklist_status"]["is_blacklisted"] = True
                result["blacklist_status"]["reason"] = f"Partial match with blacklisted entity: {blacklisted_vendor}. {details['reason']}"
                result["blacklist_status"]["blacklist_entry"] = {
                    "vendor_name": blacklisted_vendor,
                    "date_added": details["date_added"],
                    "severity": details["severity"],
                    "match_type": "partial"
                }
                result["risk_indicators"].append(
                    f"HIGH: Vendor name '{vendor_name}' partially matches blacklisted entity '{blacklisted_vendor}'"
                )
                return result
    
    return result


def _verify_vendor(vendor_name: str, tax_id: Optional[str], result: Dict[str, Any]) -> Dict[str, Any]:
    """Verify vendor against legitimate business database"""
    
    vendor_name_lower = vendor_name.lower().strip()
    
    # Check for exact match
    for verified_vendor, details in VERIFIED_VENDORS.items():
        if verified_vendor.lower() == vendor_name_lower:
            result["verification_status"]["is_verified"] = True
            result["verification_status"]["business_registered"] = details["business_registered"]
            result["verification_status"]["registration_details"] = details
            
            # Verify tax ID if provided
            if tax_id and details.get("tax_id"):
                if tax_id.replace("-", "") == details["tax_id"].replace("-", ""):
                    result["risk_indicators"].append(
                        f"POSITIVE: Vendor verified with matching tax ID"
                    )
                else:
                    result["risk_indicators"].append(
                        f"WARNING: Tax ID mismatch - provided: {tax_id}, expected: {details['tax_id']}"
                    )
            
            return result
    
    # Check for partial match
    for verified_vendor, details in VERIFIED_VENDORS.items():
        verified_lower = verified_vendor.lower()
        
        # Check if vendor name contains verified name or vice versa
        if (verified_lower in vendor_name_lower or 
            vendor_name_lower in verified_lower):
            
            # Calculate similarity
            vendor_words = set(vendor_name_lower.split())
            verified_words = set(verified_lower.split())
            overlap = len(vendor_words & verified_words)
            
            if overlap >= 2:  # At least 2 words match
                result["verification_status"]["is_verified"] = True
                result["verification_status"]["business_registered"] = details["business_registered"]
                result["verification_status"]["registration_details"] = details
                result["risk_indicators"].append(
                    f"INFO: Vendor name '{vendor_name}' partially matches verified entity '{verified_vendor}' - verify exact name"
                )
                return result
    
    # Vendor not found in verified database
    result["verification_status"]["is_verified"] = False
    result["verification_status"]["business_registered"] = False
    result["risk_indicators"].append(
        f"WARNING: Vendor '{vendor_name}' not found in verified business database - requires manual verification"
    )
    
    return result


def _check_account_number(account_number: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check account number against compromised accounts database"""
    
    account_number_clean = account_number.strip().upper()
    
    # Check for exact match
    if account_number_clean in COMPROMISED_ACCOUNTS:
        details = COMPROMISED_ACCOUNTS[account_number_clean]
        result["risk_indicators"].append(
            f"CRITICAL: Account number '{account_number}' is in compromised accounts database - "
            f"{details['incident_type']} (Status: {details['status']})"
        )
        
        # Add compromised account details to result
        if "compromised_account_details" not in result:
            result["compromised_account_details"] = details
    
    # Check for partial match (last 4 digits)
    if len(account_number_clean) >= 4:
        last_four = account_number_clean[-4:]
        for compromised_account, details in COMPROMISED_ACCOUNTS.items():
            if compromised_account.endswith(last_four):
                result["risk_indicators"].append(
                    f"WARNING: Account number ends with same digits as compromised account - requires verification"
                )
                break
    
    return result


def _check_tax_id(tax_id: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Check tax ID format and validity"""
    
    tax_id_clean = tax_id.strip().replace("-", "").replace(" ", "")
    
    # Basic format validation (US EIN format: XX-XXXXXXX)
    if len(tax_id_clean) != 9 or not tax_id_clean.isdigit():
        result["risk_indicators"].append(
            f"WARNING: Tax ID '{tax_id}' has invalid format - expected format: XX-XXXXXXX"
        )
    
    # Check if tax ID matches verified vendor (already done in _verify_vendor)
    # This is a placeholder for additional tax ID validation logic
    
    return result
