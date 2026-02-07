import { describe, expect, it } from 'vitest';
import { fuzzyMatch } from './fuzzy-match';

describe('fuzzyMatch', () => {
  it('returns all items with score 0 when query is empty', () => {
    expect(fuzzyMatch('   ', ['Bench Press', 'Row'])).toEqual([
      { item: 'Bench Press', score: 0 },
      { item: 'Row', score: 0 },
    ]);
  });

  it('prioritizes exact > starts-with > contains', () => {
    const result = fuzzyMatch('row', ['Barbell Row', 'Row', 'Crow Pose']);

    expect(result).toEqual([
      { item: 'Row', score: 3 },
      { item: 'Barbell Row', score: 1 },
      { item: 'Crow Pose', score: 1 },
    ]);
  });

  it('sorts same-score matches alphabetically', () => {
    const result = fuzzyMatch('press', ['Shoulder Press', 'Bench Press', 'Leg Press']);
    expect(result.map((item) => item.item)).toEqual(['Bench Press', 'Leg Press', 'Shoulder Press']);
  });

  it('returns no results when there are no matches', () => {
    expect(fuzzyMatch('xyz', ['Bench Press', 'Squat'])).toEqual([]);
  });
});
