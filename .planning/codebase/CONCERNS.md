# Codebase Concerns

**Analysis Date:** 2026-02-05

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

### ✅ PARTIAL RESOLUTION: Test Coverage Expansion Started (Phase 1 Complete - 2026-02-14)

**Status:** Phase 1 foundation tests complete, Phase 2-4 pending

**Phase 1 Completed (137 new tests):**
- ✅ `src/lib/logging/error-classifier.test.ts` (37 tests) - All error categories, user messaging, edge cases
- ✅ `src/lib/logging/data-redactor.test.ts` (46 tests) - PII redaction, recursive handling, safe fields
- ✅ `src/lib/exercise-normalization.test.ts` (38 tests expanded) - Normalization, canonical lookup, fallbacks
- ✅ `src/app/prs/rate-limiting.test.ts` (26 tests) - Rate limits, daily enforcement, boundaries
- ✅ All 173 tests deterministic, <3sec execution, zero flaky tests
- ✅ Vitest + mocking patterns established for future phases

**Remaining Coverage Gaps:**
- ❌ Unit tests: Server actions still need testing (Phase 2 - 75+ tests planned)
- ❌ Integration tests: Firestore converters untested (Phase 3 - 50+ tests planned)
- ❌ Complex hooks: `useLiftProgression`, `useChartData`, `useCardioAnalysis` still lack tests
- ❌ Components: Error boundaries, form validation still need tests (Phase 4)

**Impact:** Foundation for critical business logic is now tested. Remaining gaps target server actions, AI flows, and data layer.

**Next Steps:** Phase 2 will add 75+ tests for server actions (`src/app/*/actions.ts`) with Firebase/AI mocking.

### Incomplete Error Handling in Complex Hooks
- Issue: Hooks like `useLiftProgression` (177 lines), `useChartData` (303 lines), `useCardioAnalysis` (321 lines) have minimal error handling. They return null on missing data without distinguishing between "still loading" and "error occurred". This can silently hide problems.
- Files: `src/hooks/useLiftProgression.ts`, `src/hooks/useCardioAnalysis.ts`, `src/hooks/useChartData.ts`, `src/hooks/useStrengthFindings.ts`
- Impact: Users may see blank/empty states without understanding why. Errors surface only at component render time, not during data fetch. Difficult to debug issues.
- Fix approach: Add error state to hook returns alongside data and loading. Wrap hook logic in try-catch blocks. Propagate error details to error boundaries.

## Known Bugs

### ✅ RESOLVED: Exercise Name Resolution Inconsistency
- **Status:** FIXED as of 2026-02-14
- **What was fixed:**
  - Data-level resolution: `resolveCanonicalExerciseName()` correctly distinguishes machine vs non-machine exercises (e.g., "Machine Bicep Curl" vs "Bicep Curl") with 38 unit tests verifying behavior
  - Display-level consistency: `StrengthBalanceCard` was using `toTitleCase()` while other components used `formatExerciseDisplayName()`. Unified all display formatting to use `formatExerciseDisplayName()`.
- **Files updated:**
  - `src/components/analysis/StrengthBalanceCard.tsx` - Replaced `toTitleCase()` with `formatExerciseDisplayName()` for lift1Name/lift2Name

### ✅ RESOLVED: Date Conversion Bugs in Firestore Converters
- **Status:** FIXED as of 2026-02-14
- **What was fixed:** All 8 Firestore converters now throw on missing/malformed required date fields instead of silently falling back to `new Date()`. Dates are always set by the UI at time of entry (manual form defaults to today, screenshot parser blocks save without date, goal form requires targetDate). A missing date in Firestore means data corruption, not a valid state.
- **Files updated:**
  - `src/lib/firestore-server.ts` - All converters throw with document ID and field name on missing dates (workoutLogConverter, personalRecordConverter, weeklyPlanConverter, strengthAnalysisConverter, goalAnalysisConverter, liftProgressionConverter, fitnessGoalsConverter, userProfileConverter). `dateAchieved` remains optional (`undefined` if not set).
- **Impact:** Data corruption is surfaced immediately via error. Server action try/catch handles it gracefully - user sees friendly error, error is logged to Cloud Logging with document ID for investigation. Types stay clean (`Date`, not `Date | null`) so no cascading null checks needed.

## Security Considerations

### ✅ RESOLVED: PII Redaction May Be Incomplete
- **Status:** FIXED as of 2026-02-13
- **What was fixed:**
  - Logger now applies `redactPII()` to all metadata before sending to Cloud Logging (production only)
  - Firebase user ID redaction enhanced with regex pattern for bare 28-character user IDs
  - Keeps first 8 characters for tracing/debugging while masking the rest
