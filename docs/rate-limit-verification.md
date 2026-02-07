# Rate Limit Verification & Production Testing

This guide documents how to verify that rate limits are working correctly in production and provides manual testing procedures.

## Rate Limiting Implementation Status

**Status**: ✅ **FULLY IMPLEMENTED** - All 6 AI features are protected with daily per-user limits.

### Configured Limits

| Feature | Daily Limit | Purpose | File |
|---------|-------------|---------|------|
| `prParses` | 10/day | PR screenshot parsing | `/src/app/prs/actions.ts` |
| `screenshotParses` | 5/day | Workout screenshot parsing | `/src/app/history/actions.ts` |
| `strengthAnalyses` | 5/day | Strength imbalance analysis | `/src/app/analysis/actions.ts` |
| `planGenerations` | 5/day | Weekly workout plan generation | `/src/app/plan/actions.ts` |
| `liftProgressionAnalyses` | 20/day | Lift progression tracking | `/src/app/profile/actions.ts` |
| `goalAnalyses` | 5/day | Fitness goal analysis | `/src/app/profile/actions.ts` |

## Implementation Details

### Configuration Location
**File**: `/src/lib/rate-limit-config.ts`

```typescript
export const DAILY_LIMITS = {
  prParses: 10,
  screenshotParses: 5,
  strengthAnalyses: 5,
  planGenerations: 5,
  liftProgressionAnalyses: 20,
  goalAnalyses: 5,
} as const;
```

### Enforcement Logic
**File**: `/src/app/prs/rate-limiting.ts`

All AI server actions call `checkRateLimit()` before executing:

```typescript
if (process.env.NODE_ENV !== 'development') {
  const { allowed, error } = await checkRateLimit(userId, 'screenshotParses');
  if (!allowed) {
    return { success: false, error }; // User has hit their daily limit
  }
}
```

### Storage Location
Firestore document: `users/{userId}`

```json
{
  "aiUsage": {
    "screenshotParses": {
      "count": 3,
      "date": "2026-02-06"
    },
    "strengthAnalyses": {
      "count": 1,
      "date": "2026-02-06"
    }
    // ... other features
  }
}
```

**How it works**:
- Counter resets automatically when date changes (UTC boundary)
- Uses Firestore `FieldValue.increment(1)` for atomic updates (safe from race conditions)
- Each user has independent daily quota per feature

## Production Verification Checklist

### Pre-Launch Testing

- [ ] Verify `NODE_ENV=production` in deployed environment
- [ ] Test rate limit enforcement on staging environment
- [ ] Confirm Firestore indexes exist for `aiUsage` queries
- [ ] Set up Cloud Monitoring alerts for frequent rate limit hits
- [ ] Document billing tier upgrade path for customers

### Manual Testing Procedures

#### Test 1: PR Parsing Rate Limit

**Setup**: Create a test user in production

**Steps**:
1. Sign in as test user
2. Navigate to **Personal Records** page (`/prs`)
3. Upload or paste a PR screenshot
4. Expected result: ✓ Success (count 1/10)
5. Repeat steps 3-4 until the 11th attempt
6. Expected result on attempt 11: ❌ "Daily Limit Reached" toast notification

**Verify in Firestore**:
```
Collection: users
Document: [test-user-id]
Field path: aiUsage.prParses
Expected: { "count": 10, "date": "2026-02-06" }
```

**Verify in Cloud Logging**:
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.message=~"DAILY_LIMIT_REACHED"
jsonPayload.feature="prParses"
```

---

#### Test 2: Screenshot Parsing Rate Limit

**Setup**: Use test user from Test 1

**Steps**:
1. Navigate to **History** page (`/history`)
2. Upload workout screenshot from EGYM or similar
3. Expected result: ✓ Success (count 1/5)
4. Repeat until 6th attempt
5. Expected result on attempt 6: ❌ Rate limit error

**Error Message**: "You have reached your daily limit of 5 screenshot parses. Please try again tomorrow."

---

#### Test 3: Rate Limit Daily Reset

**Setup**: Use test user who hit limit on Day 1

**Steps**:
1. On Day 1: Hit rate limit (count = 5/5)
2. Try to perform action again: ❌ Fails with rate limit error
3. Wait until next UTC day (or manually verify date changes in Firestore)
4. Try again: ✓ Should succeed (counter reset to 1/5)

**Firestore verification**:
- Day 1 end: `{ "count": 5, "date": "2026-02-06" }`
- Day 2 after action: `{ "count": 1, "date": "2026-02-07" }`

---

#### Test 4: All Features Protected

**Quick verification**: Each feature should be protected

```
Features to test:
- [ ] prParses (10/day) - /prs
- [ ] screenshotParses (5/day) - /history
- [ ] strengthAnalyses (5/day) - /analysis
- [ ] planGenerations (5/day) - /plan (generate new plan)
- [ ] liftProgressionAnalyses (20/day) - /profile (analyze lift)
- [ ] goalAnalyses (5/day) - /profile (analyze goals)
```

For each feature, verify:
1. Action succeeds while under limit
2. Action fails with clear error message when limit reached
3. Counter increments in Firestore

---

#### Test 5: Development Bypass

**Setup**: Run app locally in development mode

**Steps**:
1. Start development server: `npm run dev`
2. Create unlimited account
3. Hit any AI feature unlimited times
4. Expected result: ✓ No rate limit errors, unlimited usage

**Why**: Development bypass (`NODE_ENV !== 'development'` check) allows testing without hitting limits during development.

---

#### Test 6: Error Classification

**Setup**: Rate limit bypass for testing error classification

**Steps**:
1. Disable rate limit check temporarily (for testing only!)
2. Trigger API quota error from Gemini (e.g., with invalid API key)
3. Expected behavior: Error is classified as `quota_exceeded`
4. Expected: **Do NOT count against limit** (counter should NOT increment)

**Why**: Service errors (quota, overload) don't count against user limits to prevent false charging.

---

### Monitoring in Production

#### Cloud Logging Queries

**1. View all rate limit hits (today)**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.error=~"DAILY_LIMIT_REACHED"
timestamp >= "2026-02-06T00:00:00Z"
```

