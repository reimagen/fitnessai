'use client';

import React, { ReactNode } from 'react';
import { reportError } from '@/lib/logging/error-reporter';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  feature?: string;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Generic React error boundary component
 *
 * Catches errors in child components, logs them to the server, and displays
 * a fallback UI. Provides a reset button to allow users to recover without
 * a full page reload.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary feature="myFeature" fallback={({ error, reset }) => (...)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Report error to server for Cloud Logging
    reportError(error, {
      feature: this.props.feature,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    }).catch(() => {
      // Silently fail if logging fails
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      return (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#f5f5f5',
            margin: '20px',
          }}
        >
          <h2 style={{ color: '#d32f2f', marginTop: 0 }}>Something went wrong</h2>
          <p style={{ color: '#666' }}>
            An unexpected error occurred. Please try again.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details
              style={{
                marginTop: '16px',
                textAlign: 'left',
                backgroundColor: '#fff',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#333',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{ overflow: 'auto', marginTop: '8px' }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
