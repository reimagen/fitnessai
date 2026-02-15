import type { ExerciseDocument } from '@/lib/exercise-types';
import { LBS_TO_KG } from '@/lib/constants';
import { resolveCanonicalExerciseName } from '@/lib/exercise-normalization';
import { formatExerciseDisplayName } from '@/lib/exercise-display';
import type {
  FitnessGoal,
  PersonalRecord,
  StrengthFinding,
  StrengthImbalanceInput,
  StrengthLevel,
  UserProfile,
  WorkoutLog,
} from '@/lib/types';
import { getStrengthRatioStandards, getNormalizedExerciseName } from '@/lib/strength-standards';
import { toTitleCase } from '@/lib/utils';
import {
  IMBALANCE_CONFIG,
  IMBALANCE_TYPES,
  type ImbalanceType,
} from '@/analysis/analysis.config';
import { buildSixWeekLiftMetrics, type SixWeekLiftMetricsMap } from '@/analysis/six-week-lift-metrics';
import { strengthLevelRanks, type ImbalanceFocus } from '@/analysis/analysis.utils';
import type { ImbalanceConfigLoadResult } from '@/lib/imbalance-config-types';
import { buildImbalancePairMatches } from '@/analysis/imbalance-matcher';

export type ClientSideFinding =
  | StrengthFinding
  | { imbalanceType: ImbalanceType; hasData: false; missingLifts?: string[] };

export type SeverityBadge = {
  text: 'Minor' | 'Watch' | 'Risk' | 'High Risk';
  variant: 'secondary' | 'accent' | 'default' | 'destructive';
};

type LiftSummary = {
  exerciseName: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  sessionCount: number;
};

/**
 * Strength balance card currently supports ratio-driven classification only.
 */
const SUPPORTED_IMBALANCE_MODE = 'ratio_only' as const;

export const resolveExerciseOptions = (
  options: string[],
  exerciseLibrary: ExerciseDocument[]
): string[] => {
  return options.map(name => resolveCanonicalExerciseName(name, exerciseLibrary));
};

