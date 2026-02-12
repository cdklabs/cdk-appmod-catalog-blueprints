---
inclusion: always
---

# Decision-Driven Document Generation

## 🛑 MANDATORY WORKFLOW ENFORCEMENT

**STOP! Before proceeding with ANY spec creation, you MUST complete these steps IN ORDER:**

### Step 1: Determine Work Type (REQUIRED)
```
Ask yourself: What type of work am I doing?

CONSTRUCT (use-cases/)          vs.    EXAMPLE (examples/)          vs.    OTHER
├─ Reusable library component          ├─ Deployable application          ├─ Documentation
├─ Abstract & flexible                 ├─ Concrete & opinionated          ├─ Testing infrastructure
├─ Requires OOP patterns               ├─ Uses library constructs         ├─ CI/CD pipelines
├─ Must be tested & exported           ├─ Demonstrates usage              ├─ Tooling/scripts
└─ Published in npm package            └─ Not published                   └─ Repository maintenance
```

**✅ ACTION REQUIRED:**
- **If CONSTRUCT**: Immediately read `construct-development-guide.md` BEFORE creating any decision files
- **If EXAMPLE**: Immediately read `example-development-guide.md` BEFORE creating any decision files
- **If OTHER**: Skip to Step 3 - proceed directly to creating decision files (no guide reading required)

**❌ DO NOT PROCEED** with construct/example work until you have read the appropriate guide.

### Step 2: Read the Appropriate Development Guide (REQUIRED)

**For CONSTRUCTS:**
```bash
READ: .kiro/steering/construct-development-guide.md
```
This guide contains:
- OOP patterns you MUST follow
- Inheritance strategies (two-layer vs three-layer)
- Design patterns (Template Method, Strategy, Factory, etc.)
- Real code examples from the repository
- Common mistakes to avoid

**For EXAMPLES:**
```bash
READ: .kiro/steering/example-development-guide.md
```
This guide contains:
- How to compose existing constructs
- Documentation requirements
- Deployment patterns
- Testing strategies for examples

**For OTHER work types:**
```
SKIP: No guide reading required
```
Examples of OTHER work:
- Documentation updates (README, guides, API docs)
- Testing infrastructure (test utilities, fixtures)
- CI/CD pipelines (GitHub Actions, deployment scripts)
- Development tooling (linters, formatters, build scripts)
- Repository maintenance (dependencies, configuration)

**🔒 ENFORCEMENT CHECKPOINT:**
- [ ] Have I determined my work type (CONSTRUCT / EXAMPLE / OTHER)?
- [ ] If CONSTRUCT or EXAMPLE: Have I read the appropriate development guide?
- [ ] If CONSTRUCT or EXAMPLE: Do I understand the patterns I need to follow?
- [ ] If OTHER: Am I ready to proceed with decision files?

**Only after completing Steps 1 and 2, proceed to Step 3.**

### Step 3: Create Decision File (REQUIRED)

Now create the appropriate decision file:
- `_decisions-requirements.md` (for requirements phase)
- `_decisions-design.md` (for design phase)
- `_decisions-tasks.md` (for tasks phase)

**The decision file MUST reflect the patterns from the guide you just read.**

---

## Critical First Step: Identify What You're Building

**BEFORE writing any code or creating any spec, you MUST determine:**

```
Are you creating a CONSTRUCT, EXAMPLE, or OTHER work?

CONSTRUCT (use-cases/)          vs.    EXAMPLE (examples/)          vs.    OTHER
├─ Reusable library component          ├─ Deployable application          ├─ Documentation
├─ Abstract & flexible                 ├─ Concrete & opinionated          ├─ Testing infrastructure
├─ Requires OOP patterns               ├─ Uses library constructs         ├─ CI/CD pipelines
├─ Must be tested & exported           ├─ Demonstrates usage              ├─ Tooling/scripts
└─ Published in npm package            └─ Not published                   └─ Repository maintenance
```

**Decision Impact:**
- **If CONSTRUCT**: Read and follow `construct-development-guide.md`
- **If EXAMPLE**: Read and follow `example-development-guide.md`
- **If OTHER**: Proceed with standard spec workflow (no special guide required)

