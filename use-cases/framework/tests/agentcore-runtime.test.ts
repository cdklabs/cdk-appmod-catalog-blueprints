// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AgentCoreAgentRuntime } from '../agents/runtime/agentcore-runtime';
import { AgentRuntimeType, AgentCoreDeploymentMethod } from '../agents/runtime/types';

describe('AgentCoreAgentRuntime', () => {
  let containerStack: Stack;
  let directCodeStack: Stack;
  let methodsStack: Stack;
  let vpcStack: Stack;

  let containerTemplate: Template;
  let methodsTemplate: Template;
  let vpcTemplate: Template;

  let containerRuntime: AgentCoreAgentRuntime;
  let methodsRuntime: AgentCoreAgentRuntime;
  let customRoleRuntime: AgentCoreAgentRuntime;

  beforeAll(() => {
    // Container deployment stack - tests CONTAINER deployment method
    containerStack = new Stack(undefined, 'ContainerStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    containerRuntime = new AgentCoreAgentRuntime(containerStack, 'DefaultContainerRuntime', {
      agentName: 'test-container-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are a helpful assistant',
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
      },
    });
    new AgentCoreAgentRuntime(containerStack, 'CustomConfigRuntime', {
      agentName: 'custom-config-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are a specialized assistant',
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/custom-agent:v1.0',
        memorySize: 2048,
      },
      environment: {
        MODEL_ID: 'anthropic.claude-v2',
        DEBUG: 'true',
      },
    });
    const customRole = new Role(containerStack, 'CustomRole', {
      assumedBy: new ServicePrincipal('agentcore.amazonaws.com'),
    });
    customRoleRuntime = new AgentCoreAgentRuntime(containerStack, 'CustomRoleRuntime', {
      agentName: 'custom-role-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are an assistant with custom role',
      role: customRole,
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/role-agent:latest',
      },
    });
    // Add policy to custom role for testing
    customRoleRuntime.addToRolePolicy(
      new PolicyStatement({
        actions: ['kms:Decrypt'],
        resources: ['*'],
      }),
    );
    containerTemplate = Template.fromStack(containerStack);

    // Direct code deployment stack - tests DIRECT_CODE deployment method (should throw error)
    directCodeStack = new Stack(undefined, 'DirectCodeStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    // Methods stack - tests runtime methods (grantInvoke, addEnvironment, addToRolePolicy)
    methodsStack = new Stack(undefined, 'MethodsStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    methodsRuntime = new AgentCoreAgentRuntime(methodsStack, 'MethodsRuntime', {
      agentName: 'methods-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are a test assistant',
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/methods-agent:latest',
      },
      environment: {
        INITIAL_VAR: 'initial',
        DEBUG: 'false',
      },
    });

    // Test grantInvoke
    const invokerRole = new Role(methodsStack, 'InvokerRole', {
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
    });
    const role2 = new Role(methodsStack, 'Role2', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    methodsRuntime.grantInvoke(invokerRole);
    methodsRuntime.grantInvoke(role2);

    // Test addEnvironment
    methodsRuntime.addEnvironment('MODEL_ID', 'anthropic.claude-v2');
    methodsRuntime.addEnvironment('TEMPERATURE', '0.7');
    methodsRuntime.addEnvironment('ADDED_VAR', 'added');
    methodsRuntime.addEnvironment('DEBUG', 'true'); // Overwrite existing

    // Test addToRolePolicy
    methodsRuntime.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: ['arn:aws:s3:::my-bucket/*'],
      }),
    );
    methodsRuntime.addToRolePolicy(
      new PolicyStatement({
        actions: ['dynamodb:GetItem'],
        resources: ['arn:aws:dynamodb:us-east-1:123456789012:table/MyTable'],
      }),
    );
    methodsRuntime.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      }),
    );

    methodsTemplate = Template.fromStack(methodsStack);

    // VPC stack - tests VPC configuration (currently logs warning)
    vpcStack = new Stack(undefined, 'VpcStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const vpc = new Vpc(vpcStack, 'Vpc');
    new AgentCoreAgentRuntime(vpcStack, 'VpcRuntime', {
      agentName: 'vpc-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are a VPC assistant',
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/vpc-agent:latest',
      },
      network: {
        vpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      },
    });
    vpcTemplate = Template.fromStack(vpcStack);
  });

  describe('Runtime Creation - CONTAINER Deployment', () => {
    test('creates AgentCore runtime with CONTAINER deployment', () => {
      containerTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'test-container-agent',
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
          },
        },
      });
    });

    test('creates AgentCore runtime with PUBLIC network mode', () => {
      containerTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        NetworkConfiguration: {
          NetworkMode: 'PUBLIC',
        },
      });
    });

    test('creates AgentCore runtime endpoint', () => {
      containerTemplate.hasResourceProperties('AWS::BedrockAgentCore::RuntimeEndpoint', {
        Name: 'test-container-agent-endpoint',
        AgentRuntimeId: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([
            Match.stringLikeRegexp('DefaultContainerRuntime.*'),
            'AgentRuntimeId',
          ]),
        }),
      });
    });

    test('creates CloudWatch log group for AgentCore runtime', () => {
      containerTemplate.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/bedrock-agentcore/runtimes/test-container-agent',
        RetentionInDays: 7,
      });
    });

    test('creates AgentCore runtime with custom configuration', () => {
      containerTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'custom-config-agent',
        Description: 'You are a specialized assistant',
        EnvironmentVariables: Match.objectLike({
          MODEL_ID: 'anthropic.claude-v2',
          DEBUG: 'true',
        }),
      });
    });

    test('creates AgentCore runtime with provided IAM role', () => {
      expect(customRoleRuntime.executionRole).toBeDefined();

      containerTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'custom-role-agent',
        RoleArn: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('CustomRole.*'), 'Arn']),
        }),
      });
    });

    test('creates expected number of AgentCore runtimes', () => {
      const runtimes = containerTemplate.findResources('AWS::BedrockAgentCore::Runtime');
      expect(Object.keys(runtimes).length).toBe(3); // DefaultContainerRuntime, CustomConfigRuntime, CustomRoleRuntime
    });

    test('creates expected number of AgentCore runtime endpoints', () => {
      const endpoints = containerTemplate.findResources('AWS::BedrockAgentCore::RuntimeEndpoint');
      expect(Object.keys(endpoints).length).toBe(3); // One endpoint per runtime
    });

    test('uses RETAIN removal policy by default', () => {
      containerTemplate.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/bedrock-agentcore/runtimes/test-container-agent',
      });

      // Check that the log group has RETAIN policy (default)
      const logGroups = containerTemplate.findResources('AWS::Logs::LogGroup');
      const testLogGroup = Object.values(logGroups).find(
        (lg: any) => lg.Properties.LogGroupName === '/aws/bedrock-agentcore/runtimes/test-container-agent',
      );
      expect(testLogGroup).toBeDefined();
      // RETAIN is the default, so DeletionPolicy should be RETAIN
      expect((testLogGroup as any).DeletionPolicy).toBe('Retain');
    });

    test('applies custom removal policy when specified', () => {
      const stack = new Stack(undefined, 'RemovalPolicyStack');
      new AgentCoreAgentRuntime(stack, 'DeleteRuntime', {
        agentName: 'delete-agent',
        foundationModel: 'anthropic.claude-v2',
        instruction: 'Test',
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test:latest',
        },
        removalPolicy: RemovalPolicy.DESTROY,
      });

      const template = Template.fromStack(stack);
      const logGroups = template.findResources('AWS::Logs::LogGroup');
      const deleteLogGroup = Object.values(logGroups).find(
        (lg: any) => lg.Properties.LogGroupName === '/aws/bedrock-agentcore/runtimes/delete-agent',
      );
      expect(deleteLogGroup).toBeDefined();
      expect((deleteLogGroup as any).UpdateReplacePolicy).toBe('Delete');
      expect((deleteLogGroup as any).DeletionPolicy).toBe('Delete');
    });
  });

  describe('Runtime Creation - DIRECT_CODE Deployment', () => {
    test('throws error for DIRECT_CODE deployment method', () => {
      expect(() => {
        new AgentCoreAgentRuntime(directCodeStack, 'DirectCodeRuntime', {
          agentName: 'direct-code-agent',
          foundationModel: 'anthropic.claude-v2',
          instruction: 'You are a direct code assistant',
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
            codeBucket: 'my-code-bucket',
            codeKey: 'agent-code.zip',
          },
        });
      }).toThrow(Error);
    });

    test('throws error message indicates DIRECT_CODE not supported', () => {
      expect(() => {
        new AgentCoreAgentRuntime(directCodeStack, 'DirectCodeRuntime2', {
          agentName: 'direct-code-agent-2',
          foundationModel: 'anthropic.claude-v2',
          instruction: 'Test',
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
            codeBucket: 'my-code-bucket',
            codeKey: 'agent-code.zip',
          },
        });
      }).toThrow(/DIRECT_CODE deployment method is not yet fully supported/);
    });
  });

  describe('Error Handling - Missing Deployment Configuration', () => {
    test('throws error when imageUri is missing for CONTAINER deployment', () => {
      const stack = new Stack();
      expect(() => {
        new AgentCoreAgentRuntime(stack, 'MissingImageUri', {
          agentName: 'missing-image-agent',
          foundationModel: 'anthropic.claude-v2',
          instruction: 'Test',
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
            // imageUri is missing
          },
        });
      }).toThrow(Error);
    });

    test('throws error message indicates imageUri is required', () => {
      const stack = new Stack();
      expect(() => {
        new AgentCoreAgentRuntime(stack, 'MissingImageUri2', {
          agentName: 'missing-image-agent-2',
          foundationModel: 'anthropic.claude-v2',
          instruction: 'Test',
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          },
        });
      }).toThrow(/imageUri is required for CONTAINER deployment method/);
    });

    test('throws error when codeBucket is missing for DIRECT_CODE deployment', () => {
      const stack = new Stack();
      expect(() => {
        new AgentCoreAgentRuntime(stack, 'MissingCodeBucket', {
          agentName: 'missing-bucket-agent',
          foundationModel: 'anthropic.claude-v2',
          instruction: 'Test',
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
            codeKey: 'agent-code.zip',
            // codeBucket is missing
          },
        });
      }).toThrow(Error);
    });

    test('throws error when codeKey is missing for DIRECT_CODE deployment', () => {
      const stack = new Stack();
      expect(() => {
        new AgentCoreAgentRuntime(stack, 'MissingCodeKey', {
          agentName: 'missing-key-agent',
          foundationModel: 'anthropic.claude-v2',
          instruction: 'Test',
          config: {
            deploymentMethod: AgentCoreDeploymentMethod.DIRECT_CODE,
            codeBucket: 'my-code-bucket',
            // codeKey is missing
          },
        });
      }).toThrow(Error);
    });

    test('defaults to CONTAINER deployment when no deployment method specified', () => {
      const stack = new Stack();
      expect(() => {
        new AgentCoreAgentRuntime(stack, 'DefaultDeployment', {
          agentName: 'default-agent',
          foundationModel: 'anthropic.claude-v2',
          instruction: 'Test',
          config: {
            // deploymentMethod not specified, defaults to CONTAINER
            // imageUri is missing, should throw error
          },
        });
      }).toThrow(/imageUri is required for CONTAINER deployment method/);
    });
  });

  describe('VPC Configuration', () => {
    test('creates AgentCore runtime with VPC configuration warning', () => {
      // VPC configuration currently logs a warning and uses PUBLIC mode
      vpcTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        NetworkConfiguration: {
          NetworkMode: 'PUBLIC',
        },
      });
    });

    test('grants VPC permissions to execution role when VPC is provided', () => {
      vpcTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([
                'ec2:DescribeNetworkInterfaces',
                'ec2:DescribeSubnets',
                'ec2:DescribeSecurityGroups',
                'ec2:DescribeVpcs',
              ]),
              Effect: 'Allow',
              Resource: '*',
            }),
          ]),
        },
      });
    });

    test('creates VPC resources when network is provided', () => {
      const vpcs = vpcTemplate.findResources('AWS::EC2::VPC');
      expect(Object.keys(vpcs).length).toBeGreaterThan(0);
    });
  });

  describe('Runtime Interface Properties', () => {
    test('exposes correct runtime type', () => {
      expect(containerRuntime.runtimeType).toBe(AgentRuntimeType.AGENTCORE);
    });

    test('exposes execution role', () => {
      expect(containerRuntime.executionRole).toBeDefined();
      expect(containerRuntime.executionRole).toBeInstanceOf(Role);
    });

    test('exposes invocation ARN', () => {
      expect(containerRuntime.invocationArn).toBeDefined();
      // ARN is a CDK token at synthesis time, just verify it's defined
      expect(typeof containerRuntime.invocationArn).toBe('string');
    });

    test('exposes log group', () => {
      expect(containerRuntime.logGroup).toBeDefined();
    });

    test('exposes underlying AgentCore runtime', () => {
      expect(containerRuntime.agentCoreAgent).toBeDefined();
    });

    test('exposes AgentCore runtime endpoint', () => {
      expect(containerRuntime.agentCoreEndpoint).toBeDefined();
    });
  });

  describe('grantInvoke()', () => {
    test('grants bedrock-agentcore:InvokeAgentRuntime permission to grantee', () => {
      // Check that InvokerRole has a policy with bedrock-agentcore:InvokeAgentRuntime
      const policies = methodsTemplate.findResources('AWS::IAM::Policy');
      const invokerPolicy = Object.values(policies).find((policy: any) => {
        return (
          policy.Properties.Roles &&
          policy.Properties.Roles.some((role: any) => role.Ref && role.Ref.includes('InvokerRole'))
        );
      });

      expect(invokerPolicy).toBeDefined();
      expect(invokerPolicy).toHaveProperty('Properties.PolicyDocument.Statement');
      const statements = (invokerPolicy as any).Properties.PolicyDocument.Statement;
      const hasInvokeAgentRuntime = statements.some(
        (stmt: any) =>
          stmt.Action === 'bedrock-agentcore:InvokeAgentRuntime' && stmt.Effect === 'Allow',
      );
      expect(hasInvokeAgentRuntime).toBe(true);
    });

    test('grants invoke permission with both runtime and endpoint ARNs', () => {
      const policies = methodsTemplate.findResources('AWS::IAM::Policy');
      const invokerPolicy = Object.values(policies).find((policy: any) =>
        policy.Properties.Roles?.some((role: any) => role.Ref?.includes('InvokerRole')),
      );

      expect(invokerPolicy).toBeDefined();
      const statements = (invokerPolicy as any).Properties.PolicyDocument.Statement;
      const invokeStatement = statements.find(
        (stmt: any) => stmt.Action === 'bedrock-agentcore:InvokeAgentRuntime',
      );

      expect(invokeStatement).toBeDefined();
      expect(invokeStatement.Resource).toBeDefined();
      // Should have 2 resources: runtime ARN and endpoint ARN
      expect(Array.isArray(invokeStatement.Resource)).toBe(true);
      expect(invokeStatement.Resource.length).toBe(2);
    });

    test('grants invoke permission to multiple grantees', () => {
      const policies = methodsTemplate.findResources('AWS::IAM::Policy');

      // Check that both InvokerRole and Role2 have policies
      const invokerPolicy = Object.values(policies).find((policy: any) =>
        policy.Properties.Roles?.some((role: any) => role.Ref?.includes('InvokerRole')),
      );
      const role2Policy = Object.values(policies).find((policy: any) =>
        policy.Properties.Roles?.some((role: any) => role.Ref?.includes('Role2')),
      );

      expect(invokerPolicy).toBeDefined();
      expect(role2Policy).toBeDefined();
    });

    test('returns Grant object', () => {
      const grant = methodsRuntime.grantInvoke(methodsRuntime.executionRole);

      expect(grant).toBeDefined();
      expect(grant.success).toBe(true);
    });
  });

  describe('addEnvironment()', () => {
    test('environment variables are included in runtime configuration', () => {
      methodsTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        EnvironmentVariables: Match.objectLike({
          INITIAL_VAR: 'initial',
          DEBUG: 'true',
          MODEL_ID: 'anthropic.claude-v2',
          TEMPERATURE: '0.7',
          ADDED_VAR: 'added',
        }),
      });
    });
  });

  describe('addToRolePolicy()', () => {
    test('adds IAM policy statement to execution role', () => {
      methodsTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: 'arn:aws:s3:::my-bucket/*',
            }),
          ]),
        },
      });
    });

    test('adds multiple IAM policy statements', () => {
      methodsTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::my-bucket/*',
            }),
            Match.objectLike({
              Action: 'dynamodb:GetItem',
              Resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable',
            }),
            Match.objectLike({
              Action: 'bedrock:InvokeModel',
              Resource: '*',
            }),
          ]),
        },
      });
    });

    test('attaches policy to correct execution role', () => {
      methodsTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.anyValue(),
            }),
          ]),
        },
        Roles: Match.arrayWith([
          Match.objectLike({
            Ref: Match.stringLikeRegexp('MethodsRuntimeExecutionRole.*'),
          }),
        ]),
      });
    });

    test('policy statements are attached to provided custom role', () => {
      containerTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'kms:Decrypt',
            }),
          ]),
        },
        Roles: Match.arrayWith([
          Match.objectLike({
            Ref: Match.stringLikeRegexp('CustomRole.*'),
          }),
        ]),
      });
    });
  });

  describe('IAM Role Configuration', () => {
    test('creates execution role with AgentCore service principal', () => {
      containerTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'agentcore.amazonaws.com',
              },
            }),
          ]),
        },
      });
    });

    test('execution role has description', () => {
      containerTemplate.hasResourceProperties('AWS::IAM::Role', {
        Description: Match.stringLikeRegexp('Execution role for AgentCore runtime:.*'),
      });
    });

    test('uses provided custom role when specified', () => {
      expect(customRoleRuntime.executionRole).toBeDefined();

      // Verify the custom role is used
      containerTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'custom-role-agent',
        RoleArn: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('CustomRole.*'), 'Arn']),
        }),
      });
    });
  });
});
