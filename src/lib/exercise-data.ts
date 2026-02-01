/**
 * This file contains all hardcoded exercise data.
 * In the future, this data will be migrated to Firebase.
 * Do not import this file directly - use exercise-registry.ts instead.
 */

import type {
  StrengthStandardsMap,
  StrengthRatiosMap,
  ExerciseCategoryMap,
  ExerciseAliasMap,
} from './exercise-types';

// Ratios are defined as: (Weight Lifted in KG) / (Base Value in KG)
// The "Base Value" is either SMM or Bodyweight, depending on the 'type' field.
export const STRENGTH_STANDARDS: StrengthStandardsMap = {
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

export const STRENGTH_RATIOS: StrengthRatiosMap = {
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

export const CARDIO_EXERCISES: ExerciseCategoryMap = {
  'run': 'Cardio',
  'running': 'Cardio',
  'jog': 'Cardio',
  'jogging': 'Cardio',
  'walk': 'Cardio',
  'walking': 'Cardio',
  'cycle': 'Cardio',
  'cycling': 'Cardio',
  'bike': 'Cardio',
  'biking': 'Cardio',
  'stationary bike': 'Cardio',
  'elliptical': 'Cardio',
  'rowing': 'Cardio',
  'row': 'Cardio',
  'rower': 'Cardio',
  'swimming': 'Cardio',
  'swim': 'Cardio',
  'jump rope': 'Cardio',
  'skipping': 'Cardio',
  'sprinting': 'Cardio',
  'sprint': 'Cardio',
  'stair climbing': 'Cardio',
  'stairs': 'Cardio',
  'treadmill': 'Cardio',
  'hiit': 'Cardio',
  'high intensity interval training': 'Cardio',
};

export const LIFT_NAME_ALIASES: ExerciseAliasMap = {
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
