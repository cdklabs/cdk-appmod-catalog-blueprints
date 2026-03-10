"""Tests for ConstructRegistry: JSII loading, parsing, indexing, and degraded mode."""

import json
import os
from pathlib import Path

import pytest

from mcp_server_constructs.errors import (
    DegradedModeError,
    UnknownConstructError,
    UnknownFamilyError,
)
from mcp_server_constructs.models import CatalogInfo, ConstructInfo, FamilyInfo, PropInfo
from mcp_server_constructs.registry import ConstructRegistry


# ── Fixtures ────────────────────────────────────────────────────


@pytest.fixture
def props_interface():
    """A JSII props interface with required and optional properties."""
    return {
        "kind": "interface",
        "name": "TestConstructProps",
        "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.TestConstructProps",
        "docs": {"summary": "Props for TestConstruct."},
        "datatype": True,
        "properties": [
            {
                "name": "classificationPrompt",
                "docs": {"summary": "The prompt used for document classification."},
                "type": {"primitive": "string"},
                "optional": False,
            },
            {
                "name": "enableObservability",
                "docs": {"summary": "Enable observability features.", "default": "false"},
                "type": {"primitive": "boolean"},
                "optional": True,
            },
        ],
    }


@pytest.fixture
def construct_type():
    """A JSII class entry representing a construct."""
    return {
        "assembly": "@cdklabs/cdk-appmod-catalog-blueprints",
        "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.TestConstruct",
        "kind": "class",
        "name": "TestConstruct",
        "docs": {"summary": "A test construct for unit testing."},
        "base": "constructs.Construct",
        "locationInModule": {"filename": "use-cases/document-processing/test-construct.ts"},
        "initializer": {
            "parameters": [
                {"name": "scope", "type": {"fqn": "constructs.Construct"}},
                {"name": "id", "type": {"primitive": "string"}},
                {
                    "name": "props",
                    "type": {"fqn": "@cdklabs/cdk-appmod-catalog-blueprints.TestConstructProps"},
                },
            ],
        },
    }


@pytest.fixture
def minimal_jsii(construct_type, props_interface):
    """A minimal JSII manifest with one construct and its props interface."""
    return {
        "name": "@cdklabs/cdk-appmod-catalog-blueprints",
        "version": "0.1.0",
        "types": {
            construct_type["fqn"]: construct_type,
            props_interface["fqn"]: props_interface,
        },
    }


@pytest.fixture
def registry(minimal_jsii):
    """A ConstructRegistry loaded from the minimal JSII fixture."""
    return ConstructRegistry.from_dict(minimal_jsii)


# ── Loading & degraded mode ─────────────────────────────────────


class TestLoading:
    def test_from_dict_loads_successfully(self, registry):
        assert registry.is_loaded is True

    def test_missing_file_enters_degraded_mode(self, tmp_path):
        reg = ConstructRegistry(jsii_path=str(tmp_path / "nonexistent.jsii"))
        assert reg.is_loaded is False

    def test_corrupt_json_enters_degraded_mode(self, tmp_path):
        bad = tmp_path / "bad.jsii"
        bad.write_text("not json {{{")
        reg = ConstructRegistry(jsii_path=str(bad))
        assert reg.is_loaded is False

    def test_degraded_mode_get_construct_raises(self, tmp_path):
        reg = ConstructRegistry(jsii_path=str(tmp_path / "nope.jsii"))
        with pytest.raises(DegradedModeError):
            reg.get_construct("Anything")

    def test_degraded_mode_list_families_raises(self, tmp_path):
        reg = ConstructRegistry(jsii_path=str(tmp_path / "nope.jsii"))
        with pytest.raises(DegradedModeError):
            reg.list_families()

    def test_degraded_mode_get_catalog_raises(self, tmp_path):
        reg = ConstructRegistry(jsii_path=str(tmp_path / "nope.jsii"))
        with pytest.raises(DegradedModeError):
            reg.get_catalog()

    def test_degraded_mode_get_props_raises(self, tmp_path):
        reg = ConstructRegistry(jsii_path=str(tmp_path / "nope.jsii"))
        with pytest.raises(DegradedModeError):
            reg.get_props("Anything")

    def test_degraded_mode_get_construct_types_raises(self, tmp_path):
        reg = ConstructRegistry(jsii_path=str(tmp_path / "nope.jsii"))
        with pytest.raises(DegradedModeError):
            reg.get_construct_types("anything")


