
"use client";

import React from 'react';

// This component performed a one-time migration and is no longer needed.
// It can be safely deleted from your project.
export function MigrationProvider({ children }: { children: React.ReactNode }) {
  // Renders children directly as migration is complete.
  return <>{children}</>;
}
