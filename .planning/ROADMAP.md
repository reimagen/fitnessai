# FitnessAI Consumer-Ready Launch — Roadmap

**Status:** Draft (awaiting user approval)
**Created:** 2026-02-05
**Depth:** Comprehensive (10 phases)
**Core Value:** Users can safely log workouts and get AI insights without security leaks or unexpected costs.

---

## Overview

This roadmap maps 21 v1 requirements to 10 delivery phases. Each phase delivers a coherent, verifiable capability and maps to exactly one requirement (or group of related requirements). Phases respect dependency order: security foundation first, then testing, then cost control. Testing and security run in parallel where possible.

---

## Phases

### Phase 1: Firestore Security Hardening

**Goal:** Enforce user-isolated data access with strong authentication and authorization rules, preventing anonymous and cross-user access.

**Requirements:**
- SEC-01: Firestore rules enforce user isolation — users can only read/write their own data
- SEC-02: Firestore rules prevent anonymous access — all collections require authentication
- SEC-06: Exercise library writes are restricted to admin-only operations
- SEC-07: User profile data (weight, goals, etc.) is user-isolated in Firestore rules

**Dependencies:**
- None (foundation phase)

**Success Criteria:**
1. Firestore rules verified in console: authenticated users can read only their own documents, write only to paths matching UID
2. Anonymous requests to any collection are rejected with permission denied error
3. Non-admin users cannot write to exercises collection (read-only access)
4. User profile data reads/writes scoped to request.auth.uid in rules
5. Firestore rules tested manually with incorrect UID and verified to deny access

**Estimated Effort:** 2-3 days

---

### Phase 2: Server Action Input Validation

**Goal:** All server actions validate input with Zod schemas, preventing unvalidated requests from reaching business logic.

**Requirements:**
- SEC-04: All server actions validate input with Zod schemas (no unvalidated inputs)

**Dependencies:**
- Phase 1 (security foundation)

**Success Criteria:**
1. All server actions in `src/app/*/actions.ts` (history, prs, analysis, plan, profile) have Zod schema validation for inputs
2. Invalid inputs are rejected at entry point, returning validation error response before business logic
3. Zod parse errors are caught and logged without exposing internal error details to client
4. Manual test: Send malformed data to server action and verify rejection

**Estimated Effort:** 2-3 days

---

### Phase 3: Audit Logging & Admin Controls

**Goal:** Admin scripts and sensitive operations log audit trails (who did what, when), enabling accountability and forensics.

**Requirements:**
- SEC-05: Admin scripts (migrations, data fixes) log audit trail (who did what, when)

**Dependencies:**
- Phase 1 (Firestore rules restrict admin operations)

**Success Criteria:**
1. Admin scripts (e.g., exercise migrations in Firebase console or CLI) log entry to Cloud Logging with action type, user ID, timestamp, data modified
2. Audit logs include before/after snapshots for sensitive changes (exercise deletions, bulk updates)
3. Health check endpoint can verify audit logs are being written
4. Manual test: Run exercise migration script and verify audit entry appears in Cloud Logging

**Estimated Effort:** 1-2 days

---

### Phase 4: Session & Cookie Security

**Goal:** Session cookies verified for production: secure flags, expiry, and safe handling across browser sessions.

**Requirements:**
- SEC-03: Session cookies have secure flags and appropriate expiry in production

**Dependencies:**
- Phase 1 (authentication layer)

**Success Criteria:**
1. Session cookie uses HttpOnly flag (JavaScript cannot access)
2. Session cookie uses Secure flag (HTTPS only in production)
3. Session cookie has max-age or expires set appropriately (e.g., 7 days)
4. Session cookie path scoped to application root
5. Manual test in production environment: Verify cookie flags via DevTools; refresh browser; confirm session persists

**Estimated Effort:** 1-2 days

---

### Phase 5: Critical Path Testing (Core Workflows)

**Goal:** End-to-end smoke tests verify core user journeys work without error: sign up → log → analyze.

**Requirements:**
- TEST-01: User can sign up with email/password and receive verification email
- TEST-02: User can log in and session persists across browser refresh
- TEST-03: User can create profile with stats (age, weight, height, muscle mass)
- TEST-04: User can log workout with multiple exercises and sets/reps
- TEST-05: User can view lift progression chart and receive AI analysis
- TEST-06: User can view strength balance analysis with recommendations
- TEST-07: User can log personal record and see it reflected in analysis

