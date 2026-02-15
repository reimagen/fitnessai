import { describe, expect, it } from 'vitest';
import type { ExerciseDocument } from '@/lib/exercise-types';
import type { SixWeekLiftMetricsMap } from '@/analysis/six-week-lift-metrics';
import { buildImbalancePairMatches } from './imbalance-matcher';

const exercises: ExerciseDocument[] = [
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    normalizedName: 'machine chest press',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
  },
  {
    id: 'seated-row',
    name: 'Seated Row',
    normalizedName: 'seated row',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
  },
];

const metricsMap: SixWeekLiftMetricsMap = {
  'machine chest press': {
    avgE1RM: 120,
    avgE1RMUnit: 'lbs',
    sessionCount: 3,
    dayMetrics: [],
  },
  'seated row': {
    avgE1RM: 100,
    avgE1RMUnit: 'lbs',
    sessionCount: 2,
    dayMetrics: [],
  },
};

describe('buildImbalancePairMatches', () => {
  it('returns data match when both lifts exist in exercises and metrics', () => {
    const result = buildImbalancePairMatches(metricsMap, exercises, [
      {
        imbalanceType: 'Horizontal Push vs. Pull',
        lift1CanonicalId: 'machine-chest-press',
        lift2CanonicalId: 'seated-row',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].hasData).toBe(true);
    if (result[0].hasData) {
      expect(result[0].lift1.exerciseName).toBe('Machine Chest Press');
      expect(result[0].lift2.exerciseName).toBe('Seated Row');
    }
  });

  it('returns no-data with missing lift name when lift is missing from metrics', () => {
    const result = buildImbalancePairMatches(
      { 'machine chest press': metricsMap['machine chest press'] },
      exercises,
      [
        {
          imbalanceType: 'Horizontal Push vs. Pull',
          lift1CanonicalId: 'machine-chest-press',
          lift2CanonicalId: 'seated-row',
        },
      ]
    );

    expect(result).toEqual([
      {
        hasData: false,
        imbalanceType: 'Horizontal Push vs. Pull',
        missingLifts: ['Seated Row'],
      },
    ]);
  });

  it('returns no-data with canonical id when exercise id is missing', () => {
    const result = buildImbalancePairMatches(metricsMap, exercises, [
      {
        imbalanceType: 'Vertical Push vs. Pull',
        lift1CanonicalId: 'missing-id',
        lift2CanonicalId: 'seated-row',
      },
    ]);

    expect(result).toEqual([
      {
        hasData: false,
        imbalanceType: 'Vertical Push vs. Pull',
        missingLifts: ['missing-id'],
      },
    ]);
  });
});
