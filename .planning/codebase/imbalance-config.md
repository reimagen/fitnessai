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
  - `date >= sixWeeksAgo` (inclusive)
- Decision: inclusive boundary chosen (user-confirmed) and must be enforced in shared aggregator + tests.

## Implementation Steps

1. ~~Shared aggregation extraction~~ **RESOLVED**
- Delivered `buildSixWeekLiftMetrics` in `src/analysis/six-week-lift-metrics.ts`.
- Tests: `src/analysis/six-week-lift-metrics.test.ts`.

2. ~~Immediate unit-label fix~~ **RESOLVED**
- Lift Progression header uses computed `avgE1RMUnit` instead of hardcoded `lbs`.

3. ~~Rewire StrengthBalanceCard to shared aggregation (prerequisite for Steps 4/5)~~ **RESOLVED**
- Replace `find6WeekAvgE1RM` calls in `StrengthBalanceCard.tsx` with `buildSixWeekLiftMetrics` lookup.
- Delete `find6WeekAvgE1RM` and `calculateAvgE1RM` from `analysis.config.ts` (duplicate logic now that shared layer exists).
- Extract pure utils (severity classification, ratio parsing, imbalance focus rules) to `src/analysis/strength-balance.utils.ts`.
- Add unit tests for extracted utils (`src/analysis/strength-balance.utils.test.ts`).
- Reference: `.planning/codebase/balance-card-refactor.md` Phases 1-2 cover this scope.
- Why now: without this, Step 4's matching engine would build on the old aggregation path, creating three parallel aggregation flows instead of one.
- Completed verification:
  - `npm run typecheck`
  - `npm run test:ci -- src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts src/app/analysis/actions.test.ts`
  - `npm run test:ci -- src/hooks/use-strength-balance-data.test.tsx src/components/analysis/strength-balance-finding-card.test.tsx src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts`

4. Data contract + loader
- Add `ImbalancePairConfig` type + zod validation.
- Add server loader (cached) similar to exercise-registry server helpers.
- Expose via query hook for analysis page.
- Add config version/fallback metadata to loader response.
- Include loader telemetry fields for diagnostics: source (`firestore`|`fallback`), config version, validation issue count.

5. Matching engine refactor
- Extract imbalance matching into dedicated util/hook:
  - Inputs: `SixWeekLiftMetricsMap` (from shared aggregation), exercise library, imbalance pair config
  - Output: findings + explicit missing-lift reasons per pair
- Remove string-option resolution path from primary flow.
- Preserve legacy hardcoded path behind fallback only (never primary path when Firestore config is valid).

6. UI updates
- `No Data` cards should show pair-specific missing lift(s), derived from config IDs.
- Extract `StrengthBalanceFindingCard` to standalone presentational component.
- Preserve existing warning banner for config/library drift.

7. Observability
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

**Steps 6-7: UI and observability follow-through**:
- Step 6: Expand no-data reason text and any remaining UX affordances.
- Step 7: Continue operational monitoring hardening and rollout checks.

In parallel, continue **Phase 2 remaining server-action suites** tracked in `testing-upgrades.md`.

## Step 3+ Readiness Assessment (2026-02-14, revised)

Status: **Steps 4-5 implemented and verified (2026-02-14)**

Findings:
- Step 1/2 prerequisites complete (shared aggregation delivered, unit-label fix applied).
- Step 3 closure complete in `balance-card-refactor.md` and `CONCERNS.md` (utils extraction, hook/card split, ratio-only contract alignment, recommendation dedupe policy implementation).
- Targeted boundary coverage now exists for hook/card refactor seams.
- Main dependency risk: regression in server-action orchestration coverage (`analysis/actions.ts`, `profile/actions.ts`), mitigated by running targeted Phase 2 suites in parallel.

