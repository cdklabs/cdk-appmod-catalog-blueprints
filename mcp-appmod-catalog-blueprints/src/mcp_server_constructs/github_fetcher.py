"""Fetch examples from GitHub when the local examples/ directory is unavailable.

Uses the GitHub Trees API to discover example directories, then fetches
READMEs and stack files via raw content URLs. Results are cached in memory
for the lifetime of the server process.
"""

from __future__ import annotations

import logging
import re
import urllib.request
import urllib.error
import json
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_REPO = "cdklabs/cdk-appmod-catalog-blueprints"
_DEFAULT_BRANCH = "main"
_EXAMPLES_PREFIX = "examples/"

# Directories to skip when scanning the tree
_SKIP_DIRS = {
    "node_modules", ".venv", "cdk.out", "dist", "build",
    "__pycache__", ".pytest_cache", "frontend",
}

# File patterns we care about
_README_NAME = "README.md"
_TS_EXTENSION = ".ts"
_SKIP_TS_FILES = {"app.ts"}

# Subdirectories to check for stack files
_STACK_SUBDIRS = {"lib", "infrastructure"}

_REQUEST_TIMEOUT = 15  # seconds


@dataclass(frozen=True)
class GitHubTreeEntry:
    """A single entry from the GitHub Trees API response."""
    path: str
    type: str  # "blob" or "tree"


def _github_api_get(url: str) -> dict[str, Any]:
    """Make a GET request to the GitHub API and return parsed JSON."""
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "mcp-appmod-catalog-blueprints",
        },
    )
    with urllib.request.urlopen(req, timeout=_REQUEST_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _github_raw_get(url: str) -> str:
    """Fetch raw file content from GitHub."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "mcp-appmod-catalog-blueprints"},
    )
    with urllib.request.urlopen(req, timeout=_REQUEST_TIMEOUT) as resp:
        return resp.read().decode("utf-8")


def _is_in_skip_dir(path: str) -> bool:
    """Check if a path is inside a directory we want to skip."""
    parts = path.split("/")
    return any(part in _SKIP_DIRS for part in parts)


def _parse_example_structure(
    tree_entries: list[GitHubTreeEntry],
) -> dict[str, dict[str, Any]]:
    """Parse the GitHub tree into a structured map of examples.

    Returns a dict keyed by "category/example-name" with metadata about
    which files exist (READMEs, stack files, resources/, sample-files/).
    """
    examples: dict[str, dict[str, Any]] = {}

    for entry in tree_entries:
        path = entry.path
        if not path.startswith(_EXAMPLES_PREFIX):
            continue
        if _is_in_skip_dir(path):
            continue

        # Strip "examples/" prefix
        rel = path[len(_EXAMPLES_PREFIX):]
        parts = rel.split("/")

        # We need at least category/example-name/something
        if len(parts) < 3:
            continue

        category = parts[0]
        example_name = parts[1]
        key = f"{category}/{example_name}"
        rest = "/".join(parts[2:])

        if key not in examples:
            examples[key] = {
                "category": category,
                "name": example_name,
                "readme_path": None,
                "stack_files": [],
                "has_agent_resources": False,
                "has_sample_files": False,
            }

        ex = examples[key]

        # Check for README.md at example root
        if rest == _README_NAME and entry.type == "blob":
            ex["readme_path"] = path

        # Check for stack .ts files at example root (not app.ts)
        if (
            len(parts) == 3
            and entry.type == "blob"
            and rest.endswith(_TS_EXTENSION)
            and rest not in _SKIP_TS_FILES
        ):
            ex["stack_files"].append(path)

        # Check for stack .ts files in lib/ or infrastructure/
        if (
            len(parts) == 4
            and parts[2] in _STACK_SUBDIRS
            and entry.type == "blob"
            and rest.endswith(_TS_EXTENSION)
        ):
            ex["stack_files"].append(path)

        # Check for resources/ directory
        if parts[2] == "resources" and entry.type == "tree":
            ex["has_agent_resources"] = True

        # Check for sample-files/ directory
        if parts[2] == "sample-files" and entry.type == "tree":
            ex["has_sample_files"] = True

    return examples


class GitHubExampleFetcher:
    """Fetches example metadata and content from GitHub.

    Uses the Trees API for directory discovery (single API call) and
    raw content URLs for file fetching. All results are cached in memory.
    """

    def __init__(
        self,
        repo: str = _DEFAULT_REPO,
        branch: str = _DEFAULT_BRANCH,
    ):
        self._repo = repo
        self._branch = branch
        self._tree_url = (
            f"https://api.github.com/repos/{repo}/git/trees/{branch}?recursive=1"
        )
        self._raw_base = (
            f"https://raw.githubusercontent.com/{repo}/{branch}"
        )
        self._file_cache: dict[str, str] = {}

    def fetch_tree(self) -> list[GitHubTreeEntry]:
        """Fetch the full repository tree from GitHub.

        Returns a list of tree entries filtered to the examples/ directory.

        Raises:
            urllib.error.URLError: If the GitHub API request fails.
        """
        data = _github_api_get(self._tree_url)
        entries = []
        for item in data.get("tree", []):
            path = item.get("path", "")
            if path.startswith(_EXAMPLES_PREFIX):
                entries.append(
                    GitHubTreeEntry(path=path, type=item.get("type", "blob"))
                )
        return entries

    def fetch_file(self, path: str) -> str:
        """Fetch a single file's content from GitHub raw URLs.

        Results are cached in memory for the lifetime of this fetcher.

        Args:
            path: Repository-relative path (e.g., "examples/doc-processing/fraud/README.md")

        Raises:
            urllib.error.URLError: If the fetch fails.
        """
        if path in self._file_cache:
            return self._file_cache[path]

        url = f"{self._raw_base}/{path}"
        content = _github_raw_get(url)
        self._file_cache[path] = content
        return content

    def discover_examples(self) -> dict[str, dict[str, Any]]:
        """Discover all examples by fetching the repo tree.

        Returns the parsed example structure map.

        Raises:
            urllib.error.URLError: If the GitHub API request fails.
        """
        entries = self.fetch_tree()
        return _parse_example_structure(entries)
