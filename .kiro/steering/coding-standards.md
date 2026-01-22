---
inclusion: always
---

# Coding Standards and Best Practices

## TypeScript Standards

### File Naming
- Use kebab-case for file names: `fraud-detection-stack.ts`, `base-document-processing.ts`
- Test files: `{name}.test.ts` for unit tests, `{name}-nag.test.ts` for CDK Nag tests
- Type definition files: `{name}.d.ts`

### Code Style
- Use 2-space indentation
- Use single quotes for strings
- Use semicolons
- Follow ESLint configuration in `.eslintrc.json`
- Run `npm run eslint` to check for issues

### TypeScript Conventions
- Use `interface` for public APIs and props
- Use `type` for unions, intersections, and complex types
- Prefer `readonly` for props that shouldn't be modified
- Use explicit return types for public methods
- Use `const` by default, `let` only when reassignment is needed

### CDK Construct Patterns

**Props Interface**
```typescript
export interface MyConstructProps {
  /**
   * Required property with JSDoc description
   */
  readonly requiredProp: string;
  
  /**
   * Optional property with default behavior documented
   * 
   * @default - Auto-generated value
   */
  readonly optionalProp?: string;
}
```

**Construct Class**
```typescript
export class MyConstruct extends Construct {
  /**
   * Public readonly properties for resources that consumers need
   */
  public readonly bucket: Bucket;
  
  constructor(scope: Construct, id: string, props: MyConstructProps) {
    super(scope, id);
    
    // Validate props early
    this.validateProps(props);
    
    // Create resources
    this.bucket = new Bucket(this, 'Bucket', {
      encryption: BucketEncryption.KMS,
      // ... other props
    });
  }
  
  private validateProps(props: MyConstructProps): void {
    // Validation logic
  }
}
```

## Python Standards (for Lambda functions and tools)

### File Naming
- Use snake_case for Python files: `metadata_analyzer.py`, `database_lookup.py`
- Test files: `test_{name}.py`

### Code Style
- Follow PEP 8
- Use 4-space indentation
- Use type hints for function parameters and return values
- Include docstrings for all public functions

### Lambda Function Structure
```python
import json
import boto3
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda function handler
    
    Args:
        event: Lambda event payload
        context: Lambda context object
        
    Returns:
        Response dictionary with statusCode and body
    """
    try:
        # Process event
        result = process_event(event)
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

### Agent Tool Structure
```python
from strands import tool
from typing import Dict, Any

@tool
def my_tool(param1: str, param2: int) -> Dict[str, Any]:
    """
    Tool description for the agent
    
    Args:
        param1: Description of parameter 1
        param2: Description of parameter 2
        
    Returns:
        Dictionary with structured results
    """
    try:
        # Tool implementation
        result = perform_analysis(param1, param2)
        
        return {
            'success': True,
            'result': result
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
```

## Documentation Standards

### README Structure for Examples
Every example should have a README.md with:
1. **Overview**: Brief description of what the example demonstrates
2. **Architecture**: Diagram and explanation of components
3. **Prerequisites**: Required tools, AWS account setup, permissions
4. **Deployment**: Step-by-step deployment instructions
5. **Usage**: How to use the deployed example with sample commands
6. **Expected Output**: Example outputs showing what success looks like
7. **Cleanup**: How to remove deployed resources
8. **Troubleshooting**: Common issues and solutions
9. **Links**: References to construct documentation

### README Structure for Use Cases
Every use case construct should have a README.md with:
1. **Overview**: What the construct does and when to use it
2. **Components**: Key components and their responsibilities
3. **Architecture**: How components interact
4. **Usage Examples**: Code examples showing how to use the construct
5. **Configuration Options**: Available props and their effects
6. **Extension Points**: How to extend or customize the construct
7. **Example Implementations**: Links to examples using this construct

### JSDoc Comments
```typescript
/**
 * Brief one-line description
 * 
 * Longer description with more details about the construct,
 * its purpose, and how it should be used.
 * 
 * @example
 * ```typescript
 * const myConstruct = new MyConstruct(this, 'MyConstruct', {
 *   requiredProp: 'value'
 * });
 * ```
 */
export class MyConstruct extends Construct {
  /**
   * The S3 bucket created by this construct
   */
  public readonly bucket: Bucket;
}
```

## Testing Standards

### Test File Organization
```typescript
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MyConstruct } from '../my-construct';

describe('MyConstruct', () => {
  let app: App;
  let stack: Stack;
  
  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
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
  });
  
  describe('Validation', () => {
    test('throws error for invalid props', () => {
      expect(() => {
        new MyConstruct(stack, 'TestConstruct', {
          requiredProp: ''  // Invalid empty string
        });
      }).toThrow();
    });
  });
});
```

### CDK Nag Tests
```typescript
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { MyConstruct } from '../my-construct';

describe('MyConstruct CDK Nag', () => {
  test('passes AWS Solutions checks', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    
    new MyConstruct(stack, 'TestConstruct', {
      requiredProp: 'value'
    });
    
    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    
    // This will throw if there are any CDK Nag errors
    app.synth();
  });
});
```

### Property-Based Testing
When implementing property-based tests:
- Use `hypothesis` for Python, `fast-check` for TypeScript
- Minimum 100 iterations per property test
- Reference the design document property being tested
- Use comment format: `# Feature: {feature-name}, Property N: {property text}`

