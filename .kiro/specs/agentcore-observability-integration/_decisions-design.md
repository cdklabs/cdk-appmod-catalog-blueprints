# Decisions: Design - AgentCore Observability Integration

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Implementation Approach

### Integration Point in BaseAgent Constructor

**Question:** Where in the BaseAgent constructor should AgentCore observability be configured?

**Context:** The BaseAgent constructor follows a specific initialization order: encryption key → IAM role → tools → observability. We need to determine where AgentCore observability configuration fits in this sequence.

**Options:**
1. **After Lambda Powertools setup (Kiro Recommended)**: Add AgentCore observability configuration immediately after the existing PropertyInjectors setup
   - **Rationale**: Follows the pattern of "observability configured last" as seen in document processing constructs
   - **Benefits**: All resources created before observability, consistent with existing patterns, clear separation
   - **Tradeoffs**: None significant

2. Before Lambda Powertools setup: Add AgentCore configuration before PropertyInjectors
   - **Rationale**: AgentCore is agent-specific, Lambda Powertools is function-specific
   - **Benefits**: Logical ordering by specificity
   - **Tradeoffs**: Breaks existing pattern, may cause confusion

3. Separate method: Create a dedicated `setupAgentCoreObservability()` method
   - **Rationale**: Encapsulation of observability logic
   - **Benefits**: Clean separation, easier to test
   - **Tradeoffs**: Adds complexity, breaks inline pattern used for Lambda Powertools

**Answer:** 

---

## Environment Variables

### Environment Variable Names

**Question:** What environment variable names should be used for AgentCore observability configuration?

**Context:** Based on AWS documentation, AgentCore observability uses specific OTEL environment variables. We need to decide which ones to set and how to name them.

**Options:**
1. **AWS-documented OTEL variables (Kiro Recommended)**: Use exact variable names from AWS documentation
   - **Variables**: `AGENT_OBSERVABILITY_ENABLED`, `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_EXPORTER_OTLP_LOGS_HEADERS`
   - **Rationale**: Follows AWS best practices, ensures compatibility with AgentCore service
   - **Benefits**: Standard naming, works with AWS tooling, well-documented
   - **Tradeoffs**: Longer variable names, OTEL-specific naming

2. Custom simplified variables: Create our own simpler variable names
   - **Variables**: `AGENTCORE_OBSERVABILITY_ENABLED`, `AGENTCORE_SERVICE_NAME`, `AGENTCORE_NAMESPACE`
   - **Rationale**: Simpler, more intuitive naming
   - **Benefits**: Easier to understand, shorter names
   - **Tradeoffs**: May not work with AWS tooling, requires custom mapping logic

3. Minimal variables: Only set `AGENT_OBSERVABILITY_ENABLED=true`
   - **Rationale**: Let AWS handle defaults
   - **Benefits**: Simplest approach
   - **Tradeoffs**: Less control, may not integrate with existing ObservableProps

**Answer:** 

---

### Environment Variable Values

**Question:** How should environment variable values be constructed?

**Context:** The `OTEL_RESOURCE_ATTRIBUTES` and `OTEL_EXPORTER_OTLP_LOGS_HEADERS` variables require specific formatting with service name, log group, and namespace information.

**Options:**
1. **Use ObservableProps values (Kiro Recommended)**: Construct values from existing `metricServiceName` and `metricNamespace`
   - **Format**: `service.name=${metricServiceName},aws.log.group.names=/aws/lambda/${functionName}`
   - **Rationale**: Leverages existing configuration, ensures consistency with Lambda Powertools
   - **Benefits**: No new configuration needed, consistent naming across observability systems
   - **Tradeoffs**: Tied to Lambda function name for log group

2. Hardcoded values: Use fixed values for all agents
   - **Format**: `service.name=bedrock-agent,aws.log.group.names=/aws/bedrock-agentcore/agents`
   - **Rationale**: Simplicity
   - **Benefits**: No dynamic construction needed
   - **Tradeoffs**: Loses per-agent customization, doesn't integrate with existing props

