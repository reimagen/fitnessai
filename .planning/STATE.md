# FitnessAI — Project State & Memory

**Last Updated:** 2026-02-06T03:58Z
**Current Phase:** 1 of 10 - Firestore Security Hardening (in progress)
**Overall Status:** Phase 1 Plan 01-01 complete; ready for Plan 01-02 (emulator testing)

---

## Project Reference

**Core Value:** Users can safely log workouts and get AI insights without security leaks or unexpected costs.

**Current Context:**
- FitnessAI is a fitness tracking app built with Next.js 16, Firebase, and Genkit AI
- P0 (data + reliability) is shipped and working
- This roadmap focuses on P1 (security, testing, cost control) before public launch
- Target: Pass security review, establish test baseline, measure and control costs

**Key Constraint:** Launch only after security hardening + critical path testing + cost baseline established.

---

## Current Position

**Phase 1 - Firestore Security Hardening**
- Plan 1.1: COMPLETE (Stage 1 rules for user isolation)
- Plan 1.2: COMPLETE (User isolation verification)
- Plan 1.3: COMPLETE (Stage 2 exercises & custom exercises rules)
- Next: Plan 1.4 (Combined Stage 1+2 emulator testing)
- Overall phase progress: 3/5 plans complete (estimated)

**Roadmap Status:**
- 10 phases identified
- 21/21 requirements mapped
- Phases ordered by dependency (security → testing → cost)
- Phase 1 execution in progress (started 2026-02-06)
- Estimated to complete Phase 1 by end of 2026-02-06

**Phase Ordering:**
1. Phase 1: Firestore Security Hardening (SEC-01, SEC-02, SEC-06, SEC-07)
2. Phase 2: Server Action Input Validation (SEC-04)
3. Phase 3: Audit Logging & Admin Controls (SEC-05)
4. Phase 4: Session & Cookie Security (SEC-03)
5. Phase 5: Critical Path Testing (TEST-01–TEST-07)
6. Phase 6: Error Path & Rate Limit Testing (TEST-08, TEST-09)
7. Phase 7: CI/CD Pipeline (TEST-10)
8. Phase 8: Cost Monitoring & Baseline (COST-01, COST-04)
9. Phase 9: Cost Optimization (Caching) (COST-02)
10. Phase 10: Cost Control (Rate Limits) (COST-03)

---

## Performance Metrics

### Requirements Coverage
- Total v1: 21
- Mapped: 21 (100%)
- Orphaned: 0

### Phase Structure
- Total phases: 10
- Security phases: 4 (Phases 1–4)
- Testing phases: 3 (Phases 5–7)
- Cost phases: 3 (Phases 8–10)

### Dependency Analysis
- Critical path (minimum to launch): Phases 1, 2, 4, 5, 8
- Parallel tracks possible: Security/Testing/Cost independent after foundation

---

## Codebase State Summary

**What's Working (P0 Shipped):**
- Exercise library with Firebase collection
- Firestore data model (users, workouts, PRs, profiles, goals)
- Server error logging with Cloud Logging
- Client-side error boundaries
- AI error classification
- Health check endpoint
- Screenshot parsing for workouts
- Lift progression analysis (Genkit + Gemini)
- Strength imbalance detection
- Weekly plan generation
- Rate limiting infrastructure

