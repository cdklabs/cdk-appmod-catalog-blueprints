"""Tests for DependencyResolver: dependency detection, topological sort, shared deps, and wiring."""

import pytest

from mcp_server_constructs.errors import CircularDependencyError, UnknownConstructError
from mcp_server_constructs.models import WiringEntry
from mcp_server_constructs.registry import ConstructRegistry
from mcp_server_constructs.resolver import DependencyResolver, _to_variable_name


# ── Helpers ──────────────────────────────────────────────────────


def _make_construct(name: str, family_path: str, props_iface_fqn: str | None = None):
    """Build a minimal JSII class entry for a construct."""
    fqn = f"@cdklabs/cdk-appmod-catalog-blueprints.{name}"
    entry = {
        "kind": "class",
        "name": name,
        "fqn": fqn,
        "base": "constructs.Construct",
        "docs": {"summary": f"{name} construct."},
        "locationInModule": {"filename": family_path},
        "initializer": {"parameters": []},
    }
    if props_iface_fqn:
        entry["initializer"] = {
            "parameters": [
                {"name": "scope", "type": {"fqn": "constructs.Construct"}},
                {"name": "id", "type": {"primitive": "string"}},
                {"name": "props", "type": {"fqn": props_iface_fqn}},
            ],
        }
    return fqn, entry


def _make_props_iface(name: str, properties: list[dict]):
    """Build a minimal JSII interface entry for a props interface."""
    fqn = f"@cdklabs/cdk-appmod-catalog-blueprints.{name}"
    return fqn, {
        "kind": "interface",
        "name": name,
        "fqn": fqn,
        "datatype": True,
        "properties": properties,
    }


def _ref_prop(prop_name: str, target_construct: str, optional: bool = True):
    """Build a JSII property that references another library construct."""
    return {
        "name": prop_name,
        "docs": {"summary": f"The {prop_name} dependency."},
        "type": {"fqn": f"@cdklabs/cdk-appmod-catalog-blueprints.{target_construct}"},
        "optional": optional,
    }


def _primitive_prop(prop_name: str, type_name: str = "string", optional: bool = False):
    """Build a JSII property with a primitive type."""
    entry = {
        "name": prop_name,
        "docs": {"summary": f"The {prop_name} prop."},
        "type": {"primitive": type_name},
    }
    if optional:
        entry["optional"] = True
    return entry


def _build_registry(types: dict) -> ConstructRegistry:
    """Build a ConstructRegistry from a types dict."""
    return ConstructRegistry.from_dict({
        "name": "@cdklabs/cdk-appmod-catalog-blueprints",
        "version": "0.1.0",
        "types": types,
    })


# ── Fixtures ─────────────────────────────────────────────────────


@pytest.fixture
def simple_registry():
    """Registry with Network, EventBridgeBroker, and BedrockDocumentProcessing.

    BedrockDocumentProcessing depends on Network and EventBridgeBroker.
    """
    types = {}

    # Network (no deps)
    fqn, entry = _make_construct("Network", "use-cases/framework/foundation/network.ts")
    types[fqn] = entry

    # EventBridgeBroker (no deps)
    fqn, entry = _make_construct("EventBridgeBroker", "use-cases/framework/foundation/broker.ts")
    types[fqn] = entry

    # BedrockDocumentProcessing props → depends on Network and EventBridgeBroker
    props_fqn, props_entry = _make_props_iface("BedrockDocumentProcessingProps", [
        _ref_prop("network", "Network"),
        _ref_prop("eventBridgeBroker", "EventBridgeBroker"),
        _primitive_prop("classificationPrompt"),
    ])
    types[props_fqn] = props_entry

    fqn, entry = _make_construct(
        "BedrockDocumentProcessing",
        "use-cases/document-processing/bedrock.ts",
        props_iface_fqn=props_fqn,
    )
    types[fqn] = entry

    return _build_registry(types)


@pytest.fixture
def diamond_registry():
    """Registry with a diamond dependency pattern.

    Frontend and Processing both depend on Network.
    Composition should create Network once.
    """
    types = {}

    # Network (no deps)
    fqn, entry = _make_construct("Network", "use-cases/framework/foundation/network.ts")
    types[fqn] = entry

    # Frontend → depends on Network
    props_fqn, props_entry = _make_props_iface("FrontendProps", [
        _ref_prop("network", "Network"),
        _primitive_prop("siteName"),
    ])
    types[props_fqn] = props_entry
    fqn, entry = _make_construct("Frontend", "use-cases/webapp/frontend.ts", props_fqn)
    types[fqn] = entry

    # Processing → depends on Network
    props_fqn, props_entry = _make_props_iface("ProcessingProps", [
        _ref_prop("network", "Network"),
        _primitive_prop("prompt"),
    ])
    types[props_fqn] = props_entry
    fqn, entry = _make_construct("Processing", "use-cases/document-processing/proc.ts", props_fqn)
    types[fqn] = entry

    return _build_registry(types)


