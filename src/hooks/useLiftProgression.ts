import { useMemo } from 'react';
import type { WorkoutLog, PersonalRecord } from '@/lib/types';
import type { ExerciseDocument } from '@/lib/exercise-types';
import { getNormalizedExerciseName } from '@/lib/strength-standards';
import { format, subWeeks, isAfter } from 'date-fns';

interface LiftHistoryEntry {
  date: Date;
  e1RM: number;
  volume: number;
  actualPR?: number;
  isActualPR?: boolean;
}

interface ProgressionChartDataPoint {
  name: string;
  e1RM: number;
  volume: number;
  actualPR?: number;
  isActualPR: boolean;
}

interface TrendlineData {
  start: { x: string; y: number };
  end: { x: string; y: number };
}

interface ProgressionChartResult {
  chartData: ProgressionChartDataPoint[];
  trendlineData: TrendlineData | null;
}

const calculateE1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (reps === 0) return 0;
  return weight * (1 + reps / 30);
};

/**
 * Normalizes exercise name for lookup (removes EGYM/Machine prefix and extra characters)
 */
const normalizeForLookup = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/^(egym|machine)\s+/, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');

/**
 * Resolves exercise name to its canonical name using the exercise library
 */
const resolveCanonicalName = (exerciseName: string, exerciseLibrary: ExerciseDocument[]): string => {
  const normalized = normalizeForLookup(exerciseName);
  const exercise = exerciseLibrary.find(e => {
    if (e.normalizedName.toLowerCase() === normalized) return true;
    if (e.legacyNames?.some(ln => normalizeForLookup(ln) === normalized)) return true;
    return false;
  });
  return exercise?.normalizedName || exerciseName;
};

export function useLiftProgression(
  selectedLift: string,
  selectedLiftKey: string,
  workoutLogs: WorkoutLog[] | undefined,
  personalRecords: PersonalRecord[] | undefined,
  exercises: ExerciseDocument[] = []
): ProgressionChartResult {
  return useMemo(() => {
    if (!selectedLift || !workoutLogs) {
      return { chartData: [], trendlineData: null };
    }

    const sixWeeksAgo = subWeeks(new Date(), 6);
    const liftHistory = new Map<string, LiftHistoryEntry>();

    workoutLogs.forEach((log: WorkoutLog) => {
      if (!isAfter(log.date, sixWeeksAgo)) return;

      log.exercises.forEach((ex) => {
        // Resolve exercise name to canonical form to match selectedLiftKey
        const resolvedExerciseName = resolveCanonicalName(ex.name, exercises);
        const normalizedExerciseName = getNormalizedExerciseName(resolvedExerciseName);

        if (normalizedExerciseName === selectedLiftKey && ex.weight && ex.reps && ex.sets) {
          const dateKey = format(log.date, 'yyyy-MM-dd');
          const weightInLbs = ex.weightUnit === 'kg' ? ex.weight * 2.20462 : ex.weight;
          const currentE1RM = calculateE1RM(weightInLbs, ex.reps);
          const currentVolume = weightInLbs * ex.sets * ex.reps;

          const existingEntry = liftHistory.get(dateKey);
          if (existingEntry) {
            existingEntry.volume += currentVolume;
            if (currentE1RM > existingEntry.e1RM) {
              existingEntry.e1RM = currentE1RM;
            }
          } else {
            liftHistory.set(dateKey, {
              date: log.date,
              e1RM: currentE1RM,
              volume: currentVolume,
            });
          }
        }
      });
    });

    const bestPR = personalRecords
      ?.filter(pr => {
        const resolvedPRName = resolveCanonicalName(pr.exerciseName, exercises);
        const normalizedPRName = getNormalizedExerciseName(resolvedPRName);
        return normalizedPRName === selectedLiftKey;
      })
      .reduce((max, pr) => {
        const maxWeightLbs = max.weightUnit === 'kg' ? max.weight * 2.20462 : max.weight;
        const prWeightLbs = pr.weightUnit === 'kg' ? pr.weight * 2.20462 : pr.weight;
        return prWeightLbs > maxWeightLbs ? pr : max;
      }, { weight: 0, date: new Date(0) } as PersonalRecord);

    if (bestPR && bestPR.weight > 0 && isAfter(bestPR.date, sixWeeksAgo)) {
      const prDateKey = format(bestPR.date, 'yyyy-MM-dd');
      const prWeightLbs = bestPR.weightUnit === 'kg' ? bestPR.weight * 2.20462 : bestPR.weight;

      const existingEntry = liftHistory.get(prDateKey);
      if (existingEntry) {
        existingEntry.actualPR = prWeightLbs;
        existingEntry.isActualPR = true;
      } else {
        liftHistory.set(prDateKey, {
          date: bestPR.date,
          e1RM: 0,
          volume: 0,
          actualPR: prWeightLbs,
          isActualPR: true,
        });
      }
    }

    const chartData = Array.from(liftHistory.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => ({
        name: format(item.date, 'MMM d'),
        e1RM: Math.round(item.e1RM),
        volume: Math.round(item.volume),
        actualPR: item.actualPR ? Math.round(item.actualPR) : undefined,
        isActualPR: item.isActualPR || false,
      }));

    // --- Trendline Calculation ---
    let trendlineData = null;
    const points = chartData.map((d, i) => ({ x: i, y: d.e1RM })).filter(p => p.y > 0);
    if (points.length >= 2) {
      const { x_mean, y_mean } = points.reduce(
        (acc, p) => ({ x_mean: acc.x_mean + p.x, y_mean: acc.y_mean + p.y }),
        { x_mean: 0, y_mean: 0 }
      );
      const n = points.length;
      const xMean = x_mean / n;
      const yMean = y_mean / n;

      const numerator = points.reduce((acc, p) => acc + (p.x - xMean) * (p.y - yMean), 0);
      const denominator = points.reduce((acc, p) => acc + (p.x - xMean) ** 2, 0);

      if (denominator > 0) {
        const slope = numerator / denominator;
        const intercept = yMean - slope * xMean;

        const startY = slope * 0 + intercept;
        const endY = slope * (chartData.length - 1) + intercept;

        trendlineData = {
          start: { x: chartData[0].name, y: startY },
          end: { x: chartData[chartData.length - 1].name, y: endY },
        };
      }
    }

    return { chartData, trendlineData };
  }, [selectedLift, selectedLiftKey, workoutLogs, personalRecords, exercises]);
}
