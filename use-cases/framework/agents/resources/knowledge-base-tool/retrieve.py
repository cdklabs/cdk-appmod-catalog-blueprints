# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Knowledge Base Retrieval Tool for Agent Framework.

This module provides a retrieval tool that agents can use to query configured
knowledge bases using Amazon Bedrock's Retrieve API. It supports:
- Querying single or multiple knowledge bases
- Access Control List (ACL) based filtering
- Guardrail integration for content filtering
- Comprehensive observability with Lambda Powertools

The tool is designed to be used with the Strands agent framework and is
automatically included when knowledge bases are configured for an agent.
"""

import json
import os
import time
from typing import Any, Dict, List, Optional

import boto3
from aws_lambda_powertools import Logger, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from strands import tool

# Initialize Lambda Powertools
logger = Logger(service="knowledge-base-retrieval")
metrics = Metrics(namespace="AgentFramework/KnowledgeBase")

# Initialize Bedrock Agent Runtime client
bedrock_agent_runtime = boto3.client("bedrock-agent-runtime")


def _load_knowledge_bases_config() -> List[Dict[str, Any]]:
    """
    Load knowledge base configuration from environment variable.

    Returns:
        List of knowledge base configuration dictionaries.
        Returns empty list if configuration is not set or invalid.
    """
    config_str = os.environ.get("KNOWLEDGE_BASES_CONFIG", "[]")
    try:
        return json.loads(config_str)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse KNOWLEDGE_BASES_CONFIG", error=str(e))
        return []


def _get_knowledge_bases(
    knowledge_base_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Get knowledge bases to query based on optional filter.

    Args:
        knowledge_base_id: Optional specific knowledge base ID to filter by.
            If None, returns all configured knowledge bases.

    Returns:
        List of knowledge base configurations matching the filter.
    """
    all_kbs = _load_knowledge_bases_config()

    if knowledge_base_id is None:
        return all_kbs

    # Filter to specific KB by ID or name
    return [
        kb
        for kb in all_kbs
        if kb.get("knowledgeBaseId") == knowledge_base_id
        or kb.get("name") == knowledge_base_id
    ]


