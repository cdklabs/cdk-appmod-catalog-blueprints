#!/usr/bin/env python3
import aws_cdk as cdk
from stockmarket_analysis_private_vpc.stockmarket_analysis_private_vpc_stack import (
    StockmarketAnalysisPrivateVpcStack,
)

app = cdk.App()
StockmarketAnalysisPrivateVpcStack(app, "StockmarketAnalysisPrivateVpcStack")
app.synth()
