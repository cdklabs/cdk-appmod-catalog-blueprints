#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# Lambda Web Adapter bootstrap script.
# LWA executes this script to start the FastAPI application.
# The app listens on PORT (default 8080) and LWA proxies
# Lambda invoke requests to it as HTTP requests.

PATH=$PATH:$LAMBDA_TASK_ROOT/bin \
    PYTHONPATH=$PYTHONPATH:/opt/python:$LAMBDA_RUNTIME_DIR \
    exec python -m uvicorn --port=$PORT index:app
