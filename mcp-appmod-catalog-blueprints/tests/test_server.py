"""Tests for MCP server: tool/resource registration, dispatch, and degraded mode."""

import asyncio
import json
from unittest.mock import patch

import pytest

from mcp import types

from mcp_server_constructs.server import create_server


# ── Helpers ──────────────────────────────────────────────────────


def _run(coro):
    """Run an async coroutine synchronously."""
    return asyncio.run(coro)


async def _list_tools(server):
    handler = server.request_handlers[types.ListToolsRequest]
    req = types.ListToolsRequest(method="tools/list")
    result = await handler(req)
    return result.root.tools


async def _call_tool(server, name, arguments=None):
    handler = server.request_handlers[types.CallToolRequest]
    req = types.CallToolRequest(
        method="tools/call",
        params=types.CallToolRequestParams(name=name, arguments=arguments or {}),
    )
    result = await handler(req)
    return result.root


async def _list_resources(server):
    handler = server.request_handlers[types.ListResourcesRequest]
    req = types.ListResourcesRequest(method="resources/list")
    result = await handler(req)
    return result.root.resources


async def _list_resource_templates(server):
    handler = server.request_handlers[types.ListResourceTemplatesRequest]
    req = types.ListResourceTemplatesRequest(method="resources/templates/list")
    result = await handler(req)
    return result.root.resourceTemplates



# ── Fixtures ─────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def server():
    """Create the MCP server backed by the real bundled .jsii manifest."""
    return create_server()


@pytest.fixture
def degraded_server(tmp_path):
    """Create an MCP server with a missing .jsii manifest (degraded mode)."""
    with patch(
        "mcp_server_constructs.registry._default_jsii_path",
        return_value=str(tmp_path / "nonexistent.jsii"),
    ):
        return create_server()


# ── Initialization & tool listing ────────────────────────────────


EXPECTED_TOOLS = [
    "scaffold_document_processing",
    "scaffold_agents",
    "scaffold_webapp",
    "scaffold_foundation",
    "scaffold_utilities",
    "compose_constructs",
    "list_examples",
]


class TestInitialization:
    def test_advertises_all_seven_tools(self, server):
        tools = _run(_list_tools(server))
        tool_names = [t.name for t in tools]
        assert len(tool_names) == 7
        for expected in EXPECTED_TOOLS:
            assert expected in tool_names

    def test_scaffold_tools_have_construct_type_param(self, server):
        tools = _run(_list_tools(server))
        scaffold_tools = [t for t in tools if t.name.startswith("scaffold_")]
        for tool in scaffold_tools:
            props = tool.inputSchema.get("properties", {})
            assert "constructType" in props
            assert "constructType" in tool.inputSchema.get("required", [])

    def test_compose_tool_has_constructs_param(self, server):
        tools = _run(_list_tools(server))
        compose = next(t for t in tools if t.name == "compose_constructs")
        props = compose.inputSchema.get("properties", {})
        assert "constructs" in props
        assert "constructs" in compose.inputSchema.get("required", [])

    def test_all_tools_accept_language_param(self, server):
        tools = _run(_list_tools(server))
        # All tools except list_examples accept a language param
        for tool in tools:
            if tool.name == "list_examples":
                continue
            props = tool.inputSchema.get("properties", {})
            assert "language" in props

    def test_resource_templates_advertised(self, server):
        templates = _run(_list_resource_templates(server))
        assert len(templates) >= 1
        uri_templates = [t.uriTemplate for t in templates]
        assert "constructs://{family}/{construct}" in uri_templates

    def test_resources_include_catalog(self, server):
        resources = _run(_list_resources(server))
        uris = [str(r.uri) for r in resources]
        assert "constructs://catalog" in uris

    def test_resources_include_individual_constructs(self, server):
        resources = _run(_list_resources(server))
        uris = [str(r.uri) for r in resources]
        # Should have catalog + individual construct resources
        assert len(uris) > 1
        # Check a known construct is listed
        construct_uris = [u for u in uris if u != "constructs://catalog"]
        assert any("foundation/Network" in u for u in construct_uris)



# ── Scaffold tools with valid constructType ──────────────────────


