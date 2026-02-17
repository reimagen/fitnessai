# Changelog

This file tracks shipped fixes and notable technical changes.

## Format

- `YYYY-MM-DD` - `Area`: Short summary
  - Files: `path/a.ts`, `path/b.ts`
  - Verification: command/tests/behavior checked

## 2026-02-17

- `2026-02-17` - `Planning Queue Cleanup`: Streamlined active concern queue by moving full resolved item detail (items 2-6) to archive entries and leaving concise archive pointers in `CONCERNS.md` so next promotion work focuses on active items.
  - Files: `.planning/codebase/CONCERNS.md`, `.planning/codebase/CONCERNS-ARCHIVE.md`, `docs/changelog.md`
  - Verification: planning-doc consistency review (`Priority Order` pointers in `CONCERNS.md` map to detailed entries in `CONCERNS-ARCHIVE.md`)

- `2026-02-17` - `Planning Queue Renumber`: Removed resolved priorities from `CONCERNS.md` active queue and renumbered remaining active items for execution focus.
  - Files: `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: active priority review (`CONCERNS.md` now only lists active items 1-3; resolved details retained in archive)

- `2026-02-17` - `Stale Concern Cleanup`: Removed resolved/stale backlog sections from `CONCERNS.md` (`Exercise Registry Migration Incomplete`, `Dual Data Sources for Strength Standards`, and `Hardcoded Exercise Data Cannot Scale`) after migration closure and archive transfer.
  - Files: `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: backlog section review (removed items are already reflected in `.planning/codebase/CONCERNS-ARCHIVE.md` and prior changelog entries)

- `2026-02-17` - `Item 7 Closeout (Targeted Render Remediation)`: Closed render-remediation scope after landing targeted watcher/memoization fixes and accepting current profiler state as non-blocking for this phase; deferred speculative subtree/memo-boundary refactors pending future evidence.
  - Files: `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: targeted fix verification previously completed (`npm run typecheck`, targeted tests) plus manual acceptance of current interaction performance

- `2026-02-17` - `Planning Queue Cleanup (Item 7 Archive Move)`: Removed resolved item 7 detail from active `CONCERNS.md`, renumbered active priorities, and moved item 7 full resolution detail into `CONCERNS-ARCHIVE.md`.
  - Files: `.planning/codebase/CONCERNS.md`, `.planning/codebase/CONCERNS-ARCHIVE.md`, `docs/changelog.md`
  - Verification: queue sanity review (`CONCERNS.md` now active-only priorities; item 7 detail present in archive)

- `2026-02-17` - `Next-Set Promotion Plan`: Promoted next backlog execution set into active priority order with explicit dependency sequencing and per-item overengineering-risk flags (type convergence -> measurement-gated query optimization, parallel quota observability, then rate-limit design spike).
  - Files: `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: priority/dependency review (`CONCERNS.md` ordering and dependency notes align with sequential + parallel execution intent)

- `2026-02-17` - `Profiler Comparison Capture (Item 7 + Item 2 Gate Closeout)`: Recorded item 7 after-profiler snapshots and finalized the item 2 baseline/comparison gate; results were mixed (`WeeklyCardioTargetsCard` improved, `WorkoutLogForm` and `StrengthBalanceCard` above baseline), so item 7 remains partial for further remediation.
  - Files: `docs/performance-baseline.md`, `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: React Profiler snapshots (`WorkoutLogForm: 31.4ms`, `StrengthBalanceCard: 6.1ms`, `WeeklyCardioTargetsCard: 6.4ms`) compared against documented baseline values

- `2026-02-17` - `Render Churn Remediation (Item 7, Partial)`: Reduced two identified render hot paths by replacing per-row form subscriptions in `WorkoutLogForm` with array-scoped `useWatch`, and memoizing `WeeklyCardioTargetsCard` auto-target display calculations behind auto-mode gating.
  - Files: `src/components/history/WorkoutLogForm.tsx`, `src/components/profile/WeeklyCardioTargetsCard.tsx`, `.planning/codebase/CONCERNS.md`, `docs/performance-baseline.md`, `docs/changelog.md`
  - Verification: `npm run typecheck`, `npm run test -- src/lib/exercise-load-semantics.test.ts src/lib/logging/health-check.test.ts`

- `2026-02-17` - `Performance Baseline Gate (Item 2, Phase 2 for Items 4-6)`: Finalized before/after comparison for completed optimization scope, documenting no-material-change analysis action latency, improved chart switch scripting, and improved representative analysis network timing; carried item 7 render-baseline comparison forward as remaining scope.
  - Files: `docs/performance-baseline.md`, `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: baseline comparison review in `docs/performance-baseline.md` (`analysis/analyzeStrengthAction`, chart performance, network timing), instrumentation evidence review (`PERF_BASELINE_LOGS`)