@pytest.fixture
def chain_registry():
    """Registry with a 3-level dependency chain: C → B → A."""
    types = {}

    # A (no deps)
    fqn, entry = _make_construct("ConstructA", "use-cases/framework/foundation/a.ts")
    types[fqn] = entry

    # B → depends on A
    props_fqn, props_entry = _make_props_iface("ConstructBProps", [
        _ref_prop("constructA", "ConstructA"),
    ])
    types[props_fqn] = props_entry
    fqn, entry = _make_construct("ConstructB", "use-cases/framework/foundation/b.ts", props_fqn)
    types[fqn] = entry

    # C → depends on B
    props_fqn, props_entry = _make_props_iface("ConstructCProps", [
        _ref_prop("constructB", "ConstructB"),
    ])
    types[props_fqn] = props_entry
    fqn, entry = _make_construct("ConstructC", "use-cases/framework/foundation/c.ts", props_fqn)
    types[fqn] = entry

    return _build_registry(types)


# ── _to_variable_name ────────────────────────────────────────────


class TestToVariableName:
    def test_pascal_to_camel(self):
        assert _to_variable_name("Network") == "network"

    def test_multi_word(self):
        assert _to_variable_name("BedrockDocumentProcessing") == "bedrockDocumentProcessing"

    def test_empty_string(self):
        assert _to_variable_name("") == ""

    def test_single_char(self):
        assert _to_variable_name("X") == "x"


# ── get_dependencies ─────────────────────────────────────────────


class TestGetDependencies:
    def test_known_dependency_pair(self, simple_registry):
        resolver = DependencyResolver(simple_registry)
        deps = resolver.get_dependencies("BedrockDocumentProcessing")
        assert "Network" in deps
        assert "EventBridgeBroker" in deps

    def test_no_dependencies(self, simple_registry):
        resolver = DependencyResolver(simple_registry)
        deps = resolver.get_dependencies("Network")
        assert deps == []

    def test_returns_sorted(self, simple_registry):
        resolver = DependencyResolver(simple_registry)
        deps = resolver.get_dependencies("BedrockDocumentProcessing")
        assert deps == sorted(deps)

    def test_unknown_construct_raises(self, simple_registry):
        resolver = DependencyResolver(simple_registry)
        with pytest.raises(UnknownConstructError):
            resolver.get_dependencies("NonExistent")


# ── resolve_order ────────────────────────────────────────────────


class TestResolveOrder:
    def test_simple_two_constructs(self, simple_registry):
        """Network must appear before BedrockDocumentProcessing."""
        resolver = DependencyResolver(simple_registry)
        order = resolver.resolve_order(["BedrockDocumentProcessing", "Network"])
        assert order.index("Network") < order.index("BedrockDocumentProcessing")

    def test_three_construct_chain(self, chain_registry):
        """A → B → C chain: A must come first, then B, then C."""
        resolver = DependencyResolver(chain_registry)
        order = resolver.resolve_order(["ConstructC", "ConstructB", "ConstructA"])
        assert order.index("ConstructA") < order.index("ConstructB")
        assert order.index("ConstructB") < order.index("ConstructC")

    def test_transitive_deps_included(self, chain_registry):
        """Requesting only C should pull in B and A transitively."""
        resolver = DependencyResolver(chain_registry)
        order = resolver.resolve_order(["ConstructC"])
        assert "ConstructA" in order
        assert "ConstructB" in order
        assert "ConstructC" in order
        assert order.index("ConstructA") < order.index("ConstructB")

    def test_independent_constructs(self, simple_registry):
        """Two constructs with no deps between them both appear."""
        resolver = DependencyResolver(simple_registry)
        order = resolver.resolve_order(["Network", "EventBridgeBroker"])
        assert set(order) == {"Network", "EventBridgeBroker"}

    def test_all_requested_constructs_present(self, simple_registry):
        resolver = DependencyResolver(simple_registry)
        requested = ["BedrockDocumentProcessing", "Network", "EventBridgeBroker"]
        order = resolver.resolve_order(requested)
        for name in requested:
            assert name in order

    def test_deps_before_dependents(self, simple_registry):
        """Every construct appears after all its dependencies."""
        resolver = DependencyResolver(simple_registry)
        order = resolver.resolve_order(
            ["BedrockDocumentProcessing", "Network", "EventBridgeBroker"]
        )
        seen = set()
        for name in order:
            deps = resolver.get_dependencies(name)
            for dep in deps:
                if dep in order:
                    assert dep in seen, f"{dep} should appear before {name}"
            seen.add(name)

    def test_unknown_construct_raises(self, simple_registry):
        resolver = DependencyResolver(simple_registry)
        with pytest.raises(UnknownConstructError):
            resolver.resolve_order(["NonExistent"])


