# Architecture

**Analysis Date:** 2026-02-05

## Pattern Overview

**Overall:** Next.js 16 full-stack with server actions, client-side React Query caching, and Genkit AI flows for AI-driven features.

**Key Characteristics:**
- Server actions (in `"use server"` marked files) handle mutations and AI operations
- Client components use React Query for fetching and state management with intelligent caching strategies
- Firestore as primary database with admin SDK on server, client SDK on browser
- Error boundaries at multiple levels (app-level, page-level, card-level) with centralized Cloud Logging
- Genkit AI flows for structured AI analysis with fallback handling
- Rate limiting on AI features via Upstash Redis
- Exercise library with canonical name resolution to handle machine vs. non-machine distinctions

## Layers

**Presentation Layer (Client):**
- Purpose: React components rendering UI, form handling, real-time state updates
- Location: `src/components/`, `src/app/[page]/page.tsx`
- Contains: Page components, UI components (Radix), feature-specific components (analysis, prs, plan)
- Depends on: React Query hooks, custom hooks, UI utilities
- Used by: Browser/users

**Data Fetching & State Layer:**
- Purpose: React Query hooks wrapping server actions and client-side Firestore queries
- Location: `src/lib/firestore.service.ts`, `src/hooks/useXxx.ts`
- Contains: Query definitions, mutations, caching strategies, custom hooks for data processing
- Depends on: Server actions, client-side Firebase SDK, Firestore types
- Used by: Presentation layer components

**Server Action Layer:**
- Purpose: RPC-like functions executing on server; wrap AI flows and database mutations with error handling/logging
- Location: `src/app/[feature]/actions.ts` (history, prs, analysis, plan, profile)
- Contains: Authenticated operations, AI flow invocation, database updates, rate limiting checks
- Depends on: Firestore server utilities, Genkit AI flows, error classifier, logging
- Used by: Client components via mutations or direct calls

**AI/Analysis Layer:**
- Purpose: Genkit flows defining structured AI prompts with Zod schema validation
- Location: `src/ai/flows/xxx.ts` (lift-progression-analyzer, strength-imbalance-analyzer, etc.)
- Contains: AI flow definitions, input/output schemas, fallback logic
- Depends on: Genkit SDK, Zod validation, AI model (Gemini)
- Used by: Server action layer

**Data Model & Services Layer:**
- Purpose: Type definitions, Firebase initialization, Firestore converters, utility functions
- Location: `src/lib/` (types.ts, firebase.ts, firebase-admin.ts, firestore-server.ts, exercise-normalization.ts, strength-standards.ts, etc.)
- Contains: TypeScript interfaces, Firestore document converters, validation functions, exercise mapping
- Depends on: Firebase SDKs, Zod validation, date-fns
- Used by: All other layers

**Infrastructure & Cross-Cutting Concerns:**
- Purpose: Logging, error handling, authentication, rate limiting
- Location: `src/lib/logging/`, `src/lib/auth.service.tsx`, `src/app/prs/rate-limiting.ts`
- Contains: Cloud Logging wrapper, error classifier, PII redactor, session management, rate limiter
- Depends on: Google Cloud Logging SDK, Firebase Auth, Upstash Redis
- Used by: Server actions, page components, error boundaries

## Data Flow

**AI Analysis Request Flow (e.g., Lift Progression Analysis):**

1. User opens `/analysis` page component (`src/app/analysis/page.tsx`)
2. Component fetches exercise library via `useExercises()` hook
3. User selects lift from dropdown, resolved to canonical name via `resolveCanonicalExerciseName()`
4. User clicks "Analyze" button
5. Handler calls `useLiftProgressionAnalysis()` hook which:
   - Gathers last 6 weeks of workout logs
   - Resolves exercise names to canonical names (critical: machine vs non-machine distinction)
   - Calculates e1RM trends and volume trends via `useLiftTrends()` hook
   - Builds `AnalyzeLiftProgressionInput` object
