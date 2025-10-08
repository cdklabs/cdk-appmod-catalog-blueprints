// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Duration, Stack } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BaseAgent, BaseAgentProps } from './base-agent';
import { DefaultObservabilityConfig, LambdaIamUtils, PowertoolsConfig } from '../../utilities';
import { BedrockModelUtils } from '../bedrock';
import { DefaultRuntimes } from '../custom-resource';
import { DefaultAgentConfig } from './default-agent-config';

export interface BatchAgentProps extends BaseAgentProps {
  readonly prompt: string;
  readonly expectJson?: boolean;
}

export class BatchAgent extends BaseAgent {
  public readonly agentFunction: PythonFunction;

  constructor(scope: Construct, id: string, props: BatchAgentProps) {
    super(scope, id, props);
    const modelId = BedrockModelUtils.deriveActualModelId(this.bedrockModel);
    const metricNamespace = props.metricNamespace || DefaultObservabilityConfig.DEFAULT_METRIC_NAMESPACE;
    const metricServiceName = props.metricServiceName || DefaultAgentConfig.DEFAULT_OBSERVABILITY_METRIC_SVC_NAME;

    const env: Record<string, string> = {
      SYSTEM_PROMPT_S3_BUCKET_NAME: props.agentDefinition.systemPrompt.s3BucketName,
      SYSTEM_PROMPT_S3_KEY: props.agentDefinition.systemPrompt.s3ObjectKey,
      TOOLS_CONFIG: JSON.stringify(this.agentToolsLocationDefinitions),
      MODEL_ID: modelId,
      INVOKE_TYPE: 'batch',
      PROMPT: props.prompt,
      EXPECT_JSON: props.expectJson ? 'True' : '',
      ...PowertoolsConfig.generateDefaultLambdaConfig(
        props.enableObservability,
        metricNamespace,
        metricServiceName,
      ),
    };

    const { account, region } = Stack.of(this);
    const agentLambdaLogPermissionsResult = LambdaIamUtils.createLogsPermissions({
      account,
      region,
      scope: this,
      functionName: props.agentName,
      enableObservability: props.enableObservability,
    });

    this.agentFunction = new PythonFunction(this, 'BatchAgentFunction', {
      functionName: agentLambdaLogPermissionsResult.uniqueFunctionName,
      architecture: Architecture.X86_64,
      entry: path.join(__dirname, 'resources/default-strands-agent'),
      role: this.agentRole,
      index: 'batch.py',
      runtime: DefaultRuntimes.PYTHON,
      layers: props.agentDefinition.lambdaLayers,
      timeout: Duration.minutes(10),
      memorySize: 1024,
      environment: env,
      environmentEncryption: this.encryptionKey,
      vpc: props.network ? props.network.vpc : undefined,
      vpcSubnets: props.network ? props.network.applicationSubnetSelection() : undefined,
    });

    for (const s of agentLambdaLogPermissionsResult.policyStatements) {
      this.agentRole.addToPrincipalPolicy(s);
    }
  }
}