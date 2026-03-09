"""Tests for ExampleRegistry GitHub fallback behavior."""

from __future__ import annotations

import textwrap
from unittest.mock import patch, MagicMock

import pytest

from mcp_server_constructs.examples import ExampleRegistry
from mcp_server_constructs.github_fetcher import GitHubExampleFetcher


# ── Helpers ──────────────────────────────────────────────────────


FAKE_EXAMPLE_MAP = {
    "document-processing/fraud-detection": {
        "category": "document-processing",
        "name": "fraud-detection",
        "readme_path": "examples/document-processing/fraud-detection/README.md",
        "stack_files": [
            "examples/document-processing/fraud-detection/fraud-detection-stack.ts",
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
}

FAKE_FILES = {
    "examples/document-processing/fraud-detection/README.md": textwrap.dedent("""\
        # Fraud Detection

        Multi-tool fraud detection using AgenticDocumentProcessing.
    """),
    "examples/document-processing/fraud-detection/fraud-detection-stack.ts": textwrap.dedent("""\
        import { AgenticDocumentProcessing, QueuedS3Adapter } from '@cdklabs/cdk-appmod-catalog-blueprints';
        export class FraudDetectionStack {}
    """),
    "examples/chatbot/my-chatbot/README.md": textwrap.dedent("""\
        # My Chatbot

        A chatbot example using BatchAgent.
    """),
    "examples/chatbot/my-chatbot/chat-stack.ts": textwrap.dedent("""\
        import { BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
        export class ChatStack {}
    """),
}


def _mock_fetcher():
    """Create a mock GitHubExampleFetcher that returns fake data."""
    fetcher = MagicMock(spec=GitHubExampleFetcher)
    fetcher.discover_examples.return_value = FAKE_EXAMPLE_MAP
    fetcher.fetch_file.side_effect = lambda path: FAKE_FILES.get(path, "")
    return fetcher


# ── Tests ────────────────────────────────────────────────────────


class TestGitHubFallback:
    """Tests that ExampleRegistry falls back to GitHub when local dir is missing."""

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_fallback_triggers_on_missing_dir(self, MockFetcher, tmp_path):
        MockFetcher.return_value = _mock_fetcher()
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
        )
        # Accessing is_loaded triggers the lazy fetch
        assert reg.is_loaded is True
        MockFetcher.assert_called_once()

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_fallback_loads_examples(self, MockFetcher, tmp_path):
        MockFetcher.return_value = _mock_fetcher()
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
        )
        examples = reg.list_examples()
        assert len(examples) == 2
        names = [e.name for e in examples]
        assert "fraud-detection" in names
        assert "my-chatbot" in names

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_fallback_parses_constructs(self, MockFetcher, tmp_path):
        MockFetcher.return_value = _mock_fetcher()
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
        )
        ex = reg.get_example("document-processing", "fraud-detection")
        assert "AgenticDocumentProcessing" in ex.constructs_used
        assert "QueuedS3Adapter" in ex.constructs_used

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_fallback_extracts_description(self, MockFetcher, tmp_path):
        MockFetcher.return_value = _mock_fetcher()
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
        )
        ex = reg.get_example("document-processing", "fraud-detection")
        assert "fraud detection" in ex.description.lower()

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_fallback_categories(self, MockFetcher, tmp_path):
        MockFetcher.return_value = _mock_fetcher()
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
        )
        cats = reg.list_categories()
        names = [c.name for c in cats]
        assert "document-processing" in names
        assert "chatbot" in names

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_fallback_find_by_construct(self, MockFetcher, tmp_path):
        MockFetcher.return_value = _mock_fetcher()
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
        )
        results = reg.find_by_construct("BatchAgent")
        assert len(results) == 1
        assert results[0].name == "my-chatbot"

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_fallback_only_attempted_once(self, MockFetcher, tmp_path):
        mock_fetcher = _mock_fetcher()
        MockFetcher.return_value = mock_fetcher
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
        )
        # Multiple accesses should only trigger one fetch
        reg.is_loaded
        reg.list_examples()
        reg.list_categories()
        mock_fetcher.discover_examples.assert_called_once()

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_fallback_handles_fetch_error(self, MockFetcher, tmp_path):
        mock_fetcher = MagicMock(spec=GitHubExampleFetcher)
        mock_fetcher.discover_examples.side_effect = Exception("Network error")
        MockFetcher.return_value = mock_fetcher
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
        )
        # Should not raise, just return not loaded
        assert reg.is_loaded is False

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_fallback_handles_empty_tree(self, MockFetcher, tmp_path):
        mock_fetcher = MagicMock(spec=GitHubExampleFetcher)
        mock_fetcher.discover_examples.return_value = {}
        MockFetcher.return_value = mock_fetcher
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
        )
        assert reg.is_loaded is False


class TestGitHubFallbackDisabled:
    """Tests that GitHub fallback can be disabled."""

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_no_fallback_when_disabled(self, MockFetcher, tmp_path):
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
            enable_github_fallback=False,
        )
        assert reg.is_loaded is False
        MockFetcher.assert_not_called()


class TestLocalTakesPrecedence:
    """Tests that local filesystem scan takes precedence over GitHub."""

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_no_github_fetch_when_local_exists(self, MockFetcher, tmp_path):
        # Create a minimal local examples dir
        ex_dir = tmp_path / "examples" / "testing" / "my-test"
        ex_dir.mkdir(parents=True)
        (ex_dir / "README.md").write_text("# Test\n\nA test example.\n")
        (ex_dir / "test-stack.ts").write_text(
            "import { Network } from '@cdklabs/cdk-appmod-catalog-blueprints';\n"
        )

        reg = ExampleRegistry(examples_path=str(tmp_path / "examples"))
        assert reg.is_loaded is True
        # GitHub fetcher should never be instantiated
        MockFetcher.assert_not_called()


class TestCustomGitHubParams:
    """Tests that custom GitHub repo/branch are passed through."""

    @patch("mcp_server_constructs.github_fetcher.GitHubExampleFetcher")
    def test_custom_repo_and_branch(self, MockFetcher, tmp_path):
        MockFetcher.return_value = _mock_fetcher()
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
            github_repo="my-org/my-repo",
            github_branch="develop",
        )
        reg.is_loaded  # trigger lazy load
        MockFetcher.assert_called_once_with(
            repo="my-org/my-repo",
            branch="develop",
        )
