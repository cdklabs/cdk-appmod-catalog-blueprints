# Example Development Guide

Use for work in `examples/**`.

## Intent

Examples are deployable demonstrations that compose existing constructs. Do not build reusable construct architecture in example stacks.

## Design Rules

- Compose constructs with clear, opinionated defaults.
- Avoid hardcoded account/region values.
- Provide outputs needed for verification and helper scripts.
- Keep deployment and usage commands copy/paste runnable.

## README Minimum

- Overview and architecture
- Prerequisites and permissions
- Deployment commands
- Run/invocation flow
- Monitoring and troubleshooting
- Cleanup

## Testing Expectations

- Validate deploy flow, invocation flow, and cleanup flow.
- Verify README commands actually work.
- Add targeted tests when custom logic exists beyond composition.

## Deep Dive

- `.kiro/steering/example-development-guide.md`
