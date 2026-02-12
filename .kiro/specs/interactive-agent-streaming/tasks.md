# Implementation Plan: Interactive Agent Streaming

## Overview

Replace the InteractiveAgent's WebSocket + BidiAgent architecture with API Gateway REST API response streaming + Lambda Web Adapter + standard Strands Agent. This involves updating the CDK construct, rewriting the Lambda handler as a FastAPI app, updating the chatbot example, and rewriting all tests.

## Tasks

- [ ] 1. Implement StreamingHttpAdapter and update InteractiveAgent construct
  - [ ] 1.1 Create StreamingHttpAdapter class in `use-cases/framework/agents/interactive-agent.ts`
    - Replace `BidirectionalWebSocketAdapter` with `StreamingHttpAdapter`
    - Create API Gateway REST API with POST `/chat` resource
    - Configure Lambda proxy integration with `responseTransferMode: STREAM` using CfnMethod escape hatch
    - Integration URI must use `/2021-11-15/functions/{arn}/response-streaming-invocations` path
    - Implement `attachToFunction()` and `grantInvoke()` per ICommunicationAdapter interface
    - Expose `restApi` and `apiEndpoint` as public properties
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ] 1.2 Update CognitoAuthenticator for REST API Cognito authorizer
    - Change from WebSocket REQUEST authorizer to REST API `COGNITO_USER_POOLS` authorizer type
    - Attach authorizer to the POST method on the REST API
    - Keep User Pool and User Pool Client creation logic (with secure defaults)
    - Update `_setScope()` to work with REST API instead of WebSocket API
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 1.3 Update InteractiveAgent constructor to use new defaults
    - Change default adapter from `BidirectionalWebSocketAdapter` to `StreamingHttpAdapter`
    - Change default timeout from `Duration.minutes(5)` to `Duration.minutes(15)`
    - Add Lambda Web Adapter layer ARN to Lambda function configuration
    - Set `AWS_LWA_INVOKE_MODE` environment variable to `response_stream`
    - Set `PORT` environment variable to `8080`
    - Remove WebSocket-specific environment variables and logic
    - Keep all strategy interface wiring (sessionStore, contextStrategy, authenticator)
    - _Requirements: 1.4, 1.6, 2.7, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 1.4 Remove BidirectionalWebSocketAdapter class and WebSocket imports
    - Remove `BidirectionalWebSocketAdapter` class and its props interface
    - Remove `BidirectionalWebSocketAdapterProps` and `WebSocketThrottleSettings` interfaces
    - Remove imports for `CfnApi`, `CfnStage`, `CfnRoute`, `CfnIntegration` from `aws-apigatewayv2`
    - Add imports for `RestApi`, `LambdaIntegration`, `CognitoUserPoolsAuthorizer`, `AuthorizationType` from `aws-apigateway`
    - Update exports in `use-cases/framework/agents/index.ts`
    - _Requirements: 1.1, 1.4_

- [ ] 2. Rewrite Lambda handler as FastAPI app with SSE streaming
  - [ ] 2.1 Rewrite `use-cases/framework/agents/resources/interactive-agent-handler/index.py` as FastAPI app
    - Replace WebSocket handler with FastAPI app using `uvicorn`
    - Create `POST /chat` endpoint accepting `{ "message": str, "session_id": str? }`
    - Return `StreamingResponse` with `media_type="text/event-stream"`
    - Use standard `strands.Agent` (not BidiAgent) for Bedrock invocation
    - Implement SSE event format: `data:` for text chunks, `event: metadata` for session info, `event: done` for completion, `event: error` for errors
    - Load system prompt from S3 at cold start
    - Load tools from S3 using TOOLS_CONFIG env var (same as BatchAgent)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4_

  - [ ] 2.2 Implement session management in the FastAPI handler
    - Load session from S3 when `session_id` is provided
    - Generate new UUID session_id when not provided
    - Save updated conversation history (user + assistant messages) after each exchange
    - Apply context windowing before passing messages to agent
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_

  - [ ] 2.3 Implement error handling in the FastAPI handler
    - Catch Strands Agent exceptions and send SSE `event: error`
    - Handle S3 session load/save failures gracefully (log and continue)
    - Handle system prompt load failure with fallback default
    - _Requirements: 3.5, 9.3_

  - [ ] 2.4 Update `requirements.txt` for new dependencies
    - Remove `prompt_toolkit` (no longer needed)
    - Add `fastapi`, `uvicorn`, `sse-starlette` (or use built-in StreamingResponse)
    - Keep `strands-agents`, `boto3`, `aws-lambda-powertools`, `pydantic`
    - _Requirements: 2.1, 3.1_

