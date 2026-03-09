"""Tests for ExampleRegistry: scanning, parsing, and indexed access."""

import textwrap
from pathlib import Path

import pytest

from mcp_server_constructs.examples import (
    ExampleInfo,
    ExampleRegistry,
    _extract_constructs,
    _extract_description,
    _to_display_name,
)


# ── Unit helpers ─────────────────────────────────────────────────


class TestHelpers:
    def test_to_display_name(self):
        assert _to_display_name("document-processing") == "Document Processing"
        assert _to_display_name("fraud-detection") == "Fraud Detection"
        assert _to_display_name("rag-customer-support") == "Rag Customer Support"

    def test_extract_description_from_readme(self):
        readme = textwrap.dedent("""\
            # My Example

            [![Badge](https://example.com)]

            This is a great example that shows how to use constructs.

            ## Architecture
            Some details here.
        """)
        desc = _extract_description(readme)
        assert desc == "This is a great example that shows how to use constructs."

    def test_extract_description_empty_readme(self):
        assert _extract_description("") == ""
        assert _extract_description("# Title Only\n") == ""

    def test_extract_constructs_from_ts(self):
        code = textwrap.dedent("""\
            import { Stack } from 'aws-cdk-lib';
            import { AgenticDocumentProcessing, QueuedS3Adapter } from '@cdklabs/cdk-appmod-catalog-blueprints';
            import { Bucket } from 'aws-cdk-lib/aws-s3';
        """)
        result = _extract_constructs(code)
        assert result == ["AgenticDocumentProcessing", "QueuedS3Adapter"]

    def test_extract_constructs_no_library_import(self):
        code = "import { Stack } from 'aws-cdk-lib';\n"
        assert _extract_constructs(code) == []

    def test_extract_constructs_multiple_imports(self):
        code = textwrap.dedent("""\
            import { BedrockDocumentProcessing, EventbridgeBroker } from '@cdklabs/cdk-appmod-catalog-blueprints';
            import { BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
        """)
        result = _extract_constructs(code)
        assert "BatchAgent" in result
        assert "BedrockDocumentProcessing" in result
        assert "EventbridgeBroker" in result


# ── Fixture: create a fake examples directory ────────────────────


@pytest.fixture
def fake_examples(tmp_path):
    """Create a minimal examples directory structure for testing."""
    # examples/doc-processing/my-example/
    ex_dir = tmp_path / "examples" / "doc-processing" / "my-example"
    ex_dir.mkdir(parents=True)

    (ex_dir / "README.md").write_text(textwrap.dedent("""\
        # My Example

        A simple example showing BedrockDocumentProcessing usage.

        ## Architecture
        Details here.
    """))

    (ex_dir / "my-example-stack.ts").write_text(textwrap.dedent("""\
        import { Stack } from 'aws-cdk-lib';
        import { BedrockDocumentProcessing, QueuedS3Adapter } from '@cdklabs/cdk-appmod-catalog-blueprints';

        export class MyExampleStack extends Stack {}
    """))

    (ex_dir / "app.ts").write_text("// app entry point\n")

    # Add resources/ dir
    (ex_dir / "resources").mkdir()
    (ex_dir / "resources" / "system_prompt.txt").write_text("You are an agent.")

    # examples/doc-processing/another-example/
    ex2_dir = tmp_path / "examples" / "doc-processing" / "another-example"
    ex2_dir.mkdir(parents=True)

    (ex2_dir / "README.md").write_text("# Another Example\n\nUses BatchAgent.\n")
    (ex2_dir / "another-stack.ts").write_text(textwrap.dedent("""\
        import { BatchAgent } from '@cdklabs/cdk-appmod-catalog-blueprints';
        export class AnotherStack {}
    """))

    # examples/chatbot/chat-example/
    chat_dir = tmp_path / "examples" / "chatbot" / "chat-example"
    chat_dir.mkdir(parents=True)

    (chat_dir / "README.md").write_text("# Chat Example\n\nA chatbot demo.\n")
    (chat_dir / "chat-stack.ts").write_text(textwrap.dedent("""\
        import { BatchAgent, BedrockKnowledgeBase } from '@cdklabs/cdk-appmod-catalog-blueprints';
        export class ChatStack {}
    """))

    # Add sample-files/ to chat example
    (chat_dir / "sample-files").mkdir()

    return tmp_path / "examples"


