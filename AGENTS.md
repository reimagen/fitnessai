# AGENTS.md

- ⚠️ NEVER hardcode API keys in documentation or code - use environment variables only

## Project context
- App: FitnessAI
- Stack: Next.js (app router), TypeScript, Tailwind, Shadcn UI
- Data: Firestore hooks in `src/lib/firestore.service`
- Necessary docs: `.planning/codebase` and `docs`
- Change log: `docs/changelog.md`
- Brand guidelines: `docs/brand-guidelines.md` (tokens in `src/app/globals.css`)
- Ops runbook: `docs/ops-runbook.md`
- Observability: Cloud Logging + client error reporting (`/api/client-errors`) + health check (`/api/health`)
- Dev-only error simulation: `/api/dev/error-sim`

## UI patterns (from analysis page)
- Use `container mx-auto px-4 py-8` page shells and `shadow-lg` cards.
- Card headers: `CardTitle` with `font-headline`, icon + title, `text-xl` when used in cards.
- Status states: loader card with centered spinner; error state via `ErrorState` component.
- Headings: `text-3xl font-bold text-primary` for page titles; `text-muted-foreground` for subtitle.
 - Rounding: cards `rounded-2xl`, buttons `rounded-xl`, inputs/selects/textareas `rounded-xl`, tabs rounded, badges pill-shaped.

## Component structure
- Keep data fetching and derived data in the page component.
- Use small, focused card components for analysis sections.
- Prefer `useMemo` for expensive derived lists (e.g., filtered exercises).

## Styling rules
- Prefer theme tokens (`text-primary`, `text-muted-foreground`, `bg-card`, `text-accent`).
- Avoid hardcoded colors unless matching theme tokens.
- Typography: labels/help text `text-sm`, stats `text-3xl font-bold`.

## Workflow

### Primary work driver
- **`.planning/codebase/CONCERNS.md` is the single work queue.** All implementation work should trace back to a concern or priority item in that file.
- Follow the **Priority Order** section in CONCERNS.md—it defines execution sequence and dependencies.
- Before starting work, read CONCERNS.md to identify the next actionable item.

### Closeout protocol (required for every completed work item)
1. **Update CONCERNS.md**: set status to `RESOLVED` (or `PARTIAL RESOLUTION` with remaining risk noted) and add a resolution summary.
   - When editing CONCERNS.md, always update both:
     - `## Priority Order (Execution + Dependencies)` (top-level sequencing/status)
     - the corresponding detailed concern section (status, scope, verification)
   - Do both updates in the same change so Priority Order and detail sections never drift.
2. **Add changelog entry**: dated entry in `docs/changelog.md` with area, summary, files changed, and verification performed.
3. **Update adjacent docs**: if architecture, testing, or workflow changed, update the relevant `.planning/codebase` docs (e.g., `TESTING.md`, `STRUCTURE.md`, `ARCHITECTURE.md`) in the same workstream.

### General rules
- Don't reformat or change copy unless asked.
- Avoid new deps; use existing UI primitives first.
- Keep mobile layouts in mind (`grid` and responsive cols).
- **Plan approval gate**: before running implementation commands or editing files, propose the plan and wait for explicit user approval in chat.