**Dependencies:**
- Phase 1, 2, 4 (security baseline)

**Success Criteria:**
1. Sign-up flow completes: user can register with email/password; verification email received
2. Login flow works: user can log in with credentials; session persists after browser refresh; user is redirected to dashboard
3. Profile creation works: user can input stats; data saved to Firestore; profile page displays correct values
4. Workout logging works: user can log exercise with multiple sets/reps; workout appears in history; exercise names resolve correctly
5. Lift progression analysis works: user can select a lift; AI analysis completes; chart displays trend and recommendation
6. Strength balance analysis works: user can view analysis; AI identifies imbalances; recommendations display
7. PR logging works: user can log PR; it appears in PR list; analysis updates to reflect new PR

**Estimated Effort:** 4-6 days

---

### Phase 6: Error Path & Rate Limit Testing

**Goal:** Verify error boundaries catch failures gracefully and rate limits prevent excessive AI feature usage without crashing UI.

**Requirements:**
- TEST-08: Error boundaries catch errors without crashing page (History, Analysis, Plan)
- TEST-09: Rate limits prevent exceeding AI feature quotas (graceful degradation)

**Dependencies:**
- Phase 5 (core workflows established)

**Success Criteria:**
1. Error boundaries on History, Analysis, Plan pages catch errors and display fallback UI instead of blank page
2. Card-level error boundaries catch individual card errors without affecting whole page
3. Manual test: Trigger error in component (e.g., invalid data) and verify fallback UI appears with retry button
4. Rate limit exceeded gracefully: user hits daily limit on analysis, receives error message, can still use other features
5. Graceful degradation: when AI feature is unavailable or rate-limited, user sees error explanation, not blank state
6. Rate limit logging: each rate limit hit is logged to Cloud Logging for monitoring

**Estimated Effort:** 2-3 days

---

### Phase 7: CI/CD Pipeline

**Goal:** Automated CI pipeline runs lint, typecheck, and build checks on every commit, catching issues before deployment.

**Requirements:**
- TEST-10: CI pipeline runs lint, typecheck, build checks on every commit

**Dependencies:**
- Phase 2 (code quality foundation)

**Success Criteria:**
1. CI pipeline configured (GitHub Actions, Vercel, or equivalent) to run on every push
2. Pipeline includes: lint (ESLint), typecheck (tsc), build check (next build)
3. Pipeline prevents merge if any check fails
4. Manual test: Push code with lint error or type error; CI catches it; build status shown as failed
5. Build times measured and logged (baseline for future optimization)

**Estimated Effort:** 1-2 days

---

### Phase 8: Cost Monitoring & Baseline

**Goal:** Firestore and AI feature costs are monitored in Cloud Logging, and baseline established to distinguish normal from abnormal usage.

