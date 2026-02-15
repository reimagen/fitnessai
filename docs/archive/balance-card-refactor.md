# StrengthBalanceCard Refactor Plan

## Execution Status (2026-02-14)

- Overall: `FULL COMPLETION`
- Completion verdict: `CLOSED`
- Final assessment: `All planned phases complete; no open implementation blockers.`
- Completed:
  - Phase 1 core extraction delivered:
    - `src/analysis/strength-balance.utils.ts`
    - `src/analysis/strength-balance.utils.test.ts`
  - Phase 2 data hook extraction delivered:
    - `src/hooks/useStrengthBalanceData.ts`
  - Phase 3 presentational extraction delivered:
    - `src/components/analysis/StrengthBalanceFindingCard.tsx`
  - Container orchestration rewire delivered:
    - `src/components/analysis/StrengthBalanceCard.tsx`
  - Phase 4 contract alignment + recommendation dedupe delivered:
    - removed `Level Imbalance` from imbalance focus contracts in:
      - `src/analysis/analysis.utils.ts`
      - `src/analysis/badge-utils.ts`
      - `src/lib/types.ts`
      - `src/ai/flows/strength-imbalance-analyzer.ts`
      - `src/ai/flows/weekly-workout-planner.ts`
    - removed recommendation `explicitActionPrefix` from:
      - `src/ai/flows/strength-imbalance-analyzer.ts`
  - Closeout docs updated:
    - `.planning/codebase/CONCERNS.md`
    - `docs/changelog.md`
  - Duplicate aggregation path removed from config module:
    - removed `find6WeekAvgE1RM` / `calculateAvgE1RM` from `src/analysis/analysis.config.ts`
  - Verification completed:
    - `npm run typecheck`
    - `npm run test:ci -- src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts src/app/analysis/actions.test.ts`
    - `npm run test:ci -- src/hooks/use-strength-balance-data.test.tsx src/components/analysis/strength-balance-finding-card.test.tsx src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts`
    - import audit: `rg -n "find6WeekAvgE1RM|calculateAvgE1RM" src`
    - manual verification: AI "Get AI Insights" flow works and recommendation text no longer duplicates deterministic action line.

## Goal

Reduce `src/components/analysis/StrengthBalanceCard.tsx` from a god component into clear, testable modules before deeper imbalance Step 3/4 work (Firestore config + ID-based matching).

## Why Refactor Now

- Current file mixes:
  - domain logic (matching, ratio/level classification, severity bands)
  - request payload construction for AI
  - mutation orchestration
  - rendering and UX state
- This increases regression risk and slows Step 3/4 implementation.

## Current Gaps To Address In Refactor

1. Ratio-only UI logic drift vs AI flow
- Card now classifies imbalance by ratio only, but AI flow still contains `Level Imbalance` branch logic.
- Refactor must align the contract so unsupported paths are removed or clearly gated.

2. Balanced-state rendering edge cases
- Current balanced branch can show misleading progression text derived from `lift1Level` only.
- `Balanced + N/A` can render an empty guidance block.

3. Recommendation redundancy
- Deterministic action prefix + AI recommendation can repeat the same instruction.
- Refactor should centralize recommendation composition and dedupe phrasing.

4. Minor consistency debt
- Unit conversion uses both constant and inline literals in current file.
- Refactor should standardize conversion constants in one place.

## Target Structure

1. `src/hooks/useStrengthBalanceData.ts`
- Inputs:
  - `workoutLogs`
  - `userProfile`
  - `exercises`
  - `fitnessGoals`
- Outputs:
  - `clientSideFindings`
  - `imbalanceConfigIssues`
  - `analysisInput`
  - helpers for view state (e.g., `hasFindings`)
- Note: hook should remain a thin orchestrator (`useMemo`/wiring). Domain logic stays in pure utils.

2. `src/analysis/strength-balance.utils.ts`
- Pure functions only:
  - option resolution
  - ratio/imbalance classification
  - severity badge classification (`Minor`, `Watch`, `Risk`, `High Risk`)
  - parsing helpers (`userRatio`, `balancedRange`)
  - `getStrengthLevelFromExerciseLibrary`
  - `getGuidingLevel`
  - `getNextStrengthLevel`
  - `buildClientSideFindings`
  - `buildStrengthAnalysisInput`
- No React, no side effects.

3. `src/components/analysis/StrengthBalanceFindingCard.tsx`
- Presentational card for one finding.
- Receives already-derived data + badges.
- No data fetching or mutation logic.

4. Keep `src/components/analysis/StrengthBalanceCard.tsx` as orchestrator
- Calls hook
- Handles mutation trigger (`useAnalyzeStrength`)
- Renders summary + list of `StrengthBalanceFindingCard`
- Keeps minimal local UI state only

## Execution Phases