# ── Construct lookup ─────────────────────────────────────────────


class TestGetConstruct:
    def test_returns_construct_info(self, registry):
        info = registry.get_construct("TestConstruct")
        assert isinstance(info, ConstructInfo)
        assert info.name == "TestConstruct"
        assert info.fqn == "@cdklabs/cdk-appmod-catalog-blueprints.TestConstruct"

    def test_family_assigned_from_module_path(self, registry):
        info = registry.get_construct("TestConstruct")
        assert info.family == "document-processing"

    def test_is_abstract_false_by_default(self, registry):
        info = registry.get_construct("TestConstruct")
        assert info.is_abstract is False

    def test_unknown_construct_raises(self, registry):
        with pytest.raises(UnknownConstructError) as exc_info:
            registry.get_construct("DoesNotExist")
        assert "DoesNotExist" in str(exc_info.value)
        assert "TestConstruct" in str(exc_info.value)


# ── Props resolution ─────────────────────────────────────────────


class TestProps:
    def test_props_parsed_from_interface(self, registry):
        props = registry.get_props("TestConstruct")
        names = [p.name for p in props]
        assert "classificationPrompt" in names
        assert "enableObservability" in names

    def test_required_flag(self, registry):
        props = {p.name: p for p in registry.get_props("TestConstruct")}
        assert props["classificationPrompt"].required is True
        assert props["enableObservability"].required is False

    def test_type_name_resolved(self, registry):
        props = {p.name: p for p in registry.get_props("TestConstruct")}
        assert props["classificationPrompt"].type_name == "string"
        assert props["enableObservability"].type_name == "boolean"

    def test_description_from_docs(self, registry):
        props = {p.name: p for p in registry.get_props("TestConstruct")}
        assert "classification" in props["classificationPrompt"].description.lower()

    def test_default_value_from_docs(self, registry):
        props = {p.name: p for p in registry.get_props("TestConstruct")}
        assert props["enableObservability"].default_value == "false"
        assert props["classificationPrompt"].default_value is None

    def test_inherited_props_collected(self):
        """Props from parent interfaces are included."""
        base_iface = {
            "kind": "interface",
            "name": "BaseProps",
            "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.BaseProps",
            "properties": [
                {
                    "name": "baseProp",
                    "docs": {"summary": "From base."},
                    "type": {"primitive": "string"},
                    "optional": False,
                },
            ],
        }
        child_iface = {
            "kind": "interface",
            "name": "ChildProps",
            "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.ChildProps",
            "interfaces": ["@cdklabs/cdk-appmod-catalog-blueprints.BaseProps"],
            "properties": [
                {
                    "name": "childProp",
                    "docs": {"summary": "From child."},
                    "type": {"primitive": "number"},
                    "optional": True,
                },
            ],
        }
        construct = {
            "kind": "class",
            "name": "ChildConstruct",
            "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.ChildConstruct",
            "base": "constructs.Construct",
            "docs": {"summary": "Child construct."},
            "locationInModule": {"filename": "use-cases/webapp/child.ts"},
            "initializer": {
                "parameters": [
                    {"name": "scope", "type": {"fqn": "constructs.Construct"}},
                    {"name": "id", "type": {"primitive": "string"}},
                    {"name": "props", "type": {"fqn": "@cdklabs/cdk-appmod-catalog-blueprints.ChildProps"}},
                ],
            },
        }
        data = {
            "name": "@cdklabs/cdk-appmod-catalog-blueprints",
            "version": "0.1.0",
            "types": {
                base_iface["fqn"]: base_iface,
                child_iface["fqn"]: child_iface,
                construct["fqn"]: construct,
            },
        }
        reg = ConstructRegistry.from_dict(data)
        prop_names = [p.name for p in reg.get_props("ChildConstruct")]
        assert "childProp" in prop_names
        assert "baseProp" in prop_names


