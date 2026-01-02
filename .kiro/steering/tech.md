# Technology Stack

## Build System

- **Projen**: Project configuration and build orchestration (`.projenrc.ts`)
- **JSII**: Cross-language compilation for TypeScript, Python, Java, and .NET
- **TypeScript**: Primary development language (v5.9.3+)
- **Node.js**: Runtime environment (v18.12.0+)

## Core Dependencies

- **aws-cdk-lib**: v2.218.0 - AWS CDK framework
- **constructs**: v10.0.5 - CDK construct base classes
- **@aws-cdk/aws-lambda-python-alpha**: v2.218.0-alpha.0 - Python Lambda support

## Development Workflow

### CRITICAL: Manual Build Process
**After making any changes to source code in `use-cases/`, DO NOT automatically trigger recompile commands.**

The user will manually run the build commands when ready:
```bash
npm run compile          # Compile TypeScript
npm run package:js       # Package for JavaScript/TypeScript
```

This applies to all code changes including:
- Construct implementations
- Runtime configurations
- Agent framework updates
- Utility functions

**Exception:** You may suggest the commands the user should run, but never execute them automatically.

## Testing & Quality

- **Jest**: Unit testing framework with ts-jest
  - Configured with `maxWorkers: '50%'` for optimal performance
- **CDK Nag**: Security and compliance validation
- **Coverage**: v8 provider with multiple reporters (json, lcov, clover, cobertura)
- **ESLint**: Code linting with TypeScript support

### Testing Best Practices

#### CDK Nag Testing Pattern

CDK Nag tests validate security and compliance best practices. Follow this pattern for all constructs:

**File Structure:**
- Unit tests: `*-nag.test.ts` (separate from functional tests)
- Location: Co-located with source in `use-cases/*/tests/`

**Standard Pattern:**
```typescript
import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';

// 1. Create app and stack with explicit env
const app = new App();
const stack = new Stack(app, 'TestStack', {
  env: { account: '123456789012', region: 'us-east-1' },
});

// 2. Create construct with all required dependencies
// Include proper security configurations (SSL, logging, etc.)
new MyConstruct(stack, 'MyConstruct', {
  // ... props
});

// 3. Add suppressions for known/acceptable violations
// Use specific paths and clear reasons
NagSuppressions.addResourceSuppressionsByPath(
  stack,
  '/TestStack/MyConstruct/Resource',
  [{
    id: 'AwsSolutions-IAM5',
    reason: 'Clear explanation why wildcard is necessary',
    appliesTo: ['Resource::specific-arn-pattern/*'],
  }],
);

// Use recursive suppressions for patterns across multiple resources
NagSuppressions.addResourceSuppressions(
  stack,
  [{
    id: 'AwsSolutions-IAM5',
    reason: 'Lambda log streams are runtime-generated, wildcard required',
  }],
  true, // recursive
);

// 4. Apply CDK Nag checks
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// 5. Extract and test for violations
const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'));
const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

test('No unsuppressed warnings', () => {
  if (warnings.length > 0) {
    console.log('CDK Nag Warnings:', JSON.stringify(warnings, null, 2));
  }
  expect(warnings).toHaveLength(0);
});

test('No unsuppressed errors', () => {
  if (errors.length > 0) {
    console.log('CDK Nag Errors:', JSON.stringify(errors, null, 2));
  }
  expect(errors).toHaveLength(0);
});
```

**Common Suppressions:**

1. **CDK-Managed Resources:**
```typescript
// BucketNotificationsHandler (CDK internal)
NagSuppressions.addResourceSuppressionsByPath(
  stack,
  '/TestStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role',
  [{
    id: 'AwsSolutions-IAM4',
    reason: 'CDK-managed BucketNotificationsHandler requires AWSLambdaBasicExecutionRole',
    appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
  }],
);
```

2. **S3 Bucket Wildcards:**
```typescript
NagSuppressions.addResourceSuppressions(
  stack,
  [{
    id: 'AwsSolutions-IAM5',
    reason: 'Lambda functions require wildcard access to S3 bucket objects',
    appliesTo: ['Resource::<BucketName.Arn>/*'],
  }],
  true,
);
```

3. **Lambda Log Streams:**
```typescript
NagSuppressions.addResourceSuppressions(
  stack,
  [{
    id: 'AwsSolutions-IAM5',
    reason: 'Lambda log stream ARN is only known at runtime, wildcard required',
  }],
  true,
);
```

4. **Step Functions Lambda Invocation:**
```typescript
NagSuppressions.addResourceSuppressionsByPath(
  stack,
  '/TestStack/MyConstruct/StateMachineRole/DefaultPolicy',
  [{
    id: 'AwsSolutions-IAM5',
    reason: 'Step Functions requires wildcard permissions for version-specific Lambda ARNs',
  }],
);
```

5. **Bedrock Cross-Region Inference:**
```typescript
NagSuppressions.addResourceSuppressions(
  stack,
  [{
    id: 'AwsSolutions-IAM5',
    reason: 'Cross-region inference requires wildcard region access to Bedrock models',
    appliesTo: ['Resource::arn:aws:bedrock:*::foundation-model/*'],
  }],
  true,
);
```

**Best Practices:**
- Always provide clear, specific reasons for suppressions
- Use `appliesTo` to limit suppression scope when possible
- Use path-based suppressions for specific resources
- Use recursive suppressions for patterns across multiple resources
- Test constructs with realistic configurations (VPC, encryption, logging)
- Include all required dependencies (buckets, roles, etc.)
- Log violations in test output for debugging

