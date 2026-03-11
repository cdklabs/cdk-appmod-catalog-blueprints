"""Tests for GitHubExampleFetcher: remote index, tree parsing, file fetching, and discovery."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from mcp_server_constructs.github_fetcher import (
    GitHubExampleFetcher,
    GitHubTreeEntry,
    _is_in_skip_dir,
    _parse_remote_index,
    _parse_example_structure,
)


# ── Helper: build a fake tree ────────────────────────────────────


def _tree_entry(path: str, entry_type: str = "blob") -> GitHubTreeEntry:
    return GitHubTreeEntry(path=path, type=entry_type)


FAKE_TREE = [
    # document-processing/fraud-detection
    _tree_entry("examples/document-processing", "tree"),
    _tree_entry("examples/document-processing/fraud-detection", "tree"),
    _tree_entry("examples/document-processing/fraud-detection/README.md"),
    _tree_entry("examples/document-processing/fraud-detection/fraud-detection-stack.ts"),
    _tree_entry("examples/document-processing/fraud-detection/app.ts"),
    _tree_entry("examples/document-processing/fraud-detection/resources", "tree"),
    _tree_entry("examples/document-processing/fraud-detection/sample-files", "tree"),
    # document-processing/fraud-detection/infrastructure subdir
    _tree_entry("examples/document-processing/fraud-detection/infrastructure", "tree"),
    _tree_entry("examples/document-processing/fraud-detection/infrastructure/extra-stack.ts"),
    # chatbot/my-chatbot
    _tree_entry("examples/chatbot", "tree"),
    _tree_entry("examples/chatbot/my-chatbot", "tree"),
    _tree_entry("examples/chatbot/my-chatbot/README.md"),
    _tree_entry("examples/chatbot/my-chatbot/chat-stack.ts"),
    # Should be skipped: node_modules
    _tree_entry("examples/chatbot/my-chatbot/node_modules/some-pkg/index.js"),
    # Non-example files at repo root
    _tree_entry("src/index.ts"),
    _tree_entry("README.md"),
]

FAKE_INDEX = {
    "version": 1,
    "examples": {
        "document-processing/fraud-detection": {
            "category": "document-processing",
            "name": "fraud-detection",
            "readme_path": "examples/document-processing/fraud-detection/README.md",
            "stack_files": [
                "examples/document-processing/fraud-detection/fraud-detection-stack.ts",
                "examples/document-processing/fraud-detection/infrastructure/extra-stack.ts",
            ],
            "has_agent_resources": True,
            "has_sample_files": True,
        },
        "chatbot/my-chatbot": {
            "category": "chatbot",
            "name": "my-chatbot",
            "readme_path": "examples/chatbot/my-chatbot/README.md",
            "stack_files": [
                "examples/chatbot/my-chatbot/chat-stack.ts",
            ],
            "has_agent_resources": False,
            "has_sample_files": False,
        },
    },
}


# ── _is_in_skip_dir ─────────────────────────────────────────────


class TestIsInSkipDir:
    def test_node_modules(self):
        assert _is_in_skip_dir("examples/chatbot/my-chatbot/node_modules/pkg/index.js")

    def test_venv(self):
        assert _is_in_skip_dir("examples/chatbot/my-chatbot/.venv/lib/site.py")

    def test_frontend(self):
        assert _is_in_skip_dir("examples/chatbot/my-chatbot/frontend/build/main.js")

    def test_clean_path(self):
        assert not _is_in_skip_dir("examples/chatbot/my-chatbot/chat-stack.ts")


# ── _parse_remote_index ─────────────────────────────────────────


class TestParseRemoteIndex:
    def test_parses_valid_index(self):
        raw = json.dumps(FAKE_INDEX)
        result = _parse_remote_index(raw)
        assert result is not None
        assert "document-processing/fraud-detection" in result
        assert "chatbot/my-chatbot" in result

    def test_returns_none_for_invalid_json(self):
        assert _parse_remote_index("not json") is None

    def test_returns_none_for_unsupported_version(self):
        raw = json.dumps({"version": 99, "examples": {}})
        assert _parse_remote_index(raw) is None

    def test_returns_none_for_empty_examples(self):
        raw = json.dumps({"version": 1, "examples": {}})
        assert _parse_remote_index(raw) is None

    def test_returns_none_for_missing_examples_key(self):
        raw = json.dumps({"version": 1})
        assert _parse_remote_index(raw) is None


# ── _parse_example_structure (API fallback) ──────────────────────


class TestParseExampleStructure:
    def test_discovers_examples(self):
        result = _parse_example_structure(FAKE_TREE)
        assert "document-processing/fraud-detection" in result
        assert "chatbot/my-chatbot" in result

    def test_readme_detected(self):
        result = _parse_example_structure(FAKE_TREE)
        fd = result["document-processing/fraud-detection"]
        assert fd["readme_path"] == "examples/document-processing/fraud-detection/README.md"

    def test_stack_files_detected(self):
        result = _parse_example_structure(FAKE_TREE)
        fd = result["document-processing/fraud-detection"]
        assert "examples/document-processing/fraud-detection/fraud-detection-stack.ts" in fd["stack_files"]

    def test_app_ts_excluded(self):
        result = _parse_example_structure(FAKE_TREE)
        fd = result["document-processing/fraud-detection"]
        assert not any("app.ts" in sf for sf in fd["stack_files"])

    def test_infrastructure_subdir_stack_files(self):
        result = _parse_example_structure(FAKE_TREE)
        fd = result["document-processing/fraud-detection"]
        assert "examples/document-processing/fraud-detection/infrastructure/extra-stack.ts" in fd["stack_files"]

    def test_resources_detected(self):
        result = _parse_example_structure(FAKE_TREE)
        fd = result["document-processing/fraud-detection"]
        assert fd["has_agent_resources"] is True

    def test_sample_files_detected(self):
        result = _parse_example_structure(FAKE_TREE)
        fd = result["document-processing/fraud-detection"]
        assert fd["has_sample_files"] is True

    def test_no_resources_or_samples(self):
        result = _parse_example_structure(FAKE_TREE)
        chat = result["chatbot/my-chatbot"]
        assert chat["has_agent_resources"] is False
        assert chat["has_sample_files"] is False

    def test_skips_node_modules(self):
        result = _parse_example_structure(FAKE_TREE)
        chat = result["chatbot/my-chatbot"]
        assert not any("node_modules" in sf for sf in chat["stack_files"])

    def test_ignores_non_example_files(self):
        result = _parse_example_structure(FAKE_TREE)
        keys = list(result.keys())
        assert all(k.count("/") == 1 for k in keys)


# ── GitHubExampleFetcher ─────────────────────────────────────────


class TestGitHubExampleFetcher:
    def _make_tree_response(self, entries: list[GitHubTreeEntry]) -> dict:
        return {
            "tree": [
                {"path": e.path, "type": e.type} for e in entries
            ]
        }

    @patch("mcp_server_constructs.github_fetcher._github_api_get")
    def test_fetch_tree(self, mock_api_get):
        mock_api_get.return_value = self._make_tree_response(FAKE_TREE)
        fetcher = GitHubExampleFetcher()
        entries = fetcher.fetch_tree()
        assert all(e.path.startswith("examples/") for e in entries)
        mock_api_get.assert_called_once()

    @patch("mcp_server_constructs.github_fetcher._github_raw_get")
    def test_fetch_file(self, mock_raw_get):
        mock_raw_get.return_value = "# My README"
        fetcher = GitHubExampleFetcher()
        content = fetcher.fetch_file("examples/doc/my-ex/README.md")
        assert content == "# My README"

    @patch("mcp_server_constructs.github_fetcher._github_raw_get")
    def test_fetch_file_caches(self, mock_raw_get):
        mock_raw_get.return_value = "cached content"
        fetcher = GitHubExampleFetcher()
        fetcher.fetch_file("examples/doc/my-ex/README.md")
        fetcher.fetch_file("examples/doc/my-ex/README.md")
        mock_raw_get.assert_called_once()

    def test_custom_repo_and_branch(self):
        fetcher = GitHubExampleFetcher(repo="my-org/my-repo", branch="dev")
        assert "my-org/my-repo" in fetcher._tree_url
        assert "dev" in fetcher._tree_url
        assert "my-org/my-repo" in fetcher._raw_base
        assert "dev" in fetcher._raw_base


class TestDiscoverExamplesWithRemoteIndex:
    """Tests that discover_examples prefers the remote index over Trees API."""

    @patch("mcp_server_constructs.github_fetcher._github_raw_get")
    @patch("mcp_server_constructs.github_fetcher._github_api_get")
    def test_uses_remote_index_when_available(self, mock_api_get, mock_raw_get):
        mock_raw_get.return_value = json.dumps(FAKE_INDEX)

        fetcher = GitHubExampleFetcher()
        result = fetcher.discover_examples()

        assert "document-processing/fraud-detection" in result
        assert "chatbot/my-chatbot" in result
        # Trees API should NOT be called
        mock_api_get.assert_not_called()
        # Raw get should be called once (for the index)
        mock_raw_get.assert_called_once()

    @patch("mcp_server_constructs.github_fetcher._github_raw_get")
    @patch("mcp_server_constructs.github_fetcher._github_api_get")
    def test_falls_back_to_api_when_index_404(self, mock_api_get, mock_raw_get):
        import urllib.error
        mock_raw_get.side_effect = urllib.error.HTTPError(
            url="", code=404, msg="Not Found", hdrs=None, fp=None,
        )
        mock_api_get.return_value = {
            "tree": [{"path": e.path, "type": e.type} for e in FAKE_TREE]
        }

        fetcher = GitHubExampleFetcher()
        result = fetcher.discover_examples()

        assert "document-processing/fraud-detection" in result
        mock_api_get.assert_called_once()

    @patch("mcp_server_constructs.github_fetcher._github_raw_get")
    @patch("mcp_server_constructs.github_fetcher._github_api_get")
    def test_falls_back_to_api_when_index_invalid(self, mock_api_get, mock_raw_get):
        mock_raw_get.return_value = "not valid json"
        mock_api_get.return_value = {
            "tree": [{"path": e.path, "type": e.type} for e in FAKE_TREE]
        }

        fetcher = GitHubExampleFetcher()
        result = fetcher.discover_examples()

        assert "document-processing/fraud-detection" in result
        mock_api_get.assert_called_once()

    @patch("mcp_server_constructs.github_fetcher._github_raw_get")
    @patch("mcp_server_constructs.github_fetcher._github_api_get")
    def test_falls_back_to_api_on_network_error(self, mock_api_get, mock_raw_get):
        import urllib.error
        mock_raw_get.side_effect = urllib.error.URLError("Connection refused")
        mock_api_get.return_value = {
            "tree": [{"path": e.path, "type": e.type} for e in FAKE_TREE]
        }

        fetcher = GitHubExampleFetcher()
        result = fetcher.discover_examples()

        assert "document-processing/fraud-detection" in result
        mock_api_get.assert_called_once()

    @patch("mcp_server_constructs.github_fetcher._github_raw_get")
    def test_file_content_still_fetched_from_github(self, mock_raw_get):
        """Remote index provides structure, file content comes from separate raw fetches."""
        # First call returns the index, subsequent calls return file content
        mock_raw_get.side_effect = [
            json.dumps(FAKE_INDEX),
            "# Fraud Detection README",
        ]

        fetcher = GitHubExampleFetcher()
        result = fetcher.discover_examples()

        assert "document-processing/fraud-detection" in result

        readme = fetcher.fetch_file(
            result["document-processing/fraud-detection"]["readme_path"]
        )
        assert readme == "# Fraud Detection README"
        assert mock_raw_get.call_count == 2

    @patch("mcp_server_constructs.github_fetcher._github_raw_get")
    @patch("mcp_server_constructs.github_fetcher._github_api_get")
    def test_custom_index_path(self, mock_api_get, mock_raw_get):
        mock_raw_get.return_value = json.dumps(FAKE_INDEX)

        fetcher = GitHubExampleFetcher(index_path="custom/path/index.json")
        fetcher.discover_examples()

        # Should fetch from the custom path
        call_url = mock_raw_get.call_args[0][0]
        assert "custom/path/index.json" in call_url
        mock_api_get.assert_not_called()
