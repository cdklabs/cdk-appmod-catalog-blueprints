# Decisions: Requirements - AgentCore Observability Integration

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Feature Scope

### Integration Level

**Question:** At what level should AgentCore observability be integrated?

**Context:** AgentCore observability provides comprehensive monitoring for Bedrock agents including invocation metrics, trace data, and performance insights. The integration needs to work seamlessly with the existing observability infrastructure.

**Options:**
1. **Base-agent level only (Kiro Recommended)**: Integrate at BaseAgent class, automatically inherited by all agent types (BatchAgent, future StreamingAgent, etc.)
   - **Rationale**: Follows the repository's OOP pattern where cross-cutting concerns are handled in base classes
   - **Benefits**: Single implementation, consistent behavior across all agent types, minimal code duplication
   - **Tradeoffs**: All agents get the feature (but it's opt-in via `enableObservability` flag)

2. Individual agent level: Implement separately in BatchAgent, StreamingAgent, etc.
   - **Rationale**: Allows per-agent-type customization
   - **Benefits**: Maximum flexibility for different agent types
   - **Tradeoffs**: Code duplication, inconsistent behavior, harder to maintain

3. Separate observability construct: Create a new construct that wraps agents
   - **Rationale**: Separation of concerns
   - **Benefits**: Can be applied to any agent
   - **Tradeoffs**: More complex usage, breaks existing patterns, additional construct to maintain

**Answer:** 
1
---

## Configuration Strategy

### Activation Mechanism

**Question:** How should AgentCore observability be activated?

**Context:** The BaseAgent already has an `enableObservability` flag that controls Lambda Powertools integration. We need to decide if AgentCore observability should use the same flag or have its own control.

**Options:**
1. **Use existing `enableObservability` flag (Kiro Recommended)**: When `enableObservability: true`, enable both Lambda Powertools AND AgentCore observability
   - **Rationale**: Unified observability experience, simpler API, follows principle of least surprise
   - **Benefits**: Single flag for all observability features, consistent with existing patterns
   - **Tradeoffs**: Can't enable one without the other (but this is rarely needed)

2. Separate flag: Add new `enableAgentCoreObservability` flag
   - **Rationale**: Granular control over observability features
   - **Benefits**: Can enable Lambda Powertools without AgentCore or vice versa
   - **Tradeoffs**: More complex API, two flags to manage, potential confusion

3. Always enabled: AgentCore observability always on when using Bedrock agents
   - **Rationale**: Observability should be default for production systems
   - **Benefits**: No configuration needed, always have visibility
   - **Tradeoffs**: No opt-out for cost-sensitive scenarios, breaks backward compatibility

**Answer:** 
1
---

## IAM Permissions

### Permission Scope

**Question:** What IAM permissions should be granted for AgentCore observability?

**Context:** AgentCore observability requires specific IAM permissions to publish metrics and traces. According to AWS documentation, agents need permissions for `bedrock:InvokeAgent` and related observability APIs.

**Options:**
1. **Minimal required permissions (Kiro Recommended)**: Grant only the specific permissions documented by AWS for AgentCore observability
   - **Rationale**: Follows least-privilege security principle
   - **Benefits**: Minimal security surface, complies with security best practices
   - **Tradeoffs**: May need updates if AWS adds new observability features
   - **Permissions needed**: Based on AWS docs, likely includes CloudWatch metrics/logs permissions

2. Broad observability permissions: Grant wide permissions for all observability services
   - **Rationale**: Future-proof against new observability features
   - **Benefits**: Won't break if AWS adds new features
   - **Tradeoffs**: Violates least-privilege principle, may fail CDK Nag tests

3. User-configurable permissions: Let users specify additional permissions via props
   - **Rationale**: Maximum flexibility
   - **Benefits**: Users can add permissions as needed
   - **Tradeoffs**: More complex API, users need to know what permissions are required

**Answer:** 
1
---

## Environment Variables

### Configuration Approach

**Question:** How should AgentCore observability configuration be passed to the Lambda function?

**Context:** AgentCore observability needs configuration like service name, namespace, and potentially trace sampling rates. The BaseAgent already uses environment variables for agent configuration.

**Options:**
1. **Environment variables (Kiro Recommended)**: Use Lambda environment variables to pass AgentCore observability config
   - **Rationale**: Consistent with existing agent configuration pattern, standard Lambda practice
   - **Benefits**: Simple, well-understood, easy to debug, works with existing encryption
   - **Tradeoffs**: Environment variables are visible in console (but not sensitive data)

2. Systems Manager Parameter Store: Store config in Parameter Store
   - **Rationale**: Centralized configuration management
   - **Benefits**: Can update without redeployment
   - **Tradeoffs**: Additional AWS service dependency, latency on cold starts, more complex

3. Hardcoded in Lambda: Embed configuration in Lambda code
   - **Rationale**: No runtime dependencies
   - **Benefits**: Fastest, no external dependencies
   - **Tradeoffs**: Requires redeployment to change, not flexible

**Answer:** 
1
---

## Observability Metrics

### Metric Configuration

**Question:** Should users be able to customize which AgentCore metrics are collected?

**Context:** AgentCore observability can collect various metrics (invocation count, latency, errors, token usage, etc.). Different use cases may want different metrics.

**Options:**
1. **Use AWS defaults (Kiro Recommended)**: Collect all standard AgentCore metrics as defined by AWS
   - **Rationale**: Comprehensive visibility, follows AWS best practices, simple configuration
   - **Benefits**: No configuration needed, complete observability, consistent across deployments
   - **Tradeoffs**: May collect more data than needed (but cost is typically low)

2. Configurable metrics: Allow users to specify which metrics to collect
   - **Rationale**: Cost optimization for high-volume scenarios
   - **Benefits**: Can reduce CloudWatch costs by collecting only needed metrics
   - **Tradeoffs**: Complex API, users need to know which metrics they need, easy to miss important metrics

3. Tiered approach: Offer "basic" and "comprehensive" metric sets
   - **Rationale**: Balance between simplicity and flexibility
   - **Benefits**: Simple choice for users, covers common scenarios
   - **Tradeoffs**: Still requires users to make a choice, may not fit all use cases

**Answer:** 
1
---

## Integration with Existing Observability

### Coordination Strategy

**Question:** How should AgentCore observability coordinate with existing Lambda Powertools observability?

**Context:** The BaseAgent already integrates Lambda Powertools for structured logging, metrics, and tracing. AgentCore observability adds agent-specific metrics and traces. We need to ensure they work together harmoniously.

**Options:**
1. **Complementary integration (Kiro Recommended)**: Both systems run independently, each providing their own insights
   - **Rationale**: Each system has different focus - Lambda Powertools for function-level, AgentCore for agent-level
   - **Benefits**: Complete visibility at both levels, no conflicts, leverages strengths of each
   - **Tradeoffs**: Two observability systems to monitor (but they complement each other)

2. Unified namespace: Force both to use same CloudWatch namespace
   - **Rationale**: Single place to view all metrics
   - **Benefits**: Simplified monitoring dashboard
   - **Tradeoffs**: May cause metric name conflicts, loses separation of concerns

3. AgentCore only: Disable Lambda Powertools when AgentCore is enabled
   - **Rationale**: Avoid duplication
   - **Benefits**: Single observability system
   - **Tradeoffs**: Loses function-level insights, breaks existing functionality

**Answer:** 
1
---

## Backward Compatibility

### Compatibility Strategy

**Question:** How should this feature maintain backward compatibility with existing agent deployments?

**Context:** Existing users have agents deployed with `enableObservability: false` or `enableObservability: true` (Lambda Powertools only). We need to ensure the new feature doesn't break existing deployments.

**Options:**
1. **Opt-in via existing flag (Kiro Recommended)**: AgentCore observability only activates when `enableObservability: true`
   - **Rationale**: No breaking changes, users explicitly opt into observability features
   - **Benefits**: Fully backward compatible, no surprises, follows existing pattern
   - **Tradeoffs**: Users with `enableObservability: false` won't get AgentCore observability (but that's expected)

