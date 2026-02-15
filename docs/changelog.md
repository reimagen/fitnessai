# Changelog

This file tracks shipped fixes and notable technical changes.

## Format

- `YYYY-MM-DD` - `Area`: Short summary
  - Files: `path/a.ts`, `path/b.ts`
  - Verification: command/tests/behavior checked

## 2026-02-14

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