3. New props: Add AgentCore-specific props for service name and namespace
   - **Format**: User provides `agentCoreServiceName` and `agentCoreNamespace`
   - **Rationale**: Maximum flexibility
   - **Benefits**: Complete control over AgentCore configuration
   - **Tradeoffs**: More complex API, breaks requirement of using existing props only

**Answer:** 

---

## IAM Permissions

### Permission Implementation Strategy

**Question:** How should IAM permissions for AgentCore observability be added to the agent role?

**Context:** AgentCore observability requires CloudWatch Logs and X-Ray permissions. The BaseAgent already creates an IAM role with Bedrock permissions.

**Options:**
1. **Conditional inline policy (Kiro Recommended)**: Add permissions as inline policy only when `enableObservability: true`
   - **Implementation**: Check `enableObservability` flag, add policy statement to role
   - **Rationale**: Follows least-privilege, only grants permissions when needed
   - **Benefits**: No unnecessary permissions, clear conditional logic, easy to test
   - **Tradeoffs**: Slightly more complex than always adding

2. Always add permissions: Add AgentCore permissions to role regardless of flag
   - **Implementation**: Always add policy statement in constructor
   - **Rationale**: Simpler code, permissions don't hurt if not used
   - **Benefits**: Simpler implementation
   - **Tradeoffs**: Violates least-privilege, grants unnecessary permissions

3. Separate role: Create a separate role for observability
   - **Implementation**: Create new role when `enableObservability: true`, attach to Lambda
   - **Rationale**: Complete separation of concerns
   - **Benefits**: Clear separation
   - **Tradeoffs**: More complex, multiple roles to manage, breaks existing pattern

**Answer:** 

---

### Required IAM Permissions

**Question:** What specific IAM permissions should be granted for AgentCore observability?

**Context:** Based on AWS documentation and CloudWatch/X-Ray requirements, we need to determine the exact permissions needed.

**Options:**
1. **CloudWatch Logs + X-Ray (Kiro Recommended)**: Grant permissions for logs and traces
   - **Permissions**: 
     - `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` (CloudWatch Logs)
     - `xray:PutTraceSegments`, `xray:PutTelemetryRecords` (X-Ray)
   - **Rationale**: Covers all AgentCore observability needs based on AWS docs
   - **Benefits**: Complete observability support, follows AWS documentation
   - **Tradeoffs**: Multiple permissions to manage

2. Minimal CloudWatch only: Only grant CloudWatch Logs permissions
   - **Permissions**: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
   - **Rationale**: Logs are most important
   - **Benefits**: Fewer permissions
   - **Tradeoffs**: No X-Ray tracing support, incomplete observability

3. Use managed policy: Attach AWS managed policy for observability
   - **Policy**: `CloudWatchAgentServerPolicy` or similar
   - **Rationale**: AWS maintains the policy
   - **Benefits**: No need to manage individual permissions
   - **Tradeoffs**: May grant more permissions than needed, CDK Nag may flag it

**Answer:** 

---

## Correctness Properties Strategy

### Property-Based Testing Approach

**Question:** Should the design document include formal correctness properties for property-based testing?

**Context:** This is a feature addition to an existing construct (BaseAgent). Property-based testing can verify universal properties about the integration.

**Options:**
1. **Skip correctness properties (Kiro Recommended)**: Focus on architecture and implementation - 60-80% faster generation
   - **Rationale**: Feature is straightforward infrastructure configuration, unit tests sufficient
   - **Benefits**: Faster spec creation, simpler design document, appropriate for infrastructure code
   - **Tradeoffs**: No formal correctness properties (but unit tests cover the behavior)

2. Essential properties only: Include basic invariants and resource creation properties - moderate generation time
   - **Rationale**: Some properties useful for infrastructure validation
   - **Benefits**: Formal verification of key behaviors
   - **Tradeoffs**: More complex design, longer to create

3. Comprehensive properties: Full property-based testing approach with detailed prework analysis - slower but thorough
   - **Rationale**: Maximum confidence in correctness
   - **Benefits**: Complete formal verification
   - **Tradeoffs**: Significant overhead for simple feature, may be overkill

**Answer:** 

---

## Code Organization

### Method Structure

**Question:** How should the AgentCore observability logic be organized in the BaseAgent class?

