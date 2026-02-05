/**
 * Client-side error reporting
 *
 * Non-blocking mechanism to report errors from client components to the server.
 * Errors are POSTed to /api/client-errors for centralized logging in Cloud Logging.
 *
 * Safe for use in:
 * - Client components ('use client')
 * - Error boundaries
 * - Event handlers
 *
 * Will NOT block UI or throw if logging fails.
 */

import type { ClientError } from './types';

/**
 * Reports an error from client-side code to the server
 *
 * - Non-blocking (fire-and-forget)
 * - Fails silently if logging service is unavailable
 * - Rate-limited by server (10 errors per minute per IP)
 * - Redacted on server before Cloud Logging
 *
 * @param error - The Error object to report
 * @param context - Optional context about where/why the error occurred
 */
export async function reportError(
  error: Error,
  context?: { feature?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  try {
    // Don't block on this - fire and forget
    const clientError: ClientError = {
      message: error.message,
      error: String(error),
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      feature: context?.feature,
      timestamp: new Date().toISOString(),
    };

    // POST to server endpoint
    // Don't await - let it finish in background
    fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientError),
      // Note: No await - intentionally non-blocking
    }).catch(err => {
      // Fail silently to avoid error loops
      // Only log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[Error Reporter] Failed to report error:', err);
      }
    });
  } catch (err) {
    // Even the reporting failed - fail silently
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Reporter] Error while preparing report:', err);
    }
  }
}

/**
 * Reports multiple errors in a batch
 *
 * Useful when multiple errors occur in quick succession.
 * Each error is sent separately to respect rate limiting.
 *
 * @param errors - Array of errors to report
 * @param context - Optional context for all errors
 */
export async function reportErrors(
  errors: Error[],
  context?: { feature?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  // Send each error individually (respects rate limiting)
  // Space them out slightly to avoid overwhelming the server
  for (let i = 0; i < errors.length; i++) {
    // Non-blocking send with small delay between reports
    setTimeout(() => {
      reportError(errors[i], context);
    }, i * 100); // 100ms between reports
  }
}

/**
 * Reports an error with additional context/metadata
 *
 * @param error - The Error object
 * @param feature - Feature name for categorization
 * @param metadata - Additional structured metadata
 */
export function reportErrorWithContext(
  error: Error,
  feature: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return reportError(error, { feature, metadata });
}
