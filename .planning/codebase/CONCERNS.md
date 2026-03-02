# Codebase Concerns

**Analysis Date:** 2026-03-01

## Tech Debt

**Alpha/Pre-Release Dependencies:**
- Issue: Using `@aws-cdk/aws-lambda-python-alpha` (2.218.0-alpha.0) and `@aws-cdk/integ-tests-alpha` as direct dependencies
- Files: `package.json`, `use-cases/utilities/data-loader.ts`, `use-cases/framework/agents/interactive-agent.ts`, `use-cases/document-processing/bedrock-document-processing.ts`
- Impact: Alpha packages may have breaking changes in future releases, risking production deployments. Blocking stability path to v1.0
- Fix approach: Monitor AWS CDK Python Lambda construct stabilization timeline, create migration plan when stable version available, pin "latest" references to specific versions

**Unpinned Version References:**
- Issue: `package.json` contains `"latest"` for `@aws-cdk/integ-runner` and `@aws-cdk/integ-tests-alpha`
- Files: `package.json` (lines 60-61)
- Impact: Unpredictable builds, potential test failures with new integrations framework versions, difficult reproducibility
- Fix approach: Replace "latest" with specific versions (e.g., "^2.218.0"), add lock file verification to CI pipeline

**Placeholder Implementation - Knowledge Base Creation:**
- Issue: `setupKnowledgeBaseCreation()` method is a stub/placeholder with no actual implementation
- Files: `use-cases/framework/agents/knowledge-base/bedrock-knowledge-base.ts` (lines 127-139)
- Impact: Users cannot create new Bedrock Knowledge Bases programmatically - only reference existing ones, limits construct usability
- Fix approach: Implement KB creation using `CfnKnowledgeBase` L1 construct, add IAM roles and data source configuration, provide working example in documentation

**Hardcoded Lambda Architecture:**
- Issue: Lambda architecture is hardcoded to X86_64 in batch-agent
- Files: `use-cases/framework/agents/batch-agent.ts` (line 130)
- Impact: No ARM/Graviton support despite AWS recommendations for cost optimization
- Fix approach: Add configurable `architecture` property to BatchAgentProps, default to X86_64 for backwards compatibility

**Incomplete Error Handling in Document Processing:**
- Issue: Several methods return empty objects/arrays as defaults without proper error context
- Files: `use-cases/document-processing/bedrock-document-processing.ts` (line 686 returns `{}`), `use-cases/document-processing/base-document-processing.ts` (line 290 returns `[]`, line 324 returns `{}`)
- Impact: Silent failures in preprocessing and postprocessing workflows, difficult to debug production issues
- Fix approach: Replace empty returns with either throwing descriptive errors or returning error information for workflow handling

## Known Bugs

**Lambda Runtime Mismatch Risk:**
- Symptoms: Document processing workflows may fail if Python Lambda runtime version doesn't match expected handler signature
- Files: `use-cases/document-processing/bedrock-document-processing.ts` (PythonFunction configuration), `use-cases/utilities/data-loader.ts`
- Trigger: PythonFunction constructs rely on build-time Docker image discovery; Docker not available or custom runtime paths
- Workaround: Explicitly specify Python runtime version and pre-built layer paths

## Security Considerations

**Type Safety Gaps - 'any' Type Usage:**
- Risk: Multiple test files use `(lambda: any)` type casting, bypassing TypeScript type checking for Lambda discovery logic
- Files: `use-cases/document-processing/tests/bedrock-document-processing.test.ts` (lines 421, 433, 447, 540, 585, 984)
- Current mitigation: Test-only usage, not in production code
- Recommendations: Use proper Lambda type interfaces, create helper function for type-safe Lambda discovery

**ESLint Disable Comments in Production Code:**
- Risk: `use-cases/utilities/data-loader.ts` contains `eslint-disable-next-line @typescript-eslint/no-require-imports` (lines 354, 356)
- Impact: Dynamic requires could load untrusted code if file paths are user-controlled
- Current mitigation: Path is hardcoded to internal resources
- Recommendations: Use explicit imports instead of dynamic requires, document why exceptions are needed

**Missing Input Validation in Construct Props:**
- Risk: Many constructs accept string IDs/ARNs without comprehensive validation
- Files: `use-cases/framework/agents/knowledge-base/bedrock-knowledge-base.ts` (validateBedrockProps only checks for empty string), `use-cases/utilities/data-loader.ts`
- Current mitigation: Basic existence checks present
- Recommendations: Add regex validation for ARN format, validate knowledge base ID format, validate S3 bucket names, add property validation tests

