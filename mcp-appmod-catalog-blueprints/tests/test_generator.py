"""Tests for CodeGenerator: scaffold and compose snippet generation.

Covers TypeScript scaffold for each construct family, prop overrides,
missing required props (TODO placeholders), type-mismatched props
(WARNING comments), multi-language conventions, and compose delegation.

Requirements: 1.2, 1.3, 1.4, 6.1, 6.4, 7.1–7.4
"""

from __future__ import annotations

import sys
from unittest.mock import MagicMock, patch

import pytest

from mcp_server_constructs.defaults import SMART_DEFAULTS
from mcp_server_constructs.generator import CodeGenerator
from mcp_server_constructs.models import Language
from mcp_server_constructs.registry import ConstructRegistry


# ── Helpers ──────────────────────────────────────────────────────


def _make_props_interface(fqn: str, props: list[dict]) -> dict:
    return {
        "kind": "interface",
        "name": fqn.rsplit(".", 1)[-1],
        "fqn": fqn,
        "datatype": True,
        "properties": props,
    }


def _make_construct(
    name: str,
    filename: str,
    props_fqn: str | None = None,
    base: str = "constructs.Construct",
) -> dict:
    params = [
        {"name": "scope", "type": {"fqn": "constructs.Construct"}},
        {"name": "id", "type": {"primitive": "string"}},
    ]
    if props_fqn:
        params.append({"name": "props", "type": {"fqn": props_fqn}})
    return {
        "kind": "class",
        "name": name,
        "fqn": f"@cdklabs/cdk-appmod-catalog-blueprints.{name}",
        "assembly": "@cdklabs/cdk-appmod-catalog-blueprints",
        "base": base,
        "docs": {"summary": f"{name} construct."},
        "locationInModule": {"filename": filename},
        "initializer": {"parameters": params},
    }


def _build_registry(types: dict) -> ConstructRegistry:
    data = {
        "name": "@cdklabs/cdk-appmod-catalog-blueprints",
        "version": "0.1.0",
        "types": types,
    }
    return ConstructRegistry.from_dict(data)


# ── Fixtures ─────────────────────────────────────────────────────

LIB = "@cdklabs/cdk-appmod-catalog-blueprints"


@pytest.fixture
def doc_processing_registry():
    """Registry with a BedrockDocumentProcessing construct (document-processing family)."""
    props_fqn = f"{LIB}.BedrockDocumentProcessingProps"
    props_iface = _make_props_interface(props_fqn, [
        {
            "name": "classificationPrompt",
            "docs": {"summary": "Prompt for classification."},
            "type": {"primitive": "string"},
            "optional": False,
        },
        {
            "name": "processingPrompt",
            "docs": {"summary": "Prompt for processing."},
            "type": {"primitive": "string"},
            "optional": False,
        },
        {
            "name": "encryptionKey",
            "docs": {"summary": "KMS key for encryption.", "default": "auto-generated"},
            "type": {"primitive": "string"},
            "optional": True,
        },
        {
            "name": "removalPolicy",
            "docs": {"summary": "Removal policy.", "default": "DESTROY"},
            "type": {"primitive": "string"},
            "optional": True,
        },
        {
            "name": "enableObservability",
            "docs": {"summary": "Enable observability.", "default": "false"},
            "type": {"primitive": "boolean"},
            "optional": True,
        },
    ])
    construct = _make_construct(
        "BedrockDocumentProcessing",
        "use-cases/document-processing/bedrock-doc.ts",
        props_fqn,
    )
    return _build_registry({
        construct["fqn"]: construct,
        props_fqn: props_iface,
    })


@pytest.fixture
def agents_registry():
    """Registry with a BatchAgent construct (agents family)."""
    props_fqn = f"{LIB}.BatchAgentProps"
    props_iface = _make_props_interface(props_fqn, [
        {
            "name": "systemPrompt",
            "docs": {"summary": "System prompt for the agent."},
            "type": {"primitive": "string"},
            "optional": False,
        },
        {
            "name": "enableObservability",
            "docs": {"summary": "Enable observability.", "default": "false"},
            "type": {"primitive": "boolean"},
            "optional": True,
        },
    ])
    construct = _make_construct(
        "BatchAgent",
        "use-cases/framework/agents/batch-agent.ts",
        props_fqn,
    )
    return _build_registry({
        construct["fqn"]: construct,
        props_fqn: props_iface,
    })


