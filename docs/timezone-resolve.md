# Timezone Bug Fix: Saturday Data Display & Month-End Boundary Issues

## Problem Statement

The application had two related timezone bugs:

1. **Saturday Issue**: On Saturday in local time, the home page showed no activity data, while the history page correctly displayed the same data
2. **Month-End Issue**: On the last day of the month, the app would display data from the 1st of the next/previous month even when it shouldn't

Both issues occurred in timezones behind UTC (e.g., PST is UTC-8).

## Root Cause Analysis

The bugs stemmed from a fundamental timezone mismatch:

### The Problem
- **Server-side date calculations** were performed using `new Date()`, which returns UTC time
- When it's Saturday 8:00 PM PST (UTC-8), the server saw Sunday 4:00 AM UTC (next day)
- The server then calculated week boundaries based on this UTC Sunday, querying for the wrong week
- Same issue occurred with month boundaries: the last day of the month in local time became the first day of next month in UTC

### Example Scenario
**Local Time**: Saturday, January 18, 2025, 8:00 PM PST
**UTC Time**: Sunday, January 19, 2025, 4:00 AM

Server code:
```typescript
const today = new Date(); // Returns Sunday in UTC
const startDate = startOfWeek(today); // Calculates week starting Sunday Jan 19
const endDate = endOfWeek(today);     // Calculates week ending Saturday Jan 25
```

But the user's data was logged for the previous week (Sunday Jan 12 - Saturday Jan 18), so no data appeared.

## Solution: Calculate Dates Client-Side

The fix moves all date boundary calculations to the **client side** (where the local timezone is correct) and passes explicit `startDate` and `endDate` parameters to the server. The server no longer performs timezone-dependent calculations.

### Architecture Change

**Before**:
```
Client → Server (with forCurrentWeek: true flag)
Server calculates boundaries in UTC ❌
Server queries database with wrong dates
```

**After**:
```
Client calculates boundaries in local timezone ✓
Client → Server (with explicit startDate & endDate)
Server uses provided dates without modification ✓
Server queries database with correct dates
```

## Implementation Details

### File 1: `/src/lib/firestore-server.ts`

**Changes**:
1. Updated function signature to accept explicit date parameters:
```typescript
export const getWorkoutLogs = async (userId: string, options?: { startDate?: Date; endDate?: Date; since?: Date }): Promise<WorkoutLog[]>
```

2. Added explicit date range handling as the first condition:
```typescript
if (options?.startDate && options?.endDate) {
  q = baseQuery
    .where('date', '>=', options.startDate)
    .where('date', '<=', options.endDate)
    .orderBy('date', 'desc');
}
```

3. **Removed**:
   - `forMonth` parameter and its UTC-based month boundary calculation
   - `forCurrentWeek` parameter (no longer needed)
   - Unused date-fns imports (`startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `subWeeks`)
   - Unused Firebase imports (`DocumentSnapshot`, `subWeeks`)

4. **Fixed**: Type narrowing issue in `addPersonalRecords` function where `bestExistingRecord` type wasn't properly narrowed

### File 2: `/src/lib/firestore.service.ts`

**Updated hook - `useCurrentWeekWorkouts()`**:

Changed from:
```typescript
const queryFn: () => getWorkoutLogs(user!.uid, { forCurrentWeek: true })
```

To:
```typescript
const today = new Date(); // Client's local timezone
const weekStartDate = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
const weekEndDate = endOfWeek(today, { weekStartsOn: 0 });     // Saturday
const queryFn: () => getWorkoutLogs(user!.uid, { startDate: weekStartDate, endDate: weekEndDate })
```

**Updated hook - `useWorkouts()`**:

Changed from:
```typescript
if (forDateRange && forDateRange instanceof Date) {
  return getWorkoutLogs(user.uid, { forMonth: forDateRange });
}
```

To:
```typescript
if (forDateRange && forDateRange instanceof Date) {
  const monthStartDate = startOfMonth(forDateRange);
  const monthEndDate = endOfMonth(forDateRange);
  return getWorkoutLogs(user.uid, { startDate: monthStartDate, endDate: monthEndDate });
}
```

### File 3: `/src/app/history/actions.ts`

Updated the wrapper action signature to match the new parameters:
```typescript
export async function getWorkoutLogs(userId: string, options?: { startDate?: Date; endDate?: Date; since?: Date }): Promise<WorkoutLog[]>
```

## Benefits of This Approach

1. **Timezone-agnostic server**: Server no longer performs timezone calculations; it just uses explicit dates
2. **Correct calculations**: Client calculates boundaries in the user's actual local timezone
3. **Simpler logic**: No need for timezone libraries on the server side (for date boundaries)
4. **Consistent behavior**: Works correctly regardless of user's timezone offset from UTC

## Testing Verification

The fix has been tested for:
- ✅ Saturday data display on home page (current week)
- ✅ Month boundaries on history page (last day of month)
- ✅ Type safety improvements (fixed TypeScript errors)
- ✅ Backward compatibility with other date range queries

## Future Considerations

1. The `since` parameter still works as before and doesn't have timezone sensitivity issues
2. If adding new date range filters in the future, follow the same pattern: calculate boundaries on the client, pass explicit dates to server
3. Consider adding this pattern to any other date-based queries that might be added

## Commit

Commit hash: `bdfb449`
Branch: `timezone-resolve`
Message: "fix(home): Resolve Saturday timezone bug for current week workouts"
