import { useMemo } from 'react';
import type { PersonalRecord, StrengthFinding, StrengthLevel, WorkoutLog } from '@/lib/types';
import type { ImbalanceType } from '@/analysis/analysis.config';
import { IMBALANCE_TYPES, IMBALANCE_CONFIG, find6WeekAvgE1RM } from '@/analysis/analysis.config';
import { toTitleCase } from '@/lib/utils';
import { getStrengthLevel, getStrengthRatioStandards } from '@/lib/strength-standards';
import type { UserProfile } from '@/lib/types';
import type { ImbalanceFocus } from '@/analysis/analysis.utils';
import type { ExerciseDocument } from '@/lib/exercise-types';

/**
 * Normalizes exercise name for lookup
 */
const normalizeForLookup = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/^(egym|machine)\s+/, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');

/**
 * Resolves exercise name to its canonical name using the exercise library
 */
const resolveCanonicalName = (exerciseName: string, exerciseLibrary: ExerciseDocument[]): string => {
  const normalized = normalizeForLookup(exerciseName);
  const exercise = exerciseLibrary.find(e => {
    if (e.normalizedName.toLowerCase() === normalized) return true;
    if (e.legacyNames?.some(ln => normalizeForLookup(ln) === normalized)) return true;
    return false;
  });
  return exercise?.normalizedName || exerciseName;
};

/**
 * Resolves exercise options to canonical names
 */
const resolveExerciseOptions = (options: string[], exerciseLibrary: ExerciseDocument[]): string[] => {
  return options.map(name => resolveCanonicalName(name, exerciseLibrary));
};

export function useStrengthFindings(
  workoutLogs: WorkoutLog[] | undefined,
  userProfile: UserProfile | undefined,
  exercises: ExerciseDocument[] = []
) {
  const clientSideFindings = useMemo<(StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[]>(() => {
    if (!workoutLogs || !userProfile || !userProfile.gender) {
      return [];
    }

    const findings: (StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[] = [];
    const strengthLevelRanks: Record<string, number> = {
      'Beginner': 0,
      'Intermediate': 1,
      'Advanced': 2,
      'Elite': 3,
      'N/A': -1,
    };

    IMBALANCE_TYPES.forEach(type => {
      const config = IMBALANCE_CONFIG[type];
      const resolvedLift1Options = resolveExerciseOptions(config.lift1Options, exercises);
      const resolvedLift2Options = resolveExerciseOptions(config.lift2Options, exercises);
      const lift1 = find6WeekAvgE1RM(workoutLogs, resolvedLift1Options, exercises);
      const lift2 = find6WeekAvgE1RM(workoutLogs, resolvedLift2Options, exercises);

      if (!lift1 || !lift2) {
        findings.push({ imbalanceType: type, hasData: false });
        return;
      }

      const lift1Level = getStrengthLevel({
        id: 'synthetic',
        userId: '',
        exerciseName: lift1.exerciseName,
        weight: lift1.weight,
        weightUnit: lift1.weightUnit,
        date: new Date(),
      } as PersonalRecord, userProfile);

      const lift2Level = getStrengthLevel({
        id: 'synthetic',
        userId: '',
        exerciseName: lift2.exerciseName,
        weight: lift2.weight,
        weightUnit: lift2.weightUnit,
        date: new Date(),
      } as PersonalRecord, userProfile);

      const lift1WeightKg = lift1.weightUnit === 'lbs' ? lift1.weight * 0.453592 : lift1.weight;
      const lift2WeightKg = lift2.weightUnit === 'lbs' ? lift2.weight * 0.453592 : lift2.weight;

      if (lift2WeightKg === 0) {
        findings.push({ imbalanceType: type, hasData: false });
        return;
      }

      const ratio = config.ratioCalculation(lift1WeightKg, lift2WeightKg);

      const rank1 = strengthLevelRanks[lift1Level];
      const rank2 = strengthLevelRanks[lift2Level];
      const guidingLevelRank = (rank1 === -1 || rank2 === -1) ? -1 : Math.min(rank1, rank2);
      const guidingLevel =
        (Object.entries(strengthLevelRanks).find(([, rank]) => rank === guidingLevelRank)?.[0] as StrengthLevel) || 'N/A';

      const ratioStandards = getStrengthRatioStandards(
        type,
        userProfile.gender as 'Male' | 'Female',
        guidingLevel
      );

      const balancedRangeDisplay = ratioStandards
        ? `${ratioStandards.lowerBound.toFixed(2)}-${ratioStandards.upperBound.toFixed(2)}:1`
        : 'N/A';

      const targetRatioDisplay = ratioStandards ? `${ratioStandards.targetRatio.toFixed(2)}:1` : 'N/A';

      let imbalanceFocus: ImbalanceFocus = 'Balanced';
      let ratioIsUnbalanced = false;

      if (ratioStandards) {
        ratioIsUnbalanced = ratio < ratioStandards.lowerBound || ratio > ratioStandards.upperBound;
      }

      if (lift1Level !== 'N/A' && lift2Level !== 'N/A' && lift1Level !== lift2Level) {
        imbalanceFocus = 'Level Imbalance';
      } else if (ratioIsUnbalanced) {
        imbalanceFocus = 'Ratio Imbalance';
      }

      findings.push({
        imbalanceType: type,
        lift1Name: toTitleCase(lift1.exerciseName),
        lift1Weight: lift1.weight,
        lift1Unit: lift1.weightUnit,
        lift1SessionCount: lift1.sessionCount,
        lift2Name: toTitleCase(lift2.exerciseName),
        lift2Weight: lift2.weight,
        lift2Unit: lift2.weightUnit,
        lift2SessionCount: lift2.sessionCount,
        userRatio: `${ratio.toFixed(2)}:1`,
        targetRatio: targetRatioDisplay,
        balancedRange: balancedRangeDisplay,
        imbalanceFocus: imbalanceFocus,
        lift1Level,
        lift2Level,
      });
    });

    return findings;
  }, [workoutLogs, userProfile, exercises]);

  return clientSideFindings;
}
