"""Tests for MCP server examples integration: tool, resources, and edge cases."""

import asyncio
import json
import textwrap
from unittest.mock import patch

import pytest

from mcp import types

from mcp_server_constructs.server import (
    _format_example_detail,
    _format_example_summary,
    _format_examples_catalog,
    create_server,
)
from mcp_server_constructs.examples import ExampleInfo, ExampleRegistry


# ── Helpers ──────────────────────────────────────────────────────


def _run(coro):
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


async def _read_resource(server, uri):
    handler = server.request_handlers[types.ReadResourceRequest]
    req = types.ReadResourceRequest(
        method="resources/read",
        params=types.ReadResourceRequestParams(uri=uri),
    )
    result = await handler(req)
    return result.root.contents


def _get_text(contents):
    """Extract text from resource contents (handles both attribute names)."""
    item = contents[0]
    # MCP library may use .text or .content depending on version
    if hasattr(item, "text"):
        return item.text
    return item.content


# ── Fixture: server with fake examples ───────────────────────────


@pytest.fixture
def fake_examples(tmp_path):
    """Create a minimal examples directory for server testing."""
    ex_dir = tmp_path / "examples" / "document-processing" / "fraud-detection"
    ex_dir.mkdir(parents=True)

    (ex_dir / "README.md").write_text(textwrap.dedent("""\
        # Fraud Detection

        Multi-tool fraud detection using AgenticDocumentProcessing.

        ## Architecture
        Uses Step Functions with Bedrock agents.
    """))

    (ex_dir / "fraud-detection-stack.ts").write_text(textwrap.dedent("""\
        import { AgenticDocumentProcessing, QueuedS3Adapter } from '@cdklabs/cdk-appmod-catalog-blueprints';
        export class FraudDetectionStack {}
    """))

    (ex_dir / "app.ts").write_text("// entry\n")
    (ex_dir / "resources").mkdir()
    (ex_dir / "sample-files").mkdir()

    return str(tmp_path / "examples")


@pytest.fixture
def server_with_examples(fake_examples):
    return create_server(examples_path=fake_examples)


@pytest.fixture
def server_no_examples(tmp_path):
    return create_server(
        examples_path=str(tmp_path / "nonexistent"),
        enable_github_fallback=False,
    )


# ── Tool listing ─────────────────────────────────────────────────


class TestToolListing:
    def test_list_examples_tool_advertised(self, server_with_examples):
        tools = _run(_list_tools(server_with_examples))
        names = [t.name for t in tools]
        assert "list_examples" in names

    def test_list_examples_tool_has_correct_schema(self, server_with_examples):
        tools = _run(_list_tools(server_with_examples))
        tool = next(t for t in tools if t.name == "list_examples")
        props = tool.inputSchema.get("properties", {})
        assert "category" in props
        assert "construct" in props

    def test_total_tool_count(self, server_with_examples):
        tools = _run(_list_tools(server_with_examples))
        # 5 scaffold + compose + list_examples = 7
        assert len(tools) == 7


# ── list_examples tool ───────────────────────────────────────────


class TestListExamplesTool:
    def test_list_all_examples(self, server_with_examples):
        result = _run(_call_tool(server_with_examples, "list_examples"))
        assert result.isError is False
        data = json.loads(result.content[0].text)
        assert len(data) == 1
        assert data[0]["name"] == "fraud-detection"

    def test_filter_by_category(self, server_with_examples):
        result = _run(_call_tool(server_with_examples, "list_examples", {
            "category": "document-processing",
        }))
        assert result.isError is False
        data = json.loads(result.content[0].text)
        assert len(data) == 1

    def test_filter_by_construct(self, server_with_examples):
        result = _run(_call_tool(server_with_examples, "list_examples", {
            "construct": "AgenticDocumentProcessing",
        }))
        assert result.isError is False
        data = json.loads(result.content[0].text)
        assert len(data) == 1
        assert "AgenticDocumentProcessing" in data[0]["constructsUsed"]

    def test_filter_by_unknown_construct(self, server_with_examples):
        result = _run(_call_tool(server_with_examples, "list_examples", {
            "construct": "NonExistent",
        }))
        assert result.isError is True
        assert "NonExistent" in result.content[0].text

    def test_filter_by_unknown_category(self, server_with_examples):
        result = _run(_call_tool(server_with_examples, "list_examples", {
            "category": "nonexistent",
        }))
        assert result.isError is True

    def test_no_examples_loaded(self, server_no_examples):
        result = _run(_call_tool(server_no_examples, "list_examples"))
        assert result.isError is True
        assert "No examples found" in result.content[0].text

    def test_example_summary_fields(self, server_with_examples):
        result = _run(_call_tool(server_with_examples, "list_examples"))
        data = json.loads(result.content[0].text)
        ex = data[0]
        assert "name" in ex
        assert "category" in ex
        assert "displayName" in ex
        assert "description" in ex
        assert "constructsUsed" in ex
        assert "path" in ex
        assert "hasAgentResources" in ex
        assert "hasSampleFiles" in ex


