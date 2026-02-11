# Caching Strategy

This document describes the caching architecture for FitnessAI, focusing on exercise registry reads and other frequently-accessed data.

## Overview

FitnessAI uses a multi-layer caching strategy to minimize Firestore read costs and improve user experience:

1. **Server-side caching** (Next.js `unstable_cache`) - Caches data across requests
2. **Client-side caching** (React Query) - Caches data on the browser
3. **Fallback data** (hardcoded) - Ensures availability if Firestore fails

## Exercise Registry Caching

### Server-Side Caching

The exercise registry is cached on the server using Next.js `unstable_cache` in `/src/lib/exercise-registry.server.ts`.

#### Cached Operations

| Operation | Cache Key | TTL | Rationale |
|-----------|-----------|-----|-----------|
| Active Exercises | `['exercise-registry', 'active-exercises']` | **1 hour** (3600s) | Exercise library changes infrequently; 1h TTL balances freshness with Firestore read reduction. Can be manually invalidated via tag. |
| Exercise Aliases | `['exercise-registry', 'aliases']` | **24 hours** (86400s) | Aliases rarely change; longer TTL reduces reads significantly. Includes legacy name mappings. |
| Strength Ratios | `['exercise-registry', 'strength-ratios']` | **24 hours** (86400s) | Standard strength ratios for 1RM calculations; stable reference data. Cached per exercise. |

#### Cache Implementation

```typescript
// src/lib/exercise-registry.server.ts

const getCachedActiveExercises = unstable_cache(
  async (): Promise<ExerciseDocument[]> => {
    // Fetch from Firestore
    const snapshot = await db
      .collection('exercises')
      .where('isActive', '==', true)
      .get();
    return snapshot.docs.map(doc => doc.data() as ExerciseDocument);
  },
  ['exercise-registry', 'active-exercises'],
  {
    revalidate: 3600, // 1 hour
    tags: ['exercises'], // For manual cache invalidation
  }
);
```

#### Cache Tags & Invalidation

All exercise caching uses the `['exercises']` tag, allowing coordinated invalidation:

- **Manual invalidation**: `revalidateTag('exercises')` (call this if exercises are updated)
- **Automatic**: Reverted after TTL expires
- **Location**: Use this when updating exercise data in Firestore

### Client-Side Caching

Client-side components use React Query (`useExercises`, `useExerciseAliases`) with 1-hour stale time:

```typescript
// src/lib/firestore.service.ts

function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercises,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
  });
}
```

**Behavior**:
- **Stale (1h)**: Data shows but background refetch in progress
- **Garbage collected (24h)**: Data removed from memory if unused
- **Components**: `WorkoutLogForm`, `ManualPrForm`, `PersonalRecordsSection`, `PrProgress`, `analysis/page`

## Workout Data Caching

### Client-Side Caching Strategy

Workout logs use React Query with an intelligent caching strategy based on date ranges. This minimizes Firestore reads while balancing freshness:

| Query Type | Cache Key | Stale Time | Rationale |
|-----------|-----------|-----------|-----------|
| **Current Month** (History Page) | `['workouts', userId, 'yyyy-MM']` | **1 hour** | Frequently updated, but user only modifies current month regularly |
| **Past Months** (History Page) | `['workouts', userId, 'yyyy-MM']` | **∞ (forever)** | Historical data never changes; no need to refetch |
| **Date Range** (Analysis Page) | `['workouts', userId, 'since-yyyy-MM-dd']` | **30 minutes** | Mutations trigger immediate refresh; longer TTL reduces unnecessary refetches |
| **All Workouts** (Rare) | `['workouts', userId, 'all']` | **30 minutes** | Expensive query; rarely used; mutations invalidate immediately |

### Implementation

