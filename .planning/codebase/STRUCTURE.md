# Codebase Structure

**Analysis Date:** 2026-02-05

## Directory Layout

```
project-root/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── layout.tsx          # Root layout (providers, navigation)
│   │   ├── page.tsx            # Home page
│   │   ├── error.tsx           # Page-level error boundary
│   │   ├── global-error.tsx    # App-level error boundary
│   │   ├── api/
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── client-errors/  # Client error logging endpoint
│   │   │   ├── session/        # Session cookie management
│   │   │   └── dev/            # Dev utilities (error simulation)
│   │   ├── analysis/           # Strength/cardio analysis pages
│   │   │   ├── page.tsx        # Main analysis page
│   │   │   └── actions.ts      # Server actions for analysis
│   │   ├── prs/                # Personal records pages
│   │   │   ├── page.tsx        # PRs list and upload
│   │   │   ├── actions.ts      # Server actions for PR parsing/CRUD
│   │   │   ├── rate-limiting.ts
│   │   │   └── error-handling.ts
│   │   ├── history/            # Workout log pages
│   │   │   ├── page.tsx        # Workout history
│   │   │   └── actions.ts      # Server actions for log parsing/CRUD
│   │   ├── plan/               # AI workout plan pages
│   │   │   ├── page.tsx        # Plan generation UI
│   │   │   ├── actions.ts      # Server actions for plan generation
│   │   │   └── utils/          # Plan utilities (cardio calc, profile context)
│   │   ├── profile/            # User profile pages
│   │   │   ├── page.tsx        # Profile editor
│   │   │   └── actions.ts      # Server actions for profile CRUD
│   │   ├── signin/             # Authentication pages
│   │   ├── pending/            # Pending state UI
│   │   └── globals.css         # Global styles
│   │
│   ├── components/             # React components organized by feature
│   │   ├── ui/                 # Radix-based primitive UI components
│   │   │   ├── card.tsx, button.tsx, input.tsx, form.tsx, dialog.tsx, etc.
│   │   ├── error/              # Error handling components
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── AIOperationErrorHandler.tsx
│   │   │   └── CardErrorFallback.tsx
│   │   ├── auth/               # Authentication components
│   │   │   └── AuthGate.tsx
│   │   ├── layout/             # Layout components
│   │   │   └── BottomNavigationBar.tsx
│   │   ├── analysis/           # Analysis feature components
│   │   │   ├── LiftProgressionCard.tsx       # Card with dropdown, chart, AI analysis
│   │   │   ├── StrengthBalanceCard.tsx       # Strength imbalance analysis
│   │   │   ├── CardioAnalysisCard.tsx        # Cardio trends
│   │   │   ├── CalorieBreakdownCard.tsx
│   │   │   ├── RepetitionBreakdownCard.tsx
│   │   │   ├── ExerciseVarietyCard.tsx
│   │   │   ├── MilestonesCard.tsx
│   │   │   ├── PeriodSummaryCard.tsx
│   │   │   ├── LiftProgressionChart.tsx      # Recharts chart
│   │   │   ├── LiftProgressionInsights.tsx   # AI insights display
│   │   │   ├── CardioByActivityChart.tsx
│   │   │   ├── CardioOverTimeChart.tsx
│   │   │   ├── CardioActivitySummary.tsx
│   │   │   ├── LoadingStateDisplay.tsx
│   │   │   └── ProfileNotFoundDisplay.tsx
│   │   ├── prs/                # PR feature components
│   │   │   ├── PrCard.tsx
│   │   │   ├── PrProgress.tsx
│   │   │   ├── PrUploadForm.tsx
│   │   │   ├── ManualPrForm.tsx
│   │   │   ├── PersonalRecordsSection.tsx
│   │   │   ├── PrCategorySection.tsx
│   │   │   ├── StrengthLevelBadge.tsx
│   │   │   ├── CompletedGoalsSection.tsx
│   │   │   ├── RecordDatePickerDialog.tsx
│   │   │   └── FormContainer.tsx
│   │   ├── history/            # History feature components
│   │   │   └── (history-related components)
│   │   ├── plan/               # Plan feature components
│   │   │   ├── PlanGeneratorSection.tsx
│   │   │   ├── GeneratedPlanSection.tsx
│   │   │   ├── PlanFeedbackSection.tsx
│   │   │   └── WeekPreferenceToggle.tsx
│   │   ├── profile/            # Profile feature components
│   │   │   ├── GoalSetterCard.tsx
│   │   │   ├── AchievedGoalsSection.tsx
│   │   │   └── (profile-related components)
│   │   ├── home/               # Home page components
│   │   │   ├── HomeDashboard.tsx
│   │   │   ├── WeeklyProgressTracker.tsx
│   │   │   ├── WeeklyCardioTracker.tsx
│   │   │   ├── RecentHistory.tsx
│   │   │   ├── LapsedGoalBanner.tsx
│   │   │   └── goal-utils.ts
│   │   ├── shared/             # Shared utility components
│   │   │   ├── ErrorState.tsx
│   │   │   └── MarkdownRenderer.tsx
│   │   ├── QueryProvider.tsx    # React Query provider
│   │   └── (other utility components)
│   │
│   ├── lib/                    # Shared business logic and utilities
│   │   ├── types.ts            # Core TypeScript interfaces
│   │   ├── constants.ts
│   │   ├── utils.ts
│   │   │
│   │   ├── Firebase & Auth
│   │   │   ├── firebase.ts              # Client-side Firebase init
│   │   │   ├── firebase-admin.ts        # Server-side Firebase admin
│   │   │   ├── auth.service.tsx         # Client auth context provider
│   │   │   ├── auth-server.ts           # Server auth verification + caching
│   │   │   ├── firestore.service.ts     # React Query hooks for data fetching
│   │   │   └── firestore-server.ts      # Server-side Firestore operations + converters
│   │   │
│   │   ├── Exercise Data & Normalization
│   │   │   ├── exercise-types.ts        # ExerciseDocument, AliasDocument types
│   │   │   ├── exercise-data.ts         # LIFT_NAME_ALIASES static data
│   │   │   ├── exercise-normalization.ts # resolveCanonicalExerciseName(), normalizeForLookup()
│   │   │   ├── exercise-registry.ts     # Client-side exercise lookups
│   │   │   ├── exercise-registry.server.ts
│   │   │   ├── exercise-display.ts      # Display helpers
│   │   │   └── fuzzy-match.ts           # Fuzzy matching for exercise names
│   │   │
│   │   ├── Strength Standards & Analysis
│   │   │   ├── strength-standards.ts    # getNormalizedExerciseName(), strength level logic
│   │   │   ├── strength-standards.server.ts
│   │   │   ├── calorie-calculator.ts    # Calorie estimation
│   │   │   └── cardio-target-calculator.ts
│   │   │
│   │   ├── Logging & Observability
│   │   │   ├── logging/
│   │   │   │   ├── logger.ts            # Cloud Logging wrapper
│   │   │   │   ├── request-context.ts   # Context object for logging
│   │   │   │   ├── server-action-wrapper.ts # Wrapper for all server actions
│   │   │   │   ├── error-classifier.ts  # Classify AI errors into 5 categories
│   │   │   │   ├── error-reporter.ts    # Client-side error reporting
│   │   │   │   ├── data-redactor.ts     # PII redaction for logs
│   │   │   │   ├── health-check.ts      # Health check logic
│   │   │   │   └── types.ts             # Log type definitions
│   │   │
│   │   ├── Rate Limiting & Config
│   │   │   ├── rate-limit-config.ts
│   │   │   └── whitelist-server.ts
│   │   │
│   │   └── Profile & Goals
│   │       ├── profile-completion.ts    # Profile validation
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useChartData.ts             # Process data for charts
│   │   ├── useFilteredData.ts          # Filter logs by time range
│   │   ├── useLiftProgression.ts       # Build lift progression chart data
│   │   ├── useLiftTrends.ts            # Calculate e1RM and volume trends
│   │   ├── useLiftProgressionAnalysis.ts # Handler for lift analysis mutation
│   │   ├── useStrengthFindings.ts      # Build strength imbalance findings
│   │   ├── useCardioAnalysis.ts        # Process cardio data
│   │   ├── usePlanGeneration.ts        # Plan generation flow
│   │   ├── usePrEdit.ts
│   │   ├── useProfileUpdate.ts
│   │   ├── useRecordUpdate.ts
│   │   ├── useClearRecords.ts
│   │   ├── useExerciseSuggestions.ts
│   │   ├── useCurrentWeek.ts
│   │   ├── useToast.ts
│   │   ├── useErrorHandler.ts          # Error handling hook
│   │   └── useFilteredData.ts
│   │
│   ├── analysis/               # Analysis utilities and configurations
│   │   ├── analysis.config.ts   # IMBALANCE_CONFIG with exercise pairs
│   │   ├── analysis-constants.ts # Constants like timeRangeDisplayNames
│   │   ├── analysis.utils.ts    # Helper functions for analysis
│   │   ├── badge-utils.ts       # Strength badge calculations
│   │   ├── chart.config.ts      # Chart styling config
│   │   ├── chart-utils.tsx      # Chart rendering helpers
│   │   └── formatting-utils.ts  # Format data for display
│   │
│   ├── ai/                     # AI/Genkit flows
│   │   ├── genkit.ts           # Genkit SDK initialization
│   │   ├── config.ts           # AI config (safety settings, models)
│   │   ├── utils.ts            # AI utilities (fallback execution)
│   │   ├── dev.ts              # Dev utilities for testing AI
│   │   └── flows/              # Genkit flow definitions
│   │       ├── lift-progression-analyzer.ts
│   │       ├── strength-imbalance-analyzer.ts
│   │       ├── weekly-workout-planner.ts
│   │       ├── goal-analyzer.ts
│   │       ├── personal-record-parser.ts
│   │       └── screenshot-workout-parser.ts
│   │
│   └── styles/                 # Tailwind CSS config (in src/)
│
├── scripts/                    # Node scripts for maintenance
│   ├── migrate-exercises.ts    # Database migrations
│   ├── add-cardio-aliases.ts
│   ├── add-strength-aliases.ts
│   ├── add-exercises.ts
│   └── update-bench-press.ts
│
├── docs/                       # Project documentation
│   ├── card-error-boundaries.md
│   ├── p0-polish.md
│   └── (other docs)
│
├── .planning/                  # GSD planning directory
│   └── codebase/
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONVENTIONS.md
│       └── (other docs)
│
├── tailwind.config.ts          # Tailwind styling
├── tsconfig.json               # TypeScript config
├── next.config.js              # Next.js config
├── package.json                # Dependencies
└── .env.local (not committed)  # Secrets
```

