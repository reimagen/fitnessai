/**
 * Exercise Registry - Abstraction layer for exercise data
 *
 * This module abstracts exercise data access, allowing seamless migration
 * from hardcoded data (exercise-data.ts) to a Firebase collection.
 *
 * Future migration: Replace these implementations to fetch from Firebase
 * instead of local data without changing any consuming code.
 */

import type { ExerciseCategory, StrengthLevel } from './types';
import type {
  StrengthStandardsMap,
  StrengthRatiosMap,
  ExerciseCategoryMap,
  ExerciseAliasMap,
  ExerciseStandardData,
  StrengthRatioStandards,
} from './exercise-types';
import {
  STRENGTH_STANDARDS,
  STRENGTH_RATIOS,
  CARDIO_EXERCISES,
  LIFT_NAME_ALIASES,
} from './exercise-data';

/**
 * Get all strength exercise standards
 * @returns Map of exercise names to their strength standards
 */
export function getStrengthStandards(): StrengthStandardsMap {
  // TODO: Replace with Firebase collection fetch
  return STRENGTH_STANDARDS;
}

/**
 * Get standards for a specific strength exercise
 * @param exerciseName Normalized exercise name
 * @returns Exercise standard data or undefined if not found
 */
export function getExerciseStandard(
  exerciseName: string
): ExerciseStandardData | undefined {
  // TODO: Replace with Firebase query
  return STRENGTH_STANDARDS[exerciseName];
}

/**
 * Get all cardio exercise mappings
 * @returns Map of cardio exercise names to their category
 */
export function getCardioExercises(): ExerciseCategoryMap {
  // TODO: Replace with Firebase collection fetch
  return CARDIO_EXERCISES;
}

/**
 * Get all strength ratio standards (for imbalance detection)
 * @returns Map of ratio types to gender/level standards
 */
export function getStrengthRatios(): StrengthRatiosMap {
  // TODO: Replace with Firebase collection fetch
  return STRENGTH_RATIOS;
}

/**
 * Get strength ratio standards for a specific type and level
 * @param ratioType Type of imbalance (e.g., 'Vertical Push vs. Pull')
 * @param gender User's gender
 * @param level User's strength level
 * @returns Ratio standards or null if not found
 */
export function getStrengthRatioStandards(
  ratioType: string,
  gender: 'Male' | 'Female',
  level: StrengthLevel
): StrengthRatioStandards | null {
  // TODO: Replace with Firebase query
  const standards = STRENGTH_RATIOS[ratioType];
  if (!standards) return null;

  const genderStandards = standards[gender];
  if (!genderStandards) return null;

  const levelStandards = genderStandards[level];
  return levelStandards || null;
}

/**
 * Get all exercise name aliases
 * @returns Map of alias names to canonical names
 */
export function getExerciseAliases(): ExerciseAliasMap {
  // TODO: Replace with Firebase collection fetch or config
  return LIFT_NAME_ALIASES;
}

/**
 * Get an exercise alias mapping
 * @param alias The exercise name variant
 * @returns Canonical exercise name or undefined if not an alias
 */
export function getExerciseAlias(alias: string): string | undefined {
  // TODO: Replace with Firebase query
  return LIFT_NAME_ALIASES[alias];
}

/**
 * Get category for a cardio exercise
 * @param exerciseName Normalized exercise name
 * @returns Exercise category or undefined if not found
 */
export function getCardioCategory(exerciseName: string): ExerciseCategory | undefined {
  // TODO: Replace with Firebase query
  return CARDIO_EXERCISES[exerciseName];
}

/**
 * Check if an exercise exists in strength standards
 * @param exerciseName Normalized exercise name
 * @returns True if exercise has strength standards
 */
export function hasStrengthStandard(exerciseName: string): boolean {
  // TODO: Replace with Firebase query
  return exerciseName in STRENGTH_STANDARDS;
}

/**
 * Get all exercise names with strength standards (for filtering/suggestions)
 * @returns Array of normalized exercise names
 */
export function getAllStrengthExerciseNames(): string[] {
  // TODO: Replace with Firebase collection fetch
  return Object.keys(STRENGTH_STANDARDS).sort();
}
