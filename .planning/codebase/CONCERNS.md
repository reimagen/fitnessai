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
- Status: Targeted subset completed and green; full Phase 2 remains pending under item 5.
- Dependency notes: Highest-value guardrails for Step 4 Firestore config paths are now in place.
- Risk: Refactoring server actions is unsafe without regression coverage.
- Priority: HIGH - these actions orchestrate imbalance analysis.
- Detailed scope:
  - Server action tests (PARTIAL RESOLUTION - Phase 2 subset complete)
  - What's covered: analysis/profile action validation, auth gating, rate-limit branches, success/error flows, Firestore call orchestration.
  - What is NOT done yet from full Phase 2:
    - `src/app/prs/actions.test.ts` does not exist yet.
    - `src/app/plan/actions.test.ts` does not exist yet.
    - `src/app/history/actions.test.ts` exists (6 tests) but is below planned full Phase 2 depth.
  - AI flow validation: covered as part of action mocking, with Zod output schema verification.
  - Verification: `npm run test -- src/app/analysis/actions.test.ts`, `npm run test -- src/app/profile/actions.test.ts`, `npm run test:ci` (269 passing), `npm run typecheck`.

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
- Target outcome:
  - Firestore `config/imbalanceConfig` uses valid active canonical IDs for all intended pairs
  - no unresolved loader validation issues
  - analysis warning banner only appears for true degraded incidents
  - `/api/health` shows `imbalanceConfig: ok` in steady state
- Verification:
  - direct Firestore verification: `activePairs=4`, `validationIssueCount=0`
  - manual: analysis page warning clears after cache refresh window/invalidation
  - `GET /api/health` should report `checks.imbalanceConfig = "ok"` after cache refresh/invalidation

6. **Phase 2 Server Action Tests (remaining to complete full suite)** (`.planning/codebase/testing-upgrades.md`)
- Scope: Complete remaining Phase 2 work to close gaps:
  - add `src/app/prs/actions.test.ts`
  - add `src/app/plan/actions.test.ts`
  - expand `src/app/history/actions.test.ts` to planned Phase 2 coverage depth
- Estimated remaining size: ~55-68 tests.
- Dependency notes: Follows after Imbalance Steps 3-5 merged and initial testing window closed.

7. **Phase 3 Firestore data-layer tests** (`.planning/codebase/testing-upgrades.md`)
- Scope: converter/query reliability tests.
- Dependency notes: should run in same window as, or immediately after, Step 3/4 Firestore config migration.
- Revision trigger: after completing Phase 2 server-action tests, revise Phase 3 scope/estimates using newly added fixtures/mocks and any findings from Step 3/4 rollout.
- Detailed testing scope:
  - Firebase operations tests (PENDING - Phase 3)
  - What's not tested: Firestore converters (8 total), queries with date filters, sub-collection access, cache behavior.
  - Planned: ~50 tests covering all converters and query functions
  - Risk: Data corruption or loss may go unnoticed until production.
  - Priority: HIGH - Data layer is critical.
  - Target: Phase 3 implementation
  - Re-plan checkpoint: Re-baseline this section immediately after Phase 2 completion (and again after Imbalance Step 3/4), then update final test count/scope in `/.planning/codebase/testing-upgrades.md`.

8. **Phase 4 integration test rollout** (`.planning/codebase/testing-upgrades.md`)
- Scope: cross-feature integration test rollout as defined in `testing-upgrades.md` (Phase 4).
- Dependency notes: execute after critical correctness + reliability milestones above.
- Detailed testing scope:
  - Components and integration coverage still needed (error boundaries, form validation, and broader cross-feature flow checks).
  - Target: Phase 4 implementation.

9. **Post-Phase performance/scaling track**
- Scope: broader performance/scaling concerns after critical correctness/reliability phases complete.
- Dependency notes: execute after Phase 4 integration baseline is stable.

