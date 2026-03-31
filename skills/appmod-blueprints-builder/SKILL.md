---
name: appmod-blueprints-builder
description: Build AWS CDK applications with AppMod Catalog Blueprints. ALWAYS use when the user mentions CDK, chatbots, AI agents, document processing, RAG, knowledge bases, Bedrock agents, interactive agents, batch agents, document classification, extraction pipelines, or wants to use @cdklabs/cdk-appmod-catalog-blueprints. Also trigger when user asks about serverless AI infrastructure on AWS.
---

## Why This Skill Exists

AppMod Catalog Blueprints provides pre-built CDK L3 constructs for AI workloads. The MCP server exposes tools that generate correct, up-to-date code — preventing hallucinated prop names and ensuring security defaults. Use the MCP tools instead of guessing construct APIs.

## MCP Server Setup

If `appmod-catalog-blueprints` MCP tools are unavailable, direct the user to the [MCP Server README](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/mcp-appmod-catalog-blueprints#mcp-client-configuration) for setup instructions (covers Claude Code, Kiro, and Codex).

## Workflow

### 1. Capture Intent

Before generating anything, understand what the user needs:

- **Problem**: What are they building? (chatbot, document processor, etc.)
- **UI**: Do they need a frontend?
- **RAG**: Do they need knowledge base / retrieval?
- **Scale**: Real-time (InteractiveAgent) or batch (BatchAgent)?
- **Integration**: VPC, EventBridge, existing resources?

Ask clarifying questions. Don't assume.

### 2. Discover Available Constructs

Use the catalog resource to show options:

```
ReadMcpResourceTool(server: "appmod-catalog-blueprints", uri: "constructs://catalog")
```

For construct details (props, defaults, descriptions):

```
ReadMcpResourceTool(server: "appmod-catalog-blueprints", uri: "constructs://agents/InteractiveAgent")
```

### 3. Find Reference Examples

Examples show real implementations. Always check for relevant ones:

```
list_examples(construct: "InteractiveAgent")  # By construct usage
list_examples(category: "chatbot")            # By category
```

Share example paths so users can study the full implementation.

### 4. Generate Code

**Single construct** — use family-specific scaffold tools:
```
scaffold_agents(constructType: "InteractiveAgent")
scaffold_document_processing(constructType: "AgenticDocumentProcessing")
scaffold_foundation(constructType: "Network")
scaffold_webapp(constructType: "Frontend")
```

**Multiple constructs** — use compose for automatic dependency wiring:
```
compose_constructs(constructs: ["Network", "BedrockKnowledgeBase", "InteractiveAgent", "Frontend"])
```

Compose is preferred because it:
- Orders constructs by dependency (Network before Agent)
- Wires references automatically (passes `network: network`)
- Adds related constructs when needed (e.g., EventbridgeBroker)

### 5. Explain and Customize

After generating code:
1. Explain what each construct does and why it's included
2. List the `<REQUIRED>` placeholders and what values they need
3. Suggest customizations based on user's stated requirements
4. Provide the project structure and deployment steps

## Construct Quick Reference

| Need | Use |
|------|-----|
| Real-time chatbot with streaming | `InteractiveAgent` |
| Async document/batch processing | `BatchAgent` |
| RAG retrieval | `BedrockKnowledgeBase` |
| Document classification/extraction | `BedrockDocumentProcessing` |
| Document processing with AI reasoning | `AgenticDocumentProcessing` |
| Static web hosting | `Frontend` |
| VPC isolation | `Network` |
| Event-driven architecture | `EventbridgeBroker` |

## Common Compositions

**Customer support chatbot with RAG:**
```
compose_constructs(constructs: ["BedrockKnowledgeBase", "InteractiveAgent", "Frontend"])
```

**Document processing pipeline:**
```
compose_constructs(constructs: ["Network", "AgenticDocumentProcessing"])
```

**Full-stack AI application:**
```
compose_constructs(constructs: ["Network", "BedrockKnowledgeBase", "InteractiveAgent", "Frontend"])
```

## Required Values Reference

When users need to fill in `<REQUIRED>` placeholders:

**agentName**: Short identifier, kebab-case (e.g., `"support-bot"`)

**agentDefinition**:
```typescript
{
  bedrockModel: { useCrossRegionInference: true },
  systemPrompt: new Asset(this, 'Prompt', { path: './prompt.txt' }),
  tools: new Asset(this, 'Tools', { path: './tools/' }),  // Optional
  knowledgeBases: [kb],  // Optional, if using RAG
}
```

**knowledgeBaseId**: Get from Bedrock console after creating a KB

**sourceDirectory**: Path to frontend build output (e.g., `"./frontend/dist"`)

## Deployment

```bash
npm install
npx cdk bootstrap  # First time per account/region
npx cdk deploy
```

## Language Support

All tools accept `language` parameter: `typescript` (default), `python`, `java`, `dotnet`
