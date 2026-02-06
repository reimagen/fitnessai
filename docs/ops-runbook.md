# FitnessAI Ops Runbook

**Last Updated**: 2026-02-05
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

## Rollback
If a deployment causes widespread issues:
1. Revert to last stable App Hosting release.
2. Verify `/api/health` returns `ok`.
3. Monitor error logs for 30 minutes.

## Ownership & Escalation
- Primary: Engineering on-call
- Escalation: Product owner and CTO (if applicable)

