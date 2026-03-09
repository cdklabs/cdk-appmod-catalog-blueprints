# Decisions: Design — MCP Server for AppMod Catalog Blueprints

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Architecture

### 1. Overall Architecture Pattern

**Question:** How should the MCP server be structured internally?

The server needs to load JSII metadata, expose tools/resources, and generate code snippets. The architecture determines how these concerns are separated.

**Options:**
1. **Registry-driven architecture (Kiro Recommended):** A central `ConstructRegistry` loads JSII metadata at startup and provides a unified API for tool handlers and resource handlers to query construct info. Tools and resources are thin wrappers that delegate to the registry. Clean separation, easy to test.
2. **Handler-per-family architecture:** Each construct family (Document Processing, Agents, etc.) gets its own handler module with embedded metadata logic. Simpler per-module but duplicates metadata access patterns.
3. **Plugin architecture:** Each construct family is a plugin that registers itself with the MCP server. Most extensible but adds complexity for a server that ships as a single package.
4. Other (please specify): ___

**Answer:**
1
---

### 2. JSII Metadata Loading Strategy

**Question:** How should the Python server discover and load JSII metadata at runtime?

The JSII `.jsii` manifest is a JSON file containing all type information for the library's public API. Since the MCP server is Python-based, it needs a strategy to access this Node.js/JSII artifact.

**Options:**
1. **Bundle `.jsii` in the Python package (Kiro Recommended):** Copy the `.jsii` manifest into the Python package as a data file during the build/release process. The Python server loads it as a JSON file at startup. Simple, no Node.js dependency at runtime, version-locked by the build process.
2. **Resolve from npm at runtime:** Use `subprocess` to run `npm` or `npx` to locate the installed npm package and read its `.jsii` file. Works but requires Node.js installed on the user's machine.
3. **Fetch from npm registry:** Download the `.jsii` file from the npm registry at startup for a specific package version. No local Node.js needed but requires network access and adds latency.
4. Other (please specify): ___

**Answer:**

---

### 3. Code Generation Approach

**Question:** How should the server generate code snippets?

Since the server is Python-based, it needs a strategy for generating code in multiple target languages (TypeScript, Python, Java, .NET) from JSII metadata.

**Options:**
1. **Jinja2 templates per language (Kiro Recommended):** Use Jinja2 templates with one template set per target language. Each construct family has language-specific templates populated with props from the registry. Python-native, readable, easy to add new languages.
2. **JSII `jsii-rosetta` translation:** Generate TypeScript first, then use jsii-rosetta to translate to other languages. Leverages existing JSII tooling but adds a Node.js dependency and may produce awkward translations.
3. **String-based generation with language formatters:** Build code strings programmatically in Python with per-language formatting functions. No template files but harder to maintain as languages are added.
4. Other (please specify): ___

**Answer:**

---

### 4. Multi-Language Output Support

**Question:** How should the MCP server support generating code in multiple programming languages?

The library supports TypeScript, Python, Java, and .NET via JSII. Users working in different languages need code snippets in their target language.

**Options:**
1. **Language parameter on scaffold/compose tools (Kiro Recommended):** Add a `language` parameter (`typescript`, `python`, `java`, `dotnet`) to scaffold and compose tools. The server uses JSII metadata to map TypeScript prop names/types to the target language's conventions (e.g., snake_case for Python, PascalCase for .NET). Default to TypeScript if not specified.
2. **Separate tools per language:** Create language-specific tool variants (e.g., `scaffold_document_processing_python`, `scaffold_document_processing_java`). Explicit but multiplies the number of tools.
3. **TypeScript only, with translation hints:** Generate TypeScript only but include comments with equivalent Python/Java/C# syntax for key constructs. Simpler but less useful for non-TypeScript users.
4. Other (please specify): ___

**Answer:**

---

## Tool & Resource Design

### 5. Scaffold Tool Input Schema

**Question:** What should the scaffold tool's input schema look like?

Each scaffold tool serves a construct family and needs to know which construct to scaffold, what language to generate, and what prop overrides to apply.

**Options:**
1. **Typed schema with constructType enum + language + props object (Kiro Recommended):** `{ constructType: "BedrockDocumentProcessing", language: "typescript", props: { ... } }`. The enum is derived from JSII metadata. Clear, validated, discoverable by AI models.
2. **Flat schema with all props at top level:** `{ constructType: "BedrockDocumentProcessing", language: "python", modelId: "...", chunkingEnabled: true, ... }`. Simpler but mixes control parameters with construct props.
3. **Minimal schema with free-form props:** `{ constructType: string, language?: string, overrides?: dict }`. Most flexible but least type-safe and harder for AI models to use correctly.
4. Other (please specify): ___

