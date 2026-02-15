# Testing Upgrades Plan

**Last Updated:** 2026-02-15 (Phase 4 closeout)

## Objective

Track testing implementation work beyond the current baseline.

Current baseline (already passing):
- `npm run typecheck`
- `npm run test:ci` with 403 passing tests

## Phase Summary

1. **Phase 1 (Completed): Foundation**
   - Added/expanded tests for:
     - `src/lib/logging/error-classifier.test.ts` (37)
     - `src/lib/logging/data-redactor.test.ts` (46)
     - `src/lib/exercise-normalization.test.ts` (38)
     - `src/app/prs/rate-limiting.test.ts` (26)
2. **Phase 2 (Completed): Server Actions**
   - Deterministic unit coverage across `src/app/*/actions.ts`
3. **Phase 3 (Completed): Firestore Layer**
   - Converter + query reliability tests
4. **Phase 4 (Completed): Integration**
   - Cross-feature integration scenarios

## Phase 2 Scope (Server Actions)

**Goal:** Add deterministic unit tests for all server actions in `src/app/*/actions.ts`, focusing on input validation, auth gating, rate-limit behavior, and side effects.

**Status:** Completed (all scoped server-action suites implemented)
**Estimated Duration:** 4-5 hours
**Target Size:** ~95-110 tests

### Phase 2 Subset Checkpoint (Completed 2026-02-14)

Context: due to Step 3/4 imbalance dependencies, the highest-risk server action paths were implemented first.

Completed files:
1. `src/app/analysis/actions.test.ts` (20 tests)
2. `src/app/profile/actions.test.ts` (36 tests)

Completed scope highlights:
1. Validation/auth/API availability gates
2. Rate-limit blocked branches + `NODE_ENV=development` bypass branches
3. Success side effects:
   - persistence delegation
   - `incrementUsageCounter`
   - `revalidateTag('user-profile-${userId}', 'max')` where expected
4. Classified AI error handling + user-facing error propagation
5. Goal date transform coverage (`dateAchieved` as null/undefined/valid date)

Verification completed:
1. `npm run test -- src/app/analysis/actions.test.ts`
2. `npm run test -- src/app/profile/actions.test.ts`
3. `npm run test:ci` (269 passing)
4. `npm run typecheck`

Harness update delivered:
1. Added `src/test/fixtures.ts` for shared deterministic test fixtures/builders.

Remaining for full Phase 2 completion:
1. None (core Phase 2 scope completed on 2026-02-15)

### Phase 2 Full Completion (2026-02-15)

Completed files:
1. `src/app/prs/actions.test.ts` (17 tests)
2. `src/app/plan/actions.test.ts` (14 tests)
3. `src/app/history/actions.test.ts` (expanded to 19 tests)

Phase 2 totals across scoped action suites:
1. `src/app/analysis/actions.test.ts` (20 tests)
2. `src/app/profile/actions.test.ts` (36 tests)
3. `src/app/prs/actions.test.ts` (17 tests)
4. `src/app/plan/actions.test.ts` (14 tests)
5. `src/app/history/actions.test.ts` (19 tests)
6. Total scoped Phase 2 server-action tests: 106

Verification completed:
1. `npm run test -- src/app/prs/actions.test.ts`
2. `npm run test -- src/app/plan/actions.test.ts`
3. `npm run test -- src/app/history/actions.test.ts`
4. `npm run test:ci` (317 passing)
5. `npm run typecheck`
6. `npm run lint`

### Optimal Path (Completed)

1. Shared fixtures and mocks were reused (`src/test/fixtures.ts` + per-suite mocks).
2. Action tests implemented and verified per file.
3. Full verification completed (`test:ci`, `typecheck`, `lint`).

### Action Matrix (exported functions only)

1. `src/app/prs/actions.ts` (~16-20 tests)
   - `parsePersonalRecordsAction`
   - `getPersonalRecords`
   - `addPersonalRecords`
   - `updatePersonalRecord`
   - `clearAllPersonalRecords`
   - Focus:
     - invalid input schema
     - missing user auth gating
     - API unavailable gating
     - rate-limit blocked branch
     - success flow (parse + usage increment)
     - AI error classification branches

2. `src/app/history/actions.ts` (~16-20 tests)
   - `parseWorkoutScreenshotAction`
   - `getWorkoutLogs`
   - `addWorkoutLog`
   - `updateWorkoutLog`
   - `deleteWorkoutLog`
   - Focus:
     - invalid parse/log schemas
     - missing user auth gating
     - API unavailable and rate-limit branches for screenshot parse
     - success flow (parse + usage increment)
     - CRUD delegation and error propagation

