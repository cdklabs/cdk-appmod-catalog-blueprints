import { InjectionContext, IPropertyInjector, Names, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { DataProtectionPolicy, LogGroup } from 'aws-cdk-lib/aws-logs';
import { LogLevel, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LogGroupDataProtectionProps } from './log-group-data-protection-props';

export class StateMachineObservabilityPropertyInjector implements IPropertyInjector {
  readonly constructUniqueId: string;
  readonly logGroupDataProtection: LogGroupDataProtectionProps;

  constructor(logGroupDataProtection: LogGroupDataProtectionProps) {
    this.constructUniqueId = StateMachine.PROPERTY_INJECTION_ID;
    this.logGroupDataProtection = logGroupDataProtection;
  }

  inject(originalProps: any, _context: InjectionContext): any {
    const namePrefix = Names.uniqueResourceName(_context.scope, {
      maxLength: 100,
    });
    const { region, account } = Stack.of(_context.scope);
    const logGroupName = `/aws/sfn-statemachine/${namePrefix}-statemachine`;
    const logGroupArn = `arn:aws:logs:${region}:${account}:log-group:${logGroupName}`;
    this.logGroupDataProtection.logGroupEncryptionKey?.grantEncryptDecrypt(new ServicePrincipal('logs.amazonaws.com', {
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:logs:arn': logGroupArn,
        },
      },
    }));

    return {
      tracingEnabled: true,
      logs: {
        destination: new LogGroup(_context.scope, `${_context.id}-LogGroup`, {
          logGroupName,
          encryptionKey: this.logGroupDataProtection.logGroupEncryptionKey,
          dataProtectionPolicy: this.logGroupDataProtection.dataProtectionIdentifiers ? new DataProtectionPolicy({
            identifiers: this.logGroupDataProtection.dataProtectionIdentifiers,
          }) : undefined,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        level: LogLevel.ALL,
      },
      ...originalProps,
    };
  }

}