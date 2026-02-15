# Construct vs Example Decision Matrix

Use this before planning implementation.

## Construct (`use-cases/**`)

Choose construct when deliverable is:
- reusable by multiple projects/teams
- extensible via props, inheritance, or composition
- part of shared library surface area
- expected to carry strong unit + CDK Nag coverage

## Example (`examples/**`)

Choose example when deliverable is:
- deployable reference implementation
- opinionated composition of existing constructs
- focused on onboarding and end-to-end usage
- documented with deploy/use/monitor/troubleshoot/cleanup

## Other Work

Choose other when work is documentation, CI/CD, tooling/scripts, or repository maintenance.

## Rule

Do not implement reusable construct architecture in example stacks.

## Deep Dive

- `.kiro/steering/repository-overview.md`
- `.kiro/steering/aidlc-specdriven-core-workflow.md`
