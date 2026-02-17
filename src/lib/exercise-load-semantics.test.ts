import { describe, expect, it } from 'vitest';
import {
  isLoadSemantics,
  resolveExerciseLoadSemantics,
} from './exercise-load-semantics';

describe('exercise-load-semantics', () => {
  it('uses firebase value when valid', () => {
    expect(resolveExerciseLoadSemantics('per_limb')).toBe('per_limb');
    expect(resolveExerciseLoadSemantics('total_load')).toBe('total_load');
    expect(resolveExerciseLoadSemantics('unknown')).toBe('unknown');
  });

  it('falls back to unknown when firebase value is missing or invalid', () => {
    expect(resolveExerciseLoadSemantics()).toBe('unknown');
    expect(resolveExerciseLoadSemantics(null)).toBe('unknown');
    expect(resolveExerciseLoadSemantics('bad' as never)).toBe('unknown');
  });

  it('validates load semantics discriminator', () => {
    expect(isLoadSemantics('per_limb')).toBe(true);
    expect(isLoadSemantics('total_load')).toBe(true);
    expect(isLoadSemantics('unknown')).toBe(true);
    expect(isLoadSemantics('bad')).toBe(false);
  });
});