**Key Questions to Ask:**
1. Will other developers extend this? → **Construct**
2. Does it demonstrate how to use existing constructs? → **Example**
3. Should it be published to npm? → **Construct**
4. Is it a specific use case implementation? → **Example**
5. Is it documentation, tooling, or infrastructure? → **Other**

**This determination affects:**
- Requirements phase decisions (what features to include)
- Design phase decisions (OOP patterns vs simple composition vs standard approach)
- Tasks phase decisions (testing strategy, documentation needs)

**Make this determination FIRST, then proceed with decision files.**

---

## Core Principles

### 🚨 MANDATORY DECISION FILE FIRST
Before creating ANY spec document (requirements.md, design.md, tasks.md), you MUST:

1. **Create decision file first**: `_decisions-requirements.md`, `_decisions-design.md`, or `_decisions-tasks.md`
2. **Wait for user input**: Get explicit user decisions before proceeding
3. **Read completed decisions**: Use user choices to generate final document

**🔒 ABSOLUTE RULE**: NEVER generate requirements.md, design.md, or tasks.md without first creating and completing the corresponding _decisions-*.md file

**Exception**: Skip decision file ONLY if user explicitly says "skip the decision file" or "no decisions needed"

### 🌐 LANGUAGE MATCHING
Generate decision files in the same language as user's input prompt:
- Spanish input → Spanish decision file
- French input → French decision file  
- Japanese input → Japanese decision file
- Default to English only if language cannot be determined

### 💬 NATURAL MESSAGING
**NEVER say**: 
- "According to the rules..." or "The rules require..."
- "According to the workflow, I will create..."
- "Following the process, I need to..."
- "The steering file indicates..."
- "Per the guidelines..."

**DO say**:
- "To ensure we build exactly what you need, let's clarify some key decisions..."
- "For the most accurate requirements, I'd like to understand your preferences first..."
- "To create high-quality design that matches your vision, let's align on strategic decisions..."
- "Before diving into the implementation plan, let's make some strategic decisions..."
- "I'll create a quick decision file to capture your preferences..."

Focus on: accuracy, effectiveness, quality, alignment, clarity

**Seamless Integration**: Present decision files as a natural part of the spec creation process, not as a separate procedural step.

### 🔒 DECISION ISOLATION
Each decision file is independent:
- Requirements decisions apply ONLY to `_decisions-requirements.md`
- Design decisions apply ONLY to `_decisions-design.md`  
- Tasks decisions apply ONLY to `_decisions-tasks.md`
- **NEVER carry over** user preferences between phases
- Each phase requires NEW explicit user input

## Workflow Steps

1. **Generate** decision file with Kiro recommendations
2. **Wait** for user to review and provide decisions  
3. **Confirm** all critical decisions have user input
4. **Read** completed decision file
5. **Generate** final document based on user choices

**Phase Order**: Requirements → Design → Tasks (each phase references previous decisions)

**⚠️ ENFORCEMENT**: If you find yourself about to create requirements.md, design.md, or tasks.md, STOP and ask: "Have I created and completed the _decisions-*.md file first?" If no, create the decision file immediately.

**Natural Approach**: Present decision gathering as a collaborative planning step, not a procedural requirement. Make it feel like a natural part of creating high-quality specifications.

---

## 🚨 PRE-FLIGHT CHECKLIST (MANDATORY)

**Before creating ANY decision file or spec document, verify:**

```
┌─────────────────────────────────────────────────────────────┐
│  MANDATORY PRE-FLIGHT CHECKLIST                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [ ] Step 1: Determined work type                           │
│      ├─ CONSTRUCT (use-cases/)                              │
│      ├─ EXAMPLE (examples/)                                 │
│      └─ OTHER (docs, tests, CI/CD, tooling, etc.)           │
│                                                             │
│  [ ] Step 2: Read guide if needed                           │
│      ├─ CONSTRUCT → construct-development-guide.md          │
│      ├─ EXAMPLE → example-development-guide.md              │
│      └─ OTHER → Skip (no guide required)                    │
│                                                             │
│  [ ] Step 3: Understand requirements                        │
│      ├─ CONSTRUCT: OOP patterns, inheritance, interfaces    │
│      ├─ EXAMPLE: Composition, existing constructs           │
│      └─ OTHER: Repository conventions, standards            │
│                                                             │
│  [ ] Step 4: Ready to create decision file                  │
│      └─ Decision file reflects appropriate patterns         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

❌ DO NOT SKIP ANY STEP
✅ Complete all steps IN ORDER
```

