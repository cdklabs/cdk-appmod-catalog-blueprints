# appmod-87b: pdf-chunking tests import lambda_handler

## Repro

Python 3.13 venv with `requirements.txt` + pytest, hypothesis, moto; from
`use-cases/document-processing/resources/pdf-chunking`:

    AWS_DEFAULT_REGION=us-east-1 python -m pytest -q test_*.py
    -> ImportError: cannot import name 'lambda_handler' from 'handler'
       Interrupted: 2 errors during collection

## Current Focus

(resolved)

## Eliminated

- "handler.py renamed lambda_handler -> handler": false. `git log -S "def lambda_handler"`
  finds nothing; `def handler` dates from 717e5b4, the commit that added the tests, and the
  construct deploys `handler.handler` (agentic-document-processing.test.ts:246). The tests
  were wrong from the start.

## Findings

Once both files collected, two more test-side faults surfaced (collection errors had
aborted the run before they could show):

1. test_token_estimation.py: the `analyze_pdf_tokens` tests mock the S3 body as
   `b'fake pdf'`, but token_estimation.py:130 rejects bodies without `%PDF-` magic bytes.
   7 tests failed even in isolation. `test_pdf_processing_error` passed by accident (the
   magic-byte error also contains "Failed to analyze PDF").
2. test_metrics.py: set `os.environ['ENABLE_METRICS']='true'` at module top, assuming it
   imports `metrics` first. metrics.py reads the flag once at import, so when test_handler
   imports handler->metrics first the flag freezes False (20 failures); in reverse order
   the leaked env var turns metrics on for test_handler with no namespace (9 failures).

No CI job runs these Python tests, which is how they went stale.

## Resolution

Test-only fix; production code unchanged.
- test_handler.py / test_integration.py: `from handler import handler as lambda_handler`.
- test_token_estimation.py: mock bodies start with `%PDF-`.
- test_metrics.py: drop the module-level env write; patch `metrics.METRICS_ENABLED=True`
  via setUpModule/tearDownModule so the module controls the flag regardless of order.

Verify: all 8 files, default order and reversed: 224 passed, 7 skipped (the skips are the
RUN_INTEGRATION_TESTS-gated real-AWS tests). With the diff reverted: 2 collection errors.
