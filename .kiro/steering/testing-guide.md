---
inclusion: fileMatch
fileMatchPattern: 'use-cases/**'
---

# Testing Guide

## Testing Philosophy

This repository uses a comprehensive testing approach:
- **Unit Tests**: Test individual components and logic
- **Integration Tests**: Test CDK stack synthesis and resource creation
- **CDK Nag Tests**: Automated security and compliance checking
- **Property-Based Tests**: Verify universal properties across all inputs (when applicable)

## Test Organization

```
use-cases/
├── document-processing/
│   ├── base-document-processing.ts
│   ├── bedrock-document-processing.ts
│   └── tests/
│       ├── base-document-processing.test.ts
│       ├── base-document-processing-nag.test.ts
│       ├── bedrock-document-processing.test.ts
│       └── bedrock-document-processing-nag.test.ts
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suite
```bash
npm test -- --testPathPattern="document-processing"
npm test -- --testPathPattern="webapp"
npm test -- --testPathPattern="framework"
```

### Security/Nag Tests Only
```bash
npm test:security
# or
npm test -- --testPathPattern="nag.test.ts"
```

### Watch Mode
```bash
npm test:watch
```

### Coverage Report
```bash
npm test -- --coverage
```

## Unit Testing CDK Constructs

### Basic Structure

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { MyConstruct } from '../my-construct';

describe('MyConstruct', () => {
  let app: App;
  let stack: Stack;
  
  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
  });
  
  describe('Resource Creation', () => {
    test('creates S3 bucket with encryption', () => {
      // Given
      new MyConstruct(stack, 'TestConstruct', {
        requiredProp: 'value'
      });
      
      // When
      const template = Template.fromStack(stack);
      
      // Then
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [{
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms'
            }
          }]
        }
      });
    });
    
    test('creates Lambda function with correct runtime', () => {
      new MyConstruct(stack, 'TestConstruct', {
        requiredProp: 'value'
      });
      
      const template = Template.fromStack(stack);
      
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'python3.11',
        MemorySize: 1024
      });
    });
  });
  
  describe('Resource Count', () => {
    test('creates exactly one DynamoDB table', () => {
      new MyConstruct(stack, 'TestConstruct', {
        requiredProp: 'value'
      });
      
      const template = Template.fromStack(stack);
      
      template.resourceCountIs('AWS::DynamoDB::Table', 1);
    });
  });
  
  describe('IAM Permissions', () => {
    test('grants Lambda function read access to S3', () => {
      new MyConstruct(stack, 'TestConstruct', {
        requiredProp: 'value'
      });
      
      const template = Template.fromStack(stack);
      
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['s3:GetObject']),
              Effect: 'Allow'
            })
          ])
        }
      });
    });
  });
  
  describe('Validation', () => {
    test('throws error for invalid props', () => {
      expect(() => {
        new MyConstruct(stack, 'TestConstruct', {
          requiredProp: ''  // Invalid empty string
        });
      }).toThrow('requiredProp cannot be empty');
    });
    
    test('throws error for missing required props', () => {
      expect(() => {
        new MyConstruct(stack, 'TestConstruct', {} as any);
      }).toThrow();
    });
  });
  
  describe('Optional Props', () => {
    test('uses default value when optional prop not provided', () => {
      const construct = new MyConstruct(stack, 'TestConstruct', {
        requiredProp: 'value'
        // optionalProp not provided
      });
      
      expect(construct.someProperty).toBeDefined();
    });
    
    test('uses provided value when optional prop provided', () => {
      const construct = new MyConstruct(stack, 'TestConstruct', {
        requiredProp: 'value',
        optionalProp: 'custom-value'
      });
      
      expect(construct.someProperty).toBe('custom-value');
    });
  });
});
```

### Testing with Match Utilities