**What Needs P1 Work:**
- Firestore rules may be too permissive (need tightening for user isolation)
- Server action input validation patchy (some have Zod, others don't)
- No audit logging for admin operations
- Session cookies not verified for production
- No automated test suite (0% test coverage)
- No cost monitoring in place
- Exercise library caching not optimized

**Tech Stack:**
- Next.js 16 (App Router) + React 19 + TypeScript
- Firebase (Firestore, Auth) + Genkit + Google Gemini
- React Query, Zod, Radix UI, Tailwind, Recharts
- Cloud Logging, Upstash Redis (optional)

---

## Key Decisions Made

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| P0 locked, P1 focus | P0 is shipping foundation. P1 blocks launch. | Roadmap focuses exclusively on security, testing, cost |
| 10 phases | Comprehensive depth (8-12 per config); requirements naturally cluster into 10 groups | Clear phase boundaries, each delivers complete capability |
| Security first | Security leaks irreversible; data protection is core value | Phases 1-4 establish security foundation before testing |
| Testing via smoke tests | Full test suite is months; critical path validates core | Phase 5-7 tests sign-up → log → analyze → error paths |
| Preventative cost control | Firestore bills can surprise; monitor before users scale | Phase 8-10 establishes baseline, caches, rate limits |
| Manual testing phase before public launch | Test users catch real-world issues before public | Not in roadmap but referenced in PROJECT.md |

---

## Known Issues & Risks

### High-Risk Items
1. **Firestore rules may not enforce user isolation properly** — Risk of data leakage between users
   - Phase 1 will audit and fix
   - Test with incorrect UID to verify denial

2. **No test coverage** — Cannot confidently refactor or deploy changes
   - Phase 5-7 establishes smoke test baseline
   - Phase 7 CI/CD prevents regressions

3. **Cost monitoring not in place** — Runaway costs could exceed budget
   - Phase 8 establishes monitoring
   - Phase 10 enforces rate limits

### Medium-Risk Items
4. Exercise library still partially hardcoded (tech debt, not P1 blocker)
5. Error classification relies on Gemini error message patterns (fragile)
6. Session cookie security not verified in production environment

### Low-Risk Items (Monitored)
7. Redis optional but rate limiting depends on it
8. PII redaction may be incomplete (but current redaction in place)

---

## Accumulated Context

### Exercise Name Resolution (Critical)
- Machine exercises ("machine bicep curl") and equipment-agnostic exercises ("bicep curl") are SEPARATE exercises with different strength standards
- NOT aliases of each other
- Example: "Machine Bicep Curl" has different strength standards than "Bicep Curl"
- Pattern: Resolve to canonical name via exercise library; do NOT map machine → non-machine

### Firestore Converters
- Dates may default to `new Date()` if missing, masking data issues
- Need explicit null checking in Phase 1 audit

### Rate Limiting Design
- Currently per-day; no sub-daily (per-minute) protection
- Redis-based if available; fallback to in-memory
- 5 features tracked: prParses, screenshotParses, liftProgressionAnalyses, strengthAnalyses, weeklyPlans

### Error Categories
- 5 categories: quota_exceeded, model_overloaded, validation_error, auth_error, unknown_error
- Each has recommended user message and retry flag
- Implemented in `src/lib/logging/error-classifier.ts`

### Firestore Security - Stage 2 (Plan 01-03)
- Exercises collection now requires authentication (`request.auth != null`)
- ExerciseAliases and config collections require authentication
- Custom user exercises stored at `/users/{uid}/exercises` with user isolation
- All user-isolated paths use isOwner(userId) pattern
- Admin writes to exercises still possible via Firebase Admin SDK (bypasses rules)
- Pattern: Shared collections read-only with auth; user-isolated collections full CRUD with ownership check

---

## Session Continuity

### For Next Planner (`/gsd:plan-phase`)
- Current phase: awaiting approval
- Next action: After user approves roadmap, call `/gsd:plan-phase 1` to decompose Phase 1 (Firestore Security Hardening)
- Context to pass: SEC-01, SEC-02, SEC-06, SEC-07 requirements + success criteria + codebase understanding
- Firestore rules location: Firebase console → Firestore → Rules tab (not in code repo)

### For Phase Implementer (Claude)
- Review ROADMAP.md success criteria before starting implementation
- Validate each success criterion with manual test before marking phase complete
- Log progress in STATE.md after each phase
- Identify and surface blockers immediately

---

## Blockers & Dependencies

**Nothing Currently Blocking Roadmap Creation** ✓

**Phase 1 Dependencies:**
- Access to Firebase console (to edit Firestore rules)
- Ability to test Firestore rules with incorrect auth context

**Phase 5-7 Dependencies:**
- Test user account (to complete sign-up flow)
- Access to Cloud Logging to verify test logs

**Phase 8-10 Dependencies:**
- Cloud Logging read access (to retrieve usage metrics)
- Upstash Redis configured (for rate limit state)

---

## Success Criteria for Entire Roadmap

- [ ] All 10 phases complete
- [ ] All 21 v1 requirements satisfied
- [ ] Security audit passed (Firestore rules verified, session cookies secure)
- [ ] Critical path smoke tests pass (sign-up → log → analyze)
- [ ] Error boundaries verified to catch failures
- [ ] Rate limits enforced without exceeding quotas
- [ ] Cost baseline established and monitoring in place
- [ ] CI/CD pipeline prevents regressions
- [ ] Ready for test user phase

---

## Notes for User

This roadmap is **comprehensive and detailed** — 10 phases with clear success criteria for each. It's designed to ensure FitnessAI launches with:

1. **Strong security:** User data isolated, inputs validated, admin actions audited
2. **Verified testing:** Critical path works, errors handled gracefully
3. **Cost control:** Usage monitored, caching optimized, rate limits enforced

**Next step:** Approve roadmap or request revisions. Once approved, phases can be planned and executed sequentially.

---

*Project state captured: 2026-02-05*
