
import type { PersonalRecord, UserProfile, StrengthLevel, ExerciseCategory } from './types';

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
  category: ExerciseCategory;
  standards: GenderStandards;
};

// Ratios are defined as: (Weight Lifted in KG) / (Base Value in KG)
// The "Base Value" is either SMM or Bodyweight, depending on the 'type' field.
const strengthStandards: Record<string, ExerciseStandardData> = {
  'abdominal crunch': {
    type: 'bw',
    category: 'Core',
    standards: {
      'Male':   { intermediate: 0.75, advanced: 1.0, elite: 1.3 },
      'Female': { intermediate: 0.60, advanced: 0.85, elite: 1.15 },
    },
  },
  'abductor': {
    type: 'bw',
    category: 'Lower Body',
    standards: {
      'Male':   { intermediate: 1.5, advanced: 2.0, elite: 2.5 },
      'Female': { intermediate: 1.25, advanced: 1.75, elite: 2.25 },
    },
  },
  'adductor': {
    type: 'bw',
    category: 'Lower Body',
    standards: {
      'Male':   { intermediate: 1.1, advanced: 1.6, elite: 2.1 },
      'Female': { intermediate: 1.00, advanced: 1.50, elite: 2.25 },
    },
  },
  'back extension': {
    type: 'bw',
    category: 'Core',
    standards: {
      'Male':   { intermediate: 0.80, advanced: 1.10, elite: 1.50 },
      'Female': { intermediate: 0.65, advanced: 0.95, elite: 1.35 },
    },
  },
  'bench press': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male':   { intermediate: 1.0, advanced: 1.5, elite: 2.0 },
      'Female': { intermediate: 0.75, advanced: 1.0, elite: 1.25 },
    },
  },
  'bicep curl': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male':   { intermediate: 0.35, advanced: 0.5, elite: 0.75 },
      'Female': { intermediate: 0.40, advanced: 0.70, elite: 1.00 },
    },
  },
  'butterfly': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male':   { intermediate: 0.85, advanced: 1.15, elite: 1.55 },
      'Female': { intermediate: 0.60, advanced: 0.90, elite: 1.30 },
    },
  },
  'chest press': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male':   { intermediate: 0.80, advanced: 1.15, elite: 1.50 },
      'Female': { intermediate: 0.55, advanced: 0.90, elite: 1.25 },
    },
  },
  'glutes': {
    type: 'smm',
    category: 'Lower Body',
    standards: {
      'Male': { intermediate: 2.0, advanced: 2.5, elite: 3.0 },
      'Female': { intermediate: 2.2, advanced: 2.8, elite: 3.4 },
    },
  },
  'hip thrust': {
    type: 'bw',
    category: 'Lower Body',
    standards: {
      'Male': { intermediate: 2.0, advanced: 3.0, elite: 4.0 },
      'Female': { intermediate: 1.50, advanced: 2.25, elite: 3.00 },
    },
  },
  'lat pulldown': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male':   { intermediate: 0.9, advanced: 1.2, elite: 1.5 },
      'Female': { intermediate: 0.70, advanced: 0.95, elite: 1.30 },
    },
  },
  'leg curl': {
    type: 'bw',
    category: 'Lower Body',
    standards: {
      'Male':   { intermediate: 0.95, advanced: 1.25, elite: 1.75 },
      'Female': { intermediate: 0.75, advanced: 1.05, elite: 1.45 },
    },
  },
  'leg extension': {
    type: 'bw',
    category: 'Lower Body',
    standards: {
      'Male':   { intermediate: 1.5, advanced: 1.75, elite: 2.5 },
      'Female': { intermediate: 1.0, advanced: 1.25, elite: 2.0 },
    },
  },
  'leg press': {
    type: 'bw',
    category: 'Lower Body',
    standards: {
      'Male':   { intermediate: 2.2, advanced: 3.2, elite: 4.3 },
      'Female': { intermediate: 2.00, advanced: 3.25, elite: 4.50 },
    },
  },
  'overhead press': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male':   { intermediate: 0.75, advanced: 1.0, elite: 1.3 },
      'Female': { intermediate: 0.50, advanced: 0.85, elite: 1.20 },
    },
  },
  'reverse flys': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male': { intermediate: 0.25, advanced: 0.40, elite: 0.60 },
      'Female': { intermediate: 0.20, advanced: 0.35, elite: 0.55 },
    },
  },
  'rotary torso': {
    type: 'smm',
    category: 'Core',
    standards: {
      'Male':   { intermediate: 0.8, advanced: 1.0, elite: 1.2 },
      'Female': { intermediate: 0.7, advanced: 0.9, elite: 1.1 },
    },
  },
  'seated row': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male':   { intermediate: 1.0, advanced: 1.5, elite: 2.0 },
      'Female': { intermediate: 0.75, advanced: 1.25, elite: 1.75 },
    },
  },
  'shoulder press': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male':   { intermediate: 0.75, advanced: 1.0, elite: 1.3 },
      'Female': { intermediate: 0.50, advanced: 0.85, elite: 1.20 },
    },
  },
  'squat': {
    type: 'bw',
    category: 'Lower Body',
    standards: {
      'Male':   { intermediate: 1.25, advanced: 1.75, elite: 2.25 },
      'Female': { intermediate: 1.0, advanced: 1.5, elite: 2.0 },
    },
  },
  'triceps': {
    type: 'bw',
    category: 'Upper Body',
    standards: {
      'Male':   { intermediate: 0.50, advanced: 0.75, elite: 1.0 },
      'Female': { intermediate: 0.75, advanced: 1.25, elite: 1.50 },
    },
  },
};