6. Hook invokes `analyzeProgressionMutation` (React Query mutation)
7. Mutation calls `useAnalyzeLiftProgression()` from `firestore.service.ts`
8. That calls server action `analyzeLiftProgressionAction()` from `src/app/analysis/actions.ts`
9. Server action:
   - Validates user authentication
   - Checks rate limit against Upstash Redis
   - Calls Genkit flow `analyzeLiftProgression()` from `src/ai/flows/lift-progression-analyzer.ts`
   - Genkit flow invokes Gemini model with structured schema
   - Server action saves result to Firestore under `userProfile.liftProgressionAnalysis`
   - Logs success/failure to Cloud Logging with error classification
10. Result returns to client; React Query cache invalidates and refetches
11. Card re-renders with AI-generated insight and recommendation

**Workout Log Entry Flow:**

1. User navigates to `/history` page
2. `useWorkouts()` hook fetches logs from Firestore (client-side, filtered by auth user)
3. User takes screenshot of workout or enters data manually
4. Form submission calls `parseWorkoutScreenshotAction()` from `src/app/history/actions.ts`
5. Server action:
   - Validates auth and API key presence
   - Checks rate limit
   - Calls Genkit flow `parseWorkoutScreenshot()` for AI parsing
   - Increments usage counter on success
   - Returns parsed exercises and metadata
6. Client-side form saves via `addWorkoutLog()` action
7. React Query mutation fires `addWorkoutLog` action
8. Action persists to Firestore and invalidates cache
9. Workout appears in history and analysis charts update

**State Management Strategy:**
- Query data (workouts, PRs, profile, exercises) cached by React Query with configurable stale times
- Historical months cache indefinitely; current month caches 1 hour; analysis data caches 5 minutes
- Mutations invalidate relevant query keys to trigger refetches
- Profile data cached via Next.js `unstable_cache` on server (5-minute revalidation)
- Client-side form state via React Hook Form
- UI state (selected lift, time range) in local component state

## Key Abstractions

**ExerciseDocument:**
- Purpose: Represents a unique exercise in the Firebase library with canonical identification
- Examples: `src/lib/exercise-types.ts`, Firestore `exercises` collection
- Pattern: Each exercise has `normalizedName` (canonical), `legacyNames[]` (aliases), `category`, equipment, strength standards
- Machine exercises ("machine bicep curl") are DISTINCT exercises, not aliases of non-machine versions

**CanonicalNameResolution:**
- Purpose: Resolve any exercise name variant to its canonical name for consistent lookups
- Examples: `resolveCanonicalExerciseName()` in `src/lib/exercise-normalization.ts`
- Pattern: Normalize for comparison (strip EGYM/Machine prefix, remove parens, lowercase), lookup in exercise library by normalizedName or legacyNames, return canonical
- Critical: Applied across analysis/prs pages to ensure machine vs non-machine distinction is preserved

**Error Classification:**
- Purpose: Categorize errors (quota, overload, validation, auth, unknown) for appropriate handling
- Examples: `src/lib/logging/error-classifier.ts`
- Pattern: Examine error message/type, classify into 5 categories, determine if should increment usage counter and user-friendly message
- Applied in all server actions before returning to client

**ErrorBoundary Component:**
- Purpose: Catch React component errors, log via server action, display fallback UI
- Examples: `src/components/error/ErrorBoundary.tsx`, `src/components/analysis/CardErrorFallback.tsx`
- Pattern: Class component wrapping children; on error logs to `/api/client-errors`, displays fallback UI, provides reset button
- Nested boundaries: app-level, page-level, card-level allow granular isolation

**Genkit AI Flow:**
- Purpose: Define structured AI prompt with input/output Zod schemas and fallback logic
- Examples: `src/ai/flows/lift-progression-analyzer.ts`, `strength-imbalance-analyzer.ts`
- Pattern: Export async function accepting typed input, invoke `ai.defineFlow()` with model + safety settings, return typed output
- Fallback: If too little data or API key missing, return sensible defaults without calling AI

