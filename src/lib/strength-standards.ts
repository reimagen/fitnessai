/**
 * Strength Standards & Exercise Analysis
 *
 * This module provides utilities for exercise classification, strength level calculation,
 * and strength threshold determination. All exercise data is now abstracted through
 * exercise-registry.ts to support future migration to Firebase.
 */

import type { ExerciseCategory, PersonalRecord, UserProfile, StrengthLevel } from './types';
import { LBS_TO_KG } from './constants';
import {
  getExerciseStandard,
  getExerciseAlias,
  getCardioCategory,
  getStrengthRatioStandards as getStrengthRatioStandardsFromRegistry,
  getAllStrengthExerciseNames,
} from './exercise-registry';

/**
 * Normalizes an exercise name by converting it to lowercase and checking for aliases.
 * @param name The raw exercise name.
 * @returns The normalized, canonical exercise name.
 */
export function getNormalizedExerciseName(name: string): string {
  if (!name) return "";
  const lowerCaseName = name.trim().toLowerCase();
  return getExerciseAlias(lowerCaseName) || lowerCaseName;
}

/**
 * Gets the category for a given classifiable exercise.
 * @param exerciseName The name of the exercise.
 * @returns The ExerciseCategory or null if not found.
 */
export function getExerciseCategory(exerciseName: string): ExerciseCategory | null {
  const normalizedName = getNormalizedExerciseName(exerciseName).toLowerCase();

  // Check cardio exercises first
  const cardioCategory = getCardioCategory(normalizedName);
  if (cardioCategory) {
    return cardioCategory;
  }

  // Then check strength standards
  const exerciseData = getExerciseStandard(normalizedName);
  return exerciseData ? exerciseData.category : null;
}

/**
 * Gets the calculation type for a strength standard.
 * @param exerciseName The name of the exercise.
 * @returns 'smm', 'bw', or null if not found.
 */
export function getStrengthStandardType(
  exerciseName: string
): 'smm' | 'bw' | null {
  const normalizedName = getNormalizedExerciseName(exerciseName);
  const exerciseData = getExerciseStandard(normalizedName);
  if (!exerciseData) {
    return null;
  }
  return exerciseData.type;
}

/**
 * Retrieves the target ratio and acceptable bounds for a given strength imbalance.
 * @param imbalanceType The type of imbalance (e.g., 'Vertical Push vs. Pull').
 * @param gender The user's gender.
 * @param level The user's guiding strength level for the pair.
 * @returns An object with targetRatio, lowerBound, and upperBound, or null if not found.
 */
export function getStrengthRatioStandards(
  imbalanceType: string,
  gender: 'Male' | 'Female',
  level: StrengthLevel
) {
  if (level === 'N/A') return null;
  return getStrengthRatioStandardsFromRegistry(imbalanceType, gender, level);
}

/**
 * Calculates a strength level classification for a given personal record.
 * @param record The personal record to classify.
 * @param profile The user's profile containing necessary stats.
 * @returns A StrengthLevel ('Beginner', 'Intermediate', 'Advanced', 'Elite', or 'N/A').
 */
export function getStrengthLevel(
  record: PersonalRecord,
  profile: UserProfile
): StrengthLevel {
  const normalizedName = getNormalizedExerciseName(record.exerciseName);

  const exerciseData = getExerciseStandard(normalizedName);
  if (!exerciseData) {
    return 'N/A'; // No standards available for this exercise
  }

  if (!profile.gender) return 'N/A';
  if (profile.gender !== 'Male' && profile.gender !== 'Female') return 'N/A';

  const standards = exerciseData.standards;

  let baseValueInKg: number;
  if (exerciseData.type === 'bw') {
      if (!profile.weightValue || !profile.weightUnit) return 'N/A';
      baseValueInKg = profile.weightUnit === 'lbs'
          ? profile.weightValue * LBS_TO_KG
          : profile.weightValue;
  } else { // 'smm'
      if (!profile.skeletalMuscleMassValue || !profile.skeletalMuscleMassUnit) return 'N/A';
      baseValueInKg = profile.skeletalMuscleMassUnit === 'lbs'
          ? profile.skeletalMuscleMassValue * LBS_TO_KG
          : profile.skeletalMuscleMassValue;
  }

  if (baseValueInKg <= 0) return 'N/A';

  const liftedWeightInKg = record.weightUnit === 'lbs'
    ? record.weight * LBS_TO_KG
    : record.weight;

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

/**
 * Calculates the weight thresholds for each strength level for a given exercise.
 * @param exerciseName The name of the exercise.
 * @param profile The user's profile containing necessary stats.
 * @param outputUnit The desired weight unit for the output ('lbs' or 'kg').
 * @returns An object with weight thresholds for each level, or null if data is insufficient.
 */
export function getStrengthThresholds(
  exerciseName: string,
  profile: UserProfile,
  outputUnit: 'lbs' | 'kg'
): { intermediate: number; advanced: number; elite: number } | null {
  const normalizedName = getNormalizedExerciseName(exerciseName);

  const exerciseData = getExerciseStandard(normalizedName);
  if (!exerciseData) {
    return null; // No standards available for this exercise
  }

  if (!profile.gender) return null;
  if (profile.gender !== 'Male' && profile.gender !== 'Female') return null;

  const standards = exerciseData.standards;

  let baseValueInKg: number;
  if (exerciseData.type === 'bw') {
      if (!profile.weightValue || !profile.weightUnit) return null;
      baseValueInKg = profile.weightUnit === 'lbs'
          ? profile.weightValue * LBS_TO_KG
          : profile.weightValue;
  } else { // 'smm'
      if (!profile.skeletalMuscleMassValue || !profile.skeletalMuscleMassUnit) return null;
      baseValueInKg = profile.skeletalMuscleMassUnit === 'lbs'
          ? profile.skeletalMuscleMassValue * LBS_TO_KG
          : profile.skeletalMuscleMassValue;
  }

  if (baseValueInKg <= 0) return null;

  const genderKey = profile.gender as 'Male' | 'Female';
  const genderStandards = standards[genderKey];
  if (!genderStandards) {
    return null;
  }

  let ageFactor = 1.0;
  if (profile.age && profile.age > 40) {
    ageFactor = 1 + (profile.age - 40) * 0.01;
  }

  const calculateThreshold = (ratio: number) => {
    const weightInKg = (ratio * baseValueInKg) / ageFactor;
    const finalWeight = (outputUnit === 'lbs') ? weightInKg / LBS_TO_KG : weightInKg;
    // Use Math.ceil to ensure that if the threshold is e.g. 105.1, it becomes 106,
    // so a lift of 106 is correctly classified as meeting the threshold.
    return Math.ceil(finalWeight);
  };

  return {
    intermediate: calculateThreshold(genderStandards.intermediate),
    advanced: calculateThreshold(genderStandards.advanced),
    elite: calculateThreshold(genderStandards.elite),
  };
}

/**
 * An exported array of all exercise names that have strength standards.
 */
export const classifiedExercises = getAllStrengthExerciseNames();