Execution outcome:
1. Implemented Step 4 (`src/lib/imbalance-config-types.ts`, `src/lib/imbalance-config.server.ts`, `src/app/analysis/actions.ts`, `src/lib/firestore.service.ts`).
2. Implemented Step 5 (`src/analysis/imbalance-matcher.ts`, `src/analysis/strength-balance.utils.ts`, `src/hooks/useStrengthBalanceData.ts`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/app/analysis/page.tsx`).
3. Added no-data missing-lift propagation and rendering (`src/components/analysis/StrengthBalanceFindingCard.tsx`).
4. Added imbalance-config health signal wiring (`src/lib/logging/health-check.ts`, `src/app/api/health/route.ts`).
5. Kept targeted Phase 2 suites green while landing Step 4/5.

Verification:
- `npm run test -- src/lib/imbalance-config.server.test.ts`
- `npm run test -- src/analysis/imbalance-matcher.test.ts`
- `npm run test -- src/analysis/strength-balance.utils.test.ts`
- `npm run test -- src/app/analysis/actions.test.ts`
- `npm run test -- src/lib/logging/health-check.test.ts`
- `npm run typecheck`
- `npm run test:ci` (269 passing)



Steps 4-5 claude:
# Imbalance Steps 4-5: Firestore Config + ID-Based Matching

## Context

`IMBALANCE_CONFIG` in `src/analysis/analysis.config.ts` is hardcoded with string-based exercise name options (`lift1Options: ['chest press']`). Adding or changing imbalance pair definitions requires a code deploy. `buildClientSideFindings` in `src/analysis/strength-balance.utils.ts` reads this config to drive matching. Steps 4-5 replace this with a Firestore-backed config document, keeping `IMBALANCE_CONFIG` only as a fallback.

Prerequisites complete:
- `buildSixWeekLiftMetrics` (shared aggregation layer) — `src/analysis/six-week-lift-metrics.ts`
- `buildClientSideFindings` already uses `SixWeekLiftMetricsMap` — `src/analysis/strength-balance.utils.ts:161`
- `useStrengthBalanceData` hook is clean — `src/hooks/useStrengthBalanceData.ts`
- `IMBALANCE_CONFIG` is the only remaining hardcoded source

---

## Step 4: Firestore Config Type + Server Loader

### 4a. Types + Zod schema — `src/lib/imbalance-config-types.ts` (new)

```ts
export type ImbalancePairConfig = {
  lift1CanonicalId: string;
  lift2CanonicalId: string;
  imbalanceType: ImbalanceType;           // reuse existing union
  displayNameOverride?: string;
  isActive?: boolean;
};

export type ImbalanceConfigDocument = {
  version: number;
  updatedAt: Date;
  updatedBy: string;
  pairs: ImbalancePairConfig[];
};

export type ImbalanceConfigLoaderResult = {
  config: ImbalanceConfigDocument | null;
  source: 'firestore' | 'fallback';
  validationIssueCount: number;
};
```

Zod schema validates:
- `lift1CanonicalId !== lift2CanonicalId`
- `imbalanceType` is one of `IMBALANCE_TYPES`
- `pairs` is non-empty array

### 4b. Server loader — `src/lib/imbalance-config.server.ts` (new)

Follows `exercise-registry.server.ts` pattern exactly:
- `unstable_cache` wrapping Firestore `config/imbalanceConfig` doc fetch
- TTL: `86400` seconds (write-rarely data), tag: `['imbalance-config']`
- Returns `ImbalanceConfigDocument | null`
- `getImbalanceConfig()` exported function:
  - Calls cached loader
  - On success: validates with Zod, logs validation issue count
  - On failure/null: returns `null` (caller handles fallback)
  - Uses `getAdminDb()` from `src/lib/firebase-admin.ts`

### 4c. Server action — `src/app/analysis/actions.ts` (modify)

Add `getImbalanceConfigAction(userId: string)` following existing action pattern:
- Auth check
- Calls `getImbalanceConfig()` from loader
- Returns `{ success: true, data: ImbalanceConfigLoaderResult }` or `{ success: false, error }`

### 4d. React Query hook — `src/lib/firestore.service.ts` (modify)

Add `useImbalanceConfig(enabled: boolean)`:
- `queryKey: ['imbalance-config']`
- `queryFn`: calls `getImbalanceConfigAction(user.uid)`
- `staleTime: Infinity` (write-rarely, invalidated by admin mutation only)
- Note: `analysis/page.tsx` is currently a client page, so config is loaded via server action + React Query for this phase.

---

## Step 5: ID-Based Matching Engine

### 5a. Exercise lookup map — `src/analysis/imbalance-matcher.ts` (new)

Add helper to build `exerciseById` map from `ExerciseDocument[]`:
```ts
const buildExerciseById = (exercises: ExerciseDocument[]): Map<string, ExerciseDocument> =>
  new Map(exercises.map(ex => [ex.id, ex]));
```

### 5b. Update `getBestLiftSummary` signature — `src/analysis/strength-balance.utils.ts` (modify)

Current signature uses `exerciseOptions: string[]` (name strings from `IMBALANCE_CONFIG`).

New overload accepts canonical IDs:
```ts
// Internal — used by Firestore-backed path
const getBestLiftSummaryById = (
  metricsMap: SixWeekLiftMetricsMap,
  canonicalId: string,
  exerciseById: Map<string, ExerciseDocument>
): LiftSummary | null
```

Logic: `exerciseById.get(canonicalId)` → get `normalizedName` → look up `metricsMap[normalizedName]`.

Existing `getBestLiftSummary` (string-options path) becomes the fallback path only.

### 5c. Update `buildClientSideFindings` — `src/analysis/strength-balance.utils.ts` (modify)

Add optional `imbalanceConfig` param:

```ts
export const buildClientSideFindings = (
  workoutLogs: WorkoutLog[] | undefined,
  userProfile: UserProfile | undefined,
  exercises: ExerciseDocument[],
  imbalanceConfig?: ImbalanceConfigDocument | null   // NEW
): ClientSideFinding[]
```

Logic:
```
if imbalanceConfig has active pairs:
  for each pair in imbalanceConfig.pairs filtered by isActive !== false:
    lift1 = getBestLiftSummaryById(metricsMap, pair.lift1CanonicalId, exerciseById)
    lift2 = getBestLiftSummaryById(metricsMap, pair.lift2CanonicalId, exerciseById)
    if !lift1 or !lift2: push hasData: false with missingLift reason (NEW)
    else: push finding
else:
  // fallback: existing IMBALANCE_CONFIG string-options path unchanged
  log degraded signal
  for each type in IMBALANCE_TYPES: existing getBestLiftSummary path
```

### 5d. Add missing-lift reason to no-data findings

Extend `ClientSideFinding` no-data shape:
```ts
{ imbalanceType: ImbalanceType; hasData: false; missingLifts?: string[] }
```

`missingLifts` populated from canonical IDs when `getBestLiftSummaryById` returns null — derive display name from `exerciseById.get(id)?.name ?? id`.

### 5e. Update `useStrengthBalanceData` hook — `src/hooks/useStrengthBalanceData.ts` (modify)

Add `imbalanceConfig` param, pass through to `buildClientSideFindings`:
```ts
interface UseStrengthBalanceDataParams {
  workoutLogs: WorkoutLog[] | undefined;
  userProfile: UserProfile | undefined;
  exercises: ExerciseDocument[];
  fitnessGoals?: FitnessGoal[];
  imbalanceConfig?: ImbalanceConfigDocument | null;  // NEW
}
```

### 5f. Update analysis page — `src/app/analysis/page.tsx` (modify)

Add `useImbalanceConfig` call, pass result to `StrengthBalanceCard`:
```ts
const { data: imbalanceConfigResult } = useImbalanceConfig(enableDataFetching);
```

Pass `imbalanceConfigResult?.data?.config` as prop to `StrengthBalanceCard` → forwards to `useStrengthBalanceData`.

### 5g. Update `StrengthBalanceCard` — `src/components/analysis/StrengthBalanceCard.tsx` (modify)

Add `imbalanceConfig?: ImbalanceConfigDocument | null` to `StrengthBalanceCardProps`, forward to `useStrengthBalanceData`.

### 5h. Update No-Data UI — `src/components/analysis/StrengthBalanceFindingCard.tsx` (modify)

When `finding.missingLifts` is populated, show specific message:
> "Missing: Leg Extension" instead of generic "Log workouts to analyze"

---

## Health Check (Step 7 from imbalance-config.md)

Add `imbalanceConfig` check to `src/lib/logging/health-check.ts`:
- `healthy`: Firestore config loaded and valid
- `degraded`: falling back to hardcoded `IMBALANCE_CONFIG`
- Details in server log only (not in `/api/health` response payload)
- Delivery note: can land as immediate follow-up if Step 4/5 merge must stay narrowly scoped.

---

## Tests to Add

1. **Loader tests** — `src/lib/imbalance-config.server.test.ts` (new)
   - Valid Firestore doc → parses correctly
   - Missing doc → returns null
   - Invalid schema → returns null + logs warning

2. **Matching engine tests** — `src/analysis/strength-balance.utils.test.ts` (extend)
   - ID-based path: known canonical ID → finds lift summary
   - ID-based path: unknown canonical ID → `missingLifts` populated
   - Fallback path: no config → falls back to `IMBALANCE_CONFIG` string-options
   - Mixed: partial config (some pairs active, some inactive)

3. **No-data UI tests** — `src/components/analysis/strength-balance-finding-card.test.tsx` (extend)
   - `missingLifts` present → shows specific exercise name
   - `missingLifts` absent → shows generic message

---

## Files

| File | Change |
|------|--------|
| `src/lib/imbalance-config-types.ts` | NEW — types + Zod schema |
| `src/lib/imbalance-config.server.ts` | NEW — cached Firestore loader |
| `src/app/analysis/actions.ts` | Add `getImbalanceConfigAction` |
| `src/lib/firestore.service.ts` | Add `useImbalanceConfig` hook |
| `src/analysis/strength-balance.utils.ts` | Add ID-based matching + missingLifts |
| `src/hooks/useStrengthBalanceData.ts` | Accept + forward `imbalanceConfig` |
| `src/app/analysis/page.tsx` | Fetch config, pass to card |
| `src/components/analysis/StrengthBalanceCard.tsx` | Accept + forward `imbalanceConfig` |
| `src/components/analysis/StrengthBalanceFindingCard.tsx` | Render `missingLifts` reason |
| `src/lib/logging/health-check.ts` | Add `imbalanceConfig` health check |
| `src/lib/imbalance-config.server.test.ts` | NEW — loader tests |
| `src/analysis/strength-balance.utils.test.ts` | Extend matching engine tests |
| `src/components/analysis/strength-balance-finding-card.test.tsx` | Extend no-data UI tests |

---

## Verification

```bash
npm run test -- src/lib/imbalance-config.server.test.ts
npm run test -- src/analysis/strength-balance.utils.test.ts
npm run test -- src/components/analysis/strength-balance-finding-card.test.tsx
npm run test:ci      # 269+ tests pass
npm run typecheck    # clean
```

Manual: Load analysis page with Firestore `config/imbalanceConfig` doc present → card uses ID-based matching. Remove doc → card falls back to hardcoded config, health check shows degraded.
