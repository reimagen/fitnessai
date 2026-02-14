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
  {
    id: 'back-squat',
    name: 'Back Squat',
    normalizedName: 'back squat',
    equipment: 'barbell',
    category: 'Lower Body',
    type: 'strength',
    isActive: true,
    legacyNames: ['barbell squat', 'back squat'],
  },
  {
    id: 'bench-press',
    name: 'Bench Press',
    normalizedName: 'bench press',
    equipment: 'barbell',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
    legacyNames: ['bench press', 'barbell bench press'],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    normalizedName: 'lat pulldown',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
    legacyNames: ['lat pulldown', 'pulldown'],
  },
];

describe('normalizeExerciseNameForLookup', () => {
  describe('whitespace handling', () => {
    it('trims leading/trailing whitespace', () => {
      expect(normalizeExerciseNameForLookup('  bench press  ')).toBe('bench press');
    });

    it('collapses multiple spaces to single space', () => {
      expect(normalizeExerciseNameForLookup('bench   press')).toBe('bench press');
    });

    it('removes tabs and newlines', () => {
      expect(normalizeExerciseNameForLookup('bench\t\npress')).toBe('bench press');
    });
  });

  describe('case normalization', () => {
    it('converts to lowercase', () => {
      expect(normalizeExerciseNameForLookup('BENCH PRESS')).toBe('bench press');
    });

    it('converts mixed case to lowercase', () => {
      expect(normalizeExerciseNameForLookup('BenCh PrEss')).toBe('bench press');
    });
  });

  describe('EGYM prefix removal', () => {
    it('removes EGYM prefix', () => {
      expect(normalizeExerciseNameForLookup('EGYM bench press')).toBe('bench press');
    });

    it('removes lowercase egym prefix', () => {
      expect(normalizeExerciseNameForLookup('egym bench press')).toBe('bench press');
    });

    it('removes mixed-case EGYM prefix', () => {
      expect(normalizeExerciseNameForLookup('EgYm bench press')).toBe('bench press');
    });

    it('only removes EGYM at start', () => {
      expect(normalizeExerciseNameForLookup('bench egym press')).toBe('bench egym press');
    });

    it('handles EGYM with extra spaces', () => {
      expect(normalizeExerciseNameForLookup('EGYM   bench press')).toBe('bench press');
    });
  });

  describe('parentheses removal', () => {
    it('removes parentheses but keeps content', () => {
      const result = normalizeExerciseNameForLookup('bench press (barbell)');
      expect(result).toBe('bench press barbell');
    });

    it('removes multiple sets of parentheses', () => {
      expect(normalizeExerciseNameForLookup('bench (barbell) press (flat)')).toBe(
        'bench barbell press flat'
      );
    });

    it('removes empty parentheses', () => {
      const result = normalizeExerciseNameForLookup('bench press ()');
      // Empty parens are removed but leave trailing space (not trimmed after collapse)
      expect(result).toBe('bench press ');
    });

    it('normalizes lookup values consistently', () => {
      expect(normalizeExerciseNameForLookup(' EGYM Chest Press (Seated) ')).toBe('chest press seated');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(normalizeExerciseNameForLookup('')).toBe('');
    });

    it('preserves simple names', () => {
      expect(normalizeExerciseNameForLookup('deadlift')).toBe('deadlift');
    });

    it('handles only whitespace', () => {
      expect(normalizeExerciseNameForLookup('   ')).toBe('');
    });
  });
});

