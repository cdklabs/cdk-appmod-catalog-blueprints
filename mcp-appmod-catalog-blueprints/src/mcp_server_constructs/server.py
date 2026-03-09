"""MCP server setup, tool registration, and resource registration.

Creates and configures the MCP server with scaffold tools (one per
construct family), a compose tool, and resources for catalog browsing,
individual construct documentation, and example application discovery.
"""

from __future__ import annotations

import json
import logging

from mcp import types
from mcp.server import Server
from mcp.server.lowlevel.server import ReadResourceContents

from mcp_server_constructs import __version__
from mcp_server_constructs.errors import (
    CircularDependencyError,
    DegradedModeError,
    IncompatibleConstructsError,
    UnknownConstructError,
    UnknownFamilyError,
)
from mcp_server_constructs.examples import ExampleInfo, ExampleRegistry
from mcp_server_constructs.models import CatalogInfo, ConstructInfo, PropInfo
from mcp_server_constructs.registry import ConstructRegistry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Family → tool mapping
# ---------------------------------------------------------------------------

_FAMILY_TOOLS: list[tuple[str, str, str]] = [
    # (tool_name, family_key, description)
    (
        "scaffold_document_processing",
        "document-processing",
        "Scaffold a Document Processing construct (BedrockDocumentProcessing, "
        "AgenticDocumentProcessing, QueuedS3Adapter, etc.)",
    ),
    (
        "scaffold_agents",
        "agents",
        "Scaffold an Agents construct (BatchAgent, InteractiveAgent, "
        "knowledge base constructs).",
    ),
    (
        "scaffold_webapp",
        "webapp",
        "Scaffold a Webapp construct (Frontend for CloudFront + S3 hosting).",
    ),
    (
        "scaffold_foundation",
        "foundation",
        "Scaffold a Foundation construct (Network, AccessLog, EventBridgeBroker).",
    ),
    (
        "scaffold_utilities",
        "utilities",
        "Scaffold a Utilities construct (Observability, DataMasking, DataLoader).",
    ),
]

# Common input schema shared by all scaffold tools
_SCAFFOLD_INPUT_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "constructType": {
            "type": "string",
            "description": "The construct class name to scaffold (e.g. 'BedrockDocumentProcessing').",
        },
        "language": {
            "type": "string",
            "enum": ["typescript", "python", "java", "dotnet"],
            "default": "typescript",
            "description": "Target language for the generated code snippet.",
        },
        "props": {
            "type": "object",
            "description": "Optional prop overrides (prop name → value).",
            "additionalProperties": True,
        },
    },
    "required": ["constructType"],
}

_COMPOSE_INPUT_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "constructs": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of construct class names to compose together.",
        },
        "language": {
            "type": "string",
            "enum": ["typescript", "python", "java", "dotnet"],
            "default": "typescript",
            "description": "Target language for the generated code snippet.",
        },
        "props": {
            "type": "object",
            "description": "Optional per-construct prop overrides ({constructName: {prop: value}}).",
            "additionalProperties": {"type": "object"},
        },
    },
    "required": ["constructs"],
}

_LIST_EXAMPLES_INPUT_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "category": {
            "type": "string",
            "description": (
                "Filter by example category (e.g. 'document-processing', "
                "'chatbot', 'rag-customer-support'). Omit to list all."
            ),
        },
        "construct": {
            "type": "string",
            "description": (
                "Filter by construct usage — returns examples that import "
                "this construct (e.g. 'AgenticDocumentProcessing', 'BatchAgent')."
            ),
        },
    },
    "required": [],
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DEGRADED_ERROR = types.CallToolResult(
    content=[
        types.TextContent(
            type="text",
            text=(
                "JSII metadata unavailable. The .jsii manifest could not be loaded. "
                "Ensure the package was installed correctly. "
                "Reinstall with: uvx --reinstall mcp-appmod-catalog-blueprints"
            ),
        )
    ],
    isError=True,
)

_DEGRADED_RESOURCE_TEXT = (
    "JSII metadata unavailable. The .jsii manifest could not be loaded. "
    "Ensure the package was installed correctly. "
    "Reinstall with: uvx --reinstall mcp-appmod-catalog-blueprints"
)


def _text_result(text: str, *, is_error: bool = False) -> types.CallToolResult:
    return types.CallToolResult(
        content=[types.TextContent(type="text", text=text)],
        isError=is_error,
    )


