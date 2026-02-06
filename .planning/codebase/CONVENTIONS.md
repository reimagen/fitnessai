# Coding Conventions

**Analysis Date:** 2026-02-05

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (`LiftProgressionCard.tsx`, `ErrorBoundary.tsx`)
- Utilities/hooks: camelCase with `.ts` extension (`useLiftProgression.ts`, `logger.ts`)
- Services: camelCase with `.ts` extension (`firestore.service.ts`, `auth-server.ts`)
- Pages: lowercase with hyphens (`/app/profile/page.tsx`, `/app/prs/page.tsx`)
- API routes: lowercase with hyphens (`/api/client-errors/route.ts`, `/api/health/route.ts`)

**Functions:**
- Regular functions: camelCase (`calculateE1RM`, `findBestPr`, `shouldSample`)
- Hooks: camelCase starting with `use` (`useToast`, `useLiftProgression`, `useLiftProgressionAnalysis`)
- React components: PascalCase (`LiftProgressionCard`, `ErrorBoundary`, `CardErrorFallback`)
- Server actions: camelCase ending with `Action` (`parsePersonalRecordsAction`, `getPersonalRecords`)

**Variables:**
- Regular variables: camelCase (`selectedLift`, `userProfile`, `workoutLogs`)
- Constants: UPPER_SNAKE_CASE (`TOAST_LIMIT = 1`, `LOG_NAME = "fitnessai"`, `RATE_LIMIT_MAX = 10`)
- Interface properties: camelCase (`userId`, `requestId`, `featureName`)

**Types:**
- Interfaces: PascalCase with `I` prefix optional (`ErrorBoundaryProps`, `LiftHistoryEntry`, `ProgressionChartDataPoint`)
- Type aliases: PascalCase (`LogLevel`, `ExerciseCategory`, `StrengthLevel`)
- Zod schemas: descriptive with `Schema` suffix (`ClientErrorSchema`, `manualPrSchema`)

## Code Style

**Formatting:**
- No explicit Prettier config found; Next.js defaults applied
- Line length not strictly enforced
- Single quotes used inconsistently (mix of single and double quotes)

**Linting:**
- ESLint configured with `next/core-web-vitals` and `next/typescript` presets (`.eslintrc.json`)
- ESLint config also defined in `eslint.config.mjs` (flat config)
- TypeScript strict mode enabled (`strict: true` in `tsconfig.json`)

**Indentation:**
- Consistent 2-space indentation throughout codebase
- No tabs used

## Import Organization

**Order:**
1. External/third-party libraries (`react`, `next`, `lucide-react`, `zod`)
2. Internal absolute imports with `@/` alias (`@/components/ui/card`, `@/lib/types`, `@/hooks/useLiftProgression`)
3. Type imports marked with `type` keyword (`import type { WorkoutLog } from '@/lib/types'`)
4. Relative imports (rarely used, prefer `@/`)

**Path Aliases:**
- `@/*` → `./src/*` (defined in `tsconfig.json`)
- Used consistently throughout all files for absolute imports
- Never use relative paths like `../../../` when `@/` is available

**Example Import Pattern:**
```typescript
import React, { ReactNode } from 'react';
import { reportError } from '@/lib/logging/error-reporter';
import type { WorkoutLog, PersonalRecord } from '@/lib/types';
import type { ExerciseDocument } from '@/lib/exercise-types';
import { resolveCanonicalExerciseName } from '@/lib/exercise-normalization';
import { format, subWeeks, isAfter } from 'date-fns';
```

## Error Handling

**Patterns:**
- **Server actions**: Use `withServerActionLogging` wrapper from `@/lib/logging/server-action-wrapper.ts`
- **AI operations**: Use `classifyAIError()` from `@/lib/logging/error-classifier.ts` to categorize errors into 5 types: `quota_exceeded`, `model_overloaded`, `validation_error`, `auth_error`, `unknown_error`
- **Client-side**: Use `reportError()` from `@/lib/logging/error-reporter.ts` for non-blocking error reporting to `/api/client-errors`
- **React components**: Wrap with `ErrorBoundary` from `@/components/error/ErrorBoundary.tsx` for graceful fallback UI
- **Card-level errors**: Use `CardErrorFallback.tsx` wrapped in ErrorBoundary to prevent single card error from crashing page

**Error Classification Example:**
```typescript
const classified = classifyAIError(error);
await logger.error("Error processing personal records screenshot", {
  ...context,
  errorType: classified.category,
  statusCode: classified.statusCode,
});
```

**Error Boundary Example:**
```typescript
<ErrorBoundary feature="liftProgression" fallback={customFallback}>
  <LiftProgressionCard {...props} />
</ErrorBoundary>
```

## Logging

**Framework:** `@google-cloud/logging` SDK with custom wrapper `@/lib/logging/logger.ts`

**Patterns:**
- **Production**: Logs sent to Google Cloud Logging with severity levels and trace context
- **Development**: Logs printed to console
- **Sampling**: INFO and DEBUG logs sampled at `LOG_INFO_SAMPLE_RATE` (default 1%, configurable via env)
- **Trace context**: Automatically extracted from `x-cloud-trace-context` header for distributed tracing

**Logger API:**
```typescript
const logger = {
  debug: (message: string, metadata?: LogMetadata, traceHeader?: string) => Promise<void>,
  info: (message: string, metadata?: LogMetadata, traceHeader?: string) => Promise<void>,
  warn: (message: string, metadata?: LogMetadata, traceHeader?: string) => Promise<void>,
  error: (message: string, metadata?: LogMetadata, traceHeader?: string) => Promise<void>,
  fatal: (message: string, metadata?: LogMetadata, traceHeader?: string) => Promise<void>,
};
```

