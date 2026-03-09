"""ExampleRegistry: scans the examples/ directory for deployable example applications.

Discovers example directories, parses stack files for construct imports,
reads READMEs, and provides indexed access by category and construct usage.

When the local examples/ directory is unavailable (e.g., when installed via
uvx from GitHub), falls back to fetching example metadata from the GitHub
repository at runtime.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

_DEFAULT_GITHUB_REPO = "cdklabs/cdk-appmod-catalog-blueprints"
_DEFAULT_GITHUB_BRANCH = "main"

# Library import pattern to detect which constructs an example uses
_IMPORT_PATTERN = re.compile(
    r"""from\s+['"]@cdklabs/cdk-appmod-catalog-blueprints['"]\s*;?\s*$"""
    r"""|"""
    r"""import\s*\{([^}]+)\}\s*from\s+['"]@cdklabs/cdk-appmod-catalog-blueprints['"]""",
    re.MULTILINE,
)

_NAMED_IMPORT_PATTERN = re.compile(
    r"""import\s*\{([^}]+)\}\s*from\s+['"]@cdklabs/cdk-appmod-catalog-blueprints['"]""",
    re.MULTILINE,
)


@dataclass(frozen=True)
class ExampleInfo:
    """Metadata for a single example application."""

    name: str                         # e.g., "fraud-detection"
    category: str                     # e.g., "document-processing"
    display_name: str                 # e.g., "Fraud Detection"
    description: str                  # First paragraph from README
    constructs_used: list[str]        # e.g., ["AgenticDocumentProcessing", "QueuedS3Adapter"]
    stack_files: list[str]            # Relative paths to stack .ts files
    has_agent_resources: bool         # Whether resources/ dir exists
    has_sample_files: bool            # Whether sample-files/ dir exists
    readme_content: str               # Full README content
    relative_path: str                # e.g., "examples/document-processing/fraud-detection"


@dataclass(frozen=True)
class ExampleCategoryInfo:
    """Metadata for an example category."""

    name: str                         # e.g., "document-processing"
    display_name: str                 # e.g., "Document Processing"
    examples: list[str]               # Example names in this category


def _to_display_name(kebab: str) -> str:
    """Convert kebab-case to Title Case display name."""
    return " ".join(word.capitalize() for word in kebab.split("-"))


def _extract_description(readme: str) -> str:
    """Extract the first meaningful paragraph from a README."""
    lines = readme.split("\n")
    collecting = False
    paragraph: list[str] = []

    for line in lines:
        stripped = line.strip()
        # Skip badges, empty lines, and headings before first paragraph
        if not collecting:
            if stripped.startswith("#"):
                continue
            if stripped.startswith("[![") or stripped.startswith("!["):
                continue
            if not stripped:
                continue
            collecting = True

        if collecting:
            if not stripped and paragraph:
                break
            if stripped.startswith("#"):
                break
            paragraph.append(stripped)

    return " ".join(paragraph) if paragraph else ""


def _extract_constructs(content: str) -> list[str]:
    """Extract construct names imported from the library in a .ts file."""
    constructs: list[str] = []
    for match in _NAMED_IMPORT_PATTERN.finditer(content):
        imports_str = match.group(1)
        for name in imports_str.split(","):
            name = name.strip()
            if name:
                constructs.append(name)
    return sorted(set(constructs))


def _find_stack_files(example_dir: Path) -> list[Path]:
    """Find TypeScript stack files in an example directory."""
    stack_files: list[Path] = []
    for ts_file in example_dir.glob("*.ts"):
        if ts_file.name in ("app.ts",):
            continue
        stack_files.append(ts_file)
    # Also check lib/ and infrastructure/ subdirectories
    for subdir in ("lib", "infrastructure"):
        sub = example_dir / subdir
        if sub.is_dir():
            for ts_file in sub.glob("*.ts"):
                stack_files.append(ts_file)
    return stack_files


