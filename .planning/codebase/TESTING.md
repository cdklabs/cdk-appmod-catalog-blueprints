# Testing Patterns

**Analysis Date:** 2026-03-01

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `jest` section in `package.json`

**Assertion Library:**
- Jest built-in matchers (expect API)
- AWS CDK Assertions library: `aws-cdk-lib/assertions` (Template, Match)

**Run Commands:**
```bash
npm test                              # Run all tests with coverage
npm run test:watch                    # Run tests in watch mode
npm run test:cdk-nag:all             # Run all CDK Nag security tests
npm run test:webapp                  # Run webapp use case tests
npm run test:webapp:unit             # Run webapp unit tests (exclude nag)
npm run test:document-processing     # Run document processing tests
npm run test:document-processing:unit # Run document processing unit tests
npm run test:security                # Run security-focused tests including CDK Nag
```

## Test File Organization

**Location:**
- Tests co-located with source code in `tests/` subdirectories
- Framework tests: `use-cases/framework/tests/[construct].test.ts`
- Knowledge base tests: `use-cases/framework/agents/knowledge-base/tests/[name].test.ts`
- Webapp tests: `use-cases/webapp/tests/[construct].test.ts`
- Document processing tests: `use-cases/document-processing/tests/[name].test.ts`

**Naming:**
- Pattern: `[construct-name].test.ts` for unit tests
- Pattern: `[construct-name]-nag.test.ts` for security/CDK Nag tests
- Pattern: `[construct-name].test.ts` for integration tests

**Structure:**
```
use-cases/framework/
├── foundation/
│   ├── access-log.ts
│   ├── network.ts
│   └── ...
├── tests/
│   ├── access-log.test.ts
│   ├── network.test.ts
│   └── ...
agents/
├── knowledge-base/
│   ├── base-knowledge-base.ts
│   └── tests/
│       ├── base-knowledge-base.test.ts
│       └── bedrock-knowledge-base.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('AccessLog', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  test('creates bucket with default configuration', () => {
    // Test implementation
  });

  test('applies custom lifecycle rules', () => {
    // Test implementation
  });

  describe('Validation', () => {
    test('throws error for empty name', () => {
      // Validation test
    });
  });
});
```

**Patterns:**
- `describe()` blocks organize related tests by functionality
- `beforeEach()` hook initializes fresh app and stack for each test
- Nested `describe()` blocks for sub-suites (e.g., Validation, Configuration)
- `test()` blocks use descriptive names matching user-facing behavior
- No shared state between tests; each test is independent
- Use `env` property with fixed account/region for deterministic snapshots: `env: { account: '123456789012', region: 'us-east-1' }`

**Setup pattern:**
```typescript
beforeEach(() => {
  app = createTestApp();  // Uses TEST_CONTEXT to skip bundling
  stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
});
```

**Teardown pattern:**
- Not explicitly needed; Jest automatically cleans up after each test
- Stack/app destroyed at test completion

## Test Structure Examples

**Template matching pattern (most common):**
```typescript
test('creates bucket with default configuration', () => {
  new AccessLog(stack, 'AccessLog');

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 1);
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: 'access-logs-123456789012-us-east-1',
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
      }],
    },
  });
});
```

**Property inspection pattern:**
```typescript
test('exposes name as public readonly', () => {
  const kb = new TestKnowledgeBase(stack, 'TestKB', {
    name: 'my-knowledge-base',
    description: 'Test knowledge base',
  });

  expect(kb.name).toBe('my-knowledge-base');
});
```

**Error/exception testing pattern:**
```typescript
test('throws error for empty name', () => {
  expect(() => {
    new TestKnowledgeBase(stack, 'TestKB', {
      name: '',
      description: 'Test description',
    });
  }).toThrow('name is required and cannot be empty');
});
```

## Mocking

**Framework:**
- AWS CDK Assertions (Template, Match) for CloudFormation snapshot testing
- No external mocking library; tests use actual CDK constructs
- Mock AWS services through CloudFormation templates

