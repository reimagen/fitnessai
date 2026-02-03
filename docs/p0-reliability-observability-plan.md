# P0 Reliability & Observability Implementation Plan

## Executive Summary

This plan establishes a foundation for production-grade observability, focusing on four key initiatives:

1. **Centralized Server-Side Error Logging** - Capture errors with full request context
2. **Client-Side Error Boundaries** - Graceful degradation on critical routes
3. **AI Error Classification** - Consistent handling of quota, overload, and validation errors
4. **Health Check & Uptime Monitoring** - Basic operational visibility

**Current State**: The application has basic error handling scattered across server actions and uses `console.error` (26 instances found). There are no error boundaries, no centralized logging infrastructure, and no health check endpoint. Genkit AI errors are handled locally in each action with repeated patterns.

**Proposed Approach**: Implement a modular, Firebase-aligned solution that respects the existing architecture while adding structured observability without significant external dependencies.

---

## 1. Logging Infrastructure

### 1.1 Approach

**Tool**: `@google-cloud/logging` SDK for structured logging

**Dependency**: Add `@google-cloud/logging` npm package

- Initialize SDK in `/src/lib/logging/logger.ts` (Node.js runtime only)
- SDK sends logs to Cloud Logging API with severity and metadata
- Local development: Fallback to `console.error()` with JSON (not SDK transport)
- Production (App Hosting): SDK sends to Cloud Logging automatically
- Trace correlation: Manual (parse `X-Cloud-Trace-Context` header, pass to logger)

**Why SDK**:
- Structured log ingestion to Cloud Logging
- Severity fields (DEBUG, INFO, WARN, ERROR, FATAL)
- Manual trace correlation (pass header to logger)
- Resource metadata (service, version, location)

### 1.2 Architecture

**Runtime Separation** (critical for Next.js):
- **Server-side** (Node.js): `logger.ts` uses `@google-cloud/logging` SDK
- **Client-side** (browser): `error-reporter.ts` POSTs to `/api/client-errors` endpoint
- **Context**: Created in server actions/route handlers (Node.js), passed via parameters

```
src/lib/logging/
├── logger.ts              # Server-side logging (Node.js, uses @google-cloud/logging)
├── error-reporter.ts      # Client-side error reporting (browser, POSTs to server)
├── request-context.ts     # Types and utilities for passing context via params
├── error-classifier.ts    # AI error classification (used on both sides)
├── health-check.ts        # Health status tracking (Node.js only)
├── data-redactor.ts       # Redacts PII from logs (emails, IDs, etc.)
└── types.ts               # Logging type definitions
```

**Logging Flow**:
- Server actions → log via `logger.ts` → Cloud Logging
- Client components (error boundaries) → report via `error-reporter.ts` → `/api/client-errors` → stored in Cloud Logging
- Middleware → minimal/no logging (edge runtime)

### 1.3 Logging Levels & Context

**Log Levels**: `debug`, `info`, `warn`, `error`, `fatal`

**Request Context Captured**:
- `userId` - From session/auth
- `route` - Current API route or server action
- `feature` - AI feature being invoked (prParses, strengthAnalyses, planGenerations, etc.)
- `requestId` - Unique request identifier for tracing
- `timestamp` - ISO 8601 format
- `environment` - Node environment
- `duration` - Operation duration in ms

**Example Log Format**:
```json
{
  "timestamp": "2026-02-02T15:30:45.123Z",
  "level": "error",
  "message": "AI model request failed",
  "userId": "user-123",
  "route": "/api/ai/parse-pr",
  "feature": "prParses",
  "requestId": "req-abc-123",
  "errorType": "quota_exceeded",
  "statusCode": 429,
  "errorMessage": "Rate limit exceeded",
  "duration": 2456,
  "environment": "production"
}
```

---

## 2. AI Error Classification

### 2.1 Error Categories

Consistent classification for all AI operations:

| Category | Status Code | Patterns | User Message | Recoverable |
|----------|------------|----------|--------------|------------|
| **quota_exceeded** | 429 | "429", "quota exceeded", "rate limit" | "Request quota exceeded. Try again later." | Yes (backoff) |
| **model_overloaded** | 503 | "503", "overloaded", "unavailable", "service_unavailable" | "AI service temporarily unavailable. Try again in moments." | Yes (backoff) |
| **validation_error** | 400 | "validation", "invalid", "malformed", "safety", "blocked" | User-specific validation message | No |
| **auth_error** | 401/403 | "unauthorized", "forbidden", "auth", "access denied" | "Authentication failed. Please sign in again." | No |
| **unknown_error** | 500+ | All others | "An unexpected error occurred. Please try again." | Maybe (with logging) |

