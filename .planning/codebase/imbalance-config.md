# Imbalance Component Plan (Firestore-First)

## Context

The remaining issue is not Firestore exercise availability; it is that imbalance pairing logic still originates from hardcoded name pairs (`IMBALANCE_CONFIG`) and then attempts to resolve them.  
Other mature flows already use Firestore as source-of-truth directly:
- **Workout logs write path:** canonicalizes exercise names/categories using Firestore `exerciseAliases` + `exercises` (`src/components/history/WorkoutLogForm.tsx`).
- **Lift progression read path:** resolves from Firestore-backed exercise library and aggregates over 6 weeks (`src/hooks/useLiftProgression.ts`, `src/components/analysis/LiftProgressionCard.tsx`).

Related display correctness issue discovered:
- Lift progression header currently hardcodes `lbs` for average e1RM label in chart UI, but computed unit is already available from calculation output.
- Immediate policy: use computed unit (`avgE1RMUnit`) in UI labels; do not hardcode unit text.

## Goal

Make imbalance matching Firestore-native, so all pair mapping comes from Firestore IDs/canonical records instead of hardcoded string options, and ensure both Lift Progression and Strength Balance consume the same 6-week e1RM aggregation.

## Revised Architecture

1. Add Firestore config document for imbalance pairs
- Collection/doc: `config/imbalanceConfig`
- Shape:
  - `version`: number
  - `updatedAt`: Firestore timestamp
  - `updatedBy`: string (uid/email)
  - `pairs[]`:
    - `imbalanceType`
    - `lift1CanonicalId`
    - `lift2CanonicalId`
    - optional `displayNameOverride`
    - optional `isActive`
- Validation rules:
  - `lift1CanonicalId !== lift2CanonicalId`
  - both IDs must exist in active `exercises`
  - pair uniqueness by (`imbalanceType`, `lift1CanonicalId`, `lift2CanonicalId`)
- Keep ratio thresholds in current standards source unless explicitly migrated.

2. Resolve exercises by canonical ID, not free-text names
- Build lookup maps from `useExercises()`:
  - `exerciseById`
  - `normalizedNameById`
- For each pair, derive canonical normalized names from IDs.
- Match workout log entries after canonical resolution (same pattern as lift progression).

3. Keep write-path canonicalization as primary data hygiene
- Continue relying on WorkoutLogForm alias->canonical mapping so newly saved logs use canonical names.
- Imbalance read-path still canonical-resolves each entry for backward compatibility with older logs.

4. Replace hardcoded `IMBALANCE_CONFIG` as primary source
- Keep static config only as fallback when Firestore config missing/malformed.
- Health check should mark degraded when fallback is in use in production.

5. Shared 6-week aggregation layer for both analysis cards
- Introduce a single canonicalized aggregation utility/hook for last-6-weeks workout logs:
  - key: canonical normalized exercise name (or canonical ID if available in logs)
  - metrics: avg e1RM, session count, per-day trend points, total volume
- Lift Progression consumes this for chart/trend computations.
- Strength Balance consumes this for pair comparisons.
- Remove duplicate 6-week scanning logic paths where feasible.

6. Unit-label consistency policy
- For any displayed e1RM summary value, render the returned/calculated unit (e.g., `avgE1RMUnit`) rather than hardcoded `lbs`.
- Applies immediately to Lift Progression header e1RM badge.
- Internal math policy:
  - normalize to kg for computation
  - convert to display unit at final render boundary
- Display policy:
  - use profile unit preference where available
  - if unavailable, use metric-provided computed unit

7. Deterministic ambiguity handling for canonical resolution
- Prefer canonical ID mappings from Firestore aliases over string heuristics.
- When multiple canonical candidates exist for a normalized input:
  - do not silently pick arbitrary candidate
  - emit diagnostic log and mark as unresolved for that matching pass
- Imbalance pair matching should use canonical IDs from config to avoid ambiguity.

8. Explicit cutoff semantics
- Six-week window must use one consistent rule across cards:
  - `date >= sixWeeksAgo` (inclusive) or `date > sixWeeksAgo` (exclusive)
- Document and enforce chosen rule in shared aggregator + tests.

## Implementation Steps

