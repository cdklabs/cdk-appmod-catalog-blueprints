# Construct Development Guide

Use for work in `use-cases/**`.

## Intent

Constructs are reusable library components. Optimize for extensibility, API stability, and security by default.

## Design Rules

- Define props interfaces first.
- Validate props early in constructors.
- Keep common workflow in base classes; expose extension hooks for subclasses.
- Prefer composition/injection for pluggable strategies.
- Expose only necessary public readonly resources.

## Required Tests

- Unit tests for behavior and prop validation.
- CDK Nag tests for security/compliance.
- Integration/property-based tests when logic is complex or highly variable.

## Common Mistakes

- Breaking initialization order in inheritance.
- Adding tight coupling to concrete resources.
- Shipping without CDK Nag validation.

## Documentation Updates (REQUIRED)

When adding a new construct, update:
1. Construct's own README — usage, config options, example implementations
2. Parent module README — reference the new construct
3. Root README — if new use case category, add to the table

## Deep Dive

- `.kiro/steering/construct-development-guide.md`
