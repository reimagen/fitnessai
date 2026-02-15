# Testing Upgrades Plan

**Last Updated:** 2026-02-14 (Step 4-5 aligned checkpoint)

## Objective

Track testing implementation work beyond the current baseline.

Current baseline (already passing):
- `npm run typecheck`
- `npm run test:ci` with 269 passing tests

## Phase Summary

1. **Phase 1 (Completed): Foundation**
   - Added/expanded tests for:
     - `src/lib/logging/error-classifier.test.ts` (37)
     - `src/lib/logging/data-redactor.test.ts` (46)
     - `src/lib/exercise-normalization.test.ts` (38)
     - `src/app/prs/rate-limiting.test.ts` (26)
2. **Phase 2 (In Progress): Server Actions**
   - Deterministic unit coverage across `src/app/*/actions.ts`
3. **Phase 3 (Planned): Firestore Layer**
   - Converter + query reliability tests
4. **Phase 4 (Planned): Integration**
   - Cross-feature integration scenarios

## Phase 2 Scope (Server Actions)

**Goal:** Add deterministic unit tests for all server actions in `src/app/*/actions.ts`, focusing on input validation, auth gating, rate-limit behavior, and side effects.

**Status:** In progress (dependency-driven subset complete; Step 4-5 dependency resolved)
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
1. `src/app/prs/actions.ts` tests
2. `src/app/plan/actions.ts` tests
3. `src/app/history/actions.ts` expansion from current baseline depth
4. Any additional shared fixture consolidation (if adopted later)

### Optimal Path (Remaining Work)

1. Create shared fixtures and mocks first.
2. Implement action tests in dependency-light order:
   1. `src/app/prs/actions.ts`
   2. `src/app/history/actions.ts`
   3. `src/app/plan/actions.ts`
3. Run targeted suite after each file, then full `test:ci` + `typecheck` at the end.

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

**Target:** 50+ tests for data layer reliability
- converter tests (all converters)
- query function tests (CRUD and filters)
- timestamp/date handling
- lazy backfill logic
- error paths and recovery behavior

## Phase 4 Scope (Integration)

**Target:** 30+ tests for integrated flows
- workout analysis pipeline
- PR flow + strength-level path
- error recovery scenarios
- validation flow integration
