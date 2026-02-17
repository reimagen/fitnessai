# Concerns Archive

**Purpose:** historical record of resolved concerns moved out of `CONCERNS.md` so the main concerns file stays focused on active execution.

**Last Updated:** 2026-02-17

## Usage Rules

- Keep `CONCERNS.md` as the active queue (`OPEN`, `IN_PROGRESS`, `NEXT`).
- Move detailed resolved concerns here once they are no longer needed in the active queue.
- Keep a one-line pointer in `CONCERNS.md` for recently resolved items when useful.
- Each archived entry should include:
  - original concern title
  - resolution date
  - summary of what was delivered
  - verification performed
  - links to supporting docs (`docs/changelog.md` and relevant `.planning/codebase` docs)

## Entry Template

### [Concern Title]
- Original location: `CONCERNS.md` priority item #[N] or section name
- Status: `RESOLVED` | `PARTIAL RESOLUTION`
- Resolution date: YYYY-MM-DD
- Resolution summary:
  - [short bullet]
  - [short bullet]
- Verification:
  - `[command]`
  - `[command]`
- Related docs:
  - `docs/changelog.md`
  - `.planning/codebase/[doc].md`

## Archived Concerns

### Performance baseline + instrumentation gate (Item 2)
- Original location: `CONCERNS.md` priority item #2
- Status: `RESOLVED`
- Resolution date: 2026-02-17
- Resolution summary:
  - finalized before/after comparison for delivered scope (items 4-6) in `docs/performance-baseline.md`
  - documented accepted outcomes and read-footprint instrumentation evidence for gate closure
- Verification:
  - `docs/performance-baseline.md` comparison table review
  - instrumentation evidence review (`PERF_BASELINE_LOGS`)
- Related docs:
  - `docs/changelog.md`
  - `docs/performance-baseline.md`

### Exercise naming + unilateral load semantics normalization (Item 3)
- Original location: `CONCERNS.md` priority item #3
- Status: `RESOLVED`
- Resolution date: 2026-02-17
- Resolution summary:
  - completed Firebase-backed unilateral audit and decision table
  - implemented per-limb hint behavior in History and PR flows
- Verification:
  - `npm run typecheck`
  - manual `/history` and `/prs` validation
- Related docs:
  - `docs/changelog.md`
  - `docs/unilateral-load-semantics-review.md`

### Firestore analysis read-path optimization (Item 4)
- Original location: `CONCERNS.md` priority item #4
- Status: `RESOLVED`
- Resolution date: 2026-02-17
- Resolution summary:
  - removed duplicate analysis page read paths for short-range views
  - parallelized independent analysis write side effects to reduce tail latency
- Verification:
  - `npm run test -- src/app/analysis/actions.test.ts`
  - `npm run typecheck`
- Related docs:
  - `docs/changelog.md`
  - `docs/performance-baseline.md`

### Client chart compute/windowing optimization (Item 5)
- Original location: `CONCERNS.md` priority item #5
- Status: `RESOLVED`
- Resolution date: 2026-02-17
- Resolution summary:
  - optimized weekly/monthly/yearly/all-time chart aggregation paths in `useChartData`
  - recorded representative chart-switch improvement in baseline runbook
- Verification:
  - `npm run typecheck`
  - manual Analysis time-range validation
- Related docs:
  - `docs/changelog.md`
  - `docs/performance-baseline.md`

### Exercise registry migration hardening (Item 6)
- Original location: `CONCERNS.md` priority item #6
- Status: `RESOLVED`
- Resolution date: 2026-02-17
- Resolution summary:
  - completed phased registry hardening with Firebase runtime authority and no silent static fallback
  - promoted `loadSemantics` into exercise metadata and backfilled dev/prod (`pending updates: 0`)
- Verification:
  - `npm run test -- src/lib/logging/health-check.test.ts src/lib/exercise-registry.test.ts src/lib/exercise-load-semantics.test.ts`
  - `npm run typecheck`
- Related docs:
  - `docs/changelog.md`
  - `docs/unilateral-load-semantics-review.md`
  - `docs/performance-baseline.md`

### Large component re-render profiling + targeted remediation (Item 7)
- Original location: `CONCERNS.md` priority item #7
- Status: `RESOLVED`
- Resolution date: 2026-02-17
- Resolution summary:
  - reduced `WorkoutLogForm` render-subscription churn by replacing per-row `form.watch()` usage with array-scoped `useWatch`
  - reduced `WeeklyCardioTargetsCard` recompute churn by memoizing auto-target display and gating compute to auto mode
  - accepted current performance as non-blocking for this phase; deferred speculative `StrengthBalanceCard` refactors pending future evidence
- Deferred by design (to avoid over-engineering):
  - did not pursue broad memo-boundary/prop-stability subtree refactors without clear profiler-proven user-impact
  - treat future work as evidence-gated: only reopen if apples-to-apples profiling or user-reported latency shows a concrete regression
- Verification:
  - `npm run typecheck`
  - `npm run test -- src/lib/exercise-load-semantics.test.ts src/lib/logging/health-check.test.ts`
  - React Profiler sanity capture (`WorkoutLogForm: 31.4ms`, `StrengthBalanceCard: 6.1ms`, `WeeklyCardioTargetsCard: 6.4ms`)
- Related docs:
  - `docs/changelog.md`
  - `docs/performance-baseline.md`

### Imbalance Component Step 1 + Step 2
- Original location: `CONCERNS.md` priority item #1
- Status: `RESOLVED`
- Resolution date: see `docs/changelog.md`
- Resolution summary:
  - extracted shared 6-week aggregation logic
  - fixed unit-label issue