## Directory Purposes

**`src/app/[feature]/`:**
- Purpose: Page routes and feature-specific server actions
- Contains: Page components (page.tsx), server-side mutations (actions.ts), feature utilities
- Pattern: One directory per feature (analysis, prs, history, plan, profile, signin)

**`src/components/[feature]/`:**
- Purpose: Feature-specific React components
- Contains: Card components, form components, display components
- Pattern: Components import from `src/lib/`, `src/hooks/`, and sibling components

**`src/lib/`:**
- Purpose: Shared business logic, Firebase integration, data models, utilities
- Contains: Types, Firebase client/admin init, Firestore operations, authentication, logging, exercise data, analysis utilities
- Pattern: No component imports; pure utilities and service functions

**`src/hooks/`:**
- Purpose: Custom React hooks for data fetching, state management, mutations
- Contains: React Query hooks wrapping server actions, hooks for chart/analysis data processing
- Pattern: Prefixed with `use`, export functions; depend on `src/lib/` and Firebase

**`src/ai/flows/`:**
- Purpose: Genkit AI flow definitions for structured prompts
- Contains: Flow definitions with Zod schemas, fallback logic
- Pattern: Each flow exports input type, output type, and async function

**`src/analysis/`:**
- Purpose: Analysis-specific utilities and configurations
- Contains: Chart data processing, strength badge calculations, imbalance configuration
- Pattern: Utilities used by analysis components and hooks