const getBestLiftSummary = (
  metricsMap: SixWeekLiftMetricsMap,
  exerciseOptions: string[],
  exerciseLibrary: ExerciseDocument[]
): LiftSummary | null => {
  const resolvedOptions = resolveExerciseOptions(exerciseOptions, exerciseLibrary);

  const candidates: LiftSummary[] = [];
  for (const option of resolvedOptions) {
    const normalizedOption = getNormalizedExerciseName(option);
    const metric = metricsMap[normalizedOption];

    if (!metric || metric.avgE1RM === null || metric.avgE1RMUnit === null || metric.sessionCount === 0) {
      continue;
    }

    candidates.push({
      exerciseName: option,
      weight: metric.avgE1RM,
      weightUnit: metric.avgE1RMUnit,
      sessionCount: metric.sessionCount,
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.sessionCount - a.sessionCount);
  return candidates[0];
};

export const getGuidingLevel = (lift1Level: StrengthLevel, lift2Level: StrengthLevel): StrengthLevel => {
  const rank1 = strengthLevelRanks[lift1Level];
  const rank2 = strengthLevelRanks[lift2Level];
  const guidingLevelRank = rank1 === -1 || rank2 === -1 ? -1 : Math.min(rank1, rank2);
  return (
    (Object.keys(strengthLevelRanks).find(
      key => strengthLevelRanks[key as StrengthLevel] === guidingLevelRank
    ) as StrengthLevel) || 'N/A'
  );
};

export const getNextStrengthLevel = (currentLevel: StrengthLevel): StrengthLevel | null => {
  if (currentLevel === 'Beginner') return 'Intermediate';
  if (currentLevel === 'Intermediate') return 'Advanced';
  if (currentLevel === 'Advanced') return 'Elite';
  return null;
};

export const getStrengthLevelFromExerciseLibrary = (
  record: PersonalRecord,
  profile: UserProfile,
  exerciseLibrary: ExerciseDocument[]
): StrengthLevel => {
  const canonicalName = resolveCanonicalExerciseName(record.exerciseName, exerciseLibrary);
  const normalizedCanonicalName = getNormalizedExerciseName(canonicalName);

  const exercise = exerciseLibrary.find(
    candidate => getNormalizedExerciseName(candidate.normalizedName) === normalizedCanonicalName
  );

  if (!exercise || exercise.type !== 'strength' || !exercise.strengthStandards) {
    return 'N/A';
  }

  if (!profile.gender || (profile.gender !== 'Male' && profile.gender !== 'Female')) {
    return 'N/A';
  }

  let baseValueInKg: number;
  if (exercise.strengthStandards.baseType === 'bw') {
    if (!profile.weightValue || !profile.weightUnit) return 'N/A';
    baseValueInKg = profile.weightUnit === 'lbs' ? profile.weightValue * LBS_TO_KG : profile.weightValue;
  } else {
    if (!profile.skeletalMuscleMassValue || !profile.skeletalMuscleMassUnit) return 'N/A';
    baseValueInKg =
      profile.skeletalMuscleMassUnit === 'lbs'
        ? profile.skeletalMuscleMassValue * LBS_TO_KG
        : profile.skeletalMuscleMassValue;
  }

  if (baseValueInKg <= 0) return 'N/A';

  const liftedWeightInKg = record.weightUnit === 'lbs' ? record.weight * LBS_TO_KG : record.weight;
  const rawRatio = liftedWeightInKg / baseValueInKg;

  let ageAdjustedRatio = rawRatio;
  if (profile.age && profile.age > 40) {
    const ageFactor = 1 + (profile.age - 40) * 0.01;
    ageAdjustedRatio *= ageFactor;
  }

  const standards = exercise.strengthStandards.standards[profile.gender];
  if (!standards) return 'N/A';

  if (ageAdjustedRatio >= standards.elite) return 'Elite';
  if (ageAdjustedRatio >= standards.advanced) return 'Advanced';
  if (ageAdjustedRatio >= standards.intermediate) return 'Intermediate';
  return 'Beginner';
};

export const buildClientSideFindings = (
  workoutLogs: WorkoutLog[] | undefined,
  userProfile: UserProfile | undefined,
  exercises: ExerciseDocument[],
  imbalanceConfig?: ImbalanceConfigLoadResult | null
): ClientSideFinding[] => {
  if (!workoutLogs || !userProfile || !userProfile.gender) {
    return [];
  }

  const metricsMap = buildSixWeekLiftMetrics(workoutLogs, exercises);
  const findings: ClientSideFinding[] = [];

  const buildFindingFromLifts = (
    type: ImbalanceType,
    lift1: LiftSummary,
    lift2: LiftSummary
  ): StrengthFinding | { imbalanceType: ImbalanceType; hasData: false } => {
    const config = IMBALANCE_CONFIG[type];

    const lift1Level = getStrengthLevelFromExerciseLibrary(
      {
        id: 'synthetic',
        userId: '',
        exerciseName: lift1.exerciseName,
        weight: lift1.weight,
        weightUnit: lift1.weightUnit,
        date: new Date(),
      },
      userProfile,
      exercises
    );

    const lift2Level = getStrengthLevelFromExerciseLibrary(
      {
        id: 'synthetic',
        userId: '',
        exerciseName: lift2.exerciseName,
        weight: lift2.weight,
        weightUnit: lift2.weightUnit,
        date: new Date(),
      },
      userProfile,
      exercises
    );

    const lift1WeightKg = lift1.weightUnit === 'lbs' ? lift1.weight * LBS_TO_KG : lift1.weight;
    const lift2WeightKg = lift2.weightUnit === 'lbs' ? lift2.weight * LBS_TO_KG : lift2.weight;

    if (lift2WeightKg <= 0) {
      return { imbalanceType: type, hasData: false };
    }

    const ratio = config.ratioCalculation(lift1WeightKg, lift2WeightKg);
    const guidingLevel = getGuidingLevel(lift1Level, lift2Level);
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
    if (SUPPORTED_IMBALANCE_MODE === 'ratio_only' && ratioStandards) {
      const ratioIsUnbalanced = ratio < ratioStandards.lowerBound || ratio > ratioStandards.upperBound;
      if (ratioIsUnbalanced) {
        imbalanceFocus = 'Ratio Imbalance';
      }
    }

    return {
      imbalanceType: type,
      lift1Name: formatExerciseDisplayName(toTitleCase(lift1.exerciseName)),
      lift1Weight: lift1.weight,
      lift1Unit: lift1.weightUnit,
      lift1SessionCount: lift1.sessionCount,
      lift2Name: formatExerciseDisplayName(toTitleCase(lift2.exerciseName)),
      lift2Weight: lift2.weight,
      lift2Unit: lift2.weightUnit,
      lift2SessionCount: lift2.sessionCount,
      userRatio: `${ratio.toFixed(2)}:1`,
      targetRatio: targetRatioDisplay,
      balancedRange: balancedRangeDisplay,
      imbalanceFocus,
      lift1Level,
      lift2Level,
    };
  };

  if (imbalanceConfig?.source === 'firestore') {
    const matchedPairs = buildImbalancePairMatches(metricsMap, exercises, imbalanceConfig.pairs);

    for (const matchedPair of matchedPairs) {
      if (!matchedPair.hasData) {
        findings.push({
          imbalanceType: matchedPair.imbalanceType,
          hasData: false,
          missingLifts: matchedPair.missingLifts,
        });
        continue;
      }

      const finding = buildFindingFromLifts(
        matchedPair.imbalanceType,
        matchedPair.lift1,
        matchedPair.lift2
      );
      findings.push(finding);
    }

    return findings;
  }

  for (const type of IMBALANCE_TYPES) {
    const config = IMBALANCE_CONFIG[type];
    const lift1 = getBestLiftSummary(metricsMap, config.lift1Options, exercises);
    const lift2 = getBestLiftSummary(metricsMap, config.lift2Options, exercises);

    if (!lift1 || !lift2) {
      findings.push({ imbalanceType: type, hasData: false });
      continue;
    }

    findings.push(buildFindingFromLifts(type, lift1, lift2));
  }

  return findings;
};

export const buildStrengthAnalysisInput = (
  userProfile: UserProfile,
  clientSideFindings: ClientSideFinding[],
  fitnessGoals: FitnessGoal[] = []
): StrengthImbalanceInput => {
  const validFindings = clientSideFindings.filter(
    finding => !('hasData' in finding)
  ) as StrengthFinding[];

  return {
    clientSideFindings: validFindings,
    userProfile: {
      age: userProfile.age,
      gender: userProfile.gender,
      weightValue: userProfile.weightValue,
      weightUnit: userProfile.weightUnit,
      skeletalMuscleMassValue: userProfile.skeletalMuscleMassValue,
      skeletalMuscleMassUnit: userProfile.skeletalMuscleMassUnit,
      fitnessGoals: fitnessGoals.filter(goal => !goal.achieved).map(goal => ({
        description: goal.description,
        isPrimary: goal.isPrimary || false,
      })),
    },
  };
};

export const parseRatioValue = (ratioText: string): number | null => {
  const parsed = parseFloat(ratioText.split(':')[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseBalancedRange = (rangeText: string): { lower: number; upper: number } | null => {
  const [lowerText, upperText] = rangeText.replace(':1', '').split('-');
  const lower = parseFloat(lowerText);
  const upper = parseFloat(upperText);

  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return null;
  }

  return { lower, upper };
};

export const ratioSeverityBadge = (finding: StrengthFinding): SeverityBadge => {
  const ratioValue = parseRatioValue(finding.userRatio);
  const range = parseBalancedRange(finding.balancedRange);

  if (ratioValue === null || range === null) {
    return { text: 'Watch', variant: 'accent' };
  }

  const distance =
    ratioValue < range.lower
      ? range.lower - ratioValue
      : ratioValue > range.upper
        ? ratioValue - range.upper
        : 0;

  if (distance <= 0.05) {
    return { text: 'Minor', variant: 'secondary' };
  }
  if (distance <= 0.1) {
    return { text: 'Watch', variant: 'accent' };
  }
  if (distance <= 0.15) {
    return { text: 'Risk', variant: 'default' };
  }
  return { text: 'High Risk', variant: 'destructive' };
};

export const severityBadgeForFinding = (finding: StrengthFinding): SeverityBadge | null => {
  if (finding.imbalanceFocus === 'Balanced') {
    return null;
  }
  return ratioSeverityBadge(finding);
};
