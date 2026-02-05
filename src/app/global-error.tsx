'use client';

import React from 'react';
import { reportError } from '@/lib/logging/error-reporter';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js global error boundary
 *
 * Catches errors in the root layout that would otherwise crash the entire app.
 * This is a special error boundary that must include <html> and <body> tags.
 *
 * IMPORTANT: This file should only be created if you have a root error.tsx file.
 * If you don't need a global error boundary, you can delete this file.
 */
export default function GlobalError({ error, reset }: Props) {
  React.useEffect(() => {
    // Log the error to the server for monitoring
    reportError(error, { feature: 'global-error' });
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: '#f5f5f5',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              width: '100%',
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#d32f2f',
                marginBottom: '16px',
                marginTop: 0,
              }}
            >
              Critical Error
            </h1>

            <p
              style={{
                fontSize: '16px',
                color: '#666',
                marginBottom: '24px',
                lineHeight: '1.6',
              }}
            >
              A critical error has occurred. The application needs to be
              restarted. Our team has been notified and is working on a fix.
            </p>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && (
              <details
                style={{
                  marginBottom: '24px',
                  textAlign: 'left',
                  backgroundColor: '#f5f5f5',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    color: '#333',
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    overflow: 'auto',
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#333',
                    backgroundColor: '#fff',
                    padding: '12px',
                    borderRadius: '4px',
                    maxHeight: '300px',
                  }}
                >
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}

            {/* Action button */}
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
              }}
            >
              Restart Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