**`src/components/ui/`:**
- Purpose: Primitive UI components from Radix UI + Tailwind
- Contains: Card, Button, Input, Form, Dialog, etc.
- Pattern: Shadcn/ui style; no feature-specific logic

**`src/components/error/`:**
- Purpose: Error boundary and error display components
- Contains: ErrorBoundary class, AIOperationErrorHandler, CardErrorFallback
- Pattern: Wrap child components; catch and log errors; provide fallback UI

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with providers
- `src/app/page.tsx`: Home page
- `src/app/analysis/page.tsx`: Analysis hub
- `src/app/prs/page.tsx`: Personal records
- `src/app/history/page.tsx`: Workout history
- `src/app/plan/page.tsx`: AI plan generation
- `src/app/profile/page.tsx`: User profile editor
- `src/app/signin/page.tsx`: Authentication

**Configuration:**
- `tsconfig.json`: TypeScript compiler options (path alias `@/*` → `src/*`)
- `next.config.js`: Next.js build/runtime config, Firebase webapp config loading
- `tailwind.config.ts`: Tailwind CSS customization
- `package.json`: Dependencies and build scripts

**Core Logic:**
- `src/lib/types.ts`: All TypeScript interfaces (WorkoutLog, PersonalRecord, UserProfile, Exercise, etc.)
- `src/lib/firestore-server.ts`: Server-side Firestore operations with converters (WorkoutLog, PersonalRecord, UserProfile)
- `src/lib/firestore.service.ts`: React Query hooks for client-side data fetching (useWorkouts, usePersonalRecords, useUserProfile, useExercises)
- `src/lib/auth-server.ts`: Server-side auth verification and caching (getAuthenticatedUser, getCurrentUserProfile)
- `src/lib/auth.service.tsx`: Client-side auth context (AuthProvider, useAuth hook)
- `src/lib/exercise-normalization.ts`: Exercise name resolution (resolveCanonicalExerciseName, normalizeForLookup)
- `src/lib/strength-standards.ts`: Strength level calculations and exercise name normalization
- `src/lib/logging/error-classifier.ts`: AI error classification into 5 categories
- `src/lib/logging/logger.ts`: Cloud Logging wrapper

