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

## Deployment

### Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] All tests passing (lint, typecheck, build, smoke tests)
- [ ] Latest version built successfully (`npm run build`)
- [ ] No uncommitted changes or unmerged PRs to main
- [ ] CHANGELOG updated with new features/fixes (if applicable)
- [ ] Firestore security rules reviewed and correct
- [ ] Rate limit settings verified (if changed)
- [ ] Cache strategy validated for new features (run `npm run verify:cache`)

### Deploy to Production (Firebase App Hosting)

**Option 1: Using Firebase CLI**

```bash
# Ensure you're on main branch and up-to-date
git checkout main
git pull origin main

# Deploy to Firebase App Hosting
firebase deploy --only hosting:fitnessai-prod

# Or for App Hosting with explicit selection:
firebase apphosting:rollouts:create --app fitnessai-prod --source-repo-branch main --source-repo-name fitnessai
```

**Option 2: Using Cloud Console**

1. Go to [Firebase Console](https://console.firebase.google.com/project/fitnessai-prod)
2. Select "App Hosting" from left menu
3. Click "Create rollout" for the fitnessai-prod app
4. Select branch: `main`
5. Wait for build and deployment

**Deployment typically takes:** 5-15 minutes

### Post-Deployment Verification

**Immediate checks (within 5 minutes):**

1. Health check endpoint:
```bash
curl https://fitnessai-prod--fitnessai-prod.us-central1.hosted.app/api/health
# Expected response: {"status":"ok","timestamp":"..."}
```

2. Check app loads:
```bash
# Visit the app in a browser
https://fitnessai-prod--fitnessai-prod.us-central1.hosted.app/
# Should load without errors
```

3. Manual smoke test (5 minutes):
   - Sign in with a test account
   - Navigate to History page
   - Verify UI loads correctly
   - Check that workout data displays

**Extended monitoring (15-30 minutes after deploy):**

1. Check error logs:
   ```
   logName="projects/fitnessai-prod/logs/fitnessai"
   severity>=ERROR
   timestamp >= "2026-02-07T18:00:00Z"
   ```
   - Should see no new errors related to deployment

2. Check uptime alert status:
   - Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring/alerting/policies) for `fitnessai-prod`
   - Verify `healthcheck-uptime-failure` is in OK status

3. Monitor Firestore metrics:
   - Check daily operation count hasn't spiked 3x baseline
   - (See Firestore Monitoring section for queries)

**If everything looks good:**
- You can consider the deployment successful
- Continue routine monitoring for the next 1-2 hours

### Rollback Procedure

If deployment causes issues and you need to revert:

**Using Firebase CLI:**

```bash
# List recent rollouts
firebase apphosting:rollouts:list --app fitnessai-prod

# Find the previous stable rollout ID (look for most recent successful one)
# Then rollback to it:
firebase apphosting:rollouts:rollback --app fitnessai-prod --rollout ROLLOUT_ID
```

**Using Cloud Console:**