- **Files updated:**
  - `src/lib/logging/logger.ts` - Applies redaction to metadata before logging (lines 40-42)
  - `src/lib/logging/data-redactor.ts` - Added bare Firebase user ID pattern (lines 107-110)
- **Remaining recommendations:** (1) Test redactPII with actual user data before production deployment. (2) Add explicit PII check in pre-commit hooks. (3) Audit Cloud Logging permissions to ensure only authorized personnel can read logs.

### ✅ RESOLVED: Environment Variable Exposure Risk
- **Status:** FIXED as of 2026-02-13
- **What was fixed:** Replaced all specific API key error messages with generic "AI features are temporarily unavailable" message. This prevents attackers from fingerprinting the environment.
- **Implementation:**
  - Validation happens once at app startup via `validateEnvironment()` in `src/app/layout.tsx`
  - All 5 action files now use `areAPIKeysAvailable()` helper function
  - Returns generic `API_UNAVAILABLE_ERROR` message to users instead of revealing which key is missing
  - Detailed error logging remains server-side only (console/Cloud Logging, not user-facing)
- **Files updated:**
  - `src/app/analysis/actions.ts` - Generic error on line 54
  - `src/app/prs/actions.ts` - Generic error on line 66
  - `src/app/plan/actions.ts` - Generic error on line 32
  - `src/app/profile/actions.ts` - Generic error on lines 143, 222
  - `src/app/history/actions.ts` - Generic error on line 87
- **Impact:** Attackers can no longer determine if they're hitting production or staging by reading error messages.

## Performance Bottlenecks

