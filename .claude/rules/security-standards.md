# Security Standards

## IAM — Least Privilege

- Use CDK grant methods whenever possible: `bucket.grantRead(fn)`, `table.grantWriteData(fn)`
- Scope IAM permissions to specific resources — never use `Resource: '*'` unless unavoidable
- Never use `actions: ['s3:*']` or other service-wide wildcards
- When broad permissions are necessary, document the justification in a CDK Nag suppression
- Keep IAM grants explicit and resource-scoped in construct code

```typescript
// Good
bucket.grantRead(lambdaFunction);

// Bad
lambdaFunction.addToRolePolicy(new PolicyStatement({
  actions: ['s3:*'],
  resources: ['*'],
}));
```

## Encryption

- S3 buckets: `encryption: BucketEncryption.KMS` and `enforceSSL: true` by default
- DynamoDB tables: encryption enabled
- Environment variables containing sensitive data: encrypt
- Allow consumers to pass a custom KMS key (`props.encryptionKey`) for compliance
- Preserve existing encryption defaults when modifying constructs

## Secrets Management

- Never hardcode credentials, API keys, or secrets in source code
- Use AWS Secrets Manager or Systems Manager Parameter Store
- Pass secrets as environment variables at runtime
- No `.env` files, `credentials.json`, or similar files committed to git

## CDK Nag Compliance

- Run `npm run test:cdk-nag:all` for any construct or stack change
- All CDK Nag findings must be resolved or suppressed with a documented reason
- Use `NagSuppressions.addResourceSuppressions()` with `appliesTo` when suppressing wildcards

```typescript
NagSuppressions.addResourceSuppressions(construct, [
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Wildcard required for dynamic S3 prefix access',
    appliesTo: ['Resource::arn:aws:s3:::bucket-name/*'],
  },
], true); // apply to children
```

### Common CDK Nag Rules
| Rule | What It Checks | Typical Fix |
|------|---------------|-------------|
| IAM4 | AWS managed policies attached | Use inline policies or justify suppression |
| IAM5 | Wildcard permissions | Scope to specific resources or justify |
| S1   | S3 access logging disabled | Enable server access logging or justify |
| L1   | Non-latest Lambda runtime | Use latest supported runtime |

## Network Security

- Encrypt data in transit (TLS/SSL)
- Use VPC endpoints for AWS service access when constructs operate in a VPC
- Security group rules should follow least-privilege — open only required ports

## Error Handling and Logging

- Handle failures explicitly with actionable, structured logs
- Never log secrets, tokens, or PII
- Use Lambda Powertools for structured logging and tracing
- Return structured error payloads — do not leak internal stack traces to callers

## Construct Security Defaults

- When creating or modifying constructs, always default to the secure option
- Do not remove or weaken existing security configurations unless explicitly requested
- Removal policies should default to `DESTROY` for all resources
- Block public access on S3 buckets by default