```typescript
import { Match } from 'aws-cdk-lib/assertions';

// Exact match
template.hasResourceProperties('AWS::S3::Bucket', {
  BucketName: 'my-bucket'
});

// Partial match (object contains these properties)
template.hasResourceProperties('AWS::S3::Bucket', Match.objectLike({
  BucketEncryption: Match.anyValue()
}));

// Array contains specific item
template.hasResourceProperties('AWS::IAM::Policy', {
  PolicyDocument: {
    Statement: Match.arrayWith([
      Match.objectLike({
        Action: 's3:GetObject'
      })
    ])
  }
});

// String matches pattern
template.hasResourceProperties('AWS::Lambda::Function', {
  FunctionName: Match.stringLikeRegexp('.*-processor-.*')
});

// Any value (property exists but don't care about value)
template.hasResourceProperties('AWS::S3::Bucket', {
  BucketEncryption: Match.anyValue()
});

// Absent (property should not exist)
template.hasResourceProperties('AWS::S3::Bucket', {
  WebsiteConfiguration: Match.absent()
});
```

## CDK Nag Testing

### Basic CDK Nag Test

```typescript
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { MyConstruct } from '../my-construct';

describe('MyConstruct CDK Nag', () => {
  let app: App;
  let stack: Stack;
  
  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
  });
  
  test('passes AWS Solutions checks', () => {
    // Given
    new MyConstruct(stack, 'TestConstruct', {
      requiredProp: 'value'
    });
    
    // When
    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    
    // Then - will throw if there are errors
    expect(() => {
      app.synth();
    }).not.toThrow();
  });
  
  test('passes with documented suppressions', () => {
    const construct = new MyConstruct(stack, 'TestConstruct', {
      requiredProp: 'value'
    });
    
    // Suppress specific rules with justification
    NagSuppressions.addResourceSuppressions(
      construct,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policy required for AWS service integration'
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard required for dynamic resource access',
          appliesTo: ['Resource::*']
        }
      ],
      true  // Apply to children
    );
    
    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    
    expect(() => {
      app.synth();
    }).not.toThrow();
  });
});
```

### Common CDK Nag Rules

**AwsSolutions-IAM4**: Managed policies
```typescript
// Suppress when AWS managed policies are necessary
NagSuppressions.addResourceSuppressions(construct, [{
  id: 'AwsSolutions-IAM4',
  reason: 'AWSLambdaBasicExecutionRole is AWS managed policy for Lambda logging'
}]);
```

**AwsSolutions-IAM5**: Wildcard permissions
```typescript
// Suppress when wildcards are necessary
NagSuppressions.addResourceSuppressions(construct, [{
  id: 'AwsSolutions-IAM5',
  reason: 'Wildcard required for dynamic S3 prefix access',
  appliesTo: ['Resource::arn:aws:s3:::bucket-name/*']
}]);
```

**AwsSolutions-S1**: S3 access logging
```typescript
// Suppress when access logging not needed (e.g., test buckets)
NagSuppressions.addResourceSuppressions(bucket, [{
  id: 'AwsSolutions-S1',
  reason: 'Access logging not required for temporary processing bucket'
}]);
```

**AwsSolutions-L1**: Lambda runtime
```typescript
// Suppress when using latest runtime
NagSuppressions.addResourceSuppressions(lambda, [{
  id: 'AwsSolutions-L1',
  reason: 'Using latest Python 3.11 runtime'
}]);
```

## Testing Lambda Functions

### Python Lambda Tests

```python
import pytest
import json
from unittest.mock import Mock, patch
from my_lambda import handler

def test_handler_success():
    """Test successful Lambda execution"""
    # Given
    event = {
        'documentId': 'doc-123',
        'content': {'bucket': 'test-bucket', 'key': 'test.pdf'}
    }
    context = Mock()
    
    # When
    with patch('my_lambda.process_document') as mock_process:
        mock_process.return_value = {'status': 'success'}
        result = handler(event, context)
    
    # Then
    assert result['statusCode'] == 200
    body = json.loads(result['body'])
    assert body['status'] == 'success'

def test_handler_missing_document_id():
    """Test error handling for missing documentId"""
    # Given
    event = {'content': {'bucket': 'test-bucket', 'key': 'test.pdf'}}
    context = Mock()
    
    # When
    result = handler(event, context)
    
    # Then
    assert result['statusCode'] == 400
    body = json.loads(result['body'])
    assert 'error' in body

def test_handler_processing_error():
    """Test error handling for processing failures"""
    # Given
    event = {
        'documentId': 'doc-123',
        'content': {'bucket': 'test-bucket', 'key': 'test.pdf'}
    }
    context = Mock()
    
    # When
    with patch('my_lambda.process_document') as mock_process:
        mock_process.side_effect = Exception('Processing failed')
        result = handler(event, context)
    
    # Then
    assert result['statusCode'] == 500
    body = json.loads(result['body'])
    assert 'error' in body
```

