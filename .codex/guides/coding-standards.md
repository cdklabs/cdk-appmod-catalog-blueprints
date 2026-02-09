# Coding Standards

## TypeScript

- Use kebab-case file names.
- Use 2-space indentation, single quotes, semicolons.
- Prefer `interface` for public props/APIs; use `type` for unions/intersections.
- Prefer `readonly` on props and public immutable resources.
- Validate construct props early.

## CDK Construct Patterns

- Define explicit props interfaces with JSDoc.
- Expose public readonly resources only when consumers need them.
- Keep helper methods private/protected to preserve abstraction boundaries.
- Keep IAM grants and policy statements explicit and resource-scoped.

## Python (Lambdas and tools)

- Use snake_case file names and PEP 8 style.
- Use type hints and docstrings for public functions.
- Return structured success/error payloads.
- Keep tools focused and idempotent when possible.

## Documentation

- Update README/API docs when behavior or usage changes.
- Keep examples executable and commands accurate.
- Use concise JSDoc for public interfaces and defaults.

## Security and Reliability

- No hardcoded credentials/secrets.
- Encryption by default for data at rest.
- Handle failures explicitly with actionable logs.
- Fix CDK Nag findings or provide justified suppressions.

