import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { InterfaceVpcEndpointAwsService, IpAddresses, Peer, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { createTestApp } from '../../utilities/test-utils';
import { Network } from '../foundation/network';

describe('Network', () => {
  let app: ReturnType<typeof createTestApp>;
  let stack: Stack;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'TestStack');
  });

  test('creates VPC with default configuration', () => {
    new Network(stack, 'Network');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::VPC', 1);
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
    });
  });

  test('creates public, private, and isolated subnets by default', () => {
    new Network(stack, 'Network');

    const template = Template.fromStack(stack);
    const subnets = template.findResources('AWS::EC2::Subnet');
    expect(Object.keys(subnets).length).toBeGreaterThan(0);

    const subnetTags = Object.values(subnets).map((s: any) =>
      s.Properties.Tags?.find((t: any) => t.Key === 'aws-cdk:subnet-name')?.Value,
    );

    expect(subnetTags).toContain('Public');
    expect(subnetTags).toContain('Private');
    expect(subnetTags).toContain('Isolated');
  });

  test('creates NAT gateway by default', () => {
    new Network(stack, 'Network');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  test('creates private VPC without NAT gateway', () => {
    new Network(stack, 'Network', { private: true });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
    template.resourceCountIs('AWS::EC2::InternetGateway', 0);
  });

  test('creates only isolated subnets for private VPC', () => {
    new Network(stack, 'Network', { private: true });

    const template = Template.fromStack(stack);
    const subnets = template.findResources('AWS::EC2::Subnet');
    const subnetTags = Object.values(subnets).map((s: any) =>
      s.Properties.Tags?.find((t: any) => t.Key === 'aws-cdk:subnet-name')?.Value,
    );

    expect(subnetTags.every((tag: string) => tag === 'Isolated')).toBe(true);
  });

  test('uses custom CIDR block', () => {
    new Network(stack, 'Network', {
      ipAddresses: IpAddresses.cidr('172.16.0.0/16'),
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '172.16.0.0/16',
    });
  });

  test('configures custom NAT gateways count', () => {
    new Network(stack, 'Network', { natGateways: 2 });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::NatGateway', 2);
  });

  test('sets custom VPC name', () => {
    new Network(stack, 'Network', { vpcName: 'MyCustomVPC' });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::EC2::VPC', {
      Tags: Match.arrayWith([
        { Key: 'Name', Value: 'MyCustomVPC' },
      ]),
    });
  });

  test('creates interface endpoint with security group', () => {
    const network = new Network(stack, 'Network');
    network.createServiceEndpoint('Lambda', InterfaceVpcEndpointAwsService.LAMBDA);

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
    });
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  });

  test('creates S3 gateway endpoint when S3 service requested', () => {
    const network = new Network(stack, 'Network');
    network.createServiceEndpoint('S3', InterfaceVpcEndpointAwsService.S3);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: Match.objectLike({
        'Fn::Join': Match.arrayWith([
          Match.arrayWith([Match.stringLikeRegexp('s3')]),
        ]),
      }),
      VpcEndpointType: 'Gateway',
    });
  });

  test('security group allows HTTPS from custom peer', () => {
    const network = new Network(stack, 'Network');
    network.createServiceEndpoint('Lambda', InterfaceVpcEndpointAwsService.LAMBDA, Peer.ipv4('10.0.0.0/8'));

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          IpProtocol: 'tcp',
          FromPort: 443,
          ToPort: 443,
          CidrIp: '10.0.0.0/8',
        }),
      ]),
    });
  });

  test('applicationSubnetSelection returns correct subnet type for public VPC', () => {
    const network = new Network(stack, 'Network');
    const selection = network.applicationSubnetSelection();
    expect(selection.subnetType).toBe(SubnetType.PRIVATE_WITH_EGRESS);
  });

  test('applicationSubnetSelection returns correct subnet type for private VPC', () => {
    const network = new Network(stack, 'Network', { private: true });
    const selection = network.applicationSubnetSelection();
    expect(selection.subnetType).toBe(SubnetType.PRIVATE_ISOLATED);
  });

  test('uses existing VPC from lookup', () => {
    const envApp = createTestApp();
    const envStack = new Stack(envApp, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const network = Network.useExistingVPCFromLookup(envStack, 'Network', {
      vpcId: 'vpc-12345678',
    });

    expect(network.vpc).toBeDefined();
    const template = Template.fromStack(envStack);
    template.resourceCountIs('AWS::EC2::VPC', 0);
  });

  test('existing VPC works with createServiceEndpoint', () => {
    const envApp = createTestApp();
    const envStack = new Stack(envApp, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const network = Network.useExistingVPCFromLookup(envStack, 'Network', {
      vpcId: 'vpc-12345678',
    });
    network.createServiceEndpoint('Lambda', InterfaceVpcEndpointAwsService.LAMBDA);

    const template = Template.fromStack(envStack);
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  });
});
