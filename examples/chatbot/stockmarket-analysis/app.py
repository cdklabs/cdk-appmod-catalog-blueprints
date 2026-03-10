#!/usr/bin/env python3
import aws_cdk as cdk
from stockmarket_analysis.stockmarket_analysis_stack import StockmarketAnalysisStack

app = cdk.App()
StockmarketAnalysisStack(app, "StockmarketAnalysisStack")
app.synth()
