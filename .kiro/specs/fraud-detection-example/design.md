# Design Document: Fraud Detection Example

## Overview

The fraud detection example demonstrates advanced document fraud analysis capabilities using the AgenticDocumentProcessing construct. The system processes financial documents (invoices, receipts, bank statements) through a multi-stage fraud detection pipeline powered by an AI agent with specialized tools.

The example follows the established pattern of the `agentic-document-processing` example but focuses on fraud detection rather than insurance claims processing. It showcases how the AgenticDocumentProcessing construct can be adapted for different use cases by changing the agent prompt and tools.

**Key Design Principles:**
- Reuse existing AgenticDocumentProcessing construct without modification
- Implement fraud detection logic entirely through agent prompts and tools
- Provide comprehensive sample documents demonstrating various fraud scenarios
- Follow established example patterns for consistency and maintainability

## Architecture

### High-Level Flow

```
┌─────────────┐
│   Upload    │
│  Document   │
└──────┬──────┘
       │
       v
┌─────────────────┐
│  S3 Bucket      │
│  (raw/ prefix)  │
└──────┬──────────┘
       │ S3 Event
       v
┌─────────────────┐
│   SQS Queue     │
└──────┬──────────┘
       │
       v
┌─────────────────┐
│ SQS Consumer    │
│    Lambda       │
└──────┬──────────┘
       │
       v
┌─────────────────────────────────────────┐
│         Step Functions Workflow         │
│  ┌───────────────────────────────────┐  │
│  │  1. Document Classification       │  │
│  │     (Bedrock Claude 3.5 Sonnet)   │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│                  v                       │
│  ┌───────────────────────────────────┐  │
│  │  2. Fraud Detection Processing    │  │
│  │     (Agent with Tools)            │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │ Metadata Analyzer Tool      │ │  │
│  │  ├─────────────────────────────┤ │  │
│  │  │ Pattern Matcher Tool        │ │  │
│  │  ├─────────────────────────────┤ │  │
│  │  │ Anomaly Detector Tool       │ │  │
│  │  ├─────────────────────────────┤ │  │
│  │  │ Database Lookup Tool        │ │  │
│  │  └─────────────────────────────┘ │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│                  v                       │
│  ┌───────────────────────────────────┐  │
│  │  3. Output Fraud Assessment       │  │
│  │     (JSON with risk score)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Component Interaction

1. **Document Upload**: User uploads financial document to S3 `raw/` prefix
2. **Event Triggering**: S3 event notification sent to SQS queue
3. **Workflow Initiation**: SQS Consumer Lambda starts Step Functions execution
4. **Classification**: Bedrock model classifies document type
5. **Fraud Analysis**: Agent invokes fraud detection tools in sequence
6. **Assessment Generation**: Agent produces structured fraud assessment with risk score

## Components and Interfaces

### CDK Stack (fraud-detection-stack.ts)

**Purpose**: Define and deploy the fraud detection infrastructure

**Key Components:**
```typescript
interface StackComponents {
  bucket: Bucket;                    // KMS-encrypted S3 bucket
  agenticProcessing: AgenticDocumentProcessing;  // Main construct
  systemPrompt: Asset;               // Agent system prompt
  tools: Asset[];                    // Fraud detection tools
}
```

**Configuration:**
- Uses `AgenticDocumentProcessing` construct
- Configures `QueuedS3Adapter` for S3-triggered processing
- Enables cross-region inference for high availability
- Enables observability with namespace "fraud-detection"
- Includes 4 fraud detection tools as Asset references

### Agent System Prompt (resources/system_prompt.txt)

**Purpose**: Define the agent's role and behavior as a fraud detection specialist

**Content Structure:**
```
Role Definition:
- You are a fraud detection specialist
- Your goal is to analyze financial documents for fraud indicators

Analysis Process:
1. Document Authenticity Verification
   - Use metadata_analyzer tool
   - Check for tampering, forgery indicators
   