**Testing:**
- None detected; project uses manual testing and error boundary testing

## Naming Conventions

**Files:**
- Component files: PascalCase (e.g., `LiftProgressionCard.tsx`, `ErrorBoundary.tsx`)
- Utility files: camelCase (e.g., `firestore-server.ts`, `error-classifier.ts`)
- Page files: lowercase (e.g., `page.tsx`, `layout.tsx`)
- Server actions: lowercase with `-action` suffix or in `actions.ts` files
- Hooks: camelCase with `use` prefix (e.g., `useLiftProgression.ts`, `useFilteredData.ts`)
- Types: PascalCase with `Type`/`Interface` suffix optional (e.g., `UserProfile`, `StrengthImbalanceInput`)
- Config files: kebab-case (e.g., `rate-limit-config.ts`, `analysis.config.ts`)

**Directories:**
- Feature directories: lowercase (e.g., `analysis/`, `prs/`, `history/`)
- Component subdirectories: feature name (e.g., `components/analysis/`, `components/ui/`)
- Utility directories: purpose-named (e.g., `logging/`, `hooks/`, `flows/`)

**Functions:**
- Event handlers: `handle` prefix (e.g., `handleAnalyzeProgression`, `handleReset`)
- Queries: `query` in key or hook name (e.g., `queryKey`, `useQuery()`)
- Mutations: `mutate` suffix or in hook name (e.g., `analyzeProgressionMutation.mutate()`)
- Computed values: `get`/`use` prefix (e.g., `getStrengthLevel()`, `useFilteredData()`)

