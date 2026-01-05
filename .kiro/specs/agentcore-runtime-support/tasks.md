# Implementation Plan: AgentCore Runtime Support

## Overview
This implementation plan adds AWS AgentCore Runtime support to the Agentic AI Framework, enabling developers to choose between Lambda and AgentCore runtimes for agent execution. The implementation follows a phased approach, building core infrastructure first, then adding runtime implementations, and finally integrating with existing workflows.

---

## Phase 1: Core Runtime Abstraction

- [x] 1. Create runtime type definitions and enums
  - Create `use-cases/framework/agents/runtime/types.ts` with AgentRuntimeType enum, runtime configuration interfaces (BaseRuntimeConfig, LambdaRuntimeConfig, AgentCoreRuntimeConfig, AgentRuntimeConfig), and AgentCoreDeploymentMethod enum
  - Define error classes (AgentRuntimeError, InvalidRuntimeConfigError, RuntimeInvocationError)
  - Export all types from `use-cases/framework/agents/runtime/index.ts`
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Create abstract runtime interface
  - Create `use-cases/framework/agents/runtime/runtime-interface.ts` with IAgentRuntime interface
  - Define required properties: runtimeType, executionRole, invocationArn, logGroup
  - Define required methods: grantInvoke(), addEnvironment(), addToRolePolicy()
  - _Requirements: 2.1, 2.2, 5.3, 5.4_

- [ ]* 2.1 Write property test for runtime interface
  - **Property 1: Runtime type acceptance**
  - **Validates: Requirements 1.1**

---

## Phase 2: Lambda Runtime Implementation

- [x] 3. Implement Lambda runtime wrapper
  - Create `use-cases/framework/agents/runtime/lambda-runtime.ts` with LambdaAgentRuntime class
  - Implement IAgentRuntime interface for Lambda-based agents
  - Wrap existing PythonFunction with runtime abstraction
  - Implement grantInvoke() using Lambda's grantInvoke()
  - Implement addEnvironment() and addToRolePolicy() methods
  - _Requirements: 1.4, 2.2, 5.1, 8.1_

- [x] 3.1 Write unit tests for Lambda runtime
  - Test Lambda runtime creation with various configurations
  - Test grantInvoke() adds lambda:InvokeFunction permissions
  - Test environment variable propagation
  - Test IAM policy statement attachment
  - _Requirements: 1.4, 2.2, 5.3, 8.1_

- [ ]* 3.2 Write property test for Lambda runtime
  - **Property 4: IAM role service principal consistency (Lambda)**
  - **Validates: Requirements 2.2**

- [ ]* 3.3 Write property test for Lambda runtime
  - **Property 9: Environment variable propagation (Lambda)**
  - **Validates: Requirements 3.3**

---

## Phase 3: AgentCore Runtime Implementation

- [x] 4. Implement AgentCore runtime wrapper
  - Create `use-cases/framework/agents/runtime/agentcore-runtime.ts` with AgentCoreAgentRuntime class
  - Implement IAgentRuntime interface for AgentCore-based agents
  - Create execution role with agentcore.amazonaws.com service principal
  - Implement deployment method logic (DIRECT_CODE vs CONTAINER)
  - Configure VPC networking if provided
  - Create CloudWatch log group for AgentCore logs
  - Implement grantInvoke() with bedrock-agentcore:InvokeAgentRuntime permissions
  - _Requirements: 1.3, 2.1, 3.1, 6.1, 8.2_

- [x] 4.1 Write unit tests for AgentCore runtime
  - Test AgentCore runtime creation with DIRECT_CODE deployment
  - Test AgentCore runtime creation with CONTAINER deployment
  - Test grantInvoke() adds bedrock-agentcore:InvokeAgentRuntime permissions
  - Test VPC configuration
  - Test error handling for missing deployment configuration
  - _Requirements: 1.3, 2.1, 3.1, 6.1, 8.2_