### Large Component Files May Cause Re-renders
- Problem: `WorkoutLogForm.tsx` (546 lines), `StrengthBalanceCard.tsx` (406 lines), `WeeklyCardioTargetsCard.tsx` (421 lines) are complex components with many useMemo hooks. While memoization is used, the components still process large arrays and perform computations on every render. No React.memo wrapping on some sub-components.
- Files: `src/components/history/WorkoutLogForm.tsx`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/components/profile/WeeklyCardioTargetsCard.tsx`
- Cause: Components accept multiple props that change frequently (exercises, workoutLogs, userProfile). useMemo dependencies may be too loose.
- Improvement path: (1) Profile components with React DevTools to measure render times. (2) Wrap expensive child components with React.memo. (3) Consider splitting large components into smaller, independently-memoized ones. (4) Use lazy loading for chart components.

### Firestore Queries Not Optimized
- Problem: `src/lib/firestore-server.ts` runs separate queries for workoutLogs and personalRecords. When fetching analysis data, system may make N+1 queries (one for user profile, separate for each record type). No query batching or compound index optimization.
- Files: `src/lib/firestore-server.ts` lines 238-250 (getWorkoutLogs with date filters), lines 373-400 (getPersonalRecords)
- Cause: Firestore documents are fetched individually with converters applied to each, and withConverter is called on collection refs repeatedly.
- Improvement path: (1) Batch read related documents using `Promise.all`. (2) Create a compound query that fetches both workoutLogs and personalRecords in one request where possible. (3) Implement read-through caching with Redis for frequently accessed user profiles. (4) Add Firestore indexes for common query patterns (date ranges, exercise names).

### Chart Data Processing Happens Client-Side
- Problem: `src/hooks/useChartData.ts` (303 lines) processes raw workout logs into chart format entirely on the client. If user has 500+ workouts, this creates useMemo computation on every render.
- Files: `src/hooks/useChartData.ts`, `src/hooks/useLiftProgression.ts`, `src/hooks/useCardioAnalysis.ts`
- Cause: No server-side aggregation. Charts fetch full history even when showing summary view.
- Improvement path: (1) Move chart data preparation to server action (server/analyze-chart-data.ts). (2) Cache processed chart data in Firestore or Redis with TTL. (3) Implement pagination/time-window filtering (e.g., "last 3 months" vs "all time"). (4) Use tRPC or GraphQL for parameterized queries instead of fetching all data.

## Fragile Areas

### Exercise Library Type Mismatches
- Files: `src/lib/exercise-types.ts` (ExerciseDocument), `src/lib/types.ts` (Exercise), `src/components/history/WorkoutLogForm.tsx` (uses both)
- Why fragile: Two separate Exercise types exist (Exercise for logged data, ExerciseDocument for library). Converters between them are done manually in multiple places. If ExerciseDocument structure changes in Firebase, components using `exercise.strengthStandards` will break without TypeScript catching it until runtime.
- Safe modification: (1) Create a shared type definition that both types implement or extend. (2) Add Zod schema validation for ExerciseDocument at Firebase fetch time. (3) Create a type guard function `isExerciseWithStandards()` used before accessing strengthStandards field.
- Test coverage: No validation that ExerciseDocument structure matches type definition when fetched from Firebase.

### Hardcoded Analysis Configurations
- Files: `src/analysis/analysis.config.ts` (IMBALANCE_CONFIG with hardcoded exercise pairs and thresholds), `src/analysis/analysis-constants.ts`
- Why fragile: Adding new imbalance types requires code changes. If exercise names in IMBALANCE_CONFIG don't match exercise library canonical names, analysis silently returns no findings. The configuration has 40+ lines of exercise references that could go out of sync with exercise library.
- Safe modification: (1) Validate exercise names in IMBALANCE_CONFIG against exercise library at startup. (2) Move IMBALANCE_CONFIG to Firebase config document. (3) Add health check that verifies all exercises in config exist in library.
- Test coverage: No test verifies IMBALANCE_CONFIG exercises match library.

### Error Classification Hardcoded Rules
- Files: `src/lib/logging/error-classifier.ts` (classifyAIError function with hardcoded error message patterns)
- Why fragile: The classifier looks for keywords like "quota", "overload", "rate limit" in error messages from Gemini API. If Google changes error messages, classification breaks silently, all errors become "unknown" category.
- Safe modification: (1) Add integration tests with real Gemini API to verify error patterns. (2) Create fallback classification rules for unrecognized errors. (3) Document expected error messages from Gemini API with version numbers.
- Test coverage: No tests for error classification.

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

## Test Coverage Gaps (Updated with Phase 1 Progress)

### ✅ Error Classification Tests (COMPLETED - Phase 1)
- **Status:** 37 tests covering all 5 error categories (quota_exceeded, model_overloaded, validation_error, auth_error, unknown_error)
- **Coverage:** Error categorization, status codes, retry flags, user messaging, edge cases
- **Files:** `src/lib/logging/error-classifier.test.ts`
- **Impact:** classifyAIError logic is now fully tested and safe to refactor.

### ✅ Exercise Normalization Tests (COMPLETED - Phase 1)
- **Status:** 38 tests covering normalization, canonical lookup, legacy names, fallbacks
- **Coverage:** Name normalization (EGYM prefix, whitespace, casing), canonical exercise lookup, integration scenarios
- **Files:** `src/lib/exercise-normalization.test.ts`
- **Impact:** Exercise resolution logic is now tested; data accuracy improvements enabled.

### ✅ Rate Limiting Tests (COMPLETED - Phase 1)
- **Status:** 26 tests covering daily limits, feature-specific enforcement, boundary conditions
- **Coverage:** Authentication, limit checking per feature, date rollover, concurrent requests
- **Files:** `src/app/prs/rate-limiting.test.ts`
- **Impact:** Rate limiting fairness and quota protection verified; safe to modify.

### 🔄 Server Actions Tests (PENDING - Phase 2)
- **What's not tested:** `src/app/*/actions.ts` files (analysis, prs, plan, profile, history). Request validation, error handling, rate limiting checks, database writes, AI API calls.
- **Planned:** ~75 tests with Firebase/AI mocking
- **Risk:** Refactoring server actions is unsafe. Bug fixes may introduce regressions.
- **Priority:** HIGH - These are main entry points for user interactions.
- **Target:** Phase 2 implementation

### 🔄 Firebase Operations Tests (PENDING - Phase 3)
- **What's not tested:** Firestore converters (8 total), queries with date filters, sub-collection access, cache behavior.
- **Planned:** ~50 tests covering all converters and query functions
- **Risk:** Data corruption or loss may go unnoticed until production.
- **Priority:** HIGH - Data layer is critical.
- **Target:** Phase 3 implementation

### 🔄 AI Flows Tests (PENDING - Phase 2)
- **What's not tested:** Prompt engineering, output validation, edge cases (empty inputs, malformed data).
- **Planned:** Tested as part of server action mocking (Phase 2) with Zod validation verification
- **Risk:** AI outputs may be invalid JSON or hallucinations.
- **Priority:** MEDIUM - Zod validation provides safeguard.
- **Target:** Phase 2 implementation

---

*Concerns audit: Updated 2026-02-14 - Resolved: Exercise name resolution inconsistency (unified display formatting). Date conversion fix revised: converters now throw on missing required dates instead of null/modal approach. Phase 1 test coverage complete (137 new tests). Previous: 2026-02-13 - Resolved: Date conversion bugs, PII redaction, env var exposure. 2026-02-09 - Removed E2E smoke tests (11/11), rate limiting implementation, health endpoint*
