# Deployment and Operations Guide

Use for example deployment and operational checks.

## Prerequisites

- Node.js and npm installed
- AWS CLI configured
- AWS CDK v2 available
- Target account/region bootstrapped

Bootstrap example:
```bash
npx cdk bootstrap aws://ACCOUNT_ID/REGION
```

## Deploy

Quick path:
```bash
npm install
npx cdk synth
npx cdk deploy
```

CI path:
```bash
npx cdk deploy --require-approval never
```

## Verify

- Read CloudFormation outputs.
- Invoke helper scripts or Lambda entry points with sample input.
- Check Step Functions/Lambda logs and metrics for expected execution.

## Troubleshooting

- Check stack events first for failed resources.
- Verify IAM permissions and Bedrock/model/region availability.
- Verify required sample data exists in expected S3 prefixes.

## Cleanup

```bash
npx cdk destroy
```

If destroy fails, empty retained buckets/log groups and retry.