@pytest.fixture
def example_registry(fake_examples):
    return ExampleRegistry(examples_path=str(fake_examples))


# ── Loading ──────────────────────────────────────────────────────


class TestLoading:
    def test_loads_from_directory(self, example_registry):
        assert example_registry.is_loaded is True

    def test_missing_directory_not_loaded(self, tmp_path):
        reg = ExampleRegistry(
            examples_path=str(tmp_path / "nonexistent"),
            enable_github_fallback=False,
        )
        assert reg.is_loaded is False

    def test_empty_directory_not_loaded(self, tmp_path):
        empty = tmp_path / "examples"
        empty.mkdir()
        reg = ExampleRegistry(
            examples_path=str(empty),
            enable_github_fallback=False,
        )
        assert reg.is_loaded is False


# ── Categories ───────────────────────────────────────────────────


class TestCategories:
    def test_list_categories(self, example_registry):
        cats = example_registry.list_categories()
        names = [c.name for c in cats]
        assert "doc-processing" in names
        assert "chatbot" in names

    def test_category_has_examples(self, example_registry):
        cats = {c.name: c for c in example_registry.list_categories()}
        assert "my-example" in cats["doc-processing"].examples
        assert "another-example" in cats["doc-processing"].examples
        assert "chat-example" in cats["chatbot"].examples


# ── Example lookup ───────────────────────────────────────────────


class TestGetExample:
    def test_get_existing_example(self, example_registry):
        ex = example_registry.get_example("doc-processing", "my-example")
        assert ex is not None
        assert ex.name == "my-example"
        assert ex.category == "doc-processing"

    def test_get_nonexistent_example(self, example_registry):
        assert example_registry.get_example("doc-processing", "nope") is None

    def test_example_constructs_parsed(self, example_registry):
        ex = example_registry.get_example("doc-processing", "my-example")
        assert "BedrockDocumentProcessing" in ex.constructs_used
        assert "QueuedS3Adapter" in ex.constructs_used

    def test_example_description_extracted(self, example_registry):
        ex = example_registry.get_example("doc-processing", "my-example")
        assert "BedrockDocumentProcessing" in ex.description

    def test_example_has_agent_resources(self, example_registry):
        ex = example_registry.get_example("doc-processing", "my-example")
        assert ex.has_agent_resources is True

    def test_example_has_sample_files(self, example_registry):
        chat = example_registry.get_example("chatbot", "chat-example")
        assert chat.has_sample_files is True
        ex = example_registry.get_example("doc-processing", "my-example")
        assert ex.has_sample_files is False

    def test_example_readme_content(self, example_registry):
        ex = example_registry.get_example("doc-processing", "my-example")
        assert "# My Example" in ex.readme_content

    def test_example_stack_files(self, example_registry):
        ex = example_registry.get_example("doc-processing", "my-example")
        assert len(ex.stack_files) == 1
        assert "my-example-stack.ts" in ex.stack_files[0]

    def test_app_ts_excluded_from_stack_files(self, example_registry):
        ex = example_registry.get_example("doc-processing", "my-example")
        assert not any("app.ts" in sf for sf in ex.stack_files)


# ── Listing ──────────────────────────────────────────────────────


class TestListExamples:
    def test_list_all(self, example_registry):
        all_ex = example_registry.list_examples()
        assert len(all_ex) == 3

    def test_list_by_category(self, example_registry):
        dp = example_registry.list_examples(category="doc-processing")
        assert len(dp) == 2
        names = [e.name for e in dp]
        assert "my-example" in names
        assert "another-example" in names

    def test_list_empty_category(self, example_registry):
        result = example_registry.list_examples(category="nonexistent")
        assert result == []


# ── Find by construct ────────────────────────────────────────────


class TestFindByConstruct:
    def test_find_by_construct(self, example_registry):
        results = example_registry.find_by_construct("BatchAgent")
        names = [e.name for e in results]
        assert "another-example" in names
        assert "chat-example" in names

    def test_find_by_construct_not_found(self, example_registry):
        assert example_registry.find_by_construct("NonExistent") == []

    def test_get_all_constructs_used(self, example_registry):
        mapping = example_registry.get_all_constructs_used()
        assert "BedrockDocumentProcessing" in mapping
        assert "BatchAgent" in mapping
        assert "BedrockKnowledgeBase" in mapping
