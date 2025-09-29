import { RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Key } from 'aws-cdk-lib/aws-kms';
import { TaskInput } from 'aws-cdk-lib/aws-stepfunctions';
import { EventBridgePutEvents } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export interface EventbridgeBrokerProps {
  readonly name?: string;
  readonly eventSource: string;
  readonly kmsKey?: Key;
  readonly removalPolicy?: RemovalPolicy;
}

export class EventbridgeBroker extends Construct {
  private readonly eventSource: string;
  readonly eventbus: EventBus;
  readonly kmsKey: Key;

  constructor(scope: Construct, id: string, props: EventbridgeBrokerProps) {
    super(scope, id);
    const removalPolicy = props.removalPolicy || RemovalPolicy.DESTROY;
    this.kmsKey = props.kmsKey || new Key(this, 'EventBrokerKMSKey', {
      enableKeyRotation: true,
      removalPolicy,
    });
    this.eventbus = new EventBus(this, 'EventBus', {
      eventBusName: props.name,
      kmsKey: this.kmsKey,
    });

    this.eventSource = props.eventSource;
  }

  public sendViaSfnChain(detailType: string, eventDetail: any) {
    return new EventBridgePutEvents(this, `SfnEbPutEventChain-${detailType}`, {
      entries: [
        {
          eventBus: this.eventbus,
          source: this.eventSource,
          detailType,
          detail: TaskInput.fromObject(eventDetail),
        },
      ],
    });
  }
}