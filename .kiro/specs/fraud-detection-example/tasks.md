# Implementation Plan: Fraud Detection Example

## Overview

This implementation plan breaks down the fraud detection example into discrete coding tasks. The example demonstrates fraud detection capabilities using the AgenticDocumentProcessing construct with specialized Python tools for analyzing financial documents.

## Tasks

- [x] 1. Set up project structure and configuration files
  - Create directory structure: `examples/document-processing/fraud-detection/`
  - Create subdirectories: `resources/`, `resources/tools/`, `sample-files/`, `doc-img/`
  - Create `package.json` with dependencies (aws-cdk-lib, constructs, @cdklabs/cdk-appmod-catalog-blueprints)
  - Create `tsconfig.json` with TypeScript configuration
  - Create `cdk.json` with CDK app configuration
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Implement CDK stack for fraud detection
  - [x] 2.1 Create `fraud-detection-stack.ts` with basic stack structure
    - Import required CDK constructs and types
    - Define FraudDetectionStack class extending Stack
    - Create KMS-encrypted S3 bucket for document storage
    - _Requirements: 1.1, 1.4_
  
  - [x] 2.2 Configure AgenticDocumentProcessing construct
    - Add QueuedS3Adapter with the S3 bucket
    - Configure classification model with cross-region inference
    - Set up observability with namespace "fraud-detection" and service "financial-documents"
    - Enable data protection for logs
    - _Requirements: 1.2, 1.3, 1.5, 12.1, 12.2, 12.3, 12.4_
  
  - [x] 2.3 Configure agent parameters with tools and prompts
    - Create Asset references for system prompt
    - Create Asset references for all 4 fraud detection tools
    - Configure agent with fraud detection prompt
    - Set expectJson to true for structured output
    - _Requirements: 1.6, 1.7, 1.8_
  
  - [x] 2.4 Create `app.ts` CDK application entry point
    - Import and instantiate FraudDetectionStack
    - Configure stack with appropriate environment settings
    - _Requirements: 11.4_

- [x] 3. Create agent system prompt
  - [x] 3.1 Write `resources/system_prompt.txt`
    - Define agent role as fraud detection specialist
    - Specify multi-stage analysis process (authenticity, anomalies, patterns, cross-reference, scoring)
    - Describe tool usage instructions
    - Specify JSON output format with risk_score, risk_level, findings, indicators, recommended_actions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 11.5_

- [x] 4. Implement Metadata Analyzer tool
  - [x] 4.1 Create `resources/tools/metadata_analyzer.py`
    - Import required libraries (boto3, strands, PyPDF2/pikepdf, Pillow)
    - Implement @tool decorated function analyze_metadata(file_path: str)
    - Extract EXIF data from images using Pillow
    - Extract PDF metadata (creation/modification timestamps, software signature)
    - Detect suspicious indicators (timestamp mismatches, missing metadata, unusual software)
    - Return structured dict with exif_data, timestamps, software_signature, suspicious_indicators
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 4.2 Write property test for metadata extraction
    - **Property 1: Metadata Extraction Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.6**
    - Test that for any document with metadata, all available fields are extracted
    - Use hypothesis to generate various document metadata scenarios
    - Verify output structure is always valid

- [x] 5. Implement Pattern Matcher tool
  - [x] 5.1 Create `resources/tools/pattern_matcher.py`
    - Import required libraries (boto3, strands, re, json)
    - Create embedded fraud pattern database (dict or JSON)
    - Implement @tool decorated function match_patterns(file_path: str, document_text: str)
    - Check for duplicate invoice numbers
    - Check for rounded amounts (all ending in .00)
    - Check for sequential invoice numbers from different vendors
    - Analyze formatting (font consistency, spacing) using PDF parsing
    - Return structured dict with patterns_detected (pattern_type, confidence, description) and formatting_issues
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 5.2 Write property test for pattern detection output structure
    - **Property 2: Pattern Detection Output Structure**
    - **Validates: Requirements 4.5, 4.6**
    - Test that any detected pattern includes type, confidence, and description
  
  - [ ]* 5.3 Write property test for rounded amount detection
    - **Property 3: Rounded Amount Detection**
    - **Validates: Requirements 4.4**
    - Test that documents with all rounded amounts are flagged
  
  - [ ]* 5.4 Write property test for pattern matching execution
    - **Property 4: Pattern Matching Execution**
    - **Validates: Requirements 4.1**
    - Test that any document is checked against pattern database

- [x] 6. Implement Anomaly Detector tool
  - [x] 6.1 Create `resources/tools/anomaly_detector.py`
    - Import required libraries (boto3, strands, statistics, datetime, json)
    - Create embedded historical data for baseline (JSON or dict)
    - Implement @tool decorated function detect_anomalies(document_text: str, vendor_name: str, amount: float, date: str)
    - Calculate Z-scores for amount outliers
    - Check for unusual dates (weekends, holidays)
    - Check for geographic anomalies if location data available
    - Calculate severity scores based on deviation magnitude
    - Return structured dict with anomalies (type, value, expected_range, severity_score) and statistical_analysis
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 6.2 Write property test for anomaly detection output structure
    - **Property 5: Anomaly Detection Output Structure**
    - **Validates: Requirements 5.5, 5.6**
    - Test that any detected anomaly includes type, value, expected range, and severity score
  
  - [ ]* 6.3 Write property test for statistical analysis execution
    - **Property 6: Statistical Analysis Execution**
    - **Validates: Requirements 5.1, 5.2**
    - Test that any document with numerical values undergoes statistical analysis

