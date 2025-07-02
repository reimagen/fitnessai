
"use client";

import React, { useState, useEffect } from 'react';
import { migrateFromLocalStorageToFirestore } from '@/lib/firestore.service';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const MIGRATION_FLAG_KEY = "isMigratedToFirestore";

export function MigrationProvider({ children }: { children: React.ReactNode }) {
  const [isMigrating, setIsMigrating] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const runMigration = async () => {
      const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY);
      
      // Check for old keys to see if migration is needed
      const needsMigration = localStorage.getItem("fitnessAppWorkoutLogs") || 
                             localStorage.getItem("fitnessAppPersonalRecords") ||
                             localStorage.getItem("fitnessAppUserProfile");

      if (!isMigrated && needsMigration) {
        console.log("Starting data migration from localStorage to Firestore...");
        const result = await migrateFromLocalStorageToFirestore();
        if (result.success) {
          localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
          console.log("Migration successful. Invalidating queries to fetch fresh data.");
          // Invalidate all queries to refetch from Firestore
          await queryClient.invalidateQueries();
        } else {
          console.error("Migration failed:", result.error);
          // Handle migration failure, maybe show a toast to the user
        }
      } else {
        console.log("No migration needed.");
      }
      setIsMigrating(false);
    };

    runMigration();
  }, [queryClient]);

  if (isMigrating) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Syncing your data...</p>
        </div>
      </div>
    );
  }

  return children;
}
