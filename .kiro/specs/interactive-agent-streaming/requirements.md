# Requirements Document

## Introduction

This document specifies the requirements for revising the InteractiveAgent construct to replace the WebSocket + BidiAgent approach with API Gateway REST API response streaming, Lambda Web Adapter, and standard Strands Agent. The current architecture has fundamental incompatibilities: BidiAgent is designed for terminal/CLI interaction, Lambda has a 29-second WebSocket timeout, and platform-specific compiled dependencies cause deployment failures. The new architecture uses API Gateway REST API with `responseTransferMode: STREAM`, Lambda Web Adapter wrapping a FastAPI app, and the standard `strands.Agent` for Bedrock interactions, delivering SSE-streamed responses to clients.

## Glossary

- **InteractiveAgent**: The CDK L3 construct in `use-cases/framework/agents/` that enables real-time conversational AI interactions, extending BaseAgent
- **Lambda_Web_Adapter**: An AWS-provided Lambda extension that allows running web frameworks (FastAPI, Flask) inside Lambda with response streaming support
- **SSE**: Server-Sent Events, a standard protocol for streaming server-to-client data over HTTP
- **Strands_Agent**: The standard `strands.Agent` class from the strands-agents library, used for invoking Bedrock models with tool support
- **StreamingHttpAdapter**: The new concrete implementation of ICommunicationAdapter that creates an API Gateway REST API with response streaming
- **FastAPI_Handler**: The Python FastAPI application running inside Lambda via Lambda Web Adapter that handles chat requests and streams SSE responses
- **CognitoAuthorizer**: A built-in API Gateway Cognito authorizer that validates JWT tokens from a Cognito User Pool
- **Frontend**: The React-based chatbot UI that consumes SSE streams via `fetch()` and `ReadableStream`
- **BaseAgent**: The abstract CDK construct that provides foundation infrastructure (IAM role, KMS encryption, observability) for all agent types
- **ICommunicationAdapter**: The strategy interface for pluggable communication mechanisms between clients and the agent Lambda
- **ISessionStore**: The strategy interface for session persistence across requests
- **IContextStrategy**: The strategy interface for conversation history management

## Requirements

### Requirement 1: Replace Communication Layer with REST API Response Streaming

**User Story:** As a developer, I want the InteractiveAgent to use API Gateway REST API with response streaming instead of WebSocket, so that I get longer timeouts (up to 15 minutes), simpler client integration, and no WebSocket complexity.

#### Acceptance Criteria

1. THE StreamingHttpAdapter SHALL create an API Gateway REST API with a POST endpoint for chat interactions
2. WHEN a chat request is received, THE StreamingHttpAdapter SHALL invoke the Lambda function using `InvokeWithResponseStream` via the REST API's response streaming configuration
3. THE StreamingHttpAdapter SHALL configure the REST API stage with `responseTransferMode` set to chunked streaming
4. WHEN the StreamingHttpAdapter is not explicitly provided, THE InteractiveAgent SHALL use StreamingHttpAdapter as the default communication adapter
5. THE StreamingHttpAdapter SHALL expose the REST API endpoint URL as a public property for client configuration
6. THE InteractiveAgent SHALL support a Lambda timeout of up to 15 minutes for streaming responses

### Requirement 2: Lambda Web Adapter Integration with FastAPI

**User Story:** As a developer, I want the Lambda handler to use Lambda Web Adapter with FastAPI, so that I can stream SSE responses from the standard Strands Agent without needing Node.js-specific streaming code.

#### Acceptance Criteria

1. THE FastAPI_Handler SHALL run as a FastAPI application inside Lambda using Lambda Web Adapter
2. THE FastAPI_Handler SHALL expose a POST `/chat` endpoint that accepts a JSON body with a `message` field and an optional `session_id` field
3. WHEN a valid chat request is received, THE FastAPI_Handler SHALL return an SSE stream with `Content-Type: text/event-stream`
4. THE FastAPI_Handler SHALL use the standard Strands_Agent class (not BidiAgent) for Bedrock model invocation
5. THE FastAPI_Handler SHALL stream each text chunk from the Strands_Agent as an individual SSE `data:` event
6. WHEN the agent completes its response, THE FastAPI_Handler SHALL send a final SSE event with `event: done`
7. THE InteractiveAgent SHALL configure the Lambda function with the Lambda Web Adapter layer and set the `AWS_LWA_INVOKE_MODE` environment variable to `response_stream`

### Requirement 3: Standard Strands Agent Integration

**User Story:** As a developer, I want the InteractiveAgent to use the standard `strands.Agent` instead of BidiAgent, so that I avoid pyaudio/prompt_toolkit dependencies and use a well-tested agent class already proven in BatchAgent.

#### Acceptance Criteria

1. THE FastAPI_Handler SHALL create a Strands_Agent instance configured with the Bedrock model ID, system prompt, and loaded tools
2. THE FastAPI_Handler SHALL load the system prompt from S3 at cold start using the configured bucket and key environment variables
3. THE FastAPI_Handler SHALL load tools from S3 using the tools configuration passed via environment variables, consistent with BatchAgent's tool loading mechanism
4. WHEN the Strands_Agent produces streaming output, THE FastAPI_Handler SHALL forward each text token to the SSE response stream
5. IF the Strands_Agent raises an exception during processing, THEN THE FastAPI_Handler SHALL send an SSE error event and close the stream gracefully

### Requirement 4: Cognito Authentication via API Gateway Authorizer

