/**
 * Exercise Registry (degraded sync fallback)
 *
 * Runtime source-of-truth is Firebase exercise metadata. This synchronous module
 * intentionally does not return static exercise data to avoid dual-source drift.
 */

import type { ExerciseCategory, StrengthLevel } from './types';
import type {
  StrengthStandardsMap,
  ExerciseCategoryMap,
  ExerciseStandardData,
  StrengthRatioStandards,
  StrengthRatiosMap,
  ExerciseAliasMap,
} from './exercise-types';
import { normalizeExerciseName } from './exercise-registry.shared';

const EMPTY_STRENGTH_STANDARDS: StrengthStandardsMap = {};
const EMPTY_STRENGTH_RATIOS: StrengthRatiosMap = {};
const EMPTY_CARDIO_EXERCISES: ExerciseCategoryMap = {};
const EMPTY_EXERCISE_ALIASES: ExerciseAliasMap = {};

/**
 * Get all strength exercise standards
 * @returns Map of exercise names to their strength standards
 */
export function getStrengthStandards(): StrengthStandardsMap {
  return EMPTY_STRENGTH_STANDARDS;
}

/**
 * Get standards for a specific strength exercise
 * @param exerciseName Normalized exercise name
 * @returns Exercise standard data or undefined if not found
 */
export function getExerciseStandard(
  exerciseName: string
): ExerciseStandardData | undefined {
  return EMPTY_STRENGTH_STANDARDS[normalizeExerciseName(exerciseName)];
}

/**
 * Get all cardio exercise mappings
 * @returns Map of cardio exercise names to their category
 */
export function getCardioExercises(): ExerciseCategoryMap {
  return EMPTY_CARDIO_EXERCISES;
}

/**
 * Get all strength ratio standards (for imbalance detection)
 * @returns Map of ratio types to gender/level standards
 */
export function getStrengthRatios(): StrengthRatiosMap {
  return EMPTY_STRENGTH_RATIOS;
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
  const standards = EMPTY_STRENGTH_RATIOS[ratioType];
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
  return EMPTY_EXERCISE_ALIASES;
}

/**
 * Get an exercise alias mapping
 * @param alias The exercise name variant
 * @returns Canonical exercise name or undefined if not an alias
 */
export function getExerciseAlias(alias: string): string | undefined {
  return EMPTY_EXERCISE_ALIASES[normalizeExerciseName(alias)];
}

/**
 * Get category for a cardio exercise
 * @param exerciseName Normalized exercise name
 * @returns Exercise category or undefined if not found
 */
export function getCardioCategory(exerciseName: string): ExerciseCategory | undefined {
  return EMPTY_CARDIO_EXERCISES[normalizeExerciseName(exerciseName)];
}

/**
 * Check if an exercise exists in strength standards
 * @param exerciseName Normalized exercise name
 * @returns True if exercise has strength standards
 */
export function hasStrengthStandard(exerciseName: string): boolean {
  return normalizeExerciseName(exerciseName) in EMPTY_STRENGTH_STANDARDS;
}

/**
 * Get all exercise names with strength standards (for filtering/suggestions)
 * @returns Array of normalized exercise names
 */
export function getAllStrengthExerciseNames(): string[] {
  return Object.keys(EMPTY_STRENGTH_STANDARDS).sort();
}
