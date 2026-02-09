# Construct Development Guide

Use for work in `use-cases/**`.

## Intent

Constructs are reusable library components. Optimize for extensibility, API stability, and strong tests.

## Common Construct Work Types

- New construct from scratch
- New layer over existing base class
- Feature addition to existing construct
- Adapter/plugin implementation
- Cross-cutting concern addition (observability, security)

## Inheritance Patterns

Two-layer pattern:
- `Base -> Concrete`
- Use when concrete types are distinct and share little specialized logic.

Three-layer pattern:
- `Base -> Concrete -> Specialized`
- Use when specialization should build progressively on shared intermediate behavior.

## Design Rules

- Define props interfaces first.
- Validate props early in constructor.
- Keep common workflow in base classes; expose extension hooks for subclasses.
- Prefer composition/injection for pluggable strategies (adapters, policies, processors).
- Expose only necessary public readonly resources; keep implementation details private/protected.

## Required Tests

- Unit tests for behavior and prop validation.
- CDK Nag tests for security/compliance.
- Integration or property-based tests when logic is complex or highly variable.

## Common Mistakes

- Breaking initialization order in inheritance.
- Skipping parent constructor setup.
- Adding tight coupling to concrete resources.
- Shipping without CDK Nag validation.