@pytest.fixture
def webapp_registry():
    """Registry with a Frontend construct (webapp family)."""
    props_fqn = f"{LIB}.FrontendProps"
    props_iface = _make_props_interface(props_fqn, [
        {
            "name": "sourcePath",
            "docs": {"summary": "Path to frontend source."},
            "type": {"primitive": "string"},
            "optional": False,
        },
        {
            "name": "enforceSSL",
            "docs": {"summary": "Enforce HTTPS.", "default": "true"},
            "type": {"primitive": "boolean"},
            "optional": True,
        },
    ])
    construct = _make_construct(
        "Frontend",
        "use-cases/webapp/frontend.ts",
        props_fqn,
    )
    return _build_registry({
        construct["fqn"]: construct,
        props_fqn: props_iface,
    })


@pytest.fixture
def foundation_registry():
    """Registry with a Network construct (foundation family)."""
    props_fqn = f"{LIB}.NetworkProps"
    props_iface = _make_props_interface(props_fqn, [
        {
            "name": "maxAzs",
            "docs": {"summary": "Maximum availability zones.", "default": "3"},
            "type": {"primitive": "number"},
            "optional": True,
        },
    ])
    construct = _make_construct(
        "Network",
        "use-cases/framework/foundation/network.ts",
        props_fqn,
    )
    return _build_registry({
        construct["fqn"]: construct,
        props_fqn: props_iface,
    })


@pytest.fixture
def utilities_registry():
    """Registry with a ServerlessObservability construct (utilities family)."""
    props_fqn = f"{LIB}.ServerlessObservabilityProps"
    props_iface = _make_props_interface(props_fqn, [
        {
            "name": "enableTracing",
            "docs": {"summary": "Enable X-Ray tracing.", "default": "false"},
            "type": {"primitive": "boolean"},
            "optional": True,
        },
    ])
    construct = _make_construct(
        "ServerlessObservability",
        "use-cases/utilities/observability.ts",
        props_fqn,
    )
    return _build_registry({
        construct["fqn"]: construct,
        props_fqn: props_iface,
    })



# ── TypeScript scaffold per family ───────────────────────────────


