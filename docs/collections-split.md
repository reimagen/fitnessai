# Firebase Collections Split Plan

## Executive Summary

Currently, the user document stores profile data, fitness goals, AI analyses, and weekly plans together. Users view analyses after every workout (5-6+ times/week) and aggressive users regenerate analyses weekly. This creates redundant reads of large, static documents.

**Recommendation:** Split weekly plans and analyses into separate subcollections before launch to control Firestore costs and improve cache efficiency.

---

## Current Structure & Problems

### User Document (/users/{userId})
```
/users/{userId}
├── Profile stats (age, height, weight, etc.)
├── fitnessGoals: FitnessGoal[]
├── strengthAnalysis: {result, generatedDate}           ← Large, viewed frequently
├── liftProgressionAnalysis: {[exercise]: {result, generatedDate}}  ← Large, viewed frequently
├── goalAnalysis: {result, generatedDate}              ← Large, viewed frequently
├── weeklyPlan: {plan, generatedDate, ...}             ← Medium, viewed multiple times/week
└── aiUsage counters
```

### Actual Usage Patterns
- **View analyses**: After every workout (5-6+ times/week per user)
- **Regenerate analyses**: Weekly by aggressive users
- **View plan**: Multiple times/week, generated once/week
- **Access profile**: Least frequently used
- **Regenerate plan**: Once per week

### Cost Problem
When user views analyses after workout:
1. App reads entire user document (20-50KB+)
2. Analyses are typically unchanged since last workout
3. Same read repeated 5-6 times/week, mostly redundant

Example: User with 5 workouts/week × 2 weeks:
- **Current**: 10 reads of 30KB user doc = unnecessary bandwidth + Firestore read ops
- **Proposed**: 2-3 reads of analyses (cached) + separate profile reads = efficient cache hits

---

## Proposed Structure

### Phase 1: Move Weekly Plan

```
/users/{userId}/
├── (user doc - unchanged, contains core profile + goals + aiUsage)
│
└── weeklyPlans/ (new subcollection)
    └── current (document)
        ├── plan: string
        ├── generatedDate: Timestamp
        ├── weekStartDate: string
        └── contextUsed: string
```

**Why Phase 1 first:**
- Lowest risk (plan is simple, non-nested structure)
- Plan viewed multiple times/week but generated once/week—perfect for separate caching
- Quick to implement (1-2 files)

### Phase 2: Move Analyses

```
/users/{userId}/
├── (user doc - unchanged, contains core profile + goals + aiUsage)
│
├── weeklyPlans/ (from Phase 1)
│   └── current
│
└── analyses/ (new subcollection)
    ├── strength (document)
    │   ├── result: StrengthImbalanceOutput
    │   └── generatedDate: Timestamp
    ├── liftProgression (document)
    │   ├── exercises: {[name]: {result, generatedDate}}
    │   └── lastUpdated: Timestamp
    └── goals (document)
        ├── result: AnalyzeFitnessGoalsOutput
        └── generatedDate: Timestamp
```

**Why separate from Phase 1:**
- Analyses are complex nested objects (exercise-specific)
- Need to decide: one document per exercise or all in one doc
- More files to update (3+ action files)

---

## Performance Impact

### Current (Combined)
| Scenario | Reads | Write Ops | Bandwidth | Cache |
|----------|-------|-----------|-----------|-------|
| View profile | 1 | - | 30-50KB | 1hr |
| View analyses after workout | 1 | - | 30-50KB | 1hr (wasted) |
| View plan | 1 | - | 30-50KB | 1hr (wasted) |
| Regenerate analyses | 1 | 1 | 30-50KB | Invalidates all |
| 5 workouts/week + weekly reanalyze | 10+ reads | 1 write | 300KB+ | Poor |

### Proposed (Split)
| Scenario | Reads | Write Ops | Bandwidth | Cache |
|----------|-------|-----------|-----------|-------|
| View profile | 1 | - | 2-5KB | 1hr |
| View analyses (1st time) | 1 | - | 15-20KB | 7 days |
| View analyses (cache hit) | 0 | - | 0KB | Hit |
| View plan (1st time) | 1 | - | 3-5KB | 7 days |
| Regenerate analyses | 1 | 1 write | 15-20KB | Only invalidate analyses |
| 5 workouts/week + weekly reanalyze | 2-3 reads + cache hits | 1 write | 30-40KB | Excellent |

**Cost savings:** ~70-80% reduction in bandwidth for typical user; better cache hit rates

---

## Implementation Plan

### Phase 1: Weekly Plan (Pre-Launch)

#### Files to Update

1. **`src/lib/firestore-server.ts`**
   - Update `updateUserProfile()` to NOT write weeklyPlan
   - Add new function: `updateWeeklyPlan(userId, plan, generatedDate, contextUsed, weekStartDate)`
   - Update weeklyPlan read logic to fetch from subcollection

