# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

FROM python:3.13-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy handler code
COPY main.py .

# AgentCore Runtime HTTP protocol: listen on port 8080
EXPOSE 8080

# Use opentelemetry-instrument wrapper so ADOT auto-instrumentation
# emits traces/spans to AgentCore Observability when enabled.
CMD ["opentelemetry-instrument", "python", "main.py"]