**Rate Limiter:**
- Purpose: Limit AI feature usage per user per day via Upstash Redis
- Examples: `src/app/prs/rate-limiting.ts`
- Pattern: Check feature + user in Redis, return allowed/error; bypass in dev environment
- Applies to: prParses, screenshotParses, liftProgressionAnalyses, strengthAnalyses, weeklyPlans, goalAnalyses

## Entry Points

**Home Page:**
- Location: `src/app/page.tsx`
- Triggers: User visits `/`
- Responsibilities: Greet authenticated user, show quick action cards, display dashboard with weekly progress/history

**Analysis Page:**
- Location: `src/app/analysis/page.tsx`
- Triggers: User navigates to `/analysis`
- Responsibilities: Display multiple analysis cards (lift progression, strength balance, cardio, exercise variety, milestones, etc.); fetch exercise library; resolve exercise names to canonical

**Personal Records Page:**
- Location: `src/app/prs/page.tsx`
- Triggers: User navigates to `/prs`
- Responsibilities: Display PRs by category; upload PR screenshot; edit/delete PRs; show strength badges

**Workout History Page:**
- Location: `src/app/history/page.tsx`
- Triggers: User navigates to `/history`
- Responsibilities: Display workout logs; parse screenshot or manual entry; create/update/delete logs

**Plan Page:**
- Location: `src/app/plan/page.tsx`
- Triggers: User navigates to `/plan`
- Responsibilities: Generate weekly plan via AI; display generated plan with daily exercises and feedback section

**Profile Page:**
- Location: `src/app/profile/page.tsx`
- Triggers: User navigates to `/profile`
- Responsibilities: Collect user stats (age, weight, height, etc.); set fitness goals; update profile

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All pages
- Responsibilities: Set up QueryProvider (React Query), AuthProvider, AuthGate, toast notifications, bottom navigation

## Error Handling

**Strategy:** Multi-layer error capture and classification.

**Patterns:**

1. **Server Actions:** Use `withServerActionLogging()` wrapper; classify errors; return `{ success: boolean; data?; error? }` object
   - File: `src/lib/logging/server-action-wrapper.ts`

2. **AI Error Classification:** 5 categories (quota, overload, validation, auth, unknown); determine user message and rate-limit impact
   - File: `src/lib/logging/error-classifier.ts`

3. **React Error Boundaries:** Catch component render errors; log via `reportError()` action to `/api/client-errors`; display fallback UI with retry button
   - Files: `src/components/error/ErrorBoundary.tsx`, `src/components/error/AIOperationErrorHandler.tsx`

4. **API Routes:** `/api/client-errors` accepts POST with client error payload (Zod validated); rate-limited; logs to Cloud Logging

5. **PII Redaction:** Error logs redact emails, phone numbers, usernames via `redactPII()` in `src/lib/logging/data-redactor.ts`

## Cross-Cutting Concerns

**Logging:** Google Cloud Logging SDK (`@google-cloud/logging`) with structured logs including userId, route, feature, duration, error classification
- Location: `src/lib/logging/logger.ts`
- Used by: All server actions, error handlers, health check endpoint

**Validation:** Zod schemas for type safety on:
- Server action inputs
- AI flow inputs/outputs
- Client error payloads
- Form data

**Authentication:** Firebase Auth with session cookie + server-side verification
- Client: `AuthProvider` (`src/lib/auth.service.tsx`) monitors auth state, creates session cookie
- Server: `getAuthenticatedUser()` and `getCurrentUserProfile()` in `src/lib/auth-server.ts` verify session cookie and cache profile
- Entry point protection: Pages check profile existence; unauthenticated users shown setup prompts

**Rate Limiting:** Per-user daily limits on AI features via Upstash Redis
- Granular: Different limits for prParses (5/day), screenshotParses (10/day), analyses (20/day), plans (5/day)
- File: `src/app/prs/rate-limiting.ts`

**Caching Strategy:** Multi-tier
- React Query: configurable stale times per query
- Next.js server cache: user profile cached 5 min with revalidation tags
- Firestore: client-side queries filter by auth user

---

*Architecture analysis: 2026-02-05*
