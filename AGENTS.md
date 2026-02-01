# AGENTS.md

## Project context
- App: FitnessAI
- Stack: Next.js (app router), TypeScript, Tailwind, Shadcn UI
- Data: Firestore hooks in `src/lib/firestore.service`
- Brand guidelines: `docs/brand-guidelines.md` (tokens in `src/app/globals.css`)

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
- Don’t reformat or change copy unless asked.
- Avoid new deps; use existing UI primitives first.
- Keep mobile layouts in mind (`grid` and responsive cols).