**Context:** The BaseAgent constructor is already substantial. We need to decide how to structure the new observability code.

**Options:**
1. **Inline in constructor (Kiro Recommended)**: Add AgentCore observability logic directly in constructor after existing observability setup
   - **Implementation**: 3-5 lines of code in constructor checking flag and setting environment variables
   - **Rationale**: Follows existing pattern for Lambda Powertools integration, keeps related code together
   - **Benefits**: Consistent with existing code, easy to understand, minimal changes
   - **Tradeoffs**: Constructor gets slightly longer (but still manageable)

2. Private helper method: Extract to `private setupAgentCoreObservability()` method
   - **Implementation**: Create method, call from constructor
   - **Rationale**: Encapsulation, easier to test
   - **Benefits**: Cleaner constructor, testable in isolation
   - **Tradeoffs**: Adds method, breaks inline pattern used for Lambda Powertools

3. Protected method: Create `protected configureAgentCoreObservability()` method
   - **Implementation**: Protected method that subclasses can override
   - **Rationale**: Extensibility for future customization
   - **Benefits**: Subclasses can customize
   - **Tradeoffs**: Unnecessary complexity, no current need for customization

**Answer:** 

---

## Integration with Subclasses

### BatchAgent Integration

**Question:** Does BatchAgent need any changes to support AgentCore observability?

**Context:** BatchAgent extends BaseAgent and creates the actual Lambda function. We need to determine if BatchAgent needs modifications.

**Options:**
1. **No changes needed (Kiro Recommended)**: BatchAgent automatically inherits AgentCore observability from BaseAgent
   - **Rationale**: Environment variables set in BaseAgent are automatically available to Lambda function created by BatchAgent
   - **Benefits**: Zero changes to BatchAgent, automatic inheritance, follows OOP principles
   - **Tradeoffs**: None

2. Explicit environment variable passing: BatchAgent explicitly passes environment variables to Lambda
   - **Rationale**: Make the connection explicit
   - **Benefits**: Clear data flow
   - **Tradeoffs**: Unnecessary code, breaks encapsulation, requires BatchAgent changes

3. BatchAgent override: BatchAgent overrides observability configuration
   - **Rationale**: Batch-specific observability
   - **Benefits**: Customization per agent type
   - **Tradeoffs**: Breaks inheritance, duplicates code, violates requirements

