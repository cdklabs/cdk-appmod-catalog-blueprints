export class PowertoolsConfig {
  /**
   * Generate default Lambda configuration for Powertools.
   *
   * @param enableObservability - Whether observability is enabled
   * @param metricsNamespace - CloudWatch metrics namespace
   * @param serviceName - Service name for logging and metrics
   * @param logLevel - Log level (INFO, ERROR, DEBUG, WARNING). Defaults to INFO.
   * @returns Record of environment variables for Lambda configuration
   */
  public static generateDefaultLambdaConfig(
    enableObservability: boolean = false,
    metricsNamespace: string = 'appmod-catalog',
    serviceName: string = 'appmod-catalog-service',
    logLevel: string = 'INFO',
  ): Record<string, string> {
    // Validate log level
    const validLogLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    const normalizedLogLevel = validLogLevels.includes(logLevel.toUpperCase())
      ? logLevel.toUpperCase()
      : 'INFO';

    if (enableObservability) {
      return {
        POWERTOOLS_METRICS_NAMESPACE: metricsNamespace,
        POWERTOOLS_SERVICE_NAME: serviceName,
        LOG_LEVEL: normalizedLogLevel,
      };
    } else {
      return {
        POWERTOOLS_METRICS_DISABLED: 'true',
        POWERTOOLS_TRACE_DISABLED: 'true',
        LOG_LEVEL: normalizedLogLevel,
      };
    }
  }
}