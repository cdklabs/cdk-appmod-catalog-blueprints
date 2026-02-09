# Testing Guide

## Baseline

- Unit tests for core behavior and edge cases.
- CDK Nag tests for security/compliance on constructs/stacks.
- Integration tests for critical workflows.
- Property-based tests for logic with broad input spaces.

## Organization

- TypeScript unit tests: `*.test.ts`
- CDK Nag tests: `*-nag.test.ts`
- Python tests: `test_*.py`

## Commands

- All tests: `npm test`
- Lint: `npm run eslint`
- Document processing unit tests: `npm run test:document-processing:unit`
- CDK Nag suite: `npm run test:cdk-nag:all`

## Guidance

- Run targeted tests first for fast feedback, then broader suites.
- Add tests with behavior changes, not after.
- Keep fixtures realistic and minimal.
- For Python tool/lambda tests, use a virtual environment and pin dependencies when needed.

## Quality Bar

- No failing tests in touched scope.
- New feature behavior has positive and negative-path test coverage.
- Security/compliance checks remain green.

