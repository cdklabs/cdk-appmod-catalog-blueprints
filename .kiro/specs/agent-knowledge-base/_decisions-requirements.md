# Decisions: Requirements - Agent Knowledge Base Integration

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Work Type Confirmation

### Construct Feature Addition

**Question:** This is identified as a **feature addition** to the existing `BaseAgent` and `BatchAgent` constructs. Does this match your intent?

**Options:**
1. Yes, add knowledge base capabilities to existing agent constructs (Kiro Recommended)
2. No, create a new separate construct for knowledge base agents
3. No, create a new adapter/plugin pattern for knowledge bases
4. Other (please specify): _______________________

**Answer:** Option 1 - Add knowledge base capabilities to existing agent constructs
It would be a mixture of 1 and 3. The existing agent framework can integrate with different types of knowledge bases and they will be another "tool" for the agent to used. The knowledge base itself should be flexible allowing different types of data source to be ingested and different types of vector store to be supported. This means from an OOP perspective, the interface and abstract classes needs to be designed in a way that allows future implementation and enhancement. The other thing is the knowledgebase needs to be ACL aware. Meaning the metadata attached to vectors would have additional information that would allow filters to be applied if a user doesn't have access to that data. 

Example reference: https://www.singhspeak.com/blog/making-vector-search-identity-aware-in-rag-systems
---

## Knowledge Base Integration Approach

### Integration Type

**Question:** How should knowledge bases be integrated with the agent framework?

**Options:**
1. Amazon Bedrock Knowledge Bases (Kiro Recommended): Native AWS service with managed RAG, vector stores, and data sources
2. Custom OpenSearch integration: Direct OpenSearch Serverless vector search integration
3. Bring-your-own knowledge base: Accept any knowledge base ARN/configuration
4. Multiple options: Support both Bedrock KB and custom integrations
5. Other (please specify): _______________________

**Kiro Rationale:** Amazon Bedrock Knowledge Bases provides a fully managed RAG solution with automatic chunking, embedding, and retrieval. It integrates seamlessly with Bedrock models and reduces operational complexity.

**Answer:** Option 1 - Amazon Bedrock Knowledge Bases
The default would be Bedrock Knowledge Bases, but allow custom knowledge bases to be integrated. So the OOP design should be able to accommodate that with a default implementation of Bedrock Knowledge Bases.

ACLs should be built-in: https://aws.amazon.com/blogs/machine-learning/access-control-for-vector-stores-using-metadata-filtering-with-knowledge-bases-for-amazon-bedrock/

---

### Retrieval Method

**Question:** How should the agent retrieve information from the knowledge base?

**Options:**
1. Built-in retrieval tool (Kiro Recommended): Automatically add a `retrieve_from_knowledge_base` tool that agents can call
2. Pre-retrieval injection: Retrieve relevant context before agent invocation and inject into prompt
3. Hybrid approach: Support both tool-based and pre-retrieval methods
4. Manual integration: Let users define their own retrieval tools
5. Other (please specify): _______________________

**Kiro Rationale:** A built-in retrieval tool gives the agent control over when and what to retrieve, enabling more intelligent RAG patterns where the agent can refine queries based on initial results.

**Answer:** Option 1 - Built-in retrieval tool
Go with 1 (the recommended approach). The tool should integrate with the configured Knowledge Base to use. So there should be flexibility on the tool implementation and how it integrates with the configured Knowledge Base

---

## Feature Scope

### Required vs Optional

**Question:** Should knowledge base integration be required or optional for agents?

**Options:**
1. Optional feature (Kiro Recommended): Add `knowledgeBases` prop that can be omitted for agents that don't need RAG
2. Required feature: All agents must have at least one knowledge base
3. Separate construct: Create `KnowledgeBaseAgent` that extends `BatchAgent`
4. Other (please specify): _______________________

**Kiro Rationale:** Making it optional maintains backward compatibility and allows the same agent constructs to be used for both RAG and non-RAG use cases.

**Answer:** Option 1 - Optional feature
Go with 1 (Optional). If it's enabled via the prop then the agent would be provided the tools. If no Knowledge Base implementation is provided, then the default is the Bedrock Knowledge Base (with S3 Vectors as the default vector store (reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-bedrock-kb.html, S3 Vectors reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors.html).

---

### Multiple Knowledge Bases

**Question:** Should agents support multiple knowledge bases?

**Options:**
1. Single knowledge base only: Simpler implementation, one KB per agent
2. Multiple knowledge bases (Kiro Recommended): Array of KBs, agent can query any/all
3. Knowledge base groups: Named groups of KBs for different purposes
4. Other (please specify): _______________________

**Kiro Rationale:** Supporting multiple knowledge bases enables agents to access different data sources (e.g., product docs, company policies, customer data) and choose the appropriate source based on the query.

**Answer:** Option 2 - Multiple knowledge bases
Go for 2, but with clear definition on where the agent would go to for which type of information.

