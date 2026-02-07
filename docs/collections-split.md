# Firebase Collections Split Plan (P1.5)

## Executive Summary

Today, the app stores weekly plans and AI analyses on the main user profile document (`/users/{userId}`). That makes the profile payload larger than it needs to be and increases bandwidth/reads whenever the profile is fetched.

**Recommendation:** Split `weeklyPlan` (Phase 1) and optionally split analyses (Phase 2) into subcollections under `/users/{userId}`.

This plan is written to match the current codebase as of **2026-02-07**:
- Plan generation is an AI call in `src/app/plan/actions.ts`.
- Plan persistence currently happens client-side in `src/hooks/usePlanGeneration.ts` via `useUpdateUserProfile()` (server action in `src/app/profile/actions.ts`).
- Strength/goals/lift progression analyses are persisted via server actions (`src/app/analysis/actions.ts`, `src/app/profile/actions.ts`) into `updateUserProfile()` in `src/lib/firestore-server.ts`.

---

## Current Structure (What We Have Now)

### User Profile Document (`/users/{userId}`)

The user document currently contains:
- core profile fields (age, gender, height/weight, experience, etc.)
- `fitnessGoals` (keep on profile; small + required across the app)
- AI outputs:
  - `weeklyPlan` (includes `plan` and `contextUsed`)
  - `strengthAnalysis`
  - `goalAnalysis`
  - `liftProgressionAnalysis` (keyed by normalized exercise)
- `aiUsage` counters

### Why This Is A Problem

Even with caching (client `useUserProfile()` has `staleTime: 1h`), the user doc is:
- larger than needed for most screens
- more expensive to transmit on every cache miss
- more likely to invalidate/refresh when any large field changes

The biggest avoidable payload today is typically `weeklyPlan.contextUsed` (can be long).

### Important: The Profile Is Effectively Fetched Everywhere

In the current UI, `useUserProfile()` is used on multiple pages and in shared UI (notably the bottom navigation).
That means the profile document is effectively part of the "global" data load for signed-in users: you will pay a
profile read regularly (typically 1/hour per tab due to React Query cache settings) and you will download the full
document payload when it does fetch.

---

## Proposed Structure (Target)

### Phase 1: Weekly Plan Subcollection

Move weekly plan out of the user doc into:

`/users/{userId}/weeklyPlans/current`
- `plan: string`
- `generatedDate: Timestamp`
- `weekStartDate: string` (YYYY-MM-DD)
- `contextUsed?: string` (optional, consider truncation or omission)

### Phase 2 (Optional): Analyses Subcollection

Move analyses into:

`/users/{userId}/analyses/strength`
- `result`
- `generatedDate`

`/users/{userId}/analyses/goals`
- `result`
- `generatedDate`

`/users/{userId}/analyses/liftProgression`
- `exercises: { [normalizedExerciseName]: { result, generatedDate } }`
- `lastUpdated`

---

## Phase 1 Implementation Plan (Weekly Plan Split)

### 1) Server Storage Helpers (`src/lib/firestore-server.ts`)

Add server-only functions:
- `getWeeklyPlan(userId): Promise<StoredWeeklyPlan | null>`
- `updateWeeklyPlan(userId, plan: StoredWeeklyPlan): Promise<void>`

**Backwards compatibility (important):**
- `getWeeklyPlan()` should:
  1. read `/users/{userId}/weeklyPlans/current` first
  2. if missing, fallback to reading `/users/{userId}.weeklyPlan`
  3. (optional) backfill: if fallback is used, write it once into `weeklyPlans/current`

**Write policy:**
- New writes should go to `/weeklyPlans/current`.
- Do not rely on clearing `users/{userId}.weeklyPlan` immediately; it can be left in place during rollout.

### 2) Server Actions (new) for Client to Call

Create plan-specific server actions (recommended location: `src/app/plan/actions.ts`):
- `getWeeklyPlanAction(userId)` -> calls `getWeeklyPlan()`
- `saveWeeklyPlanAction(userId, plan)` -> validates (Zod) then calls `updateWeeklyPlan()`

Rationale:
- The current plan is saved via the profile update server action, but splitting storage is cleaner if plan reads/writes are their own server actions.
- Keeps `src/app/profile/actions.ts` focused on core profile updates.

### 3) Client Hooks (`src/lib/firestore.service.ts`)

Add React Query hooks:
- `useWeeklyPlan()` -> calls `getWeeklyPlanAction()`
  - cache `staleTime` can be long (e.g. 7 days) because plans are regenerated intentionally
- `useSaveWeeklyPlan()` -> calls `saveWeeklyPlanAction()`
  - invalidate `useWeeklyPlan()` on success