1. Go to [Firebase Console](https://console.firebase.google.com/project/fitnessai-prod)
2. Select "App Hosting" → "fitnessai-prod"
3. Click "Rollouts" tab
4. Find the previous stable rollout (look for green checkmark, deployed 10+ minutes ago)
5. Click the three-dot menu → "Rollback"
6. Confirm the rollback

**After rollback:**

1. Verify health check: `curl https://fitnessai-prod--fitnessai-prod.us-central1.hosted.app/api/health`
2. Wait 5 minutes and run manual smoke test
3. Check error logs for new errors
4. Investigate root cause of the deployment failure

---

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

## Incident Playbooks

This section contains step-by-step procedures for common incident scenarios. Each playbook includes triage, diagnosis, mitigation, and resolution steps.

### Playbook: Firestore Database Unavailable

**Symptoms:**
- Users report "could not load" errors on multiple pages
- Uptime check failing with timeout errors
- Error logs: `Firestore unavailable` or `DEADLINE_EXCEEDED`
- Health check returns error or timeout

**Triage (2 minutes):**
1. Check [Firebase Status Dashboard](https://status.firebase.google.com/) - are there Firestore incidents?
2. Check Cloud Logging for Firestore-specific errors:
   ```
   logName="projects/fitnessai-prod/logs/fitnessai"
   severity>=ERROR
   "Firestore" OR "DEADLINE_EXCEEDED" OR "unavailable"
   ```
3. Check if issue is:
   - Global Firestore outage? (check status page)
   - Only affecting our app? (likely a rule issue)
   - Only certain users? (permissions issue)

**Diagnosis (5-10 minutes):**
- If global outage: Wait for Google to resolve (ETA on status page)
- If app-specific: Check Firestore rules for recent changes
  ```bash
  firebase rules:list --project fitnessai-prod
  ```
- Check if Firestore quota exceeded:
  - Go to [Firestore usage](https://console.firebase.google.com/project/fitnessai-prod/firestore/usage)
  - Look for "Write operations" or "Read operations" nearing daily quota

**Mitigation:**
1. If quota issue: Temporarily increase quotas (via Firebase Console → Settings)
2. If rule issue: Revert to last working ruleset:
   ```bash
   firebase rules:rollback --project fitnessai-prod
   ```
3. Monitor error logs and health check - should stabilize within 2 minutes

**Resolution:**
1. Verify health check returns `ok`
2. Wait 15 minutes and verify error rate is back to normal
3. If rule-based issue, investigate what changed and re-deploy correct rules
4. Document incident and root cause for team retrospective

---

### Playbook: AI API Rate Limit Exhausted (Gemini API)

**Symptoms:**
- Error logs: `429 Too Many Requests` or `QUOTA_EXCEEDED`
- Users report: "We're sorry, our AI service is overloaded"
- Analysis and plan generation features failing
- Error spikes at specific time (usually daily limit reset)

**Triage (2 minutes):**
1. Check Google Cloud Vertex AI usage in [Google Cloud Console](https://console.cloud.google.com/vertex-ai/models/gemini-1.5-flash/usage)
2. Check error logs:
   ```
   logName="projects/fitnessai-prod/logs/fitnessai"
   severity>=ERROR
   "429" OR "QUOTA_EXCEEDED" OR "rate_limit"
   ```
3. Determine if:
   - We hit daily quota limit
   - Concurrent request limit exceeded
   - Unexpected traffic spike

**Diagnosis (5 minutes):**
- Check usage graphs:
  - Requests/minute trending?
  - Specific feature causing spike? (plan generation, analysis, etc.)
- Check app logs for repeated feature use:
  ```
  logName="projects/fitnessai-prod/logs/fitnessai"
  jsonPayload.feature="planGeneration"
  timestamp >= "2026-02-07T17:00:00Z"
  | count by jsonPayload.userId
  | limit 10
  ```

**Mitigation (immediate):**
1. Temporary rate limit increase:
   - Go to Google Cloud Vertex AI → Quotas & System Limits
   - Request temporary quota increase (usually approved within 1 hour)
2. Educate affected users:
   - Communicate that feature is temporarily limited
   - Suggest trying again in a few hours
   - Send email to known power users
3. Monitor usage for next 2 hours

**Resolution:**
1. Once quota increased, monitor for stabilization
2. If this is a recurring issue, consider:
   - Adjusting daily rate limits in app (`PLANS_PER_DAY`, etc.)
   - Implementing better queue/batching for AI requests
   - Upgrading to higher-tier Vertex AI plan
3. Add dashboard metric to track daily quota usage

---

### Playbook: High Error Rate on Specific Page (e.g., Analysis)

**Symptoms:**
- Spike in error logs for a specific feature or page
- Users report blank page or "something went wrong"
- Error logs show 500 errors from specific route (e.g., `/analysis`, `/prs`)

**Triage (3 minutes):**
1. Check Cloud Logging:
   ```
   logName="projects/fitnessai-prod/logs/fitnessai"
   severity>=ERROR
   jsonPayload.feature="analysis"  # or replace with feature name
   timestamp >= "2026-02-07T17:00:00Z"
   ```
2. Count errors to determine scope:
   - 1-2 errors: Might be user-specific (bad data)
   - 10+ errors: Feature-wide issue
3. Check what changed recently:
   - Last 3 deployments in App Hosting
   - Any database rule changes in past hour?

**Diagnosis (5-10 minutes):**
1. Check error details:
   ```
   logName="projects/fitnessai-prod/logs/fitnessai"
   severity>=ERROR
   jsonPayload.feature="analysis"
   timestamp >= "2026-02-07T17:00:00Z"
   | fields jsonPayload.message, jsonPayload.error
   ```
2. Common patterns:
   - "Could not load user profile" → User profile data missing or corrupted
   - "Firestore unavailable" → Database issue (see Firestore playbook)
   - "Invalid data format" → Likely a deploy bug, needs rollback
   - "Permission denied" → Security rule issue

**Mitigation:**
- If deploy-related (error started <5 min after deploy):
  1. **Rollback immediately** (see Deployment → Rollback Procedure)
  2. Monitor error logs to confirm resolution
  3. Investigate root cause in staging before re-deploy
- If not deploy-related:
  1. Temporarily disable feature (via feature flag if available)
  2. Investigate root cause
  3. Fix and re-deploy

**Resolution:**
1. Deploy fix (or rollback)
2. Wait 5 minutes and verify error rate back to normal
3. Document root cause and add monitoring/alerting for that specific error

---

### Playbook: Users Cannot Sign In

**Symptoms:**
- Error logs: `Authentication failed` or `Invalid credentials`
- Users report: "I entered my password but it says it's wrong"
- Firebase Authentication console shows no suspicious activity
- Health check passing

**Triage (2 minutes):**
1. Check Firebase Auth status:
   - Go to [Firebase Authentication](https://console.firebase.google.com/project/fitnessai-prod/authentication)
   - Check if any users locked out
   - Check if Email/Password provider is enabled
2. Test yourself:
   - Try signing in from incognito window with test account
   - Check if sign-in page loads

**Diagnosis (3-5 minutes):**
- If you can sign in but users cannot:
  - Ask affected user: "Does it say email not found or password wrong?"
  - "Invalid email" → User created different account elsewhere
  - "Wrong password" → User forgot password or different account
  - "Account disabled" → Check Firebase console for disabled accounts
- If nobody can sign in:
  - Check Firebase Auth service status
  - Check if sign-up flow was recently modified

**Mitigation:**
- Per-user issues: Direct user to password reset
- Multiple users: If recent code change, rollback
- If Firebase Auth issue: Contact Firebase support (link in console)

---

### Playbook: Performance Degradation (Slow Page Loads)

**Symptoms:**
- Pages taking 10+ seconds to load (normally <3 seconds)
- History and Analysis pages notably slower
- No errors in logs, just timeouts

**Triage (3 minutes):**
1. Check Cloud Logging for slow requests:
   ```
   logName="projects/fitnessai-prod/logs/fitnessai"
   jsonPayload.duration > 5000  # > 5 seconds
   ```
2. Check Firestore metrics:
   - Any spike in document reads/writes?
   - Did baseline change in past hour?
3. Check Cloud Tracing (if enabled):
   - Go to Cloud Trace in Cloud Console
   - Filter by slow traces to identify bottleneck

**Diagnosis (5-10 minutes):**
- If reads spiked:
  - Likely cause: Uncached data or N+1 queries
  - Check which features are reading heavily
- If no spike but still slow:
  - Could be network latency issue
  - Could be app-level inefficiency (not Firestore)
  - Could be browser resource issue (check DevTools)

**Mitigation:**
1. Enable/improve caching (see `docs/caching-strategy.md`)
2. Temporary rate limiting for heavy features
3. If recent deploy caused this: rollback
4. Add cache busting if data is stale

---

## Rollback

If a deployment causes widespread issues:
1. Revert to last stable App Hosting release (see Deployment → Rollback Procedure)
2. Verify `/api/health` returns `ok`
3. Monitor error logs for 15 minutes
4. Re-run smoke tests against rollback version to confirm
5. Investigate root cause before re-deploying

## Ownership & Escalation

- **Primary Responder**: Engineering on-call
- **Secondary**: Lead engineer or tech lead
- **Escalation**: Product owner (for customer communication)
- **Emergency**: CTO or Head of Engineering (for major outages)

**On-Call Responsibilities:**
- Respond to alerts within 5 minutes
- Triage and communicate status within 10 minutes
- Implement mitigation (rollback, hotfix, or temporary disable) within 30 minutes
- Post-incident: Document root cause and prevention measures
