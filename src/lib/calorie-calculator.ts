
import type { Exercise, WorkoutLog, UserProfile, ExperienceLevel } from './types';
import {
  CDC_RECOMMENDED_CARDIO_MINUTES,
  MODERATE_CARDIO_MET_VALUE,
  DEFAULT_STRETCH_MULTIPLIER,
  EXPERIENCE_LEVEL_MULTIPLIERS,
  WORKOUTS_PER_WEEK_MULTIPLIERS,
  LBS_TO_KG,
} from './constants';

// MET values for running at different speeds (mph)
// Source: Compendium of Physical Activities (Ainsworth et al.)
const RUNNING_METS: { [speedMph: number]: number } = {
  4: 6.0,   // 4 mph (15 min/mile)
  5: 8.3,   // 5 mph (12 min/mile)
  5.2: 9.0, // ~5 mph (11.5 min/mile)
  6: 9.8,   // 6 mph (10 min/mile)
  6.7: 10.5, // ~6.5 mph (9 min/mile)
  7: 11.0,  // 7 mph (8.5 min/mile)
  7.5: 11.5, // ~7.5 mph (8 min/mile)
  8: 11.8,  // 8 mph (7.5 min/mile)
  8.6: 12.3, // ~8.5 mph (7 min/mile)
  9: 12.8,  // 9 mph (6.5 min/mile)
  10: 14.5, // 10 mph (6 min/mile)
};

// MET values for walking at different speeds (mph)
// Source: Compendium of Physical Activities (Ainsworth et al.)
const WALKING_METS: { [speedMph: number]: number } = {
  2.0: 2.8, // 30 min/mile
  2.5: 3.0, // 24 min/mile
  3.0: 3.5, // 20 min/mile
  3.5: 4.3, // 17 min/mile
  4.0: 5.0, // 15 min/mile
  4.5: 7.0, // ~13.3 min/mile
};

// Simplified MET values for other activities
const ROWING_MET_VALUE = 7.0; // General, moderate intensity
const CYCLING_MET_VALUE = 8.0; // General, moderate intensity (approx 12-14 mph)
const SWIMMING_MET_VALUE = 7.0; // General, freestyle, moderate effort
const CLIMBMILL_MET_VALUE = 9.0; // Stairmaster / Climbmill

// Strength exercise calorie factors (calories per 100 lbs moved)
// Accounts for exercise type and muscle group involved
const STRENGTH_CALORIE_FACTORS: { [key: string]: number } = {
  // Compound Lower Body (higher calorie burn due to large muscle groups)
  'squat': 0.65,
  'leg press': 0.65,
  'deadlift': 0.70,
  'leg curl': 0.50,
  'leg extension': 0.45,
  'lunges': 0.60,
  'bulgarian split squat': 0.60,
  'hack squat': 0.60,
  'smith machine squat': 0.60,
  'leg raise': 0.40,
  'calf raise': 0.30,

  // Compound Upper Body Push
  'bench press': 0.45,
  'incline bench': 0.45,
  'dumbbell bench press': 0.45,
  'push-ups': 0.40,
  'shoulder press': 0.50,
  'military press': 0.50,
  'overhead press': 0.50,
  'dips': 0.50,

  // Compound Upper Body Pull
  'pull-ups': 0.50,
  'pull up': 0.50,
  'pullup': 0.50,
  'chin-ups': 0.50,
  'chin up': 0.50,
  'chinup': 0.50,
  'rows': 0.45,
  'barbell row': 0.50,
  'dumbbell row': 0.45,
  'lat pulldown': 0.40,
  'cable row': 0.40,

  // Isolation exercises (lower calorie burn)
  'bicep curl': 0.25,
  'tricep': 0.25,
  'lateral raise': 0.20,
  'front raise': 0.20,
  'face pull': 0.25,
  'cable': 0.25,
  'machine': 0.30,
};

const DEFAULT_STRENGTH_CALORIE_FACTOR = 0.40; // Default for unrecognized exercises