class TestScaffoldValid:
    def test_scaffold_foundation_network(self, server):
        result = _run(_call_tool(server, "scaffold_foundation", {
            "constructType": "Network",
        }))
        assert result.isError is False
        text = result.content[0].text
        assert "Network" in text
        assert "import" in text

    def test_scaffold_document_processing(self, server):
        result = _run(_call_tool(server, "scaffold_document_processing", {
            "constructType": "BedrockDocumentProcessing",
        }))
        assert result.isError is False
        text = result.content[0].text
        assert "BedrockDocumentProcessing" in text

    def test_scaffold_agents(self, server):
        result = _run(_call_tool(server, "scaffold_agents", {
            "constructType": "BatchAgent",
        }))
        assert result.isError is False
        text = result.content[0].text
        assert "BatchAgent" in text

    def test_scaffold_webapp(self, server):
        result = _run(_call_tool(server, "scaffold_webapp", {
            "constructType": "Frontend",
        }))
        assert result.isError is False
        text = result.content[0].text
        assert "Frontend" in text

    def test_scaffold_utilities(self, server):
        result = _run(_call_tool(server, "scaffold_utilities", {
            "constructType": "DataLoader",
        }))
        assert result.isError is False
        text = result.content[0].text
        assert "DataLoader" in text

    def test_scaffold_with_language_python(self, server):
        result = _run(_call_tool(server, "scaffold_foundation", {
            "constructType": "Network",
            "language": "python",
        }))
        assert result.isError is False
        text = result.content[0].text
        # Python uses 'from ... import' style
        assert "import" in text.lower()

    def test_scaffold_with_props_overrides(self, server):
        result = _run(_call_tool(server, "scaffold_foundation", {
            "constructType": "Network",
            "props": {"maxAzs": "3"},
        }))
        assert result.isError is False
        text = result.content[0].text
        assert "3" in text

    def test_scaffold_returns_code_snippet_string(self, server):
        result = _run(_call_tool(server, "scaffold_webapp", {
            "constructType": "Frontend",
        }))
        assert result.isError is False
        assert len(result.content) == 1
        assert result.content[0].type == "text"
        assert isinstance(result.content[0].text, str)
        assert len(result.content[0].text) > 0



# ── Scaffold tools with invalid constructType ────────────────────


class TestScaffoldInvalid:
    def test_invalid_construct_type_returns_error(self, server):
        result = _run(_call_tool(server, "scaffold_foundation", {
            "constructType": "NonExistentConstruct",
        }))
        assert result.isError is True
        text = result.content[0].text
        assert "NonExistentConstruct" in text
        # Should list valid types for the family
        assert "Network" in text

    def test_invalid_construct_type_for_agents(self, server):
        result = _run(_call_tool(server, "scaffold_agents", {
            "constructType": "Network",  # Network is foundation, not agents
        }))
        assert result.isError is True
        text = result.content[0].text
        assert "Network" in text
        assert "BatchAgent" in text

    def test_missing_construct_type_returns_error(self, server):
        result = _run(_call_tool(server, "scaffold_foundation", {}))
        assert result.isError is True
        text = result.content[0].text
        assert "constructType" in text

    def test_unknown_tool_returns_error(self, server):
        result = _run(_call_tool(server, "nonexistent_tool", {}))
        assert result.isError is True
        assert "Unknown tool" in result.content[0].text



# ── Compose tool ─────────────────────────────────────────────────


class TestCompose:
    def test_compose_valid_constructs(self, server):
        result = _run(_call_tool(server, "compose_constructs", {
            "constructs": ["Network", "BedrockDocumentProcessing"],
        }))
        assert result.isError is False
        text = result.content[0].text
        assert "Network" in text
        assert "BedrockDocumentProcessing" in text

    def test_compose_missing_constructs_param(self, server):
        result = _run(_call_tool(server, "compose_constructs", {}))
        assert result.isError is True
        assert "constructs" in result.content[0].text.lower()

    def test_compose_empty_constructs_list(self, server):
        result = _run(_call_tool(server, "compose_constructs", {
            "constructs": [],
        }))
        assert result.isError is True

    def test_compose_with_language(self, server):
        result = _run(_call_tool(server, "compose_constructs", {
            "constructs": ["Network", "Frontend"],
            "language": "python",
        }))
        assert result.isError is False
        text = result.content[0].text
        assert "import" in text.lower()

    def test_compose_unknown_construct_returns_error(self, server):
        result = _run(_call_tool(server, "compose_constructs", {
            "constructs": ["Network", "DoesNotExist"],
        }))
        assert result.isError is True
        assert "DoesNotExist" in result.content[0].text



# ── Catalog resource ─────────────────────────────────────────────


class TestCatalogResource:
    def test_catalog_format_contains_families(self, server):
        """Verify the catalog formatting includes all families and constructs."""
        from mcp_server_constructs.server import _format_catalog
        from mcp_server_constructs.registry import ConstructRegistry

        reg = ConstructRegistry()
        catalog = reg.get_catalog()
        text = _format_catalog(catalog)
        data = json.loads(text)

        assert "families" in data
        assert "libraryName" in data
        assert "libraryVersion" in data

        family_names = [f["name"] for f in data["families"]]
        assert "document-processing" in family_names
        assert "agents" in family_names
        assert "foundation" in family_names
        assert "webapp" in family_names
        assert "utilities" in family_names

    def test_catalog_families_have_constructs(self, server):
        from mcp_server_constructs.server import _format_catalog
        from mcp_server_constructs.registry import ConstructRegistry

        reg = ConstructRegistry()
        catalog = reg.get_catalog()
        data = json.loads(_format_catalog(catalog))

        for family in data["families"]:
            assert "constructs" in family
            assert len(family["constructs"]) > 0
            assert "displayName" in family

    def test_catalog_known_constructs_present(self, server):
        from mcp_server_constructs.server import _format_catalog
        from mcp_server_constructs.registry import ConstructRegistry

        reg = ConstructRegistry()
        catalog = reg.get_catalog()
        data = json.loads(_format_catalog(catalog))

        all_constructs = []
        for family in data["families"]:
            all_constructs.extend(family["constructs"])

        assert "BedrockDocumentProcessing" in all_constructs
        assert "Network" in all_constructs
        assert "Frontend" in all_constructs
        assert "BatchAgent" in all_constructs



