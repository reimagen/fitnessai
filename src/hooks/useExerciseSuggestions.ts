import { useMemo } from 'react';
import type { WorkoutLog } from '@/lib/types';
import { getNormalizedExerciseName, classifiedExercises } from '@/lib/strength-standards';

/**
 * Hook that generates exercise suggestions from workout history and classified exercises
 * @param workoutLogs - Array of workout logs to extract exercise history from
 * @returns Array of unique, sorted exercise names for autocomplete
 */
export function useExerciseSuggestions(workoutLogs: WorkoutLog[]): string[] {
  return useMemo(() => {
    // Track unique normalized exercise names with their original display names
    const uniqueExercises = new Map<string, string>();

    // Extract exercises from workout logs
    workoutLogs.forEach((log) => {
      log.exercises.forEach((exercise) => {
        const normalized = getNormalizedExerciseName(exercise.name);
        // Store the original name for display, keyed by normalized name
        if (!uniqueExercises.has(normalized)) {
          uniqueExercises.set(normalized, exercise.name);
        }
      });
    });

    // Add classified exercises (combine with history)
    classifiedExercises.forEach((exercise) => {
      if (!uniqueExercises.has(exercise.toLowerCase())) {
        uniqueExercises.set(exercise.toLowerCase(), exercise);
      }
    });

    // Get unique display names and sort alphabetically
    const suggestions = Array.from(uniqueExercises.values());
    suggestions.sort((a, b) => a.localeCompare(b));

    return suggestions;
  }, [workoutLogs]);
}