// --- START: New Strength Ratio Data ---

type StrengthRatioStandards = {
  targetRatio: number;
  lowerBound: number;
  upperBound: number;
};

type StrengthLevelKey = 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite' | 'N/A';

const strengthRatios: Record<string, Record<'Male' | 'Female', Partial<Record<StrengthLevelKey, StrengthRatioStandards>>>> = {
  'Vertical Push vs. Pull': {
    'Female': {
      'Beginner':     { targetRatio: 0.55, lowerBound: 0.50, upperBound: 0.60 },
      'Intermediate': { targetRatio: 0.62, lowerBound: 0.60, upperBound: 0.65 },
      'Advanced':     { targetRatio: 0.67, lowerBound: 0.65, upperBound: 0.70 },
      'Elite':        { targetRatio: 0.67, lowerBound: 0.65, upperBound: 0.70 },
    },
    'Male': {
      'Beginner':     { targetRatio: 0.60, lowerBound: 0.55, upperBound: 0.65 },
      'Intermediate': { targetRatio: 0.70, lowerBound: 0.65, upperBound: 0.75 },
      'Advanced':     { targetRatio: 0.75, lowerBound: 0.70, upperBound: 0.80 },
      'Elite':        { targetRatio: 0.75, lowerBound: 0.70, upperBound: 0.80 },
    },
  },
  'Horizontal Push vs. Pull': {
    'Female': {
      'Beginner':     { targetRatio: 0.55, lowerBound: 0.50, upperBound: 0.60 },
      'Intermediate': { targetRatio: 0.62, lowerBound: 0.60, upperBound: 0.65 },
      'Advanced':     { targetRatio: 0.67, lowerBound: 0.65, upperBound: 0.70 },
      'Elite':        { targetRatio: 0.67, lowerBound: 0.65, upperBound: 0.70 },
    },
    'Male': {
      'Beginner':     { targetRatio: 0.60, lowerBound: 0.55, upperBound: 0.65 },
      'Intermediate': { targetRatio: 0.70, lowerBound: 0.65, upperBound: 0.75 },
      'Advanced':     { targetRatio: 0.75, lowerBound: 0.70, upperBound: 0.80 },
      'Elite':        { targetRatio: 0.75, lowerBound: 0.70, upperBound: 0.80 },
    },
  },
  'Hamstring vs. Quad': {
    'Female': {
      'Beginner':     { targetRatio: 0.63, lowerBound: 0.60, upperBound: 0.67 },
      'Intermediate': { targetRatio: 0.68, lowerBound: 0.65, upperBound: 0.72 },
      'Advanced':     { targetRatio: 0.74, lowerBound: 0.70, upperBound: 0.78 },
      'Elite':        { targetRatio: 0.74, lowerBound: 0.70, upperBound: 0.78 },
    },
    'Male': {
      'Beginner':     { targetRatio: 0.60, lowerBound: 0.55, upperBound: 0.65 },
      'Intermediate': { targetRatio: 0.65, lowerBound: 0.60, upperBound: 0.70 },
      'Advanced':     { targetRatio: 0.71, lowerBound: 0.67, upperBound: 0.75 },
      'Elite':        { targetRatio: 0.71, lowerBound: 0.67, upperBound: 0.75 },
    },
  },
  'Adductor vs. Abductor': {
    'Female': {
      'Beginner':     { targetRatio: 0.75, lowerBound: 0.65, upperBound: 0.85 },
      'Intermediate': { targetRatio: 0.80, lowerBound: 0.70, upperBound: 0.90 },
      'Advanced':     { targetRatio: 0.85, lowerBound: 0.75, upperBound: 0.95 },
      'Elite':        { targetRatio: 0.85, lowerBound: 0.75, upperBound: 0.95 },
    },
    'Male': {
      'Beginner':     { targetRatio: 0.75, lowerBound: 0.65, upperBound: 0.85 },
      'Intermediate': { targetRatio: 0.82, lowerBound: 0.75, upperBound: 0.90 },
      'Advanced':     { targetRatio: 0.87, lowerBound: 0.80, upperBound: 0.95 },
      'Elite':        { targetRatio: 0.87, lowerBound: 0.80, upperBound: 0.95 },
    },
  },
};

