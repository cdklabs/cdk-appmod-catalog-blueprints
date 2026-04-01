# Skills

AI coding assistant skills for working with AppMod Catalog Blueprints.

## Available Skills

| Skill | Description |
|-------|-------------|
| [appmod-blueprints-builder](./appmod-blueprints-builder/) | Build CDK applications with AppMod constructs — scaffolds code, composes infrastructure, discovers examples |

## Quick Install

### Claude Code

```bash
cp -r skills/appmod-blueprints-builder ~/.claude/skills/
```

### Kiro

```bash
cp -r skills/appmod-blueprints-builder ~/.kiro/skills/
```

Then add the steering doc to your CDK project to activate the skill:

```bash
mkdir -p .kiro/steering
cp skills/appmod-blueprints-builder/sample-kiro-steering.md .kiro/steering/appmod-blueprints-skill.md
```

### Codex

```bash
cp -r skills/appmod-blueprints-builder ~/.codex/skills/
```

## Requirements

Skills in this directory require the [MCP Server](../mcp-appmod-catalog-blueprints/) to be configured. See the [skill README](./appmod-blueprints-builder/README.md) for full setup instructions including MCP server configuration.

## What Are Skills?

Skills are markdown files (`SKILL.md`) that teach AI assistants how to perform specific tasks. They include:

- **Triggers** — keywords that activate the skill
- **Workflows** — step-by-step processes to follow
- **Tool references** — MCP tools and resources to use
- **Examples** — common patterns and code snippets

When you ask your AI assistant to "build a chatbot", the skill triggers automatically and guides the assistant through the process using the MCP server's tools.
