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

### Limited Test Coverage in Production Codebase
- Issue: No unit/integration test files in the `src/` directory despite production server actions, complex hooks, and AI integrations. Smoke tests (E2E) added for critical user flows, but deep logic remains untested.
- Coverage:
  - ✅ Smoke tests: 11 E2E tests for authentication, workouts, analysis, screenshots (Playwright)
  - ❌ Unit tests: Zero test files for server actions, hooks, utilities, components
  - ❌ Integration tests: No tests for Firestore converters, error classification, rate limiting
- Impact: Cannot verify deep logic or error paths before deployment. Regression testing for business logic requires manual testing. Difficult to refactor with confidence. Error paths in server actions, rate limiting, error classification, and AI flows remain untested.
- Fix approach: Add Vitest + React Testing Library for unit/integration tests. Start with critical paths: server actions in `src/app/*/actions.ts`, error classification in `src/lib/logging/error-classifier.ts`, rate limiting in `src/app/prs/rate-limiting.ts`. Aim for >70% coverage on critical paths. Smoke tests validate end-to-end flows but don't catch logic bugs.

### Incomplete Error Handling in Complex Hooks
- Issue: Hooks like `useLiftProgression` (177 lines), `useChartData` (303 lines), `useCardioAnalysis` (321 lines) have minimal error handling. They return null on missing data without distinguishing between "still loading" and "error occurred". This can silently hide problems.
- Files: `src/hooks/useLiftProgression.ts`, `src/hooks/useCardioAnalysis.ts`, `src/hooks/useChartData.ts`, `src/hooks/useStrengthFindings.ts`
- Impact: Users may see blank/empty states without understanding why. Errors surface only at component render time, not during data fetch. Difficult to debug issues.
- Fix approach: Add error state to hook returns alongside data and loading. Wrap hook logic in try-catch blocks. Propagate error details to error boundaries.

## Known Bugs

