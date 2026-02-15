# Codebase Concerns

**Analysis Date:** 2026-02-14

## Concern Lifecycle

- Status values:
  - `OPEN`: identified concern with no active implementation.
  - `IN_PROGRESS`: currently being implemented.
  - `RESOLVED`: implemented and verified.
- Closeout protocol (required when resolving a concern):
  1. Update concern status and resolution note in this document.
  2. Add a dated entry in `docs/changelog.md` with files changed and verification performed.
  3. If architecture/workflow changed, update relevant docs in `.planning/codebase` (for example `TESTING.md`, `testing-upgrades.md`, `STRUCTURE.md`, `ARCHITECTURE.md`).

## Priority Order (Execution + Dependencies)

1. **✅ RESOLVED: Imbalance Component Step 1 + Step 2** (`.planning/codebase/imbalance-config.md`)
- Scope completed: shared 6-week aggregation extraction + immediate unit-label fix.
- Verification: `src/analysis/six-week-lift-metrics.test.ts` added; typecheck clean.

2. **✅ RESOLVED: Imbalance Component Step 3 + StrengthBalanceCard Refactor Phase 4** (`.planning/codebase/imbalance-config.md` + `.planning/codebase/balance-card-refactor.md`)
- Scope completed: extracted strength-balance utils/tests + hook + presentational card + orchestrator rewire. Phase 4 cleanup completed by removing dead `Level Imbalance` contract paths and recommendation prefix duplication in AI flow output composition.
- Verification: `npm run typecheck`, `npm run test:ci -- src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts src/app/analysis/actions.test.ts`, `npm run test:ci -- src/hooks/use-strength-balance-data.test.tsx src/components/analysis/strength-balance-finding-card.test.tsx src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts`.

3. **✅ PARTIAL RESOLUTION: Phase 2 Server Action Tests (targeted subset)** (`.planning/codebase/testing-upgrades.md`)
- Scope: deterministic tests for `src/app/analysis/actions.ts` and `src/app/profile/actions.ts` (~35-42 tests).
- Status: Targeted subset completed and green; full Phase 2 closure delivered under item 6.
- Dependency notes: Highest-value guardrails for Step 4 Firestore config paths are now in place.
- Risk: Refactoring server actions is unsafe without regression coverage.
- Priority: HIGH - these actions orchestrate imbalance analysis.
- Detailed scope:
  - Server action tests (PARTIAL RESOLUTION - Phase 2 subset complete)
  - What's covered: analysis/profile action validation, auth gating, rate-limit branches, success/error flows, Firestore call orchestration.
  - Remaining from full Phase 2 (historical): closed by item 6.
  - AI flow validation: covered as part of action mocking, with Zod output schema verification.
  - Verification: `npm run test -- src/app/analysis/actions.test.ts`, `npm run test -- src/app/profile/actions.test.ts`, `npm run test:ci` (317 passing at this checkpoint; superseded by later full-suite expansions), `npm run typecheck`.

4. **✅ RESOLVED: Imbalance Component Steps 4-5 after Step 3** (`.planning/codebase/imbalance-config.md`)
- Scope: Firestore `imbalanceConfig` loader (Step 4) + ID-based matching engine consuming shared metrics map (Step 5).
- Status: `RESOLVED` (2026-02-14)
- Dependency notes: Landed after Step 3 and targeted Phase 2 subset coverage.
- Resolution summary:
  - Added Firestore-backed config loader + schema validation with safe fallback.
  - Added dedicated ID-based matcher using exercise ID lookup map.
  - Rewired strength-balance flow (`actions`/hook/page/card/utils) to consume loader output.
  - Added health-check signal for imbalance-config source/validation quality.
  - Added focused tests for loader, matcher, and action wiring.
- Verification: `npm run test -- src/lib/imbalance-config.server.test.ts`, `npm run test -- src/analysis/imbalance-matcher.test.ts`, `npm run test -- src/analysis/strength-balance.utils.test.ts`, `npm run test -- src/app/analysis/actions.test.ts`, `npm run test -- src/lib/logging/health-check.test.ts`, `npm run typecheck`, `npm run test:ci`.

