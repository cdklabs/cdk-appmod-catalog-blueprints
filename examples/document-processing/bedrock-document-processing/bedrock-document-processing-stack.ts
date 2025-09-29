import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BedrockDocumentProcessing } from '../../../use-cases/document-processing/bedrock-document-processing';
import { Network } from '../../../use-cases/framework';
import { EventbridgeBroker } from '../../../use-cases/framework/foundation/eventbridge-broker';

export class BedrockDocumentProcessingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const network = new Network(this, 'BedrockIDPNetwork', {
        private: true
    })

    const broker = new EventbridgeBroker(this, 'IDPBroker', {
      name: 'idp-broker',
      eventSource: 'intelligent-document-processing'
    })

    new BedrockDocumentProcessing(this, 'BedrockDocumentProcessing', {
      useCrossRegionInference: true,
      eventbridgeBroker: broker,
      enableObservability: true,
      metricNamespace: "bedrock-document-processing",
      metricServiceName: "extraction-workflow",
      network
    });
  }
}