3. `src/app/analysis/actions.ts` (~18-22 tests)
   - `analyzeStrengthAction`
   - `getLiftStrengthLevelAction`
   - `getStrengthAnalysisAction`
   - `saveStrengthAnalysisAction`
   - Focus:
     - validation/auth/api/rate-limit branches
     - success flow (save + usage increment)
     - AI classified errors
     - synthetic record/profile mapping for strength level lookup
     - backend retrieval/save error handling

4. `src/app/plan/actions.ts` (~12-16 tests)
   - `generateWeeklyWorkoutPlanAction`
   - `getWeeklyPlanAction`
   - `saveWeeklyPlanAction`
   - Focus:
     - schema validation
     - API availability and rate-limit branches
     - success flow (generation + usage increment)
     - classified error handling and logging

5. `src/app/profile/actions.ts` (~30-36 tests)
   - `getUserProfile`
   - `updateUserProfile`
   - `analyzeLiftProgressionAction`
   - `analyzeGoalsAction`
   - `getGoalAnalysisAction`
   - `saveGoalAnalysisAction`
   - `getLiftProgressionAnalysisAction`
   - `saveLiftProgressionAnalysisAction`
   - `getGoalsAction`
   - `saveGoalsAction`
   - Focus:
     - validation/auth/api/rate-limit branches
     - `revalidateTag` side effects in success paths where expected
     - goals transforms (`dateAchieved` null/undefined)
     - persistence and retrieval failure branches

### Phase 2 Harness Requirements

1. **Mock modules (shared)**
   - `@/lib/firestore-server`
   - `@/lib/env-validation`
   - `@/app/prs/rate-limiting`
   - `@/lib/logging/error-classifier`
   - `@/lib/logging/logger`
   - AI flow modules per action file
   - `next/cache` (`revalidateTag`)
2. **Fixture helpers/builders (deliverable)**
   - valid/invalid user IDs
   - valid/invalid data URI payloads
   - valid/invalid user profile builders
   - workout and PR input builders
   - shared classified-error factory (quota/overloaded/validation)
   - implementation target: `src/test/fixtures.ts`
3. **Environment control**
   - explicit `process.env.NODE_ENV` reset per suite for dev-bypass vs prod-check branches
4. **Assertion standards**
   - assert return shape and side effects (counter increments, persistence calls, cache invalidation)
   - assert counters are not incremented on failure branches
5. **Next.js cache helper**
   - centralized `revalidateTag` mock/assertion helper for `profile/actions.ts`

### Phase 2 Out Of Scope

1. Firestore converter internals and query semantics (Phase 3)
2. Playwright smoke expansion (Phase 4)
3. Real AI provider integration/network tests
4. AI output-schema contract testing (integration/schema-level coverage)

### AI Fixture Caveat

1. Reusable AI response fixtures improve consistency, but these server-action tests mainly validate input gating and orchestration.
2. Do not treat mocked response fixtures as contract tests for model output shape.
3. Keep strict output contract checks in dedicated integration/schema tests.

### Known Challenges

1. `next/cache` side effects:
   - use centralized `revalidateTag` mock helper and assert exact tag values.
2. Counter increment assertions:
   - assert increment happens only on success branches, never on blocked/failed paths.
3. `NODE_ENV` branch drift:
   - reset env in `beforeEach/afterEach` to avoid cross-test contamination.
4. Goal date transform behavior:
   - explicit cases for `dateAchieved` as `null`, `undefined`, and valid date.

### Commands

```bash
# targeted file runs during implementation
npm run test -- src/app/prs/actions.test.ts
npm run test -- src/app/history/actions.test.ts
npm run test -- src/app/analysis/actions.test.ts
npm run test -- src/app/plan/actions.test.ts
npm run test -- src/app/profile/actions.test.ts

# final validation
npm run test:ci
npm run typecheck
```

### Phase 2 Exit Criteria

1. All Phase 2 suites pass under `npm run test:ci`
2. `npm run typecheck` remains clean
3. New tests are deterministic across two consecutive CI-mode runs
4. Coverage added for every exported server action in scoped files

## Phase 3 Scope (Firestore Layer)

**Goal:** Add deterministic reliability coverage for Firestore converters and server-side data access in `src/lib/firestore-server.ts`.

**Status:** Completed (Phase 3 closeout delivered)  
**Estimated Duration:** 6-8 hours  
**Planned Size:** ~60-75 tests

### Phase 3 Initial Implementation (2026-02-15)

