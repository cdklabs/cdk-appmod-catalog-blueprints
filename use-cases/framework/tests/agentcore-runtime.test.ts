// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AgentCoreAgentRuntime } from '../agents/runtime/agentcore-runtime';
import { AgentRuntimeType, AgentCoreDeploymentMethod } from '../agents/runtime/types';

describe('AgentCoreAgentRuntime', () => {
  let mainStack: Stack;
  let directCodeStack: Stack;

  let mainTemplate: Template;

  let containerRuntime: AgentCoreAgentRuntime;
  let methodsRuntime: AgentCoreAgentRuntime;
  let customRoleRuntime: AgentCoreAgentRuntime;
  // @ts-ignore - Variable is used to create resources in the stack
  let vpcRuntime: AgentCoreAgentRuntime;

  beforeAll(() => {
    // Main stack - consolidates container, methods, and VPC tests into one stack
    mainStack = new Stack(undefined, 'MainStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    // Test 1: Basic container deployment
    containerRuntime = new AgentCoreAgentRuntime(mainStack, 'DefaultContainerRuntime', {
      agentName: 'test-container-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are a helpful assistant',
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
      },
    });

    // Test 2: Custom configuration
    new AgentCoreAgentRuntime(mainStack, 'CustomConfigRuntime', {
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

    // Test 3: Custom role
    const customRole = new Role(mainStack, 'CustomRole', {
      assumedBy: new ServicePrincipal('bedrock-agentcore.amazonaws.com'),
    });
    customRoleRuntime = new AgentCoreAgentRuntime(mainStack, 'CustomRoleRuntime', {
      agentName: 'custom-role-agent',
      foundationModel: 'anthropic.claude-v2',
      instruction: 'You are an assistant with custom role',
      role: customRole,
      config: {
        deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
        imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/role-agent:latest',
      },
    });
    customRoleRuntime.addToRolePolicy(
      new PolicyStatement({
        actions: ['kms:Decrypt'],
        resources: ['*'],
      }),
    );

    // Test 4: Methods testing (grantInvoke, addEnvironment, addToRolePolicy)
    methodsRuntime = new AgentCoreAgentRuntime(mainStack, 'MethodsRuntime', {
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

    const invokerRole = new Role(mainStack, 'InvokerRole', {
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
    });
    const role2 = new Role(mainStack, 'Role2', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    methodsRuntime.grantInvoke(invokerRole);
    methodsRuntime.grantInvoke(role2);

    methodsRuntime.addEnvironment('MODEL_ID', 'anthropic.claude-v2');
    methodsRuntime.addEnvironment('TEMPERATURE', '0.7');
    methodsRuntime.addEnvironment('ADDED_VAR', 'added');
    methodsRuntime.addEnvironment('DEBUG', 'true');

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

    // Test 5: VPC configuration
    const vpc = new Vpc(mainStack, 'Vpc');
    vpcRuntime = new AgentCoreAgentRuntime(mainStack, 'VpcRuntime', {
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

    // Generate single template for all tests
    mainTemplate = Template.fromStack(mainStack);

    // Direct code deployment stack - only for error testing (no resources created)
    directCodeStack = new Stack(undefined, 'DirectCodeStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  describe('Runtime Creation - CONTAINER Deployment', () => {
    test('creates AgentCore runtime with CONTAINER deployment', () => {
      mainTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'test-container-agent',
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
          },
        },
      });
    });

    test('creates AgentCore runtime with PUBLIC network mode', () => {
      mainTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        NetworkConfiguration: {
          NetworkMode: 'PUBLIC',
        },
      });
    });

    test('creates AgentCore runtime endpoint', () => {
      mainTemplate.hasResourceProperties('AWS::BedrockAgentCore::RuntimeEndpoint', {
        Name: 'test-container-agent_endpoint',
        AgentRuntimeId: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([
            Match.stringLikeRegexp('DefaultContainerRuntime.*'),
            'AgentRuntimeId',
          ]),
        }),
      });
    });

    test('does not create CloudWatch log group (managed by AgentCore)', () => {
      // AgentCore automatically creates logs at: /aws/bedrock-agentcore/runtimes/<runtime-id>-<endpoint-name>/runtime-logs
      // We don't create a custom log group to avoid conflicts
      const logGroups = mainTemplate.findResources('AWS::Logs::LogGroup');
      expect(Object.keys(logGroups).length).toBe(0);
    });

    test('creates AgentCore runtime with custom configuration', () => {
      mainTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
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

      mainTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'custom-role-agent',
        RoleArn: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('CustomRole.*'), 'Arn']),
        }),
      });
    });

    test('creates expected number of AgentCore runtimes', () => {
      const runtimes = mainTemplate.findResources('AWS::BedrockAgentCore::Runtime');
      // Now we have 5 runtimes in one stack: DefaultContainerRuntime, CustomConfigRuntime, CustomRoleRuntime, MethodsRuntime, VpcRuntime
      expect(Object.keys(runtimes).length).toBe(5);
    });

    test('creates expected number of AgentCore runtime endpoints', () => {
      const endpoints = mainTemplate.findResources('AWS::BedrockAgentCore::RuntimeEndpoint');
      // One endpoint per runtime
      expect(Object.keys(endpoints).length).toBe(5);
    });

    test('applies DESTROY removal policy by default to runtime and endpoint', () => {
      // Check that runtime has DESTROY policy (default)
      const runtimes = mainTemplate.findResources('AWS::BedrockAgentCore::Runtime');
      const testRuntime = Object.values(runtimes).find(
        (rt: any) => rt.Properties.AgentRuntimeName === 'test-container-agent',
      );
      expect(testRuntime).toBeDefined();
      expect((testRuntime as any).DeletionPolicy).toBe('Delete');
      expect((testRuntime as any).UpdateReplacePolicy).toBe('Delete');

      // Check that endpoint has DESTROY policy
      const endpoints = mainTemplate.findResources('AWS::BedrockAgentCore::RuntimeEndpoint');
      const testEndpoint = Object.values(endpoints).find(
        (ep: any) => ep.Properties.Name === 'test-container-agent_endpoint',
      );
      expect(testEndpoint).toBeDefined();
      expect((testEndpoint as any).DeletionPolicy).toBe('Delete');
      expect((testEndpoint as any).UpdateReplacePolicy).toBe('Delete');
    });

    test('applies custom removal policy when specified', () => {
      const stack = new Stack(undefined, 'RemovalPolicyStack');
      new AgentCoreAgentRuntime(stack, 'RetainRuntime', {
        agentName: 'retain-agent',
        foundationModel: 'anthropic.claude-v2',
        instruction: 'Test',
        config: {
          deploymentMethod: AgentCoreDeploymentMethod.CONTAINER,
          imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test:latest',
        },
        removalPolicy: RemovalPolicy.RETAIN,
      });

      const template = Template.fromStack(stack);
      const runtimes = template.findResources('AWS::BedrockAgentCore::Runtime');
      const retainRuntime = Object.values(runtimes).find(
        (rt: any) => rt.Properties.AgentRuntimeName === 'retain-agent',
      );
      expect(retainRuntime).toBeDefined();
      expect((retainRuntime as any).UpdateReplacePolicy).toBe('Retain');
      expect((retainRuntime as any).DeletionPolicy).toBe('Retain');
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
      mainTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        NetworkConfiguration: {
          NetworkMode: 'PUBLIC',
        },
      });
    });

    test('grants VPC permissions to execution role when VPC is provided', () => {
      mainTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
      const vpcs = mainTemplate.findResources('AWS::EC2::VPC');
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

    test('exposes log group as undefined (managed by AgentCore)', () => {
      // AgentCore automatically creates and manages logs
      // The logGroup property is undefined to indicate logs are managed by AgentCore
      expect(containerRuntime.logGroup).toBeUndefined();
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
      const policies = mainTemplate.findResources('AWS::IAM::Policy');
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
      const policies = mainTemplate.findResources('AWS::IAM::Policy');
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
      const policies = mainTemplate.findResources('AWS::IAM::Policy');

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
      mainTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
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
      mainTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
      mainTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
      mainTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
      mainTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
      mainTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'bedrock-agentcore.amazonaws.com',
              },
            }),
          ]),
        },
      });
    });

    test('execution role has description', () => {
      mainTemplate.hasResourceProperties('AWS::IAM::Role', {
        Description: Match.stringLikeRegexp('Execution role for AgentCore runtime:.*'),
      });
    });

    test('uses provided custom role when specified', () => {
      expect(customRoleRuntime.executionRole).toBeDefined();

      // Verify the custom role is used
      mainTemplate.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: 'custom-role-agent',
        RoleArn: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('CustomRole.*'), 'Arn']),
        }),
      });
    });
  });
});
