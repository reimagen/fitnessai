
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

type ExerciseStandardData = {
  type: 'smm' | 'bw'; // Ratio is based on Skeletal Muscle Mass or Bodyweight
  standards: GenderStandards;
};

// Ratios are defined as: (Weight Lifted in KG) / (Base Value in KG)
// The "Base Value" is either SMM or Bodyweight, depending on the 'type' field.
const strengthStandards: Record<string, ExerciseStandardData> = {
  'abdominal crunch': {
    type: 'bw',
    standards: {
      'Male':   { intermediate: 0.60, advanced: 0.85, elite: 1.15 },
      'Female': { intermediate: 0.60, advanced: 0.85, elite: 1.15 },
    },
  },
  'abductor': {
    type: 'bw',
    standards: {
      'Male':   { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
      'Female': { intermediate: 1.25, advanced: 1.75, elite: 2.25 },
    },
  },
  'adductor': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 1.2, advanced: 1.6, elite: 2.0 },
      'Female': { intermediate: 1.4, advanced: 1.8, elite: 2.2 },
    },
  },
  'back extension': {
    type: 'bw',
    standards: {
      'Male':   { intermediate: 0.65, advanced: 0.95, elite: 1.35 },
      'Female': { intermediate: 0.65, advanced: 0.95, elite: 1.35 },
    },
  },
  'bench press': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 2.2, advanced: 2.7, elite: 3.2 },
      'Female': { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
    },
  },
  'bicep curl': {
    type: 'smm',
    standards: {
      'Male': { intermediate: 0.6, advanced: 0.8, elite: 1.0 },
      'Female': { intermediate: 0.5, advanced: 0.7, elite: 0.9 },
    },
  },
  'butterfly': {
    type: 'smm',
    standards: {
      'Male': { intermediate: 1.0, advanced: 1.3, elite: 1.6 },
      'Female': { intermediate: 0.8, advanced: 1.1, elite: 1.4 },
    },
  },
  'chest press': { // Using same as bench press
    type: 'smm',
    standards: {
      'Male':   { intermediate: 2.2, advanced: 2.7, elite: 3.2 },
      'Female': { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
    },
  },
  'glutes': {
    type: 'smm',
    standards: {
      'Male': { intermediate: 2.0, advanced: 2.5, elite: 3.0 },
      'Female': { intermediate: 2.2, advanced: 2.8, elite: 3.4 },
    },
  },
  'hip thrust': {
    type: 'bw',
    standards: {
      'Male': { intermediate: 2.0, advanced: 3.0, elite: 4.0 },
      'Female': { intermediate: 1.50, advanced: 2.25, elite: 3.00 },
    },
  },
  'lat pulldown': {
    type: 'smm',
    standards: {
      'Male': { intermediate: 2.5, advanced: 3.0, elite: 3.5 },
      'Female': { intermediate: 1.8, advanced: 2.3, elite: 2.8 },
    },
  },
  'leg curl': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 1.0, advanced: 1.4, elite: 1.8 },
      'Female': { intermediate: 0.8, advanced: 1.2, elite: 1.6 },
    },
  },
  'leg extension': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
      'Female': { intermediate: 1.0, advanced: 1.5, elite: 2.0 },
    },
  },
  'leg press': {
    type: 'bw',
    standards: {
      'Male':   { intermediate: 2.2, advanced: 3.2, elite: 4.3 },
      'Female': { intermediate: 2.00, advanced: 3.25, elite: 4.50 },
    },
  },
  'overhead press': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 1.5, advanced: 1.8, elite: 2.2 },
      'Female': { intermediate: 1.0, advanced: 1.3, elite: 1.6 },
    },
  },
  'reverse fly': {
    type: 'smm',
    standards: {
      'Male': { intermediate: 0.4, advanced: 0.6, elite: 0.8 },
      'Female': { intermediate: 0.3, advanced: 0.5, elite: 0.7 },
    },
  },
  'reverse flys': {
    type: 'smm',
    standards: {
      'Male': { intermediate: 0.4, advanced: 0.6, elite: 0.8 },
      'Female': { intermediate: 0.3, advanced: 0.5, elite: 0.7 },
    },
  },
  'rotary torso': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 0.8, advanced: 1.0, elite: 1.2 },
      'Female': { intermediate: 0.7, advanced: 0.9, elite: 1.1 },
    },
  },
  'seated row': {
    type: 'smm',
    standards: {
      'Male': { intermediate: 2.2, advanced: 2.7, elite: 3.2 },
      'Female': { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
    },
  },
  'shoulder press': { // Using same as overhead press
    type: 'smm',
    standards: {
      'Male':   { intermediate: 1.5, advanced: 1.8, elite: 2.2 },
      'Female': { intermediate: 1.0, advanced: 1.3, elite: 1.6 },
    },
  },
  'squat': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 3.0, advanced: 4.0, elite: 5.0 },
      'Female': { intermediate: 2.5, advanced: 3.5, elite: 4.5 },
    },
  },
  'tricep extension': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 0.7, advanced: 0.9, elite: 1.1 },
      'Female': { intermediate: 0.5, advanced: 0.7, elite: 0.9 },
    },
  },
  'tricep pushdown': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 0.7, advanced: 0.9, elite: 1.1 },
      'Female': { intermediate: 0.5, advanced: 0.7, elite: 0.9 },
    },
  },
  'triceps': {
    type: 'smm',
    standards: {
      'Male':   { intermediate: 0.7, advanced: 0.9, elite: 1.1 },
      'Female': { intermediate: 0.5, advanced: 0.7, elite: 0.9 },
    },
  },
};

