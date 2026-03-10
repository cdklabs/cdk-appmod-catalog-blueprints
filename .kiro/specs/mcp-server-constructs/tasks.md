# Implementation Plan: MCP Server for AppMod Catalog Blueprints

## Overview

Bottom-up implementation of a Python MCP server that exposes the AppMod Catalog Blueprints library to AI tools. Each task builds on the previous: data models → registry → generator → resolver → server wiring → templates. Testing sub-tasks are placed close to the code they validate.

## Tasks

- [x] 1. Set up project structure and package configuration
  - Create `mcp-appmod-catalog-blueprints/` directory with `pyproject.toml` defining package metadata, entry point (`mcp-appmod-catalog-blueprints = "mcp_server_constructs.__main__:main"`), dependencies (`mcp`, `jinja2`), and dev dependencies (`pytest`, `hypothesis`, `pytest-cov`)
  - Create `src/mcp_server_constructs/__init__.py` with package version and public API exports
  - Create `src/mcp_server_constructs/__main__.py` with `main()` entry point that calls `create_server()` and runs stdio transport
  - Create empty `tests/` directory with `conftest.py` containing shared fixtures (sample JSII data, registry instances)
  - Create `src/mcp_server_constructs/data/` directory and copy the `.jsii` manifest from the library build output as bundled package data
  - Create empty template directories: `src/mcp_server_constructs/templates/{typescript,python,java,dotnet}/`
  - _Requirements: 5.2, 5.4_

- [x] 2. Implement data models and error types
  - [x] 2.1 Create `src/mcp_server_constructs/models.py` with frozen dataclasses: `Language` enum, `PropInfo`, `ConstructInfo`, `FamilyInfo`, `CatalogInfo`, `SmartDefault`, `WiringEntry`
    - All fields as specified in design: `PropInfo.is_construct_ref`, `ConstructInfo.is_abstract`, `SmartDefault.security_relevant`, etc.
    - _Requirements: 4.1, 2.1, 2.2_

  - [x] 2.2 Create `src/mcp_server_constructs/errors.py` with exception classes: `JsiiLoadError`, `UnknownConstructError`, `UnknownFamilyError`, `CircularDependencyError`, `IncompatibleConstructsError`, `DegradedModeError`
    - Each exception includes a descriptive message template as specified in the design error handling section
    - _Requirements: 6.2, 6.3_

  - [x] 2.3 Create `src/mcp_server_constructs/defaults.py` with `SMART_DEFAULTS` dictionary mapping construct names to lists of `SmartDefault` instances
    - Include defaults for `BedrockDocumentProcessing` (encryptionKey, removalPolicy, enableObservability), `Network` (maxAzs), `Frontend` (enforceSSL), and other constructs per design
    - _Requirements: 1.3, 7.2_

- [x] 3. Implement ConstructRegistry with JSII parsing
  - [x] 3.1 Create `src/mcp_server_constructs/registry.py` with `ConstructRegistry` class
    - `__init__` loads `.jsii` JSON from bundled data path (or custom path), catches `FileNotFoundError`/`JSONDecodeError` and sets `is_loaded = False` for degraded mode
    - Parse `types` map: filter to public construct classes (kind == "class", extends Construct chain), resolve inheritance chains for props collection
    - Group constructs into families based on JSII module path using the family mapping table from design
    - Build indexes by class name and by family name
    - Implement `get_construct()`, `get_family()`, `list_families()`, `get_catalog()`, `get_props()`, `get_construct_types()`, `is_loaded` property
    - Add `from_dict()` classmethod for testing with synthetic JSII data
    - _Requirements: 4.1, 4.2, 4.3, 2.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 3.2 Write property test for JSII parsing round-trip
    - **Property 1: JSII Parsing Round-Trip**
    - Use custom `jsii_type_strategy()` and `jsii_prop_strategy()` Hypothesis strategies to generate synthetic JSII type entries
    - Verify that loading into registry and reading back produces matching prop names, types, required flags, and descriptions
    - **Validates: Requirements 4.1, 4.2, 4.3, 2.4, 8.6**

  - [ ]* 3.3 Write unit tests for ConstructRegistry (`tests/test_registry.py`)
    - Test loading real bundled `.jsii` manifest: verify construct count, family grouping, known constructs present
    - Test props inheritance resolution: verify inherited props from base classes are included
    - Test `get_construct()` with valid and invalid names
    - Test `get_family()` with valid and invalid family names
    - Test `get_construct_types()` returns correct types per family
    - Test degraded mode: missing `.jsii` file sets `is_loaded = False`, methods raise `DegradedModeError`
    - _Requirements: 4.1, 4.2, 4.3, 6.3, 8.1–8.6_

