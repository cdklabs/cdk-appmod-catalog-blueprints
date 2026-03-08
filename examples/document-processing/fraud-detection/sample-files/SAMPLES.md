# Sample Documents for Fraud Detection Testing

This directory contains sample PDF documents for testing the fraud detection system. The documents are divided into two categories: legitimate and fraudulent.

## Legitimate Documents

These documents represent normal, legitimate financial transactions with realistic metadata and content:

### 1. legitimate_invoice_1.pdf
- **Type**: Invoice
- **Vendor**: TechSupply Solutions Inc.
- **Amount**: $2,924.08
- **Description**: Standard software and support invoice with realistic line items, proper metadata, and reasonable amounts
- **Expected Risk Score**: LOW (0-30)

### 2. legitimate_receipt_1.pdf
- **Type**: Receipt
- **Vendor**: Office Supplies Plus
- **Amount**: $93.12
- **Description**: Office supplies purchase receipt with normal amounts and proper formatting
- **Expected Risk Score**: LOW (0-30)

### 3. legitimate_bank_statement_1.pdf
- **Type**: Bank Statement
- **Account**: ****5678
- **Description**: Monthly bank statement with typical transactions and proper formatting
- **Expected Risk Score**: LOW (0-30)

## Fraudulent Documents

These documents contain specific fraud indicators designed to test different fraud detection capabilities:

### 1. fraudulent_tampered_invoice.pdf
- **Type**: Invoice (Metadata Fraud)
- **Vendor**: QuickCash Enterprises LLC (blacklisted)
- **Amount**: $23,500.00
- **Fraud Indicators**:
  - **Metadata Tampering**: PDF creation date is recent but invoice claims to be from 6 months ago
  - **Blacklisted Vendor**: Vendor name appears in the blacklist database
  - **Suspicious Payment Terms**: "Due immediately" with wire transfer preference
  - **High Amount**: Unusually high for consulting services
- **Expected Risk Score**: HIGH/CRITICAL (70-100)
- **Tests Requirements**: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1

### 2. fraudulent_duplicate_invoice.pdf
- **Type**: Invoice (Pattern Fraud)
- **Vendor**: Global Services International
- **Amount**: $11,800.00
- **Fraud Indicators**:
  - **Duplicate Invoice Number**: Uses same invoice number as legitimate_invoice_1.pdf (INV-2024-001234)
  - **All Rounded Amounts**: Every line item and total ends in .00 (suggests fabrication)
  - **Sequential Pattern**: Item codes follow suspicious sequential pattern
  - **No Tax**: 0% tax rate is unusual
- **Expected Risk Score**: HIGH (70-85)
- **Tests Requirements**: 4.1, 4.2, 4.3, 4.4

### 3. fraudulent_outlier_receipt.pdf
- **Type**: Receipt (Anomaly Fraud)
- **Vendor**: Office Supplies Plus (legitimate vendor)
- **Amount**: $13,625.00
- **Fraud Indicators**:
  - **Statistical Outliers**: Prices are 100x normal (e.g., $2,500 for copy paper vs normal $16)
  - **Weekend Transaction**: Processed on Sunday when store is typically closed
  - **Large Cash Payment**: $13,625 in cash is highly unusual
  - **Unknown Cashier**: No proper cashier identification
  - **Amount Anomaly**: Total is 146x higher than normal for this vendor
- **Expected Risk Score**: CRITICAL (85-100)
- **Tests Requirements**: 5.1, 5.2, 5.3, 5.4

## Generating Sample Documents

The sample documents can be regenerated using the provided Python scripts:

```bash
# Generate legitimate documents
./venv/bin/python generate_samples.py

# Generate fraudulent documents
./venv/bin/python generate_fraudulent_samples.py
```

## Testing with Sample Documents

Upload documents to test the fraud detection system:

```bash
# Upload a legitimate document
./upload-document.sh sample-files/legitimate_invoice_1.pdf

# Upload a fraudulent document
./upload-document.sh sample-files/fraudulent_tampered_invoice.pdf
```

## Expected Fraud Assessment Output

### Legitimate Document Example
```json
{
  "risk_score": 15,
  "risk_level": "LOW",
  "findings": {
    "metadata_analysis": {
      "suspicious_indicators": []
    },
    "pattern_matches": [],
    "anomalies": [],
    "database_checks": {
      "blacklist_status": {
        "is_blacklisted": false
      },
      "verification_status": {
        "is_verified": true
      }
    }
  },
  "indicators": [],
  "recommended_actions": ["Process normally", "No further review required"]
}
```

### Fraudulent Document Example
```json
{
  "risk_score": 92,
  "risk_level": "CRITICAL",
  "findings": {
    "metadata_analysis": {
      "suspicious_indicators": [
        {
          "type": "timestamp_mismatch",
          "description": "Document creation date conflicts with invoice date",
          "severity": "high"
        }
      ]
    },
    "pattern_matches": [
      {
        "pattern_type": "duplicate_invoice",
        "confidence": 0.95
      }
    ],
    "anomalies": [
      {
        "type": "amount_outlier",
        "severity_score": 9
      }
    ],
    "database_checks": {
      "blacklist_status": {
        "is_blacklisted": true,
        "reason": "Known fraudulent entity"
      }
    }
  },
  "indicators": [
    "Metadata tampering detected",
    "Vendor on blacklist",
    "Duplicate invoice number",
    "Statistical anomalies present"
  ],
  "recommended_actions": [
    "REJECT payment immediately",
    "Flag for investigation",
    "Report to fraud prevention team",
    "Contact vendor verification"
  ]
}
```

## Notes

- All documents are generated programmatically using ReportLab and PyPDF2
- Fraudulent documents are designed to trigger specific fraud detection tools
- The metadata in fraudulent documents is intentionally suspicious
- Amounts and patterns in fraudulent documents are based on real-world fraud scenarios