### Testing Agent Tools

```python
import pytest
from my_tool import analyze_metadata

def test_analyze_metadata_success():
    """Test successful metadata analysis"""
    # Given
    file_path = 'test_files/sample.pdf'
    
    # When
    result = analyze_metadata(file_path)
    
    # Then
    assert result['success'] is True
    assert 'metadata' in result['result']
    assert 'exif_data' in result['result']['metadata']
    assert 'timestamps' in result['result']['metadata']

def test_analyze_metadata_suspicious_indicators():
    """Test detection of suspicious metadata"""
    # Given
    file_path = 'test_files/tampered.pdf'
    
    # When
    result = analyze_metadata(file_path)
    
    # Then
    assert result['success'] is True
    assert len(result['result']['suspicious_indicators']) > 0
    assert any(
        indicator['type'] == 'timestamp_mismatch'
        for indicator in result['result']['suspicious_indicators']
    )

def test_analyze_metadata_file_not_found():
    """Test error handling for missing file"""
    # Given
    file_path = 'nonexistent.pdf'
    
    # When
    result = analyze_metadata(file_path)
    
    # Then
    assert result['success'] is False
    assert result['error_type'] == 'FileNotFoundError'
    assert result['recoverable'] is False

@pytest.mark.parametrize('file_path,expected_page_count', [
    ('test_files/single_page.pdf', 1),
    ('test_files/multi_page.pdf', 5),
    ('test_files/large_doc.pdf', 50)
])
def test_analyze_metadata_page_counts(file_path, expected_page_count):
    """Test metadata extraction for various document sizes"""
    result = analyze_metadata(file_path)
    assert result['result']['metadata']['page_count'] == expected_page_count
```

## Property-Based Testing

### When to Use Property-Based Tests

Use property-based tests to verify universal properties that should hold for all inputs:
- Output format is always valid (e.g., valid JSON)
- Values are always in valid range (e.g., risk score 0-100)
- Relationships between values are maintained (e.g., high score → high risk level)
- Error handling works for any invalid input

### Python Property-Based Tests (Hypothesis)

```python
from hypothesis import given, strategies as st
import json

# Feature: fraud-detection-example, Property 12: JSON Output Validity
@given(st.text())
def test_fraud_assessment_json_validity(assessment_data):
    """For any fraud assessment output, it should be valid JSON"""
    result = generate_fraud_assessment(assessment_data)
    
    # Should not raise exception
    parsed = json.loads(result)
    assert isinstance(parsed, dict)

# Feature: fraud-detection-example, Property 13: Risk Score and Level Consistency
@given(st.integers(min_value=71, max_value=100))
def test_risk_score_level_consistency(risk_score):
    """For any risk score above 70, risk level should be HIGH or CRITICAL"""
    assessment = generate_assessment_with_score(risk_score)
    
    assert assessment['risk_level'] in ['HIGH', 'CRITICAL']

# Feature: fraud-detection-example, Property 11: Fraud Assessment Completeness
@given(st.dictionaries(
    keys=st.text(),
    values=st.one_of(st.text(), st.integers(), st.floats())
))
def test_fraud_assessment_completeness(input_data):
    """For any fraud assessment, it should include all required fields"""
    assessment = generate_fraud_assessment(input_data)
    
    assert 'risk_score' in assessment
    assert 0 <= assessment['risk_score'] <= 100
    assert 'risk_level' in assessment
    assert assessment['risk_level'] in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    assert 'findings' in assessment
    assert 'indicators' in assessment
    assert 'recommended_actions' in assessment
```

### TypeScript Property-Based Tests (fast-check)

