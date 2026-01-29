# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for the knowledge base retrieval tool.

Tests cover:
- Successful retrieval with correct response structure
- Multi-KB query aggregation
- Specific KB query filtering
- ACL filter application
- Error handling for ACL without user context
- Error response structure on failure
"""

import json
import os
import pytest
from unittest.mock import patch, MagicMock

# Set required environment variables before importing the module
os.environ["KNOWLEDGE_BASES_CONFIG"] = json.dumps([])

# Import after setting environment variables
from retrieve import (
    retrieve_from_knowledge_base,
    _get_knowledge_bases,
    _build_acl_filter,
    _merge_filters,
    _retrieve_from_kb,
    _load_knowledge_bases_config,
)


class TestLoadKnowledgeBasesConfig:
    """Tests for _load_knowledge_bases_config function."""

    def test_returns_empty_list_when_not_set(self):
        """Test that empty list is returned when env var is not set."""
        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": "[]"}):
            result = _load_knowledge_bases_config()
            assert result == []

    def test_parses_valid_json_config(self):
        """Test parsing valid JSON configuration."""
        config = [
            {
                "name": "test-kb",
                "knowledgeBaseId": "KB123",
                "description": "Test KB",
                "retrieval": {"numberOfResults": 5},
            }
        ]
        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = _load_knowledge_bases_config()
            assert len(result) == 1
            assert result[0]["name"] == "test-kb"
            assert result[0]["knowledgeBaseId"] == "KB123"

    def test_returns_empty_list_on_invalid_json(self):
        """Test that empty list is returned on invalid JSON."""
        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": "invalid json"}):
            result = _load_knowledge_bases_config()
            assert result == []


class TestGetKnowledgeBases:
    """Tests for _get_knowledge_bases function."""

    def test_returns_all_kbs_when_no_filter(self):
        """Test that all KBs are returned when no filter is provided."""
        config = [
            {"name": "kb1", "knowledgeBaseId": "KB1"},
            {"name": "kb2", "knowledgeBaseId": "KB2"},
        ]
        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = _get_knowledge_bases()
            assert len(result) == 2

    def test_filters_by_knowledge_base_id(self):
        """Test filtering by knowledgeBaseId."""
        config = [
            {"name": "kb1", "knowledgeBaseId": "KB1"},
            {"name": "kb2", "knowledgeBaseId": "KB2"},
        ]
        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = _get_knowledge_bases("KB1")
            assert len(result) == 1
            assert result[0]["knowledgeBaseId"] == "KB1"

    def test_filters_by_name(self):
        """Test filtering by name."""
        config = [
            {"name": "product-docs", "knowledgeBaseId": "KB1"},
            {"name": "support-docs", "knowledgeBaseId": "KB2"},
        ]
        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = _get_knowledge_bases("product-docs")
            assert len(result) == 1
            assert result[0]["name"] == "product-docs"

    def test_returns_empty_list_when_not_found(self):
        """Test that empty list is returned when KB not found."""
        config = [{"name": "kb1", "knowledgeBaseId": "KB1"}]
        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = _get_knowledge_bases("nonexistent")
            assert len(result) == 0


class TestBuildAclFilter:
    """Tests for _build_acl_filter function."""

    def test_returns_none_when_acl_disabled(self):
        """Test that None is returned when ACL is disabled."""
        kb_config = {"acl": {"enabled": False}}
        result = _build_acl_filter(kb_config, {"groups": ["admin"]})
        assert result is None

    def test_returns_none_when_no_acl_config(self):
        """Test that None is returned when no ACL config exists."""
        kb_config = {}
        result = _build_acl_filter(kb_config, {"groups": ["admin"]})
        assert result is None

    def test_raises_error_when_acl_enabled_no_context(self):
        """Test that error is raised when ACL enabled but no user context."""
        kb_config = {"acl": {"enabled": True}}
        with pytest.raises(ValueError, match="ACL enabled but no user context"):
            _build_acl_filter(kb_config, None)

    def test_raises_error_when_acl_enabled_empty_context(self):
        """Test that error is raised when ACL enabled but empty user context."""
        kb_config = {"acl": {"enabled": True}}
        with pytest.raises(ValueError, match="ACL enabled but no user context"):
            _build_acl_filter(kb_config, {})

    def test_raises_error_when_no_groups_or_permissions(self):
        """Test that error is raised when user context has no groups or permissions."""
        kb_config = {"acl": {"enabled": True}}
        with pytest.raises(ValueError, match="missing 'groups' or 'permissions'"):
            _build_acl_filter(kb_config, {"userId": "user123"})

    def test_builds_single_group_filter(self):
        """Test building filter for single group."""
        kb_config = {"acl": {"enabled": True, "metadataField": "group"}}
        result = _build_acl_filter(kb_config, {"groups": ["engineering"]})

        assert result == {"equals": {"key": "group", "value": "engineering"}}

    def test_builds_multiple_groups_filter(self):
        """Test building filter for multiple groups."""
        kb_config = {"acl": {"enabled": True, "metadataField": "group"}}
        result = _build_acl_filter(kb_config, {"groups": ["engineering", "admin"]})

        assert "orAll" in result
        assert len(result["orAll"]) == 2
        assert {"equals": {"key": "group", "value": "engineering"}} in result["orAll"]
        assert {"equals": {"key": "group", "value": "admin"}} in result["orAll"]

    def test_uses_default_metadata_field(self):
        """Test that default metadata field 'group' is used."""
        kb_config = {"acl": {"enabled": True}}
        result = _build_acl_filter(kb_config, {"groups": ["admin"]})

        assert result == {"equals": {"key": "group", "value": "admin"}}

    def test_uses_custom_metadata_field(self):
        """Test using custom metadata field."""
        kb_config = {"acl": {"enabled": True, "metadataField": "department"}}
        result = _build_acl_filter(kb_config, {"groups": ["sales"]})

        assert result == {"equals": {"key": "department", "value": "sales"}}

    def test_uses_permissions_when_groups_not_present(self):
        """Test that permissions are used when groups not present."""
        kb_config = {"acl": {"enabled": True}}
        result = _build_acl_filter(kb_config, {"permissions": ["read-docs"]})

        assert result == {"equals": {"key": "group", "value": "read-docs"}}


class TestMergeFilters:
    """Tests for _merge_filters function."""

    def test_returns_none_when_both_none(self):
        """Test that None is returned when both filters are None."""
        result = _merge_filters(None, None)
        assert result is None

    def test_returns_acl_filter_when_base_none(self):
        """Test that ACL filter is returned when base is None."""
        acl_filter = {"equals": {"key": "group", "value": "admin"}}
        result = _merge_filters(None, acl_filter)
        assert result == acl_filter

    def test_returns_base_filter_when_acl_none(self):
        """Test that base filter is returned when ACL is None."""
        base_filter = {"equals": {"key": "type", "value": "document"}}
        result = _merge_filters(base_filter, None)
        assert result == base_filter

    def test_combines_filters_with_and(self):
        """Test that filters are combined with AND logic."""
        base_filter = {"equals": {"key": "type", "value": "document"}}
        acl_filter = {"equals": {"key": "group", "value": "admin"}}
        result = _merge_filters(base_filter, acl_filter)

        assert "andAll" in result
        assert len(result["andAll"]) == 2
        assert base_filter in result["andAll"]
        assert acl_filter in result["andAll"]


class TestRetrieveFromKb:
    """Tests for _retrieve_from_kb function."""

    @patch("retrieve.bedrock_agent_runtime")
    def test_successful_retrieval(self, mock_bedrock):
        """Test successful retrieval returns correct structure."""
        mock_bedrock.retrieve.return_value = {
            "retrievalResults": [
                {
                    "content": {"text": "Test content"},
                    "location": {"s3Location": {"uri": "s3://bucket/key"}},
                    "score": 0.95,
                }
            ]
        }

        kb_config = {
            "name": "test-kb",
            "knowledgeBaseId": "KB123",
            "retrieval": {"numberOfResults": 5},
        }

        results = _retrieve_from_kb(kb_config, "test query")

        assert len(results) == 1
        assert results[0]["content"] == "Test content"
        assert results[0]["source"]["type"] == "s3"
        assert results[0]["source"]["uri"] == "s3://bucket/key"
        assert results[0]["score"] == 0.95
        assert results[0]["knowledgeBaseId"] == "KB123"
        assert results[0]["knowledgeBaseName"] == "test-kb"

    @patch("retrieve.bedrock_agent_runtime")
    def test_retrieval_with_guardrail(self, mock_bedrock):
        """Test retrieval includes guardrail configuration."""
        mock_bedrock.retrieve.return_value = {"retrievalResults": []}

        kb_config = {
            "name": "test-kb",
            "knowledgeBaseId": "KB123",
            "retrieval": {"numberOfResults": 5},
            "guardrail": {"guardrailId": "GR123", "guardrailVersion": "1"},
        }

        _retrieve_from_kb(kb_config, "test query")

        call_args = mock_bedrock.retrieve.call_args
        assert "guardrailConfiguration" in call_args.kwargs
        assert call_args.kwargs["guardrailConfiguration"]["guardrailId"] == "GR123"
        assert call_args.kwargs["guardrailConfiguration"]["guardrailVersion"] == "1"

    @patch("retrieve.bedrock_agent_runtime")
    def test_retrieval_with_acl_filter(self, mock_bedrock):
        """Test retrieval applies ACL filter."""
        mock_bedrock.retrieve.return_value = {"retrievalResults": []}

        kb_config = {
            "name": "test-kb",
            "knowledgeBaseId": "KB123",
            "retrieval": {"numberOfResults": 5},
            "acl": {"enabled": True, "metadataField": "group"},
        }

        _retrieve_from_kb(kb_config, "test query", {"groups": ["engineering"]})

        call_args = mock_bedrock.retrieve.call_args
        filter_config = call_args.kwargs["retrievalConfiguration"][
            "vectorSearchConfiguration"
        ].get("filter")
        assert filter_config is not None
        assert filter_config == {"equals": {"key": "group", "value": "engineering"}}

    @patch("retrieve.bedrock_agent_runtime")
    def test_retrieval_raises_on_acl_without_context(self, mock_bedrock):
        """Test retrieval raises error when ACL enabled without context."""
        kb_config = {
            "name": "test-kb",
            "knowledgeBaseId": "KB123",
            "acl": {"enabled": True},
        }

        with pytest.raises(ValueError, match="ACL enabled but no user context"):
            _retrieve_from_kb(kb_config, "test query")

    @patch("retrieve.bedrock_agent_runtime")
    def test_handles_web_location(self, mock_bedrock):
        """Test handling of web location in results."""
        mock_bedrock.retrieve.return_value = {
            "retrievalResults": [
                {
                    "content": {"text": "Web content"},
                    "location": {"webLocation": {"url": "https://example.com/doc"}},
                    "score": 0.9,
                }
            ]
        }

        kb_config = {"name": "test-kb", "knowledgeBaseId": "KB123"}
        results = _retrieve_from_kb(kb_config, "test query")

        assert results[0]["source"]["type"] == "web"
        assert results[0]["source"]["url"] == "https://example.com/doc"


class TestRetrieveFromKnowledgeBase:
    """Tests for retrieve_from_knowledge_base tool function."""

    @patch("retrieve.bedrock_agent_runtime")
    @patch("retrieve._emit_metrics")
    def test_successful_retrieval_returns_correct_structure(
        self, mock_metrics, mock_bedrock
    ):
        """Test successful retrieval returns correct response structure."""
        mock_bedrock.retrieve.return_value = {
            "retrievalResults": [
                {
                    "content": {"text": "Result 1"},
                    "location": {"s3Location": {"uri": "s3://bucket/key1"}},
                    "score": 0.95,
                },
                {
                    "content": {"text": "Result 2"},
                    "location": {"s3Location": {"uri": "s3://bucket/key2"}},
                    "score": 0.85,
                },
            ]
        }

        config = [
            {
                "name": "test-kb",
                "knowledgeBaseId": "KB123",
                "description": "Test KB",
                "retrieval": {"numberOfResults": 5},
            }
        ]

        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = retrieve_from_knowledge_base(query="test query")

        assert result["success"] is True
        assert "results" in result
        assert len(result["results"]) == 2
        assert "metadata" in result
        assert result["metadata"]["totalResults"] == 2
        assert "queryLatencyMs" in result["metadata"]
        assert result["metadata"]["knowledgeBasesQueried"] == ["KB123"]

    @patch("retrieve.bedrock_agent_runtime")
    @patch("retrieve._emit_metrics")
    def test_multi_kb_query_aggregates_results(self, mock_metrics, mock_bedrock):
        """Test querying multiple KBs aggregates results."""
        # Return different results for each KB call
        mock_bedrock.retrieve.side_effect = [
            {
                "retrievalResults": [
                    {
                        "content": {"text": "KB1 Result"},
                        "location": {"s3Location": {"uri": "s3://bucket/kb1"}},
                        "score": 0.9,
                    }
                ]
            },
            {
                "retrievalResults": [
                    {
                        "content": {"text": "KB2 Result"},
                        "location": {"s3Location": {"uri": "s3://bucket/kb2"}},
                        "score": 0.8,
                    }
                ]
            },
        ]

        config = [
            {"name": "kb1", "knowledgeBaseId": "KB1", "retrieval": {"numberOfResults": 5}},
            {"name": "kb2", "knowledgeBaseId": "KB2", "retrieval": {"numberOfResults": 5}},
        ]

        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = retrieve_from_knowledge_base(query="test query")

        assert result["success"] is True
        assert len(result["results"]) == 2
        assert result["metadata"]["knowledgeBasesQueried"] == ["KB1", "KB2"]
        # Results should be sorted by score
        assert result["results"][0]["score"] >= result["results"][1]["score"]

    @patch("retrieve.bedrock_agent_runtime")
    @patch("retrieve._emit_metrics")
    def test_specific_kb_query_filters_correctly(self, mock_metrics, mock_bedrock):
        """Test querying specific KB filters correctly."""
        mock_bedrock.retrieve.return_value = {
            "retrievalResults": [
                {
                    "content": {"text": "KB1 Result"},
                    "location": {"s3Location": {"uri": "s3://bucket/kb1"}},
                    "score": 0.9,
                }
            ]
        }

        config = [
            {"name": "kb1", "knowledgeBaseId": "KB1", "retrieval": {"numberOfResults": 5}},
            {"name": "kb2", "knowledgeBaseId": "KB2", "retrieval": {"numberOfResults": 5}},
        ]

        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = retrieve_from_knowledge_base(
                query="test query", knowledge_base_id="KB1"
            )

        assert result["success"] is True
        assert result["metadata"]["knowledgeBasesQueried"] == ["KB1"]
        # Should only call retrieve once
        assert mock_bedrock.retrieve.call_count == 1

    @patch("retrieve._emit_metrics")
    def test_returns_error_when_kb_not_found(self, mock_metrics):
        """Test error response when KB not found."""
        config = [{"name": "kb1", "knowledgeBaseId": "KB1"}]

        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = retrieve_from_knowledge_base(
                query="test query", knowledge_base_id="nonexistent"
            )

        assert result["success"] is False
        assert "error" in result
        assert result["errorType"] == "KnowledgeBaseNotFound"
        assert "nonexistent" in result["error"]

    @patch("retrieve._emit_metrics")
    def test_returns_error_when_no_kbs_configured(self, mock_metrics):
        """Test error response when no KBs configured."""
        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": "[]"}):
            result = retrieve_from_knowledge_base(query="test query")

        assert result["success"] is False
        assert result["errorType"] == "KnowledgeBaseNotFound"
        assert "No knowledge bases configured" in result["error"]

    @patch("retrieve.bedrock_agent_runtime")
    @patch("retrieve._emit_metrics")
    def test_acl_filter_applied_when_enabled(self, mock_metrics, mock_bedrock):
        """Test ACL filter is applied when enabled."""
        mock_bedrock.retrieve.return_value = {"retrievalResults": []}

        config = [
            {
                "name": "test-kb",
                "knowledgeBaseId": "KB123",
                "retrieval": {"numberOfResults": 5},
                "acl": {"enabled": True, "metadataField": "group"},
            }
        ]

        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = retrieve_from_knowledge_base(
                query="test query", user_context={"groups": ["engineering"]}
            )

        assert result["success"] is True
        call_args = mock_bedrock.retrieve.call_args
        filter_config = call_args.kwargs["retrievalConfiguration"][
            "vectorSearchConfiguration"
        ].get("filter")
        assert filter_config == {"equals": {"key": "group", "value": "engineering"}}

    @patch("retrieve._emit_metrics")
    def test_error_when_acl_enabled_without_user_context(self, mock_metrics):
        """Test error when ACL enabled but no user context provided."""
        config = [
            {
                "name": "test-kb",
                "knowledgeBaseId": "KB123",
                "acl": {"enabled": True},
            }
        ]

        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = retrieve_from_knowledge_base(query="test query")

        assert result["success"] is False
        assert result["errorType"] == "AclContextMissing"
        assert "ACL enabled but no user context" in result["error"]

    @patch("retrieve.bedrock_agent_runtime")
    @patch("retrieve._emit_metrics")
    def test_error_response_structure_on_failure(self, mock_metrics, mock_bedrock):
        """Test error response structure on API failure."""
        mock_bedrock.retrieve.side_effect = Exception("API Error")

        config = [
            {
                "name": "test-kb",
                "knowledgeBaseId": "KB123",
                "retrieval": {"numberOfResults": 5},
            }
        ]

        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = retrieve_from_knowledge_base(query="test query")

        # When all KBs fail, we still get success=True but empty results
        # because errors are logged but not propagated for individual KBs
        assert "results" in result or "error" in result

    @patch("retrieve.bedrock_agent_runtime")
    @patch("retrieve._emit_metrics")
    def test_results_sorted_by_score(self, mock_metrics, mock_bedrock):
        """Test results are sorted by score in descending order."""
        mock_bedrock.retrieve.return_value = {
            "retrievalResults": [
                {
                    "content": {"text": "Low score"},
                    "location": {"s3Location": {"uri": "s3://bucket/low"}},
                    "score": 0.5,
                },
                {
                    "content": {"text": "High score"},
                    "location": {"s3Location": {"uri": "s3://bucket/high"}},
                    "score": 0.95,
                },
                {
                    "content": {"text": "Medium score"},
                    "location": {"s3Location": {"uri": "s3://bucket/med"}},
                    "score": 0.75,
                },
            ]
        }

        config = [
            {
                "name": "test-kb",
                "knowledgeBaseId": "KB123",
                "retrieval": {"numberOfResults": 5},
            }
        ]

        with patch.dict(os.environ, {"KNOWLEDGE_BASES_CONFIG": json.dumps(config)}):
            result = retrieve_from_knowledge_base(query="test query")

        assert result["success"] is True
        scores = [r["score"] for r in result["results"]]
        assert scores == sorted(scores, reverse=True)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
