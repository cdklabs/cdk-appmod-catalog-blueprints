import { InjectionContext, IPropertyInjector, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Function, Tracing } from 'aws-cdk-lib/aws-lambda';
import { DataProtectionPolicy, LogGroup } from 'aws-cdk-lib/aws-logs';
import { LogGroupDataProtectionProps } from './log-group-data-protection-props';

export class LambdaObservabilityPropertyInjector implements IPropertyInjector {
  readonly constructUniqueId: string;
  readonly logGroupDataProtection: LogGroupDataProtectionProps;

  constructor(logGroupDataProtection: LogGroupDataProtectionProps) {
    this.constructUniqueId = Function.PROPERTY_INJECTION_ID;
    this.logGroupDataProtection = logGroupDataProtection;
  }

  inject(originalProps: any, _context: InjectionContext): any {
    const { region, account } = Stack.of(_context.scope);
    const logGroupName = `/aws/lambda/${originalProps.functionName}`;
    const logGroupArn = `arn:aws:logs:${region}:${account}:log-group:${logGroupName}`;
    this.logGroupDataProtection.logGroupEncryptionKey?.grantEncryptDecrypt(new ServicePrincipal('logs.amazonaws.com', {
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:logs:arn': logGroupArn,
        },
      },
    }));

    return {
      LogGroup: new LogGroup(_context.scope, `${_context.id}-LogGroup`, {
        logGroupName,
        encryptionKey: this.logGroupDataProtection.logGroupEncryptionKey,
        dataProtectionPolicy: this.logGroupDataProtection.dataProtectionIdentifiers ? new DataProtectionPolicy({
          identifiers: this.logGroupDataProtection.dataProtectionIdentifiers,
        }) : undefined,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      tracing: Tracing.ACTIVE,
      ...originalProps,
    };
  }

}