// --- Fallback pace constants ---
const DEFAULT_AVG_RUNNING_PACE_MIN_PER_MILE = 10; // 10 min/mile
const DEFAULT_AVG_WALKING_PACE_MIN_PER_MILE = 20; // 20 min/mile
const DEFAULT_CYCLING_SPEED_MPH = 12.5; // Moderate cycling speed
const DEFAULT_ROWING_PACE_SEC_PER_500M = 150; // 2:30 per 500m
const DEFAULT_SWIMMING_PACE_SEC_PER_100M = 150; // 2:30 per 100m

function getAveragePace(workoutLogs: WorkoutLog[], activity: 'run' | 'walk'): number {
  if (!workoutLogs || workoutLogs.length === 0) {
      return activity === 'run' ? DEFAULT_AVG_RUNNING_PACE_MIN_PER_MILE : DEFAULT_AVG_WALKING_PACE_MIN_PER_MILE;
  }
  
  const exercises: { distance: number; duration: number }[] = [];

  const activityKeywords = activity === 'run' ? ['run', 'treadmill'] : ['walk'];

  workoutLogs.forEach(log => {
    log.exercises.forEach(ex => {
      const exNameLower = ex.name.toLowerCase();
      if (
        ex.category === 'Cardio' &&
        ex.distance && ex.distance > 0 &&
        ex.duration && ex.duration > 0 &&
        ex.distanceUnit === 'mi' &&
        ex.durationUnit === 'min' &&
        activityKeywords.some(keyword => exNameLower.includes(keyword))
      ) {
        exercises.push({ distance: ex.distance, duration: ex.duration });
      }
    });
  });

  if (exercises.length === 0) {
    return activity === 'run' ? DEFAULT_AVG_RUNNING_PACE_MIN_PER_MILE : DEFAULT_AVG_WALKING_PACE_MIN_PER_MILE;
  }

  const totalMinutes = exercises.reduce((sum, ex) => sum + ex.duration, 0);
  const totalMiles = exercises.reduce((sum, ex) => sum + ex.distance, 0);
  
  // Pace is minutes per mile
  return totalMiles > 0 ? totalMinutes / totalMiles : (activity === 'run' ? DEFAULT_AVG_RUNNING_PACE_MIN_PER_MILE : DEFAULT_AVG_WALKING_PACE_MIN_PER_MILE);
}

function getMetForPace(paceMinPerMile: number, metTable: { [speed: number]: number }): number {
    const speedMph = 60 / paceMinPerMile;
    // Find the closest MET value from our table
    const closestSpeed = Object.keys(metTable)
        .map(Number)
        .reduce((prev, curr) => (Math.abs(curr - speedMph) < Math.abs(prev - speedMph) ? curr : prev));
    return metTable[closestSpeed];
}

const getDistanceInMiles = (distance?: number, unit?: Exercise['distanceUnit']): number => {
    if (!distance || distance <= 0) return 0;
    switch (unit) {
        case 'mi': return distance;
        case 'km': return distance * 0.621371;
        case 'ft': return distance * 0.000189394;
        case 'm': return distance * 0.000621371;
        default: return 0;
    }
};

function getStrengthCalorieFactor(exerciseName: string): number {
    const nameLower = exerciseName.toLowerCase();

    // Check for exact matches or keywords
    for (const [key, factor] of Object.entries(STRENGTH_CALORIE_FACTORS)) {
        if (nameLower.includes(key)) {
            return factor;
        }
    }

    return DEFAULT_STRENGTH_CALORIE_FACTOR;
}

// Estimate seconds per rep based on rep count and typical tempo
// Lower reps = slower, more controlled reps
// Higher reps = faster, lighter weight reps
function estimateSecPerRep(reps: number): number {
    if (reps <= 5) return 4;      // Heavy strength: ~4 sec/rep
    if (reps <= 8) return 3.5;    // Hypertrophy: ~3.5 sec/rep
    if (reps <= 12) return 3;     // Hypertrophy-endurance: ~3 sec/rep
    if (reps <= 15) return 2.5;   // Higher reps: ~2.5 sec/rep
    return 2;                      // Very high reps: ~2 sec/rep
}

// Estimate rest period (in seconds) based on rep scheme
// Heavier/lower reps = longer rest; lighter/higher reps = shorter rest
function estimateRestSeconds(reps: number): number {
    if (reps <= 5) return 180;    // Heavy strength: 3 min
    if (reps <= 8) return 90;     // Hypertrophy: 1.5 min
    if (reps <= 12) return 75;    // Hypertrophy: 1.25 min
    if (reps <= 15) return 60;    // Higher reps: 1 min
    return 45;                     // Very high reps: 45 sec
}

