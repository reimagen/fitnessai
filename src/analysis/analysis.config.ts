import type { PersonalRecord } from '@/lib/types';
import type { ExerciseDocument } from '@/lib/exercise-types';
import {
  normalizeExerciseNameForLookup,
  resolveCanonicalExerciseName,
} from '@/lib/exercise-normalization';
import { getNormalizedExerciseName } from '@/lib/strength-standards';

export type ImbalanceType =
  | 'Horizontal Push vs. Pull'
  | 'Vertical Push vs. Pull'
  | 'Hamstring vs. Quad'
  | 'Adductor vs. Abductor';

export const IMBALANCE_TYPES: ImbalanceType[] = [
  'Horizontal Push vs. Pull',
  'Vertical Push vs. Pull',
  'Hamstring vs. Quad',
  'Adductor vs. Abductor',
];

export const IMBALANCE_CONFIG: Record<
  ImbalanceType,
  { lift1Options: string[]; lift2Options: string[]; ratioCalculation: (l1: number, l2: number) => number }
> = {
  'Horizontal Push vs. Pull': {
    lift1Options: ['chest press'],
    lift2Options: ['seated row'],
    ratioCalculation: (l1, l2) => l1 / l2,
  },
  'Vertical Push vs. Pull': {
    lift1Options: ['shoulder press'],
    lift2Options: ['lat pulldown'],
    ratioCalculation: (l1, l2) => l1 / l2,
  },
  'Hamstring vs. Quad': {
    lift1Options: ['leg curl'],
    lift2Options: ['leg extension'],
    ratioCalculation: (l1, l2) => l1 / l2,
  },
  'Adductor vs. Abductor': {
    lift1Options: ['adductor'],
    lift2Options: ['abductor'],
    ratioCalculation: (l1, l2) => l1 / l2,
  },
};

export interface ImbalanceConfigValidationIssue {
  imbalanceType: ImbalanceType;
  liftField: 'lift1Options' | 'lift2Options';
  configuredExerciseName: string;
  resolvedExerciseName: string;
}

let lastValidationSignature: string | null = null;

export function validateImbalanceConfigExercises(
  exerciseLibrary: ExerciseDocument[]
): ImbalanceConfigValidationIssue[] {
  if (exerciseLibrary.length === 0) {
    return [];
  }

  const knownExerciseNames = new Set<string>();
  for (const exercise of exerciseLibrary) {
    knownExerciseNames.add(normalizeExerciseNameForLookup(exercise.normalizedName));
    for (const legacyName of exercise.legacyNames ?? []) {
      knownExerciseNames.add(normalizeExerciseNameForLookup(legacyName));
    }
  }

  const issues: ImbalanceConfigValidationIssue[] = [];
  for (const imbalanceType of IMBALANCE_TYPES) {
    const config = IMBALANCE_CONFIG[imbalanceType];
    const entries: Array<{ liftField: 'lift1Options' | 'lift2Options'; options: string[] }> = [
      { liftField: 'lift1Options', options: config.lift1Options },
      { liftField: 'lift2Options', options: config.lift2Options },
    ];

    for (const { liftField, options } of entries) {
      for (const configuredExerciseName of options) {
        const resolvedExerciseName = resolveCanonicalExerciseName(
          configuredExerciseName,
          exerciseLibrary
        );
        const resolvedNormalized = normalizeExerciseNameForLookup(resolvedExerciseName);
        if (!knownExerciseNames.has(resolvedNormalized)) {
          issues.push({
            imbalanceType,
            liftField,
            configuredExerciseName,
            resolvedExerciseName,
          });
        }
      }
    }
  }

  return issues;
}

export function reportImbalanceConfigValidationIssues(issues: ImbalanceConfigValidationIssue[]): void {
  if (issues.length === 0) {
    lastValidationSignature = null;
    return;
  }

  const signature = issues
    .map(
      issue =>
        `${issue.imbalanceType}|${issue.liftField}|${issue.configuredExerciseName}|${issue.resolvedExerciseName}`
    )
    .sort()
    .join('\n');

  if (signature === lastValidationSignature) {
    return;
  }
  lastValidationSignature = signature;

  console.error(
    '[analysis] IMBALANCE_CONFIG contains exercise names that do not exist in the exercise library. Strength findings may be incomplete.',
    issues
  );
}

// Helper to find the best PR for a given list of exercises (moved from page.tsx)
export function findBestPr(records: PersonalRecord[], exerciseNames: string[]): PersonalRecord | null {
  const searchNames = [...exerciseNames];

  const relevantRecords = records.filter(record =>
    searchNames.some(name => getNormalizedExerciseName(record.exerciseName) === name.trim().toLowerCase())
  );

  if (relevantRecords.length === 0) return null;

  return relevantRecords.reduce((best, current) => {
    const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
    const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
    return currentWeightKg > bestWeightKg ? current : best;
  });
}