describe('findCanonicalExercise', () => {
  it('finds exercise by normalized name', () => {
    const result = findCanonicalExercise('Back Squat', exerciseLibrary);
    expect(result?.normalizedName).toBe('back squat');
  });

  it('finds exercise with EGYM prefix', () => {
    const result = findCanonicalExercise('EGYM Bench Press', exerciseLibrary);
    expect(result?.normalizedName).toBe('bench press');
  });

  it('finds exercise by matching normalized name (parentheses kept)', () => {
    // 'Bench Press (Barbell)' normalizes to 'bench press barbell'
    // This won't match 'bench press' so returns undefined
    const result = findCanonicalExercise('Bench Press (Barbell)', exerciseLibrary);
    expect(result).toBeUndefined(); // No match for 'bench press barbell'
  });

  it('finds exercise without parentheses', () => {
    const result = findCanonicalExercise('Bench Press', exerciseLibrary);
    expect(result?.normalizedName).toBe('bench press');
  });

  it('finds canonical exercise by legacy name', () => {
    const canonical = findCanonicalExercise('chest press', exerciseLibrary);
    expect(canonical?.normalizedName).toBe('machine chest press');
  });

  it('finds exercise when legacy name has different casing', () => {
    const result = findCanonicalExercise('BARBELL BENCH PRESS', exerciseLibrary);
    expect(result?.normalizedName).toBe('bench press');
  });

  it('returns undefined for non-existent exercise', () => {
    const result = findCanonicalExercise('mysterious exercise', exerciseLibrary);
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    const result = findCanonicalExercise('', exerciseLibrary);
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty library', () => {
    const result = findCanonicalExercise('bench press', []);
    expect(result).toBeUndefined();
  });

  it('handles exercise with no legacy names', () => {
    const result = findCanonicalExercise('machine row', exerciseLibrary);
    expect(result?.normalizedName).toBe('machine row');
  });
});

describe('resolveCanonicalExerciseName', () => {
  it('returns canonical name for direct match', () => {
    const result = resolveCanonicalExerciseName('Back Squat', exerciseLibrary);
    expect(result).toBe('back squat');
  });

  it('returns canonical name for EGYM prefixed input', () => {
    const result = resolveCanonicalExerciseName('EGYM Bench Press', exerciseLibrary);
    expect(result).toBe('bench press');
  });

  it('returns canonical name for legacy name input', () => {
    const result = resolveCanonicalExerciseName('barbell squat', exerciseLibrary);
    expect(result).toBe('back squat');
  });

  it('returns canonical name via fallback map when available', () => {
    expect(resolveCanonicalExerciseName('chest press', exerciseLibrary)).toBe('machine chest press');
  });

  it('falls back to normalized input when no match exists', () => {
    expect(resolveCanonicalExerciseName('Unknown Exercise', exerciseLibrary)).toBe('unknown exercise');
  });

  it('returns normalized input for empty library', () => {
    const result = resolveCanonicalExerciseName('Bench Press', []);
    expect(result).toBe('bench press');
  });

  it('handles complex input with EGYM and parentheses', () => {
    const result = resolveCanonicalExerciseName(
      '  EGYM Lat Pulldown (Machine)  ',
      exerciseLibrary
    );
    // Normalizes to 'lat pulldown machine' which doesn't match 'lat pulldown'
    // So returns the normalized form
    expect(result).toBe('lat pulldown machine');
  });

  it('handles empty string gracefully', () => {
    const result = resolveCanonicalExerciseName('', exerciseLibrary);
    expect(result).toBe('');
  });

  it('handles case-insensitive matching throughout', () => {
    const result = resolveCanonicalExerciseName('BARBELL SQUAT', exerciseLibrary);
    expect(result).toBe('back squat');
  });
});

describe('exercise normalization - integration', () => {
  it('handles real gym equipment names', () => {
    const realNames = [
      'back squat', // exact match
      'bench press', // exact match
      'machine row', // exact match
      'machine chest press', // exact match
    ];

    const results = realNames.map(name => resolveCanonicalExerciseName(name, exerciseLibrary));

    expect(results).toEqual([
      'back squat',
      'bench press',
      'machine row',
      'machine chest press',
    ]);
  });

  it('handles user input variations', () => {
    const variations = [
      'bench pres', // typo - won't match but still normalizes
      'BENCH PRESS', // uppercase
      '  bench   press  ', // extra spaces
      'Bench Press (Barbell)', // with equipment - parens removed but content kept
    ];

    const normalized = variations.map(name =>
      normalizeExerciseNameForLookup(name)
    );

    expect(normalized).toEqual([
      'bench pres',
      'bench press',
      'bench press',
      'bench press barbell', // Parentheses removed but content stays
    ]);
  });
});