def _build_acl_filter(
    kb_config: Dict[str, Any], user_context: Optional[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Build ACL filter for retrieval query based on user context.

    Args:
        kb_config: Knowledge base configuration containing ACL settings.
        user_context: User identity context with permissions/groups.

    Returns:
        Filter dictionary for Bedrock Retrieve API, or None if ACL not enabled.

    Raises:
        ValueError: If ACL is enabled but user_context is missing or invalid.
    """
    acl_config = kb_config.get("acl", {})

    if not acl_config.get("enabled", False):
        return None

    if not user_context:
        raise ValueError("ACL enabled but no user context provided")

    # Get the metadata field to filter on (default: 'group')
    metadata_field = acl_config.get("metadataField", "group")

    # Get user's groups/permissions from context
    user_groups = user_context.get("groups", [])
    if not user_groups:
        user_groups = user_context.get("permissions", [])

    if not user_groups:
        raise ValueError(
            f"ACL enabled but user context missing 'groups' or 'permissions'"
        )

    # Build filter for Bedrock Retrieve API
    # Uses 'in' operator to match any of the user's groups
    if len(user_groups) == 1:
        return {"equals": {"key": metadata_field, "value": user_groups[0]}}
    else:
        return {
            "orAll": [
                {"equals": {"key": metadata_field, "value": group}}
                for group in user_groups
            ]
        }


def _merge_filters(
    base_filter: Optional[Dict[str, Any]], acl_filter: Optional[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Merge base retrieval filter with ACL filter.

    Args:
        base_filter: Static filter from KB configuration.
        acl_filter: Dynamic ACL filter based on user context.

    Returns:
        Combined filter, or None if both inputs are None.
    """
    if base_filter is None and acl_filter is None:
        return None

    if base_filter is None:
        return acl_filter

    if acl_filter is None:
        return base_filter

    # Combine both filters with AND logic
    return {"andAll": [base_filter, acl_filter]}


def _retrieve_from_kb(
    kb_config: Dict[str, Any],
    query: str,
    user_context: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieve results from a single knowledge base.

    Args:
        kb_config: Knowledge base configuration dictionary.
        query: Search query string.
        user_context: Optional user identity context for ACL filtering.

    Returns:
        List of retrieval results with content, source, and score.

    Raises:
        ValueError: If ACL is enabled but user_context is missing.
        Exception: If Bedrock API call fails.
    """
    kb_id = kb_config.get("knowledgeBaseId")
    kb_name = kb_config.get("name", kb_id)

    logger.info(
        "Retrieving from knowledge base",
        knowledge_base_id=kb_id,
        knowledge_base_name=kb_name,
        query_length=len(query),
    )

    # Build retrieval configuration
    retrieval_config = kb_config.get("retrieval", {})
    number_of_results = retrieval_config.get("numberOfResults", 5)

    # Build filters
    base_filter = retrieval_config.get("retrievalFilter")
    acl_filter = _build_acl_filter(kb_config, user_context)
    combined_filter = _merge_filters(base_filter, acl_filter)

    # Build retrieve request
    retrieve_request: Dict[str, Any] = {
        "knowledgeBaseId": kb_id,
        "retrievalQuery": {"text": query},
        "retrievalConfiguration": {
            "vectorSearchConfiguration": {"numberOfResults": number_of_results}
        },
    }

    # Add filter if present
    if combined_filter:
        retrieve_request["retrievalConfiguration"]["vectorSearchConfiguration"][
            "filter"
        ] = combined_filter

    # Add guardrail if configured
    guardrail_config = kb_config.get("guardrail")
    if guardrail_config:
        retrieve_request["guardrailConfiguration"] = {
            "guardrailId": guardrail_config.get("guardrailId"),
            "guardrailVersion": guardrail_config.get("guardrailVersion", "DRAFT"),
        }

    # Call Bedrock Retrieve API
    response = bedrock_agent_runtime.retrieve(**retrieve_request)

    # Process results
    results = []
    for result in response.get("retrievalResults", []):
        content = result.get("content", {}).get("text", "")
        location = result.get("location", {})
        score = result.get("score", 0.0)

        # Extract source information
        source = {}
        if "s3Location" in location:
            source = {
                "type": "s3",
                "uri": location["s3Location"].get("uri", ""),
            }
        elif "webLocation" in location:
            source = {
                "type": "web",
                "url": location["webLocation"].get("url", ""),
            }
        elif "confluenceLocation" in location:
            source = {
                "type": "confluence",
                "url": location["confluenceLocation"].get("url", ""),
            }
        elif "salesforceLocation" in location:
            source = {
                "type": "salesforce",
                "url": location["salesforceLocation"].get("url", ""),
            }
        elif "sharePointLocation" in location:
            source = {
                "type": "sharepoint",
                "url": location["sharePointLocation"].get("url", ""),
            }

        results.append(
            {
                "content": content,
                "source": source,
                "score": score,
                "knowledgeBaseId": kb_id,
                "knowledgeBaseName": kb_name,
            }
        )

    logger.info(
        "Retrieved results from knowledge base",
        knowledge_base_id=kb_id,
        result_count=len(results),
    )

    return results


@tool
def retrieve_from_knowledge_base(
    query: str,
    knowledge_base_id: Optional[str] = None,
    user_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Retrieve relevant information from configured knowledge bases.

    Use this tool when you need to find information from the knowledge bases.
    Available knowledge bases and their contents are listed in your instructions.

    Args:
        query: The search query to find relevant information. Be specific and
            include key terms related to what you're looking for.
        knowledge_base_id: Optional specific knowledge base to query. Can be
            either the knowledge base ID or name. If not provided, queries
            all configured knowledge bases.
        user_context: Optional user identity context for ACL filtering. Should
            contain 'groups' or 'permissions' array when ACL is enabled.

    Returns:
        Dictionary containing:
        - success: Boolean indicating if the operation succeeded
        - results: Array of retrieved passages (when successful)
        - metadata: Query metadata including result count and latency
        - error: Error message (when failed)
        - errorType: Error type classification (when failed)

    Examples:
        # Query all knowledge bases
        retrieve_from_knowledge_base(query="How do I reset my password?")

        # Query specific knowledge base
        retrieve_from_knowledge_base(
            query="Product pricing information",
            knowledge_base_id="product-docs"
        )

        # Query with ACL context
        retrieve_from_knowledge_base(
            query="Confidential project details",
            user_context={"groups": ["engineering", "project-alpha"]}
        )
    """
    start_time = time.time()

    logger.info(
        "Starting knowledge base retrieval",
        query_length=len(query),
        target_kb=knowledge_base_id,
        has_user_context=user_context is not None,
    )

    try:
        # Determine which KBs to query
        kbs_to_query = _get_knowledge_bases(knowledge_base_id)

        if not kbs_to_query:
            error_msg = (
                f"Knowledge base not found: {knowledge_base_id}"
                if knowledge_base_id
                else "No knowledge bases configured"
            )
            logger.warning("No knowledge bases to query", error=error_msg)

            latency_ms = int((time.time() - start_time) * 1000)
            _emit_metrics(0, latency_ms, success=False)

            return {
                "success": False,
                "error": error_msg,
                "errorType": "KnowledgeBaseNotFound",
            }

        # Query each knowledge base and aggregate results
        all_results: List[Dict[str, Any]] = []
        queried_kbs: List[str] = []

        for kb in kbs_to_query:
            try:
                results = _retrieve_from_kb(kb, query, user_context)
                all_results.extend(results)
                queried_kbs.append(kb.get("knowledgeBaseId", kb.get("name", "unknown")))
            except ValueError as e:
                # ACL validation error - return immediately
                latency_ms = int((time.time() - start_time) * 1000)
                _emit_metrics(0, latency_ms, success=False)

                logger.error(
                    "ACL validation failed",
                    knowledge_base=kb.get("name"),
                    error=str(e),
                )

                return {
                    "success": False,
                    "error": str(e),
                    "errorType": "AclContextMissing",
                }
            except Exception as e:
                # Log error but continue with other KBs
                logger.error(
                    "Failed to retrieve from knowledge base",
                    knowledge_base=kb.get("name"),
                    error=str(e),
                    error_type=type(e).__name__,
                )

        # Sort results by score (descending)
        all_results.sort(key=lambda x: x.get("score", 0), reverse=True)

        # Calculate latency and emit metrics
        latency_ms = int((time.time() - start_time) * 1000)
        _emit_metrics(len(all_results), latency_ms, success=True)

        logger.info(
            "Knowledge base retrieval completed",
            total_results=len(all_results),
            knowledge_bases_queried=queried_kbs,
            latency_ms=latency_ms,
        )

        return {
            "success": True,
            "results": all_results,
            "metadata": {
                "totalResults": len(all_results),
                "queryLatencyMs": latency_ms,
                "knowledgeBasesQueried": queried_kbs,
            },
        }

    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        _emit_metrics(0, latency_ms, success=False)

        logger.error(
            "Knowledge base retrieval failed",
            error=str(e),
            error_type=type(e).__name__,
        )

        return {
            "success": False,
            "error": str(e),
            "errorType": type(e).__name__,
        }


def _emit_metrics(result_count: int, latency_ms: int, success: bool) -> None:
    """
    Emit CloudWatch metrics for retrieval operations.

    Args:
        result_count: Number of results retrieved.
        latency_ms: Query latency in milliseconds.
        success: Whether the operation succeeded.
    """
    try:
        metrics.add_metric(
            name="RetrievalLatency", unit=MetricUnit.Milliseconds, value=latency_ms
        )
        metrics.add_metric(
            name="RetrievalResultCount", unit=MetricUnit.Count, value=result_count
        )
        metrics.add_metric(
            name="RetrievalSuccess" if success else "RetrievalFailure",
            unit=MetricUnit.Count,
            value=1,
        )
    except Exception as e:
        # Don't fail the main operation if metrics emission fails
        logger.warning("Failed to emit metrics", error=str(e))