**Session Storage Without Explicit Access Logging Suppression:**
- Risk: Session storage buckets in InteractiveAgent skip access logging
- Files: `use-cases/framework/tests/interactive-agent-nag.test.ts` (lines 88-99)
- Current mitigation: Documented reason in CDK Nag suppressions ("temporary session data")
- Recommendations: Implement option to enable access logging for sensitive deployments, add warning in documentation about compliance implications

## Performance Bottlenecks

**Chunked Document Processing - Synchronous Sequential Default:**
- Problem: Large documents with many chunks (100+ pages) processing sequentially by default
- Files: `use-cases/document-processing/bedrock-document-processing.ts` (lines 753-755, Map state concurrency logic)
- Cause: Default `maxConcurrency` is 10, but can be explicitly set to 1 for sequential mode
- Improvement path: Benchmark concurrent vs sequential processing times, provide sizing guidance in documentation, consider adaptive concurrency based on chunk count

**Test Execution Time:**
- Problem: Document processing tests (1242 lines in test file) likely have slow execution due to CloudFormation template synthesis
- Files: `use-cases/document-processing/tests/bedrock-document-processing.test.ts`
- Cause: Comprehensive test coverage with many synthesis checks adds overhead
- Improvement path: Split tests into unit/synthesis categories, enable selective test execution, consider snapshot-based template testing

**No Caching in Data Loader Lambda:**
- Problem: DataLoader Lambda re-parses SQL files and re-establishes connections for each execution
- Files: `use-cases/utilities/data-loader.ts`
- Cause: Timeout defaults to 15 minutes but no connection pooling configuration
- Improvement path: Implement Lambda connection pool layer, add connection reuse across handler invocations

## Fragile Areas

**BedrockDocumentProcessing - Large Monolithic Class:**
- Files: `use-cases/document-processing/bedrock-document-processing.ts` (1160 lines)
- Why fragile: Multiple responsibilities (chunking, classification, extraction, aggregation) in single file; high method count makes refactoring risky
- Safe modification: Use extract-method refactoring for step creation functions, add corresponding unit tests for each step type
- Test coverage: Heavy reliance on template matching; changes to Step Functions syntax break many tests simultaneously

**Interactive Agent - Complex State Machine Construction:**
- Files: `use-cases/framework/agents/interactive-agent.ts` (1098 lines)
- Why fragile: Cognito setup, API Gateway configuration, Lambda integration tightly coupled; multiple optional paths (with/without streaming, auth types)
- Safe modification: Add integration tests for auth bypass scenarios, test all communication adapter implementations before enabling
- Test coverage: UI/integration aspects not tested, only CloudFormation synthesis checked

**Knowledge Base Props - Complex Configuration Object:**
- Files: `use-cases/framework/agents/knowledge-base/knowledge-base-props.ts` (374 lines)
- Why fragile: Deep nesting of optional configs (VectorStoreConfiguration, GuardrailConfiguration, ChunkingConfig) with interdependencies
- Safe modification: Add property-level validation, create builder pattern for complex nested objects, add JSON schema validation
- Test coverage: No validation tests for impossible configuration combinations

**Chunking Strategy Selection Logic:**
- Files: `use-cases/document-processing/chunking-config.ts`
- Why fragile: Three chunking strategies (fixed-pages, token-based, hybrid) with non-obvious threshold interactions
- Safe modification: Add detailed decision trees in tests for edge cases (e.g., very large single page, 0-token document estimate)
- Test coverage: No tests for boundary conditions between strategies

## Scaling Limits

**DynamoDB Document Processing Table - No GSI Strategy:**
- Current capacity: On-demand billing (auto-scales)
- Limit: Query patterns show single DocumentId partition key - all queries hit same partition; no secondary indexes for filtering by status/date
- Scaling path: Add GSI on `ProcessingStatus` and `CreatedDate` for operational queries, document recommended capacity modes for high-volume scenarios (>1000 docs/min)

**S3 Chunk Storage - Cleanup Risk at Scale:**
- Current capacity: Unlimited chunks per document
- Limit: Cleanup Lambda must list and delete all chunk files after processing; ListObject calls hit S3 limits (1000 results per call)
- Scaling path: Implement paginated cleanup with prefix-based batch deletion, consider S3 Object Lambda for automatic expiration

