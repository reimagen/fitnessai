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

1. **OPEN: Exercise library runtime validation + type convergence (Lane G, correctness hardening)**
- Scope: eliminate fragile runtime assumptions for `ExerciseDocument` shape and reduce mismatch risk between library types used across analysis/history/profile flows.
- Dependency notes (sequential): execute first in the next set; this item is a prerequisite for item 2 so query optimization is measured against validated/consistent data shapes.
- Overengineering risk: `LOW` (high correctness impact with bounded implementation scope).
- Target outcomes:
  - runtime validation at exercise fetch boundaries for required/optional fields
  - shared type guard(s) replacing ad-hoc field assumptions in high-risk call sites
  - focused tests for malformed/missing exercise metadata handling

2. **OPEN: Firestore query-path optimization follow-up (Lane A2, measurement-gated)**
- Scope: optimize only log-proven Firestore query hotspots beyond item 4, avoiding broad speculative refactors.
- Dependency notes (sequential): start after item 1 lands; can run in parallel with item 3 after item 1 completion.
- Overengineering risk: `MEDIUM` unless strictly measurement-gated; constrain to top 1-2 hotspots with explicit before/after evidence.
- Target outcomes:
  - measurable read-count and/or latency improvement for selected hotspots
  - no behavioral regressions in affected flows
  - updated baseline evidence in `docs/performance-baseline.md` (or equivalent metric capture)

3. **OPEN: Firestore quota observability + thresholds (Lane D2, ops safety)**
- Scope: expose practical quota utilization risk in health/ops surfaces and define threshold policy for alerting.
- Dependency notes (parallel): can execute in parallel with item 2 after item 1 starts.
- Overengineering risk: `LOW` if scoped to observability only (no autoscaling/complex policy engine in this slice).
- Target outcomes:
  - health/ops signal for Firestore quota utilization trend/risk
  - documented threshold policy in `docs/ops-runbook.md`
  - basic validation path for degraded/warning signaling

4. **OPEN: Sub-daily rate-limit scaling design + spike (Lane E, parallel design; staged implementation)**
- Scope: define token-bucket/minute-window rate limiting approach (Redis-backed where available), plus minimal implementation spike behind safe defaults.
- Dependency notes: design can run alongside active scaling track; production enforcement implementation should follow stable outcomes from items 1-3.
- Overengineering risk: `MEDIUM` if expanded into full enforcement rollout before design validation; keep this phase as design + controlled spike.
- Target outcomes:
  - documented rate-limit policy for burst protection
  - validated implementation path that does not regress current daily limit behavior

Resolved items moved to:
- `.planning/codebase/CONCERNS-ARCHIVE.md`
- `docs/changelog.md`

Note: sections below (`Tech Debt`, `Performance Bottlenecks`, `Fragile Areas`, `Scaling Limits`, `Dependencies at Risk`, `Missing Critical Features`) are tracked risks and context, not sequenced work items.

## Risk Register Handling (Backlog Sections Below)

- Purpose: backlog/risk inventory, not the execution queue.
- Execution rule: do **not** pull work directly from these sections without first promoting it into `## Priority Order (Execution + Dependencies)`.
- Assessment rule: each backlog concern should include decision metadata to support promotion triage:
  - `Impact`: expected user/business/operational impact if unaddressed
  - `Overengineering risk now`: risk of premature or oversized implementation at current stage
  - `Promote when`: concrete trigger/condition for moving the item into active priority order
- Promotion criteria:
  - current user impact is meaningful, or
  - it blocks an active priority item, or
  - risk likelihood/severity increased.
- When promoting an item:
  1. Add it to `## Priority Order` with dependency placement and status.
  2. Keep a short concern detail in its original section for context.
  3. Update `docs/changelog.md` when resolved.

## Tech Debt

## Performance Bottlenecks

