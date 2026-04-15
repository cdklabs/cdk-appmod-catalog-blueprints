"""CDK Stack for the Stock Market Analysis chatbot with private VPC networking.

This variant deploys the agent inside a fully private VPC with no NAT gateway.
All AWS service access is routed through VPC endpoints.
"""

import os

import aws_cdk as cdk
import aws_cdk.aws_cognito as cognito
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_s3_assets as s3_assets
from appmod_catalog_blueprints import (
    AgentCoreRuntimeHostingAdapter,
    Frontend,
    InteractiveAgent,
    Network,
    NetworkMode,
)
from constructs import Construct

DIRNAME = os.path.dirname(__file__)


class StockmarketAnalysisPrivateVpcStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        agent_dir = os.path.join(DIRNAME, "..", "agent")

        # --- Private VPC (no NAT gateway, isolated subnets only) ---
        network = Network(
            self,
            "Network",
            private=True,
            max_azs=2,
        )

        # --- VPC Endpoints for AWS service access ---
        # These replace the NAT gateway for reaching AWS services.
        # Note: create_service_endpoint() is typed as InterfaceVpcEndpointService
        # in JSII, but InterfaceVpcEndpointAwsService is not a subclass in Python
        # bindings, so we construct InterfaceVpcEndpointService with the full
        # region-qualified name (com.amazonaws.<region>.<service>).
        region = self.region

        def _svc(name: str) -> ec2.InterfaceVpcEndpointService:
            return ec2.InterfaceVpcEndpointService(f"com.amazonaws.{region}.{name}", port=443)

        # S3: gateway endpoint (for isolated subnets) + interface endpoint
        network.vpc.add_gateway_endpoint(
            "S3Gateway",
            service=ec2.GatewayVpcEndpointAwsService.S3,
            subnets=[network.application_subnet_selection()],
        )
        network.create_service_endpoint("S3", _svc("s3"))

        # ECR endpoints (for pulling the AgentCore container image)
        network.create_service_endpoint("ECR", _svc("ecr.api"))
        network.create_service_endpoint("ECRDocker", _svc("ecr.dkr"))

        # Bedrock endpoints (for model invocation)
        network.create_service_endpoint("Bedrock", _svc("bedrock"))
        network.create_service_endpoint("BedrockRuntime", _svc("bedrock-runtime"))

        # Bedrock AgentCore endpoints (for runtime data/control plane)
        network.create_service_endpoint("BedrockAgentCore", _svc("bedrock-agentcore"))
        network.create_service_endpoint("BedrockAgentCoreControl", _svc("bedrock-agentcore-control"))

        # CloudWatch / Logs (for observability)
        network.create_service_endpoint("CloudWatchLogs", _svc("logs"))
        network.create_service_endpoint("CloudWatch", _svc("monitoring"))

        # STS (for assuming roles)
        network.create_service_endpoint("STS", _svc("sts"))

        # KMS (for encryption operations)
        network.create_service_endpoint("KMS", _svc("kms"))

        # System prompt as an S3 asset
        system_prompt_asset = s3_assets.Asset(
            self,
            "SystemPrompt",
            path=os.path.join(agent_dir, "prompt.txt"),
        )

        # Agent tools as an S3 asset
        tools_asset = s3_assets.Asset(
            self,
            "AgentTools",
            path=os.path.join(agent_dir, "tools.py"),
        )

        # Cognito User Pool for authentication
        user_pool = cognito.UserPool(
            self,
            "UserPool",
            user_pool_name="stock-market-analyst-private-vpc-users",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
            ),
            removal_policy=cdk.RemovalPolicy.DESTROY,
        )

        user_pool_client = user_pool.add_client(
            "WebClient",
            user_pool_client_name="stock-market-private-vpc-web-client",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
            ),
        )

        # OIDC discovery URL for the Cognito User Pool
        cognito_discovery_url = (
            f"https://cognito-idp.{self.region}.amazonaws.com/{user_pool.user_pool_id}"
            "/.well-known/openid-configuration"
        )

        # AgentCore Runtime hosting adapter with VPC network mode
        hosting_adapter = AgentCoreRuntimeHostingAdapter(
            endpoint_name="stock_market_analyst_private",
            network_mode=NetworkMode.VPC,
            protocol_configuration="HTTP",
            custom_jwt_authorizer={
                "discovery_url": cognito_discovery_url,
                "allowed_audience": [user_pool_client.user_pool_client_id],
            },
        )

        # Interactive Agent deployed on Bedrock AgentCore Runtime in VPC
        agent = InteractiveAgent(
            self,
            "StockMarketAgent",
            agent_name="stock-market-analyst-private",
            agent_definition={
                "bedrock_model": {"use_cross_region_inference": True},
                "system_prompt": system_prompt_asset,
                "tools": [tools_asset],
            },
            hosting_adapter=hosting_adapter,
            network=network,
            enable_observability=True,
        )

        # Frontend (React app hosted on CloudFront + S3)
        # skip_build=True assumes `npm run build` has been run before `cdk deploy`
        frontend = Frontend(
            self,
            "Frontend",
            source_directory=os.path.join(DIRNAME, "..", "frontend"),
            build_output_directory=os.path.join(DIRNAME, "..", "frontend", "dist"),
            skip_build=True,
        )

        # Outputs
        cdk.CfnOutput(
            self,
            "FrontendUrl",
            value=f"https://{frontend.distribution.distribution_domain_name}",
        )
        cdk.CfnOutput(self, "AgentApiEndpoint", value=agent.api_endpoint)
        cdk.CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        cdk.CfnOutput(
            self,
            "UserPoolClientId",
            value=user_pool_client.user_pool_client_id,
        )
        cdk.CfnOutput(self, "FrontendBucketName", value=frontend.bucket.bucket_name)
        cdk.CfnOutput(
            self,
            "DistributionId",
            value=frontend.distribution.distribution_id,
        )
        cdk.CfnOutput(self, "VpcId", value=network.vpc.vpc_id)
