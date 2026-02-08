# TODOs (Consumer-Ready)

This is a prioritized sweep of what remains before a consumer-ready launch.

---

## 🚀 PRE-LAUNCH CHECKLIST

### Security & Secrets
- [ ] Revoke exposed Firebase API key: `AIzaSyAAUUJ0WzE1KIaBm_UUwQJ23nWx7d3czC4`
- [ ] Create new Firebase API key for dev-dummy project
- [ ] Revoke exposed Gemini API key: `AIzaSyC_D6jzN2vRubVKFhBGQOmUJGDQFO2vnbc`
- [ ] Create new Gemini API key
- [ ] Add GitHub Secrets (all Firebase config values)
- [ ] Set production environment variables in Firebase App Hosting (not in `.env.production.local`)

### Code Quality
- [ ] All lint checks passing (`npm run lint`)
- [ ] All typecheck passing (`npm run typecheck`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Smoke tests passing (9/11, 2 non-critical timeouts acceptable)

### Documentation
- [ ] Deployment procedure documented in `docs/ops-runbook.md` ✅
- [ ] Incident playbooks documented ✅
- [ ] P2.1 findings documented in `docs/P2.1-FINDINGS.md` ✅
- [ ] Help/FAQ page created at `/help` ✅
- [ ] Support page created at `/support` ✅

### Features & UX
- [ ] File size validation on uploads (10MB max) ✅
- [ ] Confirmation dialogs for destructive actions ✅
- [ ] Support contact email visible in Profile page ✅
- [ ] Feedback form functional and saves to Firestore ✅
- [ ] Error messages include "Contact Support" link ✅

### Pre-Deployment
- [ ] Review Firestore rules for production settings
- [ ] Test smoke tests with prod credentials (in staging if available)
- [ ] Verify all email notifications working (password reset, feedback, etc.)
- [ ] Set up monitoring alerts in Cloud Logging
- [ ] Configure uptime check and health endpoint
- [ ] Document on-call rotation and escalation contacts

### During Deployment
- [ ] Have rollback procedure ready (`docs/ops-runbook.md`)
- [ ] Monitor error logs for 30 minutes post-deploy
- [ ] Run manual smoke test after deployment
- [ ] Verify health check endpoint returns `ok`

### Post-Launch (First Week)
- [ ] Monitor Firestore costs and alert thresholds
- [ ] Monitor error rates and spike detection
- [ ] Gather user feedback from early users
- [ ] Plan Phase 2 work (analytics, advanced UX)

---

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

### Phase 1: Launch Blockers ✅ COMPLETE

- ✅ **P2.1: Onboarding Verification** - Comprehensive testing & findings in `/docs/P2.1-FINDINGS.md`
  - ✅ Smoke tests executed (9/11 passing, 2 non-critical timeouts)
  - ✅ Manual end-to-end onboarding tested (sign-up → profile → workout → analysis)
  - ✅ Error scenarios validated
  - ✅ Data persistence verified
  - **Status**: Onboarding is production-ready

- ✅ **P2.2: User Support Path** - Contact email + feedback form
  - ✅ Support page with feedback form at `/support`
  - ✅ Feedback server actions save to Firestore
  - ✅ Support email link: `support@fitnessai.app`
  - ✅ Support section in Profile page

- ✅ **P2.3: Critical UX Fixes**
  - ✅ File size validation (10MB max) on screenshot uploads
  - ✅ Confirmation dialogs for destructive actions (Clear All Records, Delete Workout)
  - ✅ Improved empty state (WorkoutList with icon + messaging)
  - ✅ Error handler includes "Contact Support" button

- ✅ **P2.4: Deployment Procedure** - Production runbook complete
  - ✅ Pre-deployment checklist documented
  - ✅ Deployment commands (Firebase CLI and Console)
  - ✅ Post-deployment verification steps
  - ✅ Rollback procedure with commands
  - ✅ 5 incident playbooks: Firestore, AI API, High Error Rate, Auth Failures, Performance

### Phase 2: Launch Essentials 🔄 IN PROGRESS

- ✅ **P2.5: Help/FAQ Page** - Created at `/help` with 30+ FAQs
  - ✅ Organized by category: Getting Started, Workout Logging, Analysis, PRs, Troubleshooting, Account
  - ✅ Collapsible accordion for each question
  - ✅ Links back to Support page

- ⏳ **P2.6: UX Polish - Empty States** (skeleton loaders, optimizations)
  - [ ] Skeleton loaders for History page
  - [ ] Additional empty state improvements

- ⏳ **P2.7: Ops Runbook - Incident Playbooks** (already done in P2.4! ✅)

### Phase 3: Growth Enablers (Post-Launch)

- ⏳ **P2.8: Analytics Platform Integration** - Not started
  - [ ] Choose platform (Posthog or GA4)
  - [ ] Implement tracking script

- ⏳ **P2.9: Analytics Event Tracking** - Not started
  - [ ] Track onboarding events
  - [ ] Track feature usage
  - [ ] Track drop-off points

### Phase 4: Maturity (Post-Scale)

- ⏳ **P2.10: Advanced UX Polish** - Not started
  - [ ] Success animations
  - [ ] Optimistic UI updates

- ⏳ **P2.11: Disaster Recovery** - Not started
  - [ ] Backup/restore procedures
  - [ ] On-call rotation

## P2: Billing (Not started)

- Decide billing provider and model (subscriptions vs usage)
- Gate AI-heavy features behind billing tiers
- Add pricing page and plan enforcement

## Deferred
- Adding support email/form destinations
- Admin UI for managing the exercise library (post-migration)
- (Optional) Expand exercise library (smith machine, preacher curl, cable glute kickbacks, etc.)
- **Collections Split Final Cleanup** - Remove old fields from user profile document (final optimization step, safe because fallback/backfill completed in prod)
  - Delete `weeklyPlan` field from `/users/{userId}`
  - Delete `strengthAnalysis` field from `/users/{userId}`
  - Delete `goalAnalysis` field from `/users/{userId}`
  - Delete `liftProgressionAnalysis` field from `/users/{userId}`
  - Delete `fitnessGoals` field from `/users/{userId}`
  - Timeline: Can be done anytime (no user impact, data safely in new locations)
  - See `/Users/lisagu/Projects/fitnessai-1/docs/collections-split.md` for safe removal strategy