/**
 * Retrieves the target ratio and acceptable bounds for a given strength imbalance.
 * @param imbalanceType The type of imbalance (e.g., 'Vertical Push vs. Pull').
 * @param gender The user's gender.
 * @param level The user's guiding strength level for the pair.
 * @returns An object with targetRatio, lowerBound, and upperBound, or null if not found.
 */
export function getStrengthRatioStandards(
  imbalanceType: string,
  gender: 'Male' | 'Female',
  level: StrengthLevel
): StrengthRatioStandards | null {
  if (level === 'N/A') return null;
  const standardsForType = strengthRatios[imbalanceType];
  if (!standardsForType) return null;

  const standardsForGender = standardsForType[gender];
  if (!standardsForGender) return null;

  const standardsForLevel = standardsForGender[level];
  return standardsForLevel || null;
}
// --- END: New Strength Ratio Data ---


/**
 * A map of common exercise name variations to their canonical names.
 */
export const LIFT_NAME_ALIASES: Record<string, string> = {
  // Existing aliases
  'lat pull': 'lat pulldown',
  'biceps curl': 'bicep curl',
  'reverse fly': 'reverse flys',
  'tricep extension': 'triceps',
  'tricep pushdown': 'triceps',
  'squats': 'squat',

  // Plural/singular variations
  'abdominal crunches': 'abdominal crunch',
  'abdominal crunch': 'abdominal crunch',
  'abductors': 'abductor',
  'adductors': 'adductor',
  'back extensions': 'back extension',
  'bench presses': 'bench press',
  'bicep curls': 'bicep curl',
  'butterflies': 'butterfly',
  'butterfly': 'butterfly',
  'chest presses': 'chest press',
  'hip thrusts': 'hip thrust',
  'lat pulldowns': 'lat pulldown',
  'leg curls': 'leg curl',
  'leg extensions': 'leg extension',
  'leg presses': 'leg press',
  'overhead presses': 'overhead press',
  'rotary torsos': 'rotary torso',
  'seated rows': 'seated row',
  'shoulder presses': 'shoulder press',

  // Common abbreviations
  'db': 'dumbbell',
  'dbs': 'dumbbell',
  'bb': 'barbell',
  'bbs': 'barbell',

  // Equipment prefix normalization (these help standardize equipment descriptors)
  'cable glute kickbacks': 'cable glute kickback',
  'cable glute kickback': 'cable glute kickback',
  'cable glute raises': 'cable glute raises',
  'bulgarian split squats': 'bulgarian split squat',
  'bulgarian split squat': 'bulgarian split squat',
};

/**
 * Normalizes an exercise name by converting it to lowercase and checking for aliases.
 * @param name The raw exercise name.
 * @returns The normalized, canonical exercise name.
 */
export function getNormalizedExerciseName(name: string): string {
  if (!name) return "";
  const lowerCaseName = name.trim().toLowerCase();
  return LIFT_NAME_ALIASES[lowerCaseName] || lowerCaseName;
}


/**
 * An exported array of all exercise names that have strength standards.
 */
export const classifiedExercises = Object.keys(strengthStandards).sort();

/**
 * Gets the category for a given classifiable exercise.
 * @param exerciseName The name of the exercise.
 * @returns The ExerciseCategory or null if not found.
 */
export function getExerciseCategory(exerciseName: string): ExerciseCategory | null {
  const normalizedName = getNormalizedExerciseName(exerciseName);
  const exerciseData = strengthStandards[normalizedName];
  return exerciseData ? exerciseData.category : null;
}

/**
 * Gets the calculation type for a strength standard.
 * @param exerciseName The name of the exercise.
 * @returns 'smm', 'bw', or null if not found.
 */
export function getStrengthStandardType(
  exerciseName: string
): 'smm' | 'bw' | null {
  const normalizedName = getNormalizedExerciseName(exerciseName);
  const exerciseData = strengthStandards[normalizedName];
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
  const normalizedName = getNormalizedExerciseName(record.exerciseName);
  
  const exerciseData = strengthStandards[normalizedName];
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
  const normalizedName = getNormalizedExerciseName(exerciseName);

  const exerciseData = strengthStandards[normalizedName];
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

  let ageFactor = 1.0;
  if (profile.age && profile.age > 40) {
    ageFactor = 1 + (profile.age - 40) * 0.01;
  }

  const calculateThreshold = (ratio: number) => {
    const weightInKg = (ratio * baseValueInKg) / ageFactor;
    const finalWeight = (outputUnit === 'lbs') ? weightInKg / LBS_TO_KG : weightInKg;
    // Use Math.ceil to ensure that if the threshold is e.g. 105.1, it becomes 106,
    // so a lift of 106 is correctly classified as meeting the threshold.
    return Math.ceil(finalWeight);
  };
  
  return {
    intermediate: calculateThreshold(genderStandards.intermediate),
    advanced: calculateThreshold(genderStandards.advanced),
    elite: calculateThreshold(genderStandards.elite),
  };
}