# ── Resource listing ─────────────────────────────────────────────


class TestExampleResources:
    def test_examples_catalog_in_resources(self, server_with_examples):
        resources = _run(_list_resources(server_with_examples))
        uris = [str(r.uri) for r in resources]
        assert "examples://catalog" in uris

    def test_individual_example_in_resources(self, server_with_examples):
        resources = _run(_list_resources(server_with_examples))
        uris = [str(r.uri) for r in resources]
        assert "examples://document-processing/fraud-detection" in uris

    def test_no_example_resources_when_not_loaded(self, server_no_examples):
        resources = _run(_list_resources(server_no_examples))
        uris = [str(r.uri) for r in resources]
        assert "examples://catalog" not in uris

    def test_examples_resource_template_advertised(self, server_with_examples):
        templates = _run(_list_resource_templates(server_with_examples))
        uri_templates = [t.uriTemplate for t in templates]
        assert "examples://{category}/{example}" in uri_templates


# ── Resource reading ─────────────────────────────────────────────


class TestReadExampleResources:
    def test_read_examples_catalog(self, server_with_examples):
        contents = _run(_read_resource(server_with_examples, "examples://catalog"))
        data = json.loads(_get_text(contents))
        assert "categories" in data
        assert "constructUsage" in data
        cats = [c["name"] for c in data["categories"]]
        assert "document-processing" in cats

    def test_read_individual_example(self, server_with_examples):
        contents = _run(_read_resource(
            server_with_examples,
            "examples://document-processing/fraud-detection",
        ))
        data = json.loads(_get_text(contents))
        assert data["name"] == "fraud-detection"
        assert "readme" in data
        assert "stackFiles" in data
        assert "# Fraud Detection" in data["readme"]

    def test_read_unknown_example(self, server_with_examples):
        contents = _run(_read_resource(
            server_with_examples,
            "examples://document-processing/nonexistent",
        ))
        assert "Unknown example" in _get_text(contents)

    def test_read_examples_catalog_not_loaded(self, server_no_examples):
        contents = _run(_read_resource(server_no_examples, "examples://catalog"))
        assert "No examples found" in _get_text(contents)


# ── Formatting helpers ───────────────────────────────────────────


class TestFormatting:
    def test_format_example_summary(self):
        info = ExampleInfo(
            name="test-ex",
            category="testing",
            display_name="Test Ex",
            description="A test example.",
            constructs_used=["Network", "Frontend"],
            stack_files=["examples/testing/test-ex/stack.ts"],
            has_agent_resources=False,
            has_sample_files=True,
            readme_content="# Test\n",
            relative_path="examples/testing/test-ex",
        )
        result = _format_example_summary(info)
        assert result["name"] == "test-ex"
        assert result["constructsUsed"] == ["Network", "Frontend"]
        assert "readme" not in result  # summary excludes readme

    def test_format_example_detail_includes_readme(self):
        info = ExampleInfo(
            name="test-ex",
            category="testing",
            display_name="Test Ex",
            description="A test example.",
            constructs_used=["Network"],
            stack_files=["stack.ts"],
            has_agent_resources=False,
            has_sample_files=False,
            readme_content="# Full README content here",
            relative_path="examples/testing/test-ex",
        )
        data = json.loads(_format_example_detail(info))
        assert "readme" in data
        assert "# Full README content here" in data["readme"]
        assert "stackFiles" in data
