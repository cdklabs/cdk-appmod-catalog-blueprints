export class PowertoolsConfig {
  public static generateDefaultLambdaConfig(enableObservability: boolean = false, metricsNamespace: string = 'appmod-catalog', serviceName: string = 'appmod-catalog-service'): Record<string, string> {
    if (enableObservability) {
      return {
        POWERTOOLS_METRICS_NAMESPACE: metricsNamespace,
        POWERTOOLS_SERVICE_NAME: serviceName,
      };
    } else {
      return {
        POWERTOOLS_METRICS_DISABLED: 'true',
        POWERTOOLS_TRACE_DISABLED: 'true',
      };
    }
  }
}