class ExampleRegistry:
    """Scans examples/ directory and provides indexed access to example metadata.

    On init, attempts to walk the local examples directory tree. If the local
    directory is unavailable, lazily fetches example metadata from GitHub on
    first access.
    """

    def __init__(
        self,
        examples_path: str | None = None,
        *,
        github_repo: str = _DEFAULT_GITHUB_REPO,
        github_branch: str = _DEFAULT_GITHUB_BRANCH,
        enable_github_fallback: bool = True,
    ):
        """Load and index examples from the given directory.

        Args:
            examples_path: Path to the examples/ directory.
                Defaults to ``../../examples`` relative to this file
                (works when installed from the repo root).
            github_repo: GitHub repo in "owner/name" format for fallback fetching.
            github_branch: Branch to fetch from when using GitHub fallback.
            enable_github_fallback: Whether to fetch from GitHub when local
                examples are unavailable. Defaults to True.
        """
        self._loaded = False
        self._github_attempted = False
        self._github_repo = github_repo
        self._github_branch = github_branch
        self._enable_github_fallback = enable_github_fallback
        self._examples: dict[str, ExampleInfo] = {}
        self._categories: dict[str, ExampleCategoryInfo] = {}
        self._construct_to_examples: dict[str, list[str]] = {}

        path = Path(examples_path) if examples_path else self._default_path()
        if path.is_dir():
            self._scan(path)
        else:
            logger.info(
                "Local examples directory not found at %s; "
                "will fetch from GitHub on first access.",
                path,
            )

    @staticmethod
    def _default_path() -> Path:
        """Return the default examples path relative to the package."""
        # When running from repo: mcp-appmod-catalog-blueprints/src/mcp_server_constructs/
        # examples/ is at repo root: ../../examples relative to this file
        pkg_dir = Path(__file__).parent
        # Try repo-relative path
        for candidate in [
            pkg_dir.parent.parent.parent / "examples",  # from src/mcp_server_constructs/
            Path.cwd() / "examples",                     # from repo root
        ]:
            if candidate.is_dir():
                return candidate
        return Path("examples")  # fallback

    def _scan(self, examples_root: Path) -> None:
        """Walk the examples directory and build indexes."""
        category_examples: dict[str, list[str]] = {}

        # Examples are organized as examples/{category}/{example-name}/
        for category_dir in sorted(examples_root.iterdir()):
            if not category_dir.is_dir() or category_dir.name.startswith("."):
                continue

            category_name = category_dir.name

            for example_dir in sorted(category_dir.iterdir()):
                if not example_dir.is_dir() or example_dir.name.startswith("."):
                    continue
                if example_dir.name == "node_modules":
                    continue

                example_name = example_dir.name
                readme_path = example_dir / "README.md"
                readme_content = ""
                if readme_path.exists():
                    try:
                        readme_content = readme_path.read_text(encoding="utf-8")
                    except OSError:
                        pass

                # Find and parse stack files for construct imports
                all_constructs: list[str] = []
                stack_file_paths: list[str] = []
                for sf in _find_stack_files(example_dir):
                    try:
                        content = sf.read_text(encoding="utf-8")
                        all_constructs.extend(_extract_constructs(content))
                        stack_file_paths.append(
                            str(sf.relative_to(examples_root.parent))
                        )
                    except OSError:
                        pass

                constructs_used = sorted(set(all_constructs))
                description = _extract_description(readme_content)

                info = ExampleInfo(
                    name=example_name,
                    category=category_name,
                    display_name=_to_display_name(example_name),
                    description=description,
                    constructs_used=constructs_used,
                    stack_files=stack_file_paths,
                    has_agent_resources=(example_dir / "resources").is_dir(),
                    has_sample_files=(example_dir / "sample-files").is_dir(),
                    readme_content=readme_content,
                    relative_path=str(example_dir.relative_to(examples_root.parent)),
                )

                key = f"{category_name}/{example_name}"
                self._examples[key] = info
                category_examples.setdefault(category_name, []).append(example_name)

                # Index by construct usage
                for construct in constructs_used:
                    self._construct_to_examples.setdefault(construct, []).append(key)

        # Build category index
        for cat_name, ex_names in category_examples.items():
            self._categories[cat_name] = ExampleCategoryInfo(
                name=cat_name,
                display_name=_to_display_name(cat_name),
                examples=sorted(ex_names),
            )

        self._loaded = bool(self._examples)

    # ── Lazy GitHub loading ────────────────────────────────────

    def _ensure_loaded(self) -> None:
        """Attempt GitHub fetch if local scan didn't find examples."""
        if self._loaded or self._github_attempted:
            return
        if not self._enable_github_fallback:
            return

        self._github_attempted = True
        try:
            self._fetch_from_github()
        except Exception:
            logger.warning(
                "Failed to fetch examples from GitHub (%s@%s).",
                self._github_repo,
                self._github_branch,
                exc_info=True,
            )

    def _fetch_from_github(self) -> None:
        """Fetch example metadata from GitHub and populate indexes."""
        from mcp_server_constructs.github_fetcher import GitHubExampleFetcher

        fetcher = GitHubExampleFetcher(
            repo=self._github_repo,
            branch=self._github_branch,
        )

        example_map = fetcher.discover_examples()
        if not example_map:
            logger.info("No examples found in GitHub repo tree.")
            return

        category_examples: dict[str, list[str]] = {}

        for key, meta in sorted(example_map.items()):
            category_name = meta["category"]
            example_name = meta["name"]

            # Fetch README content
            readme_content = ""
            if meta["readme_path"]:
                try:
                    readme_content = fetcher.fetch_file(meta["readme_path"])
                except Exception:
                    logger.debug("Failed to fetch README for %s", key)

            # Fetch stack files and extract construct imports
            all_constructs: list[str] = []
            stack_file_paths: list[str] = []
            for sf_path in meta["stack_files"]:
                try:
                    content = fetcher.fetch_file(sf_path)
                    all_constructs.extend(_extract_constructs(content))
                    stack_file_paths.append(sf_path)
                except Exception:
                    logger.debug("Failed to fetch stack file %s", sf_path)

            constructs_used = sorted(set(all_constructs))
            description = _extract_description(readme_content)

            info = ExampleInfo(
                name=example_name,
                category=category_name,
                display_name=_to_display_name(example_name),
                description=description,
                constructs_used=constructs_used,
                stack_files=stack_file_paths,
                has_agent_resources=meta["has_agent_resources"],
                has_sample_files=meta["has_sample_files"],
                readme_content=readme_content,
                relative_path=f"examples/{category_name}/{example_name}",
            )

            self._examples[key] = info
            category_examples.setdefault(category_name, []).append(example_name)

            for construct in constructs_used:
                self._construct_to_examples.setdefault(construct, []).append(key)

        for cat_name, ex_names in category_examples.items():
            self._categories[cat_name] = ExampleCategoryInfo(
                name=cat_name,
                display_name=_to_display_name(cat_name),
                examples=sorted(ex_names),
            )

        self._loaded = bool(self._examples)
        if self._loaded:
            logger.info(
                "Loaded %d examples from GitHub (%s@%s).",
                len(self._examples),
                self._github_repo,
                self._github_branch,
            )

    # ── Public API ──────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        """Whether any examples were found and loaded."""
        self._ensure_loaded()
        return self._loaded

    def get_example(self, category: str, name: str) -> ExampleInfo | None:
        """Get metadata for a specific example."""
        self._ensure_loaded()
        return self._examples.get(f"{category}/{name}")

    def list_categories(self) -> list[ExampleCategoryInfo]:
        """List all example categories."""
        self._ensure_loaded()
        return sorted(self._categories.values(), key=lambda c: c.name)

    def list_examples(self, category: str | None = None) -> list[ExampleInfo]:
        """List examples, optionally filtered by category."""
        self._ensure_loaded()
        if category:
            return [
                info for key, info in sorted(self._examples.items())
                if info.category == category
            ]
        return [info for _, info in sorted(self._examples.items())]

    def find_by_construct(self, construct_name: str) -> list[ExampleInfo]:
        """Find examples that use a specific construct."""
        self._ensure_loaded()
        keys = self._construct_to_examples.get(construct_name, [])
        return [self._examples[k] for k in keys if k in self._examples]

    def get_all_constructs_used(self) -> dict[str, list[str]]:
        """Get a mapping of construct name → example keys that use it."""
        self._ensure_loaded()
        return dict(self._construct_to_examples)