**User Story:** As a developer, I want the InteractiveAgent to use a built-in Cognito authorizer on the API Gateway REST API, so that I get JWT token validation without a custom authorizer Lambda.

#### Acceptance Criteria

1. WHEN a CognitoAuthenticator is configured, THE StreamingHttpAdapter SHALL attach a Cognito User Pool authorizer to the REST API POST endpoint
2. THE CognitoAuthenticator SHALL create a Cognito User Pool and User Pool Client with secure defaults when not provided by the developer
3. WHEN a NoAuthenticator is configured, THE StreamingHttpAdapter SHALL configure the REST API endpoint with no authorization
4. THE CognitoAuthenticator SHALL expose the User Pool ID and User Pool Client ID as public properties for frontend configuration

### Requirement 5: Session Management for Stateful Conversations

**User Story:** As a developer, I want the InteractiveAgent to persist conversation state across HTTP requests, so that users can have multi-turn conversations even though each message is a separate HTTP request.

#### Acceptance Criteria

1. WHEN a session_id is provided in the chat request, THE FastAPI_Handler SHALL load the existing conversation history from the session store
2. WHEN no session_id is provided, THE FastAPI_Handler SHALL generate a new session ID and include it in the SSE response metadata
3. WHEN a message exchange completes, THE FastAPI_Handler SHALL persist the updated conversation history (user message and assistant response) to the session store
4. THE S3SessionManager SHALL store session data in S3 with a configurable TTL via lifecycle policies
5. WHEN the developer sets sessionStore to undefined, THE InteractiveAgent SHALL operate in stateless mode with no session persistence

### Requirement 6: Conversation Context Management

**User Story:** As a developer, I want configurable conversation history windowing, so that I can control token usage and context size for the Strands Agent.

#### Acceptance Criteria

1. THE SlidingWindowConversationManager SHALL limit conversation history to a configurable number of messages before passing context to the Strands_Agent
2. WHEN the NullConversationManager is configured, THE FastAPI_Handler SHALL treat each request as a single-turn interaction with no prior context
3. THE InteractiveAgent SHALL default to a SlidingWindowConversationManager with a 20-message window

### Requirement 7: Frontend SSE Client Integration

**User Story:** As a frontend developer, I want to consume the agent's streaming responses using standard `fetch()` and `ReadableStream`, so that I can display tokens in real-time without WebSocket libraries.

#### Acceptance Criteria

1. WHEN the frontend sends a POST request to the chat endpoint, THE Frontend SHALL read the response as a `ReadableStream` and parse SSE events incrementally
2. WHEN an SSE `data:` event is received, THE Frontend SHALL append the text chunk to the displayed message in real-time
3. WHEN an SSE `event: done` event is received, THE Frontend SHALL mark the message as complete and re-enable the input field
4. IF an SSE `event: error` event is received, THEN THE Frontend SHALL display an error message to the user and re-enable the input field
5. THE Frontend SHALL send the Cognito JWT token in the `Authorization` header of each chat request

### Requirement 8: Backward-Compatible Strategy Interfaces

**User Story:** As a construct consumer, I want the InteractiveAgent to maintain its strategy pattern interfaces (ICommunicationAdapter, ISessionStore, IContextStrategy, IAuthenticator), so that I can provide custom implementations.

#### Acceptance Criteria

1. THE InteractiveAgent SHALL accept an optional `communicationAdapter` prop implementing ICommunicationAdapter
2. THE InteractiveAgent SHALL accept an optional `sessionStore` prop implementing ISessionStore
3. THE InteractiveAgent SHALL accept an optional `contextStrategy` prop implementing IContextStrategy
4. THE InteractiveAgent SHALL accept an optional `authenticator` prop implementing IAuthenticator
5. WHEN no strategy implementations are provided, THE InteractiveAgent SHALL use StreamingHttpAdapter, S3SessionManager, SlidingWindowConversationManager, and CognitoAuthenticator as defaults

### Requirement 9: Observability and Error Handling

**User Story:** As an operator, I want structured logging, metrics, and tracing for the streaming agent, so that I can monitor and troubleshoot production conversations.

#### Acceptance Criteria

1. WHEN enableObservability is true, THE InteractiveAgent SHALL configure Lambda Powertools for structured logging, metrics, and X-Ray tracing via PropertyInjectors
2. THE FastAPI_Handler SHALL emit structured log entries for each chat request including session ID, message length, and response duration
3. IF the Strands_Agent fails to invoke the Bedrock model, THEN THE FastAPI_Handler SHALL log the error with full context and return an SSE error event
4. IF the Lambda function times out during streaming, THEN the client SHALL detect the incomplete stream and display an appropriate timeout message

### Requirement 10: Construct Tests for New Architecture

**User Story:** As a construct maintainer, I want comprehensive unit tests and CDK Nag tests for the revised InteractiveAgent, so that I can verify resource creation and security compliance.

#### Acceptance Criteria

1. THE unit tests SHALL verify that the InteractiveAgent creates an API Gateway REST API (not WebSocket API) with the correct configuration
2. THE unit tests SHALL verify that the Lambda function is configured with the Lambda Web Adapter layer and correct environment variables
3. THE unit tests SHALL verify that a Cognito User Pool authorizer is attached to the REST API when CognitoAuthenticator is used
4. THE CDK Nag tests SHALL pass AWS Solutions checks with documented suppressions for any necessary exceptions
5. THE unit tests SHALL verify that the InteractiveAgent creates an S3 bucket for session storage with KMS encryption by default