### 2.2 Logger Initialization

Create `/src/lib/logging/logger.ts`:

```typescript
import { Logging } from '@google-cloud/logging';

let logging: Logging | null = null;

function getLogging(): Logging {
  if (!logging) {
    logging = new Logging({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      // On App Hosting, credentials auto-loaded from environment
    });
  }
  return logging;
}

// Extract trace ID from request header (must be passed in)
function formatTraceId(traceHeader?: string): string | undefined {
  if (!traceHeader) return undefined;
  // Format: "trace-id/span-id;o=trace-true"
  const match = traceHeader.match(/^([^/]+)/);
  return match ? match[1] : undefined;
}

interface LogMetadata {
  userId?: string;
  route?: string;
  feature?: string;
  requestId?: string;
  duration?: number;
  error?: string;
  [key: string]: any;
}

export async function log(
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  message: string,
  metadata: LogMetadata = {},
  traceHeader?: string
) {
  try {
    const logging = getLogging();
    const logName = 'fitnessai';
    const log = logging.log(logName);

    // Build entry metadata with trace correlation
    const entryMetadata: Record<string, unknown> = {
      severity: level.toUpperCase(),
    };

    // Add trace correlation if available
    const traceId = formatTraceId(traceHeader);
    if (traceId) {
      entryMetadata['logging.googleapis.com/trace'] = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/traces/${traceId}`;
    }

    const entry = log.entry(entryMetadata, { message, ...metadata });
    await log.write(entry);
  } catch (err) {
    // Fallback to console if Cloud Logging fails
    console.error(JSON.stringify({ level, message, ...metadata, error: String(err) }));
  }
}

export const logger = {
  debug: (msg: string, meta?: LogMetadata, traceHeader?: string) => log('debug', msg, meta, traceHeader),
  info: (msg: string, meta?: LogMetadata, traceHeader?: string) => log('info', msg, meta, traceHeader),
  warn: (msg: string, meta?: LogMetadata, traceHeader?: string) => log('warn', msg, meta, traceHeader),
  error: (msg: string, meta?: LogMetadata, traceHeader?: string) => log('error', msg, meta, traceHeader),
  fatal: (msg: string, meta?: LogMetadata, traceHeader?: string) => log('fatal', msg, meta, traceHeader),
};
```

**Trace Correlation** (manual, not automatic):
- Extract `X-Cloud-Trace-Context` header from request
- Pass to logger functions
- SDK formats as `logging.googleapis.com/trace` in metadata
- Enables cross-service debugging in Cloud Logging console
- Note: Requires explicit header passing; not automatic in SDK

### 2.3 Error Classification

Create `/src/lib/logging/error-classifier.ts`:

```typescript
export interface ClassifiedError {
  category: 'quota_exceeded' | 'model_overloaded' | 'validation_error' | 'auth_error' | 'unknown_error';
  statusCode: number;
  userMessage: string;
  shouldRetry: boolean;
  shouldCountAgainstLimit: boolean;
}

export function classifyAIError(error: unknown): ClassifiedError {
  // Logic to classify based on error message patterns
}
```

### 2.3 Usage in Server Actions

Standardize error handling in all server actions (PRS, Analysis, Plan, Profile, History):

```typescript
try {
  // AI operation
} catch (error) {
  const classified = classifyAIError(error);
  await logger.error('AI operation failed', {
    errorType: classified.category,
    statusCode: classified.statusCode,
  });

  if (!classified.shouldCountAgainstLimit) {
    // Don't increment usage counter
  }

  return { success: false, error: classified.userMessage };
}
```

---

## 3. Centralized Server Error Logging

### 3.1 Request Context Strategy

**Architecture Decision**: AsyncLocalStorage cannot be used in Next.js middleware (edge runtime). Instead:

- **Request ID**: Generate in route handlers and server actions (Node.js runtime)
- **Context Propagation**: Pass context as function parameters or via request headers
- **Server Action Wrapper**: Wraps server actions to capture context and log with user ID, route, and feature

**File**: `/src/middleware.ts` (minimal changes)
```typescript
// Only pass through headers; no error handling or context creation
// Edge runtime limitations prevent AsyncLocalStorage or error boundaries here
```

### 3.2 Server Action Wrapper

Create `/src/lib/logging/server-action-wrapper.ts`:

```typescript
export interface RequestContext {
  userId: string;
  requestId: string;
  feature: string;
  route: string;
}