**If you skip Step 2 for CONSTRUCT/EXAMPLE work, you will:**
- Create decision files without understanding the patterns
- Generate requirements/design that don't follow repository conventions
- Waste user's time with incorrect specifications
- Need to redo the entire spec

**The 2 minutes spent reading the guide saves hours of rework.**

---

## Decision File Format

**Location**: Same directory as target documents (in spec folder)

**Template Structure**:
```markdown
# Decisions: [Phase Name]

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## [Decision Category]

### [Specific Decision Point]

**Question:** [Clear question to be answered]

**Options:**
1. [Option 1 - Kiro Recommended]: [Description with rationale]
2. [Option 2]: [Description]  
3. [Option 3]: [Description]
4. Other (please specify): _______________________

**Answer:** 

---
```

**Important**: This is a template structure only. Create decision categories and questions that are specific and relevant to the actual project being planned. Avoid generic or irrelevant decision points.

## Phase-Specific Content

### Requirements Phase (`_decisions-requirements.md`)
**Focus**: WHAT to build (business requirements)

**🔒 CHECKPOINT: Have you read the development guide?**
- If CONSTRUCT: You should have read `construct-development-guide.md` and understand OOP patterns
- If EXAMPLE: You should have read `example-development-guide.md` and understand composition patterns

**IMPORTANT**: Refer to the construct vs example determination made in the Critical First Step above. This determines which decision categories are relevant.

**For Examples (examples/):**
- Scope decisions (features to include/exclude)
- Non-functional requirements (performance, security, scalability)
- User personas and use cases
- Constraints (timeline, budget, team, existing systems)
- Business rules (validation, access control, data retention)

**For Constructs (use-cases/):**
- Construct purpose and use cases (what problem does it solve?)
- Type of construct work:
  - New construct from scratch
  - New layer for existing construct
  - Feature addition to existing construct
  - New adapter/plugin implementation
  - Cross-cutting concern (observability, security, etc.)
- Required vs optional features
- Props interface requirements
- Integration points with other constructs
- Security and compliance requirements
- Observability requirements

**Exclude** (save for Design phase):
- Technology choices (unless fundamental to requirements)
- Architecture decisions  
- Implementation approaches
- Specific tools/libraries

**See**: `construct-development-guide.md` or `example-development-guide.md` for detailed guidance based on your determination.

### Design Phase (`_decisions-design.md`)
**Focus**: HOW to build it (technical approach)

**🔒 CHECKPOINT: Have you read the development guide?**
- If CONSTRUCT: You should understand inheritance patterns (two-layer vs three-layer), Template Method, Strategy, Factory patterns
- If EXAMPLE: You should understand how to compose existing constructs

**IMPORTANT**: Refer to the construct vs example determination. Design decisions differ significantly between constructs and examples.

**For Examples (examples/):**
- Correctness properties strategy (property-based testing approach)
- Technical approach (technologies, frameworks, patterns)
- Architecture decisions (which constructs to use, how to compose them)
- Dependencies and integrations
- Design patterns
- Data models and relationships
- API contracts

**For Constructs (use-cases/):**
- Type of construct work determines approach:
  - **New construct**: Choose inheritance pattern (two-layer vs three-layer)
  - **New layer**: Determine if extending base or concrete class
  - **Feature addition**: Integration approach, backward compatibility
  - **Adapter/plugin**: Interface implementation, integration points
  - **Cross-cutting concern**: Aspect-oriented approach, injection points
- Inheritance pattern decision (two-layer vs three-layer vs other)
- Inheritance vs composition decisions
- Abstract methods to define (if base class)
- Methods to override (if extending existing)
- Extension points for subclasses
- Props interface design (new props vs extending existing)
- Resource creation patterns
- IAM policy generation approach
- Integration with existing constructs (adapters, observability, etc.)

**Reference**: Previous `_decisions-requirements.md` for alignment