Completed file:
1. `src/lib/firestore-server.test.ts` (62 tests)

Completed scope highlights:
1. Converter/date reliability checks across key read/write paths.
2. `getWorkoutLogs` query/error semantics (`index required`, `permission denied`, unexpected errors).
3. Explicit PR strength-level side-effect coverage:
   - `addPersonalRecords` recalculation + persisted `strengthLevel`
   - `updatePersonalRecord` recalculation + persisted `strengthLevel`
4. `saveWeeklyPlan` `contextUsed` truncation behavior (>500 chars).
5. `getLiftProgressionAnalysis` non-cache behavior (repeat calls re-query).
6. Lazy backfill + counter-branch semantics (`FieldValue.increment` vs `set(..., { merge: true })`).

Verification completed:
1. `npm run test -- src/lib/firestore-server.test.ts` (62 passing)
2. `npm run typecheck`
3. `npm run lint`

### Phase 3 Full Completion (2026-02-15)

Completed file:
1. `src/lib/firestore-server.test.ts` (62 tests total)

Completed scope highlights:
1. Converter reliability coverage across all Firestore-layer converter families and malformed required timestamp failure paths.
2. Query semantics + resilience branches for `getWorkoutLogs` (`start/end`, `since`, default, missing-index fail-open, permission fail-open, unexpected error rethrow).
3. Side-effect reliability coverage for:
   - `addPersonalRecords` / `updatePersonalRecord` strength-level recalculation
   - `clearAllPersonalRecords` empty/no-op and batch-delete behavior
   - `updateUserProfile` recompute gating and conditional batch update behavior
   - `saveWeeklyPlan` `contextUsed` truncation behavior
4. Migration/lazy-backfill coverage across weekly/strength/goal/fitness-goals/lift-progression getters, including non-fatal backfill failure behavior.
5. Save/delete reliability for weekly plan, analyses, goals, workout logs, and lift progression resources (serialization + error propagation).
6. Counter branch semantics for same-day atomic increment vs new-day/empty reset (`set(..., { merge: true })`).

Verification completed:
1. `npm run test -- src/lib/firestore-server.test.ts` (62 passing)
2. `npm run test:ci` (379 passing)
3. `npm run typecheck`
4. `npm run lint`

### Phase 3 Test Surface

1. **Converters (8 total)**
   - `workoutLogConverter`
   - `personalRecordConverter`
   - `weeklyPlanConverter`
   - `strengthAnalysisConverter`
   - `goalAnalysisConverter`
   - `liftProgressionConverter`
   - `fitnessGoalsConverter`
   - `userProfileConverter`
2. **Query/Mutation functions**
   - date-filter query paths (`getWorkoutLogs`)
   - subcollection CRUD and serialization (`workoutLogs`, `personalRecords`)
   - PR strength-level side effects during write paths (`addPersonalRecords`, `updatePersonalRecord`)
   - weekly plan payload truncation behavior (`saveWeeklyPlan.contextUsed`)
   - legacy fallback + lazy backfill (`weeklyPlans`, `strengthAnalyses`, `goalAnalyses`, `goals`, `liftProgressionAnalyses`)
   - cache-wrapped reads (`getPersonalRecords`, `getWeeklyPlan`, `getStrengthAnalysis`, `getGoalAnalysis`, `getFitnessGoals`)
   - non-cache exception: `getLiftProgressionAnalysis` is intentionally not wrapped with `cache(...)` and should be tested as a direct per-call fetch path
   - profile writes + PR strength-level recalculation side effects (`updateUserProfile`)
   - usage counter semantics (`incrementUsageCounter`)

### Implementation Plan (Batched)

1. **Batch 1: Converter reliability** (~24-30 tests)
   - required timestamp fields convert to/from `Date`
   - malformed/missing required timestamp fields throw with stable error messages
   - default/fallback values for optional fields remain deterministic
   - nested profile payload conversion (`fitnessGoals`, analyses, `weeklyPlan`, `aiUsage`) is preserved
2. **Batch 2: Query semantics + core CRUD** (~20-26 tests)
   - `getWorkoutLogs` query branch selection (`startDate/endDate`, `since`, default all)
   - index-required and permission-denied branches fail open (`[]`) with warning logs
   - unexpected errors rethrow and log
   - add/update/delete flows serialize dates correctly and delegate to expected path/doc IDs
   - `addPersonalRecords` calls `getStrengthLevel` per improved record and persists `strengthLevel`
   - `updatePersonalRecord` recomputes `strengthLevel` using merged current+incoming data
   - `updateUserProfile` recompute flow: relevant-key detection (6-key gate), PR fetch, level recompute, and conditional batch updates
   - `saveWeeklyPlan` truncates `contextUsed` to 500 chars (+ `...[truncated]` suffix) before persistence
   - `clearAllPersonalRecords` empty vs batch-delete behavior