- [ ]* 4.2 Write property test for AgentCore runtime
  - **Property 4: IAM role service principal consistency (AgentCore)**
  - **Validates: Requirements 2.1**

- [ ]* 4.3 Write property test for AgentCore runtime
  - **Property 9: Environment variable propagation (AgentCore)**
  - **Validates: Requirements 3.3**

---

## Phase 4: Runtime Factory

- [x] 5. Create runtime factory
  - Create `use-cases/framework/agents/runtime/runtime-factory.ts` with AgentRuntimeFactory class
  - Implement create() method that returns IAgentRuntime based on AgentRuntimeType
  - Handle Lambda runtime creation
  - Handle AgentCore runtime creation
  - Throw InvalidRuntimeConfigError for unsupported runtime types
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 5.1 Write unit tests for runtime factory
  - Test factory creates Lambda runtime when type is LAMBDA
  - Test factory creates AgentCore runtime when type is AGENTCORE
  - Test factory throws error for invalid runtime type
  - Test factory passes configuration correctly to runtime implementations
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ]* 5.2 Write property test for runtime factory
  - **Property 3: Runtime validation**
  - **Validates: Requirements 1.5**

---

## Phase 5: Update BaseAgent

- [x] 6. Refactor BaseAgent to use runtime abstraction
  - Update `use-cases/framework/agents/base-agent.ts` to add runtime property
  - Add optional runtime configuration to BaseAgentProps
  - Replace direct agentRole creation with runtime-based role
  - Add abstract createRuntime() method for subclasses to implement
  - Update prepareTools() to use runtime.executionRole
  - Update configurePermissions() to use runtime.addToRolePolicy()
  - Update setupObservability() to handle both Lambda and AgentCore observability
  - Add grantInvoke() method that delegates to runtime.grantInvoke()
  - Deprecate agentFunction property with @deprecated annotation
  - Add backward compatibility getter for agentFunction
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 8.3_

- [x] 6.1 Write unit tests for updated BaseAgent
  - Test BaseAgent defaults to Lambda runtime when no runtime specified
  - Test BaseAgent accepts Lambda runtime configuration
  - Test BaseAgent accepts AgentCore runtime configuration
  - Test encryption key is accessible to both runtime types
  - Test tool asset permissions are granted correctly
  - Test observability configuration for Lambda runtime
  - Test observability configuration for AgentCore runtime
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2_

- [ ]* 6.2 Write property test for BaseAgent
  - **Property 2: Infrastructure type consistency**
  - **Validates: Requirements 1.3, 1.4**

- [ ]* 6.3 Write property test for BaseAgent
  - **Property 5: Encryption key accessibility**
  - **Validates: Requirements 2.3**

- [ ]* 6.4 Write property test for BaseAgent
  - **Property 6: Observability resource creation**
  - **Validates: Requirements 2.4**

- [ ]* 6.5 Write property test for BaseAgent
  - **Property 7: Tool asset permissions**
  - **Validates: Requirements 2.5**

- [ ]* 6.6 Write property test for BaseAgent
  - **Property 18: Lambda observability configuration**
  - **Validates: Requirements 7.1, 7.3**

- [ ]* 6.7 Write property test for BaseAgent
  - **Property 19: AgentCore observability configuration**
  - **Validates: Requirements 7.2, 7.4**

- [ ]* 6.8 Write property test for BaseAgent
  - **Property 20: Log group data protection consistency**
  - **Validates: Requirements 7.5**

- [ ]* 6.9 Write property test for BaseAgent
  - **Property 21: Invocation permission correctness**
  - **Validates: Requirements 8.1, 8.2, 8.3**

---

## Phase 6: Update BatchAgent