class TestScaffoldTypeScriptByFamily:
    """Scaffold each construct family in TypeScript: verify imports,
    instantiation, and smart defaults. (Req 1.2, 1.3, 7.1, 8.1–8.5)"""

    def test_document_processing_imports(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        assert "import { BedrockDocumentProcessing }" in output
        assert "'@cdklabs/cdk-appmod-catalog-blueprints'" in output

    def test_document_processing_instantiation(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        assert "new BedrockDocumentProcessing(this, 'BedrockDocumentProcessing'" in output

    def test_document_processing_smart_defaults(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        # Smart defaults from defaults.py should appear
        assert "enableKeyRotation" in output  # encryptionKey default
        assert "RemovalPolicy.DESTROY" in output
        assert "true" in output  # enableObservability default

    def test_document_processing_observability_section(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        assert "Observability (uncomment to enable)" in output

    def test_agents_scaffold(self, agents_registry):
        gen = CodeGenerator(agents_registry)
        output = gen.scaffold("BatchAgent")
        assert "import { BatchAgent }" in output
        assert "new BatchAgent(this, 'BatchAgent'" in output
        # enableObservability smart default
        assert "true" in output

    def test_webapp_scaffold(self, webapp_registry):
        gen = CodeGenerator(webapp_registry)
        output = gen.scaffold("Frontend")
        assert "import { Frontend }" in output
        assert "new Frontend(this, 'Frontend'" in output
        # enforceSSL smart default
        assert "Enforce HTTPS" in output

    def test_foundation_scaffold(self, foundation_registry):
        gen = CodeGenerator(foundation_registry)
        output = gen.scaffold("Network")
        assert "import { Network }" in output
        assert "new Network(this, 'Network'" in output
        # maxAzs smart default
        assert "Two AZs" in output

    def test_utilities_scaffold(self, utilities_registry):
        gen = CodeGenerator(utilities_registry)
        output = gen.scaffold("ServerlessObservability")
        assert "import { ServerlessObservability }" in output
        assert "new ServerlessObservability(this, 'ServerlessObservability'" in output
        # enableTracing smart default
        assert "X-Ray tracing" in output


# ── Prop overrides ───────────────────────────────────────────────


class TestScaffoldWithOverrides:
    """Overrides replace smart defaults. (Req 1.4)"""

    def test_override_replaces_smart_default(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            props_overrides={"removalPolicy": "RemovalPolicy.RETAIN"},
        )
        assert "RemovalPolicy.RETAIN" in output
        # The original smart default comment should not appear for this prop
        assert "DESTROY for dev" not in output

    def test_override_required_prop(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            props_overrides={"classificationPrompt": "Classify this document"},
        )
        assert "'Classify this document'" in output
        # Should not have a TODO placeholder for this prop
        assert "TODO" not in output or "classificationPrompt" not in output.split("TODO")[1].split("\n")[0]

    def test_override_preserves_other_defaults(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            props_overrides={"removalPolicy": "RemovalPolicy.RETAIN"},
        )
        # Other smart defaults should still be present
        assert "enableKeyRotation" in output  # encryptionKey default still there


# ── Missing required props → TODO placeholders ───────────────────


class TestScaffoldMissingRequiredProps:
    """Missing required props produce TODO placeholders. (Req 6.1)"""

    def test_placeholder_for_missing_required(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        # classificationPrompt and processingPrompt are required with no defaults
        assert "<REQUIRED: string>" in output
        assert "TODO" in output

    def test_placeholder_includes_comment(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        # The TODO comment should mention what to provide
        assert "TODO: Required" in output

    def test_no_placeholder_when_override_provided(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            props_overrides={
                "classificationPrompt": "Classify",
                "processingPrompt": "Process",
            },
        )
        assert "<REQUIRED:" not in output


# ── Type-mismatched props → WARNING comments ─────────────────────


class TestScaffoldTypeMismatch:
    """Type-mismatched props include WARNING comments. (Req 6.4)"""

    def test_string_for_boolean_prop(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            props_overrides={"enableObservability": "yes"},
        )
        assert "WARNING" in output
        assert "expected boolean" in output.lower() or "expected boolean" in output

    def test_string_for_number_prop(self, foundation_registry):
        gen = CodeGenerator(foundation_registry)
        output = gen.scaffold(
            "Network",
            props_overrides={"maxAzs": "three"},
        )
        assert "WARNING" in output
        assert "expected number" in output.lower() or "expected number" in output

    def test_mismatched_value_still_included(self, foundation_registry):
        gen = CodeGenerator(foundation_registry)
        output = gen.scaffold(
            "Network",
            props_overrides={"maxAzs": "three"},
        )
        # The value should be present in the output as-is (formatted as string)
        assert "three" in output

    def test_no_warning_for_correct_type(self, foundation_registry):
        gen = CodeGenerator(foundation_registry)
        output = gen.scaffold(
            "Network",
            props_overrides={"maxAzs": "3"},
        )
        assert "WARNING" not in output


# ── Multi-language conventions ───────────────────────────────────


class TestScaffoldPython:
    """Python scaffold: snake_case, double quotes, 4-space indent, from-import. (Req 7.1)"""

    def test_python_import_style(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing", language="python")
        assert "from @cdklabs/cdk-appmod-catalog-blueprints import BedrockDocumentProcessing" in output

    def test_python_double_quotes(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            language="python",
            props_overrides={"classificationPrompt": "Classify"},
        )
        assert '"Classify"' in output

    def test_python_snake_case_props(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing", language="python")
        assert "classification_prompt" in output
        assert "processing_prompt" in output
        assert "enable_observability" in output

    def test_python_four_space_indent(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing", language="python")
        # Python template uses 4-space indentation for props
        lines = output.split("\n")
        prop_lines = [l for l in lines if "classification_prompt" in l or "processing_prompt" in l]
        for line in prop_lines:
            stripped = line.lstrip()
            indent = len(line) - len(stripped)
            assert indent == 4, f"Expected 4-space indent, got {indent}: {line!r}"


class TestScaffoldJava:
    """Java scaffold: Builder pattern, camelCase, double quotes. (Req 7.1)"""

    def test_java_builder_pattern(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing", language="java")
        assert "Builder.create(this," in output
        assert ".build();" in output

    def test_java_import_style(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing", language="java")
        assert "import @cdklabs/cdk-appmod-catalog-blueprints." in output

    def test_java_camel_case_props(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing", language="java")
        assert ".classificationPrompt(" in output
        assert ".processingPrompt(" in output

    def test_java_double_quotes(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            language="java",
            props_overrides={"classificationPrompt": "Classify"},
        )
        assert '"Classify"' in output


class TestScaffoldDotNet:
    """DotNet scaffold: PascalCase, new FooProps style, double quotes. (Req 7.1)"""

    def test_dotnet_props_style(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing", language="dotnet")
        assert "new BedrockDocumentProcessingProps" in output

    def test_dotnet_using_import(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing", language="dotnet")
        assert "using @cdklabs/cdk-appmod-catalog-blueprints;" in output

    def test_dotnet_pascal_case_props(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing", language="dotnet")
        assert "ClassificationPrompt" in output
        assert "ProcessingPrompt" in output
        assert "EnableObservability" in output

    def test_dotnet_double_quotes(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            language="dotnet",
            props_overrides={"classificationPrompt": "Classify"},
        )
        assert '"Classify"' in output

    def test_dotnet_equals_assignment(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            language="dotnet",
            props_overrides={"classificationPrompt": "Classify"},
        )
        # .NET uses = for assignment in props block
        assert 'ClassificationPrompt = "Classify"' in output



# ── TypeScript format conventions ────────────────────────────────


class TestTypeScriptFormatConventions:
    """TypeScript output follows coding standards: 2-space indent,
    single quotes, semicolons, PascalCase IDs, inline comments. (Req 7.1, 7.3)"""

    def test_two_space_indentation(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        lines = output.split("\n")
        # Find prop lines (inside the constructor block)
        prop_lines = [
            l for l in lines
            if l.strip().startswith("classificationPrompt")
            or l.strip().startswith("processingPrompt")
            or l.strip().startswith("encryptionKey")
            or l.strip().startswith("removalPolicy")
            or l.strip().startswith("enableObservability")
        ]
        for line in prop_lines:
            stripped = line.lstrip()
            indent = len(line) - len(stripped)
            assert indent == 2, f"Expected 2-space indent, got {indent}: {line!r}"

    def test_single_quotes_for_strings(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            props_overrides={"classificationPrompt": "Classify"},
        )
        assert "'Classify'" in output

    def test_semicolons_present(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        # The closing of the constructor should have a semicolon
        assert "});" in output

    def test_pascal_case_construct_id(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        # The construct ID in the constructor should be PascalCase
        assert "'BedrockDocumentProcessing'" in output

    def test_inline_comments_on_smart_defaults(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        # Smart defaults should have inline comments
        assert "// " in output
        # Security defaults get the lock emoji
        assert "🔒" in output


# ── Security defaults ────────────────────────────────────────────


class TestSecurityDefaults:
    """Security-relevant smart defaults are highlighted. (Req 7.2)"""

    def test_security_default_marked(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold("BedrockDocumentProcessing")
        # encryptionKey is security_relevant=True
        assert "🔒" in output
        assert "KMS encryption" in output

    def test_enforce_ssl_marked(self, webapp_registry):
        gen = CodeGenerator(webapp_registry)
        output = gen.scaffold("Frontend")
        assert "🔒" in output
        assert "Enforce HTTPS" in output


# ── Compose with mocked resolver ─────────────────────────────────


class TestCompose:
    """Compose delegates to DependencyResolver and produces wired output. (Req 3.1)"""

    def _patch_resolver(self, mock_resolver_cls):
        """Patch DependencyResolver inside the compose method's lazy import."""
        return patch(
            "mcp_server_constructs.resolver.DependencyResolver",
            mock_resolver_cls,
            create=True,
        )

    def test_compose_calls_resolver(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)

        mock_resolver_cls = MagicMock()
        mock_resolver = mock_resolver_cls.return_value
        mock_resolver.resolve_order.return_value = ["BedrockDocumentProcessing"]
        mock_resolver.build_wiring.return_value = {}
        mock_resolver.get_dependencies.return_value = []

        with patch.dict(
            "sys.modules",
            {"mcp_server_constructs.resolver": MagicMock(DependencyResolver=mock_resolver_cls)},
        ):
            output = gen.compose(["BedrockDocumentProcessing"])

        mock_resolver.resolve_order.assert_called_once_with(
            ["BedrockDocumentProcessing"]
        )
        mock_resolver.build_wiring.assert_called_once()

    def test_compose_produces_output(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)

        mock_resolver_cls = MagicMock()
        mock_resolver = mock_resolver_cls.return_value
        mock_resolver.resolve_order.return_value = ["BedrockDocumentProcessing"]
        mock_resolver.build_wiring.return_value = {}
        mock_resolver.get_dependencies.return_value = []

        with patch.dict(
            "sys.modules",
            {"mcp_server_constructs.resolver": MagicMock(DependencyResolver=mock_resolver_cls)},
        ):
            output = gen.compose(["BedrockDocumentProcessing"])

        assert "BedrockDocumentProcessing" in output
        assert "import" in output

    def test_compose_wiring_appears_in_output(self):
        """When resolver returns wiring, the output references wired variables."""
        # Build a registry with Network and a Processing construct that refs Network
        network_props_fqn = f"{LIB}.NetworkProps"
        network_props = _make_props_interface(network_props_fqn, [
            {
                "name": "maxAzs",
                "docs": {"summary": "Max AZs."},
                "type": {"primitive": "number"},
                "optional": True,
            },
        ])
        network = _make_construct(
            "Network",
            "use-cases/framework/foundation/network.ts",
            network_props_fqn,
        )
        proc_props_fqn = f"{LIB}.ProcessingProps"
        proc_props = _make_props_interface(proc_props_fqn, [
            {
                "name": "network",
                "docs": {"summary": "VPC network."},
                "type": {"fqn": f"{LIB}.Network"},
                "optional": True,
            },
            {
                "name": "prompt",
                "docs": {"summary": "Processing prompt."},
                "type": {"primitive": "string"},
                "optional": False,
            },
        ])
        processing = _make_construct(
            "Processing",
            "use-cases/document-processing/processing.ts",
            proc_props_fqn,
        )
        registry = _build_registry({
            network["fqn"]: network,
            network_props_fqn: network_props,
            processing["fqn"]: processing,
            proc_props_fqn: proc_props,
        })
        gen = CodeGenerator(registry)

        mock_resolver_cls = MagicMock()
        mock_resolver = mock_resolver_cls.return_value
        mock_resolver.resolve_order.return_value = ["Network", "Processing"]
        mock_resolver.build_wiring.return_value = {
            "Processing": {"network": "network"},
        }
        mock_resolver.get_dependencies.side_effect = lambda name: (
            ["Network"] if name == "Processing" else []
        )

        with patch.dict(
            "sys.modules",
            {"mcp_server_constructs.resolver": MagicMock(DependencyResolver=mock_resolver_cls)},
        ):
            output = gen.compose(["Network", "Processing"])

        # Network should appear before Processing
        net_pos = output.index("new Network(")
        proc_pos = output.index("new Processing(")
        assert net_pos < proc_pos

        # Wired prop should reference the network variable
        assert "Wired from" in output
        assert "network: network," in output or "network: network" in output

    def test_compose_respects_language(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)

        mock_resolver_cls = MagicMock()
        mock_resolver = mock_resolver_cls.return_value
        mock_resolver.resolve_order.return_value = ["BedrockDocumentProcessing"]
        mock_resolver.build_wiring.return_value = {}
        mock_resolver.get_dependencies.return_value = []

        with patch.dict(
            "sys.modules",
            {"mcp_server_constructs.resolver": MagicMock(DependencyResolver=mock_resolver_cls)},
        ):
            output = gen.compose(["BedrockDocumentProcessing"], language="python")

        # Python style: from-import, snake_case
        assert "from @cdklabs/cdk-appmod-catalog-blueprints import" in output
        assert "classification_prompt" in output

    def test_compose_with_prop_overrides(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)

        mock_resolver_cls = MagicMock()
        mock_resolver = mock_resolver_cls.return_value
        mock_resolver.resolve_order.return_value = ["BedrockDocumentProcessing"]
        mock_resolver.build_wiring.return_value = {}
        mock_resolver.get_dependencies.return_value = []

        with patch.dict(
            "sys.modules",
            {"mcp_server_constructs.resolver": MagicMock(DependencyResolver=mock_resolver_cls)},
        ):
            output = gen.compose(
                ["BedrockDocumentProcessing"],
                props_overrides={
                    "BedrockDocumentProcessing": {
                        "classificationPrompt": "Classify invoices",
                    },
                },
            )

        assert "'Classify invoices'" in output


# ── Edge cases ───────────────────────────────────────────────────


class TestEdgeCases:
    """Edge cases for the generator."""

    def test_construct_with_no_props(self):
        """A construct with no props produces valid output."""
        construct = _make_construct(
            "EmptyConstruct",
            "use-cases/utilities/empty.ts",
            props_fqn=None,
        )
        registry = _build_registry({construct["fqn"]: construct})
        gen = CodeGenerator(registry)
        output = gen.scaffold("EmptyConstruct")
        assert "new EmptyConstruct(this, 'EmptyConstruct'" in output
        assert "import { EmptyConstruct }" in output

    def test_all_required_props_overridden_no_placeholders(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            props_overrides={
                "classificationPrompt": "Classify",
                "processingPrompt": "Process",
            },
        )
        assert "<REQUIRED:" not in output

    def test_boolean_override_no_warning(self, doc_processing_registry):
        gen = CodeGenerator(doc_processing_registry)
        output = gen.scaffold(
            "BedrockDocumentProcessing",
            props_overrides={"enableObservability": "false"},
        )
        assert "WARNING" not in output
        assert "false" in output
