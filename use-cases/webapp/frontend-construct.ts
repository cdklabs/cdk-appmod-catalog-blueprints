// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { DockerImage, PropertyInjectors, RemovalPolicy } from 'aws-cdk-lib';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  Distribution,
  DistributionProps,
  ErrorResponse,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionEventType,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { ARecord, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { CloudfrontDistributionObservabilityPropertyInjector } from '../utilities';

/**
 * Default CloudFront error responses for Single Page Applications
 */
export const DEFAULT_SPA_ERROR_RESPONSES: ErrorResponse[] = [
  {
    httpStatus: 403,
    responseHttpStatus: 200,
    responsePagePath: '/index.html',
  },
  {
    httpStatus: 404,
    responseHttpStatus: 200,
    responsePagePath: '/index.html',
  },
];

/**
 * Custom domain configuration for the frontend
 */
export interface CustomDomainConfig {
  /** Domain name for the frontend (e.g., 'app.example.com') */
  readonly domainName: string;
  /** SSL certificate for the domain (required when domainName is provided) */
  readonly certificate: ICertificate;
  /** Optional hosted zone for automatic DNS record creation */
  readonly hostedZone?: IHostedZone;
}

/**
 * Additional CloudFront distribution properties
 */
export interface AdditionalDistributionProps {
  /** Optional comment for the distribution */
  readonly comment?: string;
  /** Optional enabled flag for the distribution */
  readonly enabled?: boolean;
  /** Optional price class for the distribution */
  readonly priceClass?: PriceClass;
  /** Optional web ACL ID for the distribution */
  readonly webAclId?: string;
}

/**
 * Properties for the Frontend construct
 */
export interface FrontendProps {
  /** Base directory of the frontend source code */
  readonly sourceDirectory: string;
  /** Directory where build artifacts are located after build command completes (defaults to '{sourceDirectory}/build') */
  readonly buildOutputDirectory?: string;
  /** Optional build command (defaults to 'npm run build') */
  readonly buildCommand?: string;
  /** Optional custom domain configuration */
  readonly customDomain?: CustomDomainConfig;
  /** Optional CloudFront error responses (defaults to SPA-friendly responses) */
  readonly errorResponses?: ErrorResponse[];
  /** Optional additional CloudFront distribution properties */
  readonly distributionProps?: AdditionalDistributionProps;
  /** Optional flag to skip the build process (useful for pre-built artifacts) */
  readonly skipBuild?: boolean;
  /** Optional removal policy for all resources (defaults to DESTROY) */
  readonly removalPolicy?: RemovalPolicy;
  /**
   * Enable logging and tracing for all supporting resource
   * @default false
   */
  readonly enableObservability?: boolean;
}

/**
 * Frontend construct that deploys a frontend application to S3 and CloudFront
 *
 * This construct provides a complete solution for hosting static frontend applications
 * with the following features:
 * - S3 bucket for hosting static assets with security best practices
 * - CloudFront distribution for global content delivery
 * - Optional custom domain with SSL certificate
 * - Automatic build process execution
 * - SPA-friendly error handling by default
 * - Security configurations
 */
export class Frontend extends Construct {
  /** The S3 bucket hosting the frontend assets */
  public readonly bucket: Bucket;
  /** The CloudFront distribution */
  public readonly distribution: Distribution;
  /** The bucket deployment that uploads the frontend assets */
  public readonly bucketDeployment: BucketDeployment;
  /** The custom domain name (if configured) */
  public readonly domainName?: string;
  /** The Asset containing the frontend source code */
  public readonly asset?: Asset;

  /**
   * Creates a new Frontend
   * @param scope The construct scope
   * @param id The construct ID
   * @param props The frontend properties
   */
  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);

    if (props.enableObservability) {
      PropertyInjectors.of(this).add(
        new CloudfrontDistributionObservabilityPropertyInjector(),
      );
    }

    // Validate required parameters
    this._validateProps(props);

    // Get removal policy with default
    const removalPolicy = props.removalPolicy || RemovalPolicy.DESTROY;

    // Create asset for source code with optional bundling
    if (!props.skipBuild) {
      this.asset = this._createAsset(props);
    }

    // Create S3 bucket for hosting
    this.bucket = new Bucket(this, 'FrontendBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: removalPolicy,
      autoDeleteObjects: removalPolicy === RemovalPolicy.DESTROY,
    });

    // Create CloudFront distribution
    this.distribution = this._createDistribution(props, removalPolicy);

    // Deploy frontend assets to S3
    const buildOutputDirectory = props.buildOutputDirectory || path.join(props.sourceDirectory, 'build');
    this.bucketDeployment = new BucketDeployment(this, 'FrontendDeployment', {
      sources: this.asset
        ? [Source.bucket(this.asset.bucket, this.asset.s3ObjectKey)]
        : [Source.asset(buildOutputDirectory)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    this.bucketDeployment.handlerRole.addToPrincipalPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudfront:GetInvalidation',
        'cloudfront:CreateInvalidation',
      ],
      resources: ['*'],
    }));

    // Note: BucketDeployment doesn't support applyRemovalPolicy directly
    // It will be cleaned up when the bucket is deleted due to autoDeleteObjects

    // Setup custom domain if provided
    if (props.customDomain) {
      this.domainName = props.customDomain.domainName;
      this._setupCustomDomain(props.customDomain, removalPolicy);
    }
  }

  /**
   * Validates the construct properties
   * @param props The frontend properties
   * @private
   */
  private _validateProps(props: FrontendProps): void {
    if (!props.sourceDirectory) {
      throw new Error('sourceDirectory is required');
    }

    if (props.customDomain?.domainName && !props.customDomain.certificate) {
      throw new Error('certificate is required when domainName is provided');
    }
  }

  /**
   * Creates an Asset for the frontend source code with bundling
   * @param props The frontend properties
   * @returns The Asset containing the built frontend
   * @private
   */
  private _createAsset(props: FrontendProps): Asset {
    const buildCommand = props.buildCommand || 'npm run build';
    const buildOutputDirectory = props.buildOutputDirectory || path.join(props.sourceDirectory, 'build');

    // Extract the build directory name from the full path
    const buildDirName = path.basename(buildOutputDirectory);

    const asset = new Asset(this, 'FrontendAsset', {
      path: props.sourceDirectory,
      bundling: {
        image: DockerImage.fromRegistry('public.ecr.aws/docker/library/node:lts-alpine'),
        command: [
          'sh', '-c', [
            'cd /asset-input',
            'npm ci --only=production',
            buildCommand,
            `cp -r ./${buildDirName}/* /asset-output/`,
          ].join(' && '),
        ],
        user: 'root',
      },
    });

    // Note: Asset doesn't support applyRemovalPolicy directly
    // The underlying S3 objects will be managed by the asset bucket's removal policy

    return asset;
  }

  /**
   * Creates the CloudFront distribution
   * @param props The frontend properties
   * @param removalPolicy The removal policy to apply
   * @returns The CloudFront distribution
   * @private
   */
  private _createDistribution(props: FrontendProps, removalPolicy: RemovalPolicy): Distribution {
    const errorResponses = props.errorResponses || DEFAULT_SPA_ERROR_RESPONSES;

    // Create a CloudFront function for security headers
    const securityHeadersFunction = new CloudFrontFunction(this, 'SecurityHeadersFunction', {
      code: FunctionCode.fromInline(`
        function handler(event) {
          var response = event.response;
          var headers = response.headers;
          
          // Add security headers
          headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload' };
          headers['content-type-options'] = { value: 'nosniff' };
          headers['x-frame-options'] = { value: 'DENY' };
          headers['x-content-type-options'] = { value: 'nosniff' };
          headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
          headers['permissions-policy'] = { value: 'camera=(), microphone=(), geolocation=()' };
          
          return response;
        }
      `),
    });

    // Apply removal policy to CloudFront function
    securityHeadersFunction.applyRemovalPolicy(removalPolicy);

    const distributionConfig: DistributionProps = {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: securityHeadersFunction,
            eventType: FunctionEventType.VIEWER_RESPONSE,
          },
        ],
      },
      defaultRootObject: 'index.html',
      errorResponses,
      comment: props.distributionProps?.comment,
      enabled: props.distributionProps?.enabled,
      priceClass: props.distributionProps?.priceClass,
      webAclId: props.distributionProps?.webAclId,
    };

    // Add custom domain configuration if provided
    let distribution: Distribution;
    if (props.customDomain) {
      distribution = new Distribution(this, 'FrontendDistribution', {
        ...distributionConfig,
        domainNames: [props.customDomain.domainName],
        certificate: props.customDomain.certificate,
      });
    } else {
      distribution = new Distribution(this, 'FrontendDistribution', distributionConfig);
    }

    // Apply removal policy to distribution
    distribution.applyRemovalPolicy(removalPolicy);

    return distribution;
  }

  /**
   * Sets up custom domain with Route53 record
   * @param customDomain The custom domain configuration
   * @param removalPolicy The removal policy to apply
   * @private
   */
  private _setupCustomDomain(customDomain: CustomDomainConfig, removalPolicy: RemovalPolicy): void {
    if (customDomain.hostedZone) {
      const aliasRecord = new ARecord(this, 'FrontendAliasRecord', {
        zone: customDomain.hostedZone,
        recordName: customDomain.domainName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
      });

      // Apply removal policy to Route53 record
      aliasRecord.applyRemovalPolicy(removalPolicy);
    }
  }

  /**
   * Gets the URL of the frontend application
   * @returns The frontend URL
   */
  public url(): string {
    return this.domainName
      ? `https://${this.domainName}`
      : `https://${this.distribution.distributionDomainName}`;
  }

  /**
   * Gets the CloudFront distribution domain name
   * @returns The CloudFront domain name
   */
  public distributionDomainName(): string {
    return this.distribution.distributionDomainName;
  }

  /**
   * Gets the S3 bucket name
   * @returns The S3 bucket name
   */
  public bucketName(): string {
    return this.bucket.bucketName;
  }
}
