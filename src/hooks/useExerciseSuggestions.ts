import { useMemo } from 'react';
import type { WorkoutLog } from '@/lib/types';
import { getNormalizedExerciseName } from '@/lib/strength-standards';

/**
 * Hook that generates exercise suggestions from workout history and classified exercises
 * @param workoutLogs - Array of workout logs to extract exercise history from
 * @returns Array of unique, sorted exercise names for autocomplete
 */
export function useExerciseSuggestions(
  workoutLogs: WorkoutLog[],
  classifiedExercises: string[],
  aliasMap: Record<string, string>,
  canonicalNameById: Record<string, string>,
  canonicalNameByNormalized: Record<string, string>
): string[] {
  return useMemo(() => {
    // Track unique exercise display names to avoid duplicates across variants
    const uniqueExercises = new Map<string, string>();

    // Extract exercises from workout logs
    workoutLogs.forEach((log) => {
      log.exercises.forEach((exercise) => {
        const normalized = getNormalizedExerciseName(exercise.name);
        const canonicalId = aliasMap[normalized];
        const canonicalName =
          (canonicalId ? canonicalNameById[canonicalId] : null) ||
          canonicalNameByNormalized[normalized];
        const displayName = canonicalName || exercise.name;
        const displayKey = displayName.toLowerCase();
        if (!uniqueExercises.has(displayKey)) {
          uniqueExercises.set(displayKey, displayName);
        }
      });
    });

    // Add classified exercises (combine with history)
    classifiedExercises.forEach((exercise) => {
      const displayKey = exercise.toLowerCase();
      if (!uniqueExercises.has(displayKey)) {
        uniqueExercises.set(displayKey, exercise);
      }
    });

    // Get unique display names and sort alphabetically
    const suggestions = Array.from(uniqueExercises.values());
    suggestions.sort((a, b) => a.localeCompare(b));

    return suggestions;
  }, [workoutLogs, classifiedExercises, aliasMap, canonicalNameById, canonicalNameByNormalized]);
}