2. Automatic upgrade: Enable AgentCore observability for all agents automatically
   - **Rationale**: Give everyone better observability
   - **Benefits**: All users benefit immediately
   - **Tradeoffs**: Breaking change, may increase costs, violates principle of least surprise

3. Separate migration path: Require users to explicitly enable new feature
   - **Rationale**: Explicit opt-in for new functionality
   - **Benefits**: Users consciously choose to adopt
   - **Tradeoffs**: More complex migration, requires documentation updates, slower adoption

**Answer:** 
1
---

## Testing Requirements

### Testing Scope

**Question:** What level of testing should be implemented for AgentCore observability integration?

**Context:** The repository uses unit tests, CDK Nag tests, and integration tests. AgentCore observability is a cross-cutting concern that affects IAM permissions, environment variables, and runtime behavior.

**Options:**
1. **Unit + CDK Nag tests (Kiro Recommended)**: Test resource creation, IAM permissions, environment variables, and security compliance
   - **Rationale**: Standard testing approach for constructs, covers infrastructure concerns
   - **Benefits**: Fast, reliable, catches configuration issues, ensures security compliance
   - **Tradeoffs**: Doesn't test actual AgentCore observability functionality (but that's AWS's responsibility)

2. Full integration tests: Deploy actual agents and verify observability data in CloudWatch
   - **Rationale**: End-to-end validation
   - **Benefits**: Proves the feature works in real AWS environment
   - **Tradeoffs**: Slow, expensive, brittle, requires AWS account, hard to maintain

3. Minimal testing: Only test that environment variables are set
   - **Rationale**: Trust AWS implementation
   - **Benefits**: Fast, simple
   - **Tradeoffs**: May miss IAM permission issues, doesn't verify security compliance

**Answer:** 
1
---

## Documentation Requirements

### Documentation Scope

**Question:** What documentation should be created for this feature?

**Context:** The repository has JSDoc comments, README files, and example applications. Users need to understand how to enable and use AgentCore observability.

**Options:**
1. **JSDoc + README updates (Kiro Recommended)**: Update BaseAgent JSDoc, add section to agents README, update existing examples
   - **Rationale**: Standard documentation approach for construct features
   - **Benefits**: Documentation lives with code, easy to maintain, users find it naturally
   - **Tradeoffs**: No standalone guide (but feature is simple enough)

2. Comprehensive guide: Create dedicated observability guide with architecture diagrams
   - **Rationale**: Complex feature deserves detailed documentation
   - **Benefits**: Complete reference, helps users understand observability strategy
   - **Tradeoffs**: More work to create and maintain, may be overkill for simple feature

3. Minimal documentation: Only update JSDoc comments
   - **Rationale**: Feature is self-explanatory
   - **Benefits**: Low effort
   - **Tradeoffs**: Users may not discover feature, no usage examples

**Answer:** 
1
---

## Summary

Once you've filled in your answers above, I'll use your decisions to create the requirements document. The requirements will specify:

- **What** AgentCore observability integration provides
- **Where** it integrates (BaseAgent class)
- **How** it's activated (via enableObservability flag)
- **What** IAM permissions are needed
- **How** configuration is passed to Lambda
- **What** metrics are collected
- **How** it coordinates with existing observability
- **How** backward compatibility is maintained
- **What** testing is required
- **What** documentation is needed

Please review each decision point and provide your answers. Let me know when you're ready to proceed!
