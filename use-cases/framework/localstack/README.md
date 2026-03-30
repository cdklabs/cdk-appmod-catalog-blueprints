# LocalStack + Ollama Integration

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/use-cases/framework/localstack)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/use-cases/framework/localstack/)

## Overview

The LocalStack + Ollama integration provides a shared configuration layer for an opt-in local-first developer sandbox across selected AppMod Catalog Blueprints paths. It is intended to reduce onboarding friction and support early experimentation: developers can explore the framework, validate basic workflow behavior locally, and iterate on MVP ideas before provisioning full AWS environments.

This module does not replace the repository's AWS-first design or production runtime paths. AWS-managed behavior remains the default and still needs to be used for production validation. The LocalStack + Ollama integration focuses on a narrower job: isolating local development behavior behind dedicated variants and shared configuration so teams can experiment locally without changing the existing AWS-native constructs.

We use
- [LocalStack](https://www.localstack.cloud/), an [AWS Partner Network (APN) partner](https://aws.amazon.com/about-aws/whats-new/2025/09/localstack-integration-vs-code-ide-local-testing/), for local AWS service emulation during development 
- [Ollama](https://ollama.com/), a popular open-source framework for local LLM inference during development. 

## What It Provides

The `use-cases/framework/localstack` module exports:

- **Shared configuration interfaces** for describing LocalStack endpoint routing
- **Endpoint override support** for `S3`, `Step Functions`, `Bedrock Runtime`, and `Bedrock Agent Runtime`
- **Utility methods** for resolving defaults and converting config into Lambda environment variables
- **Default constants** for common LocalStack and Ollama sandbox setups

The following LocalStack-aware constructs consume this shared configuration today:

- **[`LocalStackBatchAgent`](../agents/README.md#localstack-usage)**: batch agent variant for LocalStack-backed agent execution
- **[`LocalStackBedrockDocumentProcessing`](../../document-processing/README.md#localstack-usage)**: document-processing variant with LocalStack runtime routing
- **[`LocalStackAgenticDocumentProcessing`](../../document-processing/README.md#localstack-usage)**: agentic document-processing variant that combines LocalStack runtime routing with the agents framework

## Framework Architecture

The LocalStack support is intentionally split into two layers:

1. **Shared framework layer**
   `use-cases/framework/localstack` exports configuration types, defaults, and helper utilities.
2. **Consuming construct layer**
   LocalStack-aware constructs opt into this shared layer and apply the resolved settings to their Lambda runtimes.

At a high level:

- Construct code accepts a `localStack` property
- `LocalStackIntegrationUtils.resolveConfig()` fills in defaults for any omitted endpoints
- `LocalStackIntegrationUtils.toLambdaEnvironment()` translates the resolved settings into Lambda environment variables
- LocalStack-aware constructs add those environment variables to the Lambda functions they create
- Runtime code then uses those variables to direct AWS SDK calls to LocalStack instead of the default AWS endpoints

This keeps the shared LocalStack module small and reusable while allowing each construct to decide how it wants to apply the LocalStack configuration.

## Configuration Interfaces

### `LocalStackIntegrationConfig`

Use this interface when you want to describe a complete LocalStack routing configuration:

```typescript
interface LocalStackIntegrationConfig {
  readonly enabled?: boolean;
  readonly endpointUrl?: string;
  readonly s3EndpointUrl?: string;
  readonly stepFunctionsEndpointUrl?: string;
  readonly bedrockRuntimeEndpointUrl?: string;
  readonly bedrockAgentRuntimeEndpointUrl?: string;
}
```

- `enabled`: turns Lambda environment generation on or off
- `endpointUrl`: default fallback for services without a service-specific override
- `s3EndpointUrl`: optional `S3` override
- `stepFunctionsEndpointUrl`: optional `Step Functions` override
- `bedrockRuntimeEndpointUrl`: optional `Bedrock Runtime` override
- `bedrockAgentRuntimeEndpointUrl`: optional `Bedrock Agent Runtime` override

### `LocalStackEndpointOverrides`

Use this interface in construct props when the construct should always enable LocalStack routing but still allow endpoint customization:

```typescript
interface LocalStackEndpointOverrides {
  readonly endpointUrl?: string;
  readonly s3EndpointUrl?: string;
  readonly stepFunctionsEndpointUrl?: string;
  readonly bedrockRuntimeEndpointUrl?: string;
  readonly bedrockAgentRuntimeEndpointUrl?: string;
}
```

This is what the LocalStack-aware constructs use for their `localStack` prop. Internally they apply `enabled: true` before converting the config into Lambda environment variables.

### `ResolvedLocalStackIntegrationConfig`

This is the normalized form returned by `LocalStackIntegrationUtils.resolveConfig()`:

```typescript
interface ResolvedLocalStackIntegrationConfig {
  readonly enabled: boolean;
  readonly endpointUrl: string;
  readonly s3EndpointUrl: string;
  readonly stepFunctionsEndpointUrl: string;
  readonly bedrockRuntimeEndpointUrl: string;
  readonly bedrockAgentRuntimeEndpointUrl: string;
}
```

All fields are populated with concrete values after defaults and fallbacks are applied.

## Default Constants

The module exports a few convenience constants for local sandbox setups:

```typescript
DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL = 'http://host.docker.internal:4566';
DEFAULT_LOCALSTACK_OLLAMA_BASE_URL = 'http://host.docker.internal:11434';
DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID = 'ollama.qwen3.5:9b';
```

These are especially useful when your Lambda runtime executes in a containerized environment and needs to reach services running on the host machine.

The utility class also exposes a separate default fallback endpoint:

```typescript
LocalStackIntegrationUtils.DEFAULT_ENDPOINT_URL = 'http://localhost.localstack.cloud:4566';
```

This is used by `resolveConfig()` when no explicit `endpointUrl` is provided.

## How It Works

The shared LocalStack helpers are small by design:

### `LocalStackIntegrationUtils.resolveConfig()`

Resolves a `LocalStackIntegrationConfig` into a fully-populated `ResolvedLocalStackIntegrationConfig` by:

- defaulting `enabled` to `false`
- defaulting `endpointUrl` to `http://localhost.localstack.cloud:4566`
- using `endpointUrl` as the fallback for each service-specific endpoint that is not explicitly provided

### `LocalStackIntegrationUtils.toLambdaEnvironment()`

Converts a config object into the environment variables consumed by LocalStack-aware Lambda runtimes:

```typescript
{
  LOCALSTACK_ENABLED: 'true',
  AWS_ENDPOINT_URL: '<default endpoint>',
  AWS_ENDPOINT_URL_S3: '<s3 endpoint>',
  AWS_ENDPOINT_URL_STEPFUNCTIONS: '<step functions endpoint>',
  AWS_ENDPOINT_URL_BEDROCK_RUNTIME: '<bedrock runtime endpoint>',
  AWS_ENDPOINT_URL_BEDROCK_AGENT_RUNTIME: '<bedrock agent runtime endpoint>'
}
```

If `enabled` is `false`, the method returns an empty object.

## Simple Usage Examples

### Minimal LocalStack config

Use the shared config shape to point constructs at a LocalStack edge endpoint:

```typescript
import {
  DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
  type LocalStackEndpointOverrides
} from '@cdklabs/cdk-appmod-catalog-blueprints';

const localStack: LocalStackEndpointOverrides = {
  endpointUrl: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL
};
```

### Using a LocalStack-enabled construct

`LocalStackBatchAgent` consumes the shared config and applies the resolved endpoints to its Lambda runtime:

```typescript
import {
  DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
  DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
  LocalStackBatchAgent
} from '@cdklabs/cdk-appmod-catalog-blueprints';

new LocalStackBatchAgent(this, 'LocalAgent', {
  agentName: 'LocalAgent',
  prompt: 'Analyze the input document.',
  agentDefinition: {
    bedrockModel: {
      customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID
    },
    systemPrompt: myPromptAsset
  },
  localStack: {
    endpointUrl: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL
  }
});
```

### Custom endpoint overrides and Ollama settings

You can override individual service endpoints while keeping a shared base URL:

```typescript
import {
  DEFAULT_LOCALSTACK_OLLAMA_BASE_URL,
  DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID,
  DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
  LocalStackBedrockDocumentProcessing
} from '@cdklabs/cdk-appmod-catalog-blueprints';

process.env.OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? DEFAULT_LOCALSTACK_OLLAMA_BASE_URL;

new LocalStackBedrockDocumentProcessing(this, 'LocalDocProcessor', {
  localStack: {
    endpointUrl: DEFAULT_LOCALSTACK_SANDBOX_ENDPOINT_URL,
    s3EndpointUrl: 'http://host.docker.internal:4566',
    stepFunctionsEndpointUrl: 'http://host.docker.internal:4566',
    bedrockRuntimeEndpointUrl: 'http://host.docker.internal:4566'
  },
  classificationBedrockModel: {
    customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID
  },
  processingBedrockModel: {
    customModelId: DEFAULT_LOCALSTACK_OLLAMA_MODEL_ID
  }
});
```

If you want to work with the helpers directly, you can also generate the Lambda environment map yourself:

```typescript
import { LocalStackIntegrationUtils } from '@cdklabs/cdk-appmod-catalog-blueprints';

const env = LocalStackIntegrationUtils.toLambdaEnvironment({
  enabled: true,
  endpointUrl: 'http://localhost.localstack.cloud:4566',
  bedrockRuntimeEndpointUrl: 'http://localhost.localstack.cloud:4566'
});
```

## Current Boundaries And Caveats

This integration is best understood as an opt-in development sandbox, not a full local replacement for the AWS-native repository:

- LocalStack-aware constructs redirect selected runtime AWS SDK calls to LocalStack, but they still build on top of the existing AWS-first construct architecture
- AWS-managed paths remain the default behavior; LocalStack and Ollama support are scoped to dedicated variants and helper modules
- This does not aim for full feature parity between LocalStack and AWS-managed services
- Production behavior, infrastructure characteristics, security posture, and managed-service semantics should still be validated on AWS
- Some construct behavior outside the shared LocalStack config layer may still reflect AWS-oriented assumptions
- LocalStack and Ollama setup, container reachability, and host endpoint routing remain part of the local development environment responsibility

Use the LocalStack variants when you want a lower-friction path for onboarding, architecture evaluation, and iterative prototyping. Move to the standard AWS-native constructs when you need to validate production infrastructure and end-to-end AWS behavior.

## Related Docs

- [`../agents/README.md`](../agents/README.md): detailed `LocalStackBatchAgent` usage and agent framework concepts
- [`../../document-processing/README.md`](../../document-processing/README.md): LocalStack document-processing variants and workflow architecture
