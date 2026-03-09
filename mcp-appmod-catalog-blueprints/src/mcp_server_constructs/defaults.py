"""Smart defaults for construct props.

Best-practice default values applied to optional construct props,
with inline comments explaining each choice. Security-relevant
defaults are flagged so the generator can highlight them.
"""

from mcp_server_constructs.models import SmartDefault

SMART_DEFAULTS: dict[str, list[SmartDefault]] = {
    "BedrockDocumentProcessing": [
        SmartDefault(
            prop_name="encryptionKey",
            value="new Key(this, 'EncryptionKey', { enableKeyRotation: true })",
            comment="KMS encryption with automatic key rotation for data at rest",
            security_relevant=True,
        ),
        SmartDefault(
            prop_name="removalPolicy",
            value="RemovalPolicy.DESTROY",
            comment="DESTROY for dev; change to RETAIN for production",
            security_relevant=False,
        ),
        SmartDefault(
            prop_name="enableObservability",
            value="true",
            comment="Enable Lambda Powertools logging, X-Ray tracing, and CloudWatch metrics",
            security_relevant=False,
        ),
    ],
    "AgenticDocumentProcessing": [
        SmartDefault(
            prop_name="encryptionKey",
            value="new Key(this, 'EncryptionKey', { enableKeyRotation: true })",
            comment="KMS encryption with automatic key rotation for data at rest",
            security_relevant=True,
        ),
        SmartDefault(
            prop_name="removalPolicy",
            value="RemovalPolicy.DESTROY",
            comment="DESTROY for dev; change to RETAIN for production",
            security_relevant=False,
        ),
        SmartDefault(
            prop_name="enableObservability",
            value="true",
            comment="Enable Lambda Powertools logging, X-Ray tracing, and CloudWatch metrics",
            security_relevant=False,
        ),
    ],
    "Network": [
        SmartDefault(
            prop_name="maxAzs",
            value="2",
            comment="Two AZs for high availability at reasonable cost",
            security_relevant=False,
        ),
    ],
    "Frontend": [
        SmartDefault(
            prop_name="enforceSSL",
            value="true",
            comment="Enforce HTTPS for all CloudFront requests",
            security_relevant=True,
        ),
    ],
    "BatchAgent": [
        SmartDefault(
            prop_name="enableObservability",
            value="true",
            comment="Enable Lambda Powertools logging, X-Ray tracing, and CloudWatch metrics",
            security_relevant=False,
        ),
    ],
    "InteractiveAgent": [
        SmartDefault(
            prop_name="enableObservability",
            value="true",
            comment="Enable Lambda Powertools logging, X-Ray tracing, and CloudWatch metrics",
            security_relevant=False,
        ),
    ],
    "AccessLog": [
        SmartDefault(
            prop_name="enforceSSL",
            value="true",
            comment="Enforce HTTPS for S3 access log bucket",
            security_relevant=True,
        ),
    ],
    "ServerlessObservability": [
        SmartDefault(
            prop_name="enableTracing",
            value="true",
            comment="Enable X-Ray tracing for distributed request tracking",
            security_relevant=False,
        ),
    ],
}
