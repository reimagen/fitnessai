import type { UserProfile } from './types';
import {
  CARDIO_HEALTH_BASELINE,
  WEIGHT_GOAL_MULTIPLIERS,
  CARDIO_EXPERIENCE_MULTIPLIERS,
  CARDIO_STRETCH_MULTIPLIERS,
  CARDIO_TARGET_BOUNDS,
} from './constants';

export interface CardioTargets {
  baseGoal: number;
  stretchGoal: number;
}

/**
 * Calculates weekly cardio targets using a simplified health-based formula.
 *
 * Formula:
 * 1. Health Baseline: 600 kcal/week (equivalent to CDC's 150 min moderate cardio/week)
 * 2. Weight Goal Adjustment (lose: 1.4x, maintain: 1.0x, gain: 0.8x)
 * 3. Experience Level Adjustment (beginner: 0.8x, intermediate: 1.0x, advanced: 1.2x)
 * 4. Stretch Goal Multiplier (beginner: 1.20x, intermediate: 1.25x, advanced: 1.30x)
 * 5. Safety Bounds: 400-2500 kcal base, 500-3000 kcal stretch
 */
export function calculateWeeklyCardioTargets(profile: UserProfile): CardioTargets {
  let baseGoal = CARDIO_HEALTH_BASELINE;

  // Apply weight goal adjustment
  if (profile.weightGoal) {
    baseGoal *= WEIGHT_GOAL_MULTIPLIERS[profile.weightGoal];
  }

  // Apply experience level adjustment
  if (profile.experienceLevel) {
    baseGoal *= CARDIO_EXPERIENCE_MULTIPLIERS[profile.experienceLevel];
  }

  // Apply safety bounds
  baseGoal = Math.round(baseGoal);
  baseGoal = Math.max(
    CARDIO_TARGET_BOUNDS.minBase,
    Math.min(CARDIO_TARGET_BOUNDS.maxBase, baseGoal)
  );

  // Calculate stretch goal
  const stretchMultiplier =
    CARDIO_STRETCH_MULTIPLIERS[profile.experienceLevel || 'intermediate'];
  let stretchGoal = Math.round(baseGoal * stretchMultiplier);
  stretchGoal = Math.max(
    CARDIO_TARGET_BOUNDS.minStretch,
    Math.min(CARDIO_TARGET_BOUNDS.maxStretch, stretchGoal)
  );

  return { baseGoal, stretchGoal };
}