- [ ] 3. Checkpoint - Build and verify construct compiles
  - Ensure `npx projen build` succeeds with no errors
  - Ensure all TypeScript types are correct
  - Ask the user if questions arise.

- [ ] 4. Write unit tests for the updated InteractiveAgent construct
  - [ ] 4.1 Rewrite `use-cases/framework/tests/interactive-agent.test.ts`
    - Test REST API resource creation (not WebSocket)
    - Test Lambda function has Web Adapter layer and correct env vars (`AWS_LWA_INVOKE_MODE`, `PORT`)
    - Test default adapter is StreamingHttpAdapter
    - Test default timeout is 15 minutes
    - Test Cognito authorizer attached to REST API POST method
    - Test NoAuthenticator creates no authorizer
    - Test S3 session bucket created with KMS encryption by default
    - Test stateless mode (sessionStore: undefined) creates no session bucket
    - Test custom props (memorySize, timeout, messageHistoryLimit, sessionTTL)
    - Test validation errors (empty agentName, invalid memorySize, invalid timeout)
    - Use `createTestApp()` for test performance
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

  - [ ] 4.2 Rewrite `use-cases/framework/tests/interactive-agent-nag.test.ts`
    - Test stack passes AwsSolutionsChecks
    - Document suppressions for IAM wildcards, managed policies, S3 access logging
    - _Requirements: 10.4_

  - [ ]* 4.3 Write property tests for Python handler logic
    - Create `use-cases/framework/agents/resources/interactive-agent-handler/test_properties.py`
    - **Property 1: SSE text chunk formatting** - For any text string, formatting as SSE should produce valid `data: {"text": "..."}` format
    - **Validates: Requirements 2.5**
    - **Property 2: Error events are well-formed SSE** - For any exception, error SSE should contain `event: error` and JSON error data
    - **Validates: Requirements 3.5**
    - **Property 3: Session persistence round-trip** - For any message list, save then load should return equivalent messages
    - **Validates: Requirements 5.1, 5.3**
    - **Property 4: Sliding window limits context size** - For any message list and window size, output length <= window size and contains last W messages
    - **Validates: Requirements 6.1**
    - **Property 5: Null context manager always returns empty** - For any message list, NullConversationManager returns empty list
    - **Validates: Requirements 6.2**

- [ ] 5. Checkpoint - Ensure all construct tests pass
  - Run `npx projen build` then `npm test -- --testPathPattern="interactive-agent"`
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Update chatbot example for new architecture
  - [ ] 6.1 Update `examples/chatbot/infrastructure/chatbot-stack.ts`
    - Remove WebSocket-specific outputs (WebSocketUrl)
    - Add REST API endpoint output (ChatApiEndpoint)
    - Update CfnOutput names and descriptions for new architecture
    - Keep Cognito, session bucket, and frontend outputs
    - _Requirements: 1.5, 4.4, 7.5_

  - [ ] 6.2 Update `examples/chatbot/frontend/src/components/ChatInterface.tsx`
    - Replace WebSocket client with `fetch()` + `ReadableStream` SSE client
    - Parse SSE events incrementally (metadata, data, done, error)
    - Send Cognito JWT in Authorization header
    - Handle streaming display (append chunks in real-time)
    - Handle completion (re-enable input on `event: done`)
    - Handle errors (display error on `event: error`)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7. Final checkpoint - Ensure all tests pass
  - Run `npx projen build` then `npm test -- --testPathPattern="interactive-agent"`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The construct uses TypeScript, the Lambda handler uses Python, and the frontend uses TypeScript/React
- Build command is always `npx projen build` (never `tsc` directly)
- Use `createTestApp()` in all unit tests to skip Lambda bundling
- The Lambda Web Adapter layer ARN is region-specific: `arn:aws:lambda:{region}:753240598075:layer:LambdaAdapterLayerX86:24`
- Property tests require a Python virtual environment with hypothesis installed
