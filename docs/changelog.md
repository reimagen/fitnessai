# Changelog

This file tracks shipped fixes and notable technical changes.

## Format

- `YYYY-MM-DD` - `Area`: Short summary
  - Files: `path/a.ts`, `path/b.ts`
  - Verification: command/tests/behavior checked

## 2026-02-14

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