3. **Batch 3: Migration/backfill + counters** (~18-24 tests)
   - new-location hit returns data without fallback work
   - legacy fallback path returns legacy data when subcollection doc is missing
   - lazy backfill enabled: save attempted; backfill failure logged but non-fatal
   - `incrementUsageCounter` same-day path uses atomic `FieldValue.increment(1)` via `update`
   - `incrementUsageCounter` new-day/missing path resets via `set(..., { merge: true })`
   - `updateUserProfile` recompute path updates PR levels only when profile keys require recalculation

### Harness and Test Architecture

1. Add `src/lib/firestore-server.test.ts` as a dedicated Phase 3 suite.
2. Mock modules:
   - `@/lib/firebase-admin` (`getAdminDb`)
   - `@/lib/strength-standards.server` (`getStrengthLevel`, `getNormalizedExerciseName`)
   - `@/lib/logging/logger`
   - `@/lib/logging/data-redactor`
3. Build chainable Firestore test doubles in-suite for:
   - `collection().doc().withConverter().where().orderBy().limit().get()`
   - `set/update/delete/add`
   - `batch().delete().update().commit()`
4. Stabilize cache-wrapped function tests by resetting modules/mocks between cases where cache behavior would leak.
5. Harness risk note: expect roughly 30-40% of implementation time to be in Firestore chainable test doubles; keep mocks minimal and scoped to current call patterns.
6. Dependency policy: do not add new mocking dependencies for this phase unless existing harness becomes unmaintainable; default to local in-suite mocks per project guidance.

### Phase 3 Commands

```bash
# targeted while implementing
npm run test -- src/lib/firestore-server.test.ts

# phase verification
npm run test:ci
npm run typecheck
npm run lint
```

### Phase 3 Exit Criteria

1. `src/lib/firestore-server.test.ts` lands with full converter coverage and planned query-path coverage.
2. All tests pass in `npm run test:ci` with deterministic results across two consecutive runs.
3. `npm run typecheck` and `npm run lint` remain clean.
4. Known non-critical hardening (error-classifier drift resilience) remains deferred unless promoted into priority order.

## Phase 4 Scope (Integration)

**Goal:** Add dedicated cross-feature integration coverage that validates action-layer orchestration + shared Firestore state behavior across boundaries.

**Status:** Resolved (2026-02-15)  
**Implemented Size:** 24 deterministic integration tests (risk-focused minimum)

### Phase 4 Test Placement

1. Dedicated suite: `src/test/integration/cross-feature.integration.test.ts`
2. Keep integration tests isolated from Phase 2/3 unit suites in `src/app/**` and `src/lib/**`.

### Phase 4 Integration Matrix (Scoped)

1. **Cross-boundary write/read consistency**
   - history actions (`add/update/delete/getWorkoutLogs`)
   - PR actions (`add/update/clear/getPersonalRecords`)
   - profile/analysis/plan save/get action pairs
2. **Cross-feature side effects**
   - action writes observable via separate read action paths
   - usage-counter increment behavior observable through profile state
3. **Error recovery across boundaries**
   - lower-layer persistence failures surfaced at action return shape
   - failure paths do not apply success-only side effects
4. **Validation integration**
   - action-level schema failures for integrated save/update entry points

### Harness Strategy

1. Reuse/extend the Phase 3 Firestore-double style (in-memory shared state + deterministic mocked module), not a new helper framework.
2. Mock external AI flow modules and infra wrappers; keep real action logic under test.
3. Keep assertions at integration boundaries (return shape + observable state + key side effects).

### Phase 4 Commands

```bash
# targeted during implementation
npm run test -- src/test/integration/cross-feature.integration.test.ts

# phase verification
npm run test:ci
npm run typecheck
npm run lint
```

### Phase 4 Exit Criteria

1. `src/test/integration/cross-feature.integration.test.ts` provides deterministic risk-based coverage across the scoped matrix (write/read consistency, side effects, recovery, validation).
2. Suite coverage demonstrates failure paths do not apply success-only side effects and preserve prior good state where applicable.
3. `npm run test -- src/test/integration/cross-feature.integration.test.ts`, `npm run test:ci`, `npm run typecheck`, and `npm run lint` all pass.
