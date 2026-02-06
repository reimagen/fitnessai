# FitnessAI — Consumer-Ready Launch

## What This Is

FitnessAI is a fitness tracking app that lets users log workouts, track personal records, and receive AI-powered insights on lift progression, strength balance, and cardio analysis. The app is feature-complete with P0 (data + reliability) shipped. This project focuses on hardening P1 (security, testing, cost control) before launching to test users.

## Core Value

**Users can safely log workouts and get AI insights without security leaks or unexpected costs.**

Everything else can wait. Security and cost control are non-negotiable before public launch.

## Requirements

### Validated

<!-- P0 items shipped and working -->

- ✓ Exercise library with Firebase collection + migration scripts — existing
- ✓ Firestore data model (users, workouts, PRs, profiles, goals) — existing
- ✓ Server error logging with request context and Cloud Logging — existing
- ✓ Client-side error boundaries (History, Analysis, Plan) — existing
- ✓ AI error classification (quota, overload, validation, auth, unknown) — existing
- ✓ Health check endpoint + uptime monitoring — existing
- ✓ Screenshot parsing for workout logs and PRs — existing
- ✓ Lift progression analysis (Genkit + Gemini) — existing
- ✓ Strength imbalance detection + recommendations — existing
- ✓ Weekly plan generation — existing
- ✓ Rate limiting for AI features — existing

### Active

<!-- P1 Launch blockers -->

**Security & Data Protection**
- [ ] Firestore security rules: read/write isolation by user, no data leakage
- [ ] Session cookie handling verified for production (secure flags, expiry)
- [ ] Input validation with Zod schemas on all server actions
- [ ] Audit logging for admin scripts (exercise migrations, data fixes)

**Critical Path Testing**
- [ ] Smoke test: User can sign up with email/password
- [ ] Smoke test: User can create profile with stats
- [ ] Smoke test: User can log workout with exercises
- [ ] Smoke test: User can view lift progression analysis
- [ ] Smoke test: User can view strength balance analysis
- [ ] CI pipeline: lint, typecheck, build checks
- [ ] Error paths tested: Auth failures, AI failures, rate limits

**Cost Control & Optimization**
- [ ] Firestore read/write costs monitored and optimized
- [ ] Exercise library caching verified (no redundant queries)
- [ ] Rate limits enforced to prevent runaway AI costs
- [ ] Cost baseline established before launch

### Out of Scope

- [Admin UI for exercise library management] — Post-launch, users manage via scripts
- [Real-time notifications] — Can be added post-launch
- [Email notifications] — Defer to v2
- [Mobile app] — Web-first, mobile later
- [OAuth login] — Email/password sufficient for v1
- [Billing/monetization] — Test user phase first, implement later
- [In-app help/FAQ] — Post-launch product polish
- [Analytics] — Post-launch measurement

## Context

**Codebase state:**
- Next.js 16 (App Router) + React 19 + TypeScript
- Firebase (Firestore, Auth) + Genkit + Google Gemini for AI
- React Query for client state, Zod for validation
- Radix UI + Tailwind for styling, Recharts for data viz
- Cloud Logging for observability, Upstash Redis for rate limiting (optional)
- Server actions for all mutations

**Technical debt/concerns (from codebase map):**
- No test suite (starting from scratch)
- Some Firestore rules may need tightening
- Session cookie handling needs production verification
- Input validation patchy (some actions have Zod, others don't)
- Cost monitoring not yet in place

**User testing approach:**
- Phase 1: Internal/test users → gather feedback on P1 fixes
- Phase 2: Public launch (after security verified)

## Constraints

- **Security:** No weak Firestore policies. Data must be user-isolated. Non-negotiable.
- **Testing:** Start critical path (smoke tests), expand to best practices progressively
- **Cost:** Preventative control. Monitor Firestore usage. Catch runaway costs before launch.
- **Timeline:** Ship when ready. Test users first, then public. No hard deadline.
- **Billing:** Not required for launch. Implement post-launch.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| P0 locked, focus on P1 | P0 (data + reliability) is shipping foundation. P1 (security, testing, cost) blocks launch. | — Pending |
| Start testing with critical path, not comprehensive | Full test suite is months of work. Critical path (sign up → log → analyze) validates core flow. | — Pending |
| Preventative cost control, not reactive | Firestore bills can surprise. Monitor usage, optimize caching before users scale. | — Pending |
| Security review first, testing second, cost third | Security leaks are irreversible. Testing prevents user-facing bugs. Cost is optimization. | — Pending |

---

*Last updated: 2026-02-05 after project initialization*
