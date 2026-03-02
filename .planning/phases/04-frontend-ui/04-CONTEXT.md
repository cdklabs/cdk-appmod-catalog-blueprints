# Phase 4: Frontend UI - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a split-panel React application with chat interface, live schema updates, data preview, and export buttons. The app connects to the existing InteractiveAgent backend (Cognito auth, SSE streaming) and deploys via the Frontend construct (S3 + CloudFront).

</domain>

<decisions>
## Implementation Decisions

### Panel Layout
- Fixed dividers (not draggable) — sidebar 240px, chat 50%, right panels 50%
- Right-side panels split 40/60 (Schema top smaller, Preview bottom larger)
- Desktop: all panels visible simultaneously
- Mobile: bottom tab navigation (Chat | Schema | Preview) — one panel visible at a time
- Mobile sidebar: hamburger menu, slides in from left

### Component & Styling
- Tailwind CSS for styling with dark theme
- shadcn/ui component library (copy-paste components, fully customizable)
- Vite as build tool (fast dev server, optimized production builds)
- Lucide React for icons (default for shadcn/ui)
- Dark theme colors via CSS variables (easy to change later):
  - Background: slate-900, Sidebar: slate-950, Surface: slate-800
  - Primary: blue-500, Accent: amber-500
  - Text: slate-100, Muted: slate-400
  - All defined in `index.css` as HSL values — edit one file to change entire theme

### Data Tables
- @tanstack/react-table for Schema and Preview panels
- No virtualization — 100 rows renders fine without optimization
- Sortable columns — click header to sort ascending/descending
- Horizontal scroll for tables with many columns

### SSE Streaming
- React Context + useReducer for state management
- Loading states: typing indicator in chat bubble AND skeleton loaders in panels
- Connection errors: auto-reconnect + retry silently

### Claude's Discretion
- Panel update strategy (live as data arrives vs update on complete)
- Exact skeleton loader designs
- Auto-reconnect retry logic (exponential backoff, max retries)
- Toast notification styling for errors

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Frontend` construct (`use-cases/webapp/frontend-construct.ts`): Handles S3 + CloudFront deployment with Docker-based bundling
- InteractiveAgent already configured with Cognito auth and SSE streaming endpoint

### Established Patterns
- Frontend construct expects `sourceDirectory` pointing to React app root
- Build command defaults to `npm run build`, output to `build/` directory
- SPA-friendly error responses (404/403 → index.html) built into construct

### Integration Points
- React app will live in `examples/agentic-dataset-generator/frontend/`
- CDK stack imports Frontend construct and points to frontend directory
- API endpoint URL and Cognito config injected via environment variables at build time

</code_context>

<specifics>
## Specific Ideas

- After discuss-phase: sketch screens in Pencil.dev before planning
- Tab navigation on mobile should feel like standard chat apps
- Tables should be clean and readable — not cluttered with too many features

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-frontend-ui*
*Context gathered: 2026-03-06*
