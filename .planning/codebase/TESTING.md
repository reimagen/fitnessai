# Testing Patterns

**Analysis Date:** 2026-02-05

## Test Framework

**Status:** No formal test framework currently configured or in use

**Not Detected:**
- No Jest configuration (`jest.config.ts` or `jest.config.js`)
- No Vitest configuration (`vitest.config.ts`)
- No test files found in `src/` directory (`.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`)
- No `__tests__` directories
- Testing dependencies not in `package.json`

**Note:** This codebase is currently in development without automated unit/integration tests. Testing is likely conducted manually or via E2E testing in production environments.

## Code Paths for Testing (If Implemented)

The following areas would benefit from test coverage:

### 1. Error Handling and Classification
**Location:** `src/lib/logging/error-classifier.ts`

**What should be tested:**
- Error classification into 5 categories (quota_exceeded, model_overloaded, validation_error, auth_error, unknown_error)
- Correct status codes assigned per category
- User message generation
- Retry flags (`shouldRetry`)
- Quota counter flags (`shouldCountAgainstLimit`)

**Test approach:**
```typescript
describe('classifyAIError', () => {
  it('classifies 429 errors as quota_exceeded', () => {
    const error = new Error('429: Rate limit exceeded');
    const result = classifyAIError(error);
    expect(result.category).toBe('quota_exceeded');
    expect(result.statusCode).toBe(429);
    expect(result.shouldRetry).toBe(true);
    expect(result.shouldCountAgainstLimit).toBe(false);
  });

  it('classifies 503 errors as model_overloaded', () => {
    const error = new Error('503: Service Unavailable');
    const result = classifyAIError(error);
    expect(result.category).toBe('model_overloaded');
  });

  it('classifies validation errors correctly', () => {
    const error = new Error('Validation failed: invalid input');
    const result = classifyAIError(error);
    expect(result.category).toBe('validation_error');
    expect(result.shouldCountAgainstLimit).toBe(true);
  });
});
```

### 2. Exercise Name Resolution
**Location:** `src/lib/exercise-normalization.ts`, `src/lib/strength-standards.ts`

**What should be tested:**
- Resolution of exercise names to canonical forms
- Handling of machine vs. non-machine exercises (should NOT be aliased)
- Legacy name mapping
- Case-insensitive lookups
- Prefix stripping (EGYM, Machine)

**Test approach:**
```typescript
describe('resolveCanonicalExerciseName', () => {
  it('resolves normalized names to canonical form', () => {
    const exercises = [
      { normalizedName: 'bench_press', name: 'Bench Press', legacyNames: ['barbell bench'] }
    ];
    const result = resolveCanonicalExerciseName('bench press', exercises);
    expect(result).toBe('Bench Press');
  });

  it('keeps machine and non-machine exercises separate', () => {
    const exercises = [
      { normalizedName: 'bicep_curl', name: 'Bicep Curl' },
      { normalizedName: 'machine_bicep_curl', name: 'Machine Bicep Curl' }
    ];
    const result1 = resolveCanonicalExerciseName('bicep curl', exercises);
    const result2 = resolveCanonicalExerciseName('machine bicep curl', exercises);
    expect(result1).not.toBe(result2);
  });
});
```

### 3. Lift Progression Calculations
**Location:** `src/hooks/useLiftProgression.ts`

**What should be tested:**
- E1RM calculation (Epley formula)
- Volume calculation
- Trendline calculation
- Date filtering (6-week window)
- PR detection and marking

**Test approach:**
```typescript
describe('calculateE1RM', () => {
  it('calculates e1RM using Epley formula', () => {
    // For 1 rep: e1RM = weight
    expect(calculateE1RM(100, 1)).toBe(100);

    // For 10 reps: weight * (1 + reps/30)
    expect(calculateE1RM(100, 10)).toBeCloseTo(100 * (1 + 10/30));
  });
});

describe('useLiftProgression', () => {
  it('filters workout logs from last 6 weeks', () => {
    // Mock data older than 6 weeks should be excluded
    // Mock data within 6 weeks should be included
  });

  it('generates trendline from chart data', () => {
    // With 2+ data points, trendline should be calculated
    // With <2 points, trendline should be null
  });
});
```

### 4. Validation (Zod Schemas)
**Location:** `src/app/api/client-errors/route.ts`, `src/components/prs/ManualPrForm.tsx`

**What should be tested:**
- ClientErrorSchema validation
- ManualPrForm schema validation
- Error messages for invalid inputs
- Type inference from schemas

**Test approach:**
```typescript
describe('ClientErrorSchema', () => {
  it('validates correct client error payload', () => {
    const valid = {
      message: 'An error occurred',
      error: 'Error object',
      url: 'https://example.com',
      timestamp: '2026-02-05T10:00:00Z'
    };
    const result = ClientErrorSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects message > 500 chars', () => {
    const invalid = {
      message: 'x'.repeat(501),
      error: 'Error'
    };
    const result = ClientErrorSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].code).toBe('too_big');
  });

  it('rejects invalid URL', () => {
    const invalid = {
      message: 'Error',
      error: 'Error object',
      url: 'not-a-url'
    };
    const result = ClientErrorSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
```

### 5. Server Action Logging
**Location:** `src/lib/logging/server-action-wrapper.ts`

**What should be tested:**
- Execution time logging
- Success/failure detection
- Trace header extraction
- Error propagation

