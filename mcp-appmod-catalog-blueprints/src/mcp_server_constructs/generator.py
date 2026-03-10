"""CodeGenerator: Jinja2-based code snippet generation for CDK constructs.

Generates scaffold and compose snippets in TypeScript, Python, Java,
and .NET using Jinja2 templates populated with registry data and
smart defaults.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from jinja2 import Environment, PackageLoader, select_autoescape

from mcp_server_constructs.defaults import SMART_DEFAULTS
from mcp_server_constructs.models import (
    ConstructInfo,
    Language,
    PropInfo,
    SmartDefault,
)
from mcp_server_constructs.registry import ConstructRegistry


# ── Language conventions ────────────────────────────────────────

_LIBRARY_MODULE = '@cdklabs/cdk-appmod-catalog-blueprints'

# Per-language package/module names for import statements
_LIBRARY_MODULE_BY_LANG: dict[Language, str] = {
    Language.TYPESCRIPT: '@cdklabs/cdk-appmod-catalog-blueprints',
    Language.PYTHON: 'appmod_catalog_blueprints',
    Language.JAVA: 'io.github.cdklabs.appmod_catalog_blueprints',
    Language.DOTNET: 'Cdklabs.AppmodCatalogBlueprints',
}

# Template subdirectory per language
_TEMPLATE_DIR: dict[Language, str] = {
    Language.TYPESCRIPT: 'typescript',
    Language.PYTHON: 'python',
    Language.JAVA: 'java',
    Language.DOTNET: 'dotnet',
}

# Template file names
_SCAFFOLD_TEMPLATE = {
    Language.TYPESCRIPT: 'scaffold.ts.j2',
    Language.PYTHON: 'scaffold.py.j2',
    Language.JAVA: 'scaffold.java.j2',
    Language.DOTNET: 'scaffold.cs.j2',
}

_COMPOSE_TEMPLATE = {
    Language.TYPESCRIPT: 'compose.ts.j2',
    Language.PYTHON: 'compose.py.j2',
    Language.JAVA: 'compose.java.j2',
    Language.DOTNET: 'compose.cs.j2',
}


# ── Naming convention helpers ───────────────────────────────────

def _to_camel_case(name: str) -> str:
    """Convert a camelCase name to camelCase (identity for TS/Java)."""
    return name


def _to_snake_case(name: str) -> str:
    """Convert camelCase to snake_case for Python."""
    s1 = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', name)
    return re.sub(r'([a-z\d])([A-Z])', r'\1_\2', s1).lower()


def _to_pascal_case(name: str) -> str:
    """Convert camelCase to PascalCase for .NET."""
    if not name:
        return name
    return name[0].upper() + name[1:]


_PROP_NAME_CONVERTER: dict[Language, callable] = {
    Language.TYPESCRIPT: _to_camel_case,
    Language.PYTHON: _to_snake_case,
    Language.JAVA: _to_camel_case,
    Language.DOTNET: _to_pascal_case,
}


def _to_variable_id(construct_name: str) -> str:
    """Convert PascalCase construct name to a camelCase variable name."""
    if not construct_name:
        return construct_name
    return construct_name[0].lower() + construct_name[1:]


# ── Template context builders ───────────────────────────────────

@dataclass
class _TemplateProp:
    """A prop ready for template rendering."""

    name: str
    value: str = ''
    comment: str = ''
    is_placeholder: bool = False
    placeholder: str = ''
    has_warning: bool = False
    expected_type: str = ''
    actual_type: str = ''
    is_security_default: bool = False
    is_wired: bool = False
    source_construct: str = ''


@dataclass
class _ImportEntry:
    """An import statement for template rendering."""

    module: str
    names: list[str] = field(default_factory=list)


@dataclass
class _ComposeBlock:
    """A single construct block in a compose template."""

    construct_name: str
    construct_id: str
    id: str
    props: list[_TemplateProp] = field(default_factory=list)
    comment: str = ''


def _detect_value_type(value: str) -> str:
    """Heuristic to detect the type of a string-encoded value."""
    if value in ('true', 'false'):
        return 'boolean'
    try:
        int(value)
        return 'number'
    except ValueError:
        pass
    try:
        float(value)
        return 'number'
    except ValueError:
        pass
    return 'string'


def _check_type_mismatch(prop: PropInfo, value: str) -> str | None:
    """Return the actual type string if there's a mismatch, else None."""
    expected = prop.type_name.lower()
    actual = _detect_value_type(str(value))

    # Only flag clear mismatches for primitive types
    if expected in ('string', 'number', 'boolean') and actual != expected:
        return actual
    return None


