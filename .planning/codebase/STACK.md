# Technology Stack

**Analysis Date:** 2026-03-01

## Languages

**Primary:**
- TypeScript 5.9.3 - Core infrastructure-as-code language for AWS CDK constructs
- JavaScript - Lambda runtime handlers for serverless functions

**Secondary:**
- Python - Lambda functions via `@aws-cdk/aws-lambda-python-alpha` package, data loading utilities
- Java - JSII-generated bindings (via jsii-pacmak)
- C# (.NET) - JSII-generated bindings (via jsii-pacmak)

## Runtime

**Environment:**
- Node.js >= 18.12.0 (as specified in `package.json`)

**Package Manager:**
- npm - Primary package manager
- Lockfile: `package-lock.json` present

## Frameworks

**Core Infrastructure:**
- AWS CDK 2.218.0 - Infrastructure-as-code framework for defining AWS resources
- AWS CDK Lambda Python Alpha 2.218.0-alpha.0 - Python Lambda function support
- Constructs 10.0.5 - Base class for CDK constructs

**Code Generation:**
- jsii 5.9.5 - JavaScript/TypeScript interoperability for multi-language support
- jsii-pacmak 1.126.0 - Packages jsii modules for Python, Java, .NET distribution
- jsii-docgen 10.11.12 - Generates API documentation from jsii modules
- jsii-rosetta 5.9.32 - Translates code examples across supported languages

**Build & Development:**
- projen 0.98.4 - Project synthesis tool that manages package.json, tsconfig, eslint, jest configs
- TypeScript 5.9.3 - Compiler for TypeScript source code
- ts-node 10.9.2 - TypeScript execution for Node.js

**Testing:**
- Jest 29.7.0 - Test runner and framework
- ts-jest 29.4.6 - Jest plugin for TypeScript support
- jest-junit 16 - JUnit reporter for jest
- @types/jest 29.5.14 - TypeScript type definitions for Jest

**Code Quality:**
- ESLint 9 - JavaScript/TypeScript linter with custom configurations
- @typescript-eslint/eslint-plugin 8 - TypeScript-specific ESLint rules
- @typescript-eslint/parser 8 - TypeScript parser for ESLint
- @stylistic/eslint-plugin 2 - Code style rules for ESLint
- eslint-plugin-import 2.32.0 - Import/export linting
- eslint-import-resolver-typescript 4.4.4 - TypeScript path resolution for import plugin
- cdk-nag 2.37.55 - Security and best-practice checks for CDK constructs

**Release Management:**
- commit-and-tag-version 12 - Automated semantic versioning and changelog generation
- jsii-diff 1.126.0 - Detects API compatibility breaks in jsii modules

## Key Dependencies

**Critical:**
- aws-cdk-lib 2.218.0 - AWS CDK core library containing all AWS service constructs
- @aws-cdk/aws-lambda-python-alpha 2.218.0-alpha.0 - Python Lambda construct (peer dependency)
- @aws-cdk/integ-runner - Integration test runner for CDK constructs
- @aws-cdk/integ-tests-alpha - Integration testing utilities for CDK

**Infrastructure Patterns:**
- cdk-nag 2.37.55 - CloudFormation template validation against AWS best practices and security rules

## Configuration

**Environment:**
- AWS Credentials - Required for deployment (configured via `aws configure` or `AWS_PROFILE`)
- AWS Region - Specified via environment or CDK stack configuration

**Build:**
- `tsconfig.json` - TypeScript compiler configuration
  - Output: `lib/` directory
  - Source: `use-cases/` directory
  - Target: ES2020
  - Module system: CommonJS
  - Strict mode enabled
- `tsconfig.dev.json` - Development TypeScript configuration used by Jest
- `.projenrc.ts` - Projen project configuration defining build, test, and packaging tasks
- `.eslintrc.json` - ESLint configuration with import, TypeScript, and stylistic rules
- `jest` config in `package.json` - Jest test configuration with coverage and reporting

**jsii Configuration (in `package.json`):**
- Output directory: `dist/`
- Target languages: Python, Java, .NET
- Compilation: TypeScript source from `use-cases/` to CommonJS in `lib/`

## Platform Requirements

**Development:**
- Node.js 18.12.0 or higher
- npm for package management
- AWS CLI configured with credentials and region
- Docker (for bundling Python Lambda functions and cross-language packaging)

**Production:**
- AWS Account with appropriate IAM permissions for CDK deployment
- AWS CloudFormation for stack management
- Target AWS region must support required services (Bedrock, Lambda, Step Functions, etc.)

## Package Distribution

**npm Registry:**
- Published as: `@cdklabs/cdk-appmod-catalog-blueprints`
- Scope: @cdklabs (public access)
- Entry point: `lib/index.js`
- Types: `lib/index.d.ts`
- Files included: `lib/`, `.jsii`

**Multi-language Support:**
- Python package: `appmod-catalog-blueprints` (PyPI-compatible)
- Java package: `io.github.cdklabs:appmod-catalog-blueprints` (Maven Central)
- .NET package: `CdklabsAppmodCatalogBlueprints` (NuGet)

---

*Stack analysis: 2026-03-01*
