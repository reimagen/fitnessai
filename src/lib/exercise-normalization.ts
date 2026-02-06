import type { ExerciseDocument } from './exercise-types';

const LEGACY_CANONICAL_FALLBACKS: Record<string, string> = {
  'chest press': 'machine chest press',
};

/**
 * Client-side exercise normalization used for lookups against exercise library data.
 * Matches server normalization behavior by stripping only EGYM prefixes.
 */
export const normalizeExerciseNameForLookup = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/^egym\s+/, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');

export const findCanonicalExercise = (
  exerciseName: string,
  exerciseLibrary: ExerciseDocument[]
): ExerciseDocument | undefined => {
  const normalized = normalizeExerciseNameForLookup(exerciseName);

  return exerciseLibrary.find(exercise => {
    if (normalizeExerciseNameForLookup(exercise.normalizedName) === normalized) return true;

    return (
      exercise.legacyNames?.some(
        legacyName => normalizeExerciseNameForLookup(legacyName) === normalized
      ) || false
    );
  });
};

/**
 * Resolves any exercise name to its canonical normalized name when possible.
 */
export const resolveCanonicalExerciseName = (
  exerciseName: string,
  exerciseLibrary: ExerciseDocument[]
): string => {
  const normalizedInput = normalizeExerciseNameForLookup(exerciseName);
  const exercise = findCanonicalExercise(exerciseName, exerciseLibrary);
  if (exercise?.normalizedName) {
    return exercise.normalizedName;
  }

  const fallbackCanonical = LEGACY_CANONICAL_FALLBACKS[normalizedInput];
  if (fallbackCanonical) {
    const fallbackExercise = exerciseLibrary.find(
      candidate =>
        normalizeExerciseNameForLookup(candidate.normalizedName) === fallbackCanonical
    );
    if (fallbackExercise?.normalizedName) {
      return fallbackExercise.normalizedName;
    }
  }

  return normalizedInput;
};
