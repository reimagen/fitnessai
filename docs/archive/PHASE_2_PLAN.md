# ⚠️ Superseded / Archived
#
# Status: Superseded on 2026-02-15 after Phase 2 completion.
# This document is retained for historical context and may contain outdated assumptions/test counts.
# Do not use this file as the execution source of truth.
#
# Current source of truth:
# - `.planning/codebase/CONCERNS.md` (priority order + dependencies)
# - `.planning/codebase/testing-upgrades.md` (testing phase status/roadmap)
# - `docs/changelog.md` (implemented outcomes + verification)

# Phase 2: Server Actions Testing Plan

**Status:** Ready for Implementation
**Target:** 95-110 tests across 5 server action files
**Duration:** 4-5 hours estimated
**Date Created:** 2026-02-14

---

## Overview

Phase 2 adds comprehensive unit tests for all server actions in `src/app/*/actions.ts`. Focus is on input validation, auth gating, rate-limit behavior, and side effects (cache invalidation, counter increments, database writes).

**Success Criteria:**
- All Phase 2 tests pass under `npm run test:ci`
- `npm run typecheck` remains clean
- Tests are deterministic (pass twice in a row in CI mode)
- Every exported server action has test coverage

---

## File-by-File Scope

### 1. `src/app/prs/actions.ts` (~16-20 tests) - START HERE

**Why first:** Smallest file, clear dependencies, already has rate-limiting tests as foundation

**Tests to add:**

```
parsePersonalRecordsAction
├── invalid data URI (corrupted image)
├── missing user ID
├── API unavailable (error from AI flow)
├── rate-limit blocked
├── success path (image parsed, PR saved, counter incremented)
├── AI classification: quota error
├── AI classification: validation error

addPersonalRecords
├── schema validation failure
├── missing user
├── successful save delegation to firestore

updatePersonalRecord
├── auth check
├── schema validation
├── successful update

deletePersonalRecord
├── auth check
├── successful delete

clearAllPersonalRecords
├── auth check
├── successful clear
```

**Fixtures needed:**
- Valid data URI (base64 image)
- Invalid data URI formats
- Valid/invalid PR data
- Classified AI errors (quota, validation, overload)

---

### 2. `src/app/history/actions.ts` (~16-20 tests)

**Why second:** Complements prs tests, validates CRUD patterns

**Tests to add:**

```
parseWorkoutScreenshotAction
├── invalid input
├── missing user
├── API unavailable
├── rate-limit blocked
├── success (screenshot parsed, workout logged, counter incremented)
├── AI classification error paths

getWorkoutLogs
├── missing user
├── with date range filter
├── successful retrieval

addWorkoutLog
├── schema validation failure
├── missing user
├── successful save

updateWorkoutLog
├── auth check
├── schema validation
├── successful update

deleteWorkoutLog
├── auth check
├── successful delete
```

**Fixtures needed:**
- Valid/invalid workout data
- Date ranges for filtering
- Screenshot data URIs

---

### 3. `src/app/analysis/actions.ts` (~18-22 tests)

**Tests to add:**

```
analyzeStrengthAction
├── validation failure (invalid PR data)
├── missing user
├── API unavailable
├── rate-limit blocked
├── success (analysis saved, counter incremented)
├── classified error: quota

getLiftStrengthLevelAction
├── validation failure
├── successful strength level calculation
├── missing exercise in standards

getStrengthAnalysisAction
├── missing user
├── successful retrieval
├── not found

saveStrengthAnalysisAction
├── auth check
├── schema validation
├── successful save
├── cache revalidation side effect
```

**Fixtures needed:**
- Valid strength analysis data
- User profiles with strength standards
- Classified error responses

---

### 4. `src/app/plan/actions.ts` (~12-16 tests)

**Tests to add:**

```
generateWeeklyWorkoutPlanAction
├── schema validation failure
├── missing user
├── API unavailable
├── rate-limit blocked
├── success (plan generated, saved, counter incremented)
├── classified error: overload

getWeeklyPlanAction
├── missing user
├── successful retrieval
├── with lazy backfill

saveWeeklyPlanAction
├── auth check
├── schema validation
├── successful save
```

**Fixtures needed:**
- Valid weekly plan data
- User profile fixtures
- AI plan responses

---

### 5. `src/app/profile/actions.ts` (~30-36 tests) - MOST COMPLEX

**Tests to add:**

```
getUserProfile
├── missing user
├── successful retrieval

updateUserProfile
├── schema validation failure
├── auth check
├── successful update
├── revalidateTag side effect

analyzeLiftProgressionAction
├── validation failure
├── missing user
├── API unavailable
├── rate-limit blocked
├── success (analysis saved, counter incremented)
├── classified error

analyzeGoalsAction
├── validation failure
├── missing user
├── API unavailable
├── rate-limit blocked
├── success path
├── classified error

getGoalsAction
├── missing user
├── successful retrieval

addGoalAction
├── auth check
├── schema validation
├── successful save

updateGoalAction
├── auth check
├── schema validation
├── successful update
├── dateAchieved null/undefined handling

deleteGoalAction
├── auth check
├── successful delete

getLiftProgressionAnalysisAction
├── missing user
├── successful retrieval

getGoalAnalysisAction
├── missing user
├── successful retrieval

saveLiftProgressionAnalysisAction
├── auth check
├── schema validation
├── successful save

saveGoalAnalysisAction
├── auth check
├── schema validation
├── successful save
├── dateAchieved null/undefined transform
```

**Fixtures needed:**
- User profile variations
- Goal data with/without dateAchieved
- Lift progression analysis fixtures
- All classified error types

---

## Shared Test Harness

### Mock Modules (per action file)

