import { Duration, Size } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';

/**
 * Supported agent runtime types
 */
export enum AgentRuntimeType {
  /**
   * AWS Lambda function runtime (default)
   * - Suitable for short-lived, stateless operations
   * - Maximum execution time: 15 minutes
   * - Event-driven invocation model
   */
  LAMBDA = 'LAMBDA',

  /**
   * AWS AgentCore runtime
   * - Suitable for long-running, stateful operations
   * - Extended execution time support
   * - Enhanced agent orchestration capabilities
   */
  AGENTCORE = 'AGENTCORE',
}

/**
 * AgentCore deployment method
 */
export enum AgentCoreDeploymentMethod {
  /**
   * Container-based deployment using Docker image in ECR
   * - Suitable for complex agents with custom dependencies
   * - Requires Docker expertise
   * - Full control over runtime environment
   */
  CONTAINER = 'CONTAINER',

  /**
   * Direct code deployment using ZIP archive in S3
   * - Suitable for Python agents with standard dependencies
   * - No Docker required
   * - Faster iteration and prototyping
   */
  DIRECT_CODE = 'DIRECT_CODE',
}

/**
 * Common runtime configuration parameters shared across all runtime types
 *
 * This interface defines the base configuration options that apply to all
 * agent runtime types (Lambda and AgentCore). These settings control the
 * fundamental resource allocation and execution constraints for the agent.
 */
export interface BaseRuntimeConfig {
  /**
   * Maximum execution time for the agent
   *
   * Specifies how long the agent can run before being terminated. The actual
   * maximum depends on the runtime type:
   * - **Lambda**: Up to 15 minutes (900 seconds)
   * - **AgentCore**: Up to 8 hours (28,800 seconds)
   *
   * Choose a timeout that accommodates your agent's typical execution time
   * plus a buffer for variability. Setting too short a timeout may cause
   * premature termination; setting too long may delay error detection.
   *
   * @default Duration.minutes(10)
   */
  readonly timeout?: Duration;

  /**
   * Memory allocation for the agent in MB
   *
   * Specifies the amount of memory available to the agent during execution.
   * More memory can improve performance for memory-intensive operations like:
   * - Large document processing
   * - Complex model inference
   * - In-memory data caching
   *
   * Memory allocation also affects CPU allocation in some runtime types:
   * - **Lambda**: CPU scales proportionally with memory (1,769 MB = 1 vCPU)
   * - **AgentCore**: CPU allocation may be independent of memory
   *
   * Valid range depends on runtime type:
   * - **Lambda**: 128 MB to 10,240 MB (in 1 MB increments)
   * - **AgentCore**: Check AWS documentation for current limits
   *
   * @default 1024
   */
  readonly memorySize?: number;
}

/**
 * Lambda-specific runtime configuration
 *
 * Extends BaseRuntimeConfig with Lambda-specific settings for CPU architecture
 * and ephemeral storage. These options allow fine-tuning of Lambda function
 * performance and cost characteristics.
 *
 * Architecture Considerations:
 * - X86_64: Broader compatibility, more mature ecosystem
 * - ARM_64: Better price-performance ratio (up to 34% better), lower carbon footprint
 *
 * Ephemeral Storage:
 * - Available at /tmp in Lambda function
 * - Persists for the lifetime of the execution environment
 * - Useful for caching, temporary file processing, or large downloads
 * - Additional cost applies above 512 MB
 */
export interface LambdaRuntimeConfig extends BaseRuntimeConfig {
  /**
   * CPU architecture for Lambda function
   *
   * Determines the processor architecture used to execute the Lambda function:
   * - **X86_64**: Intel/AMD x86-64 architecture (default)
   *   - Broader compatibility with existing libraries
   *   - More mature ecosystem
   *   - Standard pricing
   * - **ARM_64**: AWS Graviton2 ARM-based architecture
   *   - Up to 34% better price-performance
   *   - Lower carbon footprint
   *   - May require ARM-compatible dependencies
   *
   * **Migration Considerations:**
   * When switching to ARM_64, ensure all dependencies (Python packages,
   * Lambda layers, native extensions) are ARM-compatible. Most popular
   * Python packages support ARM64, but verify before migrating.
   *
   * @default Architecture.X86_64
   */
  readonly architecture?: Architecture;

