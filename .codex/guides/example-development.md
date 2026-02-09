# Example Development Guide

Use for work in `examples/**`.

## Intent

Examples are deployable demonstrations that compose existing constructs. Do not create reusable construct architecture in example stacks.

## Standard Example Structure

- `app.ts` entry point
- `*-stack.ts` composition stack
- `cdk.json`, `package.json`, `tsconfig.json`
- `resources/` for prompts/tools/handlers
- sample files folder with README
- helper scripts for invocation/upload/testing
- comprehensive `README.md`

## Design Rules

- Compose constructs with clear, opinionated defaults.
- Avoid hardcoding account/region values.
- Provide CloudFormation outputs needed for verification and scripts.
- Keep deployment and usage steps executable by copy/paste.

## README Minimum Sections

- Overview and architecture
- Prerequisites and permissions
- Deployment commands
- How to run/invoke
- Monitoring and troubleshooting
- Cleanup

## Testing Expectations

- Validate deploy flow, invocation flow, and cleanup flow.
- Verify commands in README actually work.
- Add targeted tests when example includes custom logic beyond composition.

## Common Mistakes

- Rebuilding constructs inside examples.
- Incomplete README content.
- Missing sample data and helper scripts.
- Missing outputs for downstream operations.

