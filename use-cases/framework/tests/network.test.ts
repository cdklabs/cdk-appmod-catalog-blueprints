import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { InterfaceVpcEndpointAwsService, IpAddresses, Peer, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Network } from '../foundation/network';

describe('Network', () => {
  let defaultStack: Stack;
  let privateStack: Stack;
  let customCidrStack: Stack;
  let customNatStack: Stack;
  let customNameStack: Stack;
  let endpointStack: Stack;
  let s3EndpointStack: Stack;
  let customPeerStack: Stack;
  let existingVpcStack: Stack;
  let existingVpcEndpointStack: Stack;
  let defaultTemplate: Template;
  let privateTemplate: Template;
  let customCidrTemplate: Template;
  let customNatTemplate: Template;
  let customNameTemplate: Template;
  let endpointTemplate: Template;
  let s3EndpointTemplate: Template;
  let customPeerTemplate: Template;
  let existingVpcTemplate: Template;
  let existingVpcEndpointTemplate: Template;
  let defaultNetwork: Network;
  let privateNetwork: Network;
  let existingNetwork: Network;
  let existingVpcEndpointNetwork: Network;

  beforeAll(() => {
    // Default VPC
    defaultStack = new Stack();
    defaultNetwork = new Network(defaultStack, 'Network');
    defaultTemplate = Template.fromStack(defaultStack);

    // Private VPC
    privateStack = new Stack();
    privateNetwork = new Network(privateStack, 'Network', { private: true });
    privateTemplate = Template.fromStack(privateStack);

    // Custom CIDR
    customCidrStack = new Stack();
    new Network(customCidrStack, 'Network', {
      ipAddresses: IpAddresses.cidr('172.16.0.0/16'),
    });
    customCidrTemplate = Template.fromStack(customCidrStack);

    // Custom NAT gateways
    customNatStack = new Stack();
    new Network(customNatStack, 'Network', { natGateways: 2 });
    customNatTemplate = Template.fromStack(customNatStack);

    // Custom VPC name
    customNameStack = new Stack();
    new Network(customNameStack, 'Network', { vpcName: 'MyCustomVPC' });
    customNameTemplate = Template.fromStack(customNameStack);

    // Interface endpoint
    endpointStack = new Stack();
    const endpointNetwork = new Network(endpointStack, 'Network');
    endpointNetwork.createServiceEndpoint('Lambda', InterfaceVpcEndpointAwsService.LAMBDA);
    endpointTemplate = Template.fromStack(endpointStack);

    // S3 gateway endpoint
    s3EndpointStack = new Stack();
    const s3Network = new Network(s3EndpointStack, 'Network');
    s3Network.createServiceEndpoint('S3', InterfaceVpcEndpointAwsService.S3);
    s3EndpointTemplate = Template.fromStack(s3EndpointStack);

    // Custom peer security group
    customPeerStack = new Stack();
    const customPeerNetwork = new Network(customPeerStack, 'Network');
    customPeerNetwork.createServiceEndpoint('Lambda', InterfaceVpcEndpointAwsService.LAMBDA, Peer.ipv4('10.0.0.0/8'));
    customPeerTemplate = Template.fromStack(customPeerStack);

    // Existing VPC from lookup
    existingVpcStack = new Stack(undefined, 'ExistingVpcStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    existingNetwork = Network.useExistingVPCFromLookup(existingVpcStack, 'Network', {
      vpcId: 'vpc-12345678',
    });
    existingVpcTemplate = Template.fromStack(existingVpcStack);

    // Existing VPC with endpoint
    existingVpcEndpointStack = new Stack(undefined, 'ExistingVpcEndpointStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    existingVpcEndpointNetwork = Network.useExistingVPCFromLookup(existingVpcEndpointStack, 'Network', {
      vpcId: 'vpc-12345678',
    });
    existingVpcEndpointNetwork.createServiceEndpoint('Lambda', InterfaceVpcEndpointAwsService.LAMBDA);
    existingVpcEndpointTemplate = Template.fromStack(existingVpcEndpointStack);
  });

  test('creates VPC with default configuration', () => {
    defaultTemplate.resourceCountIs('AWS::EC2::VPC', 1);
    defaultTemplate.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
    });
  });

  test('creates public, private, and isolated subnets by default', () => {
    const subnets = defaultTemplate.findResources('AWS::EC2::Subnet');
    expect(Object.keys(subnets).length).toBeGreaterThan(0);

    const subnetTags = Object.values(subnets).map((s: any) =>
      s.Properties.Tags?.find((t: any) => t.Key === 'aws-cdk:subnet-name')?.Value,
    );

    expect(subnetTags).toContain('Public');
    expect(subnetTags).toContain('Private');
    expect(subnetTags).toContain('Isolated');
  });

  test('creates NAT gateway by default', () => {
    defaultTemplate.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  test('creates private VPC without NAT gateway', () => {
    privateTemplate.resourceCountIs('AWS::EC2::NatGateway', 0);
    privateTemplate.resourceCountIs('AWS::EC2::InternetGateway', 0);
  });

  test('creates only isolated subnets for private VPC', () => {
    const subnets = privateTemplate.findResources('AWS::EC2::Subnet');
    const subnetTags = Object.values(subnets).map((s: any) =>
      s.Properties.Tags?.find((t: any) => t.Key === 'aws-cdk:subnet-name')?.Value,
    );

    expect(subnetTags.every((tag: string) => tag === 'Isolated')).toBe(true);
  });

  test('uses custom CIDR block', () => {
    customCidrTemplate.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '172.16.0.0/16',
    });
  });

  test('configures custom NAT gateways count', () => {
    customNatTemplate.resourceCountIs('AWS::EC2::NatGateway', 2);
  });

  test('sets custom VPC name', () => {
    customNameTemplate.hasResourceProperties('AWS::EC2::VPC', {
      Tags: Match.arrayWith([
        { Key: 'Name', Value: 'MyCustomVPC' },
      ]),
    });
  });

  test('creates interface endpoint with security group', () => {
    endpointTemplate.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
    endpointTemplate.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
    });
    endpointTemplate.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  });

  test('creates S3 gateway endpoint when S3 service requested', () => {
    s3EndpointTemplate.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: Match.objectLike({
        'Fn::Join': Match.arrayWith([
          Match.arrayWith([Match.stringLikeRegexp('s3')]),
        ]),
      }),
      VpcEndpointType: 'Gateway',
    });
  });

  test('security group allows HTTPS from custom peer', () => {
    customPeerTemplate.hasResourceProperties('AWS::EC2::SecurityGroup', {
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
    const selection = defaultNetwork.applicationSubnetSelection();
    expect(selection.subnetType).toBe(SubnetType.PRIVATE_WITH_EGRESS);
  });

  test('applicationSubnetSelection returns correct subnet type for private VPC', () => {
    const selection = privateNetwork.applicationSubnetSelection();
    expect(selection.subnetType).toBe(SubnetType.PRIVATE_ISOLATED);
  });

  test('uses existing VPC from lookup', () => {
    expect(existingNetwork.vpc).toBeDefined();
    existingVpcTemplate.resourceCountIs('AWS::EC2::VPC', 0);
  });

  test('existing VPC works with createServiceEndpoint', () => {
    existingVpcEndpointTemplate.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
    existingVpcEndpointTemplate.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  });
});
