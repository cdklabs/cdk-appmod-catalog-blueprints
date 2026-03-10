# Coding Standards

## TypeScript

### Style
- 2-space indentation, single quotes, semicolons
- Max line length: 150 characters
- `const` by default, `let` only when reassignment is needed
- Explicit return types for public methods
- Run `npm run eslint` to validate

### Naming
- **Files:** kebab-case (`base-document-processing.ts`)
- **Classes:** PascalCase (`BaseDocumentProcessing`)
- **Props interfaces:** `{ConstructName}Props`
- **Test files:** `{name}.test.ts` (unit), `{name}-nag.test.ts` (CDK Nag)
- **CDK construct IDs:** PascalCase (`DocumentBucket`, `ProcessingQueue`)
- **AWS resource names:** kebab-case (`fraud-detection-bucket`)

### Types
- Use `interface` for public APIs and props
- Use `type` for unions, intersections, and complex types
- Use `readonly` on immutable public props and exposed resources

### CDK Construct Patterns
- Define explicit props interfaces with focused JSDoc and `@default` tags
- Never use `@example` in JSDoc — it causes JSII compilation failures
- Validate construct props early in the constructor
- Expose only necessary `public readonly` resources for consumers
- Keep helper methods `private`/`protected` unless extension requires otherwise
- Keep common workflow logic in abstract base classes; concrete classes implement specifics
- Use composition for pluggable strategies (network, observability, event broker)
- Export new constructs from the barrel `index.ts`

### Documentation Updates for New Constructs (REQUIRED)

When adding a new construct, you MUST update documentation:

1. **Construct's own README** — Create or update `README.md` in the construct's directory with:
   - Overview and key features
   - Usage examples
   - Configuration options table
   - Example Implementations section (link to examples using this construct)

2. **Parent module README** — Update the parent directory's README to reference the new construct:
   - `use-cases/README.md` for new use cases
   - `use-cases/framework/README.md` for new framework components
   - `use-cases/utilities/README.md` for new utilities

3. **Root README** — If the construct represents a new use case category, add it to the table in `README.md`

### Error Handling
- Lambda functions: validate input, return structured `{statusCode, body}` responses
- Step Functions: use `.addCatch()` with explicit error paths
- Agent tools: return `{success, result}` or `{success: false, error, error_type}` objects

## Python (Lambdas / Agent Tools)

### Style
- snake_case file names, PEP 8, 4-space indentation
- Type hints for function parameters and return values
- Docstrings for all public functions

### Agent Tools
- Use `@tool` decorator from `strands`
- Keep tools single-purpose with clear contracts
- Return structured success/error payloads
- Keep tools focused and idempotent where possible

## Project Tooling

- All npm scripts delegate to Projen — never run `tsc` or `jest` directly
- After `.projenrc.ts` changes, run `npx projen` to regenerate config
- Do not manually edit Projen-managed files (`package.json`, `tsconfig.json`, `.eslintrc.json`)
- Do not hardcode AWS account IDs or regions — use `Stack.of(this).account` and `Stack.of(this).region`
- Do not create circular dependencies between stacks or constructs