**Patterns:**
- Create actual constructs and verify CloudFormation output
- Use `Template.fromStack()` to capture synthesized template
- Use `Template.resourceCountIs()` to verify resource counts
- Use `Template.hasResourceProperties()` to verify resource properties
- Use `Match` helpers for flexible matching: `Match.objectLike()`, `Match.arrayWith()`, `Match.stringLikeRegexp()`

**Example match patterns:**
```typescript
// Match.objectLike - partial object match
template.hasResourceProperties('AWS::S3::Bucket', {
  PublicAccessBlockConfiguration: Match.objectLike({
    BlockPublicAcls: true,
    BlockPublicPolicy: true,
  }),
});

// Match.arrayWith - partial array match
template.hasResourceProperties('AWS::S3::Bucket', {
  LifecycleConfiguration: {
    Rules: Match.arrayWith([
      Match.objectLike({
        Status: 'Enabled',
        Transitions: Match.arrayWith([
          { StorageClass: 'STANDARD_IA', TransitionInDays: 30 },
        ]),
      }),
    ]),
  },
});

// Match.stringLikeRegexp - regex matching
template.hasResourceProperties('AWS::Lambda::Function', {
  Runtime: Match.stringLikeRegexp('python3\\.1[23]'),
});
```

**What to Mock:**
- AWS CloudFormation resource properties (through Template assertions)
- External AWS services via IAM policies and resource ARNs
- Lambda layers via existing layer ARNs

**What NOT to Mock:**
- CDK construct instantiation; always create actual instances
- AWS SDK calls; rely on CloudFormation template synthesis instead
- Network I/O; tests do not invoke real AWS services

## Fixtures and Factories

**Test Data:**
```typescript
// Using S3 Asset for Lambda functions
let systemPrompt: Asset;

beforeEach(() => {
  systemPrompt = new Asset(stack, 'SystemPrompt', {
    path: path.join(__dirname, '../agents/resources/default-strands-agent/batch.py'),
  });
});

// In test
new BatchAgent(stack, 'Agent', {
  agentName: 'TestAgent',
  agentDefinition: {
    systemPrompt,
  },
});
```

**Location:**
- Fixtures stored alongside test files in `resources/` subdirectories: `use-cases/framework/agents/resources/default-strands-agent/batch.py`
- Shared test utilities in `use-cases/utilities/test-utils.ts`

**Shared test helper:**
```typescript
/**
 * Creates a CDK App configured for testing with bundling disabled.
 * Use this instead of `new App()` in tests to skip Lambda bundling.
 */
export function createTestApp(props?: AppProps): App {
  return new App({
    ...props,
    context: {
      ...TEST_CONTEXT,
      ...props?.context,
    },
  });
}
```

## Coverage

**Requirements:**
- Coverage collected and reported via `coverageProvider: 'v8'`
- Coverage reports generated in multiple formats: json, lcov, clover, cobertura, text

**View Coverage:**
```bash
npm test                        # Generates coverage reports to ./coverage
# Coverage report at: coverage/lcov-report/index.html
```

**Coverage Configuration:**
- Directory: `coverage/`
- Ignored paths: `node_modules/`
- Reporters: json, lcov, clover, cobertura, text
- Test reporters: default + jest-junit (outputs to `test-reports/`)

## Test Types

**Unit Tests:**
- Scope: Individual construct behavior in isolation
- Approach: Create construct, verify CloudFormation template output
- Example: `access-log.test.ts` tests AccessLog construct directly
- Pattern: Create instance, assert resource properties

**Integration Tests:**
- Scope: Multiple constructs working together
- Approach: Create parent stack with multiple constructs, verify relationships
- Example: Agent tests verify agent integrates with network, encryption, observability
- Pattern: Create stack with multiple constructs, verify role attachments and resource links

