"""ConstructRegistry: JSII manifest loading, parsing, and indexed access.

Loads the bundled .jsii manifest (or a custom path), parses construct
classes and their props interfaces, groups constructs into families,
and provides indexed lookups by name and family.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from mcp_server_constructs.errors import (
    DegradedModeError,
    UnknownConstructError,
    UnknownFamilyError,
)
from mcp_server_constructs.models import (
    CatalogInfo,
    ConstructInfo,
    FamilyInfo,
    PropInfo,
)

logger = logging.getLogger(__name__)

# Library assembly prefix for FQN matching
_ASSEMBLY = "@cdklabs/cdk-appmod-catalog-blueprints"
_FQN_PREFIX = f"{_ASSEMBLY}."

# Module path prefix to strip when mapping families
_USE_CASES_PREFIX = "use-cases/"

# Family mapping: filename path patterns → (family_name, display_name)
# Order matters — first match wins.
_FAMILY_MAP: list[tuple[str, str, str]] = [
    ("document-processing/", "document-processing", "Document Processing"),
    ("framework/agents/", "agents", "Agents"),
    ("framework/foundation/", "foundation", "Foundation"),
    ("framework/bedrock/", "bedrock", "Bedrock"),
    ("webapp/", "webapp", "Webapp"),
    ("utilities/", "utilities", "Utilities"),
]


# Static aliases: common alternative names → canonical construct name.
# Keys MUST be lowercase.  Values are the exact class name in the registry.
_CONSTRUCT_ALIASES: dict[str, str] = {
    # Webapp / Frontend
    "webapp": "Frontend",
    "web-app": "Frontend",
    "web_app": "Frontend",
    "website": "Frontend",
    "static-site": "Frontend",
    "staticsite": "Frontend",
    "cloudfront": "Frontend",
    "spa": "Frontend",
    "frontendconstruct": "Frontend",
    # Agents
    "agent": "BatchAgent",
    "batch": "BatchAgent",
    "async-agent": "BatchAgent",
    "asyncagent": "BatchAgent",
    "interactive": "InteractiveAgent",
    "chatbot": "InteractiveAgent",
    "chat-agent": "InteractiveAgent",
    "chatagent": "InteractiveAgent",
    "streaming-agent": "InteractiveAgent",
    "streamingagent": "InteractiveAgent",
    "realtimeagent": "InteractiveAgent",
    "realtime-agent": "InteractiveAgent",
    # Knowledge bases
    "knowledgebase": "BedrockKnowledgeBase",
    "knowledge-base": "BedrockKnowledgeBase",
    "knowledge_base": "BedrockKnowledgeBase",
    "kb": "BedrockKnowledgeBase",
    "rag": "BedrockKnowledgeBase",
    "vectorstore": "BedrockKnowledgeBase",
    "vector-store": "BedrockKnowledgeBase",
    # Document processing
    "docprocessing": "BedrockDocumentProcessing",
    "doc-processing": "BedrockDocumentProcessing",
    "document-processing": "BedrockDocumentProcessing",
    "documentprocessing": "BedrockDocumentProcessing",
    "idp": "BedrockDocumentProcessing",
    "agentic": "AgenticDocumentProcessing",
    "agenticdocprocessing": "AgenticDocumentProcessing",
    "agentic-doc-processing": "AgenticDocumentProcessing",
    # Foundation
    "vpc": "Network",
    "networking": "Network",
    "eventbridge": "EventbridgeBroker",
    "event-bridge": "EventbridgeBroker",
    "eventbus": "EventbridgeBroker",
    "event-bus": "EventbridgeBroker",
    "broker": "EventbridgeBroker",
    "logging": "AccessLog",
    "access-log": "AccessLog",
    "access-logging": "AccessLog",
    "accesslogging": "AccessLog",
    # Utilities
    "observability": "CloudWatchTransactionSearch",
    "monitoring": "CloudWatchTransactionSearch",
    "cloudwatch": "CloudWatchTransactionSearch",
    "dataloader": "DataLoader",
    "data-loader": "DataLoader",
    "data_loader": "DataLoader",
    # Non-scaffoldable classes — point callers to the right construct
    "agentcoreruntimehostingadapter": "InteractiveAgent",
    "agentcore": "InteractiveAgent",
    "agentcoreruntime": "InteractiveAgent",
    "lambdahostingadapter": "InteractiveAgent",
    "hostingadapter": "InteractiveAgent",
    "cognitoauthenticator": "InteractiveAgent",
    "noauthenticator": "InteractiveAgent",
    "s3sessionstore": "InteractiveAgent",
    "websocketcommunicationadapter": "InteractiveAgent",
    "queueds3adapter": "BedrockDocumentProcessing",
    "s3adapter": "BedrockDocumentProcessing",
}


def _default_jsii_path() -> str:
    """Return the path to the bundled .jsii manifest."""
    return str(Path(__file__).parent / "data" / "jsii-metadata")


def _resolve_family(filename: str) -> tuple[str, str]:
    """Map a locationInModule filename to a (family_name, display_name) pair.

    Strips the ``use-cases/`` prefix then matches against ``_FAMILY_MAP``.
    Falls back to ``("other", "Other")`` if no pattern matches.
    """
    path = filename
    if path.startswith(_USE_CASES_PREFIX):
        path = path[len(_USE_CASES_PREFIX):]

    for pattern, family_name, display_name in _FAMILY_MAP:
        if path.startswith(pattern):
            return family_name, display_name

    return "other", "Other"


def _resolve_type_name(type_ref: dict) -> str:
    """Extract a human-readable type name from a JSII type reference.

    Handles primitives, FQN references, collections, and unions.
    """
    if "primitive" in type_ref:
        return type_ref["primitive"]

    if "fqn" in type_ref:
        fqn: str = type_ref["fqn"]
        # Strip common prefixes for readability
        return fqn.rsplit(".", 1)[-1]

    if "collection" in type_ref:
        coll = type_ref["collection"]
        elem = _resolve_type_name(coll.get("elementtype", {}))
        kind = coll.get("kind", "array")
        if kind == "map":
            return f"Map<string, {elem}>"
        return f"{elem}[]"

    if "union" in type_ref:
        members = type_ref["union"].get("types", [])
        return " | ".join(_resolve_type_name(m) for m in members)

    return "any"


def _is_construct_ref(fqn: str) -> bool:
    """Check whether a type FQN refers to another library construct class."""
    return fqn.startswith(_FQN_PREFIX)


def _parse_prop(raw: dict, all_types: dict) -> PropInfo:
    """Parse a single JSII property entry into a PropInfo."""
    name = raw["name"]
    type_ref = raw.get("type", {})
    type_name = _resolve_type_name(type_ref)
    docs = raw.get("docs", {})
    description = docs.get("summary", "")
    if docs.get("remarks"):
        description = f"{description}\n{docs['remarks']}" if description else docs["remarks"]
    required = not raw.get("optional", False)
    default_value = docs.get("default")

    # Determine if this prop references another library construct
    fqn = type_ref.get("fqn", "")
    is_ref = False
    ref_name: str | None = None
    if fqn and _is_construct_ref(fqn):
        target = all_types.get(fqn, {})
        # Only flag as construct ref if the target is a class (not interface/enum)
        if target.get("kind") == "class":
            is_ref = True
            ref_name = target.get("name")

    return PropInfo(
        name=name,
        type_name=type_name,
        description=description,
        required=required,
        default_value=default_value,
        is_construct_ref=is_ref,
        construct_ref_name=ref_name,
    )


def _collect_interface_props(
    iface_fqn: str,
    all_types: dict,
    visited: set[str] | None = None,
) -> list[dict]:
    """Recursively collect properties from an interface and its parents.

    Walks the ``interfaces`` list (parent interfaces) to gather inherited
    props. Uses ``visited`` to prevent infinite loops.
    """
    if visited is None:
        visited = set()
    if iface_fqn in visited:
        return []
    visited.add(iface_fqn)

    iface = all_types.get(iface_fqn, {})
    props: list[dict] = list(iface.get("properties", []))

    # Recurse into parent interfaces
    for parent_fqn in iface.get("interfaces", []):
        props.extend(_collect_interface_props(parent_fqn, all_types, visited))

    return props


def _find_props_interface_fqn(type_entry: dict) -> str | None:
    """Find the FQN of the props interface from a construct's initializer.

    Looks at the third constructor parameter (scope, id, props) and returns
    the FQN of the props type if it belongs to the library.
    """
    init = type_entry.get("initializer", {})
    params = init.get("parameters", [])
    if len(params) >= 3:
        props_type = params[2].get("type", {})
        fqn = props_type.get("fqn", "")
        if fqn:
            return fqn
    return None


def _extends_construct(type_entry: dict, all_types: dict) -> bool:
    """Check whether a class ultimately extends constructs.Construct.

    Walks the ``base`` chain up to a depth limit to avoid infinite loops.
    """
    current = type_entry
    for _ in range(20):  # depth limit
        base = current.get("base")
        if not base:
            return False
        if base == "constructs.Construct":
            return True
        current = all_types.get(base, {})
    return False


class ConstructRegistry:
    """Loads .jsii manifest and provides indexed access to construct metadata.

    On init, parses the manifest, filters to public construct classes,
    resolves props inheritance, groups into families, and builds indexes.
    If the manifest is missing or corrupt, enters degraded mode where
    ``is_loaded`` is ``False`` and all queries raise ``DegradedModeError``.
    """

    def __init__(self, jsii_path: str | None = None):
        """Load and index the JSII manifest.

        Args:
            jsii_path: Path to .jsii file. Defaults to bundled manifest.
        """
        self._loaded = False
        self._constructs: dict[str, ConstructInfo] = {}
        self._families: dict[str, FamilyInfo] = {}
        self._library_version = ""
        self._library_name = ""

        path = jsii_path or _default_jsii_path()
        try:
            with open(path) as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError, OSError) as exc:
            logger.warning("Failed to load JSII manifest at %s: %s", path, exc)
            return

        self._load_from_dict(data)

    @classmethod
    def from_dict(cls, data: dict) -> "ConstructRegistry":
        """Create a registry from an in-memory JSII dict (for testing).

        Args:
            data: A dict with the same structure as a .jsii manifest.
        """
        instance = cls.__new__(cls)
        instance._loaded = False
        instance._constructs = {}
        instance._families = {}
        instance._library_version = ""
        instance._library_name = ""
        instance._load_from_dict(data)
        return instance

    def _load_from_dict(self, data: dict) -> None:
        """Parse and index a JSII manifest dict."""
        self._library_name = data.get("name", "")
        self._library_version = data.get("version", "")
        all_types: dict = data.get("types", {})

        # Pass 1: identify construct classes belonging to this library
        family_constructs: dict[str, list[ConstructInfo]] = {}
        family_display: dict[str, str] = {}

        for fqn, entry in all_types.items():
            if not fqn.startswith(_FQN_PREFIX):
                continue
            if entry.get("kind") != "class":
                continue
            if not _extends_construct(entry, all_types):
                continue

            name = entry.get("name", "")
            is_abstract = entry.get("abstract", False)
            description = entry.get("docs", {}).get("summary", "")
            remarks = entry.get("docs", {}).get("remarks", "")
            if remarks:
                description = f"{description}\n{remarks}" if description else remarks

            # Determine module path and family
            loc = entry.get("locationInModule", {})
            filename = loc.get("filename", "")
            family_name, display_name = _resolve_family(filename)

            # Resolve parent class name
            base_fqn = entry.get("base", "")
            parent_class: str | None = None
            if base_fqn and base_fqn.startswith(_FQN_PREFIX):
                parent_class = all_types.get(base_fqn, {}).get("name")

            # Collect props from the props interface (with inheritance)
            props: list[PropInfo] = []
            props_iface_fqn = _find_props_interface_fqn(entry)
            if props_iface_fqn:
                raw_props = _collect_interface_props(props_iface_fqn, all_types)
                seen_names: set[str] = set()
                for rp in raw_props:
                    pname = rp.get("name", "")
                    if pname not in seen_names:
                        seen_names.add(pname)
                        props.append(_parse_prop(rp, all_types))

            info = ConstructInfo(
                name=name,
                fqn=fqn,
                family=family_name,
                description=description,
                props=props,
                parent_class=parent_class,
                is_abstract=is_abstract,
                module_path=filename,
            )
            self._constructs[name] = info

            # Group into families
            family_constructs.setdefault(family_name, []).append(info)
            family_display[family_name] = display_name

        # Build family index
        for fname, constructs in family_constructs.items():
            self._families[fname] = FamilyInfo(
                name=fname,
                display_name=family_display[fname],
                constructs=sorted(c.name for c in constructs),
            )

        self._loaded = True

    # ── Public API ──────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        """Whether the JSII manifest was successfully loaded."""
        return self._loaded

    def _check_loaded(self) -> None:
        if not self._loaded:
            raise DegradedModeError()

    def get_construct(self, name: str) -> ConstructInfo:
        """Get full metadata for a construct by class name.

        Raises:
            DegradedModeError: If the registry is not loaded.
            UnknownConstructError: If the name is not found.
        """
        self._check_loaded()
        info = self._constructs.get(name)
        if info is None:
            raise UnknownConstructError(name, list(self._constructs.keys()))
        return info

    def get_family(self, family: str) -> list[ConstructInfo]:
        """Get all constructs in a family.

        Raises:
            DegradedModeError: If the registry is not loaded.
            UnknownFamilyError: If the family is not found.
        """
        self._check_loaded()
        fam = self._families.get(family)
        if fam is None:
            raise UnknownFamilyError(family, list(self._families.keys()))
        return [self._constructs[n] for n in fam.constructs]

    def list_families(self) -> list[FamilyInfo]:
        """List all construct families with their constructs.

        Raises:
            DegradedModeError: If the registry is not loaded.
        """
        self._check_loaded()
        return sorted(self._families.values(), key=lambda f: f.name)

    def get_catalog(self) -> CatalogInfo:
        """Get the full catalog: all families and constructs.

        Raises:
            DegradedModeError: If the registry is not loaded.
        """
        self._check_loaded()
        return CatalogInfo(
            families=self.list_families(),
            library_version=self._library_version,
            library_name=self._library_name,
        )

    def get_props(self, name: str) -> list[PropInfo]:
        """Get props for a construct, including inherited props.

        Raises:
            DegradedModeError: If the registry is not loaded.
            UnknownConstructError: If the name is not found.
        """
        return self.get_construct(name).props

    def get_construct_types(self, family: str) -> list[str]:
        """Get valid constructType values for a family's scaffold tool.

        Raises:
            DegradedModeError: If the registry is not loaded.
            UnknownFamilyError: If the family is not found.
        """
        self._check_loaded()
        fam = self._families.get(family)
        if fam is None:
            raise UnknownFamilyError(family, list(self._families.keys()))
        return list(fam.constructs)

    def resolve_construct_type(
        self, family: str, user_input: str
    ) -> str | None:
        """Resolve a user-provided construct type to the canonical name.

        Applies the following strategies in order:
        1. Exact match against valid types in the family.
        2. Case-insensitive match (e.g. ``"frontend"`` → ``"Frontend"``).
        3. Static alias lookup (e.g. ``"WebApp"`` → ``"Frontend"``).
        4. Substring match — if exactly one valid type contains the input
           as a case-insensitive substring (e.g. ``"Bedrock"`` →
           ``"BedrockDocumentProcessing"`` when only one match exists).

        Returns the canonical construct name, or ``None`` if no match.

        Raises:
            DegradedModeError: If the registry is not loaded.
            UnknownFamilyError: If the family is not found.
        """
        valid_types = self.get_construct_types(family)

        # 1. Exact match
        if user_input in valid_types:
            return user_input

        # 2. Case-insensitive match
        lower_map = {v.lower(): v for v in valid_types}
        matched = lower_map.get(user_input.lower())
        if matched:
            return matched

        # 3. Static alias lookup (case-insensitive)
        alias_target = _CONSTRUCT_ALIASES.get(user_input.lower())
        if alias_target and alias_target in valid_types:
            return alias_target

        # 4. Substring match (unique only)
        needle = user_input.lower()
        substring_hits = [v for v in valid_types if needle in v.lower()]
        if len(substring_hits) == 1:
            return substring_hits[0]

        return None

