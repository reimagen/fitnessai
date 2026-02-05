'use client';

import { useCallback } from 'react';
import { classifyAIError } from '@/lib/logging/error-classifier';
import type { ClassifiedError } from '@/lib/logging/error-classifier';
import { reportErrorWithContext } from '@/lib/logging/error-reporter';

/**
 * Hook for client-side error handling with classification and logging
 *
 * Provides utilities to:
 * - Capture and log errors with feature context
 * - Classify AI errors for consistent handling
 * - Generate user-friendly error messages
 *
 * Usage:
 * ```tsx
 * const { captureError, handleAIError, classifyError } = useErrorHandler('myFeature');
 *
 * try {
 *   await myAction();
 * } catch (error) {
 *   captureError(error as Error);
 *   const userMessage = handleAIError(error);
 * }
 * ```
 */
export function useErrorHandler(feature: string) {
  /**
   * Captures and logs an error with feature context
   */
  const captureError = useCallback(
    async (error: Error, metadata?: Record<string, unknown>) => {
      try {
        await reportErrorWithContext(error, feature, metadata);
      } catch (err) {
        // Silently fail - don't create error loops
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to capture error:', err);
        }
      }
    },
    [feature]
  );

  /**
   * Classifies an error and returns the classification
   */
  const classifyError = useCallback((error: unknown): ClassifiedError => {
    return classifyAIError(error);
  }, []);

  /**
   * Handles an AI error with automatic classification and logging
   *
   * Returns a user-friendly message suitable for display in the UI
   */
  const handleAIError = useCallback(
    async (
      error: unknown,
      metadata?: Record<string, unknown>
    ): Promise<string> => {
      const classified = classifyAIError(error);

      // Log the error
      try {
        await reportErrorWithContext(
          error instanceof Error ? error : new Error(String(error)),
          feature,
          {
            ...metadata,
            errorCategory: classified.category,
            statusCode: classified.statusCode,
          }
        );
      } catch (err) {
        // Silently fail
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log error:', err);
        }
      }

      return classified.userMessage;
    },
    [feature]
  );

  /**
   * Checks if an error should be retried
   */
  const shouldRetry = useCallback((error: unknown): boolean => {
    const classified = classifyAIError(error);
    return classified.shouldRetry;
  }, []);

  /**
   * Checks if an error counts against usage limits
   */
  const shouldCountAgainstLimit = useCallback((error: unknown): boolean => {
    const classified = classifyAIError(error);
    return classified.shouldCountAgainstLimit;
  }, []);

  return {
    captureError,
    classifyError,
    handleAIError,
    shouldRetry,
    shouldCountAgainstLimit,
  };
}