- `2026-02-17` - `Exercise Registry No-Fallback Convergence (Item 6 Final)`: Removed runtime static exercise-data fallback behavior in registry paths, enforced Firebase metadata as the runtime source-of-truth (with explicit degraded behavior instead of silent substitution), and surfaced empty-registry degraded status in health observability.
  - Files: `src/lib/exercise-registry.server.ts`, `src/lib/exercise-registry.ts`, `src/lib/exercise-registry.shared.ts`, `src/lib/logging/health-check.ts`, `src/lib/logging/health-check.test.ts`, `src/app/api/health/route.ts`, `src/lib/exercise-registry.test.ts`, `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/lib/logging/health-check.test.ts src/lib/exercise-registry.test.ts src/lib/exercise-load-semantics.test.ts`, `npm run typecheck`

- `2026-02-17` - `Exercise Load Semantics Cleanup (Item 6, Slice 3)`: Removed runtime local semantics map fallback and switched hint logic to strict Firebase metadata resolution (`loadSemantics`), with `unknown` fallback only when metadata is absent/invalid.
  - Files: `src/lib/exercise-load-semantics.ts`, `src/components/history/WorkoutLogForm.tsx`, `src/components/prs/ManualPrForm.tsx`, `src/lib/exercise-registry.shared.ts`, `scripts/migrate-exercises.ts`, `scripts/add-exercises.ts`, `scripts/backfill-exercise-load-semantics.ts`, `src/lib/exercise-load-semantics.test.ts`, `.planning/codebase/CONCERNS.md`, `docs/unilateral-load-semantics-review.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/lib/exercise-load-semantics.test.ts src/lib/exercise-registry.shared.test.ts src/lib/exercise-registry.test.ts`, `npm run typecheck`

- `2026-02-17` - `Exercise Load Semantics Firebase Promotion (Item 6, Slice 2)`: Added `loadSemantics` support to the exercise metadata contract, switched per-limb hint logic to Firebase-first resolution with compatibility fallback, and added migration/backfill tooling to write semantics into Firestore exercise docs.
  - Files: `src/lib/exercise-types.ts`, `src/lib/exercise-load-semantics.ts`, `src/lib/firestore.service.ts`, `src/components/history/WorkoutLogForm.tsx`, `src/components/prs/ManualPrForm.tsx`, `src/lib/exercise-registry.shared.ts`, `scripts/migrate-exercises.ts`, `scripts/add-exercises.ts`, `scripts/backfill-exercise-load-semantics.ts`, `package.json`, `src/lib/exercise-load-semantics.test.ts`, `.planning/codebase/CONCERNS.md`, `docs/unilateral-load-semantics-review.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/lib/exercise-load-semantics.test.ts src/lib/exercise-registry.shared.test.ts src/lib/exercise-registry.test.ts`, `npm run typecheck`

