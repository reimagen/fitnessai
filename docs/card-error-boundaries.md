# Card-Level Error Boundaries

## Overview

Added granular error boundaries to prevent single card failures from affecting the entire analysis page. This improves resilience by isolating errors to specific components.

## Implementation Details

### What Was Added

1. **CardErrorFallback Component** (`src/components/analysis/CardErrorFallback.tsx`)
   - Reusable fallback UI for card-level errors
   - Displays friendly error message with retry button
   - Shows error details in development mode for debugging
   - Matches the card styling for consistent UX

2. **Error Boundaries Wrapping High-Risk Cards**
   - `LiftProgressionCard` - Complex data fetching + AI analysis
   - `StrengthBalanceCard` - Complex calculations + AI analysis
   - `CardioAnalysisCard` - Data transformation and formatting

### Architecture

```
AnalysisPage (ErrorBoundary - page level)
├── LiftProgressionCard (ErrorBoundary - card level)
│   ├── LiftProgressionChart
│   └── LiftProgressionInsights
├── StrengthBalanceCard (ErrorBoundary - card level)
│   └── StrengthBalanceFindingCard
└── CardioAnalysisCard (ErrorBoundary - card level)
```

**Benefit**: If one card crashes (e.g., AI call fails, chart rendering breaks), only that card shows the error. Other cards continue to render normally.

### Error Reporting

Card-level errors are still reported to Cloud Logging via `ErrorBoundary.componentDidCatch()`:
- Feature tag identifies which card failed (e.g., `liftProgressionCard`)
- Component stack is included in metadata
- All error classification and PII redaction applies

### User Experience

When a card error occurs:
1. Card displays error message with "Try Again" button
2. User can retry without page reload
3. Other cards remain fully functional
4. Error is logged to Cloud Logging for monitoring

**Before**: One card error → entire analysis page becomes unusable
**After**: One card error → user can still see other cards while error is isolated

### Testing

To test card-level error handling in development:
1. Open browser DevTools → Network tab
2. Block requests to trigger specific card failures:
   - Block `/api/stream` calls to break AI analysis cards
   - Block data fetch endpoints to break chart rendering
3. Verify card shows error UI while other cards render normally
4. Click "Try Again" to retry

Alternative: Manually throw errors in card components during development by adding:
```typescript
if (Math.random() < 0.5) {
  throw new Error('Simulated card error for testing');
}
```

## Error Categories Caught

Card-level boundaries catch:
- **Render errors**: Props type mismatches, null reference errors in JSX
- **Hook errors**: useLiftProgression, useStrengthFindings failures
- **Data transformation errors**: Chart data processing, analysis calculations
- **AI operation errors**: API failures, classification errors

They do **not** catch:
- Event handler errors (onClick, onChange)
- Asynchronous errors in effects (those need try/catch)
- Server-side errors (handled by parent ErrorBoundary)

## Monitoring

In Cloud Logging, search for card-level errors:
```
resource.type="cloud_run_service"
labels.feature="liftProgressionCard" OR labels.feature="strengthBalanceCard" OR labels.feature="cardioAnalysisCard"
```

Each error includes:
- Component stack (which component failed)
- Feature identifier (which card)
- Error message and stack trace
- User ID (for tracing)
- Request ID (for correlation)

## Next Steps

**Optional enhancements** (not included):
- Add error recovery strategies per card type
- Cache last successful card state to show while retrying
- Add error frequency tracking to alert ops team
- Card-level analytics for error rates by component
