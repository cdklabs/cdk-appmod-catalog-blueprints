# Decisions: Design - Agent Knowledge Base Integration

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

**Reference:** This design builds on the approved requirements in `requirements.md`.

---

## OOP Architecture

### Interface Design

**Question:** How should the `IKnowledgeBase` interface be structured?

**Options:**
1. Minimal interface (Kiro Recommended): Core methods only - `retrieve()`, `generateIamPermissions()`, `getConfiguration()`
2. Rich interface: Include lifecycle methods, validation, health checks
3. Composite interface: Multiple small interfaces (IRetrievable, IConfigurable, IPermissionProvider)
4. Other (please specify): _______________________

**Kiro Rationale:** A minimal interface keeps implementations simple while providing the essential contract. Additional capabilities can be added via optional methods or separate interfaces.

**Answer:** Option 1 - Minimal interface
Go with 1, we'll expand if needed
---

### Abstract Base Class

**Question:** What common functionality should `BaseKnowledgeBase` provide?

**Options:**
1. Configuration management only: Store and validate props, generate config JSON
2. Standard functionality (Kiro Recommended): Config management + default IAM generation + retrieval tool template
3. Full implementation: Everything except the actual retrieval call
4. Other (please specify): _______________________

**Kiro Rationale:** Standard functionality reduces boilerplate in concrete implementations while leaving retrieval logic to subclasses.

**Answer:** Option 2 - Standard functionality
Go with 2
---

### Inheritance vs Composition

**Question:** How should knowledge bases integrate with the agent framework?

**Options:**
1. Composition (Kiro Recommended): Agents accept `IKnowledgeBase[]` via props, no inheritance changes
2. Inheritance: Create `KnowledgeBaseAgent` extending `BatchAgent`
3. Mixin pattern: Add KB capabilities via mixin to existing agents
4. Other (please specify): _______________________

**Kiro Rationale:** Composition follows the existing pattern for tools and adapters, maintaining consistency and flexibility.

**Answer:** Option 1 - Composition
Go with 1
---

## Retrieval Tool Architecture

### Tool Implementation Location

**Question:** Where should the retrieval tool Python code live?

**Options:**
1. Framework resources (Kiro Recommended): `use-cases/framework/agents/resources/knowledge-base-tool/`
2. Per-implementation: Each `IKnowledgeBase` implementation provides its own tool
3. Generated at synth time: Dynamically generate tool code based on configuration
4. Other (please specify): _______________________

**Kiro Rationale:** A framework-level tool with configuration-driven behavior keeps the codebase clean and allows runtime customization.

**Answer:** Option 1 - Framework resources
Go with 1
---

### Tool Configuration Passing

**Question:** How should KB configuration be passed to the retrieval tool at runtime?

**Options:**
1. Environment variable (Kiro Recommended): JSON config in `KNOWLEDGE_BASES_CONFIG` env var
2. S3 asset: Configuration file uploaded to S3, path in env var
3. Lambda layer: Configuration bundled in a layer
4. Other (please specify): _______________________

**Kiro Rationale:** Environment variable is simple, encrypted by KMS, and follows the existing pattern for tools config.

**Answer:** Option 1 - Environment variable
Go with 1
---

## ACL Implementation

### ACL Filter Mechanism

**Question:** How should ACL filtering be implemented?

**Options:**
1. Metadata filter injection (Kiro Recommended): Add ACL filter to retrieval query at runtime
2. Pre-filter: Filter results after retrieval based on user context
3. Separate ACL service: External service validates access
4. Other (please specify): _______________________

**Kiro Rationale:** Metadata filter injection is efficient (filters at query time) and uses native Bedrock KB capabilities.

**Answer:** Option 1 - Metadata filter injection
Go with 1
---

### User Context Passing

**Question:** How should user identity context be passed to the retrieval tool?

**Options:**
1. Event payload (Kiro Recommended): Include `userContext` in the agent invocation event
2. Environment variable: Set user context as env var per invocation
3. Lambda context: Use Lambda authorizer context
4. Other (please specify): _______________________

**Kiro Rationale:** Event payload is flexible and allows per-request user context without Lambda reconfiguration.

**Answer:** Option 1 - Event payload
Go with 1
---

## Knowledge Base Creation

### S3 Vectors Integration

**Question:** How should S3 Vectors be configured when creating new knowledge bases?

**Options:**
1. Minimal defaults (Kiro Recommended): Auto-create S3 bucket with vectors enabled, sensible defaults
2. Full configuration: Expose all S3 Vectors parameters
3. Bring-your-own bucket: Require user to provide pre-configured S3 bucket
4. Other (please specify): _______________________

**Kiro Rationale:** Minimal defaults get users started quickly; advanced users can provide custom buckets.

**Answer:** Option 1 - Minimal defaults
Go with 1. 
---

### Embedding Model Selection

**Question:** Which embedding model should be the default for new knowledge bases?

**Options:**
1. Titan Embeddings V2 (Kiro Recommended): `amazon.titan-embed-text-v2:0` - good balance of quality and cost
2. Cohere Embed: Higher quality but higher cost
3. User must specify: No default, require explicit selection
4. Other (please specify): _______________________

**Kiro Rationale:** Titan Embeddings V2 is cost-effective, performant, and available in all Bedrock regions.

**Answer:** Option 1 - Titan Embeddings V2
Go with 1, but provide option for users to change
---

## Props Interface Design

### Configuration Structure

**Question:** How should the knowledge base props be structured?

**Options:**
1. Flat structure: All options at top level of `KnowledgeBaseProps`
2. Nested structure (Kiro Recommended): Group related options (retrieval, acl, creation)
3. Builder pattern: Fluent API for configuration
4. Other (please specify): _______________________

**Kiro Rationale:** Nested structure improves readability and allows optional groups to be omitted entirely.

**Answer:** Option 2 - Nested structure
Go with 2
---

## Correctness Properties Strategy

### Property-Based Testing

**Question:** Should the design document include formal correctness properties for property-based testing?

**Options:**
1. Skip correctness properties: Focus on architecture and implementation - faster generation
2. Essential properties only (Kiro Recommended): Include basic invariants and interface contract properties
3. Comprehensive properties: Full property-based testing approach with detailed prework analysis
4. Other (please specify): _______________________

**Kiro Rationale:** Essential properties ensure the interface contract is testable without excessive overhead.

**Answer:** Option 2 - Essential properties only
Go with 1
---

## Integration Points

### BaseAgent Modification

**Question:** How should `BaseAgent` be modified to support knowledge bases?

**Options:**
1. Minimal changes (Kiro Recommended): Add KB config to props, generate permissions, pass config to Lambda
2. Significant refactor: Extract common logic, add KB-specific methods
3. No changes to BaseAgent: Handle everything in BatchAgent
4. Other (please specify): _______________________

**Kiro Rationale:** Minimal changes to BaseAgent keeps the change scope small and maintains stability.

**Answer:** Option 1 - Minimal changes
1
---

### System Prompt Modification

**Question:** How should the system prompt be modified to include KB information?

**Options:**
1. Append section (Kiro Recommended): Add a "Knowledge Bases" section at the end of user prompt
2. Prepend section: Add KB info before user prompt
3. Template markers: Replace `{{KNOWLEDGE_BASES}}` placeholder if present
4. Other (please specify): _______________________

**Kiro Rationale:** Appending preserves user prompt structure and clearly separates framework-added content.

**Answer:** Option 1 - Append section
1
---

## Summary

Once you've filled in your decisions above, confirm you're ready to proceed and I'll generate the design document based on your choices.

**Ready to proceed?** (yes/no): Yes - All Kiro recommendations accepted
yes