**Server Action Logging Example:**
```typescript
const context = createRequestContext({
  userId,
  route: "prs/parsePersonalRecordsAction",
  feature: "prParses",
});

return withServerActionLogging(context, async () => {
  // Your async action here
});
```

## Comments

**When to Comment:**
- JSDoc comments for exported functions, types, and complex logic (`/** ... */`)
- Inline comments for non-obvious logic (sparingly)
- Block comments (`// ---`) used to delineate logical sections in long files

**JSDoc/TSDoc:**
- Used extensively for public APIs and server actions
- Include `@param`, `@returns` tags where helpful
- Describe purpose, behavior, error conditions, and usage examples

**Example:**
```typescript
/**
 * Classifies an AI error into standard categories
 *
 * Categories:
 * - quota_exceeded: Rate limits/quota exceeded (429)
 * - model_overloaded: AI service temporarily unavailable (503)
 * - validation_error: Input validation or safety filtering (400)
 * - auth_error: Authentication/authorization failures (401/403)
 * - unknown_error: All other errors (500+)
 *
 * @param error - The caught error object
 * @returns ClassifiedError with category, user message, and retry/quota info
 */
export function classifyAIError(error: unknown): ClassifiedError { ... }
```

## Function Design

**Size:** Functions kept reasonably small (typically 20-50 lines)

**Parameters:**
- Individual parameters preferred over large config objects for most functions
- Hook functions sometimes use larger prop-like objects for convenience
- Type parameters for generic functions clearly documented

**Return Values:**
- Consistent return types defined via TypeScript interfaces
- Server actions return `{ success: boolean; data?: T; error?: string }` pattern
- Hooks return single values or objects with clearly named properties

**Example Function:**
```typescript
export function useLiftProgression(
  selectedLift: string,
  selectedLiftKey: string,
  workoutLogs: WorkoutLog[] | undefined,
  personalRecords: PersonalRecord[] | undefined,
  exercises: ExerciseDocument[] = []
): ProgressionChartResult {
  return useMemo(() => {
    // Implementation
  }, [selectedLift, selectedLiftKey, workoutLogs, personalRecords, exercises]);
}
```

## Module Design

**Exports:**
- Named exports preferred (`export function`, `export const`, `export type`)
- Default exports used only for pages/components when appropriate
- Server-side utilities marked with `.server.ts` suffix (e.g., `firestore-server.ts`, `auth-server.ts`)
- Client-side components marked with `'use client'` directive at top of file

**Barrel Files:**
- Not extensively used; imports generally point directly to source files
- UI components sometimes grouped logically (e.g., `@/components/ui/` contains shadcn components)

**File Structure Pattern:**
```typescript
// At top of client component files:
'use client';

// Imports organized (external → internal absolute → types → relative)
// Interface definitions
// Helper functions (if any)
// Main component/function export
// Additional exports if needed
```

## Validation

**Framework:** Zod for runtime validation of external inputs

**Patterns:**
- API endpoints use Zod schemas to validate request bodies
- Server actions validate inputs before processing
- Client-side forms use `react-hook-form` with `@hookform/resolvers` for Zod integration
- Schema error messages converted to user-friendly text

**Example Validation:**
```typescript
const ClientErrorSchema = z.object({
  message: z.string().min(1).max(500),
  error: z.string().min(1).max(5000),
  stack: z.string().optional(),
  url: z.string().url().optional(),
  timestamp: z.string().datetime().optional(),
});

type ValidatedClientError = z.infer<typeof ClientErrorSchema>;

try {
  const body = await req.json();
  const clientError = ClientErrorSchema.parse(body);
} catch (err) {
  if (err instanceof z.ZodError) {
    const message = `Validation failed: ${err.errors.map(e => `${e.path.join('.')} - ${e.message}`).join('; ')}`;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

## Exercise Name Resolution

**Pattern:** Canonical exercise name resolution across analysis features

**Key Functions:**
- `resolveCanonicalExerciseName(name: string, exercises: ExerciseDocument[]): string` - Resolves to canonical name via Firebase library
- `getNormalizedExerciseName(name: string): string` - Applies static aliases, returns normalized key
- `normalizeForLookup(name: string): string` - Strips prefixes, removes parens, normalizes for comparison

**Principle:** Machine exercises ("machine bicep curl") and equipment-agnostic exercises ("bicep curl") are SEPARATE exercises with different strength standards. Never alias them together.

**Applied to:**
- `src/hooks/useLiftProgression.ts` - Resolves workout logs and PRs when building charts
- `src/hooks/useLiftProgressionAnalysis.ts` - Resolves selected lift before sending to AI
- `src/components/analysis/LiftProgressionCard.tsx` - Resolves dropdown selection to canonical name
- `src/components/analysis/StrengthBalanceCard.tsx` - Resolves IMBALANCE_CONFIG exercises to canonical names

## React Patterns

**Hooks:**
- Custom hooks use `useMemo` extensively to avoid recalculations
- Props passed as dependencies to memoization arrays
- Data fetching via React Query with `@tanstack/react-query`

**Components:**
- Functional components (no class components except `ErrorBoundary` which has lifecycle methods)
- Props destructured in function signature
- Typed via TypeScript interface extending `Props` convention

**UI Components:**
- Radix UI primitives wrapped in shadcn/ui components (`@/components/ui/`)
- Tailwind CSS for styling with `clsx` for conditional classes and `tailwind-merge` via `cn()` utility
- Form validation with `react-hook-form` and `@hookform/resolvers/zod`

---

*Convention analysis: 2026-02-05*