# ── Family grouping ──────────────────────────────────────────────


class TestFamilies:
    def test_list_families(self, registry):
        families = registry.list_families()
        assert len(families) == 1
        assert families[0].name == "document-processing"

    def test_get_family(self, registry):
        constructs = registry.get_family("document-processing")
        assert len(constructs) == 1
        assert constructs[0].name == "TestConstruct"

    def test_unknown_family_raises(self, registry):
        with pytest.raises(UnknownFamilyError) as exc_info:
            registry.get_family("nonexistent")
        assert "nonexistent" in str(exc_info.value)

    def test_get_construct_types(self, registry):
        types = registry.get_construct_types("document-processing")
        assert "TestConstruct" in types

    def test_get_construct_types_unknown_family_raises(self, registry):
        with pytest.raises(UnknownFamilyError):
            registry.get_construct_types("nope")

    def test_family_mapping_agents(self):
        construct = {
            "kind": "class",
            "name": "TestAgent",
            "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.TestAgent",
            "base": "constructs.Construct",
            "docs": {"summary": "Agent."},
            "locationInModule": {"filename": "use-cases/framework/agents/test-agent.ts"},
            "initializer": {"parameters": []},
        }
        data = {
            "name": "@cdklabs/cdk-appmod-catalog-blueprints",
            "version": "0.1.0",
            "types": {construct["fqn"]: construct},
        }
        reg = ConstructRegistry.from_dict(data)
        assert reg.list_families()[0].name == "agents"

    def test_family_mapping_foundation(self):
        construct = {
            "kind": "class",
            "name": "TestNetwork",
            "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.TestNetwork",
            "base": "constructs.Construct",
            "docs": {"summary": "Network."},
            "locationInModule": {"filename": "use-cases/framework/foundation/network.ts"},
            "initializer": {"parameters": []},
        }
        data = {
            "name": "@cdklabs/cdk-appmod-catalog-blueprints",
            "version": "0.1.0",
            "types": {construct["fqn"]: construct},
        }
        reg = ConstructRegistry.from_dict(data)
        assert reg.list_families()[0].name == "foundation"


# ── Catalog ──────────────────────────────────────────────────────


class TestCatalog:
    def test_get_catalog(self, registry):
        catalog = registry.get_catalog()
        assert isinstance(catalog, CatalogInfo)
        assert catalog.library_version == "0.1.0"
        assert catalog.library_name == "@cdklabs/cdk-appmod-catalog-blueprints"
        assert len(catalog.families) == 1


# ── Construct references ─────────────────────────────────────────


class TestConstructRefs:
    def test_prop_referencing_another_construct(self):
        """A prop whose type is another library construct is flagged."""
        network_class = {
            "kind": "class",
            "name": "Network",
            "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.Network",
            "base": "constructs.Construct",
            "docs": {"summary": "VPC network."},
            "locationInModule": {"filename": "use-cases/framework/foundation/network.ts"},
            "initializer": {"parameters": []},
        }
        props_iface = {
            "kind": "interface",
            "name": "ProcessingProps",
            "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.ProcessingProps",
            "properties": [
                {
                    "name": "network",
                    "docs": {"summary": "The VPC network."},
                    "type": {"fqn": "@cdklabs/cdk-appmod-catalog-blueprints.Network"},
                    "optional": True,
                },
            ],
        }
        processing_class = {
            "kind": "class",
            "name": "Processing",
            "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.Processing",
            "base": "constructs.Construct",
            "docs": {"summary": "Processing construct."},
            "locationInModule": {"filename": "use-cases/document-processing/processing.ts"},
            "initializer": {
                "parameters": [
                    {"name": "scope", "type": {"fqn": "constructs.Construct"}},
                    {"name": "id", "type": {"primitive": "string"}},
                    {"name": "props", "type": {"fqn": "@cdklabs/cdk-appmod-catalog-blueprints.ProcessingProps"}},
                ],
            },
        }
        data = {
            "name": "@cdklabs/cdk-appmod-catalog-blueprints",
            "version": "0.1.0",
            "types": {
                network_class["fqn"]: network_class,
                props_iface["fqn"]: props_iface,
                processing_class["fqn"]: processing_class,
            },
        }
        reg = ConstructRegistry.from_dict(data)
        props = {p.name: p for p in reg.get_props("Processing")}
        assert props["network"].is_construct_ref is True
        assert props["network"].construct_ref_name == "Network"

    def test_primitive_prop_not_flagged_as_ref(self, registry):
        props = {p.name: p for p in registry.get_props("TestConstruct")}
        assert props["classificationPrompt"].is_construct_ref is False
        assert props["classificationPrompt"].construct_ref_name is None