```typescript
import * as fc from 'fast-check';

// Feature: document-processing, Property 1: Output Structure Validity
describe('Document Processing Properties', () => {
  it('should always return valid output structure', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentId: fc.string(),
          content: fc.record({
            bucket: fc.string(),
            key: fc.string()
          })
        }),
        (input) => {
          const result = processDocument(input);
          
          // Verify output structure
          expect(result).toHaveProperty('statusCode');
          expect(result).toHaveProperty('body');
          expect(typeof result.statusCode).toBe('number');
          expect(typeof result.body).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should handle any string input without crashing', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          // Should not throw
          expect(() => {
            validateInput(input);
          }).not.toThrow();
        }
      )
    );
  });
});
```

## Integration Testing

### End-to-End Stack Testing

```typescript
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MyStack } from '../my-stack';

describe('MyStack Integration', () => {
  test('synthesizes without errors', () => {
    const app = new App();
    
    // Should not throw
    expect(() => {
      new MyStack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' }
      });
      app.synth();
    }).not.toThrow();
  });
  
  test('creates all required resources', () => {
    const app = new App();
    const stack = new MyStack(app, 'TestStack');
    const template = Template.fromStack(stack);
    
    // Verify all key resources exist
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.resourceCountIs('AWS::Lambda::Function', 3);
    template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
  });
  
  test('resources are properly connected', () => {
    const app = new App();
    const stack = new MyStack(app, 'TestStack');
    const template = Template.fromStack(stack);
    
    // Verify Lambda has permission to access S3
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['s3:GetObject']),
            Resource: Match.anyValue()
          })
        ])
      }
    });
  });
});
```

## Test Data Management

### Creating Test Fixtures

```typescript
// test/fixtures/sample-documents.ts
export const sampleInvoice = {
  documentId: 'invoice-001',
  contentType: 'file',
  content: {
    location: 's3',
    bucket: 'test-bucket',
    key: 'invoices/sample-invoice.pdf',
    filename: 'sample-invoice.pdf'
  }
};

export const sampleReceipt = {
  documentId: 'receipt-001',
  contentType: 'file',
  content: {
    location: 's3',
    bucket: 'test-bucket',
    key: 'receipts/sample-receipt.pdf',
    filename: 'sample-receipt.pdf'
  }
};
```

### Using Test Fixtures

```typescript
import { sampleInvoice, sampleReceipt } from './fixtures/sample-documents';

describe('Document Processing', () => {
  test('processes invoice correctly', () => {
    const result = processDocument(sampleInvoice);
    expect(result.classification).toBe('INVOICE');
  });
  
  test('processes receipt correctly', () => {
    const result = processDocument(sampleReceipt);
    expect(result.classification).toBe('RECEIPT');
  });
});
```

## Mocking AWS Services

### Mocking S3

```python
import boto3
from moto import mock_s3
import pytest

@pytest.fixture
def s3_client():
    with mock_s3():
        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket='test-bucket')
        yield s3

def test_download_from_s3(s3_client):
    # Given
    s3_client.put_object(
        Bucket='test-bucket',
        Key='test.txt',
        Body=b'test content'
    )
    
    # When
    result = download_file('test-bucket', 'test.txt')
    
    # Then
    assert result == b'test content'
```

### Mocking DynamoDB

```python
from moto import mock_dynamodb
import boto3

@pytest.fixture
def dynamodb_table():
    with mock_dynamodb():
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.create_table(
            TableName='test-table',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )
        yield table

def test_save_to_dynamodb(dynamodb_table):
    # When
    save_item({'id': 'test-id', 'data': 'test-data'})
    
    # Then
    response = dynamodb_table.get_item(Key={'id': 'test-id'})
    assert response['Item']['data'] == 'test-data'
```

## Coverage Requirements

### Minimum Coverage Targets
- **Overall**: 80% code coverage
- **Critical paths**: 100% coverage (error handling, security)
- **CDK constructs**: 100% resource creation coverage
- **Lambda functions**: 90% coverage

### Checking Coverage

```bash
# Generate coverage report
npm test -- --coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage Configuration

```json
// package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Continuous Integration

### Pre-commit Checks
```bash
# Run before committing
npm run eslint
npm test
```

### CI Pipeline
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run eslint
      - run: npm test
      - run: npm run test:security
```

## Debugging Tests

### Running Single Test
```bash
npm test -- --testNamePattern="creates S3 bucket"
```

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Logging in Tests
```typescript
test('my test', () => {
  console.log('Debug info:', someValue);
  // Test code
});
```