- Verification:
  - `src/analysis/six-week-lift-metrics.test.ts` added
  - `npm run typecheck`
- Related docs:
  - `docs/changelog.md`
  - `.planning/codebase/imbalance-config.md`

### Imbalance Component Step 3 + StrengthBalanceCard Refactor Phase 4
- Original location: `CONCERNS.md` priority item #2
- Status: `RESOLVED`
- Resolution date: see `docs/changelog.md`
- Resolution summary:
  - extracted strength-balance utilities/tests/hook/card and rewired orchestrator
  - removed dead `Level Imbalance` contract paths and duplicate recommendation prefixing
- Verification:
  - `npm run typecheck`
  - `npm run test:ci -- src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts src/app/analysis/actions.test.ts`
  - `npm run test:ci -- src/hooks/use-strength-balance-data.test.tsx src/components/analysis/strength-balance-finding-card.test.tsx src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts`
- Related docs:
  - `docs/changelog.md`
  - `.planning/codebase/imbalance-config.md`
  - `.planning/codebase/balance-card-refactor.md`

### Phase 2 Server Action Tests (targeted subset)
- Original location: `CONCERNS.md` priority item #3
- Status: `PARTIAL RESOLUTION`
- Resolution date: see `docs/changelog.md`
- Resolution summary:
  - added deterministic tests for `analysis` and `profile` server actions
  - targeted subset later superseded by full Phase 2 closure in archived item #6
- Verification:
  - `npm run test -- src/app/analysis/actions.test.ts`
  - `npm run test -- src/app/profile/actions.test.ts`
  - `npm run typecheck`
- Related docs:
  - `docs/changelog.md`
  - `.planning/codebase/testing-upgrades.md`

### Imbalance Component Steps 4-5 after Step 3
- Original location: `CONCERNS.md` priority item #4
- Status: `RESOLVED`
- Resolution date: 2026-02-14
- Resolution summary:
  - added Firestore-backed imbalance config loader with validation and safe fallback
  - added ID-based matcher and rewired strength-balance flow to consume loaded config
  - added health-check signal and focused tests
- Verification:
  - `npm run test -- src/lib/imbalance-config.server.test.ts`
  - `npm run test -- src/analysis/imbalance-matcher.test.ts`
  - `npm run test -- src/analysis/strength-balance.utils.test.ts`
  - `npm run test -- src/app/analysis/actions.test.ts`
  - `npm run test -- src/lib/logging/health-check.test.ts`
  - `npm run typecheck`
  - `npm run test:ci`
- Related docs:
  - `docs/changelog.md`
  - `.planning/codebase/imbalance-config.md`

### Imbalance Config Operational Sync (Firestore data vs active exercise library)
- Original location: `CONCERNS.md` priority item #5
- Status: `RESOLVED`
- Resolution date: 2026-02-15
- Resolution summary:
  - created/populated `config/imbalanceConfig` with canonical active pair IDs and validated zero mismatches
  - hardened warning behavior and config-fetch staleness handling
  - fixed Strength Balance to use dedicated 6-week data source
- Verification:
  - direct Firestore verification (`activePairs=4`, `validationIssueCount=0`)
  - `GET /api/health` reports `checks.imbalanceConfig = "ok"` after cache refresh/invalidation
  - `npm run test -- src/hooks/use-strength-balance-data.test.tsx`
  - `npm run typecheck`
- Related docs:
  - `docs/changelog.md`
  - `.planning/codebase/imbalance-config.md`

### Phase 2 Server Action Tests (remaining to complete full suite)
- Original location: `CONCERNS.md` priority item #6
- Status: `RESOLVED`
- Resolution date: 2026-02-15
- Resolution summary:
  - added `src/app/prs/actions.test.ts` and `src/app/plan/actions.test.ts`
  - expanded `src/app/history/actions.test.ts` to planned Phase 2 depth
  - achieved deterministic branch coverage across target action files
- Verification:
  - `npm run test -- src/app/prs/actions.test.ts`
  - `npm run test -- src/app/plan/actions.test.ts`
  - `npm run test -- src/app/history/actions.test.ts`
  - `npm run typecheck`
  - `npm run lint`
- Related docs:
  - `docs/changelog.md`
  - `.planning/codebase/testing-upgrades.md`

### Phase 3 Firestore data-layer tests
- Original location: `CONCERNS.md` priority item #7
- Status: `RESOLVED`
- Resolution date: 2026-02-15
- Resolution summary:
  - expanded `src/lib/firestore-server.test.ts` to 62 deterministic tests
  - covered converters, query branches, serialization paths, backfill/fallback, and counter behavior
  - added side-effect coverage for PR strength-level recalculation and weekly-plan truncation
- Verification:
  - `npm run test -- src/lib/firestore-server.test.ts`
  - `npm run typecheck`
  - `npm run lint`
- Related docs:
  - `docs/changelog.md`
  - `.planning/codebase/testing-upgrades.md`

### Phase 4 Integration Test Rollout
- Original location: `CONCERNS.md` priority item #8
- Status: `RESOLVED`
- Resolution date: 2026-02-15
- Resolution summary:
  - added integration suite at `src/test/integration/cross-feature.integration.test.ts` with 24 tests
  - covered cross-boundary consistency, usage-counter side effects, recovery paths, and focused validation failures
  - confirmed non-blocking local Gemini key warning behavior in CI context
- Verification:
  - `npm run test -- src/test/integration/cross-feature.integration.test.ts`
  - `npm run test:ci`
  - `npm run typecheck`
  - `npm run lint`
- Related docs:
  - `docs/changelog.md`
  - `.planning/codebase/testing-upgrades.md`
