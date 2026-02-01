import type { ExerciseCategory, StrengthLevel } from './types';

/**
 * Standard ratios for a strength exercise at different proficiency levels
 */
export type StrengthStandardRatios = {
  intermediate: number;
  advanced: number;
  elite: number;
};

/**
 * Gender-specific strength standards
 */
export type GenderStandards = {
  Male: StrengthStandardRatios;
  Female: StrengthStandardRatios;
};

/**
 * Data structure for a single exercise's strength standards
 */
export type ExerciseStandardData = {
  type: 'smm' | 'bw'; // Ratio is based on Skeletal Muscle Mass or Bodyweight
  category: ExerciseCategory;
  standards: GenderStandards;
};

/**
 * Strength ratio standards for imbalance detection
 */
export type StrengthRatioStandards = {
  targetRatio: number;
  lowerBound: number;
  upperBound: number;
};

/**
 * Map of imbalance types to gender/level specific ratios
 */
export type StrengthRatiosMap = Record<
  string,
  Record<'Male' | 'Female', Partial<Record<StrengthLevel, StrengthRatioStandards>>>
>;

/**
 * Map of exercise names to their strength standards
 */
export type StrengthStandardsMap = Record<string, ExerciseStandardData>;

/**
 * Map of exercise names to their categories (for non-strength exercises)
 */
export type ExerciseCategoryMap = Record<string, ExerciseCategory>;

/**
 * Map of exercise name aliases/variations to canonical names
 */
export type ExerciseAliasMap = Record<string, string>;
