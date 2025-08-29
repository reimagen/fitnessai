
import type { Exercise, WorkoutLog, UserProfile } from './types';

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
  
  return totalMinutes / totalMiles;
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
    if (!distance) return 0;
    switch (unit) {
        case 'mi': return distance;
        case 'km': return distance * 0.621371;
        case 'ft': return distance * 0.000189394;
        case 'm': return distance * 0.000621371;
        default: return distance; // Fallback to assuming miles if unit is undefined
    }
};


export function calculateExerciseCalories(
  exercise: Omit<Exercise, 'id'>,
  userProfile: UserProfile,
  workoutLogs: WorkoutLog[] = []
): number {
    // If calories are already provided and valid, return them.
    if (exercise.calories && exercise.calories > 0) {
        return exercise.calories;
    }

    // Only calculate for Cardio exercises
    if (exercise.category !== 'Cardio') {
        return 0;
    }

    // We need weight to calculate calories.
    if (!userProfile.weightValue || userProfile.weightValue <= 0) {
        return 0;
    }

    let { name, distance, distanceUnit, duration, durationUnit } = exercise;

    // We need distance or duration to do anything.
    if ((!distance || distance <= 0) && (!duration || duration <= 0)) {
        return 0;
    }

    // Convert weight to kg for the formula
    const weightInKg = userProfile.weightUnit === 'lbs' 
        ? (userProfile.weightValue || 0) * 0.453592 
        : (userProfile.weightValue || 0);

    let metValue: number | null = null;
    let durationInHours: number | null = null;
    
    // Always calculate distance in miles if distance is provided, for use in estimations.
    const distanceInMiles = getDistanceInMiles(distance, distanceUnit);

    if (duration && duration > 0) {
        let durationInMinutes = 0;
        switch (durationUnit) {
            case 'hr': durationInMinutes = duration * 60; break;
            case 'sec': durationInMinutes = duration / 60; break;
            default: durationInMinutes = duration; break; // Assumes 'min'
        }
        durationInHours = durationInMinutes / 60;
    }

    const exerciseName = name.toLowerCase();

    // --- Determine MET value and duration in hours ---
    if (exerciseName.includes('run') || exerciseName.includes('treadmill') || exerciseName.includes('walk') || exerciseName.includes('elliptical')) {
        if (distanceInMiles <= 0) return 0; // Running/walking needs distance

        let paceMinPerMile: number;

        if (durationInHours !== null) {
            paceMinPerMile = (durationInHours * 60) / distanceInMiles;
        } else {
            const isRunning = exerciseName.includes('run') || exerciseName.includes('treadmill') || exerciseName.includes('elliptical');
            const avgPace = getAveragePace(workoutLogs, isRunning ? 'run' : 'walk');
            const estimatedDurationMinutes = distanceInMiles * avgPace;
            durationInHours = estimatedDurationMinutes / 60;
            paceMinPerMile = avgPace;
        }

        const metTable = (exerciseName.includes('walk') && !exerciseName.includes('treadmill') && !exerciseName.includes('elliptical')) ? WALKING_METS : RUNNING_METS;
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
        // For climbmill, we ONLY rely on duration. Distance is ignored for calorie calculation.
    }

    if (!metValue) return 0;
    if (durationInHours === null || durationInHours <= 0) return 0; // Can't calculate without duration

    // Calories burned = METs × Body Weight (kg) × Duration (hours)
    const caloriesBurned = metValue * weightInKg * durationInHours;
    
    return Math.round(caloriesBurned);
}
