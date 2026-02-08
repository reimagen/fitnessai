# External Integrations

**Analysis Date:** 2026-02-05

## APIs & External Services

**Google AI:**
- Google Generative AI (Gemini) - LLM for all AI-powered analysis and generation
  - SDK/Client: @genkit-ai/googleai 1.28.0
  - Auth: GEMINI_API_KEY or GOOGLE_API_KEY (env vars)
  - Models:
    - Primary: googleai/gemini-2.5-flash-lite
    - Fallback: googleai/gemini-2.5-flash
  - Configuration: `src/ai/config.ts`
  - Usage: 5 AI flows for fitness analysis

**Error Handling & Telemetry:**
- Google Cloud Logging - Centralized log storage and monitoring
  - SDK: @google-cloud/logging 11.0.0
  - Auth: Application Default Credentials or explicit credentials
  - Implementation: `src/lib/logging/logger.ts`
  - Features:
    - Sampling: INFO logs sampled at 1% rate (configurable via LOG_INFO_SAMPLE_RATE)
    - PII Redaction: User IDs, IPs, and sensitive data redacted before logging
    - Trace Context: Correlates logs with Cloud Trace via x-cloud-trace-context header
    - Cloud Project: GOOGLE_CLOUD_PROJECT environment variable

## Data Storage

**Databases:**
- Firebase Firestore (NoSQL document database)
  - Connection: Firebase Admin SDK (server) + Firebase SDK (client)
  - Client: firebase 11.8.1
  - Admin: firebase-admin 12.2.0
  - Collections:
    - `exercises` - Exercise library with metadata (name, equipment, category, strength standards)
    - `exerciseAliases` - Exercise name aliases for normalization
    - `workoutLogs` - User workout history (date, exercises, sets, reps, weight)
    - `personalRecords` - User personal records by exercise
    - `users` - User profiles (age, weight, gender, goals)
    - `userAnalyses` - Cached analysis results (strength imbalance, progression insights)
  - Converters: Custom Firestore converters for Timestamp serialization in `src/lib/firebase-admin.ts`
  - Rules: `firestore.rules` (deployed via `firebase.json`)
  - Indexes: `firestore.indexes.json` (composite indexes for queries)

**File Storage:**
- Local filesystem - No cloud file storage integration
- Image sources: Public URLs (placehold.co for placeholder images, allowed in next.config.js)

**Caching:**
- Upstash Redis (serverless Redis, HTTP-based)
  - Connection: @upstash/redis 1.34.0
  - Auth: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
  - Usage:
    - Rate limiting: @upstash/ratelimit 2.0.2 for sliding window rate limits
    - Fallback: In-memory rate limiting if Redis unavailable
    - Client-side error rate limiting: 10 errors per minute per IP
  - Implementation: `src/app/api/client-errors/route.ts`

**Client-side State:**
- TanStack React Query (@tanstack/react-query 5.66.0)
  - Cache strategy: Time-based stale times per query type
  - Optimistic updates: Mutations invalidate related queries
  - Persistence: In-memory only (resets on page refresh)

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication
  - Implementation: Email/password authentication
  - Client: `src/lib/auth.service.tsx` (React Context provider)
  - Capabilities:
    - Sign up with email/password
    - Sign in with email/password
    - Password reset
    - Session management via HTTP-only cookies
  - Session Cookie:
    - Created via `/api/session` POST endpoint
    - 5-day expiration (SESSION_MAX_AGE_SECONDS: 60*60*24*5)
    - HTTP-only, Secure (production), SameSite=Lax
    - Cookie name: `__session`

**Authorization:**
- User UID - All user data scoped to Firebase UID
- No role-based access control detected
- Unauthenticated users can report errors to `/api/client-errors`

## Monitoring & Observability

**Error Tracking:**
- Google Cloud Logging - All errors logged to Cloud Logging
  - Implementation: `src/lib/logging/logger.ts`
  - Client errors: `/api/client-errors` endpoint accepts error reports
  - Server errors: Caught and logged in server actions via `withServerActionLogging` wrapper