  /**
   * Ephemeral storage size for Lambda function
   *
   * Configures the size of the /tmp directory available to the Lambda function.
   * This storage is:
   * - Ephemeral: Cleared between cold starts
   * - Persistent: Available across warm invocations in the same execution environment
   * - Fast: Local SSD storage
   *
   * **Use Cases:**
   * - Downloading and processing large files
   * - Caching data between invocations (warm starts)
   * - Temporary storage for intermediate processing results
   * - Extracting and working with ZIP archives
   *
   * **Sizing Guidelines:**
   * - Default 512 MB is sufficient for most use cases
   * - Increase for document processing, media manipulation, or large datasets
   * - Maximum 10,240 MB (10 GB)
   * - Additional cost applies above 512 MB
   *
   * @default Size.mebibytes(512)
   */
  readonly ephemeralStorageSize?: Size;
}

/**
 * AgentCore-specific runtime configuration
 *
 * Extends BaseRuntimeConfig with AgentCore-specific settings for deployment
 * method and code location. AgentCore Runtime supports container-based deployment,
 * providing flexibility for complex agent implementations.
 *
 * Deployment Methods:
 *
 * 1. CONTAINER (Recommended):
 *    - Deploy agent as Docker container in Amazon ECR
 *    - Full control over runtime environment
 *    - Support for any programming language
 *    - Custom system dependencies
 *    - ARM64 architecture required
 *
 * 2. DIRECT_CODE (Future):
 *    - Deploy Python code as ZIP archive in S3
 *    - No Docker required
 *    - Faster iteration
 *    - Limited to Python runtime
 *    - Note: May not be fully supported in current version
 *
 * Container Requirements:
 * - ARM64 architecture (required)
 * - Expose /invocations POST endpoint for agent interactions
 * - Expose /ping GET endpoint for health checks
 * - Listen on port 8080 (default)
 * - Include ADOT dependencies for observability
 *
 * Observability Setup:
 * For enhanced observability with custom metrics and traces:
 * 1. Add aws-opentelemetry-distro>=0.10.0 to dependencies
 * 2. Execute agent with: opentelemetry-instrument python agent_code.py
 * 3. Enable CloudWatch Transaction Search (one-time account setup)
 *
 * Reference: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
 */
export interface AgentCoreRuntimeConfig extends BaseRuntimeConfig {
  /**
   * Deployment method for agent code
   *
   * Determines how the agent code is packaged and deployed to AgentCore Runtime:
   *
   * **CONTAINER** (Recommended):
   * - Package agent as Docker container image
   * - Store image in Amazon ECR
   * - Specify image URI in `imageUri` property
   * - Provides full control over runtime environment
   * - Supports any programming language
   * - Allows custom system dependencies
   * - Requires Docker expertise
   *
   * **DIRECT_CODE** (Future Support):
   * - Package Python agent as ZIP archive
   * - Store archive in Amazon S3
   * - Specify bucket and key in `codeBucket` and `codeKey` properties
   * - Simpler deployment workflow
   * - No Docker required
   * - Limited to Python runtime
   * - Note: May not be fully supported in current CDK version
   *
   * **Choosing a Deployment Method:**
   * - Use CONTAINER for production workloads requiring custom dependencies
   * - Use CONTAINER for non-Python agents
   * - Use DIRECT_CODE (when available) for simple Python agents
   * - Use DIRECT_CODE (when available) for rapid prototyping
   *
   * @default AgentCoreDeploymentMethod.DIRECT_CODE
   */
  readonly deploymentMethod?: AgentCoreDeploymentMethod;