# ── Cycle detection ──────────────────────────────────────────────


class TestCycleDetection:
    def test_circular_dependency_raises(self):
        """Two constructs that depend on each other should raise."""
        types = {}

        # Alpha → depends on Beta
        props_fqn, props_entry = _make_props_iface("AlphaProps", [
            _ref_prop("beta", "Beta"),
        ])
        types[props_fqn] = props_entry
        fqn, entry = _make_construct("Alpha", "use-cases/framework/foundation/a.ts", props_fqn)
        types[fqn] = entry

        # Beta → depends on Alpha
        props_fqn, props_entry = _make_props_iface("BetaProps", [
            _ref_prop("alpha", "Alpha"),
        ])
        types[props_fqn] = props_entry
        fqn, entry = _make_construct("Beta", "use-cases/framework/foundation/b.ts", props_fqn)
        types[fqn] = entry

        registry = _build_registry(types)
        resolver = DependencyResolver(registry)

        with pytest.raises(CircularDependencyError) as exc_info:
            resolver.resolve_order(["Alpha", "Beta"])
        assert len(exc_info.value.cycle) >= 2

    def test_three_node_cycle_raises(self):
        """A → B → C → A should raise CircularDependencyError."""
        types = {}

        props_fqn, props_entry = _make_props_iface("AProps", [_ref_prop("c", "CycleC")])
        types[props_fqn] = props_entry
        fqn, entry = _make_construct("CycleA", "use-cases/framework/foundation/a.ts", props_fqn)
        types[fqn] = entry

        props_fqn, props_entry = _make_props_iface("BProps", [_ref_prop("a", "CycleA")])
        types[props_fqn] = props_entry
        fqn, entry = _make_construct("CycleB", "use-cases/framework/foundation/b.ts", props_fqn)
        types[fqn] = entry

        props_fqn, props_entry = _make_props_iface("CProps", [_ref_prop("b", "CycleB")])
        types[props_fqn] = props_entry
        fqn, entry = _make_construct("CycleC", "use-cases/framework/foundation/c.ts", props_fqn)
        types[fqn] = entry

        registry = _build_registry(types)
        resolver = DependencyResolver(registry)

        with pytest.raises(CircularDependencyError) as exc_info:
            resolver.resolve_order(["CycleA", "CycleB", "CycleC"])
        # The cycle list should contain the cycle path
        assert len(exc_info.value.cycle) >= 3


# ── Shared dependencies ─────────────────────────────────────────


class TestSharedDependencies:
    def test_network_shared_by_two(self, diamond_registry):
        """Network is a dependency of both Frontend and Processing."""
        resolver = DependencyResolver(diamond_registry)
        shared = resolver.get_shared_dependencies(["Frontend", "Processing"])
        assert "Network" in shared

    def test_no_shared_deps(self, simple_registry):
        """Two independent constructs share no dependencies."""
        resolver = DependencyResolver(simple_registry)
        shared = resolver.get_shared_dependencies(["Network", "EventBridgeBroker"])
        assert shared == []

    def test_shared_deps_sorted(self, diamond_registry):
        resolver = DependencyResolver(diamond_registry)
        shared = resolver.get_shared_dependencies(["Frontend", "Processing"])
        assert shared == sorted(shared)

    def test_single_construct_no_shared(self, simple_registry):
        """A single construct can't have shared deps."""
        resolver = DependencyResolver(simple_registry)
        shared = resolver.get_shared_dependencies(["BedrockDocumentProcessing"])
        assert shared == []


# ── build_wiring ─────────────────────────────────────────────────


