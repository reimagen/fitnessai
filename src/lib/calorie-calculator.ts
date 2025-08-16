
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

// A simplified MET value for general, moderate intensity rowing.
// A more complex implementation could vary this based on strokes per minute or power output.
const ROWING_MET_VALUE = 7.0;

const DEFAULT_AVG_RUNNING_PACE_MIN_PER_MILE = 10; // 10 min/mile as a fallback for running
const DEFAULT_AVG_WALKING_PACE_MIN_PER_MILE = 20; // 20 min/mile as a fallback for walking

function getAveragePace(workoutLogs: WorkoutLog[], activity: 'run' | 'walk'): number {
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
    let durationInHours: number;

    const exerciseName = name.toLowerCase();

    // --- Determine MET value and duration in hours ---
    if (exerciseName.includes('run') || exerciseName.includes('treadmill') || exerciseName.includes('walk')) {
        if (!distance || distance <= 0) return 0; // Running/walking needs distance

        let distanceInMiles = distance;
        if (distanceUnit === 'km') distanceInMiles = distance * 0.621371;
        else if (distanceUnit === 'ft') distanceInMiles = distance / 5280;

        let paceMinPerMile: number;

        if (duration && duration > 0 && durationUnit) {
            let durationInMinutes = 0;
            switch (durationUnit) {
                case 'hr': durationInMinutes = duration * 60; break;
                case 'sec': durationInMinutes = duration / 60; break;
                default: durationInMinutes = duration; break; // Assumes 'min'
            }
            durationInHours = durationInMinutes / 60;
            paceMinPerMile = durationInMinutes / distanceInMiles;
        } else {
            const isRunning = exerciseName.includes('run') || exerciseName.includes('treadmill');
            const avgPace = getAveragePace(workoutLogs, isRunning ? 'run' : 'walk');
            const estimatedDurationMinutes = distanceInMiles * avgPace;
            durationInHours = estimatedDurationMinutes / 60;
            paceMinPerMile = avgPace;
        }

        const metTable = exerciseName.includes('walk') ? WALKING_METS : RUNNING_METS;
        metValue = getMetForPace(paceMinPerMile, metTable);

    } else if (exerciseName.includes('rowing')) {
        if (!duration || duration <= 0) return 0; // Rowing needs duration
        
        let durationInMinutes = 0;
        switch (durationUnit) {
            case 'hr': durationInMinutes = duration * 60; break;
            case 'sec': durationInMinutes = duration / 60; break;
            default: durationInMinutes = duration; break;
        }
        durationInHours = durationInMinutes / 60;
        metValue = ROWING_MET_VALUE;

    } else {
        // For other cardio like cycling, etc., we'd need more specific MET tables.
        // For now, return 0 if it's not a supported auto-calculation type.
        return 0;
    }

    if (!metValue) return 0;

    // Calories burned = METs × Body Weight (kg) × Duration (hours)
    const caloriesBurned = metValue * weightInKg * durationInHours;
    
    return Math.round(caloriesBurned);
}
