# Coding Standards

## TypeScript

- Use kebab-case file names.
- Use 2-space indentation, single quotes, semicolons.
- Prefer `interface` for public APIs; use `type` for unions/intersections.
- Prefer `readonly` on immutable public props/resources.
- Validate construct props early.

## CDK Construct Patterns

- Define explicit props interfaces with focused JSDoc.
- Expose public readonly resources only when needed by consumers.
- Keep helper methods private/protected unless extension requires otherwise.
- Keep IAM grants and policy statements explicit and resource-scoped.

## Python (Lambdas/tools)

- Use snake_case file names and PEP 8 style.
- Use type hints and docstrings for public functions.
- Return structured success/error payloads.
- Keep tools focused and idempotent where possible.

## Security and Reliability

- No hardcoded credentials/secrets.
- Encryption by default for data at rest.
- Handle failures explicitly with actionable logs.
- Fix CDK Nag findings or provide justified suppressions.

## Deep Dive

- `.kiro/steering/coding-standards.md`
