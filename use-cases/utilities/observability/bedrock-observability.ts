import * as path from 'path';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { CustomResource, Names, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Role, ServicePrincipal, PolicyStatement, Effect, PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { DataProtectionPolicy, LogGroup } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { LogGroupDataProtectionProps } from './log-group-data-protection-props';
import { DefaultRuntimes } from '../../framework/custom-resource/default-runtimes';
import { LambdaIamUtils } from '../lambda-iam-utils';

export interface BedrockObservabilityProps {
  readonly logGroupDataProtection?: LogGroupDataProtectionProps;
  readonly loggingRole?: Role;
  readonly overrideExistingConfiguration?: boolean;
  readonly removalPolicy?: RemovalPolicy;
}

export class BedrockObservability extends Construct {
  readonly logGroup: LogGroup;
  readonly loggingRole: Role;
  readonly encryptionKey: Key;

  constructor(scope: Construct, id: string, props?: BedrockObservabilityProps) {
    super(scope, id);
    const { region, account } = Stack.of(this);

    const logGroupName = `/aws/bedrock/${Names.uniqueResourceName(this, {
      maxLength: 100,
    })}`;

    const logGroupArn = `arn:aws:logs:${region}:${account}:log-group:${logGroupName}`;
    const logStreamArn = `${logGroupArn}:log-stream:aws/bedrock/modelinvocations`;

    this.encryptionKey = props?.logGroupDataProtection?.logGroupEncryptionKey || new Key(this, 'BedrockInvocationLoggingEncryptionKey', {
      removalPolicy: props?.removalPolicy || RemovalPolicy.DESTROY,
      enableKeyRotation: true,
    });

    this.encryptionKey.grantEncryptDecrypt(new ServicePrincipal('logs.amazonaws.com', {
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:logs:arn': logGroupArn,
        },
      },
    }));

    this.logGroup = new LogGroup(this, 'BedrockInvocationLogGroup', {
      logGroupName,
      encryptionKey: this.encryptionKey,
      removalPolicy: props?.removalPolicy || RemovalPolicy.DESTROY,
      dataProtectionPolicy: props?.logGroupDataProtection?.dataProtectionIdentifiers ? new DataProtectionPolicy({
        identifiers: props?.logGroupDataProtection?.dataProtectionIdentifiers,
      }) : undefined,
    });

    this.loggingRole = props?.loggingRole || new Role(this, 'BedrockInvocationLoggingRole', {
      assumedBy: new ServicePrincipal('bedrock.amazonaws.com', {
        conditions: {
          StringEquals: {
            'aws:SourceAccount': account,
          },
          ArnLike: {
            'aws:SourceArn': `arn:aws:bedrock:${region}:${account}:*`,
          },
        },
      }),
      inlinePolicies: {
        BedrockLoggingPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: [
                logStreamArn,
              ],
            }),
          ],
        }),
      },
    });

    // Lambda function role with least privilege
    const lambdaRole = new Role(this, 'BedrockLoggingConfigRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        BedrockLoggingConfigPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'bedrock:GetModelInvocationLoggingConfiguration',
                'bedrock:PutModelInvocationLoggingConfiguration',
              ],
              resources: ['*'],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'iam:PassRole',
              ],
              resources: [
                this.loggingRole.roleArn,
              ],
            }),
          ],
        }),
      },
    });

    const generatedLogPermissions = LambdaIamUtils.createLogsPermissions({
      account,
      functionName: 'bedrock-manage-logging-function',
      region,
      scope: this,
    });

    // PythonFunction for managing Bedrock logging configuration
    const manageLoggingFunction = new PythonFunction(this, 'BedrockManageLoggingFunction', {
      functionName: generatedLogPermissions.uniqueFunctionName,
      entry: path.join(__dirname, 'resources', 'bedrock-manage-logging-configuration'),
      runtime: DefaultRuntimes.PYTHON,
      architecture: Architecture.X86_64,
      role: lambdaRole,
    });

    for (const statement of generatedLogPermissions.policyStatements) {
      manageLoggingFunction.role?.addToPrincipalPolicy(statement);
    }

    // Custom resource provider
    const provider = new Provider(this, 'BedrockLoggingProvider', {
      onEventHandler: manageLoggingFunction,
    });

    // Custom resource to configure Bedrock logging
    new CustomResource(this, 'BedrockLoggingConfig', {
      serviceToken: provider.serviceToken,
      properties: {
        logGroupName: this.logGroup.logGroupName,
        roleArn: this.loggingRole.roleArn,
        override: props?.overrideExistingConfiguration || false,
      },
    });
  }
}