- [x] 7. Refactor BatchAgent to use runtime abstraction
  - Update `use-cases/framework/agents/batch-agent.ts` to implement createRuntime() method
  - Use AgentRuntimeFactory to create runtime based on configuration
  - Remove direct PythonFunction creation
  - Update configureEnvironment() to use runtime.addEnvironment()
  - Ensure environment variables are set for both runtime types
  - Handle entry file selection (batch.py for Lambda, batch_agentcore.py for AgentCore)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7.1 Write unit tests for updated BatchAgent
  - Test BatchAgent creates Lambda runtime by default
  - Test BatchAgent creates AgentCore runtime when configured
  - Test environment variables are set correctly for both runtimes
  - Test timeout and memory configuration for both runtimes
  - Test VPC configuration for both runtimes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 7.2 Write property test for BatchAgent
  - **Property 8: BatchAgent infrastructure consistency**
  - **Validates: Requirements 3.1, 3.2**

- [ ]* 7.3 Write property test for BatchAgent
  - **Property 10: Resource configuration translation**
  - **Validates: Requirements 3.4**

- [ ]* 7.4 Write property test for BatchAgent
  - **Property 11: VPC configuration consistency**
  - **Validates: Requirements 3.5**

---

## Phase 7: AgentCore Agent Code

- [x] 8. Create AgentCore entrypoint for batch agent
  - Create `use-cases/framework/agents/resources/default-strands-agent/batch_agentcore.py`
  - Implement @app.entrypoint decorator for Strands SDK
  - Extract shared logic from batch.py into shared_agent_logic.py
  - Refactor batch.py to use shared logic
  - Implement batch_agentcore.py to use shared logic
  - Add ADOT dependencies to requirements.txt for observability
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_

- [x] 8.1 Write unit tests for shared agent logic
  - Test shared logic processes batch requests correctly
  - Test tool loading works consistently
  - Test environment variable access works consistently
  - Test AWS SDK authentication works consistently
  - _Requirements: 5.3, 5.4, 5.5, 6.4_

- [ ]* 8.2 Write property test for agent code
  - **Property 12: Environment variable access consistency**
  - **Validates: Requirements 5.3**

- [ ]* 8.3 Write property test for agent code
  - **Property 13: AWS SDK authentication**
  - **Validates: Requirements 5.4**

- [ ]* 8.4 Write property test for agent code
  - **Property 14: Tool loading mechanism consistency**
  - **Validates: Requirements 5.5, 6.4**

- [ ]* 8.5 Write property test for agent code
  - **Property 17: Tool execution context consistency**
  - **Validates: Requirements 6.5**

---

## Phase 8: Step Functions Integration

- [x] 9. Add Step Functions task creation method to BaseAgent
  - Add createStepFunctionsTask() method to BaseAgent
  - Implement Lambda invocation using LambdaInvoke task
  - Implement AgentCore invocation using HTTP Task with EventBridge Connection
  - Add getOrCreateAgentCoreConnection() private method
  - Configure VPC for EventBridge Connection when network is provided
  - Use JsonPath.executionId as session ID for AgentCore invocations
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 9.1 Write unit tests for Step Functions integration
  - Test createStepFunctionsTask() creates LambdaInvoke for Lambda runtime
  - Test createStepFunctionsTask() creates HTTP Task for AgentCore runtime
  - Test EventBridge Connection is created for AgentCore runtime
  - Test VPC configuration is applied to EventBridge Connection
  - Test session ID uses Step Functions execution ID
  - _Requirements: 8.1, 8.2, 8.4_

- [ ]* 9.2 Write property test for Step Functions integration
  - **Property 22: Workflow integration permissions**
  - **Validates: Requirements 8.4**

---

## Phase 9: Update Document Processing Integration

- [x] 10. Update AgenticDocumentProcessing to use runtime abstraction
  - Update `use-cases/document-processing/agentic-document-processing.ts` to use createStepFunctionsTask()
  - Replace direct LambdaInvoke with agent.createStepFunctionsTask()
  - Update processingStep() to work with both runtime types
  - Ensure adapter IAM policies are granted to agent execution role
  - _Requirements: 8.4_

- [x] 10.1 Write integration tests for document processing
  - Test document processing workflow with Lambda runtime
  - Test document processing workflow with AgentCore runtime
  - Test adapter permissions are granted correctly
  - _Requirements: 8.4_

