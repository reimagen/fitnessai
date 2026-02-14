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

1. **Imbalance Component Step 1 + Step 2 first** (`.planning/codebase/imbalance-config.md`)
- Scope: shared 6-week aggregation extraction + immediate unit-label fix.
- Dependency notes: low coupling to server-action test rollout; high user-facing correctness value.

2. **Phase 2 Server Action Tests (targeted subset first)** (`.planning/codebase/testing-upgrades.md`)
- Scope: start with deterministic tests for `src/app/analysis/actions.ts` and `src/app/profile/actions.ts`.
- Dependency notes: these are the highest-value guardrails for upcoming Imbalance Step 3/4 Firestore refactor paths.
- Detailed testing scope:
  - Server action tests (PENDING - Phase 2 subset)
  - What's not tested: `src/app/*/actions.ts` files (analysis, prs, plan, profile, history). Request validation, error handling, rate limiting checks, database writes, AI API calls.
  - Planned first slice: analysis/profile action suites
  - Risk: Refactoring server actions is unsafe. Bug fixes may introduce regressions.
  - Priority: HIGH - These are main entry points for user interactions.
  - Target: complete analysis/profile suites before Imbalance Step 3/4
  - AI flow tests (PENDING - Phase 2)
  - What's not tested: Prompt engineering, output validation, edge cases (empty inputs, malformed data).
  - Planned: Tested as part of server action mocking (Phase 2) with Zod validation verification
  - Risk: AI outputs may be invalid JSON or hallucinations.
  - Priority: MEDIUM - Zod validation provides safeguard.
  - Target: phase with subset and full Phase 2 completion

3. **Imbalance Component Step 3 + Step 4 after targeted Phase 2 subset** (`.planning/codebase/imbalance-config.md`)
- Scope: Firestore-backed imbalance config + ID-based matching engine.
- Dependency notes: depends on Step 1/2 aggregation and targeted analysis/profile action coverage before deeper refactor.

4. **Complete remaining Phase 2 server-action suites** (`.planning/codebase/testing-upgrades.md`)
- Scope: finish `src/app/prs/actions.ts`, `src/app/history/actions.ts`, and `src/app/plan/actions.ts`.
- Dependency notes: complete full Phase 2 coverage immediately after Imbalance Step 3/4 lands.

5. **Phase 3 Firestore data-layer tests** (`.planning/codebase/testing-upgrades.md`)
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

6. **Phase 4 integration test rollout** (`.planning/codebase/testing-upgrades.md`)
- Scope: cross-feature integration test rollout as defined in `testing-upgrades.md` (Phase 4).
- Dependency notes: execute after critical correctness + reliability milestones above.
- Detailed testing scope:
  - Components and integration coverage still needed (error boundaries, form validation, and broader cross-feature flow checks).
  - Target: Phase 4 implementation.

7. **Post-Phase performance/scaling track**
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

### ✅ PARTIAL RESOLUTION: Hardcoded Analysis Configurations
- **Status:** Guardrails implemented as of 2026-02-14; source-of-truth migration still pending
- **Files:** `src/analysis/analysis.config.ts`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/lib/logging/health-check.ts`, `src/app/api/health/route.ts`
- **What was fixed:**
  - Added runtime validation of `IMBALANCE_CONFIG` exercise names against the active exercise library (`validateImbalanceConfigExercises`).
  - Added explicit surfacing in analysis UI when config/library mismatch exists (warning banner instead of silent no-findings behavior).
  - Added health-check validation (`analysisConfig`) so drift is operationally visible in `/api/health`.
  - Added degraded-state mismatch details to server logs only (count + sample mismatches), without expanding health API response payload.
- **Test coverage added:**
  - `src/analysis/analysis.config.validation.test.ts` verifies match/mismatch detection + deduplicated reporting.
  - `src/lib/logging/health-check.test.ts` verifies `analysisConfig` health status and mismatch metadata behavior.
- **In progress (Step 1 + Step 2):**
  - Shared 6-week lift metrics aggregation extracted and wired into Lift Progression path to reduce duplicate recomputation.
  - Lift Progression e1RM header unit label now uses computed unit output instead of hardcoded `lbs`.
- **Remaining risk:** `IMBALANCE_CONFIG` is still hardcoded; adding/changing imbalance definitions still requires code deploys.
- **Execution reference:** sequencing and implementation details are tracked in `## Priority Order (Execution + Dependencies)` and `/.planning/codebase/imbalance-config.md`.

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

*Concerns audit: Updated 2026-02-14 - Verified current baseline: typecheck clean and 179/179 tests passing in CI mode. Key resolved items are logged in `docs/changelog.md`; concise resolved context may remain here when useful for risk tracking. Priority order is dependency-aware and de-risked for bottlenecks: Imbalance Step 1/2, targeted Phase 2 subset (analysis/profile), Imbalance Step 3/4, remaining Phase 2 suites, then Phase 3 data-layer testing, Phase 4 integration testing, and post-phase performance/scaling work.*
