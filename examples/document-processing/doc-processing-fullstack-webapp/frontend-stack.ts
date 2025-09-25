import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Frontend } from '../../../use-cases/webapp/frontend-construct';

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new Frontend(this, 'InsuranceClaimsFrontend', {
      sourceDirectory: './frontend-app',
      buildOutputDirectory: './frontend-app/build',
      skipBuild: true, // We already built it
      enableObservability: true
    });
  }
}
