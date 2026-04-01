# AppMod Blueprints Builder Skill

An AI coding assistant skill that helps you build AWS CDK applications using [AppMod Catalog Blueprints](https://github.com/cdklabs/cdk-appmod-catalog-blueprints).

## What It Does

This skill connects your AI assistant to the AppMod Catalog Blueprints MCP server, enabling it to:

- **Discover constructs** — browse available CDK constructs and their props
- **Generate code** — scaffold constructs with correct imports, security defaults, and type-safe props
- **Compose applications** — wire multiple constructs together with automatic dependency ordering
- **Find examples** — locate reference implementations for your use case

## Installation

### Claude Code

**1. Add the MCP server:**

```bash
claude mcp add appmod-catalog-blueprints \
  -- uvx --from "git+https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git@main#subdirectory=mcp-appmod-catalog-blueprints" mcp-appmod-catalog-blueprints
```

**2. Install the skill:**

```bash
mkdir -p ~/.claude/skills
cp -r skills/appmod-blueprints-builder ~/.claude/skills/
```

**3. Restart Claude Code**

---

### Kiro

**1. Add the MCP server** to `~/.kiro/settings/mcp.json` (global) or `.kiro/settings/mcp.json` (workspace):

```json
{
  "mcpServers": {
    "appmod-catalog-blueprints": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git@main#subdirectory=mcp-appmod-catalog-blueprints",
        "mcp-appmod-catalog-blueprints"
      ]
    }
  }
}
```

**2. Install the skill:**

```bash
mkdir -p ~/.kiro/skills
cp -r skills/appmod-blueprints-builder ~/.kiro/skills/
```

**3. Add a steering doc** to your CDK project to activate the skill:

```bash
mkdir -p .kiro/steering
curl -o .kiro/steering/appmod-blueprints-skill.md \
  https://raw.githubusercontent.com/cdklabs/cdk-appmod-catalog-blueprints/main/skills/appmod-blueprints-builder/sample-kiro-steering.md
```

Or copy from a local clone:

```bash
cp path/to/cdk-appmod-catalog-blueprints/skills/appmod-blueprints-builder/sample-kiro-steering.md \
  .kiro/steering/appmod-blueprints-skill.md
```

> **Why a steering doc?** Ensure Kiro auto-triggers the skills from the SKILL.md description. The steering doc with `inclusion: always` tells Kiro to activate the skill whenever you're working on relevant topics (CDK, chatbots, AI agents, etc.).

---

### Codex

**1. Add the MCP server** to your Codex MCP configuration file:

```json
{
  "mcpServers": {
    "appmod-catalog-blueprints": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git@main#subdirectory=mcp-appmod-catalog-blueprints",
        "mcp-appmod-catalog-blueprints"
      ]
    }
  }
}
```

**2. Install the skill:**

```bash
mkdir -p ~/.codex/skills
cp -r skills/appmod-blueprints-builder ~/.codex/skills/
```

**3. Restart Codex**

---

## Usage

Just describe what you want to build. The skill triggers automatically on keywords like:

- chatbot, AI agent, interactive agent, batch agent
- document processing, classification, extraction
- RAG, knowledge base, Bedrock
- CDK, serverless AI

### Example Prompts

| You Say | What Happens |
|---------|--------------|
| "I want to build a customer support chatbot" | Asks clarifying questions, then scaffolds InteractiveAgent + Frontend |
| "Create a document processing pipeline" | Composes Network + BedrockDocumentProcessing with proper wiring |
| "What constructs are available?" | Lists all construct families from the MCP catalog |
| "Show me chatbot examples" | Finds example applications using InteractiveAgent |

### Workflow

1. **You describe your goal** — "Build a chatbot with RAG"
2. **Skill asks clarifying questions** — "Do you need a frontend? What kind of knowledge base?"
3. **Skill discovers relevant constructs** — queries the MCP server
4. **Skill generates code** — scaffolds or composes constructs
5. **Skill explains what to customize** — highlights required values and next steps

## Available Constructs

| Category | Constructs |
|----------|------------|
| **Agents** | InteractiveAgent, BatchAgent, BedrockKnowledgeBase |
| **Document Processing** | BedrockDocumentProcessing, AgenticDocumentProcessing |
| **Foundation** | Network, EventbridgeBroker, AccessLog |
| **Webapp** | Frontend (CloudFront + S3) |
| **Utilities** | CloudWatchTransactionSearch, DataLoader |

## Example Output

When you ask to "build a chatbot with RAG and a frontend", the skill generates:

```typescript
import { BedrockKnowledgeBase, Frontend, InteractiveAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';

const kb = new BedrockKnowledgeBase(this, 'KnowledgeBase', {
  knowledgeBaseId: '<YOUR_KB_ID>',
  name: 'support-docs',
  description: 'Product documentation for customer questions',
});

const agent = new InteractiveAgent(this, 'ChatAgent', {
  agentName: 'support-bot',
  agentDefinition: {
    bedrockModel: { useCrossRegionInference: true },
    systemPrompt: new Asset(this, 'Prompt', { path: './prompt.txt' }),
    knowledgeBases: [kb],
  },
  enableObservability: true,
});

const frontend = new Frontend(this, 'Frontend', {
  sourceDirectory: './frontend/dist',
});
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Skill doesn't trigger | Check MCP server is running — restart your AI tool |
| "MCP tools unavailable" | Run the MCP server setup command for your tool |
| Outdated construct props | Clear MCP cache: `uv cache prune` |

## Learn More

- [AppMod Catalog Blueprints Documentation](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/)
- [MCP Server README](../../mcp-appmod-catalog-blueprints/README.md)
- [Example Applications](../../examples/)
