# MCP Server for AppMod Catalog Blueprints

A Python-based [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes the `@cdklabs/cdk-appmod-catalog-blueprints` CDK construct library to AI-powered development tools. It reads JSII metadata to auto-discover construct props, types, and documentation, then provides tools for code generation and resources for construct browsing.

## Features

- **Scaffold tools** grouped by construct family — generate ready-to-use CDK instantiation code
- **Compose tool** — wire multiple constructs together with automatic dependency ordering
- **Resource browsing** — query construct documentation, props interfaces, and catalog listings
- **Multi-language output** — TypeScript (default), Python, Java, .NET
- **Smart defaults** — security best practices and inline comments out of the box
- **JSII-driven** — stays in sync with the library automatically, no manual metadata maintenance

## Installation

Requires Python 3.10+ and [uv](https://docs.astral.sh/uv/getting-started/installation/).

Run directly from GitHub with `uvx` (no install required):

```bash
uvx --from "git+https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git@main#subdirectory=mcp-appmod-catalog-blueprints" mcp-appmod-catalog-blueprints
```

When the local `examples/` directory is not available (e.g., when installed via `uvx`), the server automatically fetches example metadata from GitHub at runtime.

### Updating

`uvx` caches the installed package. To pick up the latest changes (new constructs, examples, bug fixes), clear the cache and restart your MCP client:

```bash
uv cache prune --force
```

The next time your MCP client starts the server, `uvx` will pull the latest version from GitHub automatically.

## MCP Client Configuration

### Kiro

Add to `.kiro/settings/mcp.json` (workspace) or `~/.kiro/settings/mcp.json` (global):

```json
{
  "mcpServers": {
    "appmod-catalog-blueprints": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git@main#subdirectory=mcp-appmod-catalog-blueprints",
        "mcp-appmod-catalog-blueprints"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Claude Code

Run the following command:

```bash
claude mcp add appmod-catalog-blueprints \
  -- uvx --from "git+https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git@main#subdirectory=mcp-appmod-catalog-blueprints" mcp-appmod-catalog-blueprints
```

Or add to your `.claude/settings.json`:

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

### Codex

Add to your `codex` MCP configuration:

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

### Optional CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--examples-path` | Path to a local `examples/` directory | Auto-detected, falls back to GitHub |
| `--github-repo` | GitHub repo for fetching examples (`owner/name`) | `cdklabs/cdk-appmod-catalog-blueprints` |
| `--github-branch` | Branch to fetch examples from | `main` |

Example with a local examples directory:

```json
{
  "args": [
    "--from",
    "git+https://github.com/cdklabs/cdk-appmod-catalog-blueprints.git@main#subdirectory=mcp-appmod-catalog-blueprints",
    "mcp-appmod-catalog-blueprints",
    "--examples-path", "/path/to/local/examples"
  ]
}
```

## Available Tools

### Scaffold Tools

Each scaffold tool generates construct instantiation code for a specific family. All accept the same parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `constructType` | string | Yes | Construct class name (e.g. `BedrockDocumentProcessing`) |
| `language` | string | No | Target language: `typescript` (default), `python`, `java`, `dotnet` |
| `props` | object | No | Prop overrides as key-value pairs |

| Tool Name | Family | Constructs |
|-----------|--------|------------|
| `scaffold_document_processing` | Document Processing | BedrockDocumentProcessing, AgenticDocumentProcessing, QueuedS3Adapter |
| `scaffold_agents` | Agents | BatchAgent, InteractiveAgent, BedrockKnowledgeBase |
| `scaffold_webapp` | Webapp | Frontend |
| `scaffold_foundation` | Foundation | Network, AccessLog, EventBridgeBroker |
| `scaffold_utilities` | Utilities | Observability, DataMasking, DataLoader |

#### Example: Scaffold a Document Processing construct

```json
{
  "name": "scaffold_document_processing",
  "arguments": {
    "constructType": "BedrockDocumentProcessing",
    "language": "typescript",
    "props": {
      "classificationPrompt": "Classify as invoice or receipt"
    }
  }
}
```

#### Example: Scaffold in Python

```json
{
  "name": "scaffold_foundation",
  "arguments": {
    "constructType": "Network",
    "language": "python"
  }
}
```

### Compose Tool

`compose_constructs` wires multiple constructs together in a single snippet, resolving dependency order and shared references automatically.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `constructs` | string[] | Yes | List of construct class names to compose |
| `language` | string | No | Target language (default: `typescript`) |
| `props` | object | No | Per-construct prop overrides (`{constructName: {prop: value}}`) |

#### Example: Compose Network + Document Processing

```json
{
  "name": "compose_constructs",
  "arguments": {
    "constructs": ["Network", "BedrockDocumentProcessing"],
    "language": "typescript"
  }
}
```

The output creates `Network` first (since `BedrockDocumentProcessing` depends on it) and wires the reference automatically.

### List Examples Tool

`list_examples` discovers ready-to-deploy example applications from the `examples/` directory. Filter by category or by construct usage.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by example category (e.g. `document-processing`, `chatbot`) |
| `construct` | string | No | Filter by construct usage (e.g. `AgenticDocumentProcessing`) |

#### Example: List all examples

```json
{
  "name": "list_examples",
  "arguments": {}
}
```

#### Example: Find examples using a specific construct

```json
{
  "name": "list_examples",
  "arguments": {
    "construct": "AgenticDocumentProcessing"
  }
}
```

#### Example: List examples in a category

```json
{
  "name": "list_examples",
  "arguments": {
    "category": "document-processing"
  }
}
```

## Available Resources

| URI | Description |
|-----|-------------|
| `constructs://catalog` | Full catalog listing all families and their constructs |
| `constructs://{family}/{construct}` | Props, types, descriptions, and defaults for a specific construct |
| `examples://catalog` | Full catalog of example categories, examples, and construct usage mapping |
| `examples://{category}/{example}` | Full details for an example including README, stack files, and constructs used |

### Resource URI Examples

- `constructs://catalog`
- `constructs://document-processing/BedrockDocumentProcessing`
- `constructs://agents/BatchAgent`
- `constructs://foundation/Network`
- `constructs://webapp/Frontend`
- `constructs://utilities/Observability`
- `examples://catalog`
- `examples://document-processing/fraud-detection`
- `examples://document-processing/agentic-document-processing`
- `examples://chatbot/customer-service-chatbot`
- `examples://rag-customer-support/rag-customer-support` (top-level examples use their name as both category and example)

## Supported Languages

| Language | Package Name | Prop Casing | Quotes | Indent | Instantiation Style |
|----------|-------------|-------------|--------|--------|---------------------|
| TypeScript | `@cdklabs/cdk-appmod-catalog-blueprints` | camelCase | Single `'` | 2 spaces | `new Foo(scope, 'Id', {...})` |
| Python | `appmod-catalog-blueprints` | snake_case | Double `"` | 4 spaces | `Foo(scope, "Id", ...)` |
| Java | `io.github.cdklabs:appmod-catalog-blueprints` | camelCase | Double `"` | 4 spaces | `Foo.Builder.create(scope, "Id")...build()` |
| .NET | `Cdklabs.AppmodCatalogBlueprints` | PascalCase | Double `"` | 4 spaces | `new Foo(scope, "Id", new FooProps {...})` |

## Development Setup

```bash
# Clone and enter the directory
cd mcp-appmod-catalog-blueprints

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install in editable mode with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=mcp_server_constructs --cov-report=term-missing

# Run property-based tests only
pytest tests/test_properties.py -v
```

### Bundling the JSII Manifest

The server reads construct metadata from a bundled `jsii-metadata` file at `src/mcp_server_constructs/data/jsii-metadata`. This file is copied from the library's build output. To regenerate it:

```bash
# From the repository root
npx projen build
cp .jsii mcp-appmod-catalog-blueprints/src/mcp_server_constructs/data/jsii-metadata
```

### Examples Directory

The server resolves examples in this order:

1. `--examples-path` CLI argument (if provided)
2. Local `examples/` directory relative to the package or current working directory
3. Live fetch from GitHub (automatic fallback when local directory is unavailable)

The GitHub fallback uses the [Trees API](https://docs.github.com/en/rest/git/trees) to discover examples in a single request, then fetches READMEs and stack files on demand. Results are cached in memory for the server's lifetime.

To force a specific examples source:

```bash
# Use a local checkout
mcp-appmod-catalog-blueprints --examples-path /path/to/examples

# Use a different repo or branch
mcp-appmod-catalog-blueprints --github-repo my-org/my-fork --github-branch develop
```

## Troubleshooting

### Degraded Mode

If the `.jsii` manifest is missing or corrupt, the server starts normally but returns an error on every tool and resource invocation:

```
JSII metadata unavailable. The .jsii manifest could not be loaded.
Ensure the package was installed correctly.
Reinstall with: uvx --reinstall mcp-appmod-catalog-blueprints
```

To fix:
1. Clear the cache and restart your MCP client: `uv cache prune`
2. If developing locally, ensure the `jsii-metadata` file exists at `src/mcp_server_constructs/data/jsii-metadata`

### Invalid constructType

If you pass an unrecognized `constructType`, the tool returns an error listing valid types for that family. Use the `constructs://catalog` resource to discover available constructs.

### JSII Out of Sync

If scaffolded code references props that don't exist (or is missing new props), the bundled `.jsii` manifest may be stale. Rebuild the library and re-copy the manifest as described above.

## License

Apache-2.0
