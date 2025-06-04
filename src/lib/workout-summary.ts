
import type { WorkoutLog, AggregatedWorkoutDaySummary, Exercise } from "./types";
import { format, parseISO } from 'date-fns';

/**
 * Generates an array of aggregated workout summaries, one for each day that has workout logs.
 * @param logs An array of WorkoutLog objects.
 * @returns An array of AggregatedWorkoutDaySummary objects.
 */
export function generateWorkoutSummaries(logs: WorkoutLog[]): AggregatedWorkoutDaySummary[] {
  const summariesMap: Map<string, AggregatedWorkoutDaySummary> = new Map();

  for (const log of logs) {
    // Ensure log.date is a Date object
    const logDateObject = typeof log.date === 'string' ? parseISO(log.date) : log.date;
    if (!(logDateObject instanceof Date) || isNaN(logDateObject.getTime())) {
        console.warn("Invalid date found in log, skipping:", log);
        continue; 
    }
    const dateKey = format(logDateObject, "yyyy-MM-dd");

    let summary = summariesMap.get(dateKey);

    if (!summary) {
      summary = {
        date: logDateObject,
        totalExercises: 0,
        totalSets: 0,
        totalReps: 0,
        totalDurationMinutes: 0,
        totalCaloriesBurned: 0,
        categories: {},
      };
      summariesMap.set(dateKey, summary);
    }

    for (const exercise of log.exercises) {
      summary.totalExercises += 1;
      summary.totalSets += exercise.sets || 0;
      summary.totalReps += exercise.reps || 0;
      
      let durationInMinutes = 0;
      if (exercise.duration && exercise.durationUnit) {
        if (exercise.durationUnit === 'hr') {
          durationInMinutes = exercise.duration * 60;
        } else if (exercise.durationUnit === 'sec') {
          durationInMinutes = exercise.duration / 60;
        } else { // 'min'
          durationInMinutes = exercise.duration;
        }
      }
      summary.totalDurationMinutes += durationInMinutes;
      summary.totalCaloriesBurned += exercise.calories || 0;

      if (exercise.category) {
        summary.categories[exercise.category] = (summary.categories[exercise.category] || 0) + 1;
      }
    }
  }

  return Array.from(summariesMap.values()).sort((a,b) => b.date.getTime() - a.date.getTime());
}
