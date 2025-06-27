
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

const DEFAULT_AVG_PACE_MIN_PER_MILE = 10; // 10 min/mile as a fallback

function getAveragePace(workoutLogs: WorkoutLog[]): number {
  const runningExercises: { distance: number; duration: number }[] = [];

  workoutLogs.forEach(log => {
    log.exercises.forEach(ex => {
      // For simplicity, we'll only use miles and minutes from past logs to calculate an average.
      // A more complex implementation could convert all units.
      if (
        ex.category === 'Cardio' &&
        ex.distance && ex.distance > 0 &&
        ex.duration && ex.duration > 0 &&
        ex.distanceUnit === 'mi' &&
        ex.durationUnit === 'min'
      ) {
        runningExercises.push({ distance: ex.distance, duration: ex.duration });
      }
    });
  });

  if (runningExercises.length === 0) {
    return DEFAULT_AVG_PACE_MIN_PER_MILE;
  }

  const totalMinutes = runningExercises.reduce((sum, ex) => sum + ex.duration, 0);
  const totalMiles = runningExercises.reduce((sum, ex) => sum + ex.distance, 0);
  
  return totalMinutes / totalMiles;
}

function getMetForPace(paceMinPerMile: number): number {
    const speedMph = 60 / paceMinPerMile;
    // Find the closest MET value from our table
    const closestSpeed = Object.keys(RUNNING_METS)
        .map(Number)
        .reduce((prev, curr) => (Math.abs(curr - speedMph) < Math.abs(prev - speedMph) ? curr : prev));
    return RUNNING_METS[closestSpeed];
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

    let { distance, distanceUnit, duration, durationUnit } = exercise;

    // We need distance to do anything.
    if (!distance || distance <= 0) {
        return 0;
    }

    // Convert weight to kg for the formula
    const weightInKg = userProfile.weightUnit === 'lbs' 
        ? (userProfile.weightValue || 0) * 0.453592 
        : (userProfile.weightValue || 0);

    // Convert distance to miles for pace calculation
    let distanceInMiles = distance;
    if (distanceUnit === 'km') {
        distanceInMiles = distance * 0.621371;
    } else if (distanceUnit === 'ft') {
        distanceInMiles = distance / 5280;
    }

    let durationInHours: number;
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
        // Estimate duration if not provided
        const avgPace = getAveragePace(workoutLogs);
        const estimatedDurationMinutes = distanceInMiles * avgPace;
        durationInHours = estimatedDurationMinutes / 60;
        paceMinPerMile = avgPace;
    }

    const metValue = getMetForPace(paceMinPerMile);

    // Calories burned = METs × Body Weight (kg) × Duration (hours)
    const caloriesBurned = metValue * weightInKg * durationInHours;
    
    return Math.round(caloriesBurned);
}