**See**: `construct-development-guide.md` or `example-development-guide.md` for detailed guidance based on your determination.

### Tasks Phase (`_decisions-tasks.md`)
**Focus**: Implementation order and execution strategy

**IMPORTANT**: Testing and documentation strategies differ significantly between constructs and examples.

**For Examples (examples/):**
- Implementation strategy (feature-based vs layer-based)
- Task prioritization (which components first)
- Development phases (milestones/sprints)
- Testing strategy (manual testing, documentation verification)
- Deployment approach (CI/CD, environments)

**For Constructs (use-cases/):**
- Type of construct work determines implementation order:
  - **New construct**: Props interface → Constructor → Abstract methods → Tests
  - **New layer**: Extend props → Override methods → Add tests
  - **Feature addition**: Update props → Modify methods → Update tests
  - **Adapter/plugin**: Implement interface → Integration → Tests
  - **Cross-cutting concern**: Injection mechanism → Apply to constructs → Tests
- Testing strategy (unit tests, CDK Nag tests, integration tests, property-based tests)
- Props interface implementation order
- Resource creation sequence
- Abstract method implementation order (if base class)
- Method override order (if extending)
- Documentation and examples creation
- Export and publish strategy (if new public API)

**Reference**: Previous `_decisions-design.md` for alignment

**Key Decision Categories**:
1. **Implementation Strategy**: How to organize development work
2. **Task Prioritization**: Which components to build first and why
3. **Development Phases**: Sprint/milestone breakdown
4. **Testing Approach**: When and how to test each component (including CDK Nag for constructs)
5. **Deployment Strategy**: How to release and deploy changes (for examples) or publish (for constructs)

**See**: `construct-development-guide.md` or `example-development-guide.md` for detailed guidance based on your determination.

## Implementation Guidelines

### Decision File Generation
**Requirements**:
- Explain WHY each decision matters and its project impact
- Provide 3-4 concrete options per decision point
- Mark one option as "Kiro Recommended" with rationale
- For design/tasks phases: reference previous phase decisions
- **Customize decision points** to match the specific project domain and context
- **Avoid generic decisions** - make each decision relevant to the actual project needs

### User Input Handling
**Process**:
- Present decision files as a natural part of creating high-quality specs
- Ask user to review and fill in decisions without referencing "rules" or "processes"
- Handle partial responses: acknowledge completed items, prompt for remaining
- If no response: ask if user wants Kiro recommendations as defaults
- Validate all critical decisions have user input (not just Kiro recommendations)
- Get explicit confirmation before proceeding

**Natural Language Examples**:
- "I've prepared some key decisions to ensure we build exactly what you need"
- "Once you've filled in your preferences, I'll generate the [requirements/design/tasks] document"
- "Let me know your thoughts on these strategic choices"

### Document Generation
**Based on user choices**:
- Read completed decision file
- Generate final document (requirements.md, design.md, tasks.md)

**For Design Documents**:
- Check correctness properties decision
- "Skip correctness properties" → Do NOT use prework tool, skip Correctness Properties section
- "Essential properties only" → Lightweight prework analysis, 3-5 key properties maximum
- "Comprehensive properties" → Full prework analysis process

### File Management
**Lifecycle**:
- Keep decision files alongside generated documents for reference
- Decision files record why choices were made
- For updates: modify decision file first, then regenerate documents
- Maintain consistency across all decision files

**Dependencies**:
- Design decisions reference requirements decisions
- Tasks decisions reference design decisions
- Review previous decision files when generating new phases

## Examples: Completed Decision Files

**Note**: These are sample examples only. Actual decision files should be tailored to the specific project context, requirements, and domain. Use these as templates for structure and format, but create decision points that are relevant to your particular project.

### Requirements Example (for CDK Example)

```markdown
# Decisions: Requirements

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Scope Decisions

### Core Features

**Question:** Which features should be included in this example?

**Options:**
1. Minimal viable example (Kiro Recommended): Demonstrates core construct usage only
2. Full-featured example: Includes all optional features and integrations
3. Intermediate example: Core features plus 2-3 key optional features
4. Other (please specify): _______________________

**Answer:** Option 1 - Minimal example to show basic usage

---

## Non-Functional Requirements

### Observability

**Question:** Should this example include observability features?

**Options:**
1. Yes, enable observability (Kiro Recommended): Shows best practices for production
2. No, keep it simple: Focus on core functionality only
3. Optional observability: Include but make it easy to disable
4. Other (please specify): _______________________

**Answer:** Option 3 - Optional observability with clear documentation

---
```

