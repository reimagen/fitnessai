'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface CardErrorFallbackProps {
  cardName: string;
  error?: Error;
  onReset: () => void;
}

/**
 * Fallback UI for card-level errors
 *
 * Displays a friendly error message with retry button when a card fails
 * to render or encounters an error during data fetching.
 */
export const CardErrorFallback: React.FC<CardErrorFallbackProps> = ({
  cardName,
  error,
  onReset,
}) => {
  return (
    <Card className="shadow-lg lg:col-span-3 bg-destructive/5 border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {cardName} Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We encountered an error while loading this card. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 bg-muted p-2 rounded overflow-auto max-h-48 text-xs">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
        <Button
          onClick={onReset}
          size="sm"
          variant="outline"
          className="w-full"
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
};