- [x] 4. Checkpoint — Ensure registry tests pass
  - Ensure all tests pass, ask the user if questions arise.

eiifccuhcubrnltgvcgbdkjcnbeuvfgdtbktthhktlvk
- [x] 5. Implement CodeGenerator with Jinja2 templates
  - [x] 5.1 Create TypeScript Jinja2 templates
    - `templates/typescript/scaffold.ts.j2`: imports, construct instantiation with props (required + optional with smart defaults), inline JSDoc comments per prop, 2-space indent, single quotes, semicolons, PascalCase IDs, commented-out observability section
    - `templates/typescript/compose.ts.j2`: multiple imports, ordered instantiation blocks, cross-reference wiring between constructs, shared dependency deduplication
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.2 Create Python, Java, and .NET Jinja2 templates
    - `templates/python/scaffold.py.j2` and `compose.py.j2`: snake_case props, double quotes, 4-space indent, `from ... import` style
    - `templates/java/scaffold.java.j2` and `compose.java.j2`: Builder pattern instantiation, camelCase props, 4-space indent
    - `templates/dotnet/scaffold.cs.j2` and `compose.cs.j2`: PascalCase props, `new FooProps { ... }` style, 4-space indent
    - _Requirements: 7.1_

  - [x] 5.3 Create `src/mcp_server_constructs/generator.py` with `CodeGenerator` class
    - `__init__` takes a `ConstructRegistry` instance, loads Jinja2 `Environment` with `PackageLoader` pointing to templates directory
    - `scaffold()` method: looks up construct in registry, merges smart defaults with prop overrides, applies language-specific naming conventions (camelCase/snake_case/PascalCase), renders template, handles missing required props with `<REQUIRED: type>` placeholders and TODO comments, handles type mismatches with WARNING comments
    - `compose()` method: delegates to `DependencyResolver` for ordering, builds wiring map, renders compose template with ordered constructs and cross-references
    - Language convention mapping: prop name casing, string quotes, indentation, import style, instantiation pattern per the design table
    - _Requirements: 1.2, 1.3, 1.4, 3.1, 6.1, 6.4, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 5.4 Write property tests for scaffold output
    - **Property 2: Scaffold Output Contains All Required Props**
    - For any construct in the registry and any target language, scaffold with no overrides should produce output containing every required prop name
    - **Validates: Requirements 1.2**

  - [ ]* 5.5 Write property test for smart defaults and overrides
    - **Property 3: Smart Defaults and Override Application**
    - For any construct with optional props that have smart defaults, and for any subset provided as overrides: output contains override values for overridden props and smart default values for non-overridden props
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 5.6 Write property test for code snippet format validity
    - **Property 4: Code Snippet Format Validity**
    - For any generated TypeScript snippet: verify 2-space indentation, single-quoted strings, semicolons, PascalCase IDs, and inline comments on every prop
    - **Validates: Requirements 7.1, 7.3**

  - [ ]* 5.7 Write property test for graceful handling of missing/invalid props
    - **Property 8: Graceful Handling of Missing and Invalid Props**
    - For any construct and any non-empty subset of required props omitted: output contains placeholder markers with TODO comments. For any prop with mismatched type: output includes value as-is with WARNING comment
    - **Validates: Requirements 6.1, 6.4**

  - [x] 5.8 Write unit tests for CodeGenerator (`tests/test_generator.py`)
    - Test scaffold for each construct family in TypeScript: verify imports, instantiation, smart defaults present
    - Test scaffold with prop overrides: verify overrides replace defaults
    - Test scaffold with missing required props: verify TODO placeholders
    - Test scaffold with type-mismatched props: verify WARNING comments
    - Test scaffold in Python, Java, .NET: verify language-specific conventions (casing, quotes, indent, import style)
    - Test compose delegates to resolver and produces wired output
    - _Requirements: 1.2, 1.3, 1.4, 6.1, 6.4, 7.1–7.4_