---

### Retrieval Configuration

**Question:** What retrieval parameters should be configurable?

**Options:**
1. Minimal configuration: Just KB ID, use defaults for everything else
2. Standard configuration (Kiro Recommended): KB ID, number of results, optional filters
3. Full configuration: All Bedrock KB retrieval parameters (search type, reranking, metadata filters, etc.)
4. Other (please specify): _______________________

**Kiro Rationale:** Standard configuration covers most use cases while keeping the API simple. Advanced users can extend if needed.

**Answer:** Option 2 - Standard configuration
2 but with configuration for ACL functionality (this can be turned on or off as well)

---

## IAM and Security

### Permission Model

**Question:** How should knowledge base permissions be handled?

**Options:**
1. Automatic permissions (Kiro Recommended): Construct automatically grants agent role access to specified KBs
2. Manual permissions: User must provide IAM statements for KB access
3. Hybrid: Auto-grant for provided KBs, allow additional manual statements
4. Other (please specify): _______________________

**Kiro Rationale:** Automatic permission granting follows the pattern used for tools and reduces configuration errors.

**Answer:** Option 1 - Automatic permissions
Go for 3
---

## Interaction with Existing Features

### Tool Interaction

**Question:** How should knowledge base retrieval interact with existing tools?

**Options:**
1. Separate from tools (Kiro Recommended): KB retrieval is a distinct capability, not mixed with user tools
2. As a special tool: KB retrieval appears as another tool in the tools array
3. Automatic tool generation: Generate retrieval tools from KB configuration
4. Other (please specify): _______________________

**Kiro Rationale:** Keeping KB retrieval separate from user tools provides clearer semantics and allows the framework to handle KB-specific optimizations.

**Answer:** Option 1 - Separate from tools
Go for 1
---

### System Prompt Integration

**Question:** Should the framework automatically modify system prompts to include KB instructions?

**Options:**
1. No modification: User must include KB usage instructions in their system prompt
2. Automatic append (Kiro Recommended): Framework appends KB tool descriptions to system prompt
3. Template injection: Provide placeholders in system prompt that get replaced with KB info
4. Other (please specify): _______________________

**Kiro Rationale:** Automatic append ensures the agent knows about available knowledge bases without requiring users to manually update prompts.

**Answer:** Option 2 - Automatic append
Go for 2
---

## Knowledge Base Creation

### KB Lifecycle

**Question:** Should the construct support creating knowledge bases, or only reference existing ones?

**Options:**
1. Reference only (Kiro Recommended): Accept existing KB ARNs/IDs, don't create KBs
2. Create and reference: Support both creating new KBs and referencing existing ones
3. Create only: Always create new KBs as part of the construct
4. Other (please specify): _______________________

**Kiro Rationale:** Knowledge bases have their own lifecycle (data sources, sync schedules, embeddings) that's typically managed separately. Referencing existing KBs keeps the agent construct focused.

**Answer:** Option 1 - Reference only
Go for 2
---

## Observability

### Retrieval Metrics

**Question:** What observability features should be included for KB retrieval?

**Options:**
1. Basic logging: Log retrieval calls and results count
2. Standard observability (Kiro Recommended): Logging + CloudWatch metrics for retrieval latency, result counts, errors
3. Full observability: Standard + X-Ray tracing for retrieval calls
4. Other (please specify): _______________________

**Kiro Rationale:** Standard observability aligns with the existing `enableObservability` pattern and provides actionable insights without excessive overhead.

**Answer:** Option 2 - Standard observability
Go for 2. Observability is gated like all other constructs. Log Group data protection capabilities apply where applicable
---

## Additional Considerations

### Guardrails Integration

**Question:** Should knowledge base retrieval support Bedrock Guardrails?

**Options:**
1. No guardrails support initially: Keep scope focused on core KB integration
2. Optional guardrails (Kiro Recommended): Allow specifying a guardrail ID for retrieval filtering
3. Required guardrails: Always require a guardrail for KB retrieval
4. Other (please specify): _______________________

**Kiro Rationale:** Optional guardrails support enables content filtering for sensitive use cases while keeping the default simple.

**Answer:** Option 2 - Optional guardrails
Go for 2
---

### Cross-Region Knowledge Bases

**Question:** Should the construct support knowledge bases in different regions?

**Options:**
1. Same region only (Kiro Recommended): KB must be in same region as agent
2. Cross-region support: Allow specifying KB region, handle cross-region calls
3. Other (please specify): _______________________

**Kiro Rationale:** Same-region keeps latency low and simplifies IAM. Cross-region can be added later if needed.

**Answer:** Option 1 - Same region only
Go for 1
---

## Summary

Once you've filled in your decisions above, confirm you're ready to proceed and I'll generate the requirements document based on your choices.

**Ready to proceed?** (yes/no): Yes - All Kiro recommendations accepted
Yes