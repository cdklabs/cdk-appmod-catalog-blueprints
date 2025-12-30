# Multi-stage build for AgentCore container deployment
FROM public.ecr.aws/lambda/python:3.11 AS builder

# Install build dependencies
RUN yum install -y gcc python3-devel

# Copy requirements and install dependencies
COPY agent-code/requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt -t /opt/python

# Final stage
FROM public.ecr.aws/lambda/python:3.11

# Copy installed dependencies from builder
COPY --from=builder /opt/python /opt/python

# Copy agent code
COPY agent-code/ ${LAMBDA_TASK_ROOT}/

# Set Python path to include dependencies
ENV PYTHONPATH="${LAMBDA_TASK_ROOT}:/opt/python:${PYTHONPATH}"

# Set entrypoint for AgentCore
# AgentCore will invoke the batch_agentcore.py module
CMD ["batch_agentcore.process_batch_request"]
