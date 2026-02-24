# Project Overview

## Purpose

AppMod Catalog Blueprints provides AWS CDK blueprints for agentic/document-processing systems plus runnable examples.

## Critical Distinction

- Constructs (`use-cases/`) are reusable library components.
- Examples (`examples/`) are deployable applications that compose existing constructs.
- Other work includes docs, tooling, CI, scripts, and repository maintenance.

## Top-Level Map

- `use-cases/`: reusable construct libraries
- `examples/`: deployable example apps
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

- In `use-cases/`: prioritize abstraction, extension points, backward compatibility.
- In `examples/`: prioritize deployability, clarity, and accurate operational docs.
- In `test/`: add/adjust tests with behavior changes.

## Core Commands

- `npm run build`
- `npm run eslint`
- `npm test`
- `npm run test:document-processing:unit`
- `npm run test:cdk-nag:all`

## Deep Dive

- `.kiro/steering/repository-overview.md`