- [x] 7. Implement Database Lookup tool
  - [x] 7.1 Create `resources/tools/database_lookup.py`
    - Import required libraries (boto3, strands, json)
    - Create embedded databases (blacklist.json, verified_vendors.json, compromised_accounts.json)
    - Implement @tool decorated function lookup_vendor(vendor_name: str, account_number: str = None, tax_id: str = None)
    - Check vendor against blacklist database
    - Verify vendor against legitimate business database
    - Check account number against compromised accounts database
    - Return structured dict with blacklist_status, verification_status, risk_indicators
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 7.2 Write property tests for database lookup operations
    - **Property 7: Blacklist Check Execution** - Validates: Requirements 6.1
    - **Property 8: Vendor Verification Execution** - Validates: Requirements 6.2
    - **Property 9: Account Number Check Execution** - Validates: Requirements 6.3
    - Test that any vendor name/account number is checked against databases
  
  - [ ]* 7.3 Write property test for database lookup output structure
    - **Property 10: Database Lookup Output Structure**
    - **Validates: Requirements 6.4, 6.5, 6.6**
    - Test that any lookup result has structured format with all required fields

- [x] 8. Create mock databases for tools
  - [x] 8.1 Create `resources/tools/data/blacklist.json`
    - Add 10-15 known fraudulent vendor entries with reasons
    - _Requirements: 6.1_
  
  - [x] 8.2 Create `resources/tools/data/verified_vendors.json`
    - Add 20-30 legitimate business entries with registration details
    - _Requirements: 6.2_
  
  - [x] 8.3 Create `resources/tools/data/compromised_accounts.json`
    - Add 5-10 compromised account number entries
    - _Requirements: 6.3_
  
  - [x] 8.4 Create `resources/tools/data/historical_data.json`
    - Add baseline statistics for anomaly detection (average amounts by vendor/category)
    - _Requirements: 5.2_

- [x] 9. Create sample documents
  - [x] 9.1 Create 3 legitimate sample documents
    - Create `sample-files/legitimate_invoice_1.pdf` with realistic metadata and content
    - Create `sample-files/legitimate_receipt_1.pdf` with realistic metadata and content
    - Create `sample-files/legitimate_bank_statement_1.pdf` with realistic metadata and content
    - _Requirements: 8.1, 8.5_
  
  - [x] 9.2 Create 3 fraudulent sample documents
    - Create `sample-files/fraudulent_tampered_invoice.pdf` with modified timestamps (metadata fraud)
    - Create `sample-files/fraudulent_duplicate_invoice.pdf` with duplicate invoice number (pattern fraud)
    - Create `sample-files/fraudulent_outlier_receipt.pdf` with statistical outliers (anomaly fraud)
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 10. Checkpoint - Ensure core implementation is complete
  - Verify all tools are implemented and can be imported
  - Verify CDK stack synthesizes without errors
  - Ensure all tests pass, ask the user if questions arise

- [ ]* 11. Write integration tests for fraud assessment output
  - [ ]* 11.1 Write property test for fraud assessment completeness
    - **Property 11: Fraud Assessment Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
    - Test that any fraud assessment includes all required fields
  
  - [ ]* 11.2 Write property test for JSON output validity
    - **Property 12: JSON Output Validity**
    - **Validates: Requirements 7.6**
    - Test that any fraud assessment is valid JSON
  
  - [ ]* 11.3 Write property test for risk score and level consistency
    - **Property 13: Risk Score and Level Consistency**
    - **Validates: Requirements 7.7**
    - Test that risk scores above 70 have HIGH or CRITICAL level
  
  - [ ]* 11.4 Write unit test for sample document classification
    - Test that legitimate sample documents produce low risk scores
    - Test that fraudulent sample documents produce high risk scores
    - _Requirements: 8.6_

- [x] 12. Create upload script
  - [x] 12.1 Create `upload-document.sh`
    - Add shebang and script header
    - Get bucket name from CloudFormation stack outputs
    - Upload file to S3 raw/ prefix using AWS CLI
    - Provide success feedback message
    - Make script executable (chmod +x)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 13. Create README documentation
  - [x] 13.1 Write README.md with overview and architecture
    - Add title and badges (Code, Documentation, Construct links)
    - Write overview section describing fraud detection capabilities
    - Create architecture diagram showing processing flow
    - Add diagram to `doc-img/fraud-detection-pipeline.png`
    - _Requirements: 10.1, 10.2, 10.10_
  
  - [x] 13.2 Add deployment and usage sections to README
    - Document prerequisites (AWS CLI, CDK CLI, Node.js, Bedrock access)
    - Write step-by-step deployment instructions
    - Provide usage examples with upload script commands
    - Show expected output with fraud assessment JSON example
    - _Requirements: 10.3, 10.4, 10.5, 10.6_
  
  - [x] 13.3 Add monitoring and troubleshooting sections to README
    - Document monitoring commands using AWS CLI
    - List common issues and solutions
    - Add cleanup instructions (cdk destroy)
    - _Requirements: 10.7, 10.8, 12.5_

- [ ] 14. Final checkpoint - Verify complete example
  - Run CDK synth to verify stack is valid
  - Test upload script with sample documents
  - Verify README is complete and accurate
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Tools use Python with the `strands` library for agent tool integration
- CDK stack uses TypeScript following existing example patterns