// Estimate MET value for strength exercise based on weight and intensity
// Strength training is typically 3-9 METs depending on type and intensity
function estimateStrengthMET(exerciseName: string, baseFactor: number): number {
    const nameLower = exerciseName.toLowerCase();

    // Bodyweight exercises (pull-ups, chin-ups, dips, push-ups) are more metabolically demanding
    // These use your full body weight with less mechanical advantage, so higher METs
    const isBodyweight =
        nameLower.includes('pull-up') || nameLower.includes('pull up') || nameLower.includes('pullup') ||
        nameLower.includes('chin-up') || nameLower.includes('chin up') || nameLower.includes('chinup') ||
        nameLower.includes('dip') ||
        nameLower.includes('push-up') || nameLower.includes('push up') || nameLower.includes('pushup');

    if (isBodyweight) {
        // Bodyweight exercises: 6-9 METs depending on reps/difficulty
        // Vigorous bodyweight pulling/dipping: ~8-9 METs
        return 8.5;
    }

    // Weighted exercises: map factor (0.2-0.7) to METs (3-7)
    // Higher factor = higher intensity = higher METs
    const metValue = 3 + (baseFactor * 5.7); // Maps 0.2->3.14, 0.7->7
    return Math.min(7, Math.max(3, metValue)); // Clamp between 3-7
}

function calculateStrengthExerciseCalories(
    exercise: Omit<Exercise, 'id'>,
    userProfile: UserProfile
): number {
    // Strength exercises require: reps and sets
    if (!exercise.reps || exercise.reps <= 0 || !exercise.sets || exercise.sets <= 0) {
        return 0;
    }

    if (!userProfile.weightValue || userProfile.weightValue <= 0 || !userProfile.gender) {
        return 0;
    }

    // Convert user weight to kg for MET calculation
    const userWeightKg = userProfile.weightUnit === 'kg'
        ? (userProfile.weightValue || 0)
        : (userProfile.weightValue || 0) * 0.453592;

    // Convert user weight to lbs for multiplier calculation
    const userWeightLbs = userWeightKg * 2.20462;

    // For bodyweight exercises (pull-ups, chin-ups, dips, etc.), use user's body weight
    // Otherwise use the exercise weight
    const nameLower = exercise.name.toLowerCase();
    const isBodyweightExercise =
        nameLower.includes('pull-up') ||
        nameLower.includes('pull up') ||
        nameLower.includes('pullup') ||
        nameLower.includes('chin-up') ||
        nameLower.includes('chin up') ||
        nameLower.includes('chinup') ||
        nameLower.includes('dip') ||
        nameLower.includes('push-up') ||
        nameLower.includes('push up') ||
        nameLower.includes('pushup');

    const exerciseWeightLbs = isBodyweightExercise
        ? userWeightLbs
        : (exercise.weight || 0) > 0
            ? (exercise.weightUnit === 'kg'
                ? (exercise.weight || 0) * 2.20462
                : (exercise.weight || 0))
            : 0;

    // If still no weight and not bodyweight, can't calculate
    if (exerciseWeightLbs <= 0) {
        return 0;
    }

    // Estimate duration based on rep scheme
    const secPerRep = estimateSecPerRep(exercise.reps);
    const workTimeSeconds = secPerRep * exercise.reps * exercise.sets;
    const restSeconds = estimateRestSeconds(exercise.reps) * (exercise.sets - 1); // No rest after last set

    // For strength training, only count work time at high METs
    // Rest periods are at low metabolic rate (~1.5 METs, light activity)
    const workTimeHours = workTimeSeconds / 3600;
    const restTimeHours = restSeconds / 3600;

    // Get exercise-specific calorie factor and convert to METs
    const baseFactor = getStrengthCalorieFactor(exercise.name);
    const metValue = estimateStrengthMET(exercise.name, baseFactor);

    // Adjust for gender (women burn ~8% fewer calories)
    const genderMultiplier = userProfile.gender.toLowerCase() === 'female' ? 0.92 : 1.0;

    // Calculate calories: work time at full intensity + rest time at low intensity
    // Rest periods burn at ~1.5 METs (light activity/active recovery)
    const workCalories = metValue * userWeightKg * workTimeHours * genderMultiplier;
    const restCalories = 1.5 * userWeightKg * restTimeHours * genderMultiplier;
    const caloriesBurned = workCalories + restCalories;

    return Math.round(caloriesBurned);
}


