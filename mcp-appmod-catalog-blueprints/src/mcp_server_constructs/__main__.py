"""Entry point for the MCP server.

Starts the MCP server with stdio transport when run as a module
or via the `mcp-appmod-catalog-blueprints` console script.
"""

import argparse
import asyncio
import sys


def main() -> None:
    """Start the MCP server with stdio transport."""
    parser = argparse.ArgumentParser(
        description="MCP server for AppMod Catalog Blueprints CDK constructs",
    )
    parser.add_argument(
        "--examples-path",
        default=None,
        help="Path to the examples/ directory. Auto-detected if omitted.",
    )
    parser.add_argument(
        "--github-repo",
        default=None,
        help=(
            "GitHub repo in 'owner/name' format for fetching examples "
            "when local directory is unavailable. "
            "Default: cdklabs/cdk-appmod-catalog-blueprints"
        ),
    )
    parser.add_argument(
        "--github-branch",
        default=None,
        help="GitHub branch to fetch examples from. Default: main",
    )
    args = parser.parse_args()

    from mcp_server_constructs.server import create_server

    server = create_server(
        examples_path=args.examples_path,
        github_repo=args.github_repo,
        github_branch=args.github_branch,
    )

    from mcp.server.stdio import stdio_server

    async def _run() -> None:
        async with stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                server.create_initialization_options(),
            )

    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
