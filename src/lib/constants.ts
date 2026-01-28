import type { ExerciseCategory } from "@/lib/types";

/**
 * Default values for user profile settings
 */
export const DEFAULT_WORKOUTS_PER_WEEK = 3;

/**
 * Cardio goal constants (in calories)
 */
export const DEFAULT_WEEKLY_CARDIO_MIN_GOAL = 1000;
export const DEFAULT_WEEKLY_CARDIO_STRETCH_GOAL = 1200;

/**
 * Speed thresholds for cardio activity classification (mph)
 */
export const CARDIO_RUN_THRESHOLD_MPH = 4.0;

/**
 * Conversion factors
 */
export const MILES_PER_KM = 0.621371;
export const MILES_PER_FEET = 0.000189394;

/**
 * PR form state constants.
 */
export const FORM_STATES = {
  NONE: "none",
  MANUAL: "manual",
  PARSE: "parse",
} as const;

export type FormState = typeof FORM_STATES[keyof typeof FORM_STATES];

/**
 * Category ordering for PRs.
 */
export const CATEGORY_ORDER: readonly ExerciseCategory[] = [
  "Upper Body",
  "Lower Body",
  "Core",
  "Full Body",
  "Cardio",
  "Other",
];

/**
 * Exercises hidden from the manual PR dropdown to avoid duplicate aliases.
 */
export const PR_EXERCISES_TO_HIDE = [
  "reverse fly",
  "tricep extension",
  "tricep pushdown",
  "squat",
  "biceps curl",
];