# ── Construct resource ───────────────────────────────────────────


class TestConstructResource:
    def test_construct_format_contains_props(self):
        """Verify construct formatting includes props with types and descriptions."""
        from mcp_server_constructs.server import _format_construct
        from mcp_server_constructs.registry import ConstructRegistry

        reg = ConstructRegistry()
        info = reg.get_construct("BedrockDocumentProcessing")
        text = _format_construct(info)
        data = json.loads(text)

        assert data["name"] == "BedrockDocumentProcessing"
        assert "props" in data
        assert len(data["props"]) > 0

    def test_construct_props_have_required_fields(self):
        from mcp_server_constructs.server import _format_construct
        from mcp_server_constructs.registry import ConstructRegistry

        reg = ConstructRegistry()
        info = reg.get_construct("Network")
        data = json.loads(_format_construct(info))

        for prop in data["props"]:
            assert "name" in prop
            assert "type" in prop
            assert "required" in prop
            assert "description" in prop

    def test_construct_format_includes_metadata(self):
        from mcp_server_constructs.server import _format_construct
        from mcp_server_constructs.registry import ConstructRegistry

        reg = ConstructRegistry()
        info = reg.get_construct("Frontend")
        data = json.loads(_format_construct(info))

        assert data["name"] == "Frontend"
        assert "fqn" in data
        assert "family" in data
        assert data["family"] == "webapp"
        assert "isAbstract" in data

    def test_construct_ref_prop_includes_ref_name(self):
        from mcp_server_constructs.server import _format_prop
        from mcp_server_constructs.models import PropInfo

        prop = PropInfo(
            name="network",
            type_name="Network",
            description="The VPC network.",
            required=False,
            default_value=None,
            is_construct_ref=True,
            construct_ref_name="Network",
        )
        formatted = _format_prop(prop)
        assert formatted["constructRef"] == "Network"

    def test_prop_without_default_omits_default_key(self):
        from mcp_server_constructs.server import _format_prop
        from mcp_server_constructs.models import PropInfo

        prop = PropInfo(
            name="prompt",
            type_name="string",
            description="A prompt.",
            required=True,
            default_value=None,
            is_construct_ref=False,
            construct_ref_name=None,
        )
        formatted = _format_prop(prop)
        assert "default" not in formatted

    def test_prop_with_default_includes_default_key(self):
        from mcp_server_constructs.server import _format_prop
        from mcp_server_constructs.models import PropInfo

        prop = PropInfo(
            name="enabled",
            type_name="boolean",
            description="Enable feature.",
            required=False,
            default_value="true",
            is_construct_ref=False,
            construct_ref_name=None,
        )
        formatted = _format_prop(prop)
        assert formatted["default"] == "true"



# ── Degraded mode ────────────────────────────────────────────────


class TestDegradedMode:
    def test_degraded_server_starts(self, degraded_server):
        """Server starts even when .jsii is missing."""
        tools = _run(_list_tools(degraded_server))
        assert len(tools) == 7

    def test_degraded_scaffold_returns_error(self, degraded_server):
        result = _run(_call_tool(degraded_server, "scaffold_foundation", {
            "constructType": "Network",
        }))
        assert result.isError is True
        text = result.content[0].text
        assert "JSII metadata unavailable" in text
        assert "reinstall" in text.lower()

    def test_degraded_compose_returns_error(self, degraded_server):
        result = _run(_call_tool(degraded_server, "compose_constructs", {
            "constructs": ["Network"],
        }))
        assert result.isError is True
        assert "JSII metadata unavailable" in result.content[0].text

    def test_degraded_resources_list_has_catalog_only(self, degraded_server):
        resources = _run(_list_resources(degraded_server))
        uris = [str(r.uri) for r in resources]
        # Catalog is always listed; individual constructs are not
        assert "constructs://catalog" in uris
        # No individual construct resources since registry isn't loaded
        construct_uris = [u for u in uris if u.startswith("constructs://") and u != "constructs://catalog"]
        assert len(construct_uris) == 0

    def test_degraded_all_scaffold_tools_return_error(self, degraded_server):
        for tool_name in EXPECTED_TOOLS:
            if tool_name in ("compose_constructs", "list_examples"):
                continue
            result = _run(_call_tool(degraded_server, tool_name, {
                "constructType": "Anything",
            }))
            assert result.isError is True, f"{tool_name} should return error in degraded mode"
            assert "JSII metadata unavailable" in result.content[0].text
