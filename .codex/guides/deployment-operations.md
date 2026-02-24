# Deployment and Operations Guide

Use for example deployment and operational checks.

## Prerequisites

- Node.js and npm installed
- AWS CLI configured
- AWS CDK v2 available
- Target account/region bootstrapped

## Deploy

- `npm install`
- `npx cdk synth`
- `npx cdk deploy`

CI path:
- `npx cdk deploy --require-approval never`

## Verify

- Check CloudFormation outputs.
- Run helper scripts/Lambda entry points with sample inputs.
- Check Step Functions/Lambda logs and metrics.

## Troubleshooting and Cleanup

- Check stack events first for failed resources.
- Verify IAM permissions and model/region availability.
- Cleanup with `npx cdk destroy`.

## Deep Dive

- `.kiro/steering/deployment-operations.md`
