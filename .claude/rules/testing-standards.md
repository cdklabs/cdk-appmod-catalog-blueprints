# Testing Standards

## Commands

```bash
npm test                                 # All tests
npm run eslint                           # Lint
npm run test:document-processing:unit    # Document processing unit tests
npm run test:webapp:unit                 # Web app unit tests
npm run test:cdk-nag:all                 # All CDK Nag security/compliance tests
npm test -- --testPathPattern="<path>"   # Specific test suite
```

Always use Projen-backed scripts. Never run `jest` directly.

## Test Categories

### Unit Tests (required for all constructs)
- Test resource creation, resource counts, IAM permissions, validation, and optional props
- Use `createTestApp()` from `use-cases/utilities/test-utils.ts` instead of `new App()` — skips Lambda bundling, 50-80% faster
- Use `Template.fromStack()` and `Match` utilities from `aws-cdk-lib/assertions`
- Cover both positive and negative paths (valid input AND invalid input / error cases)
- Use `beforeEach` to set up fresh `app` and `stack` per test

### CDK Nag Tests (required when changing constructs or security posture)
- Use `AwsSolutionsChecks` from `cdk-nag` with `{ verbose: true }`
- Apply `Aspects.of(stack).add(new AwsSolutionsChecks())` then `app.synth()`
- Fix findings or add justified `NagSuppressions` with documented `reason`
- Common suppression IDs: IAM4 (managed policies), IAM5 (wildcards), S1 (S3 logging), L1 (Lambda runtime)

### Property-Based Tests (for broad/variable input spaces)
- Python: `hypothesis` with `@given` decorator, minimum 100 iterations
- TypeScript: `fast-check` with `fc.assert` / `fc.property`, `{ numRuns: 100 }`
- Comment format: `# Feature: {feature-name}, Property N: {property text}`

### Integration Tests (for critical workflows)
- Test full stack synthesis without errors
- Verify all key resources exist and are properly connected
- May use regular `new App()` if testing actual bundled code

## Coverage

- Overall: >=80% code coverage
- Critical paths (error handling, security): 100%
- CDK constructs: 100% resource creation coverage
- Lambda functions: >=90%

## Quality Gate

Before PR:
- No failing tests in touched scope
- New behavior has positive and negative-path coverage
- `npm run eslint` passes
- `npm run test:cdk-nag:all` green when security posture changes
- Run targeted tests first for fast feedback, then broader suites

## Python Testing

- Use a virtual environment per Python resource directory (`python3 -m venv venv`)
- Install: `pip install pytest pytest-cov hypothesis moto boto3`
- Mock AWS services with `moto` (`@mock_s3`, `@mock_dynamodb`)
- Use `pytest` fixtures for setup/teardown
- Keep fixtures realistic and minimal