export function withErrorLogging<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  context: RequestContext
): (...args: T) => Promise<R> {
  return async (...args) => {
    const startTime = performance.now();

    try {
      const result = await action(...args);
      // Log success with duration
      await logger.info('Operation succeeded', {
        ...context,
        duration: performance.now() - startTime,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      await logger.error('Server action failed', {
        ...context,
        duration,
        error: String(error),
      });
      throw error;
    }
  };
}
```

**Usage in Server Actions**:
```typescript
export async function myAction(userId: string, input: MyInput) {
  const context: RequestContext = {
    userId,
    requestId: generateRequestId(),
    feature: 'myFeature',
    route: 'myAction',
  };

  return withErrorLogging(
    async () => {
      // AI operation
    },
    context
  )();
}
```

### 3.3 Client-Side Error Reporting

Create `/src/lib/logging/error-reporter.ts`:

```typescript
export interface ClientError {
  message: string;
  error: string;
  stack?: string;
  url: string;
  userId?: string;
  feature?: string;
  timestamp: string;
}

export async function reportError(error: Error, context?: { feature?: string }) {
  try {
    await fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        error: String(error),
        stack: error.stack,
        url: typeof window !== 'undefined' ? window.location.href : '',
        feature: context?.feature,
        timestamp: new Date().toISOString(),
      } as ClientError),
    });
  } catch (err) {
    // Fail silently to avoid error loops
    console.error('Failed to report error', err);
  }
}
```

Create `/src/app/api/client-errors/route.ts` (Node.js runtime):

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';

// Rate limit: 10 errors per minute per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

export async function POST(req: Request) {
  // Get client IP for rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  // Check rate limit
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many error reports. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
    );
  }

  try {
    const error: ClientError = await req.json();

    // Redact PII before logging
    const redacted = redactPII(error);

    await logger.error('Client-side error', redacted);

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Malformed request
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
```

**Rate Limiting**:
- Uses Upstash Redis (serverless, no infrastructure)
- 10 errors per minute per IP address
- Prevents spam/log flooding
- Returns 429 Too Many Requests when limit exceeded
- Anonymous access allowed (no auth required)

### 3.4 Data Redaction (PII Protection)

Create `/src/lib/logging/data-redactor.ts`:

```typescript
export function redactPII(data: any): any {
  // Redact common PII patterns:
  // - Email addresses → [REDACTED_EMAIL]
  // - Phone numbers → [REDACTED_PHONE]
  // - User IDs (keep first 8 chars) → [REDACTED_user-xxxxx...]
  // - URLs with sensitive params → [REDACTED_URL]
  // - Auth tokens → [REDACTED_TOKEN]
}
```

**Sensitive Data Guidelines**:
- ✅ DO log: Operation names, error types, feature names, timestamps
- ❌ DON'T log: Full emails, phone numbers, auth tokens, full user IDs
- ⚠️ MAYBE: User IDs (only first 8 chars), workout data (safe to log), personal stats (redact if combined with ID)

### 3.5 Database Operation Logging

Enhance `/src/lib/firestore-server.ts`:

- Log Firestore errors (redact document paths if they contain PII)
- Track slow queries (>500ms)
- Log failed authentications (redact credential details)
- Sample "document not found" errors (don't log every single one; log 1 in 10 to reduce noise)

---

## 4. Client-Side Error Boundaries

### 4.1 Error Boundary Component

Create `/src/components/error/ErrorBoundary.tsx` (client component):

```typescript
'use client';  // REQUIRED: Must be a client component

import { reportError } from '@/lib/logging/error-reporter';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  feature?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report error to server (non-blocking)
    reportError(error, { feature: this.props.feature });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error, () => this.setState({ hasError: false }))
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>Please refresh the page or try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Next.js Requirements**:
- `'use client'` directive is **required** (client component)
- Must extend `React.Component` (class component only; hooks not allowed)
- `getDerivedStateFromError` for state updates
- `componentDidCatch` for side effects (logging)

### 4.2 Next.js Error Boundaries

Create `/src/app/error.tsx` (client component):

```typescript
'use client';  // REQUIRED

import React from 'react';
import { reportError } from '@/lib/logging/error-reporter';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: Props) {
  React.useEffect(() => {
    reportError(error, { feature: 'page-render' });
  }, [error]);

  return (
    <div>
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

Create `/src/app/global-error.tsx` (client component, only for root errors):

```typescript
'use client';  // REQUIRED

import React from 'react';
import { reportError } from '@/lib/logging/error-reporter';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  React.useEffect(() => {
    reportError(error, { feature: 'global-error' });
  }, [error]);

  return (
    <html>
      <body>
        <h1>Critical Error</h1>
        <p>{error.message}</p>
        <button onClick={reset}>Reset application</button>
      </body>
    </html>
  );
}
```

**Next.js Error Boundary Behavior**:
- `error.tsx`: Catches errors in route segment and children
- `global-error.tsx`: Catches errors in root layout (must include `<html>` and `<body>`)
- Both receive `error` (Error object) and `reset` (function to retry)
- Both must be client components (`'use client'`)
- Automatically catches server and client errors in child components

### 4.3 Critical Route Protection

Wrap critical pages with custom error boundaries:

- **History Page** (`/src/app/history/page.tsx`): Wrap `HistoryPageContent`
- **Analysis Page** (`/src/app/analysis/page.tsx`): Add boundary around chart cards
- **Plan Page** (`/src/app/plan/page.tsx`): Wrap `PlanGeneratorSection`

These provide more granular error handling than route-level error.tsx

### 4.3 AI Operation Error Handling

Create `/src/components/error/AIOperationErrorHandler.tsx`:

Specialized component for handling AI-specific errors with:
- Retry button for quota/overload errors
- Recovery suggestions
- Logging integration

**Usage Example**:
```typescript
<AIOperationErrorHandler
  error={error}
  operation="planGeneration"
  onRetry={handleGeneratePlan}
  showDetails={isDevelopment}
/>
```

### 4.4 Hook for Error Handling

Create `/src/hooks/useErrorHandler.ts`:

```typescript
export function useErrorHandler(feature: string) {
  return {
    captureError: (error: Error, metadata?: object) => {
      // Logs error with feature context
    },
    handleAIError: (error: unknown) => {
      // Classifies and returns user-friendly message
    },
  };
}
```

---

## 5. Health Check & Uptime Monitoring

### 5.1 Health Check Endpoint

Create `/src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';

// Must specify Node.js runtime for Firestore Admin SDK
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const traceHeader = req.headers.get('x-cloud-trace-context');

  const checks = {
    status: 'ok' as const,
    checks: {
      database: await checkFirestore(),
      ai: await checkAIConfig(),
    },
    timestamp: new Date().toISOString(),
  };

  const isHealthy = checks.checks.database === 'ok' && checks.checks.ai === 'ok';

  // Log health status (omit uptime; it's internal detail)
  await logger.info('Health check', checks, traceHeader);

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
  });
}
```

**Design**:
- Return only public health status (database, ai, timestamp)
- Do NOT include `process.uptime()` (internal detail)
- Log via centralized logger for Cloud Logging integration
- Return 503 if any service is degraded
- Pass trace header for correlation in logs

**Important**:
- `export const runtime = 'nodejs'` is **required** for Firestore Admin SDK
- Without this, the route defaults to edge runtime where Admin SDK is unavailable

### 5.2 Health Status Tracking

Create `/src/lib/logging/health-check.ts`:

```typescript
export async function checkFirestore(): Promise<'ok' | 'degraded' | 'down'> {
  // Quick read to Firebase to verify connectivity
}

export async function checkAIConfig(): Promise<'ok' | 'degraded' | 'down'> {
  // Verify API key is configured
}

export async function logHealthStatus() {
  // Log to Cloud Logging for uptime monitoring
}
```

### 5.3 Periodic Health Logging

**Important**: Serverless environments (Firebase App Hosting) have no long-lived processes. Use **Cloud Scheduler** instead of server initialization.

**Setup**:
1. Create Cloud Scheduler job that calls `/api/health` every 5 minutes
2. Configure Cloud Monitoring alert on health endpoint failures
3. Health logs automatically appear in Cloud Logging via the endpoint

**Cloud Scheduler Configuration**:
```
Frequency: every 5 minutes
HTTP target: https://[your-app-domain]/api/health
Auth: None (allow unauthenticated)
Reason: Health check must be accessible to external monitors; no sensitive data exposed
```


**Alternative (if Cloud Scheduler not available)**:
- Use Google Cloud Functions with Pub/Sub trigger on a 5-minute schedule
- Or use a dedicated monitoring service (Uptime.com, Pingdom, etc.)

---

## 6. Files to Create/Modify

### New Files to Create

**Server-Side Logging**:
1. **`/src/lib/logging/logger.ts`** - Core structured logging utility using @google-cloud/logging (Node.js only)
2. **`/src/lib/logging/request-context.ts`** - Types and utilities for request context (passed as params)
3. **`/src/lib/logging/error-classifier.ts`** - AI error classification logic
4. **`/src/lib/logging/health-check.ts`** - Health status tracking (Node.js only)
5. **`/src/lib/logging/data-redactor.ts`** - Redacts PII from logs before storage
6. **`/src/lib/logging/types.ts`** - TypeScript types for logging
7. **`/src/lib/logging/server-action-wrapper.ts`** - Server action wrapper with logging (Node.js only)

**Client-Side Error Reporting**:
8. **`/src/lib/logging/error-reporter.ts`** - Client-side error reporting (POSTs to server)
9. **`/src/app/api/client-errors/route.ts`** - Server endpoint to receive client errors (Node.js runtime)

**Error Handling UI**:
10. **`/src/components/error/ErrorBoundary.tsx`** - React error boundary (client component, `'use client'`)
11. **`/src/components/error/AIOperationErrorHandler.tsx`** - AI error display component
12. **`/src/hooks/useErrorHandler.ts`** - Hook for client-side error handling

**Health & Monitoring**:
13. **`/src/app/api/health/route.ts`** - Health check endpoint (with `runtime = 'nodejs'`, auth: allow unauthenticated)
14. **`/src/app/error.tsx`** - Next.js error boundary (client component, `'use client'` required)
15. **`/src/app/global-error.tsx`** - Root error boundary (client component, `'use client'` required)

### Files to Modify

1. **`/src/middleware.ts`** - Minimal changes (edge runtime incompatible with logging context)
2. **`/src/app/prs/actions.ts`** - Use standardized error classification + server-action-wrapper
3. **`/src/app/analysis/actions.ts`** - Use standardized error classification + server-action-wrapper
4. **`/src/app/plan/actions.ts`** - Use standardized error classification + server-action-wrapper
5. **`/src/app/profile/actions.ts`** - Use standardized error classification + server-action-wrapper
6. **`/src/app/history/actions.ts`** - Use standardized error classification + server-action-wrapper
7. **`/src/lib/firestore-server.ts`** - Add error logging to DB operations (redact PII)
8. **`/src/app/api/session/route.ts`** - Add error logging
9. **`/src/app/history/page.tsx`** - Add error boundary (client-side)
10. **`/src/app/analysis/page.tsx`** - Add error boundary (client-side)
11. **`/src/app/plan/page.tsx`** - Add error boundary (client-side)
12. **`package.json`** - Add `@google-cloud/logging` and `@upstash/ratelimit` + `@upstash/redis`
13. **`.env.local`** - Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (for rate limiting)

---

## 7. Implementation Phases

### Phase 1: Logging Infrastructure (2-3 days)
1. Initialize `@google-cloud/logging` SDK in logger.ts
2. Create server action wrapper that captures context (userId, route, feature, requestId, duration)
3. Add logging to all server actions (wrap with context)
4. Add basic health check endpoint (with `runtime = 'nodejs'`)
5. Add logging to session/auth route

**Acceptance Criteria**:
- `@google-cloud/logging` SDK initialized and working
- All server logs include `requestId`, `route`, `timestamp` (userId optional for unauthenticated endpoints)
- Health endpoint returns Firestore and AI config status
- Logs appear in Cloud Logging console (when deployed to App Hosting)
- Trace IDs present in Cloud Logging for correlation

### Phase 2: Error Classification (1-2 days)
1. Implement AI error classifier
2. Update all server actions (PRS, Analysis, Plan, Profile, History) to use classifier
3. Add consistent user-friendly error messages
4. Verify that quota errors don't count against limits

**Acceptance Criteria**:
- All AI errors classified consistently
- Quota/overload errors show appropriate retry UI
- Non-retryable errors logged but not retried
- Usage counter not incremented on quota errors

### Phase 3: Client-Side Error Boundaries (2-3 days)
1. Create generic `ErrorBoundary` component
2. Create `AIOperationErrorHandler` component
3. Wrap critical routes (History, Analysis, Plan)
4. Add `useErrorHandler` hook to components
5. Test error capture and display

**Acceptance Criteria**:
- Error boundaries catch and display errors gracefully
- User can recover from errors without page reload
- Errors logged to backend
- Development mode shows full error details

### Phase 4: Testing & Refinement (1-2 days)
1. Add error simulation endpoints for testing (development-only, gated by NODE_ENV check)
2. Test each error path (quota, overload, validation, etc.)
3. Verify logging completeness
4. Document error handling patterns
5. Test health check endpoint

**Error Simulation Endpoints** (development only):
```typescript
// Only available in development environment
if (process.env.NODE_ENV === 'development') {
  export async function GET(req: Request) {
    const errorType = req.nextUrl.searchParams.get('type');
    const traceHeader = req.headers.get('x-cloud-trace-context');

    switch (errorType) {
      case 'quota':
        throw new Error('Quota exceeded');
      case 'overload':
        throw new Error('Service overloaded');
      default:
        throw new Error('Simulated error');
    }
  }
}
```

**Acceptance Criteria**:
- All error paths tested and logged
- Health check endpoint functional
- Logging includes required context (requestId, route, timestamp; userId optional for unauth)
- Performance impact: <10ms for successful operations (via sampling), <20ms for errors (with batching)
- Error simulation endpoints only available in development (no production exposure)
- Trace IDs present in Cloud Logging for error correlation

**Performance Notes**:
- `logger.info()` for successful operations should be sampled (e.g., 1 in 100 requests) to reduce overhead
- `logger.error()` can be buffered/batched (send every 1 second or when buffer hits 50 entries)
- Client error reporting is non-blocking (fire-and-forget) to avoid impacting user experience

### Phase 5: Deployment & Monitoring (1 day)
1. Deploy to Firebase App Hosting
2. Verify Cloud Logging integration
3. Set up Cloud Monitoring alerts
4. Document for operations team

**Acceptance Criteria**:
- Logs appear in Cloud Logging console
- Health endpoint monitored
- Alerts configured for errors
- Deployment successful

---

## 8. Testing Strategy

### Unit Tests

- **Logger**: Verify structured output format
- **Error Classifier**: Test all error categories with various input patterns
- **Health Check**: Mock Firestore/AI calls and verify responses

### Integration Tests

- **Server Actions**: Trigger errors and verify logging
- **Middleware**: Test request ID generation and context propagation
- **Error Boundaries**: Mount with failing children, verify recovery

### Manual Testing

1. **Quota Error**: Trigger 429 response, verify UI handles gracefully
2. **Overload Error**: Trigger 503 response, verify retry suggestion
3. **Validation Error**: Trigger validation error, verify no retry shown
4. **Critical Route Failures**: Simulate failures on History/Analysis/Plan pages
5. **Health Check**: Verify endpoint returns appropriate status
6. **Logging**: Check Cloud Logging for structured entries

### Load Testing

- Verify logging overhead doesn't impact performance
- Test with 100+ concurrent requests
- Monitor Cloud Logging quotas

---

## 9. Logging Retention & Costs

### Log Retention Policy

- **Development**: Keep 7 days
- **Production**: Keep 30 days (configurable)
- **Critical Errors**: Keep 90 days

### Cost Optimization

- Use sampling for verbose logs (e.g., 10% of successful operations)
- Batch error logs before sending to Cloud Logging
- Archive old logs to Cloud Storage after retention period

---

## 10. Error Handling Patterns

### Server Action Pattern

```typescript
export async function myAIAction(userId: string, input: MyInput) {
  if (!userId) {
    await logger.warn('Unauthorized access attempt', { route: 'myAIAction' });
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const result = await myAIOperation(input);
    await logger.info('Operation succeeded', { feature: 'myFeature' });
    return { success: true, data: result };
  } catch (error) {
    const classified = classifyAIError(error);
    await logger.error('AI operation failed', {
      feature: 'myFeature',
      errorType: classified.category,
    });

    if (!classified.shouldCountAgainstLimit) {
      // Skip increment
    }

    return { success: false, error: classified.userMessage };
  }
}
```

### Component Pattern

```typescript
export function MyComponent() {
  const { captureError, handleAIError } = useErrorHandler('myFeature');

  const handleAction = async () => {
    try {
      const result = await myServerAction();
      // Handle success
    } catch (error) {
      captureError(error as Error, { action: 'myAction' });
      const userMessage = handleAIError(error);
      // Show error UI
    }
  };

  return <ErrorBoundary feature="myComponent">{/* ... */}</ErrorBoundary>;
}
```

---

## 11. Monitoring & Alerting

### Cloud Monitoring Queries

```
# Error rate in last 5 minutes
resource.type="cloud_run"
jsonPayload.level="error"
```

### Recommended Alerts

1. **High Error Rate**: >5% of requests returning errors
2. **Quota Exhaustion**: >10 quota_exceeded errors per hour
3. **AI Unavailable**: >5 model_overloaded errors in 5 minutes
4. **Database Issues**: Health check failing for >2 minutes
5. **Response Time**: P95 latency >2000ms

---

## 12. Documentation

### For Developers

- Add comments explaining the logging context system
- Document error classification categories
- Create runbook for common error scenarios
- Add troubleshooting guide to README

### For Operations

- Document health check endpoint and expected responses
- Create runbook for responding to alerts
- Document log retention policy and archival process
- Include escalation procedures for critical errors

---

## 13. Success Metrics

- All errors logged with context (requestId, route, timestamp; userId when available) (100%)
- Critical routes protected by error boundaries (100%)
- AI errors classified consistently (100%)
- Health endpoint returns accurate status (100%)
- Trace IDs present in Cloud Logging for all errors (100%)
- Mean time to detect production issues: <5 minutes
- Mean time to resolution aided by logs: <30 minutes
- Zero user-facing 500 errors due to unhandled exceptions

---

## 14. Rollback Plan

If issues arise after deployment:

1. **High Log Volume**: Disable sampling, reduce retention
2. **Performance Issues**: Reduce health check frequency, batch logs
3. **Cloud Logging Quota**: Archive to Cloud Storage, reduce retention
4. **Logic Errors**: Fix in new release, quick redeploy
5. **Regression**: Revert middleware and disable error boundaries

---

## Critical Dependencies

These files should be prioritized as they are foundational:

- **`/src/lib/logging/logger.ts`** - Core logging infrastructure; initializes @google-cloud/logging SDK
- **`/src/lib/logging/error-classifier.ts`** - AI error classification used by all server actions
- **`/src/lib/logging/server-action-wrapper.ts`** - Wraps server actions with context (userId, route, feature, requestId)
- **`/src/components/error/ErrorBoundary.tsx`** - Client-side error boundary for critical routes
- **`/src/app/error.tsx`** and **`/src/app/global-error.tsx`** - Next.js error boundary fallback

---

---

## Architectural Corrections (from Initial Plan)

This section documents critical fixes made to align with Next.js architecture:

### Issue 1: AsyncLocalStorage in Edge Runtime
**Problem**: Original plan proposed AsyncLocalStorage in middleware (edge runtime), but AsyncLocalStorage is only available in Node.js runtimes.

**Solution**:
- Move context creation to server actions and route handlers (Node.js runtime)
- Pass context as function parameters, not via AsyncLocalStorage
- Middleware remains minimal (edge compatible)

### Issue 2: Error Boundaries in Middleware
**Problem**: Original plan attempted to add error boundaries to middleware, which cannot catch React errors or host error boundary logic.

**Solution**:
- Remove error handling from middleware
- Implement error boundaries in `app/error.tsx` and `app/global-error.tsx` (Next.js standard)
- Add client-side error boundaries to critical routes
- This is the correct Next.js pattern for error handling

### Issue 3: Periodic Health Logging on Serverless
**Problem**: Original plan proposed logging health status on server initialization, but Firebase App Hosting (serverless) has no long-lived processes.

**Solution**:
- Remove server initialization approach
- Use Google Cloud Scheduler to call `/api/health` every 5 minutes
- Health endpoint logs automatically to Cloud Logging
- This works correctly on serverless infrastructure

### Issue 4: Health Check Runtime Requirements
**Problem**: Health endpoint uses `process.uptime()` and Firestore Admin SDK, which require Node.js runtime, but Next.js routes default to edge runtime.

**Solution**:
- Explicitly set `export const runtime = 'nodejs'` in `/src/app/api/health/route.ts`
- This ensures access to Node.js APIs and Admin SDK

### Issue 5: Dependency Clarity
**Problem**: Original plan stated "no external dependencies" but also mentioned Cloud Logging integration, which requires the SDK.

**Solution**:
- Explicitly require `@google-cloud/logging` dependency
- Add to `package.json` during Phase 1
- Library handles structured JSON formatting and transport automatically

### Issue 6: Error Simulation Security
**Problem**: Error simulation endpoints for testing should not be exposed in production.

**Solution**:
- Gate error simulation endpoints with `NODE_ENV === 'development'` check
- Or use feature flags that are disabled in production
- Prevents accidental/malicious abuse in production

### Issue 7: Cloud Logging Integration Underspecified
**Problem**: Plan mentions Cloud Logging but doesn't clarify what SDK integration is needed and which runtime provides it.

**Solution**:
- Use `@google-cloud/logging` SDK (npm package)
- Only available in Node.js runtime (not edge)
- Manual trace correlation by extracting `X-Cloud-Trace-Context` and setting `logging.googleapis.com/trace`
- Dev environment: Logs to console as JSON (manual fallback)
- Production (App Hosting): Logs sent to Cloud Logging via SDK

**SDK Benefits**:
- Severity field (ERROR, WARNING, INFO, DEBUG)
- Trace correlation when `X-Cloud-Trace-Context` is passed to the logger (manual)
- Resource metadata (service name, version, region)
- Structured log queries via Cloud Logging console

### Issue 8: Client-Side Logging Path
**Problem**: Error boundaries (client components) cannot call server-side logger utilities.

**Solution**:
- Create `error-reporter.ts` (client-safe) that POSTs to `/api/client-errors`
- Server endpoint uses server-side `logger.ts` to store logs
- Client errors appear in same Cloud Logging stream as server errors
- Non-blocking (won't freeze UI if logging service is slow)

### Issue 9: PII/Sensitive Data in Logs
**Problem**: Logging "document not found" and "failed authentication" could leak PII or create noisy logs.

**Solution**:
- Create `data-redactor.ts` to strip emails, phone numbers, full auth tokens
- Sample non-critical errors (log 1 in 10 "document not found" events)
- Don't log full user IDs; truncate to first 8 chars
- Don't log request/response bodies (only operation names and result)
- Guidelines: Safe to log (operations, error types, features); unsafe (credentials, emails, full IDs)

---

---

## Architecture Decisions (Final)

### Decision 1: Logging SDK
**Chosen**: `@google-cloud/logging` SDK (Option B)
- Trace correlation when `X-Cloud-Trace-Context` is passed to the logger (manual)
- Severity fields for better filtering
- Resource metadata (service, version, location)
- Dev fallback: console.log as JSON
- Cost: Included in App Hosting quota; overages ~$0.50/GB

### Decision 2: Client Error Endpoint
**Chosen**: Anonymous + Rate Limit (Option B)
- Allows unauthenticated users to report errors (e.g., during signup)
- Rate limited by IP: 10 errors per minute per client
- Uses Upstash Redis (serverless, ~$0.20/month at small scale)
- Prevents spam and log flooding
- No auth cookie required

---

## Next Steps

1. Add dependencies to `package.json`:
   - `npm install @google-cloud/logging @upstash/ratelimit @upstash/redis`

2. Set up environment variables:
   - `GOOGLE_CLOUD_PROJECT` (auto on App Hosting)
   - `UPSTASH_REDIS_REST_URL` (from Upstash console)
   - `UPSTASH_REDIS_REST_TOKEN` (from Upstash console)

3. Begin Phase 1 (Logging Infrastructure) - ~2-3 days:
   - Initialize `@google-cloud/logging` in logger.ts
   - Wrap all server actions with request context
   - Add health check endpoint
   - Deploy and verify logs in Cloud Logging console

4. Phase 2-5: Error classification, error boundaries, testing, monitoring setup

5. Set up Cloud Scheduler job to call `/api/health` every 5 minutes

6. Set up Cloud Logging dashboard and alerts before production launch

7. Monitor actual log volume and adjust sampling/retention as needed