**Logs:**
- Google Cloud Logging as primary system
- Fallback: Console output in development/non-production environments
- Log sampling: 1% of INFO/DEBUG logs (configurable)
- Error levels: debug, info, warn, error, fatal
- Structured logging: JSON format with metadata, timestamp, environment
- PII Redaction: `src/lib/logging/data-redactor.ts`

**Health Checks:**
- `/api/health` endpoint - Monitors infrastructure health
  - Checks: Firestore, AI configuration, Redis connectivity
  - Returns: JSON with status and component health
  - Used by: Load balancers, monitoring systems

**Client-side Error Reporting:**
- Error boundaries: React error boundaries for component-level errors
  - Global: `src/app/global-error.tsx`
  - Per-page: `src/app/error.tsx`
  - Card-level: `CardErrorFallback.tsx` for isolated card failures
- Client error reporter: Sends to `/api/client-errors` with payload validation
- Rate limiting: 10 errors/minute per IP (via Upstash or in-memory fallback)

## CI/CD & Deployment

**Hosting:**
- Firebase App Hosting (Google Cloud Platform)
  - Configuration: `firebase.json` (Firestore rules, indexes)
  - Deployment: Via Firebase CLI or GitHub integration
  - Environment: Application Default Credentials for service account access
  - Build-time: FIREBASE_WEBAPP_CONFIG injected as environment variable

**CI Pipeline:**
- GitHub Actions automated testing
  - Workflow: `.github/workflows/smoke-tests.yml`
  - Triggers: Every PR to main, every push to main
  - Tests: 11 end-to-end smoke tests (Playwright) validating critical user flows
  - Checks:
    - ESLint (lint)
    - TypeScript type checking (typecheck)
    - Smoke tests (authentication, workouts, analysis, screenshots)
  - Requirements: Lint and smoke tests must pass before merging to main
- Manual deployment to Firebase App Hosting via Firebase CLI or GitHub push to main

**Build Configuration:**
- Next.js build with TypeScript (strict mode enabled, build errors ignored)
- Server-side external packages: `@genkit-ai/firebase`, `firebase-admin`
- Test browser setup: Playwright installs Chromium for E2E tests in CI

## Environment Configuration

**Required env vars for client (NEXT_PUBLIC_):**
- NEXT_PUBLIC_FIREBASE_API_KEY - Firebase API key
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN - Firebase auth domain
- NEXT_PUBLIC_FIREBASE_PROJECT_ID - Firebase project ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET - Firebase storage bucket
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID - Firebase messaging sender ID
- NEXT_PUBLIC_FIREBASE_APP_ID - Firebase app ID

**Required env vars for server (private):**
- FIREBASE_PROJECT_ID - Firebase project ID
- FIREBASE_CLIENT_EMAIL - Firebase service account email
- FIREBASE_PRIVATE_KEY - Firebase service account private key
- FIREBASE_CONFIG - Indicates Firebase App Hosting (auto-set by platform)
- GEMINI_API_KEY or GOOGLE_API_KEY - Gemini API key
- GOOGLE_CLOUD_PROJECT - GCP project ID (for Cloud Logging traces)

**Optional env vars:**
- UPSTASH_REDIS_REST_URL - Upstash Redis URL (enables Redis-backed rate limiting)
- UPSTASH_REDIS_REST_TOKEN - Upstash Redis token
- LOG_INFO_SAMPLE_RATE - Logging sample rate (default: 0.01 = 1%)
- NODE_ENV - Set to 'production' to enable Cloud Logging (otherwise console)

**Secrets location:**
- Local development: `.env.development.local` (not committed)
- Production: `.env.production.local` or Firebase App Hosting secrets
- Environment variables injected at build time for NEXT_PUBLIC_*, at runtime for server-side

## Webhooks & Callbacks

**Incoming:**
- `/api/session` (POST/DELETE) - Sets/clears HTTP-only session cookie
- `/api/client-errors` (POST) - Accepts client error reports with rate limiting
- `/api/health` (GET) - Infrastructure health check

**Outgoing:**
- None detected (no external API calls beyond Gemini, Cloud Logging, Redis)

---

*Integration audit: Updated 2026-02-07*