### 4) Update the Writer Path (Plan Save)

Update `src/hooks/usePlanGeneration.ts`:
- Replace `useUpdateUserProfile().mutate({ weeklyPlan: ... })`
- With `useSaveWeeklyPlan().mutate(planDoc)`

Keep `generateWeeklyWorkoutPlanAction()` unchanged (it generates; it does not persist).

### 5) Update the Reader Path (Plan Screen)

Update `src/app/plan/page.tsx` and plan components:
- Stop reading `userProfile?.weeklyPlan`
- Read from `useWeeklyPlan()`

### 6) Optional: Reduce Stored Payload

Consider one of:
- do not store `contextUsed` in production, or
- store a truncated version (e.g., first N characters)

This is an immediate cost/bandwidth improvement even without Phase 2.

---

## Phase 2 Implementation Plan (Analyses Split, Optional)

Only do this if Phase 1 is shipped cleanly and you still see meaningful bloat/cost from analyses.

### Storage + Server Actions

Add server-only helpers in `src/lib/firestore-server.ts`:
- `getStrengthAnalysis(userId)` / `updateStrengthAnalysis(userId, payload)`
- `getGoalAnalysis(userId)` / `updateGoalAnalysis(userId, payload)`
- `getLiftProgressionAnalysis(userId)` / `updateLiftProgressionAnalysis(userId, payload)`

Add corresponding server actions (suggested locations):
- Strength: `src/app/analysis/actions.ts`
- Goals/Lift progression: `src/app/profile/actions.ts`

### Update Call Sites

Replace:
- `updateUserProfile(userId, { strengthAnalysis: ... })`
- `updateUserProfileFromServer(userId, { goalAnalysis: ... })`
- `updateUserProfileFromServer(userId, { liftProgressionAnalysis: ... })`

With the new analysis-specific update functions writing to subcollection docs.

### Client Read Path

Update `src/app/analysis/page.tsx` and any profile-related analysis views to read analyses from new hooks instead of the profile document.

### Backwards Compatibility

Mirror the Phase 1 pattern:
- read new doc first, fallback to old profile fields
- optional one-time backfill when fallback is used

---

## Firestore Rules

No rules changes should be required if subcollections under `/users/{userId}` are already covered.

In `firestore.rules`, `/users/{userId}` already has a wildcard rule:
- `match /{document=**} { allow read, write: if isOwner(userId); }`

So:
- `/users/{userId}/weeklyPlans/*`
- `/users/{userId}/analyses/*`

should be permitted for the owner.

---

## Rollout / Migration Strategy (Recommended)

Avoid a hard migration cutover. You can ship this without any mandatory migration.

1. Ship new reads with fallback (new doc -> old field).
2. Ship new writes to new doc.
3. Leave legacy data in place (no data deletion required).
4. Optional: backfill lazily on read fallback (only if you care about moving old data forward without requiring user regeneration).
5. After confidence, optionally clean up old fields later.

This keeps rollback simple and reduces risk.

### What Happens To Existing Users / Old Data?

You have two valid choices:

1. **No migration, regeneration-driven (lowest effort):**
   - Change the code so new plans/analyses write to subcollections.
   - Keep fallback reads from the legacy fields on `/users/{userId}`.
   - Old `weeklyPlan`/analysis fields can remain forever; users will naturally overwrite with new generations over time.
   - This is enough if you're OK with legacy users continuing to see their last stored plan/analysis until they regenerate.

2. **Lazy backfill (still no migration script):**
   - When a user loads a screen and fallback reads legacy data, write it once into the new subcollection doc.
   - This progressively moves active users without a one-time migration job.

In both cases, you do not need to run a migration script unless you want to guarantee that *all* users have their
data moved immediately.

---

## Testing Checklist

### Phase 1
- [ ] Plan page loads when only legacy `users/{userId}.weeklyPlan` exists (fallback works)
- [ ] New plan generation persists to `/users/{userId}/weeklyPlans/current`
- [ ] Plan page reads from subcollection after save
- [ ] Cache behavior: subsequent navigations do not re-fetch unnecessarily
- [ ] No Firestore rules errors for weeklyPlans paths

### Phase 2 (if done)
- [ ] Analysis generation writes to the new docs
- [ ] Analysis pages read from new docs
- [ ] Reanalyze overwrites only the analysis doc, not the core profile doc
- [ ] Fallback/backfill works for existing users

---

## Timeline

- Phase 1: ~2-4 hours dev + verification (depends on how many components read `weeklyPlan`)
- Phase 2: ~4-6 hours dev + verification (more surfaces)