2. Content Anomaly Detection
   - Use anomaly_detector tool
   - Identify statistical outliers, unusual patterns
   
3. Pattern Matching
   - Use pattern_matcher tool
   - Check against known fraud patterns
   
4. Cross-Reference Validation
   - Use database_lookup tool
   - Verify vendors, check blacklists

5. Risk Scoring and Decision
   - Calculate overall risk score (0-100)
   - Classify risk level (LOW/MEDIUM/HIGH/CRITICAL)
   - Provide detailed justification

Output Format:
{
  "risk_score": <0-100>,
  "risk_level": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "findings": {
    "metadata_analysis": {...},
    "pattern_matches": [...],
    "anomalies": [...],
    "database_checks": {...}
  },
  "indicators": [...],
  "recommended_actions": [...]
}
```

### Fraud Detection Tools

#### 1. Metadata Analyzer (metadata_analyzer.py)

**Purpose**: Extract and analyze document metadata for tampering indicators

**Interface:**
```python
@tool
def analyze_metadata(file_path: str) -> dict:
    """
    Analyze document metadata for fraud indicators
    
    Args:
        file_path: Local path to the document
        
    Returns:
        {
            "exif_data": {...},
            "creation_timestamp": "...",
            "modification_timestamp": "...",
            "software_signature": "...",
            "suspicious_indicators": [
                {
                    "type": "timestamp_mismatch",
                    "description": "...",
                    "severity": "high"
                }
            ]
        }
    """
```

**Implementation Approach:**
- Use `PyPDF2` or `pikepdf` for PDF metadata extraction
- Use `Pillow` (PIL) for image EXIF data
- Check for inconsistencies:
  - Creation date vs modification date
  - Software signature vs document type
  - Missing or suspicious metadata fields
- Return structured findings with severity levels

#### 2. Pattern Matcher (pattern_matcher.py)

**Purpose**: Identify known fraud patterns and suspicious formatting

**Interface:**
```python
@tool
def match_patterns(file_path: str, document_text: str) -> dict:
    """
    Check document against known fraud patterns
    
    Args:
        file_path: Local path to the document
        document_text: Extracted text content
        
    Returns:
        {
            "patterns_detected": [
                {
                    "pattern_type": "duplicate_invoice",
                    "description": "...",
                    "confidence": 0.85,
                    "details": {...}
                }
            ],
            "formatting_issues": [
                {
                    "issue_type": "inconsistent_fonts",
                    "description": "...",
                    "severity": "medium"
                }
            ]
        }
    """
```

**Implementation Approach:**
- Maintain a pattern database (JSON file or embedded dict)
- Check for:
  - Duplicate invoice numbers
  - Rounded amounts (e.g., all amounts ending in .00)
  - Sequential invoice numbers from different vendors
  - Common fraud keywords/phrases
- Analyze formatting using PDF parsing:
  - Font consistency
  - Spacing and alignment
  - Image quality (low-res logos suggest forgery)

#### 3. Anomaly Detector (anomaly_detector.py)

**Purpose**: Detect statistical anomalies and unusual values

**Interface:**
```python
@tool
def detect_anomalies(
    document_text: str,
    vendor_name: str,
    amount: float,
    date: str
) -> dict:
    """
    Detect statistical anomalies in document data
    
    Args:
        document_text: Extracted text content
        vendor_name: Vendor name from document
        amount: Transaction amount
        date: Transaction date
        
    Returns:
        {
            "anomalies": [
                {
                    "type": "amount_outlier",
                    "value": 15000.00,
                    "expected_range": "500-2000",
                    "severity_score": 8,
                    "description": "..."
                }
            ],
            "statistical_analysis": {
                "z_score": 3.5,
                "percentile": 99.2
            }
        }
    """
