import type { UserProfile, WorkoutLog } from './types';
import {
  CARDIO_HEALTH_BASELINE,
  WEIGHT_GOAL_MULTIPLIERS,
  CARDIO_EXPERIENCE_MULTIPLIERS,
  CARDIO_ACTIVITY_LEVEL_MULTIPLIERS,
  CARDIO_STRETCH_MULTIPLIERS,
  CARDIO_TARGET_BOUNDS,
  FOUR_WEEKS,
  LBS_TO_KG,
} from './constants';
import { isWithinInterval, startOfWeek, subDays, subWeeks } from 'date-fns';

export interface CardioTargets {
  baseGoal: number;
  stretchGoal: number;
}

export interface CardioTargetsOptions {
  recentWeeklyAverage?: number;
}

export function calculateRecentWeeklyCardioAverage(
  workoutLogs: WorkoutLog[],
  today = new Date()
): number | null {
  if (!workoutLogs.length) return null;

  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 0 });
  const endOfLastCompletedWeek = subDays(startOfThisWeek, 1);
  let totalCalories = 0;

  for (let i = 0; i < FOUR_WEEKS; i++) {
    const weekEndDate = subWeeks(endOfLastCompletedWeek, i);
    const weekStartDate = startOfWeek(weekEndDate, { weekStartsOn: 0 });
    const logsThisWeek = workoutLogs.filter((log) =>
      isWithinInterval(log.date, { start: weekStartDate, end: weekEndDate })
    );

    const weeklyTotalCalories = logsThisWeek.reduce((sum, log) => {
      return (
        sum +
        log.exercises
          .filter((ex) => ex.category === 'Cardio' && ex.calories)
          .reduce((exSum, ex) => exSum + (ex.calories || 0), 0)
      );
    }, 0);

    totalCalories += weeklyTotalCalories;
  }

  return totalCalories > 0 ? totalCalories / FOUR_WEEKS : null;
}

export function resolveWeeklyCardioGoal(
  profile: UserProfile,
  options?: CardioTargetsOptions
): number | null {
  if (profile.cardioCalculationMethod === 'auto') {
    if (!profile.activityLevel || !profile.weightGoal) {
      return null;
    }
    return calculateWeeklyCardioTargets(profile, options).baseGoal;
  }

  return profile.weeklyCardioCalorieGoal ?? null;
}

/**
 * Calculates weekly cardio targets using a simplified health-based formula.
 *
 * Formula:
 * 1. Health Baseline: 600 kcal/week (equivalent to CDC's 150 min moderate cardio/week at ~70kg)
 * 2. Weight Adjustment: scale baseline by user weight when available
 * 3. Weight Goal Adjustment (lose: 1.4x, maintain: 1.0x, gain: 0.8x)
 * 4. Activity Level Adjustment (sedentary: 0.6x, lightly_active: 0.8x, moderately_active: 1.0x, very_active: 1.2x, extremely_active: 1.4x)
 * 5. Experience Level Adjustment (beginner: 0.9x, intermediate: 1.0x, advanced: 1.05x)
 * 6. Stretch Goal Multiplier (beginner: 1.20x, intermediate: 1.25x, advanced: 1.25x)
 * 7. Safety Bounds: 400-2500 kcal base, 500-3000 kcal stretch
 */
export function calculateWeeklyCardioTargets(
  profile: UserProfile,
  options?: CardioTargetsOptions
): CardioTargets {
  let baseGoal = CARDIO_HEALTH_BASELINE;

  if (profile.weightValue && profile.weightUnit) {
    const weightKg =
      profile.weightUnit === 'lbs' ? profile.weightValue * LBS_TO_KG : profile.weightValue;
    if (weightKg > 0) {
      baseGoal *= weightKg / 70;
    }
  }

  // Apply weight goal adjustment
  if (profile.weightGoal) {
    baseGoal *= WEIGHT_GOAL_MULTIPLIERS[profile.weightGoal];
  }

  // Apply activity level adjustment
  if (profile.activityLevel) {
    baseGoal *= CARDIO_ACTIVITY_LEVEL_MULTIPLIERS[profile.activityLevel];
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

  if (options?.recentWeeklyAverage && options.recentWeeklyAverage > 0) {
    baseGoal = Math.max(baseGoal, Math.round(options.recentWeeklyAverage));
    baseGoal = Math.max(
      CARDIO_TARGET_BOUNDS.minBase,
      Math.min(CARDIO_TARGET_BOUNDS.maxBase, baseGoal)
    );
  }

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