2. **`src/lib/firestore.service.ts`**
   - Update `useUserProfile()` to NOT return weeklyPlan
   - Add new hook: `useWeeklyPlan()` with 7-day cache
   - Update code that references `userProfile.weeklyPlan` to use separate hook

3. **`src/app/plan/actions.ts`**
   - Update plan generation to call `updateWeeklyPlan()` instead of `updateUserProfile()`

4. **Component updates**
   - Any component reading `userProfile.weeklyPlan` now reads from `useWeeklyPlan()` hook
   - Identify: search for `weeklyPlan` in component files

#### Data Migration
- One-time: Move existing `weeklyPlan` from user documents to `weeklyPlans/current`
  - Create script: `scripts/migrate-weekly-plans.ts`
  - Safe: Can coexist during rollout; old data abandoned

#### Validation
- Existing plans still readable from subcollection
- New generations write to subcollection
- Cache TTL properly set (7 days or until next generation)

---

### Phase 2: Analyses (Pre-Launch or Post-Launch Optimization)

#### Files to Update

1. **`src/lib/firestore-server.ts`**
   - Update `updateUserProfile()` to NOT write analyses
   - Add functions:
     - `updateStrengthAnalysis(userId, result, generatedDate)`
     - `updateLiftProgressionAnalysis(userId, result, generatedDate)` — store all exercises in one doc
     - `updateGoalAnalysis(userId, result, generatedDate)`

2. **`src/lib/firestore.service.ts`**
   - Update `useUserProfile()` to NOT return analyses
   - Add new hooks:
     - `useStrengthAnalysis()` with 14-day cache
     - `useLiftProgressionAnalysis()` with 14-day cache
     - `useGoalAnalysis()` with 14-day cache

3. **Server actions**
   - `src/app/analysis/actions.ts` → call `updateStrengthAnalysis()`
   - `src/app/profile/actions.ts` → call `updateLiftProgressionAnalysis()` and `updateGoalAnalysis()`

4. **Component updates**
   - Search for `strengthAnalysis`, `liftProgressionAnalysis`, `goalAnalysis` in component files
   - Update to use new hooks

#### Data Migration
- Similar to Phase 1: Move existing analyses to subcollection
- Create script: `scripts/migrate-analyses.ts`

#### Cache Strategy
- Analyses unchanged for 14 days (regenerated every couple weeks)
- User views post-workout benefit from cache, not repeated reads

---

## Firestore Security Rules Updates

No changes needed initially—existing rules allow reads/writes to subcollections under `/users/{userId}/*`:

```firestore
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;

  match /{subcollection=**} {
    allow read, write: if request.auth.uid == userId;
  }
}
```

Subcollections are covered by the recursive `{subcollection=**}` rule.

---

## Rollback Plan

### Phase 1 Rollback
If weekly plan split causes issues:
1. Revert plan generation to write to `updateUserProfile()`
2. Add migration script to consolidate back to user document
3. Disable reads from subcollection; read from user doc instead

### Phase 2 Rollback
Same approach: revert writes to user document, disable subcollection reads.

**Note:** Since these are additive (not destructive), rollback is straightforward.

---

## Testing Checklist

### Phase 1
- [ ] Existing weekly plans still readable after migration
- [ ] New plan generation writes to subcollection
- [ ] Plan cache invalidates on new generation
- [ ] Components display plan correctly from new hook
- [ ] Firestore rules allow reads/writes to subcollection
- [ ] Performance: verify plan reads are cached after 1st read

### Phase 2
- [ ] Existing analyses migrated to subcollection
- [ ] New analysis generation writes to subcollection
- [ ] Reanalyze button works (updates document, invalidates cache)
- [ ] Analysis pages load correctly from new hooks
- [ ] Cache behavior: repeated views don't re-fetch (cache hit)
- [ ] Aggressive weekly reanalyze: only analyses write, plan/profile untouched

---

## Decision: Phase 1 Only or Both?

### Phase 1 Only (Recommended Pre-Launch)
**Effort:** ~2-3 hours
**Impact:** ~40% bandwidth reduction from plan bloat; plan caching
**Risk:** Very low

### Phase 1 + Phase 2 (Complete optimization)
**Effort:** ~4-5 hours
**Impact:** ~70-80% bandwidth reduction; excellent cache efficiency
**Risk:** Low (but more surface area)

**Recommendation:** Do both before launch. Cost savings compound when you have hundreds of users viewing analyses 5-6 times/week.

---

## Related Tasks
- Add Firestore cost monitoring in prod (P1: Performance & Cost Control)
- Set up alerts if read/write ops spike unexpectedly
- Monitor cache hit rates post-launch to validate assumptions

---

## Timeline
- **Phase 1**: 2-3 hours dev + testing
- **Phase 2**: 2 hours additional dev + testing
- **Migration scripts**: 1 hour (dry-run + staging validation)
- **Total:** ~5-6 hours before launch to prevent cost surprises