Note: sections below (`Tech Debt`, `Performance Bottlenecks`, `Fragile Areas`, `Scaling Limits`, `Dependencies at Risk`, `Missing Critical Features`) are tracked risks and context, not sequenced work items.

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

### Testing Status
- Phase 1 foundational testing work is complete and documented in `/.planning/codebase/TESTING.md` and `docs/changelog.md`.
- Active testing concerns in this file focus on pending Phase 2/3/4 work, aligned with the priority order above.

### ✅ PARTIAL RESOLUTION: Phase 2 Targeted Subset (Analysis + Profile Actions)
- **Status:** Completed and verified on 2026-02-14; full Phase 2 remains open.
- **Files:** `src/app/analysis/actions.test.ts`, `src/app/profile/actions.test.ts`
- **What was completed:**
  - Added deterministic server-action tests for analysis/profile action paths (54 tests total).
  - Covered validation/auth/API availability branches, rate-limit blocked + development bypass paths, success orchestration side effects, and classified AI error handling.
  - Verified profile mutation/cache side effects (`revalidateTag`) and goal date transform paths (`dateAchieved` null/undefined/valid).
- **Verification:**
  - `npm run test -- src/app/analysis/actions.test.ts`
  - `npm run test -- src/app/profile/actions.test.ts`
  - `npm run test:ci` (269 passing)
  - `npm run typecheck`
- **Remaining risk:** full Phase 2 coverage for remaining server action suites (`src/app/prs/actions.ts`, `src/app/plan/actions.ts`) is still pending and tracked in Priority item 5.

### Phase 2 Remaining Checklist (Not Yet Done)
- [ ] `src/app/prs/actions.test.ts` (new suite)
- [ ] `src/app/plan/actions.test.ts` (new suite)
- [ ] Expand `src/app/history/actions.test.ts` from current baseline (6 tests) to planned Phase 2 depth

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

### ✅ RESOLVED: Hardcoded Analysis Configurations (Primary Source Migration)
- **Status:** Primary source migration completed on 2026-02-14
- **Files:** `src/analysis/analysis.config.ts`, `src/lib/imbalance-config-types.ts`, `src/lib/imbalance-config.server.ts`, `src/analysis/imbalance-matcher.ts`, `src/analysis/strength-balance.utils.ts`, `src/hooks/useStrengthBalanceData.ts`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/components/analysis/StrengthBalanceFindingCard.tsx`, `src/lib/firestore.service.ts`, `src/app/analysis/actions.ts`, `src/app/analysis/page.tsx`, `src/lib/logging/health-check.ts`, `src/app/api/health/route.ts`
- **What was fixed:**
  - Added runtime validation of `IMBALANCE_CONFIG` exercise names against the active exercise library (`validateImbalanceConfigExercises`).
  - Added explicit surfacing in analysis UI when config/library mismatch exists (warning banner instead of silent no-findings behavior).
  - Added Firestore-backed imbalance config loader with schema + validation issue handling and fallback to static config.
  - Added ID-based imbalance pair matching (canonical exercise IDs) to avoid fragile string-option matching in the primary path.
  - Added health-check validation (`analysisConfig` + `imbalanceConfig`) so drift and fallback state are operationally visible in `/api/health`.
  - Added degraded-state mismatch details to server logs only (count + sample mismatches), without expanding health API response payload.
- **Test coverage added:**
  - `src/analysis/analysis.config.validation.test.ts` verifies match/mismatch detection + deduplicated reporting.
  - `src/lib/logging/health-check.test.ts` verifies `analysisConfig` health status and mismatch metadata behavior.
- **Completed (Step 1 + Step 2):**
  - Shared 6-week lift metrics aggregation extracted and wired into Lift Progression path to reduce duplicate recomputation.
    - `src/analysis/six-week-lift-metrics.ts`
    - `src/hooks/useSixWeekLiftMetrics.ts`
    - `src/hooks/useLiftProgression.ts`
    - `src/hooks/useLiftTrends.ts`
    - `src/components/analysis/LiftProgressionCard.tsx`
  - Lift Progression e1RM header unit label now uses computed unit output instead of hardcoded `lbs`.
    - `src/components/analysis/LiftProgressionChart.tsx`
  - Added focused aggregation tests:
    - `src/analysis/six-week-lift-metrics.test.ts`
- **Residual risk:** static `IMBALANCE_CONFIG` remains as fallback/disaster-recovery path only; stale fallback definitions can still degrade behavior if Firestore config is unavailable, but this now surfaces via `imbalanceConfig` health status.
- **Execution reference:** sequencing and implementation details are tracked in `## Priority Order (Execution + Dependencies)` and `/.planning/codebase/imbalance-config.md`.

