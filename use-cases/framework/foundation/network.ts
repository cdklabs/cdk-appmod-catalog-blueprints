// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { GatewayVpcEndpointAwsService, IIpAddresses, InterfaceVpcEndpoint, InterfaceVpcEndpointAwsService, InterfaceVpcEndpointService, IpAddresses, IPeer, NatProvider, Peer, Port, SecurityGroup, SubnetConfiguration, SubnetSelection, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkProps {
  readonly private?: boolean;
  readonly ipAddresses?: IIpAddresses;
  readonly natGatewayProvider?: NatProvider;
  readonly natGatewaySubnets?: SubnetSelection;
  readonly natGateways?: number;
  readonly maxAzs?: number;
  readonly vpcName?: string;
  readonly subnetConfiguration?: SubnetConfiguration[];
}

export class Network extends Construct {
  readonly vpc: Vpc;
  private readonly props: NetworkProps;

  constructor(scope: Construct, id: string, props: NetworkProps = {}) {
    super(scope, id);
    this.props = props;

    if (props.private) {
      this.vpc = new Vpc(this, 'VPC', {
        ipAddresses: props.ipAddresses || IpAddresses.cidr('10.0.0.0/16'),
        natGateways: 0,
        maxAzs: props.maxAzs,
        vpcName: props.vpcName,
        subnetConfiguration: props.subnetConfiguration || [
          {
            name: 'Isolated',
            subnetType: SubnetType.PRIVATE_ISOLATED,
            cidrMask: 24,
          },
        ],
      });
    } else {
      this.vpc = new Vpc(this, 'VPC', {
        ipAddresses: props.ipAddresses || IpAddresses.cidr('10.0.0.0/16'),
        natGatewayProvider: props.natGatewayProvider,
        natGatewaySubnets: props.natGatewaySubnets,
        natGateways: props.natGateways || 1,
        maxAzs: props.maxAzs,
        vpcName: props.vpcName,
        subnetConfiguration: props.subnetConfiguration || [
          {
            name: 'Public',
            subnetType: SubnetType.PUBLIC,
            cidrMask: 24,
          },
          {
            name: 'Private',
            subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: 24,
          },
          {
            name: 'Isolated',
            subnetType: SubnetType.PRIVATE_ISOLATED,
            cidrMask: 24,
          },
        ],
      });
    }
  }

  public createServiceEndpoint(id: string, service: InterfaceVpcEndpointService, peer?: IPeer): InterfaceVpcEndpoint {
    if (service === InterfaceVpcEndpointAwsService.S3) {
      this.vpc.addGatewayEndpoint(`${id}-gateway`, {
        service: GatewayVpcEndpointAwsService.S3,
        subnets: [this.applicationSubnetSelection()],
      });
    }

    const securityGroup = new SecurityGroup(this, `sg-for-interface-endpoint-${id}`, {
      vpc: this.vpc,
    });

    securityGroup.addIngressRule(peer || Peer.anyIpv4(), Port.HTTPS);

    return this.vpc.addInterfaceEndpoint(`interface-endpoint-for-${id}`, {
      service,
      securityGroups: [securityGroup],
      subnets: this.applicationSubnetSelection(),
    });
  }

  public applicationSubnetSelection(): SubnetSelection {
    return {
      subnetType: this.props.private ? SubnetType.PRIVATE_ISOLATED : SubnetType.PRIVATE_WITH_EGRESS,
    };
  }
}