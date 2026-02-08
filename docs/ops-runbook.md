# FitnessAI Ops Runbook

**Last Updated**: 2026-02-07
**Owner**: FitnessAI Team

## Overview
This runbook covers production monitoring, alert response, and common operational checks for FitnessAI.

## Key Endpoints
- Health check: `https://fitnessai-prod--fitnessai-prod.us-central1.hosted.app/api/health`
- App URL: `https://fitnessai-prod--fitnessai-prod.us-central1.hosted.app/`

## Monitoring & Alerts
- **Error Log Alert**: `fitnessai-error-logs`
  - Source: Cloud Logging (`projects/fitnessai-prod/logs/fitnessai`, severity >= ERROR)
  - Channel: Email
- **Uptime Check**: `fitnessai-health-uptime`
  - Target: `/api/health`
  - Frequency: 15 minutes
  - Regions: US (3 locations)
  - Alert: `healthcheck-uptime-failure` (duration: 15 minutes)
- **Scheduler**: `fitnessai-healthcheck`
  - Frequency: Hourly
  - Target: `/api/health`

## Common Log Queries
**All app error logs**
```
logName="projects/fitnessai-prod/logs/fitnessai"
severity>=ERROR
```

**Client error reports**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.feature="client"
```

**Specific error message**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.message="YOUR_MESSAGE"
```

**Health check**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.message="Health check"
```

## Firestore Monitoring

Firestore cost and performance primarily track to document reads/writes/deletes. Alerting should be based on
your observed baseline and your budget, not a hardcoded "free tier" threshold (pricing/tiers change).

**Where to Monitor**
- **Firebase Console**: Firestore usage + billed operations, plus overall project Billing.
- **Google Cloud Monitoring**: Metrics Explorer + Alerting.
- **Cloud Logging**: app-level logs that indicate a specific feature/route is spiking reads.

**Recommended Alert Policies (Baseline + Budget)**
1. Establish a baseline (last 7-30 days) for:
   - `firestore.googleapis.com/document/read_count`
   - `firestore.googleapis.com/document/write_count`
   - `firestore.googleapis.com/document/delete_count`
2. Create alerts that trigger when:
   - Daily operations are > 3x baseline (spike detection), OR
   - Daily operations exceed a budget-driven ceiling you choose.

**Useful Link**
- Firestore dashboard: https://console.cloud.google.com/firestore/databases?project=fitnessai-prod

**What to Do When Usage Spikes**
1. Confirm it's real:
   - Check Cloud Monitoring graphs for reads/writes/deletes over the last 1h/24h.
2. Find the cause in app logs:
   - Use Cloud Logging queries above and filter by the time window of the spike.
   - Look for repeated requests to the same route or repeated server-action execution.
3. Likely culprits:
   - Exercise registry reads (should be cached; if this regresses, costs jump quickly).
   - Unindexed queries (Firestore may error; app retries can amplify load).
   - N+1 patterns in server actions (multiple per-page or per-item reads).
4. Quick mitigations:
   - Roll back the last deploy if the spike aligns with a release.
   - Temporarily gate heavy features (rate limits already exist for AI features).
   - Add/adjust caching for stable reads (see `docs/caching-strategy.md`).
5. Follow-up:
   - Add a regression test where feasible.
   - Add a lightweight dashboard panel for the metric that spiked.

**Local Verification (Repo)**
- Cache config checks: `npm run verify:cache`
- Rate limit coverage checks: `npm run verify:rate-limits`

## Rate Limit Monitoring

**Alert Setup** (set up via verification checklist in docs/rate-limit-verification.md)

Rate limits are enforced per-user per-feature daily. Monitor usage patterns:

**Users hitting rate limits today**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.error=~"DAILY_LIMIT_REACHED"
timestamp >= "2026-02-06T00:00:00Z"
| count by jsonPayload.userId
| sort by count desc
```

**Rate limit hits by feature**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.error=~"DAILY_LIMIT_REACHED"
timestamp >= "2026-02-06T00:00:00Z"
| count by jsonPayload.feature
```

**All AI feature usage (today)**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.feature=~"(prParses|screenshotParses|strengthAnalyses|planGenerations|liftProgressionAnalyses|goalAnalyses)"
timestamp >= "2026-02-06T00:00:00Z"
| count by jsonPayload.feature
```

**Interpreting Rate Limit Data**

- **Normal**: Users hitting limits < 10% of active users
- **Concerning**: > 20% of users hitting limits consistently
- **Action needed**: If > 30%, consider raising limits or educating users

See `docs/rate-limit-verification.md` for production testing procedures and limit adjustment guidance.

## Incident Response
1. **Triage**
   - Check Cloud Logging for recent ERROR entries.
   - Check uptime check status and most recent `/api/health` response.
2. **Scope**
   - Determine if issue is localized (single user) or systemic.
3. **Mitigation**
   - Roll back latest deployment if error rate spikes.
   - Disable new feature flags if applicable.
4. **Follow-up**
   - Document incident summary and root cause.
   - Add a regression test if applicable.

## Smoke Tests & Pre-Deployment Validation

**Overview**
Smoke tests run automatically on every PR to `main` and every push to `main` via GitHub Actions. They validate critical user flows before production deployment.

**Test Coverage**
- ✅ Authentication (sign-in/out)
- ✅ Workout logging (history, create/edit)
- ✅ Screenshot parsing (upload UI, PR detection)
- ✅ Analysis & plan generation

**CI/CD Pipeline**
1. **On PR**: Lint → Typecheck → Build → Smoke tests (must pass to merge)
2. **On merge to main**: Smoke tests run again before production deployment
3. **On deploy failure**: Check GitHub Actions logs to view test traces and videos

**Running Tests Locally**
```bash
# Set test credentials
export E2E_AUTH_EMAIL="fake@notreal.com"
export E2E_AUTH_PASSWORD="fake26"

# Run all tests
npm run test:smoke

# Run in headed mode (see browser)
npm run test:smoke:headed
```

**GitHub Actions Setup**
- Workflow: `.github/workflows/smoke-tests.yml`
- Secrets required:
  - `E2E_AUTH_EMAIL`
  - `E2E_AUTH_PASSWORD`
- Artifacts: Test results uploaded for 7 days (failures include videos/traces)

**Debugging Failed Tests**
1. View GitHub Actions logs: PR → "Checks" tab → "Smoke Tests"
2. Download test artifacts (videos/traces) for detailed failure analysis
3. Run locally with same credentials to reproduce
4. Check `tests/smoke/README.md` for test documentation

## Rollback
If a deployment causes widespread issues:
1. Revert to last stable App Hosting release.
2. Verify `/api/health` returns `ok`.
3. Monitor error logs for 30 minutes.
4. Re-run smoke tests against rollback version to confirm.

## Ownership & Escalation
- Primary: Engineering on-call
- Escalation: Product owner and CTO (if applicable)
