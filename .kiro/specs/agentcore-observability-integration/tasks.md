# Implementation Plan: AgentCore Observability Integration

## Overview

This implementation plan breaks down the integration of AWS Bedrock AgentCore observability into the BaseAgent construct. The work follows a construct development pattern with focus on backward compatibility, minimal code changes, and comprehensive testing.

**Key Approach:**
- Inline implementation following existing Lambda Powertools pattern
- Conditional logic based on existing `enableObservability` flag
- Automatic inheritance by all agent types (BatchAgent, future StreamingAgent)
- Comprehensive testing including unit tests and CDK Nag compliance

## Tasks

- [x] 1. Add AgentCore observability IAM permissions to BaseAgent
  - Modify `use-cases/framework/agents/base-agent.ts` constructor
  - Add IAM policy statement after PropertyInjectors setup (inline, 3-5 lines)
  - Grant CloudWatch Logs permissions: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
  - Grant X-Ray permissions: `xray:PutTraceSegments`, `xray:PutTelemetryRecords`
  - Use wildcard resource (`*`) as required by CloudWatch Logs and X-Ray
  - Add conditional logic: only grant permissions when `enableObservability: true`
  - Add CDK Nag suppression with justification if AwsSolutions-IAM5 is triggered
  - _Requirements: AC-2.1, AC-2.2, AC-2.3, AC-2.4, TR-2.1, TR-2.2, TR-2.3, TR-2.4_

- [ ]* 1.1 Write unit test for AgentCore IAM permissions when observability enabled
  - Test file: `use-cases/framework/agents/tests/base-agent.test.ts`
  - Verify IAM policy contains CloudWatch Logs and X-Ray permissions
  - Use CDK assertions to check policy statement structure
  - _Requirements: AC-7.2, TR-6.4_

- [ ]* 1.2 Write unit test for no AgentCore IAM permissions when observability disabled
  - Test file: `use-cases/framework/agents/tests/base-agent.test.ts`
  - Verify AgentCore-specific permissions are NOT present when `enableObservability: false`
  - Verify backward compatibility (no permissions when flag is undefined)
  - _Requirements: AC-7.4, TR-6.2, TR-6.6_

- [x] 2. Add AgentCore observability environment variables to BatchAgent
  - Modify `use-cases/framework/agents/batch-agent.ts` constructor
  - Add environment variables when creating Lambda function
  - Set `AGENT_OBSERVABILITY_ENABLED='true'` when `enableObservability: true`
  - Set `OTEL_RESOURCE_ATTRIBUTES` with service name and log group
  - Set `OTEL_EXPORTER_OTLP_LOGS_HEADERS` with agent identification
  - Set `AWS_LAMBDA_EXEC_WRAPPER='/opt/otel-instrument'` for ADOT wrapper
  - Use `undefined` for disabled state (cleaner than conditional spreading)
  - Encrypt environment variables using existing `encryptionKey` from BaseAgent
  - _Requirements: AC-3.1, AC-3.2, AC-3.3, AC-3.4, TR-3.1, TR-3.2, TR-3.3, TR-3.4, TR-3.5_

- [ ]* 2.1 Write unit test for AgentCore environment variables when observability enabled
  - Test file: `use-cases/framework/agents/tests/batch-agent.test.ts`
  - Verify all four environment variables are set correctly
  - Verify service name from `metricServiceName` is used in `OTEL_RESOURCE_ATTRIBUTES`
  - Verify agent name is used in `OTEL_EXPORTER_OTLP_LOGS_HEADERS`
  - Use CDK assertions with `Match.stringLikeRegexp` for pattern matching
  - _Requirements: AC-7.1, TR-6.3_

- [ ]* 2.2 Write unit test for no AgentCore environment variables when observability disabled
  - Test file: `use-cases/framework/agents/tests/batch-agent.test.ts`
  - Verify AgentCore environment variables are NOT set when `enableObservability: false`
  - Verify backward compatibility (no variables when flag is undefined)
  - _Requirements: AC-7.4, TR-6.2, TR-6.6_

- [x] 3. Add ADOT Lambda Layer to BatchAgent
  - Modify `use-cases/framework/agents/batch-agent.ts` constructor
  - Add ADOT Lambda Layer when `enableObservability: true`
  - Use region-specific ARN: `arn:aws:lambda:${Stack.of(this).region}:901920570463:layer:aws-otel-python-amd64-ver-1-26-0:1`
  - Add layer to existing `layers` array before creating Lambda function
  - Conditional logic: only add layer when observability is enabled
  - _Requirements: AC-1.1, TR-4.1, TR-4.2_

- [ ]* 3.1 Write unit test for ADOT Lambda Layer when observability enabled
  - Test file: `use-cases/framework/agents/tests/batch-agent.test.ts`
  - Verify Lambda function has ADOT layer attached
  - Use CDK assertions with `Match.arrayWith` and `Match.stringLikeRegexp`
  - Verify layer ARN pattern matches expected format
  - _Requirements: AC-7.1, TR-6.1_

- [ ]* 3.2 Write unit test for no ADOT Lambda Layer when observability disabled
  - Test file: `use-cases/framework/agents/tests/batch-agent.test.ts`
  - Verify ADOT layer is NOT attached when `enableObservability: false`
  - Verify backward compatibility (no layer when flag is undefined)
  - _Requirements: AC-7.4, TR-6.2, TR-6.6_

