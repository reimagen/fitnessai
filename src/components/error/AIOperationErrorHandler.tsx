'use client';

import React from 'react';
import { classifyAIError } from '@/lib/logging/error-classifier';
import type { ClassifiedError } from '@/lib/logging/error-classifier';
import { reportError } from '@/lib/logging/error-reporter';

interface AIOperationErrorHandlerProps {
  error: unknown;
  operation: string;
  onRetry?: () => void | Promise<void>;
  showDetails?: boolean;
  isDevelopment?: boolean;
}

/**
 * AI-specific error display component
 *
 * Handles errors from AI operations with:
 * - Error classification (quota, overload, validation, auth, unknown)
 * - User-friendly error messages
 * - Retry button for retryable errors
 * - Operation-specific guidance
 *
 * Usage:
 * ```tsx
 * <AIOperationErrorHandler
 *   error={error}
 *   operation="planGeneration"
 *   onRetry={handleRetry}
 *   isDevelopment={process.env.NODE_ENV === 'development'}
 * />
 * ```
 */
export function AIOperationErrorHandler({
  error,
  operation,
  onRetry,
  showDetails = false,
  isDevelopment = false,
}: AIOperationErrorHandlerProps): React.ReactNode {
  const classified = classifyAIError(error);

  // Log to server
  React.useEffect(() => {
    reportError(
      error instanceof Error ? error : new Error(String(error)),
      {
        feature: operation,
        metadata: {
          errorCategory: classified.category,
          statusCode: classified.statusCode,
        },
      }
    ).catch(() => {
      // Silently fail if logging fails
    });
  }, [error, operation, classified]);

  const isRetryable =
    classified.category === 'quota_exceeded' ||
    classified.category === 'model_overloaded';

  const handleRetryClick = async (): Promise<void> => {
    if (onRetry) {
      try {
        await onRetry();
      } catch (err) {
        // Retry handler will manage its own error state
        console.error('Retry failed:', err);
      }
    }
  };

  const getOperationLabel = (): string => {
    const labels: Record<string, string> = {
      planGeneration: 'Plan Generation',
      prParsing: 'PR Parsing',
      liftProgressionAnalysis: 'Lift Progression Analysis',
      strengthAnalysis: 'Strength Analysis',
      goalAnalysis: 'Goal Analysis',
    };
    return labels[operation] || operation;
  };

  const getErrorGuidance = (): string => {
    switch (classified.category) {
      case 'quota_exceeded':
        return 'Our AI service has reached its usage limit. Please try again in a few moments.';
      case 'model_overloaded':
        return 'The AI service is currently overloaded. Please try again shortly.';
      case 'validation_error':
        return 'The input was invalid. Please check your data and try again.';
      case 'auth_error':
        return 'Authentication failed. Please sign in and try again.';
      case 'unknown_error':
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
      default:
        return classified.userMessage;
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid #f57c00',
        borderRadius: '8px',
        backgroundColor: '#fff3e0',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '20px', marginTop: '2px' }}>⚠️</div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#e65100',
            }}
          >
            {getOperationLabel()} Failed
          </h3>
          <p
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              color: '#333',
              lineHeight: '1.5',
            }}
          >
            {getErrorGuidance()}
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {isRetryable && onRetry && (
              <button
                onClick={handleRetryClick}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f57c00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Try Again
              </button>
            )}
            {isDevelopment && (
              <button
                onClick={() => {
                  const errorStr = error instanceof Error ? error.stack : String(error);
                  navigator.clipboard.writeText(errorStr);
                  alert('Error copied to clipboard');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Copy Error
              </button>
            )}
          </div>

          {/* Development error details */}
          {isDevelopment && (showDetails || classified.category === 'unknown_error') && (
            <details
              style={{
                marginTop: '12px',
                fontSize: '12px',
                backgroundColor: '#fff',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details
              </summary>
              <pre
                style={{
                  margin: '8px 0 0 0',
                  overflow: 'auto',
                  fontSize: '11px',
                  color: '#333',
                }}
              >
                Category: {classified.category}
                {'\n'}
                Status Code: {classified.statusCode}
                {'\n\n'}
                {error instanceof Error ? error.stack : String(error)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
