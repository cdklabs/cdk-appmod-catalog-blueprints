"""Exception classes for the MCP server.

Each exception provides a descriptive message template for clear
error reporting to AI clients over the MCP protocol.
"""


class JsiiLoadError(Exception):
    """Raised when the .jsii manifest cannot be loaded.

    This typically means the bundled manifest is missing or corrupt.
    The server should fall back to degraded mode.
    """

    def __init__(self, path: str, reason: str = "file not found or unreadable"):
        self.path = path
        super().__init__(
            f"Failed to load JSII manifest at '{path}': {reason}. "
            "Ensure the package was installed correctly. "
            "Try reinstalling: uvx --reinstall mcp-appmod-catalog-blueprints"
        )


class UnknownConstructError(Exception):
    """Raised when a requested construct name is not in the registry."""

    def __init__(self, name: str, valid_names: list[str] | None = None):
        self.name = name
        self.valid_names = valid_names or []
        msg = f"Unknown construct: '{name}'."
        if self.valid_names:
            msg += f" Valid construct types: {', '.join(sorted(self.valid_names))}"
        super().__init__(msg)


class UnknownFamilyError(Exception):
    """Raised when a requested family name is not in the registry."""

    def __init__(self, family: str, valid_families: list[str] | None = None):
        self.family = family
        self.valid_families = valid_families or []
        msg = f"Unknown construct family: '{family}'."
        if self.valid_families:
            msg += f" Valid families: {', '.join(sorted(self.valid_families))}"
        super().__init__(msg)


class CircularDependencyError(Exception):
    """Raised when compose detects circular dependencies."""

    def __init__(self, cycle: list[str]):
        self.cycle = cycle
        cycle_str = " → ".join(cycle)
        super().__init__(
            f"Circular dependency detected: {cycle_str}. "
            "These constructs cannot be composed together. "
            "Consider removing one from the composition."
        )


class IncompatibleConstructsError(Exception):
    """Raised when composed constructs have conflicting props."""

    def __init__(self, construct_a: str, construct_b: str, reason: str):
        self.construct_a = construct_a
        self.construct_b = construct_b
        self.reason = reason
        super().__init__(
            f"Incompatible constructs: {construct_a} and {construct_b}. "
            f"{reason} "
            "Suggestion: compose them in separate stacks or resolve the conflict."
        )


class DegradedModeError(Exception):
    """Raised on tool invocation when the registry failed to load."""

    def __init__(self):
        super().__init__(
            "JSII metadata unavailable. The .jsii manifest could not be loaded. "
            "Ensure the package was installed correctly. "
            "Reinstall with: uvx --reinstall mcp-appmod-catalog-blueprints"
        )
