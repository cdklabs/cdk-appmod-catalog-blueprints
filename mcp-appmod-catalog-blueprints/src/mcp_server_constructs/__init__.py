"""MCP server for AppMod Catalog Blueprints CDK constructs.

Exposes construct scaffolding, composition, and documentation
to AI-powered development tools via the Model Context Protocol.
"""

__version__ = "0.1.0"

# Public API — available once server.py is implemented
__all__ = [
    "__version__",
    "create_server",
]


def create_server(examples_path=None, github_repo=None, github_branch=None):
    """Create and configure the MCP server with all tools and resources.

    Args:
        examples_path: Optional path to the examples/ directory.
        github_repo: GitHub repo for fetching examples when local dir unavailable.
        github_branch: Branch to fetch examples from.
    """
    # Will be replaced by the real implementation in task 9
    from mcp_server_constructs.server import create_server as _create_server

    return _create_server(
        examples_path=examples_path,
        github_repo=github_repo,
        github_branch=github_branch,
    )
