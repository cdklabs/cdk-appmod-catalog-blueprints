---
inclusion: fileMatch
fileMatchPattern: 'use-cases/**'
---

# Testing Guide

## 🔨 CRITICAL: Build Command Requirements

**Before running any tests, ensure code is properly compiled using the correct build command.**

### ✅ ALWAYS Use This Build Command
```bash
npx projen build
```

**NEVER use:**
- `tsc` - Does not handle JSII compilation
- `npm run build` - May not use correct JSII settings
- `npx tsc` - Bypasses JSII compilation

### Why This Matters for Testing
This repository uses JSII for multi-language support. Tests depend on properly compiled JSII modules in the `lib/` directory. Using `tsc` directly will cause module resolution issues in Jest/ts-jest, leading to errors like:
```
TypeError: Cannot read properties of undefined (reading 'handleDefault')
```

### Build Before Testing Workflow
```bash
# 1. Make code changes in use-cases/
vim use-cases/framework/agents/my-agent.ts

# 2. Build with JSII compilation
npx projen build

# 3. Run tests
npm test

# Or run specific test
npm test -- use-cases/framework/tests/my-agent.test.ts
```

### Troubleshooting Test Failures
If tests fail with "undefined" errors:
1. Clear build cache: `rm -rf .jsii lib/tsconfig.tsbuildinfo`
2. Clear Jest cache: `npx jest --clearCache`
3. Rebuild: `npx projen build`
4. Run tests: `npm test`

---

## Testing Philosophy

This repository uses a comprehensive testing approach:
- **Unit Tests**: Test individual components and logic
- **Integration Tests**: Test CDK stack synthesis and resource creation
- **CDK Nag Tests**: Automated security and compliance checking
- **Property-Based Tests**: Verify universal properties across all inputs (when applicable)

## Test Performance Optimization: Skipping Bundling

### Why Skip Bundling?

CDK constructs like `NodejsFunction` and `PythonFunction` automatically bundle Lambda code during synthesis. This bundling (using esbuild or Docker) can significantly slow down unit tests, especially when you have many tests creating stacks.

Since Lambda code bundling is typically tested separately (in integration tests or deployment), you can skip it in unit tests to dramatically improve test execution time.

### How to Skip Bundling

Use the `createTestApp()` utility from `use-cases/utilities/test-utils.ts`:

```typescript
import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createTestApp } from '../../test-utils';
import { MyConstruct } from '../my-construct';

describe('MyConstruct', () => {
  test('creates resources correctly', () => {
    // Use createTestApp() instead of new App()
    const app = createTestApp();
    const stack = new Stack(app, 'TestStack');
    
    new MyConstruct(stack, 'Test', { /* props */ });
    
    const template = Template.fromStack(stack);
    // ... assertions
  });
});
```

### How It Works

The `createTestApp()` function creates a CDK App with the `aws:cdk:bundling-stacks` context set to an empty array:

```typescript
export function createTestApp(props?: AppProps): App {
  return new App({
    ...props,
    context: {
      'aws:cdk:bundling-stacks': [],
      ...props?.context,
    },
  });
}
```

This tells CDK to skip bundling for all stacks during synthesis.

### When to Use

- **Unit tests**: Always use `createTestApp()` for faster test execution
- **CDK Nag tests**: Use `createTestApp()` since you're testing security compliance, not bundling
- **Integration tests**: May want to use regular `new App()` if testing actual bundled code

### Performance Impact

Skipping bundling can reduce test execution time by 50-80% depending on the number of Lambda functions in your constructs.

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
├── test-utils.ts  # Test utilities including createTestApp()
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
import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { createTestApp } from '../../test-utils';
import { MyConstruct } from '../my-construct';