- [x] 6. Checkpoint — Ensure generator and template tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement DependencyResolver
  - [x] 7.1 Create `src/mcp_server_constructs/resolver.py` with `DependencyResolver` class
    - `__init__` takes a `ConstructRegistry` instance
    - `get_dependencies()`: for a construct, inspect its props via registry, return list of prop type names that are other library constructs (`PropInfo.is_construct_ref == True`)
    - `resolve_order()`: build DAG from dependency edges, perform topological sort (Kahn's algorithm), raise `CircularDependencyError` if cycle detected
    - `get_shared_dependencies()`: identify constructs that appear as dependencies of multiple requested constructs
    - `build_wiring()`: produce `{construct: {prop_name: variable_name}}` map for the generator to wire cross-references
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 7.2 Write property test for dependency ordering correctness
    - **Property 5: Dependency Ordering Correctness**
    - For any set of constructs, the resolved order is a valid topological sort: every construct appears after all its dependencies
    - **Validates: Requirements 3.2**

  - [ ]* 7.3 Write property test for shared dependency deduplication
    - **Property 6: Shared Dependency Deduplication**
    - For any set of constructs sharing a common dependency, composed output contains exactly one instantiation of each shared dependency
    - **Validates: Requirements 3.3**

  - [x] 7.4 Write unit tests for DependencyResolver (`tests/test_resolver.py`)
    - Test known dependency pairs (e.g., BedrockDocumentProcessing depends on Network)
    - Test topological sort with 3+ constructs
    - Test shared dependency detection (Network shared by multiple constructs)
    - Test cycle detection raises `CircularDependencyError`
    - Test `build_wiring()` produces correct prop-to-variable mappings
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Checkpoint — Ensure resolver tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 9. Implement MCP server wiring and tool/resource registration
  - [x] 9.1 Create `src/mcp_server_constructs/server.py` with `create_server()` function
    - Instantiate `ConstructRegistry`, `CodeGenerator`, `DependencyResolver`
    - Register 6 MCP tools: `scaffold_document_processing`, `scaffold_agents`, `scaffold_webapp`, `scaffold_foundation`, `scaffold_utilities`, `compose_constructs`
    - Each scaffold tool handler: validate `constructType` against `registry.get_construct_types(family)`, return error listing valid types if invalid, otherwise delegate to `generator.scaffold()`
    - Compose tool handler: validate construct list, delegate to `generator.compose()`
    - Register MCP resources: `constructs://catalog` (delegates to `registry.get_catalog()`), `constructs://{family}/{construct}` (delegates to `registry.get_construct()` and formats props)
    - Implement degraded mode check: if `not registry.is_loaded`, return structured error JSON on any tool/resource invocation
    - Wire `__main__.py` to call `create_server()` and run with `mcp.server.stdio` transport
    - _Requirements: 1.1, 1.5, 2.1, 2.2, 2.3, 5.1, 5.3, 6.2, 6.3_

  - [ ]* 9.2 Write property test for resource props completeness
    - **Property 7: Resource Props Completeness**
    - For any construct in the registry, reading its MCP resource returns every prop with type name, description, required/optional status, and default value
    - **Validates: Requirements 2.1, 2.2**

  - [x] 9.3 Write unit tests for MCP server (`tests/test_server.py`)
    - Test MCP initialization handshake completes and advertises all 6 tools and resource templates
    - Test each scaffold tool with valid constructType returns code snippet
    - Test scaffold tool with invalid constructType returns error listing valid types
    - Test compose tool with valid construct list returns wired snippet
    - Test catalog resource returns all families and constructs
    - Test construct resource returns props with types and descriptions
    - Test degraded mode: server starts, tools return structured error
    - _Requirements: 1.1, 1.5, 2.1, 2.3, 5.1, 5.3, 6.2, 6.3_

- [x] 10. Create README.md with usage and configuration documentation
  - Write `mcp-appmod-catalog-blueprints/README.md` with: overview, installation (`uvx mcp-appmod-catalog-blueprints`), MCP client configuration (Claude Desktop JSON, VS Code settings), available tools with example invocations, available resources with URI patterns, supported languages, development setup (venv, pip install, pytest), and troubleshooting (degraded mode, JSII issues)
  - _Requirements: 5.2, 5.3_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate the 8 correctness properties from design.md
- Checkpoints at tasks 4, 6, 8, and 11 ensure incremental validation
- TypeScript templates are built first (task 5.1) since it's the primary target language; other languages follow in task 5.2
- The bundled `.jsii` manifest in task 1 must be copied from the library's build output — run `npx projen build` in the repo root first
