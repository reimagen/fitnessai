# Unilateral Load Semantics Review

**Last Updated**: 2026-02-17  
**Owner**: FitnessAI Team  
**Related Queue Item**: `.planning/codebase/CONCERNS.md` item 3

## Purpose

Define a clear, low-risk approach for showing inline `Per limb` hints in workout logging UX without changing stored data semantics yet.

## Scope (Current Phase)

- Add an app-code resolver for exercise load semantics.
- Show inline weight hint in `WorkoutLogForm` when exercise is unilateral.
- Keep existing exercise names and stored weight behavior unchanged.

## Non-Goals (Current Phase)

- No automatic weight conversion/reinterpretation for existing logs.

## Status Update (2026-02-17)

Phase B has started:
- `ExerciseDocument` now supports optional `loadSemantics` metadata.
- UI hint resolution is now strict metadata-driven (`loadSemantics` from exercise docs; unknown when missing/invalid).
- Migration/backfill tooling is available:
  - `npm run backfill-exercise-load-semantics` (dry-run)
  - `npm run backfill-exercise-load-semantics -- --apply` (write)

## Resolver Contract (App-Code Only)

Create a local resolver module (proposed path: `src/lib/exercise-load-semantics.ts`) with local-only types:

```ts
export type LoadSemantics = "per_limb" | "total_load" | "unknown";
```

Lookup key:
- Use canonical `normalizedName` (not Firestore `id`) to align with existing normalization flow.

Proposed return shape:

```ts
type LoadSemanticsResult = {
  loadSemantics: LoadSemantics;
};
```

Fallback behavior:
- Unknown exercise or unmapped canonical name returns `{ loadSemantics: "unknown" }`.

## Proposed Mapping (Initial)

Source: active Firestore exercise audit (`projectId: fitnessai-dev-dummy`, 2026-02-17).

### Per Limb

| Normalized Name | Display Name | Semantics | Confidence | Notes |
|---|---|---|---|---|
| dumbbell curl per arm | Dumbbell Curl (Per Arm) | per_limb | High | Explicit in canonical name |
| dumbbell bench press per arm | Dumbbell Bench Press (Per Arm) | per_limb | High | Explicit in canonical name |
| incline dumbbell bench press per arm | Incline Bench Press (Per Arm) | per_limb | High | Explicit in normalized name |
| dumbbell shoulder press per arm | Dumbbell Shoulder Press (Per Arm) | per_limb | High | Explicit in canonical name |
| seated dumbbell shoulder press per arm | Seated Shoulder Press (Per Arm) | per_limb | High | Explicit in normalized name |
| dumbbell lateral raise per arm | Dumbbell Lateral Raise (Per Arm) | per_limb | High | Explicit in canonical name |
| dumbbell row per arm | Dumbbell Row (Per Arm) | per_limb | High | Explicit in canonical name |
| hammer curl per arm | Hammer Curl (Per Arm) | per_limb | High | Explicit in canonical name |
| dumbbell fly per arm | Dumbbell Fly (Per Arm) | per_limb | High | Explicit in canonical name |
| dumbbell reverse fly per arm | Dumbbell Reverse Fly (Per Arm) | per_limb | High | Explicit in canonical name |
| dumbbell romanian deadlift per arm | Dumbbell Romanian Deadlift (Per Arm) | per_limb | High | Explicit in canonical name |
| dumbbell lunge per arm | Dumbbell Lunge (Per Arm) | per_limb | High | Unilateral entry despite legacy naming |
| dumbbell tricep kickback per arm | Dumbbell Tricep Kickback (Per Arm) | per_limb | High | Explicit in canonical name |
| dumbbell bulgarian split squat per arm | Dumbbell Bulgarian Split Squat (Per Arm) | per_limb | High | Unilateral entry despite legacy naming |
| dumbbell calf raise per arm | Dumbbell Calf Raise (Per Arm) | per_limb | High | Unilateral entry despite legacy naming |
| cable kickback | Cable Kickback (Per Leg) | per_limb | High | Confirmed decision: treat as unilateral/per-side load; normalized key stays `cable kickback` |

### Total Load

| Normalized Name | Display Name | Semantics | Confidence | Notes |
|---|---|---|---|---|
| barbell lunge | Barbell Lunge | total_load | Medium | Usually entered as total external load |
| cable bicep curl | Cable Bicep Curl | total_load | High | Decision confirmed |
| cable tricep pushdown | Cable Tricep Pushdown | total_load | High | Decision confirmed |
| tricep rope pushdown | Tricep Rope Pushdown | total_load | High | Decision confirmed |

### Confirmed Cable Decisions

| Normalized Name | Semantics | Decision |
|---|---|---|
| cable kickback | per_limb | Confirmed |
| cable lateral raise | per_limb | Confirmed |
| cable fly | per_limb | Confirmed |
| cable bicep curl | total_load | Confirmed |
| cable tricep pushdown | total_load | Confirmed |
| tricep rope pushdown | total_load | Confirmed |

## UX Behavior Spec

Placement:
- `WorkoutLogForm` on Weight line, adjacent to `Weight` label/input area.

Rules:
- Show `Per limb` when resolver returns `per_limb`.
- Show nothing for `total_load` or `unknown`.

Constraints:
- No tooltip required.
- No dropdown required.
- No interruption to current data entry flow.

## Test Plan

Resolver unit tests:
- returns `per_limb` for mapped unilateral entries
- returns `total_load` for mapped bilateral entries
- returns `unknown` fallback for unmapped entries

Form tests (`WorkoutLogForm`):
- hint visible for unilateral mapped exercise
- hint hidden for bilateral mapped exercise
- hint hidden for unknown exercise
- hint updates correctly when exercise changes in-row

## Rollout Plan

Phase A (this item):
- implement local resolver map + inline UI hint
- ship with tests

Phase B (in progress):
- migrate semantics into Firestore exercise metadata (schema support + backfill tooling shipped)
- local fallback map removed from runtime; environment backfills must be completed before expecting non-`unknown` hints

## Open Decisions

1. Confirm whether to rename any display labels later for clarity (not required for current phase).  
2. Confirm when/if to promote semantics into Firestore schema (Phase B trigger).