**Step Functions Execution History:**
- Current capacity: All workflows stored indefinitely
- Limit: Execution history grows unbounded; list-executions API paginated at 1000 items
- Scaling path: Document recommendation to enable execution history retention policies, implement automated archival to DynamoDB or Athena

**Lambda Concurrency - Bedrock Throttling Risk:**
- Current capacity: Up to 10 concurrent chunk processing
- Limit: Bedrock API has lower concurrency limits (depends on account tier)
- Scaling path: Add configurable concurrency throttling in chunking config, implement exponential backoff for 429 responses, publish accounting guidance

## Dependencies at Risk

**CDK Lambda Python Alpha Construct:**
- Risk: Alpha construct may stabilize or have breaking changes; currently pinned to 2.218.0-alpha.0
- Impact: Document processing workflows (bedrock-document-processing.ts, data-loader.ts) rely on PythonFunction - upgrade blocking
- Migration plan: Track AWS CDK release notes, create integration test comparing old/new Python Lambda construct behavior, test with latest version in pre-release pipeline before major CDK upgrade

**Integ Tests Alpha Package:**
- Risk: Integration test framework in alpha may change API
- Impact: CI pipeline and example validations depend on integ-tests-alpha - test infrastructure could break
- Migration plan: Pin to specific version, document expected behavior, consider wrapper library for smoother future upgrades

## Missing Critical Features

**Runtime Validation for Knowledge Base:**
- Problem: `BedrockKnowledgeBase` only validates during construction; doesn't check if KB actually exists in Bedrock at deploy time
- Blocks: Cannot detect typos in knowledge base IDs until agent invocation fails at runtime
- Recommendations: Add optional pre-deployment validation using Bedrock DescribeKnowledgeBase API call

**No Configuration Drift Detection:**
- Problem: Document processing constructs create resources but don't record expected configuration baseline
- Blocks: Difficult to detect out-of-band changes via console (e.g., manual Lambda timeout adjustment, DynamoDB scaling changes)
- Recommendations: Implement configuration checkpoint exports, add CDK Nag rule for drift-prone resources

**Missing Observability for Chunk Aggregation:**
- Problem: Aggregation Lambda results merged into DynamoDB but no metrics on aggregation success rate or schema mismatches
- Blocks: Cannot track data quality issues in multi-chunk document processing
- Recommendations: Add CloudWatch metrics for aggregation completeness, store aggregation errors in separate DynamoDB table

## Test Coverage Gaps

**Knowledge Base Creation Path - Untested:**
- What's not tested: The `create` configuration path in BedrockKnowledgeBase (placeholder code)
- Files: `use-cases/framework/agents/knowledge-base/bedrock-knowledge-base.ts` (lines 112-114, 127-139)
- Risk: Future developers implementing KB creation cannot validate against test expectations
- Priority: HIGH - blocks implementation completion

**Error Handling Paths in Chunking:**
- What's not tested: PDF analysis failures (corrupted PDFs, missing pages), token estimation failures, chunk cleanup failures
- Files: `use-cases/document-processing/bedrock-document-processing.ts`
- Risk: Production workflows fail silently without diagnostic information
- Priority: HIGH - chunking enabled by default for large documents

**Data Loader - Cross-Database Engine Testing:**
- What's not tested: MySQL <-> PostgreSQL migration scenarios, mixed dump formats, partial failure recovery
- Files: `use-cases/utilities/data-loader.ts`
- Risk: Data loss risk if file processing order assumptions violated
- Priority: MEDIUM - most users use single engine, but enterprise migrations require validation

**Interactive Agent - All Communication Adapter Implementations:**
- What's not tested: Custom communication adapters beyond StreamingHttpAdapter, failover scenarios, connection pooling under load
- Files: `use-cases/framework/agents/interactive-agent.ts`
- Risk: Users implementing custom adapters have no test template, integration failures at deploy time
- Priority: MEDIUM - extensibility feature for power users

**Observability Property Injectors - Comprehensive Coverage:**
- What's not tested: Interaction of multiple injectors (Lambda + CloudFront both adding logging), conflict resolution, performance impact
- Files: `use-cases/utilities/observability/lambda-observability-property-injector.ts`, `use-cases/utilities/observability/cloudfront-distribution-observability-property-injector.ts`
- Risk: Enabling all observability features may cause unexpected logging duplication or permission errors
- Priority: MEDIUM - observability is optional feature

---

*Concerns audit: 2026-03-01*