5. **✅ RESOLVED: Imbalance Config Operational Sync (Firestore data vs active exercise library)** (`.planning/codebase/imbalance-config.md`)
- Scope: resolve the active mismatch causing degraded/fallback warning states in Strength Balance (canonical pair IDs not fully aligned to active exercises).
- Status: `RESOLVED` (2026-02-15)
- Why this is separate from Steps 4-5: code path is complete, but config data population/repair is still required.
- Resolution summary:
  - Created missing Firestore `config/imbalanceConfig` document in production.
  - Populated 4 active pairs with canonical IDs:
    - Horizontal Push vs. Pull: `machine-chest-press` ↔ `machine-seated-row`
    - Vertical Push vs. Pull: `machine-shoulder-press` ↔ `machine-lat-pulldown`
    - Hamstring vs. Quad: `machine-leg-curl` ↔ `machine-leg-extension`
    - Adductor vs. Abductor: `machine-adductor` ↔ `machine-abductor`
  - Verified all pair IDs exist in active exercise set; zero validation mismatches.
  - Follow-up hardening (2026-02-15): warning banner now only reflects active runtime config degradation (Firestore fallback or loader validation issues), and static fallback validation is skipped when Firestore config is healthy.
  - Follow-up hardening (2026-02-15): imbalance config fetch now avoids indefinitely stale degraded state by (a) finite client query staleness and (b) uncached server retry when cached config is missing/invalid.
  - Follow-up fix (2026-02-15): Strength Balance data source is now correctly pinned to the dedicated 6-week workout dataset (independent of page time-range selector), matching card semantics and preventing false "No Data" for older-in-window lifts.
- Target outcome:
  - Firestore `config/imbalanceConfig` uses valid active canonical IDs for all intended pairs
  - no unresolved loader validation issues
  - analysis warning banner only appears for true degraded incidents
  - `/api/health` shows `imbalanceConfig: ok` in steady state
- Verification:
  - direct Firestore verification: `activePairs=4`, `validationIssueCount=0`
  - manual: analysis page warning clears after cache refresh window/invalidation
  - `GET /api/health` should report `checks.imbalanceConfig = "ok"` after cache refresh/invalidation
  - `npm run test -- src/hooks/use-strength-balance-data.test.tsx`
  - `npm run typecheck`
  - manual UI verification: horizontal push/pull finding can resolve from in-window logs even when selected page range is narrower than 6 weeks

6. **✅ RESOLVED: Phase 2 Server Action Tests (remaining to complete full suite)** (`.planning/codebase/testing-upgrades.md`)
- Scope: Complete remaining Phase 2 work to close gaps:
  - add `src/app/prs/actions.test.ts`
  - add `src/app/plan/actions.test.ts`
  - expand `src/app/history/actions.test.ts` to planned Phase 2 coverage depth
- Status: `RESOLVED` (2026-02-15)
- Resolution summary:
  - Added `src/app/prs/actions.test.ts` (17 tests).
  - Added `src/app/plan/actions.test.ts` (14 tests).
  - Expanded `src/app/history/actions.test.ts` from 6 to 19 tests with parse/rate-limit/classified-error + CRUD negative side-effect coverage.
  - Phase 2 action suite now covers all target action files (`analysis`, `profile`, `prs`, `plan`, `history`) with deterministic branch coverage.
- Verification: `npm run test -- src/app/prs/actions.test.ts`, `npm run test -- src/app/plan/actions.test.ts`, `npm run test -- src/app/history/actions.test.ts`, `npm run test:ci` (317 passing at this checkpoint; superseded by later full-suite expansions), `npm run typecheck`, `npm run lint`.

7. **✅ RESOLVED: Phase 3 Firestore data-layer tests** (`.planning/codebase/testing-upgrades.md`)
- Scope: converter/query reliability tests.
- Dependency notes: should run in same window as, or immediately after, Step 3/4 Firestore config migration.
- Revision trigger: after completing Phase 2 server-action tests, revise Phase 3 scope/estimates using newly added fixtures/mocks and any findings from Step 3/4 rollout.
- Status: `RESOLVED` (2026-02-15)
- Resolution summary:
  - Added and expanded `src/lib/firestore-server.test.ts` to 62 deterministic tests.
  - Covered converter reliability, query branch semantics, save/delete serialization, backfill/fallback flows, and counter branch behavior.
  - Added explicit side-effect coverage for PR strength-level recalculation (`addPersonalRecords`, `updatePersonalRecord`, `updateUserProfile`) and weekly-plan context truncation.
