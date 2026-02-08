# TODOs (Consumer-Ready)

This is a prioritized sweep of what remains before a consumer-ready launch.

## P0: Data & Core Functionality

- ✅ Exercise library migration: implement Phases 1–6 in `docs/firebase-exercise-lib.md`
- ✅ Migration scripts: add and run `scripts/migrate-exercises.ts` (dry run + staging + prod)
- ✅ Firestore rules: add read-only rules for shared exercise collections + required indexes
- ✅ Backwards compatibility verification for existing logs/PRs after migration
- ✅ Screenshot parsing updates (workouts + PRs) for EGYM -> machine detection per `docs/firebase-exercise-lib.md`

## P0: Reliability & Observability

- ✅ Centralize server error logging with request context (user ID, route, feature)
- ✅ Add client-side error boundaries for critical routes (History, Analysis, Plan)
- ✅ Capture and classify AI errors (quota, overload, validation) consistently
- ✅ Add basic uptime/health check and log it in hosting monitoring

## P1: Security & Privacy

- ✅ Review Firestore rules against every collection and subcollection in use
- ✅ Verify session cookie handling and secure flags in production (strict sameSite, httpOnly)
- ✅ Add input validation on all server actions (Zod schemas where missing)
- ✅ Add audit logging for admin-only scripts (migrations, data fixes)

## P1: Testing & QA

- ✅ Add `npm run test` pipeline (unit + minimal integration)
- ✅ Add CI checks: `lint`, `typecheck`, `build`

## P1: Performance & Cost Control 

- ✅ Add caching + TTL verification for exercise registry reads
- Monitor Firestore read/write costs in prod (dashboard + alerts)
- ✅ Add rate limits for AI features (verified coverage via script; production limit-hit testing still pending)
- ✅ Smoke tests for:
  - ✅ auth sign-in/out and profile creation
  - ✅ workout log creation/edit/delete
  - ✅ screenshot parsing for workout logs and PRs
  - ✅ strength analysis + plan generation
  - ✅ GitHub Actions CI integration (runs on PRs to main)

## P1.5: Collections Split (Firebase Optimization) - COMPLETE ✅
- ✅ **Phase 1: Weekly Plans** - Move `weeklyPlan` from user profile to `/users/{userId}/weeklyPlans/current` subcollection
  - ✅ Add weeklyPlanConverter for Timestamp handling
  - ✅ Implement getWeeklyPlan (with fallback + lazy backfill), saveWeeklyPlan, deleteWeeklyPlan
  - ✅ Add server actions with Zod validation
  - ✅ Add React Query hooks with optimized caching (5 min staleTime)
  - ✅ Update components to use new data path
  - ✅ Context truncation to 500 chars to reduce document size
  - ✅ Full backwards compatibility via lazy backfill
- ✅ **Phase 2: Analyses Split** - Move strength/goal/lift progression analyses to subcollections
  - ✅ Move `strengthAnalysis` to `/users/{userId}/strengthAnalyses/{id}`
  - ✅ Move `goalAnalysis` to `/users/{userId}/goalAnalyses/{id}`
  - ✅ Move `liftProgressionAnalysis` to `/users/{userId}/liftProgressionAnalyses/{exerciseName}`
  - ✅ Add server functions with fallback + lazy backfill
  - ✅ Add React Query hooks with optimized caching
  - ✅ Update components to read from new hooks (GoalSetterCard, StrengthBalanceCard, etc.)
  - ✅ Fix cache invalidation to ensure fresh data displays immediately
- ✅ **Phase 3: Fitness Goals Split** - Move `fitnessGoals` to `/users/{userId}/goals/preferences`
  - ✅ Server functions with fallback + lazy backfill
  - ✅ React Query hooks with optimized caching
  - ✅ Components updated to use new hooks

## P2: Product & Operations

- App store-grade UX polish passes (empty states, error copy, edge cases)
- Add in-app help/FAQ and user-facing troubleshooting for AI failures
- Verify onboarding flow and first-session success path (log 1 workout, view analysis)

- Create production runbook (deploy, rollback, incident handling) - partially complete for error handling in /Users/lisagu/Projects/fitnessai-1/docs/ops-runbook.md
- Add analytics to measure feature usage and drop-offs
- Add user support path (feedback / contact)

## P2: Billing (Not started)

- Decide billing provider and model (subscriptions vs usage)
- Gate AI-heavy features behind billing tiers
- Add pricing page and plan enforcement

## Deferred

- Admin UI for managing the exercise library (post-migration)
- (Optional) Expand exercise library (smith machine, preacher curl, etc.)
- **Collections Split Final Cleanup** - Remove old fields from user profile document (final optimization step, safe because fallback/backfill completed in prod)
  - Delete `weeklyPlan` field from `/users/{userId}`
  - Delete `strengthAnalysis` field from `/users/{userId}`
  - Delete `goalAnalysis` field from `/users/{userId}`
  - Delete `liftProgressionAnalysis` field from `/users/{userId}`
  - Delete `fitnessGoals` field from `/users/{userId}`
  - Timeline: Can be done anytime (no user impact, data safely in new locations)
  - See `/Users/lisagu/Projects/fitnessai-1/docs/collections-split.md` for safe removal strategy
