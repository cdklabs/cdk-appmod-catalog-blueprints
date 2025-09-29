// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Supported QuickStart environments
 */
export enum QuickStartEnvironment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

/**
 * QuickStart configuration
 */
export interface QuickStartConfig {
  readonly environment: QuickStartEnvironment;
  readonly region?: string;
  readonly accountId?: string;
}

/**
 * Base props for QuickStart constructs
 */
export interface QuickStartProps<T> {
  readonly quickStart?: QuickStartConfig;
  readonly customConfig?: T; // Fallback to granular control
}

/**
 * Abstract base class for environment-specific configuration providers
 */
export abstract class EnvironmentConfigProvider<T> {
  abstract getDevelopmentConfig(): T;
  abstract getProductionConfig(): T;

  getConfig(environment: QuickStartEnvironment): T {
    switch (environment) {
      case QuickStartEnvironment.DEVELOPMENT:
        return this.getDevelopmentConfig();
      case QuickStartEnvironment.PRODUCTION:
        return this.getProductionConfig();
      default:
        throw new Error(`Unsupported environment: ${environment}`);
    }
  }
}
