import type { PersonalRecord, StrengthLevel, UserProfile } from './types';
import { LBS_TO_KG } from './constants';
import {
  findExerciseByLegacyName,
  getExerciseAlias,
  getExerciseById,
  getExerciseStandard,
  normalizeExerciseName,
} from './exercise-registry.server';

/**
 * Normalizes an exercise name by converting it to lowercase and resolving aliases.
 * Uses Firestore data when available, falling back to legacy names.
 */
export async function getNormalizedExerciseName(name: string): Promise<string> {
  if (!name) return '';
  const normalized = normalizeExerciseName(name);

  const aliasId = await getExerciseAlias(normalized);
  if (aliasId) {
    const exercise = await getExerciseById(aliasId);
    if (exercise) {
      return exercise.normalizedName;
    }
  }

  const legacy = await findExerciseByLegacyName(normalized);
  if (legacy) {
    return legacy.normalizedName;
  }

  return normalized;
}

export async function getStrengthLevel(
  record: PersonalRecord,
  profile: UserProfile
): Promise<StrengthLevel> {
  const normalizedName = await getNormalizedExerciseName(record.exerciseName);
  const exerciseData = await getExerciseStandard(normalizedName);
  if (!exerciseData) {
    return 'N/A';
  }

  if (!profile.gender) return 'N/A';
  if (profile.gender !== 'Male' && profile.gender !== 'Female') return 'N/A';

  const standards = exerciseData.standards;

  let baseValueInKg: number;
  if (exerciseData.type === 'bw') {
    if (!profile.weightValue || !profile.weightUnit) return 'N/A';
    baseValueInKg =
      profile.weightUnit === 'lbs'
        ? profile.weightValue * LBS_TO_KG
        : profile.weightValue;
  } else {
    if (!profile.skeletalMuscleMassValue || !profile.skeletalMuscleMassUnit) return 'N/A';
    baseValueInKg =
      profile.skeletalMuscleMassUnit === 'lbs'
        ? profile.skeletalMuscleMassValue * LBS_TO_KG
        : profile.skeletalMuscleMassValue;
  }

  if (baseValueInKg <= 0) return 'N/A';

  const liftedWeightInKg =
    record.weightUnit === 'lbs' ? record.weight * LBS_TO_KG : record.weight;
  const rawRatio = liftedWeightInKg / baseValueInKg;

  let ageAdjustedRatio = rawRatio;
  if (profile.age && profile.age > 40) {
    const ageFactor = 1 + (profile.age - 40) * 0.01;
    ageAdjustedRatio *= ageFactor;
  }

  const genderKey = profile.gender as 'Male' | 'Female';
  const genderStandards = standards[genderKey];

  if (!genderStandards) {
    return 'N/A';
  }

  if (ageAdjustedRatio >= genderStandards.elite) return 'Elite';
  if (ageAdjustedRatio >= genderStandards.advanced) return 'Advanced';
  if (ageAdjustedRatio >= genderStandards.intermediate) return 'Intermediate';

  return 'Beginner';
}
