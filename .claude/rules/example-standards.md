# Example Standards

Examples live in `examples/` and are deployable reference implementations. They compose existing constructs — do not implement reusable construct architecture in example stacks.

## Design Rules

- Compose library constructs with clear, opinionated defaults
- Never hardcode AWS account IDs or regions — use environment variables or CDK context
- Provide CloudFormation outputs needed for verification (URLs, ARNs, resource names)
- Include helper scripts for invocation and testing (e.g., `upload-document.sh`)
- Keep deployment and usage commands copy/paste runnable

## Directory Structure

```
examples/<category>/<example-name>/
├── bin/
│   └── app.ts                 # CDK app entry point
├── lib/
│   └── <example>-stack.ts     # Stack composing constructs
├── resources/                 # Agent tools, prompts, sample files
│   ├── agent/
│   │   ├── system_prompt.txt
│   │   └── tools/
│   ├── sample-files/
│   └── scripts/
├── cdk.json                   # CDK config with context
├── package.json               # Example-local dependencies
├── tsconfig.json
└── README.md                  # Comprehensive documentation
```

## CDK App Entry Point

- Include `#!/usr/bin/env node` shebang and `source-map-support/register`
- Use `process.env.CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` for environment
- Provide sensible defaults via CDK context in `cdk.json`

## README Requirements (all sections required)

1. **Overview** — what the example demonstrates
2. **Architecture** — diagram (Mermaid preferred) and component explanation
3. **Prerequisites** — required tools, AWS setup, permissions
4. **Deployment** — step-by-step `npm install`, `cdk bootstrap`, `cdk deploy`
5. **Usage / Invocation** — how to use the deployed example with sample commands
6. **Expected Output** — what success looks like
7. **Monitoring** — where to find logs, metrics, traces
8. **Troubleshooting** — common issues and solutions
9. **Cleanup** — `cdk destroy` and any manual cleanup steps
10. **Links** — references to construct documentation

All commands in the README must be accurate, tested, and copy/paste runnable.

## Agent Resources (when applicable)

- **System prompts:** define role, available tools, process, and output format
- **Python tools:** use `@tool` decorator, single-purpose, idempotent, with structured returns
- **Requirements:** maintain `requirements.txt` in each tool directory
- Grant minimum IAM permissions and load tool assets explicitly

## Testing Expectations

- Validate deploy flow, invocation flow, and cleanup flow
- Verify README commands actually work
- Add targeted tests when custom logic exists beyond composition
- Run `npm run build` and `npm run eslint` to validate

## Common Patterns

- **S3-triggered processing:** S3 upload → SQS → Lambda → Step Functions → DynamoDB
- **Custom Bedrock models:** override model via props for different model IDs/regions
- **Observability enabled:** pass `Observability` construct for logging/tracing
- **Custom enrichment:** add post-processing steps to document processing workflows

## Documentation Updates (REQUIRED)

When adding a new example, you MUST update the following documentation files:

1. **`examples/README.md`** — Add to the appropriate category table (AI Chatbots & Assistants, Intelligent Document Processing)
2. **`README.md`** (root) — Add to the same category table under "What You Can Build"
3. **`use-cases/README.md`** — Add to "Ready-to-Deploy Solutions" table
4. **Related construct README** — Add to "Example Implementations" section in the README of the construct(s) the example uses

**Table format (3 columns):**
```markdown
| [**Solution Name**](./path/to/example/) | Brief description | [ConstructName](./path/to/construct/), [AnotherConstruct](./path/to/construct/) |
```

**Naming conventions:**
- Use consistent names across all READMEs (match the example's own README title)
- "Constructs Used" column: hyperlink each construct to its documentation
  - InteractiveAgent, BatchAgent, BaseAgent → `./use-cases/framework/agents/`
  - BedrockKnowledgeBase → `./use-cases/framework/agents/knowledge-base/`
  - AgenticDocumentProcessing, BedrockDocumentProcessing, BaseDocumentProcessing → `./use-cases/document-processing/`
  - Frontend → `./use-cases/webapp/`

## Common Mistakes to Avoid

- Do not create new reusable constructs inside examples — put them in `use-cases/`
- Do not hardcode account/region values
- Do not skip CloudFormation outputs needed for verification
- Do not forget sample files for document processing examples
- Do not write incomplete READMEs — all sections above are required
- Do not leave stale deployment instructions after refactoring
- Do not forget to update documentation files when adding new examples