export function calculateExerciseCalories(
  exercise: Omit<Exercise, 'id'>,
  userProfile: UserProfile,
  workoutLogs: WorkoutLog[] = []
): number {
    if (exercise.calories && exercise.calories > 0) {
        return exercise.calories;
    }

    // Calculate strength exercise calories (non-cardio)
    if (exercise.category !== 'Cardio') {
        return calculateStrengthExerciseCalories(exercise, userProfile);
    }

    if (!userProfile.weightValue || userProfile.weightValue <= 0) {
        return 0;
    }

    const { name, distance, distanceUnit, duration, durationUnit } = exercise;

    const weightInKg = userProfile.weightUnit === 'lbs' 
        ? (userProfile.weightValue || 0) * 0.453592 
        : (userProfile.weightValue || 0);

    let metValue: number | null = null;
    let durationInHours: number | null = null;
    
    // Standardize distance to miles first.
    const distanceInMiles = getDistanceInMiles(distance, distanceUnit);

    if (duration && duration > 0) {
        let durationInMinutes = 0;
        switch (durationUnit) {
            case 'hr': durationInMinutes = duration * 60; break;
            case 'sec': durationInMinutes = duration / 60; break;
            default: durationInMinutes = duration; break;
        }
        durationInHours = durationInMinutes / 60;
    }

    const exerciseName = name.toLowerCase();

    // Refactored logic to handle all cardio types in one block
    if (exerciseName.includes('run') || exerciseName.includes('treadmill') || exerciseName.includes('walk') || exerciseName.includes('elliptical')) {
        if (distanceInMiles <= 0) return 0; 
        let paceMinPerMile: number;
        if (!durationInHours) {
            const isRunning = exerciseName.includes('run') || exerciseName.includes('treadmill') || exerciseName.includes('elliptical');
            const avgPace = getAveragePace(workoutLogs, isRunning ? 'run' : 'walk');
            const estimatedDurationMinutes = distanceInMiles * avgPace;
            durationInHours = estimatedDurationMinutes / 60;
            paceMinPerMile = avgPace;
        } else {
            paceMinPerMile = (durationInHours * 60) / distanceInMiles;
        }
        const metTable = (paceMinPerMile > 15) ? WALKING_METS : RUNNING_METS;
        metValue = getMetForPace(paceMinPerMile, metTable);
    
    } else if (exerciseName.includes('rowing')) {
        metValue = ROWING_MET_VALUE;
        if (!durationInHours && distanceInMiles > 0) {
            const distanceInMeters = distanceInMiles * 1609.34;
            const estimatedDurationSeconds = (distanceInMeters / 500) * DEFAULT_ROWING_PACE_SEC_PER_500M;
            durationInHours = estimatedDurationSeconds / 3600;
        }
    } else if (exerciseName.includes('cycle') || exerciseName.includes('bike')) {
        metValue = CYCLING_MET_VALUE;
        if (!durationInHours && distanceInMiles > 0) {
            durationInHours = distanceInMiles / DEFAULT_CYCLING_SPEED_MPH;
        }
    } else if (exerciseName.includes('swim')) {
        metValue = SWIMMING_MET_VALUE;
        if (!durationInHours && distanceInMiles > 0) {
            const distanceInMeters = distanceInMiles * 1609.34;
            const estimatedDurationSeconds = (distanceInMeters / 100) * DEFAULT_SWIMMING_PACE_SEC_PER_100M;
            durationInHours = estimatedDurationSeconds / 3600;
        }
    } else if (exerciseName.includes('climbmill') || exerciseName.includes('stairmaster')) {
        metValue = CLIMBMILL_MET_VALUE;
        // No duration estimation from distance for climbmill. Requires duration input.
    }


    if (!metValue || !durationInHours || durationInHours <= 0) {
        return 0;
    }

    const caloriesBurned = metValue * weightInKg * durationInHours;

    return Math.round(caloriesBurned);
}