### Exercise Name Resolution Inconsistency
- Symptoms: Users see exercise names rendered inconsistently. "Machine Bicep Curl" vs "bicep curl" may appear in different parts of UI. Chart data may not match dropdown selections.
- Files: `src/components/history/WorkoutLogForm.tsx`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/lib/exercise-normalization.ts`, `src/lib/exercise-display.ts`
- Trigger: When exercise library contains both "bicep curl" and "machine bicep curl" but user sees different canonical names in different pages. When DISPLAY_OVERRIDES in exercise-display.ts is applied inconsistently.
- Workaround: The normalizeExerciseNameForLookup function (exercise-normalization.ts) attempts to standardize by stripping EGYM prefix, but inconsistencies persist because formatExerciseDisplayName applies different formatting rules.

### Potential Date Conversion Bugs in Firestore Converters
- Symptoms: Dates may appear as midnight or with wrong timezone. Analysis dates may be off by a day.
- Files: `src/lib/firestore-server.ts` (workoutLogConverter lines 59, personalRecordConverter line 82)
- Trigger: When Firestore returns null or missing date field. The converter defaults to `new Date()` instead of throwing error or returning null, masking data issues.
- Workaround: Always verify workout log dates after logging. Check Firestore console for malformed date fields.

### Rate Limiting Not Enforced in Development
- Symptoms: Development users can bypass rate limits by setting NODE_ENV=development. Test environment has no quota protection.
- Files: `src/app/analysis/actions.ts` line 36, `src/app/prs/actions.ts` line 36, `src/app/plan/actions.ts` line 36, `src/app/profile/actions.ts` line 36, `src/app/history/actions.ts` line 36
- Trigger: Running with NODE_ENV !== 'production'. Easily bypassed by modifying environment.
- Workaround: Use explicit feature flag or user-based bypass list instead of NODE_ENV check.

## Security Considerations

### PII Redaction May Be Incomplete
- Risk: The redactPII function in `src/lib/logging/data-redactor.ts` redacts known PII patterns but new data shapes added without update could leak personal information to Cloud Logging.
- Files: `src/lib/logging/data-redactor.ts`, `src/lib/logging/server-action-wrapper.ts`
- Current mitigation: Basic redaction of email, weights, goals. No redaction of user IDs in log context though they're sensitive.
- Recommendations: (1) Test redactPII with actual user data before deployment. (2) Add explicit PII check in pre-commit hooks. (3) Audit Cloud Logging permissions to ensure only authorized personnel can read logs. (4) Consider setting up Cloud Logging data access policies.

### Environment Variable Exposure Risk
- Risk: Multiple places check for API key presence using `!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY`. If either is missing, error message is shown to user, potentially confirming environment is not production.
- Files: `src/app/analysis/actions.ts` line 26, `src/app/prs/actions.ts` line 26, `src/app/plan/actions.ts` line 26, `src/app/profile/actions.ts` line 26, `src/app/history/actions.ts` line 26
- Current mitigation: Error message is generic but still identifies which service is missing.
- Recommendations: (1) Pre-validate environment variables at startup, fail fast. (2) Log missing env vars only once at application start, not on every action. (3) Return generic error to user instead of exposing which service is missing.

### Redis Configuration Exposure
- Risk: `src/lib/logging/health-check.ts` checks for `process.env.UPSTASH_REDIS_REST_URL` and `process.env.UPSTASH_REDIS_REST_TOKEN` in client-visible health endpoint. If missing, health status is "degraded" which could leak infrastructure details.
- Files: `src/lib/logging/health-check.ts` line 10
- Current mitigation: Health endpoint is internal API route, not world-accessible unless hosting misconfigured.
- Recommendations: (1) Add authentication to `/api/health` endpoint. (2) Return different responses for authenticated vs unauthenticated requests. (3) Do not expose why health is degraded publicly.

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

## Test Coverage Gaps

### Zero Unit Tests for Server Actions
- What's not tested: `src/app/*/actions.ts` files (analysis, prs, plan, profile, history). Request validation, error handling, rate limiting checks, database writes, AI API calls.
- Files: All `src/app/*/actions.ts`
- Risk: Refactoring server actions is unsafe. Bug fixes may introduce regressions. Validation rules may be silently broken.
- Priority: HIGH - These are the main entry points for user interactions.

### Zero Integration Tests for Firebase Operations
- What's not tested: Firestore converters, queries with date filters, sub-collection access, cache behavior. If converter logic changes, bugs go undetected.
- Files: `src/lib/firestore-server.ts` (620 lines of untested converters), `src/lib/firestore.service.ts` (522 lines of untested queries)
- Risk: Data corruption or loss may go unnoticed until production. Converter bugs silently convert undefined to default values.
- Priority: HIGH - Data layer is critical.

### Zero Tests for AI Flows
- What's not tested: Prompt engineering, output validation, edge cases (empty inputs, malformed data). If Gemini API behavior changes, we won't know until user reports error.
- Files: `src/ai/flows/*.ts` (lift-progression-analyzer, strength-imbalance-analyzer, goal-analyzer, screenshot-workout-parser, etc.)
- Risk: AI outputs may be invalid JSON, missing required fields, or hallucinations. Validation happens downstream in components, creating hard-to-debug failures.
- Priority: MEDIUM - AI flows have Zod validation as safeguard, but edge cases still uncovered.

### Zero Tests for Error Classification
- What's not tested: classifyAIError correctly categorizes Gemini errors, retry logic decisions, rate limit detection.
- Files: `src/lib/logging/error-classifier.ts`
- Risk: Error categories may be wrong, causing incorrect retry behavior. User sees wrong error messages.
- Priority: MEDIUM - Affects user experience but has fallback behavior.

### Zero Tests for Exercise Normalization
- What's not tested: normalizeExerciseNameForLookup, resolveCanonicalExerciseName with real exercise library data. Legacy name resolution, fallback lookups.
- Files: `src/lib/exercise-normalization.ts`
- Risk: Exercise names may not resolve correctly, causing mismatched data in charts and analysis.
- Priority: MEDIUM - Affects data accuracy.

### Zero Tests for Rate Limiting
- What's not tested: checkRateLimit correctly enforces daily limits, date rollover works correctly, concurrent requests are handled.
- Files: `src/app/prs/rate-limiting.ts`
- Risk: Rate limiting may not work as designed. Users could bypass limits or be rate limited incorrectly.
- Priority: MEDIUM - Affects fairness and quota protection.

---

*Concerns audit: Updated 2026-02-07*
