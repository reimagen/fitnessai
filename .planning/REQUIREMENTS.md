# Requirements: FitnessAI — Consumer-Ready Launch

**Defined:** 2026-02-05
**Core Value:** Users can safely log workouts and get AI insights without security leaks or unexpected costs.

## v1 Requirements

Requirements for consumer-ready launch (P1 hardening).

### Security & Data Protection

- [ ] **SEC-01**: Firestore rules enforce user isolation — users can only read/write their own data
- [ ] **SEC-02**: Firestore rules prevent anonymous access — all collections require authentication
- [ ] **SEC-03**: Session cookies have secure flags and appropriate expiry in production
- [ ] **SEC-04**: All server actions validate input with Zod schemas (no unvalidated inputs)
- [ ] **SEC-05**: Admin scripts (migrations, data fixes) log audit trail (who did what, when)
- [ ] **SEC-06**: Exercise library writes are restricted to admin-only operations
- [ ] **SEC-07**: User profile data (weight, goals, etc.) is user-isolated in Firestore rules

### Critical Path Testing

- [ ] **TEST-01**: User can sign up with email/password and receive verification email
- [ ] **TEST-02**: User can log in and session persists across browser refresh
- [ ] **TEST-03**: User can create profile with stats (age, weight, height, muscle mass)
- [ ] **TEST-04**: User can log workout with multiple exercises and sets/reps
- [ ] **TEST-05**: User can view lift progression chart and receive AI analysis
- [ ] **TEST-06**: User can view strength balance analysis with recommendations
- [ ] **TEST-07**: User can log personal record and see it reflected in analysis
- [ ] **TEST-08**: Error boundaries catch errors without crashing page (History, Analysis, Plan)
- [ ] **TEST-09**: Rate limits prevent exceeding AI feature quotas (graceful degradation)
- [ ] **TEST-10**: CI pipeline runs lint, typecheck, build checks on every commit

### Cost Control & Optimization

- [ ] **COST-01**: Firestore read/write costs are monitored and baselined
- [ ] **COST-02**: Exercise library caching prevents redundant Firestore queries
- [ ] **COST-03**: Rate limits for AI features are enforced (prevent runaway costs)
- [ ] **COST-04**: Cost baseline established before test user phase (know what's normal)

## v2 Requirements

Deferred to post-launch.

### Product & Operations

- **PROD-01**: In-app help/FAQ for common issues
- **PROD-02**: Onboarding flow guides new users through first workout
- **PROD-03**: Empty states and error messages are user-friendly
- **PROD-04**: Analytics tracking for feature usage and drop-offs
- **PROD-05**: User support path (feedback form or contact email)

### Billing & Monetization

- **BILL-01**: Decide on billing provider and model (subscriptions vs usage-based)
- **BILL-02**: Gate AI-heavy features behind subscription tiers
- **BILL-03**: Pricing page and plan enforcement

### Testing Best Practices

- **TESTING-01**: Unit tests for critical utilities (strength calculations, error classification)
- **TESTING-02**: Integration tests for auth flows (sign up, login, password reset)
- **TESTING-03**: Integration tests for workout logging and analysis
- **TESTING-04**: Test coverage dashboard (track % coverage over time)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Admin UI for exercise library | Manual scripts sufficient for v1. Post-launch feature. |
| Real-time notifications | Can be added post-launch. Not core to launch. |
| Email notifications | Defer to v2. Test users don't need email yet. |
| Mobile app | Web-first. Mobile is post-launch. |
| OAuth login | Email/password sufficient for v1 and test phase. |
| Video posts | Storage/bandwidth costs, defer to v2+. |
| Advanced analytics | Post-launch measurement. Not needed for launch. |

## Traceability

Which phases cover which requirements. To be filled during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase ? | Pending |
| SEC-02 | Phase ? | Pending |
| SEC-03 | Phase ? | Pending |
| SEC-04 | Phase ? | Pending |
| SEC-05 | Phase ? | Pending |
| SEC-06 | Phase ? | Pending |
| SEC-07 | Phase ? | Pending |
| TEST-01 | Phase ? | Pending |
| TEST-02 | Phase ? | Pending |
| TEST-03 | Phase ? | Pending |
| TEST-04 | Phase ? | Pending |
| TEST-05 | Phase ? | Pending |
| TEST-06 | Phase ? | Pending |
| TEST-07 | Phase ? | Pending |
| TEST-08 | Phase ? | Pending |
| TEST-09 | Phase ? | Pending |
| TEST-10 | Phase ? | Pending |
| COST-01 | Phase ? | Pending |
| COST-02 | Phase ? | Pending |
| COST-03 | Phase ? | Pending |
| COST-04 | Phase ? | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: (to be filled)
- Unmapped: (to be filled)

---

*Requirements defined: 2026-02-05*
*Last updated: 2026-02-05 after initialization*
