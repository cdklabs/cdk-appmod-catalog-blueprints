---
inclusion: manual
---

# Steering Documentation

This directory contains steering files that provide context and guidance for working with the AppMod Catalog Blueprints repository.

## What are Steering Files?

Steering files are documentation that gets automatically included in AI assistant context to help with development tasks. They provide:
- Repository structure and conventions
- Coding standards and best practices
- Development workflows (constructs vs examples)
- Domain-specific guidance
- Testing and deployment procedures

## Available Steering Files

### Core Guides (Always Included)

These files are automatically included in all interactions:

- **`repository-overview.md`**: High-level overview of repository structure, core concepts, technology stack, and quick start guide
- **`aidlc-specdriven-core-workflow.md`**: Decision-driven spec creation workflow - determines construct vs example, guides through requirements/design/tasks phases
- **`coding-standards.md`**: TypeScript and Python coding standards, CDK patterns, documentation requirements, naming conventions

### Construct Development (Loaded for use-cases/**)

These files are included when working with constructs:

- **`construct-development-guide.md`**: OOP patterns, inheritance models (two-layer vs three-layer), design patterns, step-by-step construct development
- **`testing-guide.md`**: Comprehensive testing strategies including unit tests, CDK Nag tests, integration tests, property-based tests
- **`document-processing-guide.md`**: Document processing architecture layers, ingress adapters, workflow structure, agent tools development
- **`agentic-framework-guide.md`**: Agentic AI framework, BaseAgent and BatchAgent usage, tool development, Bedrock model configuration

### Example Development (Loaded for examples/**)

These files are included when working with examples:

- **`example-development-guide.md`**: Example structure, composing constructs, documentation requirements, sample files, helper scripts
- **`deployment-operations.md`**: Deployment procedures, monitoring, troubleshooting, CI/CD integration, cleanup

### Manual Inclusion

This file (`README.md`) is only included when explicitly referenced with `#` in chat.

## File Organization

**Current Structure: Flat (Recommended)**
```
.kiro/steering/
├── README.md
├── repository-overview.md
├── aidlc-decisions-approval.md
├── coding-standards.md
├── construct-development-guide.md
├── example-development-guide.md
├── testing-guide.md
├── deployment-operations.md
├── document-processing-guide.md
└── agentic-framework-guide.md
```

**Why Flat Structure?**
- ✅ Simple file references (no nested paths)
- ✅ Easy to find files (all in one place)
- ✅ Kiro's fileMatch patterns work cleanly
- ✅ Only 10 files - not overwhelming
- ✅ Clear naming makes purpose obvious

**When to Consider Subfolders:**
- ❌ If you have 20+ steering files
- ❌ If you have multiple unrelated domains
- ❌ If you need different inclusion patterns per domain

**Recommendation: Keep flat structure.** The current organization is clean and manageable.

## How Inclusion Works

### Automatic Loading by Context

**When creating a spec:**
- ✅ `repository-overview.md`
- ✅ `aidlc-decisions-approval.md`
- ✅ `coding-standards.md`

**When working in use-cases/:**
- ✅ Core guides (above)
- ✅ `construct-development-guide.md`
- ✅ `testing-guide.md`
- ✅ Domain-specific guides (`document-processing-guide.md`, `agentic-framework-guide.md`)

**When working in examples/:**
- ✅ Core guides
- ✅ `example-development-guide.md`
- ✅ `deployment-operations.md`

### Token Optimization

The inclusion strategy ensures you never load both construct and example guides simultaneously, saving significant tokens.

## How to Use

### For Developers

The steering files are automatically used by AI assistants (like Kiro) when you're working in this repository. You don't need to do anything special - just work on your code and the relevant guidance will be available.

### For AI Assistants

**Starting a new project:**
1. Read `repository-overview.md` to understand the project
2. Check `aidlc-decisions-approval.md` to determine construct vs example
3. Follow the appropriate development guide

**Working on constructs:**
1. Follow `construct-development-guide.md` for OOP patterns
2. Use `testing-guide.md` for comprehensive testing
3. Reference domain guides (`document-processing-guide.md`, `agentic-framework-guide.md`) as needed
4. Follow `coding-standards.md` for all code

**Working on examples:**
1. Follow `example-development-guide.md` for structure
2. Use `deployment-operations.md` for deployment
3. Follow `coding-standards.md` for all code

## Quick Reference

### Creating a New Construct
1. Determine type: new construct, new layer, feature addition, adapter, or cross-cutting concern
2. Follow `construct-development-guide.md` for OOP patterns
3. Choose inheritance model (two-layer vs three-layer)
4. Write comprehensive tests per `testing-guide.md`
5. Follow `coding-standards.md` for code style
6. Export from `use-cases/index.ts`

### Creating a New Example
1. Follow structure in `example-development-guide.md`
2. Compose existing constructs (don't create new ones)
3. Include sample files and helper scripts
4. Write comprehensive README with deployment instructions
5. Test deployment per `deployment-operations.md`

### Adding a Feature to Existing Construct
1. Review existing construct in `construct-development-guide.md`
2. Determine integration approach (extend props, override methods, etc.)
3. Maintain backward compatibility
4. Update tests per `testing-guide.md`
5. Update documentation

### Writing Tests
1. Follow structure in `testing-guide.md`
2. Include unit tests, CDK Nag tests, and property-based tests where applicable
3. Maintain >80% code coverage
4. Document test purpose and expected behavior

### Deploying Examples
1. Follow prerequisites in `deployment-operations.md`
2. Use 3-command deployment pattern: `npm install`, `npm run build`, `npm run deploy`
3. Monitor deployment and test deployed resources
4. Clean up with `cdk destroy` when done

## Updating Steering Files

When updating these files:
1. Keep information accurate and current
2. Use clear, concise language
3. Include practical examples from the repository
4. Update the inclusion rules if needed (frontmatter)
5. Test that the guidance works in practice
6. Update this README if adding/removing files

## File Inclusion Rules

Steering files use frontmatter to control when they're included:

```yaml
---
inclusion: always
---
```
- `always`: Included in all interactions
- `fileMatch`: Included when working with files matching `fileMatchPattern`
  ```yaml
  ---
  inclusion: fileMatch
  fileMatchPattern: 'use-cases/**'
  ---
  ```
- `manual`: Only included when explicitly referenced with `#` in chat

## Getting Help

If you need clarification on any guidance:
1. Check the relevant steering file
2. Look at existing examples in the repository
3. Review the main README.md and API.md
4. Check the documentation website: https://cdklabs.github.io/cdk-appmod-catalog-blueprints/
5. Reference this README with `#README.md` in chat