# ── Bundled .jsii manifest ───────────────────────────────────────


class TestBundledManifest:
    def test_loads_real_manifest(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        assert reg.is_loaded is True

    def test_has_known_constructs(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        # These constructs should exist in the real library
        for name in ["BedrockDocumentProcessing", "Network", "Frontend"]:
            info = reg.get_construct(name)
            assert info.name == name

    def test_has_multiple_families(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        families = reg.list_families()
        family_names = [f.name for f in families]
        assert "document-processing" in family_names
        assert "foundation" in family_names

    def test_known_construct_has_props(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        props = reg.get_props("BedrockDocumentProcessing")
        assert len(props) > 0
        prop_names = [p.name for p in props]
        # classificationPrompt is a known required prop
        assert "classificationPrompt" in prop_names


# ── Alias resolution ─────────────────────────────────────────────


class TestResolveConstructType:
    """Tests for ConstructRegistry.resolve_construct_type."""

    def test_exact_match(self, registry):
        assert registry.resolve_construct_type(
            "document-processing", "TestConstruct"
        ) == "TestConstruct"

    def test_case_insensitive_match(self, registry):
        assert registry.resolve_construct_type(
            "document-processing", "testconstruct"
        ) == "TestConstruct"

    def test_no_match_returns_none(self, registry):
        assert registry.resolve_construct_type(
            "document-processing", "CompletelyWrong"
        ) is None

    def test_unknown_family_raises(self, registry):
        with pytest.raises(UnknownFamilyError):
            registry.resolve_construct_type("nope", "anything")

    def test_alias_webapp_resolves(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        assert reg.resolve_construct_type("webapp", "WebApp") == "Frontend"

    def test_alias_vpc_resolves(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        assert reg.resolve_construct_type("foundation", "vpc") == "Network"

    def test_alias_chatbot_resolves(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        assert reg.resolve_construct_type(
            "agents", "chatbot"
        ) == "InteractiveAgent"

    def test_alias_kb_resolves(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        assert reg.resolve_construct_type(
            "agents", "kb"
        ) == "BedrockKnowledgeBase"

    def test_alias_wrong_family_returns_none(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        # "webapp" alias → Frontend, but Frontend is not in agents family
        assert reg.resolve_construct_type("agents", "WebApp") is None

    def test_non_scaffoldable_adapter_resolves(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        assert reg.resolve_construct_type(
            "agents", "AgentCoreRuntimeHostingAdapter"
        ) == "InteractiveAgent"

    def test_substring_unique_match(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        # "Bedrock" uniquely matches BedrockKnowledgeBase in agents
        assert reg.resolve_construct_type(
            "agents", "Bedrock"
        ) == "BedrockKnowledgeBase"

    def test_substring_ambiguous_returns_none(self, bundled_jsii_path):
        reg = ConstructRegistry(jsii_path=bundled_jsii_path)
        # "Base" matches both BaseAgent and BaseKnowledgeBase
        assert reg.resolve_construct_type("agents", "Base") is None