def _format_value(value: str, language: Language) -> str:
    """Format a value literal for the target language.

    Wraps string values in the appropriate quotes.
    """
    # Boolean keywords
    if value in ('true', 'false'):
        return value
    # Numeric
    try:
        int(value)
        return value
    except ValueError:
        pass
    try:
        float(value)
        return value
    except ValueError:
        pass
    # Already looks like code (contains parens, braces, 'new' keyword)
    if any(c in value for c in ('(', '{', '[')) or value.startswith('new '):
        return value
    # String literal
    if language == Language.TYPESCRIPT:
        return f"'{value}'"
    return f'"{value}"'


# ── CodeGenerator ───────────────────────────────────────────────

class CodeGenerator:
    """Generates code snippets from construct metadata and Jinja2 templates.

    Uses a ConstructRegistry for construct lookups and Jinja2 templates
    for language-specific code generation. Applies smart defaults,
    handles missing required props with placeholders, and flags type
    mismatches with warning comments.
    """

    def __init__(self, registry: ConstructRegistry):
        """Initialize with a registry for construct lookups.

        Args:
            registry: A loaded ConstructRegistry instance.
        """
        self._registry = registry
        self._env = Environment(
            loader=PackageLoader('mcp_server_constructs', 'templates'),
            autoescape=select_autoescape([]),
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True,
        )

    def scaffold(
        self,
        construct_name: str,
        language: str = 'typescript',
        props_overrides: dict | None = None,
    ) -> str:
        """Generate a scaffold snippet for a single construct.

        Looks up the construct in the registry, merges smart defaults
        with any provided overrides, and renders the appropriate
        language template.

        Args:
            construct_name: Name of the construct to scaffold.
            language: Target language (typescript, python, java, dotnet).
            props_overrides: Optional dict of prop name → value overrides.

        Returns:
            A code string with imports, instantiation, smart defaults,
            and inline comments.
        """
        lang = Language(language)
        info = self._registry.get_construct(construct_name)
        overrides = props_overrides or {}
        convert_name = _PROP_NAME_CONVERTER[lang]

        # Build smart defaults lookup for this construct
        defaults_map: dict[str, SmartDefault] = {}
        for sd in SMART_DEFAULTS.get(construct_name, []):
            defaults_map[sd.prop_name] = sd

        # Build template props
        template_props = self._build_props(
            info.props, defaults_map, overrides, lang, convert_name,
        )

        # Build imports using language-specific module name
        module_name = _LIBRARY_MODULE_BY_LANG.get(lang, _LIBRARY_MODULE)
        imports = [_ImportEntry(
            module=module_name,
            names=[construct_name],
        )]

        # Check if construct supports observability
        has_observability = any(
            p.name == 'enableObservability' for p in info.props
        )

        # Variable ID and construct ID
        var_id = _to_variable_id(construct_name)
        construct_id = construct_name

        # Render template
        template_path = f"{_TEMPLATE_DIR[lang]}/{_SCAFFOLD_TEMPLATE[lang]}"
        template = self._env.get_template(template_path)
        return template.render(
            imports=imports,
            construct_name=construct_name,
            construct_id=construct_id,
            id=var_id,
            props=template_props,
            has_observability=has_observability,
        )

    def compose(
        self,
        constructs: list[str],
        language: str = 'typescript',
        props_overrides: dict[str, dict] | None = None,
    ) -> str:
        """Generate a composed snippet wiring multiple constructs together.

        Resolves dependency order via DependencyResolver, creates shared
        dependencies once, and wires cross-references between constructs.

        Args:
            constructs: List of construct names to compose.
            language: Target language (typescript, python, java, dotnet).
            props_overrides: Optional dict of construct_name → {prop: value}.

        Returns:
            A code string with ordered instantiation blocks and
            cross-reference wiring.
        """
        # Import resolver here to avoid circular imports and allow
        # compose to work once resolver is implemented (task 7)
        from mcp_server_constructs.resolver import DependencyResolver

        lang = Language(language)
        overrides = props_overrides or {}
        convert_name = _PROP_NAME_CONVERTER[lang]

        resolver = DependencyResolver(self._registry)
        ordered = resolver.resolve_order(constructs)
        wiring = resolver.build_wiring(ordered)

        # Collect all construct names for a single import using language-specific module name
        module_name = _LIBRARY_MODULE_BY_LANG.get(lang, _LIBRARY_MODULE)
        all_names = list(ordered)
        imports = [_ImportEntry(module=module_name, names=all_names)]

        # Build blocks in dependency order
        blocks: list[_ComposeBlock] = []
        for name in ordered:
            info = self._registry.get_construct(name)
            construct_overrides = overrides.get(name, {})

            defaults_map: dict[str, SmartDefault] = {}
            for sd in SMART_DEFAULTS.get(name, []):
                defaults_map[sd.prop_name] = sd

            # Get wiring for this construct
            wiring_map = wiring.get(name, {})

            template_props = self._build_props(
                info.props, defaults_map, construct_overrides, lang,
                convert_name, wiring_map=wiring_map,
            )

            var_id = _to_variable_id(name)
            deps = resolver.get_dependencies(name)
            comment = ''
            if deps:
                dep_names = [d for d in deps if d in constructs]
                if dep_names:
                    comment = f"Depends on: {', '.join(dep_names)}"

            blocks.append(_ComposeBlock(
                construct_name=name,
                construct_id=name,
                id=var_id,
                props=template_props,
                comment=comment,
            ))

        # Render template
        template_path = f"{_TEMPLATE_DIR[lang]}/{_COMPOSE_TEMPLATE[lang]}"
        template = self._env.get_template(template_path)
        return template.render(imports=imports, blocks=blocks)

    def _build_props(
        self,
        props: list[PropInfo],
        defaults_map: dict[str, SmartDefault],
        overrides: dict,
        lang: Language,
        convert_name: callable,
        wiring_map: dict[str, str] | None = None,
    ) -> list[_TemplateProp]:
        """Build the list of template props for rendering.

        Handles required/optional props, smart defaults, overrides,
        placeholders for missing required props, type mismatch warnings,
        and wiring from compose.
        """
        wiring_map = wiring_map or {}
        template_props: list[_TemplateProp] = []

        for prop in props:
            rendered_name = convert_name(prop.name)

            # Check if this prop is wired from another construct
            if prop.name in wiring_map:
                source_var = wiring_map[prop.name]
                # Find the source construct name from the variable
                source_construct = _to_pascal_case(source_var) if source_var else ''
                template_props.append(_TemplateProp(
                    name=rendered_name,
                    value=source_var,
                    is_wired=True,
                    source_construct=source_construct,
                ))
                continue

            # Check if user provided an override
            if prop.name in overrides:
                value = str(overrides[prop.name])
                mismatch = _check_type_mismatch(prop, value)
                formatted = _format_value(value, lang)
                if mismatch:
                    template_props.append(_TemplateProp(
                        name=rendered_name,
                        value=formatted,
                        has_warning=True,
                        expected_type=prop.type_name,
                        actual_type=mismatch,
                    ))
                else:
                    comment = prop.description if prop.description else ''
                    template_props.append(_TemplateProp(
                        name=rendered_name,
                        value=formatted,
                        comment=comment,
                    ))
                continue

            # Check if there's a smart default
            if prop.name in defaults_map:
                sd = defaults_map[prop.name]
                template_props.append(_TemplateProp(
                    name=rendered_name,
                    value=sd.value,
                    comment=sd.comment,
                    is_security_default=sd.security_relevant,
                ))
                continue

            # Required prop with no override and no default → placeholder
            if prop.required:
                template_props.append(_TemplateProp(
                    name=rendered_name,
                    is_placeholder=True,
                    placeholder=f'<REQUIRED: {prop.type_name}>',
                    comment=f"provide {prop.description}" if prop.description else f"provide a value of type {prop.type_name}",
                ))
                continue

            # Optional prop with a JSII default — skip (CDK handles it)
            # Optional prop with no default and no smart default — skip

        return template_props