**Test approach:**
```typescript
describe('withServerActionLogging', () => {
  it('logs successful execution with duration', async () => {
    const mockLogger = jest.spyOn(logger, 'info');
    const context = createRequestContext({
      userId: 'test-user',
      route: 'test/action',
      feature: 'test'
    });

    await withServerActionLogging(context, async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true };
    });

    expect(mockLogger).toHaveBeenCalledWith(
      'Server action completed',
      expect.objectContaining({
        success: true,
        duration: expect.any(Number)
      })
    );
  });

  it('logs errors without re-throwing', async () => {
    const mockLogger = jest.spyOn(logger, 'error');
    const context = createRequestContext({
      userId: 'test-user',
      route: 'test/action',
      feature: 'test'
    });

    const testError = new Error('Test error');
    await expect(
      withServerActionLogging(context, async () => {
        throw testError;
      })
    ).rejects.toThrow('Test error');

    expect(mockLogger).toHaveBeenCalledWith(
      'Server action failed',
      expect.objectContaining({
        error: 'Error: Test error'
      })
    );
  });
});
```

### 6. Rate Limiting
**Location:** `src/app/api/client-errors/route.ts`, `src/app/prs/rate-limiting.ts`

**What should be tested:**
- In-memory rate limiter (fallback)
- Upstash Redis rate limiter
- Request counting per IP
- Rate limit reset
- Cleanup of old entries

**Test approach:**
```typescript
describe('In-memory rate limiter', () => {
  it('allows requests under limit', async () => {
    const result = await checkRateLimit('192.168.1.1');
    expect(result.allowed).toBe(true);
  });

  it('blocks requests over limit', async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      await checkRateLimit('192.168.1.1');
    }
    const result = await checkRateLimit('192.168.1.1');
    expect(result.allowed).toBe(false);
  });

  it('provides retryAfter timestamp when over limit', async () => {
    // Hit the limit
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      await checkRateLimit('192.168.1.1');
    }
    const result = await checkRateLimit('192.168.1.1');
    expect(result.retryAfter).toBeGreaterThan(Date.now());
  });
});
```

### 7. React Components with Error Boundaries
**Location:** `src/components/error/ErrorBoundary.tsx`, `src/components/analysis/CardErrorFallback.tsx`

**What should be tested:**
- Error catching and fallback UI rendering
- Error reporting to server
- Reset functionality
- Development-only error details

**Test approach:**
```typescript
describe('ErrorBoundary', () => {
  it('renders children when there are no errors', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(getByText('Test content')).toBeInTheDocument();
  });

  it('renders fallback UI when error is caught', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalled();
  });

  it('resets error state on button click', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) throw new Error('Test error');
      return <div>Success</div>;
    };

    const { rerender, getByText, queryByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(getByText('Something went wrong')).toBeInTheDocument();

    fireEvent.click(getByText('Try Again'));
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});
```

### 8. Form Validation
**Location:** `src/components/prs/ManualPrForm.tsx`

**What should be tested:**
- Zod schema parsing with `zodResolver`
- Form field validation before submit
- Error message display
- Exercise dropdown filtering

**Test approach:**
```typescript
describe('ManualPrForm', () => {
  it('validates exercise name is required', async () => {
    const mockOnAdd = jest.fn();
    const { getByRole, getByText } = render(
      <ManualPrForm onAdd={mockOnAdd} />
    );

    const submitButton = getByRole('button', { name: /add/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(getByText('Please select an exercise.')).toBeInTheDocument();
    });
  });

  it('validates weight > 0', async () => {
    const mockOnAdd = jest.fn();
    const { getByRole, getByText } = render(
      <ManualPrForm onAdd={mockOnAdd} />
    );

    // Set weight to 0 and submit
    const submitButton = getByRole('button', { name: /add/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(getByText('Weight must be greater than 0.')).toBeInTheDocument();
    });
  });
});
```

## Test Organization Pattern

If tests are implemented, use this structure:

**Location Pattern:**
```
src/
  components/
    prs/
      ManualPrForm.tsx
      ManualPrForm.test.tsx
    error/
      ErrorBoundary.tsx
      ErrorBoundary.test.tsx
  hooks/
    useLiftProgression.ts
    useLiftProgression.test.ts
  lib/
    logging/
      error-classifier.ts
      error-classifier.test.ts
```

Or alternatively, centralized:
```
src/__tests__/
  lib/
    error-classifier.test.ts
    exercise-normalization.test.ts
  hooks/
    useLiftProgression.test.ts
  components/
    ErrorBoundary.test.tsx
```

## Testing Tools (If Implemented)

**Recommended:**
- **Jest** or **Vitest** - Test runner with assertion library
- **React Testing Library** - For component testing
- **@testing-library/jest-dom** - DOM matchers
- **ts-jest** or **vitest/preset/typescript** - TypeScript support
- **Mock Service Worker (MSW)** - For mocking API calls

## Coverage Priorities

**High Priority (if implementing tests):**
1. Error classification and logging (`src/lib/logging/`)
2. Exercise name resolution (`src/lib/exercise-normalization.ts`)
3. Validation schemas (Zod in API routes and forms)
4. Rate limiting logic
5. Server action error handling

**Medium Priority:**
6. Lift progression calculations
7. React components (especially error boundaries)
8. Form validation and submission

**Lower Priority:**
9. UI component styling/rendering (hard to test meaningfully)
10. Data fetching/caching (often integration tested)

## Current Testing Gaps

**Note:** No tests are currently in place. The following areas lack coverage:

- **Error classification**: No tests for 5 error categories
- **Exercise resolution**: No validation that machine/non-machine exercises stay separate
- **Server actions**: No tests for `parsePersonalRecordsAction`, `getPersonalRecords`, etc.
- **Hooks**: No tests for `useLiftProgression`, `useStrengthFindings`, `useLiftTrends`
- **Components**: No tests for `LiftProgressionCard`, `ErrorBoundary`, `CardErrorFallback`
- **API endpoints**: No tests for `/api/client-errors`, `/api/health`
- **Rate limiting**: No tests for quota enforcement

---

*Testing analysis: 2026-02-05*