- [ ] 4. Checkpoint - Ensure all unit tests pass
  - Run `npm test -- --testPathPattern="agents"` to verify all agent tests pass
  - Verify no regressions in existing tests
  - Ensure all tests pass, ask the user if questions arise

- [ ]* 5. Add CDK Nag compliance tests
  - Test file: `use-cases/framework/agents/tests/base-agent-nag.test.ts` (create if needed)
  - Test that BaseAgent with `enableObservability: true` passes CDK Nag checks
  - Apply `AwsSolutionsChecks` to stack with agent
  - If AwsSolutions-IAM5 is triggered, verify suppression is documented
  - Ensure all other CDK Nag checks pass without suppressions
  - _Requirements: AC-2.4, AC-7.3, TR-2.3, TR-2.4, TR-6.5_

- [ ]* 5.1 Write backward compatibility test
  - Test file: `use-cases/framework/agents/tests/base-agent.test.ts`
  - Create agent with `enableObservability` undefined (not set)
  - Verify agent creates successfully without errors
  - Verify no AgentCore observability features are enabled
  - _Requirements: AC-6.1, AC-6.3, AC-7.5, TR-5.1, TR-5.2, TR-5.3, TR-5.4, TR-6.6_

- [x] 6. Update BaseAgent JSDoc documentation
  - File: `use-cases/framework/agents/base-agent.ts`
  - Update `enableObservability` prop JSDoc to mention both Lambda Powertools and AgentCore
  - Explain what each system provides (function-level vs agent-level observability)
  - Document environment variables set by AgentCore observability
  - Document IAM permissions granted by AgentCore observability
  - Document ADOT Lambda Layer requirement
  - Add class-level JSDoc note about observability integration
  - Include link to AWS documentation: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
  - _Requirements: AC-8.1, AC-8.2, TR-7.1, TR-7.2, TR-7.5, TR-7.6_

- [x] 7. Update agents README with AgentCore observability section
  - File: `use-cases/framework/agents/README.md`
  - Add new subsection "AgentCore Observability" to existing observability section
  - Explain what AgentCore observability is and what metrics it collects
  - Show how to enable (same flag as Lambda Powertools)
  - Document what gets configured automatically (environment variables, IAM permissions, ADOT layer)
  - Provide CloudWatch query examples for common metrics
  - Add comparison table: Lambda Powertools vs AgentCore Observability
  - Include example code showing observability enabled
  - Add best practices section
  - Add troubleshooting section
  - _Requirements: AC-8.3, AC-8.4, AC-8.5, TR-7.3, TR-7.4_

- [x] 8. Update or create example demonstrating AgentCore observability
  - Choose existing example to update (e.g., `examples/document-processing/fraud-detection`)
  - OR create minimal example if updating existing is too complex
  - Enable observability: `enableObservability: true`
  - Add README section explaining how to view AgentCore metrics in CloudWatch
  - Include sample CloudWatch Insights queries for agent metrics
  - Document expected metrics: invocations, latency, token usage, tool calls
  - Test deployment and verify metrics appear in CloudWatch
  - _Requirements: AC-8.4, AC-8.5, TR-7.4_

- [ ] 9. Final checkpoint - Comprehensive validation
  - Run full test suite: `npm test`
  - Run CDK Nag tests: `npm test:security`
  - Verify code coverage >80% for new code
  - Deploy example with observability enabled
  - Verify AgentCore metrics appear in CloudWatch
  - Verify X-Ray traces appear
  - Test backward compatibility: deploy existing example without changes
  - Verify no breaking changes to existing agents
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional test tasks that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Implementation follows inline pattern (no new methods or classes)
- Minimal code changes: ~20-25 lines total across BaseAgent and BatchAgent
- Backward compatible: existing agents work without modification
- Comprehensive testing ensures quality and security compliance
- Documentation provides clear guidance for users

## Testing Strategy

**Unit Tests:**
- Verify IAM permissions are added correctly when observability enabled
- Verify IAM permissions are NOT added when observability disabled
- Verify environment variables are set correctly when observability enabled
- Verify environment variables are NOT set when observability disabled
- Verify ADOT Lambda Layer is added when observability enabled
- Verify ADOT Lambda Layer is NOT added when observability disabled
- Verify backward compatibility (undefined flag works correctly)

**CDK Nag Tests:**
- Verify BaseAgent with AgentCore observability passes security checks
- Document any suppressions with clear justification (AwsSolutions-IAM5 expected)

**Integration Testing:**
- Deploy example with observability enabled
- Verify metrics appear in CloudWatch
- Verify traces appear in X-Ray
- Verify both Lambda Powertools and AgentCore observability work together

## Success Criteria

- ✅ All unit tests passing (including new tests for AgentCore observability)
- ✅ All CDK Nag tests passing (with documented suppressions if needed)
- ✅ Code coverage >80% for new code
- ✅ Documentation complete and accurate
- ✅ Example demonstrates AgentCore observability
- ✅ Backward compatibility maintained (existing agents work unchanged)
- ✅ Metrics visible in CloudWatch after deployment
- ✅ No breaking changes to public API
