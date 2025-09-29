import { InjectionContext, IPropertyInjector } from 'aws-cdk-lib';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';

export class CloudfrontDistributionObservabilityPropertyInjector implements IPropertyInjector {
  readonly constructUniqueId: string;

  constructor() {
    this.constructUniqueId = Distribution.PROPERTY_INJECTION_ID;
  }

  inject(originalProps: any, context: InjectionContext): any {
    return {
      enableLogging: true,
      logFilePrefix: `${context.id}-distribution-`,
      ...originalProps,
    };
  }

}