```typescript
// src/lib/firestore.service.ts

export function useWorkouts(forDateRange?: Date | { start: Date, end: Date } | undefined, enabled: boolean = true) {
  // Determine cache key based on date range
  let dateKey: string | undefined;
  if (forDateRange) {
    if (forDateRange instanceof Date) {
      dateKey = format(forDateRange, 'yyyy-MM'); // Month-based key
    } else {
      dateKey = `since-${format(forDateRange.start, 'yyyy-MM-dd')}`; // Range-based key
    }
  } else {
    dateKey = 'all'; // All workouts
  }

  const queryKey = ['workouts', user?.uid, dateKey];

  // Stale time: 1 hour for current month, forever for past, 30 min for ranges
  let staleTime = 1000 * 60 * 30; // 30 minute default
  if (forDateRange && forDateRange instanceof Date) {
    staleTime = isSameMonth(forDateRange, new Date())
      ? 1000 * 60 * 60    // 1 hour for current month
      : Infinity;         // Forever for past months
  }

  return useQuery({
    queryKey,
    queryFn: () => getWorkoutLogs(user.uid, dateRange),
    staleTime,
    enabled: !!user && enabled,
  });
}
```

### Cache Invalidation

When a user creates, updates, or deletes a workout:

```typescript
// Invalidate the specific month's cache
const monthKey = format(workoutDate, 'yyyy-MM');
queryClient.invalidateQueries({ queryKey: ['workouts', userId, monthKey] });

// Also invalidate current week (if applicable)
const weekKey = `${getYear(today)}-W${getWeek(today)}`;
queryClient.invalidateQueries({ queryKey: ['workouts', userId, weekKey] });
```

### Centralized Date Range Utilities

Common date range calculations are extracted into `/src/lib/date-range-utils.ts` for consistency:

```typescript
// Get date 6 weeks ago (used for filtering recent lift/workout data)
export function getSixWeeksAgo(): Date {
  return subWeeks(new Date(), 6);
}

// Get 6 completed weeks + partial current week (used for plan generation, strength analysis)
export function getSixWeeksRange(): { start: Date; end: Date } {
  const weekStart = startOfWeek(new Date());
  const sixWeeksBeforeCurrentWeek = subWeeks(weekStart, 6);
  return { start: sixWeeksBeforeCurrentWeek, end: new Date() };
}
```

**Used by:**
- **Plan Page** — Fetches 6-week range for personalized weekly plans
- **Lift Progression Analysis** — Analyzes strength trends over 6 weeks
- **Strength Balance Analysis** — Compares lift ratios using 6-week averages

This centralization ensures consistent date range logic across all analysis features.

### Cost Impact

**Analysis Page Optimization (Smart Date Range Fetching)**

Before: Fetched ALL workouts every time page loaded
- User with 500 workouts: ~500 documents read per load
- 5 loads/day × 100 users = 250,000 reads/day

After: Fetches only selected time range
- Default (This Week): ~7-10 documents per load
- This Month: ~30 documents per load
- This Year: ~365 documents per load
- Reduction: **80-90% fewer reads** on analysis page

**Monthly Savings Example**
- Without optimization: 7.5M reads/month (likely exceeds free tier)
- With optimization: 1-2M reads/month (comfortably within free tier)
- Estimated savings: $3-5/month per 100 DAU

### Fallback Data

If Firestore is unavailable, the app falls back to hardcoded data in `/src/lib/exercise-data.ts`:

```typescript
// All Firestore read functions include try-catch with fallback
try {
  const exercises = await getCachedActiveExercises();
  return exercises;
} catch (error) {
  logger.warn('Firestore unavailable, using fallback data', { error });
  return HARDCODED_EXERCISES;
}
```

**Fallback includes**:
- 316+ common exercises with all properties
- Exercise aliases for legacy name mapping
- Strength ratios for standard lifts

## Performance Impact

### Firestore Read Reduction

With the current caching strategy:

- **Without caching**: ~15-20 reads per page load per user
- **With caching**: ~1 read per hour per server instance (shared across users)
- **Reduction**: ~95% fewer reads

### Cost Savings

- **Daily active users**: 100 (conservative estimate)
- **Page loads per user**: ~5 per day
- **Reads per load without cache**: 20
- **Reads per load with cache**: 0.1 (averaged)

