# Debug: appmod-8hs — interactive-agent-handler test_handler.py failures

## Repro
python3.13 venv with requirements.txt + requirements-dev.txt + httpx (strands-agents 1.64.0),
AWS_DEFAULT_REGION=us-east-1 and dummy keys: `pytest test_handler.py` -> 2 failed, 12 passed.

## Current Focus
(resolved)

## Eliminated
- H1: index.py's default prompt text drifted from the test. Disproved: the test expects the
  *S3 body* ('You are a helpful assistant.'), not the default. The real cause is that
  index.py reads SYSTEM_PROMPT_S3_BUCKET_NAME / SYSTEM_PROMPT_S3_KEY into module constants at
  import (index.py:81-82), so the test's later `patch.dict(os.environ)` does nothing and
  load_system_prompt() takes the missing-config branch. test_load_system_prompt_s3_error passed
  for the same wrong reason (it never reached the except branch).
- H2: index.py passes the wrong kwarg to S3SessionManager. Disproved: strands-agents 1.64.0
  signature is `S3SessionManager(session_id, bucket, prefix='', ...)`; index.py's `bucket=` is
  right, the test's `bucket_name=` is wrong.

## Resolution
Test-side fix only: the prompt tests patch `index.SYSTEM_PROMPT_BUCKET`/`SYSTEM_PROMPT_KEY`
(the values load_system_prompt actually reads); the chat test asserts `bucket=`. No change to
index.py.