---

## Phase 10: Export Public API

- [x] 11. Update public exports
  - Update `use-cases/framework/agents/index.ts` to export runtime types and interfaces
  - Export AgentRuntimeType, AgentRuntimeConfig, LambdaRuntimeConfig, AgentCoreRuntimeConfig
  - Export AgentCoreDeploymentMethod
  - Export runtime implementations (LambdaAgentRuntime, AgentCoreAgentRuntime, AgentRuntimeFactory)
  - _Requirements: 1.1, 1.5_

---

## Phase 11: Documentation

- [x] 12. Create comprehensive documentation
  - Update `use-cases/framework/agents/README.md` with runtime selection guide
  - Add comparison table: Lambda vs AgentCore (execution time, state management, cost, use cases)
  - Add code examples for both Lambda and AgentCore configurations
  - Document observability differences (Powertools vs ADOT)
  - Document AgentCore prerequisites (CloudWatch Transaction Search setup)
  - Document deployment methods (DIRECT_CODE vs CONTAINER)
  - Document code reuse patterns between Lambda and AgentCore
  - Add migration guide from Lambda to AgentCore
  - Document Step Functions integration differences
  - Add troubleshooting section
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 13. Create example application
  - Create `examples/document-processing/agentcore-document-processing/` directory (moved from examples/agents/)
  - Implement three CDK stacks demonstrating runtime comparison:
    - Lambda runtime (baseline)
    - AgentCore runtime with DIRECT_CODE deployment
    - AgentCore runtime with CONTAINER deployment
  - Focus on insurance claims processing use case
  - Include tools for downloading policies and supporting documents from S3
  - Add comprehensive README with deployment instructions and runtime comparison
  - Add ARCHITECTURE.md explaining the three runtime approaches
  - Include sample claim data and upload scripts
  - Add comparison table showing execution time, memory, cost, and use cases
  - _Requirements: 4.3_
  - **Status: COMPLETED - Example revamped to focus on document processing with insurance claims**

- [x] 14. Update API documentation
  - Add JSDoc comments to all new public classes and interfaces
  - Document runtime configuration options with examples
  - Add @deprecated annotations to agentFunction property
  - Document observability setup for AgentCore
  - Document ADOT integration requirements
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

---

## Phase 12: CDK Nag Compliance

- [x] 15. Add CDK Nag tests for runtime implementations
  - Create `use-cases/framework/tests/runtime-nag.test.ts`
  - Test Lambda runtime compliance
  - Test AgentCore runtime compliance
  - Test BaseAgent compliance with both runtime types
  - Test BatchAgent compliance with both runtime types
  - Ensure all security best practices are followed
  - _Requirements: All security-related requirements_

---

## Phase 13: Final Integration and Testing

- [x] 16. Checkpoint - Ensure all tests pass
  - Run all unit tests: `npm test`
  - Run all property-based tests
  - Run all CDK Nag tests: `npm run test:cdk-nag:all`
  - Fix any failing tests
  - Ensure test coverage >80%
  - Ask the user if questions arise

- [ ]* 17. End-to-end integration testing
  - Test complete document processing workflow with Lambda runtime
  - Test complete document processing workflow with AgentCore runtime
  - Test runtime switching (Lambda → AgentCore)
  - Test observability for both runtimes
  - Test VPC networking for both runtimes
  - Test tool integration for both runtimes
  - _Requirements: All requirements_

---

## Notes

- **Optional tasks** (marked with `*`) include property-based tests, unit tests, and CDK Nag tests
- **Core implementation tasks** must be completed for functionality
- **Testing tasks** provide validation but can be skipped for faster MVP
- Each task references specific requirements from the requirements document
- Tasks build incrementally on previous tasks
- AgentCore Runtime API constructs (CfnAgentRuntime, CfnAgentRuntimeEndpoint) are placeholders pending AWS CDK L1 construct availability
