# Performance Baseline Checklist

**Last Updated**: 2026-02-17  
**Owner**: FitnessAI Team  
**Source Queue**: `.planning/codebase/CONCERNS.md` (items 2, 4-7)

## Execution Status

- [x] Before-baseline captured
- [x] Optional read-footprint snapshot captured
- [x] Optimization implementation complete (items 4-6)
- [x] After-baseline captured (items 4-6 scope)
- [x] Before/after comparison finalized (items 4-6 scope)
- [x] Item 7-specific render baseline/final comparison captured

## Purpose

Capture a lightweight before/after snapshot so performance changes are validated without heavy process overhead.

## Scope

Use this checklist before and after work on:
- Firestore analysis read-path optimization (item 4)
- Client chart/windowing optimization (item 5)
- Exercise registry migration impacts (item 6)
- Large component re-render remediation (item 7)

## Baseline Method (Fast)

Use one realistic account and one realistic usage flow.

- Runs: `1 cold + 3 warm`
- Dataset: normal real-world data for your account
- Record median for warm runs (no p95 requirement)

## What To Measure

1. Analysis server action duration
- Action: `analysis/analyzeStrengthAction`
- Source: dev server logs (`"message":"Server action completed"` with `"route":"analysis/analyzeStrengthAction"`)

2. Component render cost (React Profiler)
- `src/components/history/WorkoutLogForm.tsx`
- `src/components/analysis/StrengthBalanceCard.tsx`
- `src/components/profile/WeeklyCardioTargetsCard.tsx`

3. Network timing snapshot
- One analysis request timing from browser Network tab (same flow before/after)

## Quick Procedure

1. Start app with full info logs:
```bash
LOG_INFO_SAMPLE_RATE=1 npm run dev
```

2. Capture **before** values
- 1 cold + 3 warm runs for analysis action duration
- Profiler snapshot for each component
- one Network timing value

3. Implement optimization work (items 4-7)

4. Capture **after** values with same flow

5. Compare and mark outcome
- `Improved`, `No Material Change`, or `Regressed`

## Results Table

| Metric | Before | After | Outcome | Notes |
|---|---|---|---|---|
| `analysis/analyzeStrengthAction` duration (cold) | 2915ms | 2510ms | Improved | representative cold run |
| `analysis/analyzeStrengthAction` duration (warm median) | 2532ms | 2598ms | No Material Change | before warm samples: 2700, 2402, 2368, 2695; after warm samples: 2510, 2678, 2942, 2518 |
| `Chart compute / time-range switch (Performance)` | 2213ms scripting | 1702ms scripting | Improved | weekly -> monthly switch; Performance tab summary |
| `WorkoutLogForm` render (Profiler) | 14.9ms | 31.4ms | Regressed | after snapshot included broader subtree work (`WorkoutList`, `DatePicker`), indicating remaining render churn risk |
| `StrengthBalanceCard` render (Profiler) | 1.6ms | 6.1ms | Regressed | no direct code remediation in this slice; treated as known follow-up risk |
| `WeeklyCardioTargetsCard` render (Profiler) | 9.2ms | 6.4ms | Improved | consistent with auto-display memoization change |
| Analysis request timing (Network tab) | 3.16s | 2.74s | Improved | representative after run, same analysis flow |

## Notes

- Keep the same account/flow for before and after.
- If flow changes materially, recapture before values.
- If metrics regress, log why in `docs/changelog.md` when closing the work item.
- Optional read-footprint snapshot (temporary instrumentation): `getWorkoutLogs readCount=7 durationMs=153`, `getPersonalRecords readCount=22 durationMs=128`.
- Comparison disposition:
  - Item 4 read-path and item 5 chart-compute changes are accepted (no regressions; one clear improvement and one no-material-change outcome).
  - Item 6 registry hardening is accepted via functional/health validation and no observed analysis-path regression in this baseline scope.
  - Item 7 targeted code fixes landed with mixed profiler outcome: `WeeklyCardioTargetsCard` improved while `WorkoutLogForm` and `StrengthBalanceCard` remain above baseline snapshots; keep item 7 open for additional remediation.