- `2026-02-17` - `Exercise Registry Migration Hardening (Item 6, Slice 1)`: Hardened the registry migration path by removing static-registry TODO debt, introducing shared normalization/transform utilities used by both legacy and server registries, and adding regression coverage for shared registry contracts.
  - Files: `src/lib/exercise-registry.shared.ts`, `src/lib/exercise-registry.ts`, `src/lib/exercise-registry.server.ts`, `src/lib/strength-standards.ts`, `src/lib/exercise-registry.shared.test.ts`, `src/lib/exercise-registry.test.ts`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/STRUCTURE.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/lib/exercise-registry.shared.test.ts src/lib/exercise-registry.test.ts`, `npm run typecheck`

- `2026-02-17` - `Unilateral Semantics + Per-Limb UX (Item 3)`: Finalized unilateral classification decisions from Firestore-backed audit, added app-local load-semantics resolver keyed by canonical normalized names, and shipped inline `Per limb` weight hints in both workout logging and PR manual entry flows.
  - Files: `src/lib/exercise-load-semantics.ts`, `src/components/history/WorkoutLogForm.tsx`, `src/components/prs/ManualPrForm.tsx`, `docs/unilateral-load-semantics-review.md`, `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: `npm run typecheck`, manual `/history` validation (`Per limb` hint appears for unilateral mapped exercises; bilateral exercises show no hint), manual `/prs` validation of same behavior in manual PR form

- `2026-02-17` - `Analysis Read-Path Optimization (Item 4)`: Eliminated duplicate weekly/monthly workout-log fetches on Analysis page by reusing the 6-week dataset for short-range views, and reduced analysis action tail time by parallelizing independent save/counter writes.
  - Files: `src/app/analysis/page.tsx`, `src/app/analysis/actions.ts`, `src/lib/firestore-server.ts`, `docs/performance-baseline.md`, `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/app/analysis/actions.test.ts` (20 passing), `npm run typecheck`, manual Analysis page validation across `weekly`/`monthly`/`yearly`/`all-time`

- `2026-02-17` - `Chart Compute Optimization (Item 5)`: Reduced client chart computation overhead in `useChartData` by removing repeated weekly per-day filtering and eliminating repeated monthly/yearly/all-time parse-sort passes via pre-grouped, pre-sorted aggregation keys.
  - Files: `src/hooks/useChartData.ts`, `docs/performance-baseline.md`, `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: `npm run typecheck`, manual Analysis page validation across `weekly`/`monthly`/`yearly`/`all-time` time-range switches, before/after perf snapshot (`weekly -> monthly` scripting `2213ms -> 1702ms`) captured in `docs/performance-baseline.md`

## 2026-02-14

- `2026-02-15` - `Phase 4 Testing Closeout`: Completed cross-feature integration baseline with risk-focused deterministic coverage (write/read consistency, side effects, validation, and failure recovery) and formalized non-arbitrary Phase 4 exit criteria.
  - Files: `src/test/integration/cross-feature.integration.test.ts`, `src/test/integration/harness.ts`, `src/test/integration/fixtures.ts`, `src/test/integration/mocks.ts`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/testing-upgrades.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/test/integration/cross-feature.integration.test.ts` (24 passing), `npm run test:ci` (403 passing), `npm run typecheck`, `npm run lint`

- `2026-02-15` - `Phase 3 Testing Closeout`: Completed Firestore data-layer reliability phase with expanded converter/query/backfill/save-delete coverage and full verification.
  - Files: `src/lib/firestore-server.test.ts`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/testing-upgrades.md`, `.planning/codebase/TESTING.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/lib/firestore-server.test.ts` (62 passing), `npm run test:ci` (379 passing), `npm run typecheck`, `npm run lint`

- `2026-02-15` - `Phase 3 Testing`: Expanded Firestore data-layer test rollout with a dedicated suite now covering converter reliability, query branch semantics, PR strength-level side effects, `clearAllPersonalRecords` behavior, weekly-plan truncation, migration lazy-backfill flows, `updateUserProfile` recompute gating, and usage-counter branch logic.
  - Files: `src/lib/firestore-server.test.ts`, `.planning/codebase/testing-upgrades.md`, `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/lib/firestore-server.test.ts` (39 passing), `npm run typecheck`, `npm run lint`

- `2026-02-15` - `Phase 2 Testing`: Completed remaining Phase 2 server-action coverage by adding PRS/Plan suites and expanding History suite to full branch depth.
  - Files: `src/app/prs/actions.test.ts`, `src/app/plan/actions.test.ts`, `src/app/history/actions.test.ts`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/testing-upgrades.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/app/prs/actions.test.ts`, `npm run test -- src/app/plan/actions.test.ts`, `npm run test -- src/app/history/actions.test.ts`, `npm run test:ci` (317 passing), `npm run typecheck`, `npm run lint`

