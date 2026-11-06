"""Packaging tests: declared dependencies must exclude known-incompatible releases."""

from importlib.metadata import version
from pathlib import Path

import pytest
from packaging.requirements import Requirement

tomllib = pytest.importorskip("tomllib", reason="tomllib needs Python 3.11+; the pin is checked on any newer interpreter")

PYPROJECT = Path(__file__).resolve().parent.parent / "pyproject.toml"


def _mcp_requirement() -> Requirement:
    deps = tomllib.loads(PYPROJECT.read_text())["project"]["dependencies"]
    return next(r for r in map(Requirement, deps) if r.name == "mcp")


def test_mcp_requirement_excludes_2x():
    """mcp 2.0 removed mcp.server.lowlevel.server.ReadResourceContents, which server.py imports."""
    assert not _mcp_requirement().specifier.contains("2.0.0")


def test_installed_mcp_satisfies_requirement():
    assert _mcp_requirement().specifier.contains(version("mcp"))
