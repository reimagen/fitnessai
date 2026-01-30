
import type { PersonalRecord, WorkoutLog } from "@/lib/types";
import { getNormalizedExerciseName } from "@/lib/strength-standards";
import { subWeeks, isAfter } from 'date-fns';

export type ImbalanceType = 'Horizontal Push vs. Pull' | 'Vertical Push vs. Pull' | 'Hamstring vs. Quad' | 'Adductor vs. Abductor';

export const IMBALANCE_TYPES: ImbalanceType[] = [
    'Horizontal Push vs. Pull',
    'Vertical Push vs. Pull',
    'Hamstring vs. Quad',
    'Adductor vs. Abductor',
];

export const IMBALANCE_CONFIG: Record<ImbalanceType, { lift1Options: string[], lift2Options: string[], ratioCalculation: (l1: number, l2: number) => number }> = {
    'Horizontal Push vs. Pull': { lift1Options: ['chest press'], lift2Options: ['seated row'], ratioCalculation: (l1, l2) => l1/l2 },
    'Vertical Push vs. Pull': { lift1Options: ['shoulder press'], lift2Options: ['lat pulldown'], ratioCalculation: (l1, l2) => l1/l2 },
    'Hamstring vs. Quad': { lift1Options: ['leg curl'], lift2Options: ['leg extension'], ratioCalculation: (l1, l2) => l1/l2 },
    'Adductor vs. Abductor': { lift1Options: ['adductor'], lift2Options: ['abductor'], ratioCalculation: (l1, l2) => l1/l2 },
};

// Helper to find the best PR for a given list of exercises (moved from page.tsx)
export function findBestPr(records: PersonalRecord[], exerciseNames: string[]): PersonalRecord | null {
    const searchNames = [...exerciseNames];

    const relevantRecords = records.filter(r => searchNames.some(name => getNormalizedExerciseName(r.exerciseName) === name.trim().toLowerCase()));
    if (relevantRecords.length === 0) return null;

    return relevantRecords.reduce((best, current) => {
        const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
        const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
        return currentWeightKg > bestWeightKg ? current : best;
    });
}

// Helper interface for 6-week average e1RM calculation
interface AvgE1RMResult {
  avgE1RM: number;        // Average e1RM in kg
  exerciseName: string;   // Actual exercise name used
  sessionCount: number;   // Number of workout sessions
  displayUnit: 'kg' | 'lbs';  // Most common unit
}

// Calculate average e1RM from workout logs for specified exercises
export function calculateAvgE1RM(
  workoutLogs: WorkoutLog[],
  exerciseNameOptions: string[],
  weeksBack: number = 6
): AvgE1RMResult | null {
  const cutoffDate = subWeeks(new Date(), weeksBack);
  const e1RMs: number[] = [];
  let exerciseNameUsed = '';
  const unitCounts: Record<string, number> = { kg: 0, lbs: 0 };

  workoutLogs.forEach(log => {
    if (!isAfter(log.date, cutoffDate)) return;

    log.exercises.forEach(ex => {
      const normalizedName = getNormalizedExerciseName(ex.name);
      const matchesExercise = exerciseNameOptions.some(
        opt => opt.trim().toLowerCase() === normalizedName
      );

      if (matchesExercise && ex.weight && ex.reps && ex.weight > 0 && ex.reps > 0) {
        // Track exercise name and unit
        if (!exerciseNameUsed) exerciseNameUsed = ex.name;
        const unit = ex.weightUnit || 'lbs';
        unitCounts[unit]++;

        // Convert to kg for calculation
        const weightKg = unit === 'lbs' ? ex.weight * 0.453592 : ex.weight;

        // Calculate e1RM using Epley formula
        const e1RM = ex.reps === 1 ? weightKg : weightKg * (1 + ex.reps / 30);
        e1RMs.push(e1RM);
      }
    });
  });

  if (e1RMs.length === 0) return null;

  // Calculate average
  const avgE1RM = e1RMs.reduce((sum, val) => sum + val, 0) / e1RMs.length;

  // Determine most common unit
  const displayUnit = (unitCounts.kg > unitCounts.lbs) ? 'kg' : 'lbs';

  return {
    avgE1RM,
    exerciseName: exerciseNameUsed,
    sessionCount: e1RMs.length,
    displayUnit,
  };
}

// Get 6-week average e1RM for specified exercises
export function find6WeekAvgE1RM(
  workoutLogs: WorkoutLog[],
  exerciseNameOptions: string[]
): { exerciseName: string; weight: number; weightUnit: 'kg' | 'lbs'; sessionCount: number } | null {
  const result = calculateAvgE1RM(workoutLogs, exerciseNameOptions, 6);
  if (!result) return null;

  // Convert to display unit
  const displayWeight = result.displayUnit === 'lbs'
    ? result.avgE1RM * 2.20462
    : result.avgE1RM;

  return {
    exerciseName: result.exerciseName,
    weight: displayWeight,
    weightUnit: result.displayUnit,
    sessionCount: result.sessionCount,
  };
}

// Helper to convert a string to title case (moved from page.tsx)