- Detailed testing scope:
  - Firebase operations tests (COMPLETED - Phase 3)
  - Completed size: 62 tests (within planned 60-75 band) covering converters and high-risk query functions
  - Risk: Data corruption or loss may go unnoticed until production.
  - Priority: HIGH - Data layer is critical.
  - Target: Phase 3 implementation (closed)
  - Verification: `npm run test -- src/lib/firestore-server.test.ts` (62 passing), `npm run test:ci` (379 passing at this checkpoint; superseded by later full-suite expansions), `npm run typecheck`, `npm run lint`

8. **✅ RESOLVED: Phase 4 integration test rollout** (`.planning/codebase/testing-upgrades.md`)
- Scope: cross-feature integration test rollout as defined in `testing-upgrades.md` (Phase 4).
- Dependency notes: execute after critical correctness + reliability milestones above.
- Status: `RESOLVED` (2026-02-15)
- Resolution summary:
  - Added dedicated integration suite at `src/test/integration/cross-feature.integration.test.ts` with 24 deterministic cross-feature tests.
  - Covered cross-boundary write/read consistency, usage-counter side effects, persistence-failure recovery, and focused validation failure paths.
  - Confirmed existing infrastructure warning output (missing local Gemini API key) is non-blocking for CI because workflows fail on non-zero exit code, not stderr text.
- Detailed testing scope:
  - Cross-feature integration baseline completed for production-readiness gate (risk-focused minimum).
  - Broader UI integration categories (error boundaries and extended form UX cases) remain optional backlog unless promoted.
  - Verification: `npm run test -- src/test/integration/cross-feature.integration.test.ts` (24 passing), `npm run test:ci` (403 passing), `npm run typecheck`, `npm run lint`.

9. **Post-Phase performance/scaling track** **(NEXT)**
- Scope: broader performance/scaling concerns after critical correctness/reliability phases complete.
- Dependency notes: execute after Phase 4 integration baseline is stable.

Note: sections below (`Tech Debt`, `Performance Bottlenecks`, `Fragile Areas`, `Scaling Limits`, `Dependencies at Risk`, `Missing Critical Features`) are tracked risks and context, not sequenced work items.

## Risk Register Handling (Lines 116+)

- Purpose: backlog/risk inventory, not the execution queue.
- Execution rule: do **not** pull work directly from these sections without first promoting it into `## Priority Order (Execution + Dependencies)`.
- Promotion criteria:
  - current user impact is meaningful, or
  - it blocks an active priority item, or
  - risk likelihood/severity increased.
- When promoting an item:
  1. Add it to `## Priority Order` with dependency placement and status.
  2. Keep a short concern detail in its original section for context.
  3. Update `docs/changelog.md` when resolved.

## Tech Debt

### Exercise Registry Migration Incomplete
- Issue: 10 TODOs in `src/lib/exercise-registry.ts` indicate the module is an incomplete abstraction layer for migrating from hardcoded exercise data to Firebase. All functions still return static data from `src/lib/exercise-data.ts` (316 lines of hardcoded strength standards, cardio exercises, and aliases). Functions like `getStrengthStandards()`, `getCardioExercises()`, `getStrengthRatios()` need Firebase collection fetches implemented.
- Files: `src/lib/exercise-registry.ts`, `src/lib/exercise-data.ts`
- Impact: Makes it impossible to update exercise standards, add new exercises, or modify aliases without code changes and redeploy. Users cannot benefit from dynamic exercise library updates. Scalability is severely limited.
- Fix approach: Implement Firebase collection/query calls in each TODO function. Create a caching layer using Next.js `unstable_cache` (pattern already used in `src/lib/exercise-registry.server.ts` for activeExercises). Consider separating read-only queries from writes.

### Dual Data Sources for Strength Standards
- Issue: Strength standards exist in two places with potential for sync issues: hardcoded in `src/lib/exercise-data.ts` (used by exercise-registry) and in Firebase exercises collection (used by components like `StrengthBalanceCard` via `ExerciseDocument` type). The `ExerciseDocument` type in `src/lib/exercise-types.ts` defines `strengthStandards` field but the data flow between these sources is unclear.
- Files: `src/lib/exercise-data.ts`, `src/lib/exercise-registry.ts`, `src/lib/exercise-types.ts`, `src/components/analysis/StrengthBalanceCard.tsx`
- Impact: Risk of displaying outdated strength standards to users. Analysis results may vary depending on which source is queried. Confusing developer experience.
- Fix approach: Complete the exercise-registry migration (above) to make Firebase the single source of truth. Remove hardcoded data entirely. Update all components to fetch from Firebase.

