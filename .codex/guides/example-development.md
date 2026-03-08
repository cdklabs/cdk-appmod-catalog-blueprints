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

## Documentation Updates (REQUIRED)

When adding a new example, update these files:
1. `examples/README.md` — add to the appropriate category table (AI Chatbots & Assistants, Intelligent Document Processing)
2. `README.md` (root) — add to "What You Can Build" section with hyperlinked constructs
3. `use-cases/README.md` — add to "Ready-to-Deploy Solutions" table
4. Related construct README — add to "Example Implementations" section

**Important**: Hyperlink all constructs in "Constructs Used" column to their documentation.

## Deep Dive

- `.kiro/steering/example-development-guide.md`
