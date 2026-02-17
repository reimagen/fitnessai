import { describe, expect, it } from 'vitest';
import {
  getAllStrengthExerciseNames,
  getCardioCategory,
  getExerciseAlias,
  getExerciseStandard,
  hasStrengthStandard,
} from './exercise-registry';

describe('exercise-registry degraded sync lookups', () => {
  it('returns no strength standards in degraded mode', () => {
    expect(getExerciseStandard(' EGYM Bench Press (Machine) ')).toBeUndefined();
    expect(getExerciseStandard(' EGYM Bench Press ')).toBeUndefined();
    expect(hasStrengthStandard(' EGYM Bench Press ')).toBe(false);
  });

  it('returns no cardio mappings in degraded mode', () => {
    expect(getCardioCategory(' EGYM Running ')).toBeUndefined();
  });

  it('returns no alias mappings in degraded mode', () => {
    expect(getExerciseAlias('  Lat Pull  ')).toBeUndefined();
    expect(getAllStrengthExerciseNames()).toEqual([]);
  });
});
