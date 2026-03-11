"""Build a static examples-index.json from the local examples/ directory.

Run this script during CI/build to generate the bundled index that
eliminates the need for GitHub Trees API calls at runtime. The server
will use this index for structure discovery and only fetch actual file
content (READMEs, stack files) from raw GitHub URLs on demand.

Usage:
    python -m mcp_server_constructs.build_examples_index [--examples-path PATH] [--output PATH]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Directories to skip when scanning
_SKIP_DIRS = {
    "node_modules", ".venv", "cdk.out", "dist", "build",
    "__pycache__", ".pytest_cache", "frontend",
}

_SKIP_TS_FILES = {"app.ts"}
_STACK_SUBDIRS = {"lib", "infrastructure"}


def _default_examples_path() -> Path:
    """Return the default examples path relative to the repo root."""
    # This script lives in src/mcp_server_constructs/
    pkg_dir = Path(__file__).parent
    for candidate in [
        pkg_dir.parent.parent.parent / "examples",  # from src/mcp_server_constructs/
        Path.cwd() / "examples",                     # from repo root
    ]:
        if candidate.is_dir():
            return candidate
    return Path("examples")


def build_index(examples_root: Path) -> dict:
    """Scan the examples directory and produce the index structure.

    Returns a dict with:
        - version: schema version for forward compatibility
        - examples: dict keyed by "category/example-name" with metadata
    """
    examples: dict[str, dict] = {}

    if not examples_root.is_dir():
        print(f"ERROR: examples directory not found at {examples_root}", file=sys.stderr)
        sys.exit(1)

    for category_dir in sorted(examples_root.iterdir()):
        if not category_dir.is_dir() or category_dir.name.startswith("."):
            continue
        if category_dir.name in _SKIP_DIRS:
            continue

        category_name = category_dir.name

        for example_dir in sorted(category_dir.iterdir()):
            if not example_dir.is_dir() or example_dir.name.startswith("."):
                continue
            if example_dir.name in _SKIP_DIRS:
                continue

            example_name = example_dir.name
            key = f"{category_name}/{example_name}"

            readme_path = example_dir / "README.md"
            readme_rel = None
            if readme_path.exists():
                readme_rel = f"examples/{category_name}/{example_name}/README.md"

            # Find stack .ts files
            stack_files: list[str] = []
            for ts_file in sorted(example_dir.glob("*.ts")):
                if ts_file.name in _SKIP_TS_FILES:
                    continue
                stack_files.append(
                    f"examples/{category_name}/{example_name}/{ts_file.name}"
                )
            for subdir in _STACK_SUBDIRS:
                sub = example_dir / subdir
                if sub.is_dir():
                    for ts_file in sorted(sub.glob("*.ts")):
                        stack_files.append(
                            f"examples/{category_name}/{example_name}/{subdir}/{ts_file.name}"
                        )

            examples[key] = {
                "category": category_name,
                "name": example_name,
                "readme_path": readme_rel,
                "stack_files": stack_files,
                "has_agent_resources": (example_dir / "resources").is_dir(),
                "has_sample_files": (example_dir / "sample-files").is_dir(),
            }

    return {
        "version": 1,
        "examples": examples,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build examples-index.json from the local examples/ directory.",
    )
    parser.add_argument(
        "--examples-path",
        default=None,
        help="Path to the examples/ directory. Auto-detected if omitted.",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output path for the JSON file. Defaults to data/examples-index.json.",
    )
    args = parser.parse_args()

    examples_path = Path(args.examples_path) if args.examples_path else _default_examples_path()
    output_path = (
        Path(args.output)
        if args.output
        else Path(__file__).parent / "data" / "examples-index.json"
    )

    index = build_index(examples_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")

    count = len(index["examples"])
    print(f"Built examples index: {count} examples → {output_path}")


if __name__ == "__main__":
    main()