### Phase 1: Extract Pure Logic
1. Move severity helpers + ratio parsing into `strength-balance.utils.ts`.
2. Add unit tests for utils (severity bands, ratio parsing, imbalance focus rules).
3. Standardize conversion helpers/constants (`LBS_TO_KG`) in utils.
4. Define explicit supported imbalance modes for this card (ratio-only vs mixed) and encode as pure rules.
5. Extract `getStrengthLevelFromExerciseLibrary`, `getGuidingLevel`, and `getNextStrengthLevel` to utils.

### Phase 2: Extract Data Hook
1. Move `buildClientSideFindings` and `buildStrengthAnalysisInput` into `useStrengthBalanceData`.
2. Move config validation memo/effect wiring into hook outputs (issues + reporter trigger hook effect in container).
3. Add deterministic fallback text strategy for balanced + `N/A` (no empty render path).
4. Update `StrengthBalanceCard` to consume hook.

### Phase 3: Extract Presentational Card
1. Move `StrengthBalanceFindingCard` to standalone file.
2. Pass precomputed props only.
3. Keep markup/style unchanged.

### Phase 4: Cleanup + Guardrails
1. Remove dead imports/helpers from container.
2. Add snapshot/behavior tests around refactored boundaries.
3. Verify AI action input shape remains identical where intended.
4. Align AI flow contract with card behavior:
   - if ratio-only classification is intended, remove or gate `Level Imbalance` generation path to prevent dead logic.
5. Apply one explicit recommendation dedupe strategy:
   - chosen implementation: keep deterministic directive prefix on `insight` only; do not prepend deterministic action prefix to `recommendation`.
   - fallback: post-process recommendation text to collapse duplicate prefix phrasing when repeated verbatim.

## File-Level Deliverables

- New:
  - `src/hooks/useStrengthBalanceData.ts`
  - `src/analysis/strength-balance.utils.ts`
  - `src/components/analysis/StrengthBalanceFindingCard.tsx`
  - `src/analysis/strength-balance.utils.test.ts`
- Modified:
  - `src/components/analysis/StrengthBalanceCard.tsx`

## Testing Plan

1. Utils tests:
- Ratio parse edge cases
- Severity thresholds
- Balanced/unbalanced classification
- Conversion consistency tests (constant-only paths)

2. Hook tests (or focused unit tests on extracted pure functions):
- No data case
- Ratio imbalance case
- Config mismatch warning condition
- Analysis payload consistency
- Schema conformance test: `buildStrengthAnalysisInput` output must conform to `StrengthImbalanceInputSchema`.
- Balanced + `N/A` renders non-empty guidance
- Balanced text uses correct level source (or no level progression text if unavailable)

3. Final checks:
- `npm run typecheck`
- targeted `vitest` suites for new modules

## Non-Goals

- No visual redesign.
- No change to Firestore model in this refactor.
- No prompt/AI schema redesign beyond preserving current behavior.

## Risks

- Silent behavior drift during extraction.
- Duplicate logic left behind if extraction is partial.
- Parallel branch drift after deleting legacy aggregation helpers from `analysis.config.ts`.

Mitigations:
- Extract with behavior-preserving commits.
- Add tests before/while moving logic.
- Add a pre-merge import audit for removed helpers.
- Validate output parity for at least:
  - one balanced finding
  - one ratio imbalance
  - one no-data card.

## Necessary Audit Item (Parallel Workstreams)

- Before merge, run an import/reference audit for removed helpers `find6WeekAvgE1RM` and `calculateAvgE1RM`.
- Scope:
  - local branch
  - all parallel in-flight branches touching analysis/strength modules
- Required outcome:
  - no remaining imports/calls to removed helpers
  - all strength-balance aggregation paths consume `buildSixWeekLiftMetrics`
- Verification command:
  - `rg -n "find6WeekAvgE1RM|calculateAvgE1RM" src .planning docs`

## Acceptance Criteria

- `StrengthBalanceCard.tsx` primarily orchestrates; core logic moved out.
- Pure logic covered by tests.
- Existing UI behavior unchanged (aside from already-approved badge/name updates).
- No dead `Level Imbalance` path mismatch between card classification and AI flow contract.
- No empty balanced-content render path.
- Recommendation text avoids deterministic+AI duplication where semantically identical.
- Typecheck + targeted tests pass.

## Decision Checkpoints (Must Be Set Before Phase 1 Merge)

1. Level imbalance mode for this card:
- `ratio_only` (default) or `ratio_plus_level` (feature-gated).
- Documented in code comments and reflected in AI flow contract.

2. Recommendation dedupe policy:
- Implemented policy: keep deterministic directive prefix on `insight` only.
- `recommendation` is AI-authored without deterministic action-line prepending to avoid duplicate phrasing.

## Suggested Next Commit Sequence

1. `refactor(analysis): extract strength balance utils + tests`
2. `refactor(analysis): add useStrengthBalanceData hook`
3. `refactor(analysis): extract StrengthBalanceFindingCard presentation`
4. `chore(analysis): cleanup + parity checks`
