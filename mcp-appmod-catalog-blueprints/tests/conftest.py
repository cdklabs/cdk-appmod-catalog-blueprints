"""Shared test fixtures for mcp-appmod-catalog-blueprints tests."""

import json
import os
from pathlib import Path

import pytest


@pytest.fixture
def sample_jsii_prop():
    """A minimal JSII property entry."""
    return {
        "name": "classificationPrompt",
        "docs": {
            "summary": "The prompt used for document classification.",
        },
        "type": {
            "primitive": "string",
        },
        "optional": False,
    }


@pytest.fixture
def sample_jsii_optional_prop():
    """A minimal optional JSII property entry."""
    return {
        "name": "enableObservability",
        "docs": {
            "summary": "Enable observability features.",
            "default": "false",
        },
        "type": {
            "primitive": "boolean",
        },
        "optional": True,
    }


@pytest.fixture
def sample_jsii_construct_type(sample_jsii_prop, sample_jsii_optional_prop):
    """A minimal JSII type entry representing a construct class."""
    return {
        "assembly": "@cdklabs/cdk-appmod-catalog-blueprints",
        "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.TestConstruct",
        "kind": "class",
        "name": "TestConstruct",
        "docs": {
            "summary": "A test construct for unit testing.",
        },
        "base": "constructs.Construct",
        "initializer": {
            "parameters": [
                {"name": "scope", "type": {"fqn": "constructs.Construct"}},
                {"name": "id", "type": {"primitive": "string"}},
                {
                    "name": "props",
                    "type": {
                        "fqn": "@cdklabs/cdk-appmod-catalog-blueprints.TestConstructProps"
                    },
                },
            ],
        },
        "properties": [sample_jsii_prop, sample_jsii_optional_prop],
    }


@pytest.fixture
def sample_jsii_data(sample_jsii_construct_type):
    """A minimal JSII manifest with one construct type."""
    return {
        "name": "@cdklabs/cdk-appmod-catalog-blueprints",
        "version": "0.1.0",
        "types": {
            "@cdklabs/cdk-appmod-catalog-blueprints.TestConstruct": sample_jsii_construct_type,
        },
    }


@pytest.fixture
def bundled_jsii_path():
    """Path to the bundled .jsii manifest in the package data directory."""
    return str(
        Path(__file__).parent.parent
        / "src"
        / "mcp_server_constructs"
        / "data"
        / "jsii-metadata"
    )


@pytest.fixture
def bundled_jsii_data(bundled_jsii_path):
    """The full bundled .jsii manifest loaded as a dict."""
    with open(bundled_jsii_path) as f:
        return json.load(f)