/**
 * Analyzes fitness goals text to determine cardio-related multiplier
 * Looks for keywords to adjust calorie targets based on user's fitness priorities
 */
function analyzeGoalsForCardioFactor(fitnessGoals?: { description: string; isPrimary?: boolean }[]): number {
  if (!fitnessGoals || fitnessGoals.length === 0) {
    return 1.0;
  }

  const goalsText = fitnessGoals
    .map(goal => goal.description.toLowerCase())
    .join(' ');

  // Check for weight loss goals (1.2x multiplier)
  if (goalsText.includes('weight loss') || goalsText.includes('lose weight') || goalsText.includes('fat loss')) {
    return 1.2;
  }

  // Check for endurance/cardio focused goals (1.4x multiplier)
  if (
    goalsText.includes('endurance') ||
    goalsText.includes('cardio') ||
    goalsText.includes('stamina') ||
    goalsText.includes('marathon') ||
    goalsText.includes('run faster')
  ) {
    return 1.4;
  }

  // Check for strength-only goals (0.8x multiplier)
  if (
    goalsText.includes('strength') &&
    !goalsText.includes('cardio') &&
    !goalsText.includes('endurance')
  ) {
    return 0.8;
  }

  return 1.0;
}

export interface WeeklyCardioTargets {
  baseTarget: number;
  stretchTarget: number;
}

/**
 * Calculates weekly cardio calorie targets based on CDC health guidelines
 * Formula: (150 min/week) × (5 METs) × (weight in kg) / 60
 *
 * Adjustments applied:
 * - Experience level multiplier (beginner: 1.0x, intermediate: 1.15x, advanced: 1.3x)
 * - Fitness goal multiplier (strength-only: 0.8x, weight loss: 1.2x, endurance: 1.4x)
 * - Workouts per week multiplier (< 3: 0.85x, >= 5: 1.1x)
 * - Stretch target: baseTarget × stretchGoalMultiplier
 *
 * Returns null if insufficient data (no weight set)
 */
export function calculateWeeklyCardioTarget(userProfile: UserProfile): WeeklyCardioTargets | null {
  // Require weight to be set
  if (!userProfile.weightValue || userProfile.weightValue <= 0) {
    return null;
  }

  // Convert weight to kg
  const weightKg = userProfile.weightUnit === 'kg'
    ? userProfile.weightValue
    : userProfile.weightValue * LBS_TO_KG;

  // Start with base calculation: 150 min/week × 5 METs × weight(kg) / 60
  let baseCalories = (CDC_RECOMMENDED_CARDIO_MINUTES * MODERATE_CARDIO_MET_VALUE * weightKg) / 60;

  // Apply experience level multiplier
  const experienceLevel = userProfile.experienceLevel || 'intermediate';
  const expMultiplier = EXPERIENCE_LEVEL_MULTIPLIERS[experienceLevel as keyof typeof EXPERIENCE_LEVEL_MULTIPLIERS] || 1.15;
  baseCalories *= expMultiplier;

  // Apply fitness goal multiplier
  const goalMultiplier = analyzeGoalsForCardioFactor(userProfile.fitnessGoals);
  baseCalories *= goalMultiplier;

  // Apply workouts per week multiplier
  const workoutsPerWeek = userProfile.workoutsPerWeek ?? 3;
  if (workoutsPerWeek < 3) {
    baseCalories *= WORKOUTS_PER_WEEK_MULTIPLIERS.low;
  } else if (workoutsPerWeek >= 5) {
    baseCalories *= WORKOUTS_PER_WEEK_MULTIPLIERS.high;
  }

  // Calculate stretch target using multiplier
  const stretchMultiplier = userProfile.stretchGoalMultiplier ?? DEFAULT_STRETCH_MULTIPLIER;
  const clampedMultiplier = Math.max(1.0, Math.min(2.0, stretchMultiplier)); // Clamp to 1.0-2.0
  const stretchCalories = baseCalories * clampedMultiplier;

  return {
    baseTarget: Math.round(baseCalories),
    stretchTarget: Math.round(stretchCalories),
  };
}
