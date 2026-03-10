"""CDK Stack for the Stock Market Analysis chatbot."""

import os

import aws_cdk as cdk
import aws_cdk.aws_cognito as cognito
import aws_cdk.aws_s3_assets as s3_assets
from appmod_catalog_blueprints import (
    AgentCoreRuntimeHostingAdapter,
    Frontend,
    InteractiveAgent,
)
from constructs import Construct

DIRNAME = os.path.dirname(__file__)


class StockmarketAnalysisStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        agent_dir = os.path.join(DIRNAME, "..", "agent")

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
            user_pool_name="stock-market-analyst-users",
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
            user_pool_client_name="stock-market-web-client",
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

        # AgentCore Runtime hosting adapter with Cognito JWT auth
        hosting_adapter = AgentCoreRuntimeHostingAdapter(
            endpoint_name="stock_market_analyst",
            network_mode="PUBLIC",
            protocol_configuration="HTTP",
            custom_jwt_authorizer={
                "discovery_url": cognito_discovery_url,
                "allowed_audience": [user_pool_client.user_pool_client_id],
            },
        )

        # Interactive Agent deployed on Bedrock AgentCore Runtime
        agent = InteractiveAgent(
            self,
            "StockMarketAgent",
            agent_name="stock-market-analyst",
            agent_definition={
                "bedrock_model": {"use_cross_region_inference": True},
                "system_prompt": system_prompt_asset,
                "tools": [tools_asset],
            },
            hosting_adapter=hosting_adapter,
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