```

**Implementation Approach:**
- Use historical data (simulated for example) for baseline
- Check for:
  - Amount outliers (Z-score > 3)
  - Unusual dates (weekends, holidays)
  - Geographic anomalies (if location data available)
  - Frequency anomalies (too many transactions in short period)
- Calculate severity scores based on deviation magnitude

#### 4. Database Lookup (database_lookup.py)

**Purpose**: Verify vendors and check against blacklists

**Interface:**
```python
@tool
def lookup_vendor(
    vendor_name: str,
    account_number: str = None,
    tax_id: str = None
) -> dict:
    """
    Verify vendor legitimacy and check blacklists
    
    Args:
        vendor_name: Name of the vendor
        account_number: Optional account number
        tax_id: Optional tax ID
        
    Returns:
        {
            "blacklist_status": {
                "is_blacklisted": false,
                "reason": null
            },
            "verification_status": {
                "is_verified": true,
                "business_registered": true,
                "registration_details": {...}
            },
            "risk_indicators": [...]
        }
    """
```

**Implementation Approach:**
- Use embedded databases (JSON files) for the example:
  - `blacklist.json`: Known fraudulent entities
  - `verified_vendors.json`: Legitimate businesses
  - `compromised_accounts.json`: Known compromised accounts
- In production, this would integrate with external APIs
- Return structured verification results with risk indicators

### Upload Script (upload-document.sh)

**Purpose**: Simplify document upload for testing

**Interface:**
```bash
./upload-document.sh <file-path>
```

**Implementation:**
```bash
#!/bin/bash

# Get stack outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name FraudDetectionStack \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Upload to raw/ prefix to trigger processing
aws s3 cp "$1" "s3://${BUCKET_NAME}/raw/$(basename $1)"

echo "Document uploaded successfully"
echo "Processing will begin automatically"
```

## Data Models

### Input Document

```typescript
interface InputDocument {
  s3Location: {
    bucket: string;
    key: string;
  };
  documentType: 'invoice' | 'receipt' | 'bank_statement' | 'payment_record';
  uploadTimestamp: string;
}
```

### Classification Result

```typescript
interface ClassificationResult {
  documentClassification: string;  // e.g., "FINANCIAL_DOCUMENT"
  confidence: number;
  documentType: string;  // e.g., "invoice", "receipt"
}
```

### Fraud Assessment Output

```typescript
interface FraudAssessment {
  risk_score: number;  // 0-100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  findings: {
    metadata_analysis: {
      exif_data: Record<string, any>;
      timestamps: {
        creation: string;
        modification: string;
      };
      software_signature: string;
      suspicious_indicators: SuspiciousIndicator[];
    };
    
    pattern_matches: PatternMatch[];
    
    anomalies: Anomaly[];
    
    database_checks: {
      blacklist_status: BlacklistStatus;
      verification_status: VerificationStatus;
      risk_indicators: string[];
    };
  };
  
  indicators: string[];  // List of specific fraud indicators found
  
  recommended_actions: string[];  // Actions based on risk level
}

