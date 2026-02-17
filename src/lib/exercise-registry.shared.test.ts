import { describe, expect, it } from 'vitest';
import {
  buildAliasMapFromDocuments,
  buildCardioCategoryMapFromExercises,
  buildStrengthStandardsFromExercises,
  normalizeExerciseName,
} from './exercise-registry.shared';
import type { AliasDocument, ExerciseDocument } from './exercise-types';

describe('exercise-registry.shared', () => {
  describe('normalizeExerciseName', () => {
    it('normalizes egym prefixes, parentheses, casing, and whitespace', () => {
      expect(normalizeExerciseName('  EGYM  Bench Press (Machine)  ')).toBe(
        'bench press machine'
      );
    });
  });

  describe('buildStrengthStandardsFromExercises', () => {
    it('includes only strength exercises with standards and normalizes keys', () => {
      const exercises: ExerciseDocument[] = [
        {
          id: 'bench',
          name: 'Bench Press',
          normalizedName: 'Bench Press',
          equipment: 'barbell',
          category: 'Upper Body',
          type: 'strength',
          strengthStandards: {
            baseType: 'bw',
            standards: {
              Male: { intermediate: 1, advanced: 1.5, elite: 2 },
              Female: { intermediate: 0.75, advanced: 1, elite: 1.25 },
            },
          },
          isActive: true,
        },
        {
          id: 'run',
          name: 'Run',
          normalizedName: 'run',
          equipment: 'other',
          category: 'Cardio',
          type: 'cardio',
          isActive: true,
        },
      ];

      const standards = buildStrengthStandardsFromExercises(exercises);
      expect(Object.keys(standards)).toEqual(['bench press']);
      expect(standards['bench press']?.type).toBe('bw');
    });
  });

  describe('buildCardioCategoryMapFromExercises', () => {
    it('includes only cardio exercises and normalizes keys', () => {
      const exercises: ExerciseDocument[] = [
        {
          id: 'row',
          name: 'Row',
          normalizedName: '  row  ',
          equipment: 'other',
          category: 'Cardio',
          type: 'cardio',
          isActive: true,
        },
        {
          id: 'squat',
          name: 'Squat',
          normalizedName: 'squat',
          equipment: 'barbell',
          category: 'Lower Body',
          type: 'strength',
          isActive: true,
        },
      ];

      const categories = buildCardioCategoryMapFromExercises(exercises);
      expect(categories).toEqual({ row: 'Cardio' });
    });
  });

  describe('buildAliasMapFromDocuments', () => {
    it('normalizes alias keys while preserving canonical ids', () => {
      const aliases: AliasDocument[] = [
        { alias: '  Lat Pull  ', canonicalId: 'lat-pulldown' },
      ];

      const aliasMap = buildAliasMapFromDocuments(aliases);
      expect(aliasMap).toEqual({ 'lat pull': 'lat-pulldown' });
    });
  });
});
