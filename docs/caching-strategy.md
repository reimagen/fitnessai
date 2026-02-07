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
