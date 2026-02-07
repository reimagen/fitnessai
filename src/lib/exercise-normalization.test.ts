import { describe, expect, it } from 'vitest';
import {
  findCanonicalExercise,
  normalizeExerciseNameForLookup,
  resolveCanonicalExerciseName,
} from './exercise-normalization';
import type { ExerciseDocument } from './exercise-types';

const exerciseLibrary: ExerciseDocument[] = [
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    normalizedName: 'machine chest press',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
    legacyNames: ['chest press'],
  },
  {
    id: 'machine-row',
    name: 'Machine Row',
    normalizedName: 'machine row',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
  },
];

describe('exercise normalization', () => {
  it('normalizes lookup values consistently', () => {
    expect(normalizeExerciseNameForLookup(' EGYM Chest Press (Seated) ')).toBe('chest press seated');
  });

  it('finds canonical exercise by legacy name', () => {
    const canonical = findCanonicalExercise('chest press', exerciseLibrary);
    expect(canonical?.normalizedName).toBe('machine chest press');
  });

  it('returns canonical name via fallback map when available', () => {
    expect(resolveCanonicalExerciseName('chest press', exerciseLibrary)).toBe('machine chest press');
  });

  it('falls back to normalized input when no match exists', () => {
    expect(resolveCanonicalExerciseName('Unknown Exercise', exerciseLibrary)).toBe('unknown exercise');
  });
});