```python
from hypothesis import given, strategies as st

# Feature: fraud-detection-example, Property 12: JSON Output Validity
@given(st.text())
def test_json_output_validity(input_data):
    """For any fraud assessment output, it should be valid JSON"""
    result = generate_assessment(input_data)
    parsed = json.loads(result)  # Should not raise exception
    assert isinstance(parsed, dict)
```

## Resource Naming Conventions

### CDK Construct IDs
- Use PascalCase: `MyConstruct`, `DocumentBucket`, `ProcessingQueue`
- Be descriptive but concise
- Avoid redundant prefixes (e.g., don't use `MyConstructBucket` when `Bucket` is clear in context)

### AWS Resource Names
- Use kebab-case for resource names: `fraud-detection-bucket`, `processing-queue`
- Include environment or stage when relevant: `fraud-detection-prod-bucket`
- Keep names under 63 characters for DNS compatibility

### CloudFormation Logical IDs
- CDK generates these automatically
- Don't override unless necessary for cross-stack references
- If overriding, use PascalCase: `DocumentProcessingBucket`

## Error Handling Patterns

### Lambda Functions
```typescript
export const handler = async (event: any, context: any) => {
  try {
    // Validate input
    if (!event.documentId) {
      throw new Error('Missing required field: documentId');
    }
    
    // Process
    const result = await processDocument(event);
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error processing document:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
```

### Step Functions Error Handling
```typescript
const processStep = new LambdaInvoke(this, 'ProcessStep', {
  lambdaFunction: processingFunction,
  resultPath: '$.processingResult'
}).addCatch(errorHandler, {
  errors: ['States.ALL'],
  resultPath: '$.error'
});
```

### Tool Error Handling
```python
@tool
def my_tool(param: str) -> Dict[str, Any]:
    """Tool with proper error handling"""
    try:
        result = perform_operation(param)
        return {
            'success': True,
            'result': result
        }
    except FileNotFoundError as e:
        return {
            'success': False,
            'error': str(e),
            'error_type': 'FileNotFoundError',
            'recoverable': False
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'recoverable': True
        }
```

## Security Best Practices

### IAM Policies
- Use least-privilege access
- Scope permissions to specific resources when possible
- Use CDK's grant methods: `bucket.grantRead()`, `table.grantWriteData()`
- Document why broad permissions are needed if unavoidable

```typescript
// Good: Specific resource
bucket.grantRead(lambdaFunction);

// Avoid: Broad permissions
lambdaFunction.addToRolePolicy(new PolicyStatement({
  actions: ['s3:*'],
  resources: ['*']
}));
```

### Encryption
- Always use KMS encryption for S3 buckets
- Encrypt DynamoDB tables
- Encrypt environment variables containing sensitive data
- Use customer-managed keys when compliance requires it

```typescript
const bucket = new Bucket(this, 'Bucket', {
  encryption: BucketEncryption.KMS,
  encryptionKey: props.encryptionKey,  // Allow custom key
  enforceSSL: true
});
```

### Secrets Management
- Never hardcode secrets in code
- Use AWS Secrets Manager or Systems Manager Parameter Store
- Pass secrets as environment variables at runtime
- Rotate secrets regularly

## Performance Considerations

### Lambda Functions
- Right-size memory allocation (affects CPU)
- Use Lambda layers for shared dependencies
- Minimize cold start time by keeping deployment packages small
- Use provisioned concurrency for latency-sensitive functions

### Step Functions
- Use Express Workflows for high-volume, short-duration workflows
- Use Standard Workflows for long-running processes
- Implement appropriate timeouts at each step
- Use parallel execution when steps are independent

### S3 Operations
- Use S3 Transfer Acceleration for large files
- Implement lifecycle policies for cost optimization
- Use appropriate storage classes
- Enable versioning only when needed

## Observability Patterns

### Structured Logging
```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'fraud-detection' });

export const handler = async (event: any) => {
  logger.info('Processing document', {
    documentId: event.documentId,
    documentType: event.documentType
  });
  
  try {
    const result = await processDocument(event);
    logger.info('Document processed successfully', { result });
    return result;
  } catch (error) {
    logger.error('Error processing document', { error });
    throw error;
  }
};
```

### Metrics
- Use CloudWatch custom metrics for business metrics
- Use EMF (Embedded Metric Format) for high-cardinality metrics
- Include dimensions for filtering: service, operation, status

### Tracing
- Enable X-Ray tracing for Lambda functions
- Use subsegments for detailed tracing
- Trace external API calls and database operations

## Common Pitfalls to Avoid

1. **Don't modify generated files**: `package.json`, `tsconfig.json` are managed by Projen
2. **Don't hardcode AWS account IDs or regions**: Use `Stack.of(this).account` and `Stack.of(this).region`
3. **Don't create circular dependencies**: Between stacks or constructs
4. **Don't forget to clean up resources**: Implement proper removal policies
5. **Don't skip validation**: Validate props in construct constructors
6. **Don't ignore CDK Nag warnings**: Address them or document suppressions
7. **Don't use deprecated CDK APIs**: Check CDK documentation for current best practices
8. **Don't forget to export public APIs**: Update `index.ts` files when adding new constructs