1. Shared aggregation extraction (new first step)
- Extract a shared `useSixWeekLiftMetrics` (or pure util + memoized hook) from existing lift progression + `find6WeekAvgE1RM` logic.
- Inputs:
  - 6-week workout logs
  - exercise library (Firestore)
- Outputs:
  - map keyed by canonical lift key with:
    - canonicalId (when available)
    - avg e1RM + unit
    - session count
    - trend/volume source points
- Update Lift Progression to consume this shared output (instead of recalculating average separately in `useLiftTrends`).

2. Immediate unit-label fix (fast patch)
- Update `LiftProgressionChart` props to accept `avgE1RMUnit`.
- Pass through from `LiftProgressionCard` (`useLiftTrends` already returns `avgE1RMUnit`).
- Replace hardcoded `lbs` header label with computed unit.

3. Data contract + loader
- Add `ImbalancePairConfig` type + zod validation.
- Add server loader (cached) similar to exercise-registry server helpers.
- Expose via query hook for analysis page.
- Add config version/fallback metadata to loader response.

4. Matching engine refactor
- Extract imbalance matching into dedicated util/hook:
  - Inputs: shared 6-week metrics map, exercise library, imbalance pair config
  - Output: findings + explicit missing-lift reasons per pair
- Remove string-option resolution path from primary flow.

5. UI updates
- `No Data` cards should show pair-specific missing lift(s), derived from config IDs.
- Preserve existing warning banner for config/library drift.

6. Observability
- Log degraded reasons:
  - missing config doc
  - unknown canonical ID in config
  - inactive/deleted exercise referenced by pair
  - fallback mode active
  - ambiguous alias/canonical resolution
- Keep `/api/health` payload simple; include details in logs only.

## Acceptance Criteria

With provided user scenario:
- Vertical Push vs. Pull: has data
- Adductor vs. Abductor: has data
- Hamstring vs. Quad: no data with explicit “missing Leg Extension”
- Horizontal Push vs. Pull: no data unless chest press exists, with explicit missing-lift reason

Technical:
- No hardcoded string options required for active production matching.
- Falls back safely only when Firestore config unavailable.
- Lift Progression header e1RM and Strength Balance lift e1RM values come from the same shared 6-week aggregation source.
- No hardcoded unit labels for computed e1RM values (must use computed/display unit from calculation output).
- Tests cover canonical-ID mapping, fallback path, and screenshot-equivalent fixture data.
- Shared aggregator uses one documented cutoff rule and both cards match it exactly.

## Test & Fixture Plan (Required)

1. Firestore fixture set
- Exercises:
  - `machine-shoulder-press`, `machine-lat-pulldown`, `machine-seated-row`, `machine-adductor`, `machine-abductor`, `machine-leg-curl`, `machine-leg-extension`
- Aliases:
  - unprefixed + prefixed variants for above canonical IDs
- Imbalance config:
  - pair definitions by canonical IDs for all four imbalance types
- Workout logs:
  - reproduce screenshot scenario (adductor/abductor present, leg extension absent)

2. Automated tests
- Loader/schema:
  - valid config
  - missing doc -> fallback + degraded log signal
  - unknown canonical IDs -> degraded
- Shared aggregator:
  - unit normalization/conversion
  - cutoff boundary behavior
  - canonical alias resolution
- Imbalance matching:
  - ID-based pair matching success/failure
  - explicit missing-lift reasons
- UI:
  - Lift Progression e1RM label uses computed/display unit
  - Strength Balance `No Data` reason text correctness

## Rollout Strategy

1. Phase A (low risk)
- Ship unit-label fix + shared aggregator behind internal feature flag.
- Verify parity between old/new outputs in dev logging.

2. Phase B
- Enable Firestore imbalance config loader + ID-based matching behind flag.
- Keep hardcoded fallback active.

3. Phase C
- Remove hardcoded primary path after production parity verification.
- Keep fallback for disaster recovery only.

## Next Item to Execute

Implement **Step 1 + Step 2** in one PR:
- extract shared 6-week metrics aggregation and switch Lift Progression to consume it
- apply immediate unit-label fix (use `avgE1RMUnit`, remove hardcoded `lbs`)

Then follow with Step 3 + Step 4 (Firestore imbalance config + ID-based matching) in a second PR, and Step 5 for No-Data reason messaging.