## Performance Bottlenecks

### Large Component Files May Cause Re-renders
- Problem: `WorkoutLogForm.tsx` (546 lines), `StrengthBalanceCard.tsx` (427 lines), `WeeklyCardioTargetsCard.tsx` (421 lines) are complex components with many useMemo hooks. While memoization is used, the components still process large arrays and perform computations on every render. No React.memo wrapping on some sub-components.
- Files: `src/components/history/WorkoutLogForm.tsx`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/components/profile/WeeklyCardioTargetsCard.tsx`
- Cause: Components accept multiple props that change frequently (exercises, workoutLogs, userProfile). useMemo dependencies may be too loose.
- Improvement path: (1) Profile components with React DevTools to measure render times. (2) Wrap expensive child components with React.memo. (3) Consider splitting large components into smaller, independently-memoized ones. (4) Use lazy loading for chart components.

### Firestore Queries Not Optimized
- Problem: `src/lib/firestore-server.ts` runs separate queries for workoutLogs and personalRecords. When fetching analysis data, system may make N+1 queries (one for user profile, separate for each record type). No query batching or compound index optimization.
- Files: `src/lib/firestore-server.ts` lines 238-250 (getWorkoutLogs with date filters), lines 373-400 (getPersonalRecords)
- Cause: Firestore documents are fetched individually with converters applied to each, and withConverter is called on collection refs repeatedly.
- Improvement path: (1) Batch read related documents using `Promise.all`. (2) Create a compound query that fetches both workoutLogs and personalRecords in one request where possible. (3) Implement read-through caching with Redis for frequently accessed user profiles. (4) Add Firestore indexes for common query patterns (date ranges, exercise names).

### Chart Data Processing Happens Client-Side
- Problem: `src/hooks/useChartData.ts` (329 lines) processes raw workout logs into chart format entirely on the client. If user has 500+ workouts, this creates useMemo computation on every render.
- Files: `src/hooks/useChartData.ts` (329 lines), `src/hooks/useLiftProgression.ts` (174 lines), `src/hooks/useCardioAnalysis.ts` (333 lines)
- Cause: No server-side aggregation. Charts fetch full history even when showing summary view.
- Improvement path: (1) Move chart data preparation to server action (server/analyze-chart-data.ts). (2) Cache processed chart data in Firestore or Redis with TTL. (3) Implement pagination/time-window filtering (e.g., "last 3 months" vs "all time"). (4) Use tRPC or GraphQL for parameterized queries instead of fetching all data.

## Fragile Areas

### Exercise Library Type Mismatches
- Files: `src/lib/exercise-types.ts` (ExerciseDocument), `src/lib/types.ts` (Exercise), `src/components/history/WorkoutLogForm.tsx` (uses both)
- Why fragile: Two separate Exercise types exist (Exercise for logged data, ExerciseDocument for library). Converters between them are done manually in multiple places. If ExerciseDocument structure changes in Firebase, components using `exercise.strengthStandards` will break without TypeScript catching it until runtime.
- Safe modification: (1) Create a shared type definition that both types implement or extend. (2) Add Zod schema validation for ExerciseDocument at Firebase fetch time. (3) Create a type guard function `isExerciseWithStandards()` used before accessing strengthStandards field.
- Test coverage: No validation that ExerciseDocument structure matches type definition when fetched from Firebase.

### Resolved Imbalance Workstream (History)
- Resolved imbalance implementation history is maintained in:
  - `## Priority Order (Execution + Dependencies)` above
  - `.planning/codebase/imbalance-config.md`
  - `.planning/codebase/balance-card-refactor.md`
  - `docs/changelog.md`

### Error Classification Hardcoded Rules
- Files: `src/lib/logging/error-classifier.ts` (classifyAIError function with hardcoded error message patterns)
- Why fragile: The classifier looks for keywords like "quota", "overload", "rate limit" in error messages from Gemini API. If Google changes error messages, classification breaks silently, all errors become "unknown" category.
- Priority: `DEFERRED` (non-blocking for current Phase 2 execution).
- Defer rationale: unit coverage is already strong and unknown-error fallback is in place; live Gemini error-shape testing is operational hardening, not immediate correctness blocking.
- Safe modification (deferred track): (1) Add integration tests with real Gemini API to verify error patterns. (2) Expand fallback classification heuristics for unrecognized provider shapes where practical. (3) Document expected Gemini error shapes/messages with provider/version notes.
- Current test coverage: Unit coverage exists (37 tests); residual risk is upstream provider error-shape drift.

