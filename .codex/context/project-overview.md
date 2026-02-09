# Project Overview

## Purpose

AppMod Catalog Blueprints provides AWS CDK blueprints for agentic/document-processing systems, plus runnable examples.

## Critical Distinction

- Constructs (`use-cases/`) are reusable library components.
- Examples (`examples/`) are deployable applications that compose existing constructs.
- Other work includes docs, tooling, CI, scripts, and repository maintenance.

## Top-Level Map

- `use-cases/`: reusable construct libraries (publishable/reusable patterns)
- `examples/`: deployable example apps that compose constructs
- `test/`: repository-level tests
- `website/`: docs site
- `assets/`: shared static assets

## Technical Baseline

- Language: TypeScript (primary), Python (Lambda/tool runtime)
- Infra: AWS CDK v2
- Package manager: npm
- Build management: Projen
- Main quality gates: ESLint, Jest, CDK Nag tests

## Change Strategy

- In `use-cases/`: prioritize abstraction, extension points, backwards compatibility.
- In `examples/`: prioritize clarity, deployability, and docs for end-to-end usage.
- In `test/`: add/adjust tests with behavior changes.

## Core Patterns

- Template Method for base workflow + subclass hooks.
- Strategy pattern for pluggable ingress/adapters.
- Factory methods for subclass-owned specialized resources.
- Opt-in observability and event integrations as cross-cutting concerns.

## Common Commands

- `npm run build`
- `npm run eslint`
- `npm test`
- `npm run test:document-processing:unit`
- `npm run test:cdk-nag:all`
