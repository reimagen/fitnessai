import { describe, expect, it, vi } from 'vitest';
import type { ExerciseDocument } from '@/lib/exercise-types';
import {
  reportImbalanceConfigValidationIssues,
  validateImbalanceConfigExercises,
  type ImbalanceConfigValidationIssue,
} from './analysis.config';

const buildExercise = (
  normalizedName: string,
  legacyNames?: string[]
): ExerciseDocument => ({
  id: normalizedName,
  name: normalizedName,
  normalizedName,
  equipment: 'machine',
  category: 'Upper Body',
  type: 'strength',
  isActive: true,
  legacyNames,
});

const completeExerciseLibrary: ExerciseDocument[] = [
  buildExercise('machine chest press', ['chest press']),
  buildExercise('seated row'),
  buildExercise('shoulder press'),
  buildExercise('lat pulldown'),
  buildExercise('leg curl'),
  buildExercise('leg extension'),
  buildExercise('adductor'),
  buildExercise('abductor'),
];

describe('validateImbalanceConfigExercises', () => {
  it('returns no issues when all configured exercises can be resolved', () => {
    const issues = validateImbalanceConfigExercises(completeExerciseLibrary);
    expect(issues).toEqual([]);
  });

  it('returns issues for configured exercises that cannot be found in the exercise library', () => {
    const incompleteLibrary = completeExerciseLibrary.filter(
      exercise => exercise.normalizedName !== 'seated row'
    );

    const issues = validateImbalanceConfigExercises(incompleteLibrary);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          imbalanceType: 'Horizontal Push vs. Pull',
          liftField: 'lift2Options',
          configuredExerciseName: 'seated row',
          resolvedExerciseName: 'seated row',
        }),
      ])
    );
  });
});

describe('reportImbalanceConfigValidationIssues', () => {
  it('logs only once for repeated issue sets', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const issues: ImbalanceConfigValidationIssue[] = [
      {
        imbalanceType: 'Horizontal Push vs. Pull',
        liftField: 'lift1Options',
        configuredExerciseName: 'missing press',
        resolvedExerciseName: 'missing press',
      },
    ];

    reportImbalanceConfigValidationIssues(issues);
    reportImbalanceConfigValidationIssues(issues);

    expect(spy).toHaveBeenCalledTimes(1);

    reportImbalanceConfigValidationIssues([]);
    reportImbalanceConfigValidationIssues(issues);

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