**Answer:**

---

### 6. Compose Tool Dependency Resolution

**Question:** How should the compose tool determine the correct instantiation order and cross-references between constructs?

When composing `Network` + `BedrockDocumentProcessing` + `Observability`, the tool needs to know that `BedrockDocumentProcessing` depends on `Network` and optionally on `Observability`.

**Options:**
1. **Static dependency graph from JSII props analysis (Kiro Recommended):** Analyze each construct's props interface from JSII metadata. If a prop's type matches another construct's class, that's a dependency. Build a DAG and topologically sort. Deterministic and auto-maintained.
2. **Hardcoded dependency map:** Maintain a manual mapping of which constructs depend on which. Simple to implement but requires manual updates when constructs change.
3. **AI-assisted resolution:** Let the AI model figure out the wiring based on resource documentation. The compose tool just concatenates snippets. Least work for the server but unreliable.
4. Other (please specify): ___

**Answer:**

---

### 7. Resource URI Scheme

**Question:** What URI scheme should MCP resources use?

MCP resources need stable, predictable URIs that AI clients can discover and reference.

**Options:**
1. **Hierarchical by family and construct (Kiro Recommended):** `constructs://catalog`, `constructs://document-processing/bedrock-document-processing`, `constructs://agents/batch-agent`. Clean hierarchy, easy to browse.
2. **Flat with construct name:** `construct://bedrock-document-processing`, `construct://batch-agent`. Simpler but no family grouping.
3. **JSII FQN-based:** `jsii://@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing`. Precise but verbose and tied to internal naming.
4. Other (please specify): ___

**Answer:**

---

## Error Handling & Degraded Mode

### 8. Degraded Mode Behavior

**Question:** When JSII metadata is unavailable, how should the server behave?

Requirement 6.3 specifies the server must start in degraded mode if metadata is missing.

**Options:**
1. **Start with empty registry, error on tool invocation (Kiro Recommended):** The server starts and completes the MCP handshake normally. Tools and resources return structured error responses explaining that metadata is unavailable and how to fix it. This way the AI client can still connect and get helpful error messages.
2. **Refuse to start:** Exit with a clear error message. Simple but unhelpful — the user gets no guidance through the MCP channel.
3. **Fall back to hardcoded metadata:** Ship a snapshot of metadata as fallback. The server works but may be out of date. Adds maintenance burden.
4. Other (please specify): ___

**Answer:**

---

## Correctness Properties Strategy

### 9. Property-Based Testing Approach

**Question:** Should the design document include formal correctness properties for property-based testing?

**Options:**
1. **Skip correctness properties:** Focus on architecture and implementation — 60-80% faster generation.
2. **Essential properties only (Kiro Recommended):** Include properties for the core behaviors: JSII metadata parsing round-trips, code snippet validity, dependency ordering correctness, and smart defaults application. These are the areas most amenable to property-based testing.
3. **Comprehensive properties:** Full property-based testing approach with detailed prework analysis for every acceptance criterion.
4. Other (please specify): ___

**Answer:**

---

## Testing Strategy

### 10. Testing Approach

**Question:** What testing strategy should we use for the MCP server?

**Options:**
1. **pytest unit tests + integration tests (Kiro Recommended):** Unit tests (pytest) for the registry, code generator, and dependency resolver. Integration tests that spin up the MCP server over stdio and verify tool/resource responses end-to-end. Property-based tests (Hypothesis) for core invariants (metadata parsing, code generation).
2. **Unit tests only:** Test individual modules in isolation with pytest. Faster to write but misses integration issues.
3. **End-to-end only:** Test the full MCP server via stdio. Catches real issues but slow and hard to debug failures.
4. Other (please specify): ___

**Answer:**

---

### 11. Property-Based Testing Library

**Question:** Which property-based testing library should we use?

Since the MCP server is Python-based, we need a Python PBT library.

**Options:**
1. **Hypothesis (Kiro Recommended):** The standard PBT library for Python. Mature, well-documented, integrates with pytest. Supports custom strategies, shrinking, and reproducible failures.
2. **pytest-quickcheck:** Lighter-weight PBT for Python. Less feature-rich than Hypothesis but simpler.
3. **Custom generators with pytest:** Write custom randomized test helpers without a PBT framework. Less structured but no additional dependency.
4. Other (please specify): ___

**Answer:**

---