class TestBuildWiring:
    def test_wiring_for_simple_dep(self, simple_registry):
        """BedrockDocumentProcessing should wire network and eventBridgeBroker."""
        resolver = DependencyResolver(simple_registry)
        order = resolver.resolve_order(
            ["BedrockDocumentProcessing", "Network", "EventBridgeBroker"]
        )
        wiring = resolver.build_wiring(order)

        assert "BedrockDocumentProcessing" in wiring
        bdp_wiring = wiring["BedrockDocumentProcessing"]
        assert bdp_wiring["network"] == "network"
        assert bdp_wiring["eventBridgeBroker"] == "eventBridgeBroker"

    def test_no_wiring_for_leaf_constructs(self, simple_registry):
        """Constructs with no deps should not appear in wiring."""
        resolver = DependencyResolver(simple_registry)
        order = resolver.resolve_order(
            ["BedrockDocumentProcessing", "Network", "EventBridgeBroker"]
        )
        wiring = resolver.build_wiring(order)
        assert "Network" not in wiring
        assert "EventBridgeBroker" not in wiring

    def test_wiring_chain(self, chain_registry):
        """In A → B → C chain, B wires to A and C wires to B."""
        resolver = DependencyResolver(chain_registry)
        order = resolver.resolve_order(["ConstructC", "ConstructB", "ConstructA"])
        wiring = resolver.build_wiring(order)

        assert "ConstructB" in wiring
        assert wiring["ConstructB"]["constructA"] == "constructA"

        assert "ConstructC" in wiring
        assert wiring["ConstructC"]["constructB"] == "constructB"

    def test_wiring_diamond(self, diamond_registry):
        """Both Frontend and Processing wire to the same Network variable."""
        resolver = DependencyResolver(diamond_registry)
        order = resolver.resolve_order(["Frontend", "Processing", "Network"])
        wiring = resolver.build_wiring(order)

        assert wiring["Frontend"]["network"] == "network"
        assert wiring["Processing"]["network"] == "network"

    def test_wiring_only_includes_available_deps(self):
        """Props referencing constructs NOT in the ordered list are not wired."""
        types = {}

        fqn, entry = _make_construct("Dep", "use-cases/framework/foundation/dep.ts")
        types[fqn] = entry

        props_fqn, props_entry = _make_props_iface("ConsumerProps", [
            _ref_prop("dep", "Dep"),
        ])
        types[props_fqn] = props_entry
        fqn, entry = _make_construct("Consumer", "use-cases/document-processing/c.ts", props_fqn)
        types[fqn] = entry

        registry = _build_registry(types)
        resolver = DependencyResolver(registry)

        # Only pass Consumer without Dep — Dep is not "available"
        wiring = resolver.build_wiring(["Consumer"])
        assert wiring == {}


# ── get_wiring_entries ───────────────────────────────────────────


class TestGetWiringEntries:
    def test_returns_wiring_entry_objects(self, simple_registry):
        resolver = DependencyResolver(simple_registry)
        order = resolver.resolve_order(
            ["BedrockDocumentProcessing", "Network", "EventBridgeBroker"]
        )
        entries = resolver.get_wiring_entries(order)

        assert all(isinstance(e, WiringEntry) for e in entries)
        assert len(entries) == 2  # network + eventBridgeBroker

    def test_wiring_entry_fields(self, simple_registry):
        resolver = DependencyResolver(simple_registry)
        order = resolver.resolve_order(
            ["BedrockDocumentProcessing", "Network", "EventBridgeBroker"]
        )
        entries = resolver.get_wiring_entries(order)
        entry_map = {e.target_prop: e for e in entries}

        net_entry = entry_map["network"]
        assert net_entry.source_construct == "Network"
        assert net_entry.source_variable == "network"
        assert net_entry.target_construct == "BedrockDocumentProcessing"

        broker_entry = entry_map["eventBridgeBroker"]
        assert broker_entry.source_construct == "EventBridgeBroker"
        assert broker_entry.source_variable == "eventBridgeBroker"
        assert broker_entry.target_construct == "BedrockDocumentProcessing"


# ── Bundled .jsii integration ────────────────────────────────────


class TestBundledResolverIntegration:
    """Integration tests using the real bundled .jsii manifest."""

    def test_bedrock_depends_on_network(self, bundled_jsii_path):
        registry = ConstructRegistry(jsii_path=bundled_jsii_path, enable_remote_fetch=False)
        resolver = DependencyResolver(registry)
        deps = resolver.get_dependencies("BedrockDocumentProcessing")
        # BedrockDocumentProcessing should reference Network via props
        assert "Network" in deps

    def test_resolve_order_with_real_constructs(self, bundled_jsii_path):
        registry = ConstructRegistry(jsii_path=bundled_jsii_path, enable_remote_fetch=False)
        resolver = DependencyResolver(registry)
        order = resolver.resolve_order(["BedrockDocumentProcessing", "Network"])
        assert order.index("Network") < order.index("BedrockDocumentProcessing")

    def test_build_wiring_with_real_constructs(self, bundled_jsii_path):
        registry = ConstructRegistry(jsii_path=bundled_jsii_path, enable_remote_fetch=False)
        resolver = DependencyResolver(registry)
        order = resolver.resolve_order(["BedrockDocumentProcessing", "Network"])
        wiring = resolver.build_wiring(order)
        # BedrockDocumentProcessing should have a network wiring
        assert "BedrockDocumentProcessing" in wiring
        assert "network" in wiring["BedrockDocumentProcessing"]