**Requirements:**
- COST-01: Firestore read/write costs are monitored and baselined
- COST-04: Cost baseline established before test user phase (know what's normal)

**Dependencies:**
- Phase 1 (observability infrastructure in place)

**Success Criteria:**
1. Health check endpoint or monitoring dashboard tracks daily Firestore read/write counts
2. Cloud Logging tracks read/write operations per feature (analysis, history, prs, plan)
3. Cost baseline calculated: baseline read count, write count, AI request count per active user per day
4. Alert configured if read/write usage exceeds 2x baseline (early warning)
5. Manual test: Run critical path workflow; verify counts are logged

**Estimated Effort:** 1-2 days

---

### Phase 9: Cost Optimization (Caching)

**Goal:** Exercise library caching prevents redundant Firestore queries, reducing read costs.

**Requirements:**
- COST-02: Exercise library caching prevents redundant Firestore queries

**Dependencies:**
- Phase 8 (baseline established to measure improvement)

**Success Criteria:**
1. Exercise library fetch cached for 5 minutes or longer (configurable TTL)
2. Cache used across components (single fetch per page load, not per component)
3. Cache invalidated when admin updates exercises
4. Monitoring shows read count reduction (compare pre/post baseline)
5. Manual test: Reload analysis page twice; verify exercise library fetched once, cached second time

**Estimated Effort:** 1-2 days

---

### Phase 10: Cost Control (Rate Limits)

**Goal:** Rate limits enforced on AI features to prevent runaway costs when users or attackers make many requests.

**Requirements:**
- COST-03: Rate limits for AI features are enforced (prevent runaway costs)

**Dependencies:**
- Phase 8 (baseline established)

**Success Criteria:**
1. Rate limits enforced and logged for each AI feature: prParses (5/day), screenshotParses (10/day), liftProgressionAnalyses (20/day), strengthAnalyses (20/day), weeklyPlans (5/day)
2. Rate limit hits logged to Cloud Logging with user ID and feature
3. Rate limit state persisted across server restarts (Redis or Firestore, not in-memory only)
4. Manual test: Hit rate limit; verify next request denied; user sees clear error message
5. Monitoring dashboard shows daily rate limit hits per feature

**Estimated Effort:** 1-2 days

---

## Phase Dependencies & Execution Order

**Security Foundation (Parallel):**
- Phase 1 (Firestore rules) → Phase 2 (validation) → Phase 3 (audit) → Phase 4 (cookies)

**Testing (Sequential):**
- Phase 5 (critical path) → Phase 6 (error paths) → Phase 7 (CI/CD)

**Cost Control (Sequential):**
- Phase 8 (baseline) → Phase 9 (caching) → Phase 10 (rate limits)

**Critical Path for Launch:**
- Phase 1 → Phase 2 → Phase 4 → Phase 5 → Phase 8 (minimum viable security/testing/cost baseline)

---

## Requirement Coverage

| Requirement | Phase | Category | Status |
|-------------|-------|----------|--------|
| SEC-01 | 1 | Security | Pending |
| SEC-02 | 1 | Security | Pending |
| SEC-03 | 4 | Security | Pending |
| SEC-04 | 2 | Security | Pending |
| SEC-05 | 3 | Security | Pending |
| SEC-06 | 1 | Security | Pending |
| SEC-07 | 1 | Security | Pending |
| TEST-01 | 5 | Testing | Pending |
| TEST-02 | 5 | Testing | Pending |
| TEST-03 | 5 | Testing | Pending |
| TEST-04 | 5 | Testing | Pending |
| TEST-05 | 5 | Testing | Pending |
| TEST-06 | 5 | Testing | Pending |
| TEST-07 | 5 | Testing | Pending |
| TEST-08 | 6 | Testing | Pending |
| TEST-09 | 6 | Testing | Pending |
| TEST-10 | 7 | Testing | Pending |
| COST-01 | 8 | Cost | Pending |
| COST-02 | 9 | Cost | Pending |
| COST-03 | 10 | Cost | Pending |
| COST-04 | 8 | Cost | Pending |

**Coverage:** 21/21 requirements mapped ✓

---

## Progress Tracking

Track completion by phase:

| Phase | Goal | % Complete | Blockers |
|-------|------|------------|----------|
| 1 | Firestore Security Hardening | 0% | — |
| 2 | Server Action Input Validation | 0% | Phase 1 |
| 3 | Audit Logging & Admin Controls | 0% | Phase 1 |
| 4 | Session & Cookie Security | 0% | Phase 1 |
| 5 | Critical Path Testing | 0% | Phase 1, 2, 4 |
| 6 | Error Path & Rate Limit Testing | 0% | Phase 5 |
| 7 | CI/CD Pipeline | 0% | Phase 2 |
| 8 | Cost Monitoring & Baseline | 0% | Phase 1 |
| 9 | Cost Optimization (Caching) | 0% | Phase 8 |
| 10 | Cost Control (Rate Limits) | 0% | Phase 8 |

---

## Next Steps

1. **User Approval:** Review roadmap structure, phase goals, success criteria. Provide feedback or approve.
2. **Phase Planning:** For approved Phase 1 (Firestore Security), run `/gsd:plan-phase 1` to decompose into executable tasks.
3. **Execution:** Implement and validate success criteria.
4. **Phase Progression:** Move to next phase after current phase success criteria met.

---

*Roadmap created: 2026-02-05 by GSD roadmapper*
