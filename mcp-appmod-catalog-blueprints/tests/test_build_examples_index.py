"""Tests for the build_examples_index script."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

import pytest

from mcp_server_constructs.build_examples_index import build_index


@pytest.fixture
def fake_examples(tmp_path):
    """Create a minimal examples directory for index building."""
    # examples/document-processing/fraud-detection/
    ex_dir = tmp_path / "examples" / "document-processing" / "fraud-detection"
    ex_dir.mkdir(parents=True)
    (ex_dir / "README.md").write_text("# Fraud Detection\n")
    (ex_dir / "fraud-detection-stack.ts").write_text("export class FraudStack {}\n")
    (ex_dir / "app.ts").write_text("// entry\n")
    (ex_dir / "resources").mkdir()
    (ex_dir / "sample-files").mkdir()

    # examples/document-processing/fraud-detection/infrastructure/
    infra_dir = ex_dir / "infrastructure"
    infra_dir.mkdir()
    (infra_dir / "extra-stack.ts").write_text("export class ExtraStack {}\n")

    # examples/chatbot/my-chatbot/
    chat_dir = tmp_path / "examples" / "chatbot" / "my-chatbot"
    chat_dir.mkdir(parents=True)
    (chat_dir / "README.md").write_text("# My Chatbot\n")
    (chat_dir / "chat-stack.ts").write_text("export class ChatStack {}\n")

    return tmp_path / "examples"


class TestBuildIndex:
    def test_produces_version_1(self, fake_examples):
        index = build_index(fake_examples)
        assert index["version"] == 1

    def test_discovers_examples(self, fake_examples):
        index = build_index(fake_examples)
        assert "document-processing/fraud-detection" in index["examples"]
        assert "chatbot/my-chatbot" in index["examples"]

    def test_readme_path(self, fake_examples):
        index = build_index(fake_examples)
        fd = index["examples"]["document-processing/fraud-detection"]
        assert fd["readme_path"] == "examples/document-processing/fraud-detection/README.md"

    def test_stack_files_detected(self, fake_examples):
        index = build_index(fake_examples)
        fd = index["examples"]["document-processing/fraud-detection"]
        assert "examples/document-processing/fraud-detection/fraud-detection-stack.ts" in fd["stack_files"]

    def test_infrastructure_subdir_stack_files(self, fake_examples):
        index = build_index(fake_examples)
        fd = index["examples"]["document-processing/fraud-detection"]
        assert "examples/document-processing/fraud-detection/infrastructure/extra-stack.ts" in fd["stack_files"]

    def test_app_ts_excluded(self, fake_examples):
        index = build_index(fake_examples)
        fd = index["examples"]["document-processing/fraud-detection"]
        assert not any("app.ts" in sf for sf in fd["stack_files"])

    def test_resources_detected(self, fake_examples):
        index = build_index(fake_examples)
        fd = index["examples"]["document-processing/fraud-detection"]
        assert fd["has_agent_resources"] is True

    def test_sample_files_detected(self, fake_examples):
        index = build_index(fake_examples)
        fd = index["examples"]["document-processing/fraud-detection"]
        assert fd["has_sample_files"] is True

    def test_no_resources_or_samples(self, fake_examples):
        index = build_index(fake_examples)
        chat = index["examples"]["chatbot/my-chatbot"]
        assert chat["has_agent_resources"] is False
        assert chat["has_sample_files"] is False

    def test_skips_hidden_dirs(self, fake_examples):
        hidden = fake_examples / ".hidden" / "secret"
        hidden.mkdir(parents=True)
        index = build_index(fake_examples)
        assert not any(".hidden" in k for k in index["examples"])

    def test_skips_node_modules(self, fake_examples):
        nm = fake_examples / "chatbot" / "node_modules"
        nm.mkdir(parents=True)
        index = build_index(fake_examples)
        assert not any("node_modules" in k for k in index["examples"])

    def test_output_is_valid_json(self, fake_examples, tmp_path):
        index = build_index(fake_examples)
        out = tmp_path / "output.json"
        out.write_text(json.dumps(index, indent=2), encoding="utf-8")
        reloaded = json.loads(out.read_text(encoding="utf-8"))
        assert reloaded == index
