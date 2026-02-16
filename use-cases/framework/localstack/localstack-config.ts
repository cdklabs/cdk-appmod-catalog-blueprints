export interface LocalStackIntegrationConfig {
  /**
   * Enable LocalStack endpoint routing for runtime AWS SDK calls.
   *
   * @default false
   */
  readonly enabled?: boolean;

  /**
   * Default endpoint used when service-specific endpoints are not provided.
   *
   * @default http://localhost.localstack.cloud:4566
   */
  readonly endpointUrl?: string;

  /**
   * Optional service-specific S3 endpoint override.
   */
  readonly s3EndpointUrl?: string;

  /**
   * Optional service-specific Step Functions endpoint override.
   */
  readonly stepFunctionsEndpointUrl?: string;

  /**
   * Optional service-specific Bedrock Runtime endpoint override.
   */
  readonly bedrockRuntimeEndpointUrl?: string;

  /**
   * Optional service-specific Bedrock Agent Runtime endpoint override.
   */
  readonly bedrockAgentRuntimeEndpointUrl?: string;
}

export class LocalStackIntegrationUtils {
  public static readonly DEFAULT_ENDPOINT_URL = 'http://localhost.localstack.cloud:4566';

  public static resolveConfig(config?: LocalStackIntegrationConfig): Required<LocalStackIntegrationConfig> {
    const endpointUrl = config?.endpointUrl || LocalStackIntegrationUtils.DEFAULT_ENDPOINT_URL;

    return {
      enabled: config?.enabled ?? false,
      endpointUrl,
      s3EndpointUrl: config?.s3EndpointUrl || endpointUrl,
      stepFunctionsEndpointUrl: config?.stepFunctionsEndpointUrl || endpointUrl,
      bedrockRuntimeEndpointUrl: config?.bedrockRuntimeEndpointUrl || endpointUrl,
      bedrockAgentRuntimeEndpointUrl: config?.bedrockAgentRuntimeEndpointUrl || endpointUrl,
    };
  }

  public static toLambdaEnvironment(config?: LocalStackIntegrationConfig): Record<string, string> {
    const resolved = LocalStackIntegrationUtils.resolveConfig(config);
    if (!resolved.enabled) {
      return {};
    }

    return {
      LOCALSTACK_ENABLED: 'true',
      AWS_ENDPOINT_URL: resolved.endpointUrl,
      AWS_ENDPOINT_URL_S3: resolved.s3EndpointUrl,
      AWS_ENDPOINT_URL_STEPFUNCTIONS: resolved.stepFunctionsEndpointUrl,
      AWS_ENDPOINT_URL_BEDROCK_RUNTIME: resolved.bedrockRuntimeEndpointUrl,
      AWS_ENDPOINT_URL_BEDROCK_AGENT_RUNTIME: resolved.bedrockAgentRuntimeEndpointUrl,
    };
  }
}

