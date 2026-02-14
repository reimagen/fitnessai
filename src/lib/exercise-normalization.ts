import type { ExerciseDocument } from './exercise-types';

const LEGACY_CANONICAL_FALLBACKS: Record<string, string> = {
  'chest press': 'machine chest press',
};

const EQUIPMENT_PREFIX_REGEX = /^(machine|barbell|dumbbell|cable|bodyweight|band|kettlebell)\s+/;

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

const stripEquipmentPrefix = (name: string): string =>
  normalizeExerciseNameForLookup(name).replace(EQUIPMENT_PREFIX_REGEX, '');

const findByEquipmentPrefixInsensitiveName = (
  exerciseName: string,
  exerciseLibrary: ExerciseDocument[]
): ExerciseDocument | undefined => {
  const strippedInput = stripEquipmentPrefix(exerciseName);
  if (!strippedInput) {
    return undefined;
  }

  const matches = exerciseLibrary.filter(exercise => {
    if (stripEquipmentPrefix(exercise.normalizedName) === strippedInput) {
      return true;
    }

    return (
      exercise.legacyNames?.some(legacyName => stripEquipmentPrefix(legacyName) === strippedInput) ||
      false
    );
  });

  // Only use this relaxed match when it is unambiguous.
  return matches.length === 1 ? matches[0] : undefined;
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

  const equipmentInsensitiveExercise = findByEquipmentPrefixInsensitiveName(
    exerciseName,
    exerciseLibrary
  );
  if (equipmentInsensitiveExercise?.normalizedName) {
    return equipmentInsensitiveExercise.normalizedName;
  }

  return normalizedInput;
};
