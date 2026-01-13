/**
 * Runtime abstraction layer for agent execution environments
 *
 * This module provides a comprehensive abstraction layer that enables the Agentic AI
 * Framework to support multiple agent runtime types (AWS Lambda and AWS AgentCore Runtime)
 * through a unified interface. It implements the Strategy pattern to encapsulate
 * runtime-specific implementation details while providing a consistent developer experience.
 *
 * ## Key Components
 *
 * ### Type Definitions (`types.ts`)
 * - **AgentRuntimeType**: Enum defining supported runtime types (LAMBDA, AGENTCORE)
 * - **AgentCoreDeploymentMethod**: Enum for AgentCore deployment options (CONTAINER, DIRECT_CODE)
 * - **BaseRuntimeConfig**: Common configuration shared across all runtimes
 * - **LambdaRuntimeConfig**: Lambda-specific configuration (architecture, ephemeral storage)
 * - **AgentCoreRuntimeConfig**: AgentCore-specific configuration (deployment method, image URI)
 * - **AgentRuntimeConfig**: Top-level configuration combining type and settings
 *
 * ### Runtime Interface (`runtime-interface.ts`)
 * - **IAgentRuntime**: Abstract interface defining the contract for all runtime implementations
 *   - Provides unified access to execution role, invocation ARN, log group
 *   - Defines methods for granting permissions, adding environment variables, and IAM policies
 *   - Enables runtime-agnostic code in BaseAgent and concrete agent implementations
 *
 * ### Runtime Implementations
 * - **LambdaAgentRuntime** (`lambda-runtime.ts`): Wraps AWS Lambda PythonFunction
 *   - Suitable for short-lived, stateless operations (max 15 minutes)
 *   - Event-driven invocation model
 *   - Uses AWS Lambda Powertools for observability
 *   - Cost-effective for intermittent workloads
 *
 * - **AgentCoreAgentRuntime** (`agentcore-runtime.ts`): Wraps AWS AgentCore Runtime
 *   - Suitable for long-running, stateful operations (up to 8 hours)
 *   - HTTP-based invocation model with session management
 *   - Uses AWS Distro for OpenTelemetry (ADOT) for observability
 *   - Enhanced agent orchestration capabilities
 *
 * ### Runtime Factory (`runtime-factory.ts`)
 * - **AgentRuntimeFactory**: Factory class for creating runtime instances
 *   - Centralizes runtime creation logic
 *   - Provides type-safe runtime instantiation
 *   - Handles configuration validation and error handling
 *   - Simplifies runtime selection in agent constructors
 *
 * ## Usage Patterns
 *
 * The runtime abstraction supports multiple usage patterns including default Lambda runtime,
 * explicit Lambda configuration with custom settings, AgentCore runtime with container deployment,
 * and runtime-agnostic operations like granting permissions and adding environment variables.
 *
 * ## Runtime Selection Guide
 *
 * ### Choose Lambda Runtime When:
 * - Execution time is under 15 minutes
 * - Agent operations are stateless
 * - Cost optimization for intermittent workloads is important
 * - Quick iteration and development is needed
 * - Event-driven invocation patterns are sufficient
 * - You want to use AWS Lambda Powertools for observability
 *
 * ### Choose AgentCore Runtime When:
 * - Execution time exceeds 15 minutes (up to 8 hours)
 * - Agent requires stateful session management
 * - Complex multi-turn conversations are needed
 * - Enhanced agent orchestration capabilities are required
 * - Long-running batch processing is needed
 * - You want to use ADOT for custom observability
 *
 * ## Observability Differences
 *
 * ### Lambda Runtime Observability
 * - **Logging**: CloudWatch Logs at /aws/lambda/function-name
 * - **Tracing**: AWS X-Ray for distributed tracing
 * - **Metrics**: CloudWatch Metrics for invocation metrics
 * - **Instrumentation**: AWS Lambda Powertools for Python
 * - **Environment Variables**: POWERTOOLS_SERVICE_NAME, POWERTOOLS_METRICS_NAMESPACE
 *
 * ### AgentCore Runtime Observability
 * - **Logging**: CloudWatch Logs at /aws/bedrock-agentcore/runtimes/runtime-name
 * - **Tracing**: CloudWatch Transaction Search for trace visualization
 * - **Metrics**: Built-in runtime metrics (invocations, latency, errors, resource usage)
 * - **Dashboard**: CloudWatch GenAI Observability dashboard
 * - **Instrumentation**: AWS Distro for OpenTelemetry (ADOT)
 * - **Prerequisites**: CloudWatch Transaction Search setup (one-time account configuration)
 * - **Environment Variables**: OTEL_*, AGENT_OBSERVABILITY_ENABLED
 *
 * ### ADOT Integration for AgentCore
 * To enable custom metrics and traces in AgentCore agents:
 * 1. Add dependency: `aws-opentelemetry-distro>=0.10.0` to requirements.txt
 * 2. Execute agent with: `opentelemetry-instrument python agent_code.py`
 * 3. Enable CloudWatch Transaction Search in your AWS account (one-time setup)
 * 4. Configure OTEL environment variables (handled automatically by CDK construct)
 *
 * Reference: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
 *
 * ## Architecture Benefits
 *
 * ### Abstraction Layer Benefits
 * - **Unified Interface**: Single API for working with multiple runtime types
 * - **Type Safety**: TypeScript ensures correct configuration at compile time
 * - **Extensibility**: Easy to add new runtime types in the future
 * - **Testability**: Runtime implementations can be mocked for testing
 * - **Maintainability**: Runtime-specific logic is encapsulated in dedicated classes
 *
 * ### Backward Compatibility
 * - Existing Lambda-based agents continue to work without modification
 * - Default runtime type is Lambda for backward compatibility
 * - Deprecated properties (agentFunction, agentRole) still available with warnings
 * - Migration path is opt-in and gradual
 *
 * ## Migration Guide
 *
 * ### Migrating from Lambda to AgentCore
 * 1. Update runtime configuration in CDK code
 * 2. Adapt agent entrypoint:
 *    - Lambda: `def handler(event, context):`
 *    - AgentCore: `@app.entrypoint` decorator or HTTP endpoints
 * 3. Update observability configuration:
 *    - Lambda: Powertools environment variables
 *    - AgentCore: ADOT dependencies and environment variables
 * 4. Adjust timeout and memory settings for longer execution
 * 5. Update Step Functions integration:
 *    - Lambda: LambdaInvoke task (supported)
 *    - AgentCore: Not yet supported (Step Functions doesn't support bedrock-agentcore service)
 * 6. Test thoroughly in non-production environment
 *
 * ### Code Reuse Between Runtimes
 * Extract shared agent logic into a common module that can be used by both Lambda
 * and AgentCore entry points, with Lambda using a handler function and AgentCore
 * using an entrypoint decorator.
 *
 * ## Best Practices
 *
 * ### Configuration
 * - Always specify timeout and memory explicitly for production workloads
 * - Use ARM_64 architecture for Lambda when possible (better price-performance)
 * - Choose appropriate deployment method for AgentCore based on complexity
 * - Version your container images and ZIP archives for traceability
 *
 * ### Observability
 * - Enable observability for all production agents
 * - Configure appropriate log retention policies
 * - Use structured logging for easier debugging
 * - Set up CloudWatch alarms for error rates and latency
 * - For AgentCore, complete CloudWatch Transaction Search setup
 *
 * ### Security
 * - Use least-privilege IAM roles for execution
 * - Encrypt environment variables with KMS
 * - Deploy in VPC when accessing private resources
 * - Use VPC endpoints for AWS service access
 * - Regularly rotate credentials and update dependencies
 *
 * ### Cost Optimization
 * - Right-size memory allocation based on actual usage
 * - Use ARM_64 architecture for Lambda (up to 34% cost savings)
 * - Consider AgentCore for long-running operations (may be more cost-effective)
 * - Monitor and optimize execution time
 * - Use appropriate log retention periods
 *
 * @module runtime
 */

export {
  AgentRuntimeType,
  AgentCoreDeploymentMethod,
  BaseRuntimeConfig,
  LambdaRuntimeConfig,
  AgentCoreRuntimeConfig,
  AgentRuntimeConfig,
} from './types';

export { IAgentRuntime } from './runtime-interface';

export { LambdaAgentRuntime, LambdaAgentRuntimeProps } from './lambda-runtime';

export { AgentCoreAgentRuntime, AgentCoreAgentRuntimeProps, AgentCoreNetworkConfig } from './agentcore-runtime';

export { AgentRuntimeFactory, CommonRuntimeProps } from './runtime-factory';