## Scaling Limits

### Hardcoded Exercise Data Cannot Scale
- Current capacity: Static `STRENGTH_STANDARDS` object in exercise-data.ts contains ~100 exercises max. Adding 50 more exercises doubles file size and requires code redeploy.
- Limit: Scaling beyond 500 exercises becomes impractical. Each addition requires code change, review, and deployment.
- Scaling path: Complete migration to Firebase exercises collection. Allows unlimited exercises without code changes. Use subcollections for exercise variants (e.g., "machine squat" as variant of "squat").

### Rate Limiting Per-Day Only
- Current capacity: Daily limits tracked per user per feature. No sub-daily rate limiting (e.g., 10 per minute). If user bulk-processes 10 analysis requests quickly, system allows all if daily limit not hit.
- Limit: Cannot protect against spike traffic or DOS attacks on per-minute basis. API quotas from Google Gemini may be exceeded intra-day.
- Scaling path: Implement token-bucket rate limiting with configurable windows. Use Redis for distributed rate limiting if scaling to multiple server instances.

### Firestore Read/Write Quotas Unbounded
- Current capacity: No monitoring or warnings when approaching Firestore quotas (1 million reads/writes per day for free tier, 10 million for paid tier). If user base grows to 10,000 active users, daily quota could be exceeded without warning.
- Limit: Firestore quotas are hard limits. Exceeding them causes application to fail.
- Scaling path: (1) Add quota monitoring to health check endpoint. (2) Implement request caching to reduce read volume. (3) Design for Firestore pricing tiers (small users on free tier, large users trigger alerts).

## Dependencies at Risk

### Gemini API Dependency Critical but Single-Source
- Risk: Entire AI analysis pipeline depends on Google Gemini API (src/ai/genkit.ts). If API is unavailable or quota is exceeded, all analysis features fail completely. No fallback analysis engine.
- Impact: Analysis feature becomes fully unavailable if Google is down. Users blocked from key functionality.
- Migration plan: (1) Implement graceful degradation (e.g., show cached previous analysis instead of failing). (2) Add rate limiting with queue system to distribute requests over time. (3) Consider backup AI provider (Claude, OpenAI) with fallback logic. (4) Add feature flag to enable/disable analysis features.

### Firebase as Single Database Backend
- Risk: All data lives in Firebase (Firestore + Auth). If Firebase project is compromised, all user data is at risk. No data backup strategy documented.
- Impact: Data loss scenario. No recovery path if Firestore data is deleted or corrupted.
- Migration plan: (1) Implement automated daily backups to Cloud Storage. (2) Document disaster recovery procedure. (3) Test restore from backup monthly. (4) Add audit logs for all deletes/updates.

### Upstash Redis Optional but Health Checks Depend on It
- Risk: Redis used for rate limiting and health checks but presence is optional (health check returns "degraded" if missing). If Redis is unavailable, rate limiting silently passes all requests.
- Impact: Rate limiting becomes ineffective if Redis is down.
- Migration plan: (1) Make Redis health critical (fail health check if unavailable). (2) Implement in-memory fallback rate limiting for single-instance deployments. (3) Add alerting when Redis becomes unavailable.

## Missing Critical Features

### No Offline Mode or Data Sync
- Problem: Application requires internet connection at all times. No offline capability. If user is on poor connection, charts may load empty or requests may hang.
- Blocks: Users cannot use application on airplanes, in areas with poor connectivity, or during network outages.

### No Data Export Functionality
- Problem: Users cannot export their workout logs, PRs, or analysis results. Data is locked in Firebase.
- Blocks: Users cannot use their data with other fitness apps. Data portability is limited. User switching costs are high.

### No Batch Operations for Exercise Data
- Problem: If exercise library needs update (e.g., rename "bench press" to "barbell bench press"), must be done one exercise at a time through admin UI or scripts. No batch import/export.
- Blocks: Scaling exercise library efficiently is not possible. Data migrations are manual and error-prone.

*Concerns audit: Updated 2026-02-15 - Priority order is the canonical execution queue. Resolved implementation detail/history is tracked in linked planning docs and `docs/changelog.md` to avoid duplication drift in this file.*
