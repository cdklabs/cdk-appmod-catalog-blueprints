# Construct vs Example Decision Matrix

Use this before planning implementation.

## Construct (`use-cases/**`)

Choose construct when the deliverable is:
- reusable by other teams/projects
- extensible via props, inheritance, or composition
- part of shared library surface area
- expected to have unit + CDK Nag coverage

## Example (`examples/**`)

Choose example when the deliverable is:
- deployable reference implementation
- opinionated composition of existing constructs
- focused on user onboarding and end-to-end usage
- documented with complete deploy/use/monitor/cleanup steps

## Other Work

Choose other when work is:
- documentation
- CI/CD
- tooling/scripts
- repository maintenance

## Rule

Do not implement reusable construct architecture in example stacks.