### Large Component Files May Cause Re-renders
- Problem: `WorkoutLogForm.tsx` (546 lines), `StrengthBalanceCard.tsx` (427 lines), `WeeklyCardioTargetsCard.tsx` (421 lines) are complex components with many useMemo hooks. While memoization is used, the components still process large arrays and perform computations on every render. No React.memo wrapping on some sub-components.
- Files: `src/components/history/WorkoutLogForm.tsx`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/components/profile/WeeklyCardioTargetsCard.tsx`
- Cause: Components accept multiple props that change frequently (exercises, workoutLogs, userProfile). useMemo dependencies may be too loose.
- Improvement path: (1) Profile components with React DevTools to measure render times. (2) Wrap expensive child components with React.memo. (3) Consider splitting large components into smaller, independently-memoized ones. (4) Use lazy loading for chart components.
- Promotion assessment:
  - Impact: `MEDIUM` (interaction responsiveness risk on heavy forms/cards).
  - Overengineering risk now: `MEDIUM` unless scoped to profiler-proven hotspots.
  - Promote when: apples-to-apples profiler captures show user-perceptible latency or repeated commits above accepted thresholds.

### Firestore Queries Not Optimized
- Problem: `src/lib/firestore-server.ts` runs separate queries for workoutLogs and personalRecords. When fetching analysis data, system may make N+1 queries (one for user profile, separate for each record type). No query batching or compound index optimization.
- Files: `src/lib/firestore-server.ts` lines 238-250 (getWorkoutLogs with date filters), lines 373-400 (getPersonalRecords)
- Cause: Firestore documents are fetched individually with converters applied to each, and withConverter is called on collection refs repeatedly.
- Improvement path: (1) Batch read related documents using `Promise.all`. (2) Create a compound query that fetches both workoutLogs and personalRecords in one request where possible. (3) Implement read-through caching with Redis for frequently accessed user profiles. (4) Add Firestore indexes for common query patterns (date ranges, exercise names).
- Promotion assessment:
  - Impact: `HIGH` (direct latency/read-cost implications).
  - Overengineering risk now: `MEDIUM` if pursued as broad refactor; `LOW` if limited to top 1-2 measured hotspots.
  - Promote when: logs/baselines identify concrete read or latency hotspots with reproducible before/after measurement plan.

### Chart Data Processing Happens Client-Side
- Problem: `src/hooks/useChartData.ts` (329 lines) processes raw workout logs into chart format entirely on the client. If user has 500+ workouts, this creates useMemo computation on every render.
- Files: `src/hooks/useChartData.ts` (329 lines), `src/hooks/useLiftProgression.ts` (174 lines), `src/hooks/useCardioAnalysis.ts` (333 lines)
- Cause: No server-side aggregation. Charts fetch full history even when showing summary view.
- Improvement path: (1) Move chart data preparation to server action (server/analyze-chart-data.ts). (2) Cache processed chart data in Firestore or Redis with TTL. (3) Implement pagination/time-window filtering (e.g., "last 3 months" vs "all time"). (4) Use tRPC or GraphQL for parameterized queries instead of fetching all data.
- Status update (2026-02-17): `PARTIAL RESOLUTION` for immediate client compute overhead in `useChartData` (weekly + monthly/yearly/all-time aggregation path optimizations). Remaining long-term architecture options (server-side aggregation/caching) stay in backlog until promoted.
- Promotion assessment:
  - Impact: `MEDIUM-HIGH` for very large histories; `LOW-MEDIUM` for typical current payloads.
  - Overengineering risk now: `HIGH` for full server-aggregation/caching rollout without fresh evidence.
  - Promote when: profiler/perf traces show remaining chart scripting or interaction delays after current optimizations.

## Fragile Areas

### Exercise Library Type Mismatches
- Files: `src/lib/exercise-types.ts` (ExerciseDocument), `src/lib/types.ts` (Exercise), `src/components/history/WorkoutLogForm.tsx` (uses both)
- Why fragile: Two separate Exercise types exist (Exercise for logged data, ExerciseDocument for library). Converters between them are done manually in multiple places. If ExerciseDocument structure changes in Firebase, components using `exercise.strengthStandards` will break without TypeScript catching it until runtime.
- Safe modification: (1) Create a shared type definition that both types implement or extend. (2) Add Zod schema validation for ExerciseDocument at Firebase fetch time. (3) Create a type guard function `isExerciseWithStandards()` used before accessing strengthStandards field.
- Test coverage: No validation that ExerciseDocument structure matches type definition when fetched from Firebase.
- Promotion assessment:
  - Impact: `HIGH` (correctness/safety risk across multiple surfaces).
  - Overengineering risk now: `LOW` if scoped to runtime validation + focused type guards.
  - Promote when: immediately; this is a strong candidate for next execution item.

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
- Promotion assessment:
  - Impact: `LOW-MEDIUM` (operational classification quality, not core feature correctness).
  - Overengineering risk now: `MEDIUM` if pushed into integration-heavy provider-shape test matrix.
  - Promote when: error telemetry shows material increase in unknown/unclassified provider errors.

## Scaling Limits

### Rate Limiting Per-Day Only
- Current capacity: Daily limits tracked per user per feature. No sub-daily rate limiting (e.g., 10 per minute). If user bulk-processes 10 analysis requests quickly, system allows all if daily limit not hit.
- Limit: Cannot protect against spike traffic or DOS attacks on per-minute basis. API quotas from Google Gemini may be exceeded intra-day.
- Scaling path: Implement token-bucket rate limiting with configurable windows. Use Redis for distributed rate limiting if scaling to multiple server instances.
- Promotion assessment:
  - Impact: `HIGH` (burst protection and upstream quota safety).
  - Overengineering risk now: `MEDIUM` if jumping straight to full enforcement; `LOW` for design + guarded spike.
  - Promote when: now, as phased design/spike before production enforcement.

### Firestore Read/Write Quotas Unbounded
- Current capacity: No monitoring or warnings when approaching Firestore quotas (1 million reads/writes per day for free tier, 10 million for paid tier). If user base grows to 10,000 active users, daily quota could be exceeded without warning.
- Limit: Firestore quotas are hard limits. Exceeding them causes application to fail.
- Scaling path: (1) Add quota monitoring to health check endpoint. (2) Implement request caching to reduce read volume. (3) Design for Firestore pricing tiers (small users on free tier, large users trigger alerts).
- Promotion assessment:
  - Impact: `MEDIUM-HIGH` (ops safety/early warning).
  - Overengineering risk now: `LOW` for observability-only phase.
  - Promote when: now, as lightweight health + runbook threshold enhancement.

## Dependencies at Risk

### Gemini API Dependency Critical but Single-Source
- Risk: Entire AI analysis pipeline depends on Google Gemini API (src/ai/genkit.ts). If API is unavailable or quota is exceeded, all analysis features fail completely. No fallback analysis engine.
- Impact: Analysis feature becomes fully unavailable if Google is down. Users blocked from key functionality.
- Migration plan: (1) Implement graceful degradation (e.g., show cached previous analysis instead of failing). (2) Add rate limiting with queue system to distribute requests over time. (3) Consider backup AI provider (Claude, OpenAI) with fallback logic. (4) Add feature flag to enable/disable analysis features.
- Promotion assessment:
  - Impact: `HIGH` but strategic/architectural.
  - Overengineering risk now: `HIGH` for multi-provider fallback before proving current provider reliability pain.
  - Promote when: repeated outage/quota incidents or explicit product requirement for multi-provider resiliency.

### Firebase as Single Database Backend
- Risk: All data lives in Firebase (Firestore + Auth). If Firebase project is compromised, all user data is at risk. No data backup strategy documented.
- Impact: Data loss scenario. No recovery path if Firestore data is deleted or corrupted.
- Migration plan: (1) Implement automated daily backups to Cloud Storage. (2) Document disaster recovery procedure. (3) Test restore from backup monthly. (4) Add audit logs for all deletes/updates.
- Promotion assessment:
  - Impact: `HIGH` (data durability/compliance risk).
  - Overengineering risk now: `LOW-MEDIUM` for backup + runbook baseline; `HIGH` for full multi-region redesign.
  - Promote when: near-term for baseline backup/runbook, before user/base expansion.

### Upstash Redis Optional but Health Checks Depend on It
- Risk: Redis used for rate limiting and health checks but presence is optional (health check returns "degraded" if missing). If Redis is unavailable, rate limiting silently passes all requests.
- Impact: Rate limiting becomes ineffective if Redis is down.
- Migration plan: (1) Make Redis health critical (fail health check if unavailable). (2) Implement in-memory fallback rate limiting for single-instance deployments. (3) Add alerting when Redis becomes unavailable.
- Promotion assessment:
  - Impact: `MEDIUM` (rate-limit enforcement integrity).
  - Overengineering risk now: `LOW` for health/alerting hardening.
  - Promote when: alongside rate-limit design/enforcement work.

## Missing Critical Features

### No Offline Mode or Data Sync
- Problem: Application requires internet connection at all times. No offline capability. If user is on poor connection, charts may load empty or requests may hang.
- Blocks: Users cannot use application on airplanes, in areas with poor connectivity, or during network outages.
- Promotion assessment:
  - Impact: `MEDIUM` product value; not immediate operational blocker.
  - Overengineering risk now: `HIGH` (large architectural scope).
  - Promote when: explicit product roadmap commitment for offline usage.

### No Data Export Functionality
- Problem: Users cannot export their workout logs, PRs, or analysis results. Data is locked in Firebase.
- Blocks: Users cannot use their data with other fitness apps. Data portability is limited. User switching costs are high.
- Promotion assessment:
  - Impact: `MEDIUM` (user portability/compliance posture).
  - Overengineering risk now: `MEDIUM` (scope manageable if CSV-first).
  - Promote when: product decision or compliance requirement mandates export.

### No Batch Operations for Exercise Data
- Problem: If exercise library needs update (e.g., rename "bench press" to "barbell bench press"), must be done one exercise at a time through admin UI or scripts. No batch import/export.
- Blocks: Scaling exercise library efficiently is not possible. Data migrations are manual and error-prone.
- Promotion assessment:
  - Impact: `LOW-MEDIUM` currently (internal tooling pain).
  - Overengineering risk now: `MEDIUM` if full admin tooling is built too early.
  - Promote when: exercise library update frequency increases or migration workload becomes recurring.

*Concerns audit: Updated 2026-02-15 - Priority order is the canonical execution queue. Resolved implementation detail/history is tracked in linked planning docs and `docs/changelog.md` to avoid duplication drift in this file.*