**Monthly cost reduction**: ~$3-5 (on free tier: ~$0)

### User Experience

- **Page load time**: ~100-200ms faster (cache hit)
- **Real-time freshness**: Exercise data updates within 1-24 hours
- **Offline support**: Works offline with React Query cached data

## Cache Invalidation

### Manual Invalidation

If exercises are updated in Firestore (e.g., admin adds new exercise), invalidate the cache:

```typescript
import { revalidateTag } from 'next/cache';

// In server action that updates exercises
await updateExerciseInFirestore(exerciseId, updates);
revalidateTag('exercises'); // Clear all exercise caches
```

### Scheduled Invalidation

The cache automatically revalidates on its TTL:
- Active exercises: every 1 hour
- Aliases: every 24 hours
- Strength ratios: every 24 hours

### Manual Testing Cache

To test cache behavior:

```bash
# Run verification script
npm run verify:cache

# Expected output: All cache configurations valid, TTLs reasonable
```

## Optimization Opportunities

### Current Strengths
✅ **Multi-layer strategy** - Server + client caching
✅ **Reasonable TTLs** - Balances freshness and cost
✅ **Fallback mechanism** - High availability
✅ **Tag-based invalidation** - Coordinated cache updates

### Future Enhancements

1. **Request-scoped deduplication** (Phase 2)
   - In single request, if `getCachedActiveExercises()` called multiple times, return same data
   - Currently: Each call uses cache but still separate Firestore reads if cache expires
   - Benefit: +5-10% cost reduction for write-heavy operations (PR parsing)

2. **Compressed cache storage** (Phase 3)
   - Store exercise data compressed in-memory
   - Benefit: Reduces memory usage, faster network transfer for client-side
   - Effort: Low (Next.js handles compression)

3. **Pre-warm cache on server startup** (Phase 4)
   - Load common exercises into cache immediately
   - Benefit: Faster initial page loads
   - Trade-off: Slower server startup

4. **Firestore collections-split** (See collections-split.md)
   - Split user data into subcollections with separate caching
   - Benefit: 70-80% read reduction for user-specific data
   - Status: Documented but not yet implemented

## Troubleshooting

### Cache seems stale
Check:
1. Is `staleTime` configured on React Query hook?
2. Has the 1h/24h TTL expired?
3. Are you in development mode? (caching disabled by default in `next.config.ts`)

Solution:
```typescript
// Force refresh React Query
queryClient.invalidateQueries({ queryKey: ['exercises'] });

// Refresh entire exercise cache
revalidateTag('exercises');
```

### Fallback data being used
Check:
1. Is Firestore available? (Check `/api/health`)
2. Are service account credentials valid?
3. Are Firestore security rules too restrictive?

Solution:
1. Check Cloud Logging for Firestore errors
2. Verify security rules in `/firestore.rules`
3. Re-deploy with correct credentials

### Memory usage too high
Check:
1. Is React Query `gcTime` too high? (default: 24h)
2. Are many exercises cached?

Solution:
```typescript
// Reduce garbage collection time
gcTime: 1000 * 60 * 60, // 1 hour instead of 24
```

## Monitoring

### Metrics to Track

See `/docs/firestore-cost-estimation.md` for Firestore read/write monitoring.

Key metrics:
- **Firestore reads per day** - Should be <1M (free tier limit)
- **Cache hit rate** - Monitor via Cloud Logging
- **Page load time** - Track cache effectiveness

### Verification

Run the cache verification script to ensure configurations are valid:

```bash
npm run verify:cache
```

This checks:
- ✓ All `unstable_cache` calls have `revalidate` parameters
- ✓ TTL values are reasonable (not too long/short)
- ✓ Cache keys are unique and descriptive
- ✓ No unintentional cache bypasses

## References

- [Next.js Data Cache](https://nextjs.org/docs/app/building-your-application/caching#data-cache)
- [Next.js unstable_cache](https://nextjs.org/docs/app/building-your-application/caching#unstable_cache)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Firestore Pricing](https://firebase.google.com/pricing) (1M reads/day free tier)