  /**
   * For CONTAINER deployment: ECR image URI
   *
   * The fully qualified URI of the Docker image in Amazon ECR containing
   * the agent code and dependencies.
   *
   * Format: {account}.dkr.ecr.{region}.amazonaws.com/{repository}:{tag}
   *
   * Example: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:v1.2.3
   *
   * Requirements:
   * - Image must be built for ARM64 architecture
   * - Image must expose /invocations POST endpoint
   * - Image must expose /ping GET endpoint for health checks
   * - Image should listen on port 8080 (default)
   * - AgentCore execution role must have permissions to pull from ECR
   *
   * Building ARM64 Images:
   * Use docker buildx build with --platform linux/arm64 flag, then tag and push to ECR.
   *
   * Required when: deploymentMethod is CONTAINER
   */
  readonly imageUri?: string;

  /**
   * For DIRECT_CODE deployment: S3 bucket containing ZIP archive
   *
   * The name of the S3 bucket containing the ZIP archive with the agent code
   * and dependencies. The AgentCore execution role will be granted read access
   * to this bucket.
   *
   * ZIP Archive Requirements:
   * - Must contain Python code with entrypoint file
   * - Must include requirements.txt with dependencies
   * - Must set POSIX file permissions before creating archive
   * - Entrypoint must use @app.entrypoint decorator (Strands SDK)
   *   OR implement /invocations and /ping endpoints (FastAPI/custom)
   *
   * Creating ZIP Archive:
   * Set permissions with chmod -R 755, then create archive with zip -r command.
   *
   * Required when: deploymentMethod is DIRECT_CODE
   *
   * Note: DIRECT_CODE deployment may not be fully supported in the current
   * CDK version. Check AWS documentation for the latest deployment options.
   */
  readonly codeBucket?: string;

  /**
   * For DIRECT_CODE deployment: S3 key for ZIP archive
   *
   * The S3 object key (path) to the ZIP archive containing the agent code.
   * The AgentCore execution role will be granted read access to this specific
   * object.
   *
   * Example: agents/my-agent/v1.2.3/agent.zip
   *
   * Best Practices:
   * - Include version number in key for traceability
   * - Use consistent naming convention across agents
   * - Consider using separate prefixes for different environments
   *
   * Required when: deploymentMethod is DIRECT_CODE
   *
   * Note: DIRECT_CODE deployment may not be fully supported in the current
   * CDK version. Check AWS documentation for the latest deployment options.
   */
  readonly codeKey?: string;
}

/**
 * Configuration for agent runtime environment
 *
 * This interface specifies which runtime type to use (Lambda or AgentCore) and
 * provides runtime-specific configuration options. It serves as the primary
 * configuration point for selecting and configuring the agent's execution environment.
 *
 * Runtime Selection Guide:
 *
 * Use Lambda Runtime when:
 * - Execution time is under 15 minutes
 * - Agent operations are stateless
 * - Cost optimization for intermittent workloads is important
 * - Quick iteration and development is needed
 * - Event-driven invocation patterns are sufficient
 *
 * Use AgentCore Runtime when:
 * - Execution time exceeds 15 minutes (up to 8 hours)
 * - Agent requires stateful session management
 * - Complex multi-turn conversations are needed
 * - Enhanced agent orchestration capabilities are required
 * - Long-running batch processing is needed
 *
 * Observability Differences:
 *
 * Lambda Runtime:
 * - Uses AWS Lambda Powertools for structured logging
 * - CloudWatch Logs: /aws/lambda/function-name
 * - X-Ray tracing for distributed tracing
 * - CloudWatch Metrics for invocation metrics
 * - Environment variables: POWERTOOLS_SERVICE_NAME, POWERTOOLS_METRICS_NAMESPACE
 *
 * AgentCore Runtime:
 * - Uses AWS Distro for OpenTelemetry (ADOT) for observability
 * - CloudWatch Logs: /aws/bedrock-agentcore/runtimes/runtime-name
 * - CloudWatch Transaction Search for trace visualization
 * - CloudWatch GenAI Observability dashboard
 * - Built-in runtime metrics (invocations, latency, errors, resource usage)
 * - Requires CloudWatch Transaction Search setup (one-time account configuration)
 * - Environment variables: OTEL_*, AGENT_OBSERVABILITY_ENABLED
 *
 * ADOT Integration Requirements (AgentCore):
 * To enable custom metrics and traces in AgentCore agents:
 * 1. Add dependency: aws-opentelemetry-distro>=0.10.0
 * 2. Execute agent with: opentelemetry-instrument python agent_code.py
 * 3. Enable CloudWatch Transaction Search in your AWS account
 * 4. Configure OTEL environment variables (handled automatically by CDK)
 *
 * Reference: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
 *
 * Migration Between Runtimes:
 *
 * Switching between Lambda and AgentCore requires:
 * 1. Update runtime configuration in CDK code
 * 2. Adapt agent entrypoint (Lambda handler vs AgentCore @app.entrypoint)
 * 3. Update observability configuration (Powertools vs ADOT)
 * 4. Adjust timeout and memory settings for new runtime
 * 5. Update Step Functions integration (LambdaInvoke only - AgentCore not yet supported)
 * 6. Test thoroughly in non-production environment
 *
 * Cost Considerations:
 *
 * Lambda:
 * - Pay per 100ms of execution time
 * - Free tier: 1M requests + 400,000 GB-seconds per month
 * - Cost-effective for intermittent workloads
 * - No cost when not executing
 *
 * AgentCore:
 * - Different pricing model (check AWS pricing page)
 * - May be more cost-effective for long-running operations
 * - Consider execution time and frequency when comparing costs
 */