**Answer:** 
In addition to 1, we need to add the ADOT Lambda Layer as well (see: https://aws-otel.github.io/docs/getting-started/lambda/lambda-python)
---

## Testing Strategy

### Unit Test Structure

**Question:** How should unit tests be organized for AgentCore observability?

**Context:** BaseAgent already has unit tests. We need to add tests for the new observability feature.

**Options:**
1. **Add to existing test file (Kiro Recommended)**: Add new test cases to `use-cases/framework/agents/tests/base-agent.test.ts`
   - **Test cases**: 
     - Environment variables set when `enableObservability: true`
     - Environment variables not set when `enableObservability: false`
     - IAM permissions added when `enableObservability: true`
     - IAM permissions not added when `enableObservability: false`
   - **Rationale**: Keeps all BaseAgent tests together, follows existing structure
   - **Benefits**: Single test file, easy to find, consistent with repository pattern
   - **Tradeoffs**: Test file gets longer (but still manageable)

2. Separate test file: Create `base-agent-observability.test.ts`
   - **Rationale**: Separation of concerns
   - **Benefits**: Focused test file, easier to run observability tests in isolation
   - **Tradeoffs**: Fragments tests, breaks existing pattern

3. Minimal tests: Only test environment variables, skip IAM tests
   - **Rationale**: Trust CDK to handle IAM correctly
   - **Benefits**: Fewer tests to write
   - **Tradeoffs**: Incomplete coverage, may miss permission issues

**Answer:** 

---

## CDK Nag Compliance

### CDK Nag Suppression Strategy

**Question:** How should CDK Nag warnings/errors for AgentCore observability permissions be handled?

**Context:** CDK Nag may flag the new IAM permissions. We need a strategy for handling these warnings.

**Options:**
1. **Document and suppress if needed (Kiro Recommended)**: Add suppressions with clear justification if CDK Nag flags permissions
   - **Approach**: Run CDK Nag tests, add suppressions only for legitimate AgentCore permissions
   - **Rationale**: Some permissions may be flagged but are required for AgentCore observability
   - **Benefits**: Passes CDK Nag tests, documents why permissions are needed
   - **Tradeoffs**: Requires suppressions (but with good justification)

2. Avoid suppressions: Refactor permissions to pass CDK Nag without suppressions
   - **Approach**: Use most restrictive permissions possible
   - **Rationale**: No suppressions is ideal
   - **Benefits**: Clean CDK Nag results
   - **Tradeoffs**: May not be possible if AWS requires specific permissions

3. Skip CDK Nag: Don't run CDK Nag tests for this feature
   - **Rationale**: Observability permissions are safe
   - **Benefits**: No need to handle warnings
   - **Tradeoffs**: Violates repository standards, skips security validation

**Answer:** 

---

## Documentation Approach

### JSDoc Documentation

**Question:** What level of JSDoc documentation should be added for AgentCore observability?

**Context:** BaseAgent and BaseAgentProps already have JSDoc comments. We need to update them for the new feature.

**Options:**
1. **Update existing JSDoc (Kiro Recommended)**: Enhance `enableObservability` prop documentation to mention AgentCore
   - **Updates**:
     - Update `enableObservability` prop JSDoc to mention both Lambda Powertools and AgentCore
     - Add note about environment variables set for AgentCore
     - Add note about IAM permissions granted
   - **Rationale**: Minimal changes, information where users look for it
   - **Benefits**: Users discover feature naturally, no new props to document
   - **Tradeoffs**: Documentation in one place (but that's where it belongs)

2. Extensive JSDoc: Add detailed JSDoc for every aspect of AgentCore observability
   - **Updates**: Multiple JSDoc blocks explaining every detail
   - **Rationale**: Maximum documentation
   - **Benefits**: Very thorough
   - **Tradeoffs**: Verbose, may overwhelm users, unnecessary detail

3. Minimal JSDoc: Only mention AgentCore in passing
   - **Updates**: One-line mention in `enableObservability` JSDoc
   - **Rationale**: Keep it simple
   - **Benefits**: Minimal changes
   - **Tradeoffs**: Users may not understand what AgentCore observability provides

**Answer:** 

---

## README Documentation

### README Section Structure

**Question:** How should AgentCore observability be documented in the agents README?

**Context:** The `use-cases/framework/agents/README.md` already has an observability section. We need to add AgentCore information.

**Options:**
1. **Add subsection to existing observability section (Kiro Recommended)**: Create "AgentCore Observability" subsection under existing observability section
   - **Structure**:
     - Overview of AgentCore observability
     - What metrics are collected
     - How to enable (same flag as Lambda Powertools)
     - How to query metrics in CloudWatch
     - Example CloudWatch query
   - **Rationale**: Keeps all observability documentation together, logical organization
   - **Benefits**: Easy to find, comprehensive, follows existing structure
   - **Tradeoffs**: Observability section gets longer (but well-organized)

2. Separate section: Create new top-level "AgentCore Observability" section
   - **Rationale**: Give AgentCore observability prominence
   - **Benefits**: Highly visible
   - **Tradeoffs**: Fragments observability documentation, breaks logical grouping

3. Minimal documentation: Add one paragraph to existing observability section
   - **Rationale**: Keep README concise
   - **Benefits**: Minimal changes
   - **Tradeoffs**: Insufficient detail, users may not understand feature

**Answer:** 

---

## Summary

Once you've filled in your answers above, I'll use your decisions to create the design document. The design will specify:

- **Implementation approach**: Where and how to integrate AgentCore observability in BaseAgent
- **Environment variables**: Which variables to set and how to construct their values
- **IAM permissions**: What permissions to grant and how to add them
- **Code organization**: How to structure the observability logic
- **Testing strategy**: What tests to write and where to put them
- **CDK Nag compliance**: How to handle security validation
- **Documentation**: What to document and where

Please review each decision point and provide your answers. Let me know when you're ready to proceed!