**Expected output**: Log entries with `userId`, `feature`, `timestamp`

---

**2. Rate limit violations by feature (today)**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.error=~"DAILY_LIMIT_REACHED"
timestamp >= "2026-02-06T00:00:00Z"
| count by jsonPayload.feature
```

**Expected output**:
```
feature: screenshotParses | count: 42
feature: planGenerations | count: 18
feature: strengthAnalyses | count: 5
```

---

**3. Top users hitting rate limits (today)**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.error=~"DAILY_LIMIT_REACHED"
timestamp >= "2026-02-06T00:00:00Z"
| count by jsonPayload.userId
| sort by count desc
| limit 10
```

**Expected output**: Users who hit limits most frequently (useful for understanding usage patterns)

---

**4. All AI feature usage (today)**
```
logName="projects/fitnessai-prod/logs/fitnessai"
jsonPayload.feature=~"(prParses|screenshotParses|strengthAnalyses|planGenerations|liftProgressionAnalyses|goalAnalyses)"
timestamp >= "2026-02-06T00:00:00Z"
| count by jsonPayload.feature
```

**Expected output**: Daily usage count for each AI feature

---

### Firestore Queries

**1. View high-usage users** (approaching limits)
```typescript
// Using Firebase Admin SDK
const highUsageUsers = await db
  .collection('users')
  .where('aiUsage.screenshotParses.count', '>=', 4)
  .limit(20)
  .get();

highUsageUsers.forEach(doc => {
  const usage = doc.data().aiUsage;
  console.log(doc.id, usage);
});
```

---

**2. Check specific user's aiUsage**
```typescript
const userDoc = await db.collection('users').doc(userId).get();
const aiUsage = userDoc.data()?.aiUsage;
console.log(aiUsage);
// Output:
// {
//   screenshotParses: { count: 3, date: "2026-02-06" },
//   prParses: { count: 7, date: "2026-02-06" },
//   // ...
// }
```

---

**3. Users who hit limits today**
```typescript
const today = new Date().toISOString().split('T')[0]; // "2026-02-06"
const limitHitters = await db
  .collection('users')
  .where(`aiUsage.screenshotParses.date`, '==', today)
  .where(`aiUsage.screenshotParses.count`, '==', 5) // Check each feature
  .get();
```

---

## Adjusting Rate Limits

### If Limits Are Too Restrictive

1. **Identify which feature**: Use Cloud Logging query to see which features hit limits most
2. **Update config**:
   ```typescript
   // src/lib/rate-limit-config.ts
   export const DAILY_LIMITS = {
     screenshotParses: 10, // Increased from 5
     // ...
   };
   ```
3. **Existing users**: Will have new limit applied tomorrow (counter resets)
4. **Communicate**: Notify users of higher limits
5. **Monitor**: Track usage patterns for 2-4 weeks

### If Limits Are Too Generous

1. **Identify cost impact**: Calculate from Firestore metrics (see firestore-cost-estimation.md)
2. **Update config**: Lower the limit in same file
3. **Grandfather existing users**: (Optional) Allow higher limit for early adopters
4. **Communicate**: Explain reasoning to users
5. **Monitor**: Ensure no complaints about sudden enforcement

## Incident Response

### Scenario: Rate Limit Check Failing

**Symptoms**: Users can't perform any AI actions, error message unclear

**Investigation**:
1. Check Firestore availability: `curl https://firestore.googleapis.com/v1/...`
2. Check Cloud Logging for errors: `logName=... severity=ERROR`
3. Check service account credentials valid
4. Check Firestore security rules allow reads to `aiUsage` field

**Resolution**:
1. If Firestore down: Wait for recovery, no code changes needed
2. If credentials invalid: Update via Cloud Console Secrets
3. If rules too strict: Update `firestore.rules` to allow reads to user's own `aiUsage`

---

### Scenario: Users Complaining About Limits

**Investigation**:
1. Check if they actually hit the limit: Verify `aiUsage.{feature}.count` in Firestore
2. Check if they expect higher limit: Compare to similar apps
3. Check cost impact of raising limits: Run cost projection

**Decision Matrix**:
| Usage | Cost Impact | Action |
|-------|-------------|--------|
| Low (<50% of limit) | Negligible | Consider raising limits |
| Medium (50-80%) | Moderate | Monitor trends first |
| High (>80%) | Significant | Educate users on optimization |

---

## Success Criteria

### Before Production Launch
- ✅ All 6 AI features have rate limiting
- ✅ Rate limits configured and stored in Firestore
- ✅ Error messages clear to users
- ✅ Development bypass works (unlimited in dev mode)
- ✅ No bypasses in production code

### Post-Launch Monitoring (30 days)
- ✅ Cloud Logging queries return expected data
- ✅ Rate limit hits logged correctly
- ✅ No false positives (legitimate users blocked)
- ✅ Cost remains under budget
- ✅ User feedback is positive about limits

---

## References

- **Config**: `/src/lib/rate-limit-config.ts`
- **Enforcement**: `/src/app/prs/rate-limiting.ts`
- **Counter increment**: `/src/lib/firestore-server.ts::incrementUsageCounter`
- **Error classification**: `/src/lib/logging/error-classifier.ts`
- **Cloud Logging**: https://console.cloud.google.com/logs (fitnessai-prod project)
- **Firestore Console**: https://console.firebase.google.com/firestore (fitnessai-prod)