## Where to Add New Code

**New Feature (e.g., Cardio Training Zone Analysis):**
1. Create page: `src/app/cardio-zones/page.tsx` (client component using data hooks)
2. Create server actions: `src/app/cardio-zones/actions.ts` (with logging + rate limiting)
3. Create components: `src/components/cardio-zones/ZoneCard.tsx`, `ZoneChart.tsx`
4. Create hooks: `src/hooks/useCardioZoneAnalysis.ts` (data processing)
5. Create Genkit flow: `src/ai/flows/cardio-zone-analyzer.ts` (if AI needed)
6. Add types to: `src/lib/types.ts` (new interfaces like `CardioZoneAnalysis`)
7. Add utilities: `src/lib/cardio-zone-utils.ts` (calculations)
8. Add query hook to: `src/lib/firestore.service.ts` (useCardioZones())

**New Component/Module:**
- Placement: `src/components/[feature]/ComponentName.tsx` if feature-specific, or `src/components/shared/ComponentName.tsx` if reusable
- Imports: Always import types from `src/lib/types.ts`; UI components from `src/components/ui/`
- Error handling: Wrap in `<ErrorBoundary feature="componentName">` if top-level in a page
- Data fetching: Use hooks from `src/lib/firestore.service.ts` or custom hooks in `src/hooks/`

**Utilities / Helper Functions:**
- Shared calculations: `src/lib/utils.ts` or feature-specific file (e.g., `src/lib/cardio-target-calculator.ts`)
- Analysis computations: `src/analysis/xxx-utils.ts`
- AI-related: `src/ai/utils.ts`
- Exercise-related: `src/lib/exercise-normalization.ts` or `exercise-display.ts`

**Server Actions:**
- Location: `src/app/[feature]/actions.ts`
- Pattern: Mark with `'use server'`; wrap with `withServerActionLogging()`; call Genkit flows if needed; return `{ success: boolean; data?; error? }`
- Rate limiting: Check via `checkRateLimit(userId, feature)` before AI operations
- Logging: Create context via `createRequestContext()` and pass to wrapper

**Genkit AI Flows:**
- Location: `src/ai/flows/xxx-analyzer.ts` or `xxx-parser.ts`
- Pattern: Export input/output types; define flow with `ai.defineFlow()`; include fallback logic
- Schemas: Use Zod for input validation and output structure
- Safety: Include DEFAULT_SAFETY_SETTINGS in flow definition

**Exercise Name Resolution:**
- Any place exercise names are logged/compared: Use `resolveCanonicalExerciseName()` from `src/lib/exercise-normalization.ts`
- Critical: Maintain machine vs non-machine distinction (e.g., "Machine Bicep Curl" ≠ "Bicep Curl")
- Pattern: Resolve selected/logged exercise names to canonical before database operations or AI analysis

## Special Directories

**`src/components/error/`:**
- Purpose: Centralized error handling components
- Generated: No
- Committed: Yes
- Contains: ErrorBoundary, AIOperationErrorHandler, CardErrorFallback

**`.planning/`:**
- Purpose: GSD planning artifacts
- Generated: Yes (by GSD tooling)
- Committed: Yes (markdown files only)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`docs/`:**
- Purpose: Project-specific documentation
- Generated: No
- Committed: Yes
- Contains: Architecture decisions, error boundary docs, P0 polish notes

---

*Structure analysis: 2026-02-05*
