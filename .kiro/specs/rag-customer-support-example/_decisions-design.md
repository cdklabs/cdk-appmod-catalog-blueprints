# Decisions: Design - RAG Customer Support Example

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Architecture Decisions

### Stack Organization

**Question:** How should the CDK stack be organized?

**Options:**
1. Single stack (Kiro Recommended): All resources (KB, data source, agent) in one stack - simpler for an example
2. Nested stacks: Separate KB stack and agent stack - more modular but complex
3. Multiple independent stacks: KB and agent as separate deployable stacks

**Answer:** 
1
---

### Knowledge Base Creation Approach

**Question:** How should the Bedrock Knowledge Base be created?

**Options:**
1. L1 constructs only (Kiro Recommended): Use CfnKnowledgeBase and CfnDataSource directly - full control, well-documented
2. Custom L2 construct: Create a reusable wrapper construct - overkill for example
3. Third-party construct: Use community constructs like @cdklabs/generative-ai-cdk-constructs

**Answer:** 
1
---

### Ingestion Trigger

**Question:** How should the initial KB ingestion be triggered after deployment?

**Options:**
1. Custom resource with SDK call (Kiro Recommended): Lambda-backed custom resource calls StartIngestionJob API
2. Manual step: Document that user must trigger sync manually after deploy
3. EventBridge rule: Trigger on stack completion event - more complex

**Answer:** 
1
---

## Sample Data Decisions

### Sample Documentation Content

**Question:** What fictional product should the sample documentation describe?

**Options:**
1. Cloud storage service (Kiro Recommended): "AcmeCloud Storage" - relatable, easy to write realistic docs
2. E-commerce platform: Online store with orders, products, shipping
3. SaaS project management tool: Tasks, projects, teams
4. Generic placeholder: Lorem ipsum style content

**Answer:** 
2
---

### Documentation Format

**Question:** What format should sample documents use?

**Options:**
1. Markdown files (Kiro Recommended): Simple, readable, good for KB ingestion
2. PDF files: More realistic but harder to maintain
3. HTML files: Web-like but unnecessary complexity
4. Mixed formats: Show KB handles multiple types

**Answer:** 
1
---

## Agent Configuration

### System Prompt Style

**Question:** How detailed should the customer support agent's system prompt be?

**Options:**
1. Focused and concise (Kiro Recommended): Clear role, KB usage instructions, response format - ~20 lines
2. Minimal: Just basic instructions - may produce inconsistent responses
3. Comprehensive: Detailed guidelines for every scenario - overkill for demo

**Answer:** 
1
---

### Response Format

**Question:** Should the agent return structured JSON or natural language?

**Options:**
1. Natural language (Kiro Recommended): More realistic for customer support use case
2. Structured JSON: Easier to parse but less natural
3. Hybrid: Natural response with optional metadata

**Answer:** 
1
---

## Observability Configuration

### Metric Namespace

**Question:** What metric namespace should be used?

**Options:**
1. "rag-customer-support" (Kiro Recommended): Descriptive, matches example name
2. "customer-support-agent": More generic
3. Configurable via context: Flexible but adds complexity

**Answer:** 
1
---

## Confirmation

Please review and fill in your decisions above, then confirm you're ready to proceed with the design document.
yes