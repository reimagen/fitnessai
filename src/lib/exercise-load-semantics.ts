import type { LoadSemantics } from './exercise-types';

export function isLoadSemantics(value: unknown): value is LoadSemantics {
  return value === 'per_limb' || value === 'total_load' || value === 'unknown';
}

export function resolveExerciseLoadSemantics(firebaseValue?: LoadSemantics | null): LoadSemantics {
  return isLoadSemantics(firebaseValue) ? firebaseValue : 'unknown';
}