describe('MyConstruct', () => {
  let app: App;
  let stack: Stack;
  
  beforeEach(() => {
    // Use createTestApp() to skip bundling and speed up tests
    app = createTestApp();
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

### Python Testing Setup with Virtual Environment

**Always use a virtual environment for Python testing** to ensure isolated, reproducible test environments.

#### Creating and Activating Virtual Environment

```bash
# Navigate to the Python resource directory
cd use-cases/document-processing/resources/cleanup

# Create virtual environment
python3 -m venv venv

# Activate virtual environment (macOS/Linux)
source venv/bin/activate

# Activate virtual environment (Windows)
# venv\Scripts\activate

# Verify activation (should show venv path)
which python
```

#### Installing Dependencies

```bash
# Install test dependencies
pip install pytest pytest-cov hypothesis moto boto3

# Install project dependencies if requirements.txt exists
pip install -r requirements.txt

# For development, you may want to install in editable mode
pip install -e .
```

#### Running Python Tests

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Run all tests in directory
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest test_handler.py

# Run specific test function
pytest test_handler.py::test_handler_success

# Run with coverage
pytest --cov=. --cov-report=html

# Run property-based tests with more examples
pytest --hypothesis-seed=0
```

#### Virtual Environment Best Practices

1. **One venv per Python resource directory**: Each Lambda function or tool directory should have its own `venv/`
2. **Add venv to .gitignore**: Virtual environments should not be committed
3. **Document dependencies**: Always maintain a `requirements.txt` file
4. **Deactivate when done**: Run `deactivate` when finished testing

```bash
# Deactivate virtual environment when done
deactivate
```

#### Example Directory Structure

```
use-cases/document-processing/resources/
├── cleanup/
│   ├── handler.py
│   ├── requirements.txt
│   ├── test_handler.py
│   └── venv/              # Not committed to git
├── aggregation/
│   ├── handler.py
│   ├── requirements.txt
│   ├── test_handler.py
│   └── venv/              # Not committed to git
└── pdf-chunking/
    ├── handler.py
    ├── chunking_strategies.py
    ├── requirements.txt
    ├── test_handler.py
    ├── test_chunking_strategies.py
    └── venv/              # Not committed to git
```

#### Quick Setup Script

Create a `setup_test_env.sh` script in Python resource directories:

```bash
#!/bin/bash
# setup_test_env.sh - Quick setup for Python testing

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Created virtual environment"
fi

# Activate venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install pytest pytest-cov hypothesis moto boto3

if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi

echo "Virtual environment ready. Run 'pytest' to execute tests."
```

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

## Python Virtual Environment Troubleshooting

### Common Issues and Solutions

#### "ModuleNotFoundError" when running tests

**Problem**: Python can't find installed packages.

**Solution**: Ensure virtual environment is activated:
```bash
# Check if venv is active (should show venv path)
which python

# If not active, activate it
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

#### Wrong Python version

**Problem**: Tests fail due to Python version mismatch.

**Solution**: Create venv with specific Python version:
```bash
# Remove old venv
rm -rf venv

# Create with specific version
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### "Permission denied" on venv creation

**Problem**: Can't create virtual environment.

**Solution**: Check directory permissions or use `--system-site-packages`:
```bash
# Check permissions
ls -la

# Alternative: use user directory
python3 -m venv ~/.venvs/my-project
source ~/.venvs/my-project/bin/activate
```

#### Tests pass locally but fail in CI

**Problem**: Different environments between local and CI.

**Solution**: Pin exact versions in requirements.txt:
```bash
# Generate pinned requirements
pip freeze > requirements.txt

# Or use pip-tools for better dependency management
pip install pip-tools
pip-compile requirements.in
```

#### Cleaning up virtual environments

```bash
# Deactivate first
deactivate

# Remove venv directory
rm -rf venv

# Recreate fresh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### CI/CD Python Testing

For CI pipelines, set up virtual environments in workflow:

```yaml
# .github/workflows/python-tests.yml
name: Python Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12']
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - name: Install dependencies
        working-directory: use-cases/document-processing/resources/cleanup
        run: |
          python -m venv venv
          source venv/bin/activate
          pip install --upgrade pip
          pip install pytest pytest-cov hypothesis moto boto3
          pip install -r requirements.txt
      - name: Run tests
        working-directory: use-cases/document-processing/resources/cleanup
        run: |
          source venv/bin/activate
          pytest -v --cov=. --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: use-cases/document-processing/resources/cleanup/coverage.xml
```