export interface AgentRuntimeConfig {
  /**
   * The type of runtime to use for agent execution
   *
   * Specifies whether the agent should run on AWS Lambda or AWS AgentCore Runtime.
   * This choice affects:
   * - Maximum execution time (Lambda: 15 min, AgentCore: 8 hours)
   * - Invocation model (Lambda: event-driven, AgentCore: HTTP-based)
   * - State management (Lambda: stateless, AgentCore: stateful sessions)
   * - Observability (Lambda: Powertools, AgentCore: ADOT)
   * - Cost structure (Lambda: per-invocation, AgentCore: per-runtime-hour)
   * - IAM permissions (Lambda: lambda:InvokeFunction, AgentCore: bedrock-agentcore:InvokeAgentRuntime)
   *
   * **Backward Compatibility:**
   * If not specified, defaults to Lambda runtime to maintain backward compatibility
   * with existing code. All existing agents continue to work without modification.
   *
   * @default AgentRuntimeType.LAMBDA
   */
  readonly type: AgentRuntimeType;

  /**
   * Runtime-specific configuration options
   *
   * Provides configuration settings specific to the selected runtime type:
   *
   * **For Lambda (LambdaRuntimeConfig):**
   * - timeout: Maximum execution time (up to 15 minutes)
   * - memorySize: Memory allocation (128 MB to 10,240 MB)
   * - architecture: CPU architecture (X86_64 or ARM_64)
   * - ephemeralStorageSize: /tmp storage size (512 MB to 10,240 MB)
   *
   * **For AgentCore (AgentCoreRuntimeConfig):**
   * - timeout: Maximum execution time (up to 8 hours)
   * - memorySize: Memory allocation (check AWS docs for limits)
   * - deploymentMethod: CONTAINER or DIRECT_CODE
   * - imageUri: ECR image URI (for CONTAINER deployment)
   * - codeBucket/codeKey: S3 location (for DIRECT_CODE deployment)
   *
   * **Type Safety:**
   * TypeScript will enforce that the config matches the runtime type, but
   * runtime validation is also performed to catch configuration errors early.
   *
   * **Default Behavior:**
   * If not specified, each runtime uses sensible defaults:
   * - Lambda: 10 min timeout, 1024 MB memory, X86_64 architecture
   * - AgentCore: 10 min timeout, 1024 MB memory, CONTAINER deployment
   *
   * @default Sensible defaults based on runtime type
   */
  readonly config?: LambdaRuntimeConfig | AgentCoreRuntimeConfig;
}