/**
 * Gets the calculation type for a strength standard.
 * @param exerciseName The name of the exercise.
 * @returns 'smm', 'bw', or null if not found.
 */
export function getStrengthStandardType(
  exerciseName: string
): 'smm' | 'bw' | null {
  const exerciseData = strengthStandards[exerciseName.trim().toLowerCase()];
  if (!exerciseData) {
    return null;
  }
  return exerciseData.type;
}


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
  const exerciseName = record.exerciseName.trim().toLowerCase();
  
  const exerciseData = strengthStandards[exerciseName];
  if (!exerciseData) {
    return 'N/A'; // No standards available for this exercise
  }
  
  if (!profile.gender) return 'N/A';
  if (profile.gender !== 'Male' && profile.gender !== 'Female') return 'N/A';

  const standards = exerciseData.standards;
  
  let baseValueInKg: number;
  if (exerciseData.type === 'bw') {
      if (!profile.weightValue || !profile.weightUnit) return 'N/A';
      baseValueInKg = profile.weightUnit === 'lbs'
          ? profile.weightValue * LBS_TO_KG
          : profile.weightValue;
  } else { // 'smm'
      if (!profile.skeletalMuscleMassValue || !profile.skeletalMuscleMassUnit) return 'N/A';
      baseValueInKg = profile.skeletalMuscleMassUnit === 'lbs'
          ? profile.skeletalMuscleMassValue * LBS_TO_KG
          : profile.skeletalMuscleMassValue;
  }
  
  if (baseValueInKg <= 0) return 'N/A';

  const liftedWeightInKg = record.weightUnit === 'lbs'
    ? record.weight * LBS_TO_KG
    : record.weight;
  
  const rawRatio = liftedWeightInKg / baseValueInKg;

  let ageAdjustedRatio = rawRatio;
  if (profile.age && profile.age > 40) {
    const ageFactor = 1 + (profile.age - 40) * 0.01;
    ageAdjustedRatio *= ageFactor;
  }
  
  const genderKey = profile.gender as 'Male' | 'Female';
  const genderStandards = standards[genderKey];

  if (!genderStandards) {
      return 'N/A';
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
  const exerciseNameToUse = exerciseName.trim().toLowerCase();

  const exerciseData = strengthStandards[exerciseNameToUse];
  if (!exerciseData) {
    return null; // No standards available for this exercise
  }

  if (!profile.gender) return null;
  if (profile.gender !== 'Male' && profile.gender !== 'Female') return null;

  const standards = exerciseData.standards;
  
  let baseValueInKg: number;
  if (exerciseData.type === 'bw') {
      if (!profile.weightValue || !profile.weightUnit) return null;
      baseValueInKg = profile.weightUnit === 'lbs'
          ? profile.weightValue * LBS_TO_KG
          : profile.weightValue;
  } else { // 'smm'
      if (!profile.skeletalMuscleMassValue || !profile.skeletalMuscleMassUnit) return null;
      baseValueInKg = profile.skeletalMuscleMassUnit === 'lbs'
          ? profile.skeletalMuscleMassValue * LBS_TO_KG
          : profile.skeletalMuscleMassValue;
  }

  if (baseValueInKg <= 0) return null;

  const genderKey = profile.gender as 'Male' | 'Female';
  const genderStandards = standards[genderKey];
  if (!genderStandards) {
      return null;
  }

  let ageFactor = 1;
  if (profile.age && profile.age > 40) {
    ageFactor = 1 + (profile.age - 40) * 0.01;
  }
  
  const calculateRequiredWeight = (ratio: number) => (ratio * baseValueInKg) / ageFactor;

  const intermediateKg = calculateRequiredWeight(genderStandards.intermediate);
  const advancedKg = calculateRequiredWeight(genderStandards.advanced);
  const eliteKg = calculateRequiredWeight(genderStandards.elite);

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
