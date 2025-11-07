# Ready-to-Deploy Examples

[![Code](https://img.shields.io/badge/code-GitHub-green)](https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/examples)
[![Documentation](https://img.shields.io/badge/docs-cdklabs.github.io-blue)](https://cdklabs.github.io/cdk-appmod-catalog-blueprints/docs/examples/)

Ready-to-deploy examples demonstrating the AppMod Catalog Blueprints. Each example is a complete CDK application that you can deploy immediately for evaluation or use as a starting point for your own implementation.

## Quick Start

Each example is designed for **3-command deployment**:
```bash
cd examples/{use-case}/{example-name}
npm install 
npm run deploy
```

## Available Examples

| Example | Category | Description | Use Case |
|---------|----------|-------------|----------|
| **[Bedrock Document Processing](./document-processing/bedrock-document-processing/)** | Document Processing | AI-powered document processing using Amazon Bedrock | Invoice processing, document digitization, content extraction |
| **[Agentic Document Processing](./document-processing/agentic-document-processing/)** | Document Processing | Advanced AI processing using Strands Agent with tool integration and reasoning | Complex document analysis, multi-step processing, validation workflows |
| **[Full-Stack Insurance Claims Processing Web Application](./document-processing/doc-processing-fullstack-webapp/)** | Document Processing, Web Application | Complete web application with document processing backend | End-to-end business applications, customer-facing portals |