interface SuspiciousIndicator {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PatternMatch {
  pattern_type: string;
  description: string;
  confidence: number;
  details: Record<string, any>;
}

interface Anomaly {
  type: string;
  value: any;
  expected_range: string;
  severity_score: number;
  description: string;
}

interface BlacklistStatus {
  is_blacklisted: boolean;
  reason: string | null;
  blacklist_entry: Record<string, any> | null;
}

interface VerificationStatus {
  is_verified: boolean;
  business_registered: boolean;
  registration_details: Record<string, any> | null;
}
```

### Sample Document Metadata

```typescript
interface SampleDocument {
  filename: string;
  type: 'legitimate' | 'fraudulent';
  fraud_type?: 'metadata_tampering' | 'pattern_fraud' | 'anomaly' | 'blacklisted_vendor';
  description: string;
  expected_risk_score: number;
  expected_risk_level: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Metadata Extraction Completeness

*For any* financial document with metadata fields (EXIF data, timestamps, software signatures), the Metadata_Analyzer should extract all available metadata fields and return them in a structured format.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6**

### Property 2: Pattern Detection Output Structure

*For any* document processed by the Pattern_Matcher, when patterns are detected, each pattern result should include pattern type, confidence level, and description.

**Validates: Requirements 4.5, 4.6**

### Property 3: Rounded Amount Detection

*For any* financial document where all monetary amounts are rounded to whole numbers (ending in .00), the Pattern_Matcher should flag this as a suspicious pattern indicating potential fabrication.

**Validates: Requirements 4.4**

### Property 4: Pattern Matching Execution

*For any* financial document, the Pattern_Matcher should check against the fraud pattern database and return a list of detected patterns (which may be empty if no patterns match).

**Validates: Requirements 4.1**

### Property 5: Anomaly Detection Output Structure

*For any* anomaly detected by the Anomaly_Detector, the output should include anomaly type, value, expected range, and severity score.

**Validates: Requirements 5.5, 5.6**

### Property 6: Statistical Analysis Execution

*For any* financial document with numerical values, the Anomaly_Detector should perform statistical analysis and compare amounts against historical baselines.

**Validates: Requirements 5.1, 5.2**

### Property 7: Blacklist Check Execution

*For any* vendor name provided to the Database_Lookup tool, the tool should check against the blacklist database and return a blacklist status.

**Validates: Requirements 6.1**

### Property 8: Vendor Verification Execution

*For any* vendor name provided to the Database_Lookup tool, the tool should perform legitimacy verification and return a verification status.

**Validates: Requirements 6.2**

### Property 9: Account Number Check Execution

*For any* account number provided to the Database_Lookup tool, the tool should check against the compromised accounts database.

**Validates: Requirements 6.3**

### Property 10: Database Lookup Output Structure

*For any* vendor lookup result, the output should have a structured format including blacklist status, verification status, and risk indicators.

**Validates: Requirements 6.4, 6.5, 6.6**

### Property 11: Fraud Assessment Completeness

*For any* fraud assessment output, it should include a risk score between 0 and 100, a risk level classification (LOW/MEDIUM/HIGH/CRITICAL), findings from all fraud tools, specific indicators, and recommended actions.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 12: JSON Output Validity

*For any* fraud assessment output, the result should be valid JSON that can be parsed without errors.

**Validates: Requirements 7.6**

### Property 13: Risk Score and Level Consistency

*For any* fraud assessment where the risk score is above 70, the risk level classification should be either HIGH or CRITICAL.

**Validates: Requirements 7.7**

## Error Handling

### Tool Execution Errors

**Scenario**: A fraud detection tool fails during execution (e.g., file not found, parsing error)

**Handling Strategy**:
- Each tool should catch exceptions and return structured error information
- Error response format:
  ```python
  {
      "error": true,
      "error_type": "FileNotFoundError",
      "error_message": "Document file not found at path",
      "partial_results": {...}  # If any analysis was completed
  }
  ```
- Agent should continue with other tools if one fails
- Final assessment should note which tools failed and adjust confidence accordingly

### Invalid Document Format

**Scenario**: Document cannot be parsed or is in an unsupported format

**Handling Strategy**:
- Classification step should identify unsupported formats
- Return early with appropriate error message
- Do not attempt fraud analysis on unparseable documents

### Missing Metadata

**Scenario**: Document has no metadata or incomplete metadata

**Handling Strategy**:
- Metadata_Analyzer should not fail, but return empty/partial results
- Flag missing metadata as a potential indicator (legitimate documents usually have metadata)
- Continue with other fraud detection tools

### Database Lookup Failures

**Scenario**: Blacklist or vendor database is unavailable or corrupted

**Handling Strategy**:
- Return error status but allow processing to continue
- Mark database checks as "inconclusive" rather than "passed"
- Include warning in final assessment about incomplete verification

### Malformed Tool Output

**Scenario**: A tool returns output that doesn't match expected schema

**Handling Strategy**:
- Agent should validate tool outputs against expected schemas
- If validation fails, log error and use default/empty values
- Include note in final assessment about tool output issues

## Testing Strategy

### Dual Testing Approach

The fraud detection example will use both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Test each tool with specific sample documents
- Test CDK stack synthesis and resource creation
- Test upload script functionality
- Test end-to-end processing with sample documents
- Verify correct classification of known fraudulent vs legitimate documents

**Property-Based Tests**: Verify universal properties across all inputs
- Test that tools handle any valid document format
- Test that output structures are always valid
- Test that risk scores are always in valid range
- Test that error handling works for any invalid input

### Property-Based Testing Configuration

**Testing Library**: Use `hypothesis` for Python (for tool testing) and `fast-check` for TypeScript (for CDK stack testing)

**Test Configuration**:
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: `# Feature: fraud-detection-example, Property N: [property text]`

**Example Property Test Structure**:
```python
from hypothesis import given, strategies as st
import json

# Feature: fraud-detection-example, Property 12: JSON Output Validity
@given(st.text())  # Generate random fraud assessment data
def test_fraud_assessment_json_validity(assessment_data):
    """For any fraud assessment output, it should be valid JSON"""
    result = generate_fraud_assessment(assessment_data)
    # Should not raise exception
    parsed = json.loads(result)
    assert isinstance(parsed, dict)
```

### Unit Test Coverage

**Tool Tests** (`test/tools/`):
- `test_metadata_analyzer.py`: Test with various document types and metadata scenarios
- `test_pattern_matcher.py`: Test with known fraud patterns and legitimate documents
- `test_anomaly_detector.py`: Test with outliers and normal values
- `test_database_lookup.py`: Test with blacklisted, verified, and unknown vendors

**Integration Tests** (`test/integration/`):
- `test_end_to_end.py`: Test complete workflow with sample documents
- `test_stack_synthesis.py`: Test CDK stack can be synthesized without errors

**Example Unit Test**:
```python
def test_metadata_analyzer_with_tampered_document():
    """Test that metadata analyzer detects tampered timestamps"""
    # Given: A document with suspicious timestamp mismatch
    doc_path = "sample-files/fraudulent/tampered_invoice.pdf"
    
    # When: Analyzing metadata
    result = analyze_metadata(doc_path)
    
    # Then: Should flag timestamp mismatch
    assert len(result["suspicious_indicators"]) > 0
    assert any(
        indicator["type"] == "timestamp_mismatch" 
        for indicator in result["suspicious_indicators"]
    )
```

### Test Data Strategy

**Sample Documents**:
- Create 3 legitimate documents with realistic metadata and content
- Create 3 fraudulent documents, each demonstrating a different fraud type:
  1. Metadata tampering (modified timestamps)
  2. Pattern fraud (duplicate invoice numbers, rounded amounts)
  3. Anomaly fraud (statistical outliers, unusual dates)

**Mock Databases**:
- `blacklist.json`: 10-15 known fraudulent vendors
- `verified_vendors.json`: 20-30 legitimate businesses
- `compromised_accounts.json`: 5-10 compromised account numbers
- `historical_data.json`: Baseline statistics for anomaly detection

### Testing Workflow

1. **Tool Unit Tests**: Test each tool independently with various inputs
2. **Tool Property Tests**: Verify universal properties for each tool
3. **Integration Tests**: Test complete fraud detection workflow
4. **CDK Stack Tests**: Verify infrastructure can be synthesized and deployed
5. **Manual Testing**: Deploy and test with sample documents using upload script

### Continuous Integration

- Run all tests on every commit
- Require 100% of property tests to pass
- Require >80% code coverage for tool implementations
- Run CDK synthesis check to ensure stack is valid