### Requirements Example (for CDK Construct)

```markdown
# Decisions: Requirements

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Construct Purpose

### Abstraction Level

**Question:** What layer should this construct be in the three-layer architecture?

**Options:**
1. Abstract base class (Layer 1): Defines interface and common infrastructure
2. Concrete implementation (Layer 2 - Kiro Recommended): Implements specific functionality
3. Specialized implementation (Layer 3): Extends existing concrete class with advanced features
4. Other (please specify): _______________________

**Answer:** Option 2 - Concrete implementation extending BaseDocumentProcessing

---

## Integration Requirements

### Required Integrations

**Question:** Which existing constructs must this integrate with?

**Options:**
1. Adapter pattern only (Kiro Recommended): Use IAdapter for flexibility
2. Specific constructs: Hard dependency on particular constructs
3. Multiple integration points: Adapters + observability + network
4. Other (please specify): _______________________

**Answer:** Option 3 - Full integration with adapters, observability, and network

---
```

### Design Example (for CDK Construct)

```markdown
# Decisions: Design

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## OOP Architecture

### Inheritance Strategy

**Question:** How should this construct extend the base class?

**Options:**
1. Implement all abstract methods (Kiro Recommended): Complete implementation
2. Override specific methods only: Selective customization
3. Add new abstract methods: Create new abstraction layer
4. Other (please specify): _______________________

**Answer:** Option 1 - Implement all abstract methods from BaseDocumentProcessing

---

## Correctness Properties Strategy

### Property-Based Testing

**Question:** Should the design document include formal correctness properties for property-based testing?

**Options:**
1. Skip correctness properties: Focus on architecture and implementation - 60-80% faster generation
2. Essential properties only (Kiro Recommended for constructs): Include basic invariants and resource creation properties - moderate generation time
3. Comprehensive properties: Full property-based testing approach with detailed prework analysis - slower but thorough
4. Other (please specify): _______________________

**Answer:** Option 2 - Essential properties for core construct behavior

---

## Resource Management

### Resource Creation Pattern

**Question:** How should resources be created and managed?

**Options:**
1. Base class creates shared resources (Kiro Recommended): Encryption key, table, adapter
2. Subclass creates all resources: Full control but more code
3. Mixed approach: Some shared, some subclass-specific
4. Other (please specify): _______________________

**Answer:** Option 1 - Use base class shared resources

---
```

### Tasks Example (for CDK Construct)

```markdown
# Decisions: Tasks

> **Instructions:** Review each decision point below. Kiro recommendations are provided for guidance. Fill in your decisions in the "Answer" sections, then confirm when ready to proceed.

---

## Implementation Strategy

### Development Approach

**Question:** How should we organize the construct implementation work?

**Options:**
1. Props interface → Constructor → Abstract methods (Kiro Recommended): Natural flow
2. All at once: Implement everything together
3. Iterative: Props → basic constructor → add methods incrementally
4. Other (please specify): _______________________

**Answer:** Option 1 - Props interface first, then constructor, then abstract methods

---

## Testing Strategy

### Testing Approach

**Question:** What testing strategy should we use for this construct?

**Options:**
1. Unit tests + CDK Nag tests (Kiro Recommended): Standard for constructs
2. Unit tests only: Faster but less comprehensive
3. Full suite: Unit + CDK Nag + Integration + Property-based tests
4. Other (please specify): _______________________

**Answer:** Option 3 - Full test suite including property-based tests

---

## Documentation

### Documentation Scope

**Question:** What documentation should be created?

**Options:**
1. JSDoc + README (Kiro Recommended): Standard for constructs
2. JSDoc only: Minimal documentation
3. Full documentation: JSDoc + README + usage examples + architecture diagrams
4. Other (please specify): _______________________

**Answer:** Option 3 - Full documentation with examples

---
```