def _format_prop(p: PropInfo) -> dict:
    """Format a PropInfo as a JSON-serialisable dict for resource responses."""
    d: dict = {
        "name": p.name,
        "type": p.type_name,
        "required": p.required,
        "description": p.description,
    }
    if p.default_value is not None:
        d["default"] = p.default_value
    if p.is_construct_ref:
        d["constructRef"] = p.construct_ref_name
    return d


def _format_construct(info: ConstructInfo) -> str:
    """Format a ConstructInfo as a human-readable resource text."""
    props_list = [_format_prop(p) for p in info.props]
    data = {
        "name": info.name,
        "fqn": info.fqn,
        "family": info.family,
        "description": info.description,
        "isAbstract": info.is_abstract,
        "parentClass": info.parent_class,
        "props": props_list,
    }
    return json.dumps(data, indent=2)


def _format_catalog(catalog: CatalogInfo) -> str:
    """Format the full catalog as a JSON string."""
    data = {
        "libraryName": catalog.library_name,
        "libraryVersion": catalog.library_version,
        "families": [
            {
                "name": f.name,
                "displayName": f.display_name,
                "constructs": list(f.constructs),
            }
            for f in catalog.families
        ],
    }
    return json.dumps(data, indent=2)


def _format_example_summary(info: ExampleInfo) -> dict:
    """Format an ExampleInfo as a JSON-serialisable summary dict."""
    return {
        "name": info.name,
        "category": info.category,
        "displayName": info.display_name,
        "description": info.description,
        "constructsUsed": info.constructs_used,
        "path": info.relative_path,
        "hasAgentResources": info.has_agent_resources,
        "hasSampleFiles": info.has_sample_files,
    }


def _format_example_detail(info: ExampleInfo) -> str:
    """Format an ExampleInfo as a detailed JSON string for resource responses."""
    data = _format_example_summary(info)
    data["stackFiles"] = info.stack_files
    data["readme"] = info.readme_content
    return json.dumps(data, indent=2)


def _format_examples_catalog(example_registry: ExampleRegistry) -> str:
    """Format the full examples catalog as a JSON string."""
    data = {
        "categories": [
            {
                "name": cat.name,
                "displayName": cat.display_name,
                "examples": cat.examples,
            }
            for cat in example_registry.list_categories()
        ],
        "constructUsage": example_registry.get_all_constructs_used(),
    }
    return json.dumps(data, indent=2)


# ---------------------------------------------------------------------------
# Server factory
# ---------------------------------------------------------------------------


