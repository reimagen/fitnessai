import { useMemo } from 'react';
import type { ExerciseDocument } from '@/lib/exercise-types';
import type { WorkoutLog } from '@/lib/types';
import {
  buildSixWeekLiftMetrics,
  type SixWeekLiftMetricsMap,
} from '@/analysis/six-week-lift-metrics';

export function useSixWeekLiftMetrics(
  workoutLogs: WorkoutLog[] | undefined,
  exercises: ExerciseDocument[] = []
): SixWeekLiftMetricsMap {
  return useMemo(() => buildSixWeekLiftMetrics(workoutLogs, exercises), [workoutLogs, exercises]);
}
