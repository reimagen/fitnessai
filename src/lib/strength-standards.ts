import type { PersonalRecord, UserProfile, StrengthLevel } from './types';

const LBS_TO_KG = 0.453592;

type StrengthStandardRatios = {
  intermediate: number;
  advanced: number;
  elite: number;
};

type GenderStandards = {
  Male: StrengthStandardRatios;
  Female: StrengthStandardRatios;
};

// Ratios are defined as: (Weight Lifted in KG) / (Skeletal Muscle Mass in KG)
const strengthStandards: Record<string, GenderStandards> = {
  'abdominal crunch': {
    'Male':   { intermediate: 1.0, advanced: 1.3, elite: 1.6 },
    'Female': { intermediate: 0.9, advanced: 1.2, elite: 1.5 },
  },
  'abductor': {
    'Male':   { intermediate: 1.2, advanced: 1.6, elite: 2.0 },
    'Female': { intermediate: 1.4, advanced: 1.8, elite: 2.2 },
  },
  'adductor': {
    'Male':   { intermediate: 1.2, advanced: 1.6, elite: 2.0 },
    'Female': { intermediate: 1.4, advanced: 1.8, elite: 2.2 },
  },
  'back extension': {
    'Male':   { intermediate: 1.1, advanced: 1.4, elite: 1.7 },
    'Female': { intermediate: 1.0, advanced: 1.3, elite: 1.6 },
  },
  'bench press': {
    'Male':   { intermediate: 2.2, advanced: 2.7, elite: 3.2 },
    'Female': { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
  },
  'bicep curl': {
    'Male': { intermediate: 0.6, advanced: 0.8, elite: 1.0 },
    'Female': { intermediate: 0.5, advanced: 0.7, elite: 0.9 },
  },
  'butterfly': {
    'Male': { intermediate: 1.0, advanced: 1.3, elite: 1.6 },
    'Female': { intermediate: 0.8, advanced: 1.1, elite: 1.4 },
  },
  'chest press': { // Using same as bench press
    'Male':   { intermediate: 2.2, advanced: 2.7, elite: 3.2 },
    'Female': { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
  },
  'glutes': {
    'Male': { intermediate: 2.0, advanced: 2.5, elite: 3.0 },
    'Female': { intermediate: 2.2, advanced: 2.8, elite: 3.4 },
  },
  'hip thrust': {
    'Male': { intermediate: 3.5, advanced: 4.5, elite: 5.5 },
    'Female': { intermediate: 3.0, advanced: 4.0, elite: 5.0 },
  },
  'lat pulldown': {
      'Male': { intermediate: 2.5, advanced: 3.0, elite: 3.5 },
      'Female': { intermediate: 1.8, advanced: 2.3, elite: 2.8 },
  },
  'leg curl': {
    'Male':   { intermediate: 1.0, advanced: 1.4, elite: 1.8 },
    'Female': { intermediate: 0.8, advanced: 1.2, elite: 1.6 },
  },
  'leg extension': {
    'Male':   { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
    'Female': { intermediate: 1.0, advanced: 1.5, elite: 2.0 },
  },
  'leg press': {
    'Male':   { intermediate: 5.0, advanced: 6.5, elite: 8.0 },
    'Female': { intermediate: 4.0, advanced: 5.5, elite: 7.0 },
  },
  'overhead press': {
    'Male':   { intermediate: 1.5, advanced: 1.8, elite: 2.2 },
    'Female': { intermediate: 1.0, advanced: 1.3, elite: 1.6 },
  },
  'reverse fly': {
    'Male': { intermediate: 0.4, advanced: 0.6, elite: 0.8 },
    'Female': { intermediate: 0.3, advanced: 0.5, elite: 0.7 },
  },
  'reverse flys': {
    'Male': { intermediate: 0.4, advanced: 0.6, elite: 0.8 },
    'Female': { intermediate: 0.3, advanced: 0.5, elite: 0.7 },
  },
  'rotary torso': {
    'Male':   { intermediate: 0.8, advanced: 1.0, elite: 1.2 },
    'Female': { intermediate: 0.7, advanced: 0.9, elite: 1.1 },
  },
  'seated row': {
    'Male': { intermediate: 2.2, advanced: 2.7, elite: 3.2 },
    'Female': { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
  },
  'shoulder press': { // Using same as overhead press
    'Male':   { intermediate: 1.5, advanced: 1.8, elite: 2.2 },
    'Female': { intermediate: 1.0, advanced: 1.3, elite: 1.6 },
  },
  'squat': {
    'Male':   { intermediate: 3.0, advanced: 4.0, elite: 5.0 },
    'Female': { intermediate: 2.5, advanced: 3.5, elite: 4.5 },
  },
  'tricep extension': {
    'Male': { intermediate: 0.8, advanced: 1.1, elite: 1.4 },
    'Female': { intermediate: 0.6, advanced: 0.9, elite: 1.2 },
  },
  'tricep pushdown': {
    'Male': { intermediate: 0.8, advanced: 1.1, elite: 1.4 },
    'Female': { intermediate: 0.6, advanced: 0.9, elite: 1.2 },
  },
  'triceps': {
    'Male': { intermediate: 0.8, advanced: 1.1, elite: 1.4 },
    'Female': { intermediate: 0.6, advanced: 0.9, elite: 1.2 },
  },
};

/**
 * Calculates a strength level classification for a given personal record.
 * @param record The personal record to classify.
 * @param profile The user's profile containing necessary stats.
 * @returns A StrengthLevel ('Beginner', 'Intermediate', 'Advanced', 'Elite', or 'N/A').
 */
export function getStrengthLevel(
  record: PersonalRecord,
  profile: UserProfile
): StrengthLevel {
  // 1. Check for necessary data
  if (!profile.skeletalMuscleMassValue || !profile.skeletalMuscleMassUnit || !profile.gender) {
    return 'N/A';
  }

  const exerciseName = record.exerciseName.trim().toLowerCase();
  const standards = strengthStandards[exerciseName];
  if (!standards) {
    return 'N/A'; // No standards available for this exercise
  }

  // 2. Convert all weights to KG for a consistent comparison
  const smmInKg = profile.skeletalMuscleMassUnit === 'lbs'
    ? profile.skeletalMuscleMassValue * LBS_TO_KG
    : profile.skeletalMuscleMassValue;

  const liftedWeightInKg = record.weightUnit === 'lbs'
    ? record.weight * LBS_TO_KG
    : record.weight;
  
  if (smmInKg <= 0) return 'N/A';

  // 3. Calculate the raw strength-to-muscle ratio
  const rawRatio = liftedWeightInKg / smmInKg;

  // 4. Apply age adjustment factor (simplified WMA-style grading)
  let ageAdjustedRatio = rawRatio;
  if (profile.age && profile.age > 40) {
    // This factor slightly increases the effective ratio for older lifters.
    // e.g., at 50, factor is 1.05 (+5%). at 60, 1.10 (+10%).
    const ageFactor = 1 + (profile.age - 40) * 0.01;
    ageAdjustedRatio *= ageFactor;
  }
  
  // 5. Determine the classification
  const genderKey = profile.gender as 'Male' | 'Female';
  const genderStandards = standards[genderKey];

  if (!genderStandards) {
      return 'N/A'; // No standards for this gender for this exercise
  }

  if (ageAdjustedRatio >= genderStandards.elite) return 'Elite';
  if (ageAdjustedRatio >= genderStandards.advanced) return 'Advanced';
  if (ageAdjustedRatio >= genderStandards.intermediate) return 'Intermediate';
  
  return 'Beginner';
}


/**
 * Calculates the weight thresholds for each strength level for a given exercise.
 * @param exerciseName The name of the exercise.
 * @param profile The user's profile containing necessary stats.
 * @param outputUnit The desired weight unit for the output ('lbs' or 'kg').
 * @returns An object with weight thresholds for each level, or null if data is insufficient.
 */
export function getStrengthThresholds(
  exerciseName: string,
  profile: UserProfile,
  outputUnit: 'lbs' | 'kg'
): { intermediate: number; advanced: number; elite: number } | null {
  // 1. Check for necessary data
  if (!profile.skeletalMuscleMassValue || !profile.skeletalMuscleMassUnit || !profile.gender) {
    return null;
  }

  const standards = strengthStandards[exerciseName.trim().toLowerCase()];
  if (!standards) {
    return null; // No standards available for this exercise
  }

  // 2. Convert SMM to KG
  const smmInKg = profile.skeletalMuscleMassUnit === 'lbs'
    ? profile.skeletalMuscleMassValue * LBS_TO_KG
    : profile.skeletalMuscleMassValue;

  if (smmInKg <= 0) return null;

  // 3. Get gender-specific ratios
  const genderKey = profile.gender as 'Male' | 'Female';
  const genderStandards = standards[genderKey];
  if (!genderStandards) {
      return null;
  }

  // 4. Calculate threshold weights in KG
  // Apply reverse age adjustment to find the raw weight needed
  let ageFactor = 1;
  if (profile.age && profile.age > 40) {
    ageFactor = 1 + (profile.age - 40) * 0.01;
  }
  
  const calculateRequiredWeight = (ratio: number) => (ratio * smmInKg) / ageFactor;

  const intermediateKg = calculateRequiredWeight(genderStandards.intermediate);
  const advancedKg = calculateRequiredWeight(genderStandards.advanced);
  const eliteKg = calculateRequiredWeight(genderStandards.elite);

  // 5. Convert to output unit and round
  const convert = (kgValue: number) => {
      const value = outputUnit === 'lbs' ? kgValue / LBS_TO_KG : kgValue;
      return Math.round(value);
  }
  
  return {
    intermediate: convert(intermediateKg),
    advanced: convert(advancedKg),
    elite: convert(eliteKg),
  };
}
