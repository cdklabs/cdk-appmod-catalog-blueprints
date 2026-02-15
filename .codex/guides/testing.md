# Testing Guide

## Baseline

- Unit tests for core behavior and edge cases.
- CDK Nag tests for security/compliance on constructs/stacks.
- Integration tests for critical workflows.
- Property-based tests for broad/variable input spaces.

## Commands

- All tests: `npm test`
- Lint: `npm run eslint`
- Document processing unit tests: `npm run test:document-processing:unit`
- CDK Nag suite: `npm run test:cdk-nag:all`

## Guidance

- Run targeted tests first for fast feedback, then broader suites.
- Add tests with behavior changes.
- Keep fixtures realistic and minimal.

## Quality Bar

- No failing tests in touched scope.
- New behavior has positive and negative-path coverage.
- Security/compliance checks remain green.

## Deep Dive

- `.kiro/steering/testing-guide.md`