**Security Tests (CDK Nag):**
- Scope: CloudFormation security compliance
- Approach: Run cdk-nag rules against synthesized template
- Location: `[construct]-nag.test.ts` files
- Commands: `npm run test:cdk-nag:all` runs all security tests
- Pattern: Use cdk-nag Template assertions to verify security rules pass

## Common Patterns

**Async Testing:**
```typescript
// CDK tests are synchronous; no async needed for synthesis
test('creates Lambda function with correct configuration', () => {
  new BatchAgent(stack, 'Agent', { /* props */ });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 1);
});

// For actual async operations, use standard Jest patterns
test('async operation', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe(expected);
});
```

**Error Testing:**
```typescript
// Constructor validation
test('throws error for empty name', () => {
  expect(() => {
    new TestKnowledgeBase(stack, 'TestKB', {
      name: '',
      description: 'Test description',
    });
  }).toThrow('name is required and cannot be empty');
});

// Validation with specific message matching
test('throws error for whitespace-only name', () => {
  expect(() => {
    new TestKnowledgeBase(stack, 'TestKB', {
      name: '   ',
      description: 'Test description',
    });
  }).toThrow('name is required and cannot be empty');
});
```

**Configuration Verification:**
```typescript
test('uses provided numberOfResults when specified', () => {
  const kb = new TestKnowledgeBase(stack, 'TestKB', {
    name: 'test-kb',
    description: 'Test knowledge base',
    retrieval: {
      numberOfResults: 10,
    },
  });

  const config = kb.exportConfiguration();
  expect(config.retrieval.numberOfResults).toBe(10);
});
```

**Resource Property Matching:**
```typescript
test('sets custom VPC name', () => {
  new Network(stack, 'Network', { vpcName: 'MyCustomVPC' });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::EC2::VPC', {
    Tags: Match.arrayWith([
      { Key: 'Name', Value: 'MyCustomVPC' },
    ]),
  });
});
```

## Jest Configuration

**Config File:** `package.json` (jest section)

**Key Settings:**
```json
{
  "jest": {
    "coverageProvider": "v8",
    "testMatch": [
      "<rootDir>/@(use-cases|test)/**/*(*.)@(spec|test).ts?(x)",
      "<rootDir>/@(use-cases|test)/**/__tests__/**/*.ts?(x)"
    ],
    "clearMocks": true,
    "collectCoverage": true,
    "coverageReporters": ["json", "lcov", "clover", "cobertura", "text"],
    "coverageDirectory": "coverage",
    "transform": {
      "^.+\\.[t]sx?$": ["ts-jest", { "tsconfig": "tsconfig.dev.json" }]
    }
  }
}
```

**Test Discovery:**
- Pattern: Files matching `*.test.ts`, `*.spec.ts`
- Location: `use-cases/` and `test/` directories
- Transform: TypeScript files compiled via ts-jest using `tsconfig.dev.json`

## Running Specific Tests

**Run single test file:**
```bash
npm test -- use-cases/framework/tests/access-log.test.ts
```

**Run tests matching pattern:**
```bash
npm test -- --testNamePattern="bucket"
```

**Run with debug output:**
```bash
npm test -- --verbose
```

**Update snapshots (if used):**
```bash
npm test -- --updateSnapshot
npm run test:webapp -- --updateSnapshot
```

## Test Utilities

**Location:** `use-cases/utilities/test-utils.ts`

**createTestApp():**
- Purpose: Create App with bundling disabled for fast tests
- Usage: Always use in tests instead of `new App()`
- Context: Sets `'aws:cdk:bundling-stacks': []` to skip Lambda bundling
- Returns: Configured App ready for Stack creation

**Example usage:**
```typescript
import { createTestApp } from '../../utilities/test-utils';

describe('MyConstruct', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = createTestApp();  // Skip bundling for speed
    stack = new Stack(app, 'TestStack');
  });
});
```

---

*Testing analysis: 2026-03-01*