- `2026-02-15` - `Strength Balance Config`: Fixed false degraded warning behavior when Firestore imbalance config is healthy, and hardened stale-cache fallback handling.
  - Files: `src/hooks/useStrengthBalanceData.ts`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/lib/firestore.service.ts`, `src/lib/imbalance-config.server.ts`, `src/hooks/use-strength-balance-data.test.tsx`, `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/hooks/use-strength-balance-data.test.tsx`, `npm run typecheck`

- `2026-02-15` - `Strength Balance Data Window`: Fixed Strength Balance card to always consume dedicated last-6-weeks logs instead of the page time-range-filtered dataset.
  - Files: `src/app/analysis/page.tsx`, `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: `npm run typecheck`, manual analysis-page validation with time-range narrower than 6 weeks

- `2026-02-15` - `Imbalance Config Ops`: Populated missing production `config/imbalanceConfig` document with canonical exercise ID pairs and validated zero pair-ID mismatches against active exercises.
  - Files: `.planning/codebase/CONCERNS.md`, `docs/changelog.md`
  - Verification: production Firestore doc check (`savedVersion=1`, `savedPairs=4`), direct ID validation (`activePairs=4`, `validationIssueCount=0`)

- `2026-02-14` - `Imbalance Config`: Completed Step 4-5 migration to Firestore-backed imbalance config loading with ID-based pair matching, fallback signaling, and health-check observability.
  - Files: `src/lib/imbalance-config-types.ts`, `src/lib/imbalance-config.server.ts`, `src/analysis/imbalance-matcher.ts`, `src/analysis/strength-balance.utils.ts`, `src/hooks/useStrengthBalanceData.ts`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/components/analysis/StrengthBalanceFindingCard.tsx`, `src/lib/firestore.service.ts`, `src/app/analysis/actions.ts`, `src/app/analysis/page.tsx`, `src/lib/logging/health-check.ts`, `src/app/api/health/route.ts`, `src/lib/imbalance-config.server.test.ts`, `src/analysis/imbalance-matcher.test.ts`, `src/analysis/strength-balance.utils.test.ts`, `src/app/analysis/actions.test.ts`, `src/lib/logging/health-check.test.ts`, `.planning/codebase/imbalance-config.md`, `.planning/codebase/CONCERNS.md`
  - Verification: `npm run test -- src/lib/imbalance-config.server.test.ts`, `npm run test -- src/analysis/imbalance-matcher.test.ts`, `npm run test -- src/analysis/strength-balance.utils.test.ts`, `npm run test -- src/app/analysis/actions.test.ts`, `npm run test -- src/lib/logging/health-check.test.ts`, `npm run typecheck`, `npm run test:ci` (269 passing)

- `2026-02-14` - `Testing Conventions`: Standardized test file naming for new strength-balance UI tests, added shared fixture module, and documented test storage/naming policy.
  - Files: `src/test/fixtures.ts`, `src/app/analysis/actions.test.ts`, `src/app/profile/actions.test.ts`, `src/hooks/use-strength-balance-data.test.tsx`, `src/components/analysis/strength-balance-finding-card.test.tsx`, `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/testing-upgrades.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/balance-card-refactor.md`, `.planning/codebase/imbalance-config.md`, `docs/changelog.md`
  - Verification: `npm run test -- src/app/analysis/actions.test.ts`, `npm run test -- src/app/profile/actions.test.ts`, `npm run test:ci`, `npm run typecheck`

- `2026-02-14` - `Strength Balance Refactor`: Closed StrengthBalanceCard refactor Phases 1-4 by finishing modular extraction, removing unsupported `Level Imbalance` contract paths, and deduplicating AI recommendation composition.
  - Files: `src/analysis/strength-balance.utils.ts`, `src/analysis/strength-balance.utils.test.ts`, `src/hooks/useStrengthBalanceData.ts`, `src/hooks/use-strength-balance-data.test.tsx`, `src/components/analysis/StrengthBalanceFindingCard.tsx`, `src/components/analysis/strength-balance-finding-card.test.tsx`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/analysis/analysis.utils.ts`, `src/analysis/badge-utils.ts`, `src/lib/types.ts`, `src/ai/flows/strength-imbalance-analyzer.ts`, `src/ai/flows/weekly-workout-planner.ts`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/balance-card-refactor.md`
  - Verification: `npm run typecheck`, `npm run test:ci -- src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts src/app/analysis/actions.test.ts`, `npm run test:ci -- src/hooks/use-strength-balance-data.test.tsx src/components/analysis/strength-balance-finding-card.test.tsx src/analysis/strength-balance.utils.test.ts src/analysis/six-week-lift-metrics.test.ts src/analysis/analysis.config.validation.test.ts`, manual verification: AI "Get AI Insights" recommendation dedupe behavior

- `2026-02-14` - `Hooks/Error Handling`: Added defensive error handling in complex analysis hooks to prevent render-time crashes on malformed data.
  - Files: `src/hooks/useLiftProgression.ts`, `src/hooks/useChartData.ts`, `src/hooks/useCardioAnalysis.ts`, `src/hooks/useStrengthFindings.ts` (removed)
  - Verification: `npm run typecheck`, `npm run test:ci`

- `2026-02-14` - `Analysis UI`: Unified exercise display naming in strength balance findings for consistency.
  - Files: `src/components/analysis/StrengthBalanceCard.tsx`
  - Verification: code path review + `npm run test:ci`

- `2026-02-14` - `Firestore Converters`: Required date fields now fail fast on missing/malformed timestamps instead of silently defaulting.
  - Files: `src/lib/firestore-server.ts`
  - Verification: converter behavior review + `npm run typecheck`

- `2026-02-14` - `Analysis Config Guardrails`: Added runtime validation for imbalance config/library drift and surfaced degraded status in health checks.
  - Files: `src/analysis/analysis.config.ts`, `src/components/analysis/StrengthBalanceCard.tsx`, `src/lib/logging/health-check.ts`, `src/app/api/health/route.ts`
  - Verification: `src/analysis/analysis.config.validation.test.ts`, `src/lib/logging/health-check.test.ts`

- `2026-02-14` - `Test Coverage`: Expanded foundational unit coverage for logging, normalization, and rate limiting.
  - Files: `src/lib/logging/error-classifier.test.ts`, `src/lib/logging/data-redactor.test.ts`, `src/lib/exercise-normalization.test.ts`, `src/app/prs/rate-limiting.test.ts`
  - Verification: `npm run test:ci` (179 tests passing)

- `2026-02-14` - `Planning Docs`: Reconciled testing and concerns documentation, split structure vs upgrade roadmap, and aligned dependency-aware phase order.
  - Files: `AGENTS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/testing-upgrades.md`, `.planning/codebase/CONCERNS.md`
  - Verification: document audit + `npm run test:ci` (179 tests passing), `npm run typecheck`

## 2026-02-13

- `2026-02-13` - `Security/Logging`: Applied PII redaction to production log metadata and improved Firebase user ID masking.
  - Files: `src/lib/logging/logger.ts`, `src/lib/logging/data-redactor.ts`
  - Verification: `src/lib/logging/data-redactor.test.ts`, `npm run test:ci`

- `2026-02-13` - `Security/Error Messages`: Standardized API-key related user errors to a generic unavailable message and centralized API key availability checks.
  - Files: `src/lib/env-validation.ts`, `src/app/layout.tsx`, `src/app/analysis/actions.ts`, `src/app/prs/actions.ts`, `src/app/plan/actions.ts`, `src/app/profile/actions.ts`, `src/app/history/actions.ts`
  - Verification: actions flow review + `npm run test:ci`
