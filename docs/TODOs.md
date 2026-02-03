# TODOs (Consumer-Ready)

This is a prioritized sweep of what remains before a consumer-ready launch.

## P0: Data & Core Functionality

- ✅ Exercise library migration: implement Phases 1–6 in `docs/firebase-exercise-lib.md`
- ✅ Migration scripts: add and run `scripts/migrate-exercises.ts` (dry run + staging + prod)
- ✅ Firestore rules: add read-only rules for shared exercise collections + required indexes
- ✅ Backwards compatibility verification for existing logs/PRs after migration
- ✅ Screenshot parsing updates (workouts + PRs) for EGYM -> machine detection per `docs/firebase-exercise-lib.md`
- (Optional) Expand exercise library after migration verification (smith machine, preacher curl, etc.)

## P0: Reliability & Observability

- Centralize server error logging with request context (user ID, route, feature)
- Add client-side error boundaries for critical routes (History, Analysis, Plan)
- Capture and classify AI errors (quota, overload, validation) consistently
- Add basic uptime/health check and log it in hosting monitoring

## PO.5: Collections-split.md
- /Users/lisagu/Projects/fitnessai-1/docs/collections-split.md

## P1: Security & Privacy

- Review Firestore rules against every collection and subcollection in use
- Verify session cookie handling and secure flags in production
- Add input validation on all server actions (Zod schemas where missing)
- Add audit logging for admin-only scripts (migrations, data fixes)

## P1: Testing & QA

- Add `npm run test` pipeline (unit + minimal integration)
- Smoke tests for:
  - auth sign-in/out and profile creation
  - workout log creation/edit/delete
  - screenshot parsing for workout logs and PRs
  - strength analysis + plan generation
- Add CI checks: `lint`, `typecheck`, `build`

## P1: Performance & Cost Control 

- Add caching + TTL verification for exercise registry reads
- Monitor Firestore read/write costs in prod (dashboard + alerts)
- Add rate limits for AI features (already present) and confirm limits in prod

## P2: Product & Operations

- App store-grade UX polish passes (empty states, error copy, edge cases)
- Add in-app help/FAQ and user-facing troubleshooting for AI failures
- Verify onboarding flow and first-session success path (log 1 workout, view analysis)

- Create production runbook (deploy, rollback, incident handling)
- Add analytics to measure feature usage and drop-offs
- Add user support path (feedback / contact)

## P2: Billing (Not started)

- Decide billing provider and model (subscriptions vs usage)
- Gate AI-heavy features behind billing tiers
- Add pricing page and plan enforcement

## Deferred

- Admin UI for managing the exercise library (post-migration)