#### Unit Testing Best Practices

**CRITICAL: Minimize CDK Stack Creation for Performance**

When writing CDK construct tests, especially for constructs that create Lambda functions with Docker bundling:

1. **Use `beforeAll()` instead of `beforeEach()`**
   - Create all test stacks once in `beforeAll()` and reuse them across tests
   - Never use `beforeEach()` or `afterEach()` - they cause unnecessary stack recreation
   - Each Lambda function creation triggers Docker bundling which is very slow

2. **Consolidate test scenarios into minimal stacks**
   - Create only 2-4 stacks total per test file, not one per test
   - Group related tests to use the same stack and template
   - Example: One stack for basic config, one for advanced features, one for edge cases

3. **Pre-generate templates in `beforeAll()`**
   - Create all stacks and generate templates once
   - Store templates as variables for reuse across tests
   - Tests should only contain assertions, no setup logic

4. **Example Pattern** (from `agentic-document-processing.test.ts`):
```typescript
describe('MyConstruct', () => {
  let basicStack: Stack;
  let advancedStack: Stack;
  let basicTemplate: Template;
  let advancedTemplate: Template;

  beforeAll(() => {
    // Create stacks once
    basicStack = new Stack();
    new MyConstruct(basicStack, 'Basic', { /* basic config */ });
    
    advancedStack = new Stack();
    new MyConstruct(advancedStack, 'Advanced', { /* advanced config */ });
    
    // Generate templates once
    basicTemplate = Template.fromStack(basicStack);
    advancedTemplate = Template.fromStack(advancedStack);
  });

  describe('Basic functionality', () => {
    test('creates expected resources', () => {
      basicTemplate.resourceCountIs('AWS::Lambda::Function', 1);
    });
    
    test('configures correctly', () => {
      basicTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 600,
      });
    });
  });

  describe('Advanced features', () => {
    test('supports advanced config', () => {
      advancedTemplate.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: Match.objectLike({ SubnetIds: Match.anyValue() }),
      });
    });
  });
});
```

5. **Why This Matters**
   - Each `new LambdaAgentRuntime()` or similar construct triggers Docker bundling
   - Docker bundling can take 30-60 seconds per Lambda function
   - 22 stacks = 22-44 minutes of bundling time
   - 3 stacks = 1.5-3 minutes of bundling time
   - Tests should complete in seconds, not minutes

6. **Anti-Pattern to Avoid**
```typescript
// ❌ BAD - Creates new stack for every test
beforeEach(() => {
  stack = new Stack();
});

test('test 1', () => {
  new MyConstruct(stack, 'Test1', {});
  // This triggers bundling
});

test('test 2', () => {
  new MyConstruct(stack, 'Test2', {});
  // This triggers bundling again
});
```

```typescript
// ✅ GOOD - Creates stack once, reuses across tests
beforeAll(() => {
  stack = new Stack();
  new MyConstruct(stack, 'Test', {});
  template = Template.fromStack(stack);
});

test('test 1', () => {
  template.hasResourceProperties(/* assertions */);
});

test('test 2', () => {
  template.hasResourceProperties(/* assertions */);
});
```

## Common Commands

### Build & Compile
```bash
npx projen build              # Full build with tests and docs
npx projen build:fast         # Fast build without docs (JS package only)
npx projen compile            # TypeScript compilation only
```

### Testing
```bash
npm test                                    # Run all tests
npm test -- --testPathPattern="pattern"     # Run specific tests
npm run test:watch                          # Watch mode

# Use case specific tests (examples for current use cases)
npm run test:document-processing            # All document processing tests
npm run test:document-processing:unit       # Unit tests only (no nag)
npm run test:webapp                         # All webapp tests
npm run test:webapp:unit                    # Webapp unit tests only

# Security & compliance
npm run test:cdk-nag:all                    # All CDK Nag tests
npm run test:cdk-nag:document-processing    # Document processing nag tests
npm run test:cdk-nag:webapp                 # Webapp nag tests
npm run test:security                       # Security-focused tests

# Note: New use cases should follow the same test task naming pattern
```

### Package & Release
```bash
npx projen package            # Package for all languages (JS, Python, Java, .NET)
npx projen package:js         # JavaScript/TypeScript only
npx projen package:python     # Python only
npx projen package:java       # Java only
npx projen package:dotnet     # .NET only
```

### Development
```bash
npx projen                    # Regenerate project files from .projenrc.ts
npm run upgrade               # Upgrade dependencies
npm run eslint                # Run linter
```

## Project Structure

- **Source**: `use-cases/` - All construct source code
- **Output**: `lib/` - Compiled JavaScript and type definitions
- **Tests**: `use-cases/*/tests/` - Co-located with source
- **Examples**: `examples/` - Deployable example applications
- **Resources**: `use-cases/*/resources/` - Lambda functions and runtime code

## TypeScript Configuration

- **Target**: ES2020
- **Module**: CommonJS
- **Strict mode**: Enabled with all strict checks
- **Source maps**: Inline for debugging
- **Root**: `use-cases/` compiles to `lib/`

## Key Build Behaviors

1. **Post-compile tasks** copy Lambda resources from `use-cases/` to `lib/`
2. **JSII compilation** generates multi-language packages in `dist/`
3. **Test coverage** requires >80% for contributions
4. **CDK Nag tests** run separately via dedicated tasks (not in main test suite)
5. **Documentation** auto-generated via jsii-docgen (skip with `SKIP_DOCGEN=true`)