### ✅ RESOLVED: Imbalance Config Operational Sync (Data)
- **Status:** Resolved on 2026-02-15
- **What is out of sync:** Firestore imbalance pair definitions (canonical IDs) are not fully aligned with currently active exercises, which can trigger degraded/fallback warnings and partial findings.
- **Where it surfaces:**
  - Strength Balance warning banner in `src/components/analysis/StrengthBalanceCard.tsx`
  - `/api/health` via `checks.imbalanceConfig` from `src/lib/logging/health-check.ts` and `src/app/api/health/route.ts`
- **Fix stage:** Priority item 5 in this file (completed).
- **Completion criteria:**
  - Firestore `config/imbalanceConfig` pairs all reference valid active exercise IDs
  - no avoidable validation issues in loader result
  - warning no longer appears in steady-state healthy config

### ✅ RESOLVED: StrengthBalanceCard Rewire + Refactor Phase 4
- **Status:** Completed and verified on 2026-02-14
- **Files:** `src/analysis/strength-balance.utils.ts`, `src/analysis/strength-balance.utils.test.ts`, `src/hooks/useStrengthBalanceData.ts`, `src/components/analysis/StrengthBalanceFindingCard.tsx`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/analysis/analysis.utils.ts`, `src/analysis/badge-utils.ts`, `src/lib/types.ts`, `src/ai/flows/strength-imbalance-analyzer.ts`, `src/ai/flows/weekly-workout-planner.ts`
- **What was fixed:**
  - Extracted and tested reusable strength-balance utility logic; rewired card orchestration to shared six-week metrics path.
  - Removed dead `Level Imbalance` handling from analysis utilities, shared types, AI flow schema/constants, and weekly planner prompt contract.
  - Removed deterministic `explicitActionPrefix` prepending from recommendation output to prevent duplicate action lines while retaining `directivePrefix` on `insight`.
- **Verification:**
  - `npm run typecheck`
  - `npm run test:ci -- src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts src/app/analysis/actions.test.ts`
  - `npm run test:ci -- src/hooks/use-strength-balance-data.test.tsx src/components/analysis/strength-balance-finding-card.test.tsx src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts`
  - Manual verification completed: AI "Get AI Insights" recommendation text no longer duplicates the deterministic action line.

### Error Classification Hardcoded Rules
- Files: `src/lib/logging/error-classifier.ts` (classifyAIError function with hardcoded error message patterns)
- Why fragile: The classifier looks for keywords like "quota", "overload", "rate limit" in error messages from Gemini API. If Google changes error messages, classification breaks silently, all errors become "unknown" category.
- Safe modification: (1) Add integration tests with real Gemini API to verify error patterns. (2) Create fallback classification rules for unrecognized errors. (3) Document expected error messages from Gemini API with version numbers.
- Test coverage: Unit coverage exists (37 tests); residual risk is upstream provider error-shape drift.

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

*Concerns audit: Updated 2026-02-14 (revised 2026-02-14) - Verified current baseline with refactor closure updates logged in `docs/changelog.md`. Priority order now reflects Step 1/2 and Step 3 + Phase 4 closure as resolved; next execution sequence is targeted Phase 2 subset, Steps 4/5, Phase 2 full, Phase 3, Phase 4, then post-phase performance work.*