```typescript
vi.mock('@/lib/firestore-server', () => ({
  // Mock all CRUD functions per file
  // Return typed responses matching real behavior
}));

vi.mock('@/lib/env-validation', () => ({
  areAPIKeysAvailable: vi.fn(() => true),
}));

vi.mock('@/app/prs/rate-limiting', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/logging/error-classifier', () => ({
  classifyAIError: vi.fn((error) => ({
    category: 'unknown_error',
    statusCode: 500,
    userMessage: 'AI service error',
    shouldRetry: false,
    shouldCountAgainstLimit: true,
  })),
}));

vi.mock('@/lib/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// AI flow mocks per file:
vi.mock('@/ai/flows/screenshot-workout-parser', () => ({
  parseWorkoutScreenshot: vi.fn(),
}));
// ... etc for each AI flow
```

### Fixture Factory

Create `src/test/fixtures.ts`:

```typescript
export const createValidUserProfile = (overrides = {}) => ({
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  aiUsage: {},
  ...overrides,
});

export const createValidWorkout = (overrides = {}) => ({
  id: 'log-123',
  date: new Date(),
  notes: 'Test workout',
  exercises: [{ name: 'Bench Press', weight: 185, reps: 5, sets: 3 }],
  ...overrides,
});

export const classifiedErrorFixtures = {
  quota: {
    category: 'quota_exceeded',
    statusCode: 429,
    shouldRetry: true,
    shouldCountAgainstLimit: false,
  },
  overload: {
    category: 'model_overloaded',
    statusCode: 503,
    shouldRetry: true,
    shouldCountAgainstLimit: false,
  },
  validation: {
    category: 'validation_error',
    statusCode: 400,
    shouldRetry: false,
    shouldCountAgainstLimit: true,
  },
};
```

### Test Pattern Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestoreServer from '@/lib/firestore-server';
import { analyzeStrengthAction } from './actions';

vi.mock('@/lib/firestore-server');
vi.mock('@/lib/logging/error-classifier');
// ... other mocks

describe('analyzeStrengthAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('rejects missing user ID', async () => {
      const result = await analyzeStrengthAction('', { /* data */ });
      expect(result.error).toBeDefined();
      expect(result.error).toContain('User not authenticated');
    });

    it('rejects invalid schema', async () => {
      const result = await analyzeStrengthAction('user-123', { invalid: 'data' });
      expect(result.error).toBeDefined();
    });
  });

  describe('auth and rate limiting', () => {
    it('blocks if rate limit exceeded', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        error: 'Daily limit reached',
      });

      const result = await analyzeStrengthAction('user-123', validData);
      expect(result.error).toContain('Daily limit');
    });
  });

  describe('success path', () => {
    it('saves analysis and increments counter', async () => {
      vi.mocked(getUserProfile).mockResolvedValue(createValidUserProfile());
      vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(analyzeStrength).mockResolvedValue(validAnalysis);

      const result = await analyzeStrengthAction('user-123', validData);

      expect(result.success).toBe(true);
      expect(firestoreServer.saveStrengthAnalysis).toHaveBeenCalledWith('user-123', expect.any(Object));
      expect(firestoreServer.incrementUsageCounter).toHaveBeenCalledWith('user-123', 'analyze_strength');
    });
  });

  describe('error classification', () => {
    it('handles quota errors gracefully', async () => {
      vi.mocked(analyzeStrength).mockRejectedValue(new Error('429 quota exceeded'));
      vi.mocked(classifyAIError).mockReturnValue(classifiedErrorFixtures.quota);

      const result = await analyzeStrengthAction('user-123', validData);

      expect(result.error).toContain('Try again later');
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });
  });
});
```

---

## Execution Order (Recommended)

1. **`src/app/prs/actions.ts`** - Smallest, foundation for patterns
2. **`src/app/history/actions.ts`** - Validates CRUD patterns
3. **`src/app/analysis/actions.ts`** - Mid-complexity, depends on prs patterns
4. **`src/app/plan/actions.ts`** - Similar to analysis
5. **`src/app/profile/actions.ts`** - Most complex, builds on 1-4

---

## Test Commands

```bash
# Run Phase 2 tests only
npm run test -- src/app

# Run with coverage
npm run test:ci -- src/app

# Watch mode (develop one file)
npm run test -- src/app/prs/actions.test.ts --watch

# Type checking before commit
npm run typecheck
```

---

## Exit Criteria

✅ All Phase 2 test files created and passing
✅ `npm run test:ci` shows all 95-110 tests passing
✅ `npm run typecheck` clean (no TS errors)
✅ Tests deterministic (pass twice in a row)
✅ Commit ready with tests for every exported server action
✅ CI pipeline green

---

## Known Challenges & Solutions

**Challenge:** Mocking `next/cache` `revalidateTag`
- Solution: Mock as vi.fn() and assert it was called with expected tags

**Challenge:** Side effects (counter increments) hard to verify
- Solution: Use `vi.mocked()` to get typed references and assert calls with `.toHaveBeenCalledWith()`

**Challenge:** `dateAchieved` null/undefined handling in saveGoalsAction
- Solution: Create explicit test cases for each state (null, undefined, valid date)

**Challenge:** Environment variable checks (NODE_ENV)
- Solution: Use `beforeEach` to set/restore `process.env.NODE_ENV`

---

## Notes

- Phase 2 focuses on **unit testing** server actions in isolation with mocked dependencies
- Phase 3 will test Firestore converters and queries (integration layer)
- Phase 4 will expand E2E tests (Playwright smoke tests)
- All tests are **deterministic** (no flaky network calls, time-based logic, or random data)

---

*Plan created: 2026-02-14*
*Ready to implement: YES*
