import { format, isAfter } from 'date-fns';
import type { ExerciseDocument } from '@/lib/exercise-types';
import type { WorkoutLog } from '@/lib/types';
import { resolveCanonicalExerciseName } from '@/lib/exercise-normalization';
import { getNormalizedExerciseName } from '@/lib/strength-standards';
import { getSixWeeksAgo } from '@/lib/date-range-utils';

export type LiftDayMetric = {
  date: Date;
  e1RM: number; // lbs for chart compatibility
  volume: number; // lbs for chart compatibility
};

export type LiftMetricSummary = {
  avgE1RM: number | null;
  avgE1RMUnit: 'kg' | 'lbs' | null;
  sessionCount: number;
  dayMetrics: LiftDayMetric[];
};

export type SixWeekLiftMetricsMap = Record<string, LiftMetricSummary>;

type MutableLiftMetric = {
  dayMetrics: Map<string, LiftDayMetric>;
  e1RMSumKg: number;
  e1RMCount: number;
  unitCounts: { kg: number; lbs: number };
};

const calculateE1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (reps === 0) return 0;
  return weight * (1 + reps / 30);
};

export function buildSixWeekLiftMetrics(
  workoutLogs: WorkoutLog[] | undefined,
  exercises: ExerciseDocument[] = []
): SixWeekLiftMetricsMap {
  if (!workoutLogs || workoutLogs.length === 0) {
    return {};
  }

  const sixWeeksAgo = getSixWeeksAgo();
  const metrics = new Map<string, MutableLiftMetric>();

  for (const log of workoutLogs) {
    if (!log.date || !isAfter(log.date, sixWeeksAgo)) continue;

    for (const ex of log.exercises) {
      const resolvedExerciseName = resolveCanonicalExerciseName(ex.name, exercises);
      const normalizedExerciseName = getNormalizedExerciseName(resolvedExerciseName);

      const existing = metrics.get(normalizedExerciseName) ?? {
        dayMetrics: new Map<string, LiftDayMetric>(),
        e1RMSumKg: 0,
        e1RMCount: 0,
        unitCounts: { kg: 0, lbs: 0 },
      };

      if (ex.weight && ex.reps && ex.weight > 0 && ex.reps > 0) {
        const unit = ex.weightUnit === 'kg' ? 'kg' : 'lbs';
        const weightKg = unit === 'lbs' ? ex.weight * 0.453592 : ex.weight;
        const e1RMKg = calculateE1RM(weightKg, ex.reps);
        existing.e1RMSumKg += e1RMKg;
        existing.e1RMCount += 1;
        existing.unitCounts[unit] += 1;

        if (ex.sets && ex.sets > 0) {
          const dateKey = format(log.date, 'yyyy-MM-dd');
          const weightLbs = unit === 'kg' ? ex.weight * 2.20462 : ex.weight;
          const e1RMLbs = calculateE1RM(weightLbs, ex.reps);
          const volumeLbs = weightLbs * ex.sets * ex.reps;
          const existingDay = existing.dayMetrics.get(dateKey);

          if (existingDay) {
            existingDay.volume += volumeLbs;
            if (e1RMLbs > existingDay.e1RM) {
              existingDay.e1RM = e1RMLbs;
            }
          } else {
            existing.dayMetrics.set(dateKey, {
              date: log.date,
              e1RM: e1RMLbs,
              volume: volumeLbs,
            });
          }
        }
      }

      metrics.set(normalizedExerciseName, existing);
    }
  }

  const output: SixWeekLiftMetricsMap = {};
  for (const [liftKey, value] of metrics.entries()) {
    if (value.e1RMCount === 0) {
      output[liftKey] = {
        avgE1RM: null,
        avgE1RMUnit: null,
        sessionCount: 0,
        dayMetrics: Array.from(value.dayMetrics.values()).sort(
          (a, b) => a.date.getTime() - b.date.getTime()
        ),
      };
      continue;
    }

    const avgE1RMKg = value.e1RMSumKg / value.e1RMCount;
    const avgE1RMUnit = value.unitCounts.kg > value.unitCounts.lbs ? 'kg' : 'lbs';
    const avgE1RM =
      avgE1RMUnit === 'lbs'
        ? avgE1RMKg * 2.20462
        : avgE1RMKg;

    output[liftKey] = {
      avgE1RM: Math.round(avgE1RM),
      avgE1RMUnit,
      sessionCount: value.e1RMCount,
      dayMetrics: Array.from(value.dayMetrics.values()).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      ),
    };
  }

  return output;
}
