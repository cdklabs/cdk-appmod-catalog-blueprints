"""Data models for the MCP server construct registry.

Frozen dataclasses representing construct metadata, prop information,
smart defaults, and wiring entries. All models are immutable to ensure
thread safety and prevent accidental mutation after registry loading.
"""

from dataclasses import dataclass
from enum import Enum


class Language(str, Enum):
    """Supported target languages for code generation."""

    TYPESCRIPT = 'typescript'
    PYTHON = 'python'
    JAVA = 'java'
    DOTNET = 'dotnet'


@dataclass(frozen=True)
class PropInfo:
    """Metadata for a single construct prop."""

    name: str
    type_name: str                    # e.g., "string", "number", "Network", "Duration"
    description: str
    required: bool
    default_value: str | None         # From @default JSDoc tag
    is_construct_ref: bool            # True if type is another library construct
    construct_ref_name: str | None    # e.g., "Network" if is_construct_ref


@dataclass(frozen=True)
class ConstructInfo:
    """Full metadata for a single construct."""

    name: str                         # e.g., "BedrockDocumentProcessing"
    fqn: str                          # e.g., "@cdklabs/cdk-appmod-catalog-blueprints.BedrockDocumentProcessing"
    family: str                       # e.g., "document-processing"
    description: str                  # From JSDoc
    props: list[PropInfo]             # All props (own + inherited)
    parent_class: str | None          # e.g., "BaseDocumentProcessing"
    is_abstract: bool
    module_path: str                  # e.g., "use-cases/document-processing"


@dataclass(frozen=True)
class FamilyInfo:
    """Metadata for a construct family."""

    name: str                         # e.g., "document-processing"
    display_name: str                 # e.g., "Document Processing"
    constructs: list[str]             # Construct names in this family


@dataclass(frozen=True)
class CatalogInfo:
    """Full catalog of all families and constructs."""

    families: list[FamilyInfo]
    library_version: str
    library_name: str


@dataclass(frozen=True)
class SmartDefault:
    """A best-practice default value for an optional prop."""

    prop_name: str
    value: str                        # Code expression as string
    comment: str                      # Explanation of why this default
    security_relevant: bool           # True if this is a security best practice


@dataclass(frozen=True)
class WiringEntry:
    """How one construct's prop connects to another construct's output."""

    source_construct: str             # e.g., "Network"
    source_variable: str              # e.g., "network"
    target_construct: str             # e.g., "BedrockDocumentProcessing"
    target_prop: str                  # e.g., "network"
