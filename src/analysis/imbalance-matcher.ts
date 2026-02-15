import type { ExerciseDocument } from '@/lib/exercise-types';
import type { ImbalanceType } from '@/analysis/analysis.config';
import type { ImbalancePairConfig } from '@/lib/imbalance-config-types';
import type { SixWeekLiftMetricsMap } from '@/analysis/six-week-lift-metrics';

type LiftSummary = {
  exerciseName: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  sessionCount: number;
};

export type MatchedImbalancePair =
  | {
      hasData: true;
      imbalanceType: ImbalanceType;
      lift1: LiftSummary;
      lift2: LiftSummary;
    }
  | {
      hasData: false;
      imbalanceType: ImbalanceType;
      missingLifts: string[];
    };

export function buildImbalancePairMatches(
  metricsMap: SixWeekLiftMetricsMap,
  exercises: ExerciseDocument[],
  pairs: ImbalancePairConfig[]
): MatchedImbalancePair[] {
  const exerciseById = new Map(exercises.map(exercise => [exercise.id, exercise]));

  return pairs.map(pair => {
    const lift1Exercise = exerciseById.get(pair.lift1CanonicalId);
    const lift2Exercise = exerciseById.get(pair.lift2CanonicalId);

    const missingLifts: string[] = [];

    if (!lift1Exercise) {
      missingLifts.push(pair.lift1CanonicalId);
    }
    if (!lift2Exercise) {
      missingLifts.push(pair.lift2CanonicalId);
    }

    const lift1Metric = lift1Exercise ? metricsMap[lift1Exercise.normalizedName] : null;
    const lift2Metric = lift2Exercise ? metricsMap[lift2Exercise.normalizedName] : null;

    const lift1 =
      lift1Exercise && lift1Metric && lift1Metric.avgE1RM !== null && lift1Metric.avgE1RMUnit !== null
        ? {
            exerciseName: lift1Exercise.name,
            weight: lift1Metric.avgE1RM,
            weightUnit: lift1Metric.avgE1RMUnit,
            sessionCount: lift1Metric.sessionCount,
          }
        : null;

    const lift2 =
      lift2Exercise && lift2Metric && lift2Metric.avgE1RM !== null && lift2Metric.avgE1RMUnit !== null
        ? {
            exerciseName: lift2Exercise.name,
            weight: lift2Metric.avgE1RM,
            weightUnit: lift2Metric.avgE1RMUnit,
            sessionCount: lift2Metric.sessionCount,
          }
        : null;

    if (!lift1 && lift1Exercise) {
      missingLifts.push(lift1Exercise.name);
    }
    if (!lift2 && lift2Exercise) {
      missingLifts.push(lift2Exercise.name);
    }

    if (!lift1 || !lift2) {
      return {
        hasData: false,
        imbalanceType: pair.imbalanceType,
        missingLifts,
      };
    }

    return {
      hasData: true,
      imbalanceType: pair.imbalanceType,
      lift1,
      lift2,
    };
  });
}
