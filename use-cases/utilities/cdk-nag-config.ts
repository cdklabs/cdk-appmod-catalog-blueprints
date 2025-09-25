/**
 * Shared CDK Nag configuration and suppressions for AppMod Use Case Blueprints
 *
 * This module provides common CDK Nag suppressions that can be reused across
 * different use cases while maintaining security best practices.
 */

export interface NagSuppression {
  id: string;
  reason: string;
}

/**
 * Common suppressions that apply across multiple use cases
 */
export const COMMON_NAG_SUPPRESSIONS: NagSuppression[] = [
  {
    id: 'AwsSolutions-IAM4',
    reason: 'AWS managed policies provide appropriate permissions and are maintained by AWS',
  },
  {
    id: 'AwsSolutions-L1',
    reason: 'Lambda runtime versions are managed at the application deployment level',
  },
];

/**
 * Document processing specific suppressions
 */
export const DOCUMENT_PROCESSING_NAG_SUPPRESSIONS: NagSuppression[] = [
  ...COMMON_NAG_SUPPRESSIONS,
  {
    id: 'AwsSolutions-S3-1',
    reason: 'Document processing bucket requires controlled public access for result delivery',
  },
  {
    id: 'AwsSolutions-S3-2',
    reason: 'Public read access is managed by application-level security controls',
  },
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Document processing requires broad permissions across multiple AWS services (S3, Textract, SQS, Step Functions)',
  },
  {
    id: 'AwsSolutions-SQS3',
    reason: 'Dead letter queue configuration is handled by the base document processor',
  },
  {
    id: 'AwsSolutions-SF1',
    reason: 'Step Functions logging configuration is environment-specific',
  },
  {
    id: 'AwsSolutions-SF2',
    reason: 'X-Ray tracing is configured based on monitoring requirements',
  },
];

/**
 * Web application specific suppressions
 */
export const WEBAPP_NAG_SUPPRESSIONS: NagSuppression[] = [
  ...COMMON_NAG_SUPPRESSIONS,
  {
    id: 'AwsSolutions-ECS2',
    reason: 'Environment variables are managed securely through configuration management',
  },
  {
    id: 'AwsSolutions-ECS4',
    reason: 'Container insights are enabled based on monitoring requirements and cost considerations',
  },
  {
    id: 'AwsSolutions-IAM5',
    reason: 'Web application requires broad permissions for ECS, RDS, and other AWS service integration',
  },
  {
    id: 'AwsSolutions-ELB2',
    reason: 'Load balancer access logging is configured based on compliance requirements',
  },
  {
    id: 'AwsSolutions-RDS2',
    reason: 'Database encryption is configured based on data sensitivity classification',
  },
  {
    id: 'AwsSolutions-RDS3',
    reason: 'Multi-AZ configuration is based on availability SLA requirements',
  },
  {
    id: 'AwsSolutions-RDS6',
    reason: 'Database authentication method is chosen based on application architecture',
  },
  {
    id: 'AwsSolutions-RDS10',
    reason: 'Database deletion protection is managed through deployment automation',
  },
  {
    id: 'AwsSolutions-RDS11',
    reason: 'Standard database ports are acceptable within VPC security boundaries',
  },
  {
    id: 'AwsSolutions-SMG4',
    reason: 'Secrets rotation policy is configured per organizational security standards',
  },
];

/**
 * Frontend specific suppressions
 */
export const FRONTEND_NAG_SUPPRESSIONS: NagSuppression[] = [
  ...COMMON_NAG_SUPPRESSIONS,
  {
    id: 'AwsSolutions-CFR1',
    reason: 'CloudFront geo restrictions are configured based on application requirements',
  },
  {
    id: 'AwsSolutions-CFR2',
    reason: 'CloudFront WAF integration is configured based on security requirements',
  },
  {
    id: 'AwsSolutions-CFR3',
    reason: 'CloudFront access logging is configured based on compliance requirements',
  },
  {
    id: 'AwsSolutions-CFR4',
    reason: 'CloudFront viewer protocol policy is set to redirect-to-https for security',
  },
  {
    id: 'AwsSolutions-S1',
    reason: 'S3 bucket access logging is configured based on compliance requirements',
  },
  {
    id: 'AwsSolutions-S2',
    reason: 'S3 bucket public access is blocked and access is controlled via CloudFront OAC',
  },
  {
    id: 'AwsSolutions-S3',
    reason: 'S3 bucket SSL requests only policy is enforced via CloudFront HTTPS redirect',
  },
  {
    id: 'AwsSolutions-S10',
    reason: 'S3 bucket MFA delete is managed through organizational security policies',
  },
];

/**
 * Development/testing specific suppressions
 */
export const DEVELOPMENT_NAG_SUPPRESSIONS: NagSuppression[] = [
  {
    id: 'AwsSolutions-RDS3',
    reason: 'Multi-AZ not required for development environments',
  },
  {
    id: 'AwsSolutions-ELB2',
    reason: 'Access logging not required for development load balancers',
  },
  {
    id: 'AwsSolutions-CFR3',
    reason: 'CloudFront access logging not required for development environments',
  },
];

/**
 * Production specific suppressions (stricter requirements)
 */
export const PRODUCTION_NAG_SUPPRESSIONS: NagSuppression[] = [
  // Production environments should have minimal suppressions
  // Most security controls should be enabled
];

/**
 * Utility function to get suppressions based on use case and environment
 */
export function getNagSuppressions(
  useCase: 'document-processing' | 'webapp' | 'frontend' | 'common',
  environment: 'development' | 'staging' | 'production' = 'production',
): NagSuppression[] {
  let suppressions: NagSuppression[] = [];

  switch (useCase) {
    case 'document-processing':
      suppressions = [...DOCUMENT_PROCESSING_NAG_SUPPRESSIONS];
      break;
    case 'webapp':
      suppressions = [...WEBAPP_NAG_SUPPRESSIONS];
      break;
    case 'frontend':
      suppressions = [...FRONTEND_NAG_SUPPRESSIONS];
      break;
    case 'common':
      suppressions = [...COMMON_NAG_SUPPRESSIONS];
      break;
  }

  // Add environment-specific suppressions
  if (environment === 'development') {
    suppressions = [...suppressions, ...DEVELOPMENT_NAG_SUPPRESSIONS];
  }

  return suppressions;
}

/**
 * Utility function to create custom suppressions for specific scenarios
 */
export function createCustomSuppression(id: string, reason: string): NagSuppression {
  return { id, reason };
}