def create_server(
    examples_path: str | None = None,
    github_repo: str | None = None,
    github_branch: str | None = None,
    enable_github_fallback: bool = True,
) -> Server:
    """Create and configure the MCP server with all tools and resources.

    Args:
        examples_path: Optional path to the examples/ directory.
            Defaults to auto-detection relative to the package or cwd.
        github_repo: GitHub repo in "owner/name" format for fetching examples
            when local directory is unavailable.
        github_branch: Branch to fetch examples from when using GitHub fallback.
        enable_github_fallback: Whether to fetch from GitHub when local
            examples are unavailable. Defaults to True.
    """

    registry = ConstructRegistry()

    github_kwargs: dict = {}
    if github_repo is not None:
        github_kwargs["github_repo"] = github_repo
    if github_branch is not None:
        github_kwargs["github_branch"] = github_branch

    example_registry = ExampleRegistry(
        examples_path=examples_path,
        enable_github_fallback=enable_github_fallback,
        **github_kwargs,
    )

    # Lazy-init generator only when needed (avoids import cost at startup)
    _generator = None

    def _get_generator():
        nonlocal _generator
        if _generator is None:
            from mcp_server_constructs.generator import CodeGenerator
            _generator = CodeGenerator(registry)
        return _generator

    server = Server(
        name="mcp-appmod-catalog-blueprints",
        version=__version__,
        instructions=(
            "MCP server for the AppMod Catalog Blueprints CDK library. "
            "Use scaffold tools to generate construct instantiation code, "
            "compose tools to wire multiple constructs together, "
            "list_examples to discover ready-to-deploy example applications, "
            "and resources to browse construct documentation and examples."
        ),
    )

    # ------------------------------------------------------------------
    # Tool listing
    # ------------------------------------------------------------------

    @server.list_tools()
    async def list_tools() -> list[types.Tool]:
        tools: list[types.Tool] = []
        for tool_name, _family, description in _FAMILY_TOOLS:
            tools.append(
                types.Tool(
                    name=tool_name,
                    description=description,
                    inputSchema=_SCAFFOLD_INPUT_SCHEMA,
                )
            )
        tools.append(
            types.Tool(
                name="compose_constructs",
                description=(
                    "Compose multiple constructs into a single wired-up code "
                    "snippet with correct dependency ordering and cross-references."
                ),
                inputSchema=_COMPOSE_INPUT_SCHEMA,
            )
        )
        tools.append(
            types.Tool(
                name="list_examples",
                description=(
                    "Discover ready-to-deploy example applications. Filter by "
                    "category (e.g. 'document-processing') or by construct usage "
                    "(e.g. 'AgenticDocumentProcessing'). Returns example metadata "
                    "including constructs used, paths, and descriptions."
                ),
                inputSchema=_LIST_EXAMPLES_INPUT_SCHEMA,
            )
        )
        return tools

    # ------------------------------------------------------------------
    # Tool dispatch
    # ------------------------------------------------------------------

    # Build a lookup from tool name → family key
    _tool_family: dict[str, str] = {
        name: family for name, family, _ in _FAMILY_TOOLS
    }

    @server.call_tool()
    async def call_tool(
        name: str, arguments: dict | None
    ) -> types.CallToolResult:
        arguments = arguments or {}

        # Degraded mode check
        if not registry.is_loaded:
            return _DEGRADED_ERROR

        # --- Scaffold tools ---
        if name in _tool_family:
            family = _tool_family[name]
            construct_type = arguments.get("constructType")
            if not construct_type:
                return _text_result(
                    "Missing required parameter 'constructType'.", is_error=True
                )

            # Validate constructType against the family
            try:
                valid_types = registry.get_construct_types(family)
            except UnknownFamilyError:
                return _text_result(
                    f"Internal error: family '{family}' not found in registry.",
                    is_error=True,
                )

            if construct_type not in valid_types:
                return _text_result(
                    f"Unknown constructType '{construct_type}' for tool '{name}'. "
                    f"Valid types: {', '.join(sorted(valid_types))}",
                    is_error=True,
                )

            language = arguments.get("language", "typescript")
            props_overrides = arguments.get("props")

            try:
                snippet = _get_generator().scaffold(
                    construct_name=construct_type,
                    language=language,
                    props_overrides=props_overrides,
                )
                return _text_result(snippet)
            except Exception as exc:
                logger.exception("Scaffold failed for %s", construct_type)
                return _text_result(f"Scaffold error: {exc}", is_error=True)

        # --- Compose tool ---
        if name == "compose_constructs":
            constructs = arguments.get("constructs")
            if not constructs or not isinstance(constructs, list):
                return _text_result(
                    "Missing or invalid 'constructs' parameter. "
                    "Provide a list of construct class names.",
                    is_error=True,
                )

            language = arguments.get("language", "typescript")
            props_overrides = arguments.get("props")

            try:
                snippet = _get_generator().compose(
                    constructs=constructs,
                    language=language,
                    props_overrides=props_overrides,
                )
                return _text_result(snippet)
            except CircularDependencyError as exc:
                return _text_result(str(exc), is_error=True)
            except IncompatibleConstructsError as exc:
                return _text_result(str(exc), is_error=True)
            except UnknownConstructError as exc:
                return _text_result(str(exc), is_error=True)
            except Exception as exc:
                logger.exception("Compose failed")
                return _text_result(f"Compose error: {exc}", is_error=True)

        # --- List examples tool ---
        if name == "list_examples":
            if not example_registry.is_loaded:
                return _text_result(
                    "No examples found. The examples/ directory could not be "
                    "located. Ensure the server is run from the repository root "
                    "or pass --examples-path.",
                    is_error=True,
                )

            construct_filter = arguments.get("construct")
            category_filter = arguments.get("category")

            if construct_filter:
                examples = example_registry.find_by_construct(construct_filter)
                if not examples:
                    return _text_result(
                        f"No examples found using construct '{construct_filter}'. "
                        f"Available constructs in examples: "
                        f"{', '.join(sorted(example_registry.get_all_constructs_used().keys()))}",
                        is_error=True,
                    )
            else:
                examples = example_registry.list_examples(category=category_filter)
                if not examples:
                    cats = [c.name for c in example_registry.list_categories()]
                    return _text_result(
                        f"No examples found for category '{category_filter}'. "
                        f"Available categories: {', '.join(cats)}",
                        is_error=True,
                    )

            result = [_format_example_summary(ex) for ex in examples]
            return _text_result(json.dumps(result, indent=2))

        return _text_result(f"Unknown tool: '{name}'", is_error=True)

    # ------------------------------------------------------------------
    # Resource listing
    # ------------------------------------------------------------------

    @server.list_resources()
    async def list_resources() -> list[types.Resource]:
        resources: list[types.Resource] = [
            types.Resource(
                uri="constructs://catalog",
                name="Construct Catalog",
                description="Full catalog of all construct families and constructs.",
                mimeType="application/json",
            ),
        ]
        # Add individual construct resources if registry is loaded
        if registry.is_loaded:
            try:
                for family_info in registry.list_families():
                    for construct_name in family_info.constructs:
                        resources.append(
                            types.Resource(
                                uri=f"constructs://{family_info.name}/{construct_name}",
                                name=construct_name,
                                description=f"Documentation and props for {construct_name}.",
                                mimeType="application/json",
                            ),
                        )
            except DegradedModeError:
                pass

        # Add examples catalog and individual example resources
        if example_registry.is_loaded:
            resources.append(
                types.Resource(
                    uri="examples://catalog",
                    name="Examples Catalog",
                    description="Full catalog of all example categories and applications.",
                    mimeType="application/json",
                ),
            )
            for ex in example_registry.list_examples():
                resources.append(
                    types.Resource(
                        uri=f"examples://{ex.category}/{ex.name}",
                        name=ex.display_name,
                        description=(
                            f"{ex.description[:120]}..."
                            if len(ex.description) > 120
                            else ex.description
                        ) or f"Example: {ex.display_name}",
                        mimeType="application/json",
                    ),
                )

        return resources

    @server.list_resource_templates()
    async def list_resource_templates() -> list[types.ResourceTemplate]:
        return [
            types.ResourceTemplate(
                uriTemplate="constructs://{family}/{construct}",
                name="Construct Documentation",
                description=(
                    "Documentation, props interface, and defaults for a "
                    "specific construct. Use the catalog resource to discover "
                    "valid family and construct names."
                ),
                mimeType="application/json",
            ),
            types.ResourceTemplate(
                uriTemplate="examples://{category}/{example}",
                name="Example Application",
                description=(
                    "Full details for a specific example application including "
                    "README, constructs used, and file paths. Use the examples "
                    "catalog resource to discover valid category and example names."
                ),
                mimeType="application/json",
            ),
        ]

    # ------------------------------------------------------------------
    # Resource reading
    # ------------------------------------------------------------------

    @server.read_resource()
    async def read_resource(uri) -> list[ReadResourceContents]:
        uri_str = str(uri)

        # --- Construct resources (degraded mode applies) ---

        # constructs://catalog
        if uri_str == "constructs://catalog":
            if not registry.is_loaded:
                return [ReadResourceContents(content=_DEGRADED_RESOURCE_TEXT, mime_type="text/plain")]
            try:
                catalog = registry.get_catalog()
                return [ReadResourceContents(content=_format_catalog(catalog), mime_type="application/json")]
            except DegradedModeError:
                return [ReadResourceContents(content=_DEGRADED_RESOURCE_TEXT, mime_type="text/plain")]

        # constructs://{family}/{construct}
        if uri_str.startswith("constructs://"):
            if not registry.is_loaded:
                return [ReadResourceContents(content=_DEGRADED_RESOURCE_TEXT, mime_type="text/plain")]
            path = uri_str[len("constructs://"):]
            parts = path.split("/", 1)
            if len(parts) == 2:
                _family, construct_name = parts
                try:
                    info = registry.get_construct(construct_name)
                    return [ReadResourceContents(content=_format_construct(info), mime_type="application/json")]
                except UnknownConstructError as exc:
                    return [ReadResourceContents(content=str(exc), mime_type="text/plain")]
                except DegradedModeError:
                    return [ReadResourceContents(content=_DEGRADED_RESOURCE_TEXT, mime_type="text/plain")]

        # --- Example resources ---

        # examples://catalog
        if uri_str == "examples://catalog":
            if not example_registry.is_loaded:
                return [ReadResourceContents(
                    content="No examples found. The examples/ directory could not be located.",
                    mime_type="text/plain",
                )]
            return [ReadResourceContents(
                content=_format_examples_catalog(example_registry),
                mime_type="application/json",
            )]

        # examples://{category}/{example}
        if uri_str.startswith("examples://"):
            path = uri_str[len("examples://"):]
            parts = path.split("/", 1)
            if len(parts) == 2:
                category, example_name = parts
                ex = example_registry.get_example(category, example_name)
                if ex:
                    return [ReadResourceContents(
                        content=_format_example_detail(ex),
                        mime_type="application/json",
                    )]
                return [ReadResourceContents(
                    content=f"Unknown example: '{category}/{example_name}'.",
                    mime_type="text/plain",
                )]

        return [
            ReadResourceContents(
                content=f"Unknown resource URI: {uri_str}",
                mime_type="text/plain",
            )
        ]

    return server
