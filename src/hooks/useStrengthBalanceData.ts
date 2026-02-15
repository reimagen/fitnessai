import React from 'react';
import type { ExerciseDocument } from '@/lib/exercise-types';
import {
  reportImbalanceConfigValidationIssues,
  validateImbalanceConfigExercises,
} from '@/analysis/analysis.config';
import {
  buildClientSideFindings,
  buildStrengthAnalysisInput,
  type ClientSideFinding,
} from '@/analysis/strength-balance.utils';
import type { FitnessGoal, StrengthImbalanceInput, UserProfile, WorkoutLog } from '@/lib/types';
import type { ImbalanceConfigLoadResult } from '@/lib/imbalance-config-types';

interface UseStrengthBalanceDataParams {
  workoutLogs: WorkoutLog[] | undefined;
  userProfile: UserProfile | undefined;
  exercises: ExerciseDocument[];
  fitnessGoals?: FitnessGoal[];
  imbalanceConfig?: ImbalanceConfigLoadResult | null;
}

interface UseStrengthBalanceDataResult {
  clientSideFindings: ClientSideFinding[];
  imbalanceConfigIssues: ReturnType<typeof validateImbalanceConfigExercises>;
  hasFindings: boolean;
  analysisInput: StrengthImbalanceInput | null;
}

export function useStrengthBalanceData({
  workoutLogs,
  userProfile,
  exercises,
  fitnessGoals = [],
  imbalanceConfig,
}: UseStrengthBalanceDataParams): UseStrengthBalanceDataResult {
  const shouldValidateStaticConfig = imbalanceConfig?.source !== 'firestore';

  const clientSideFindings = React.useMemo(
    () => buildClientSideFindings(workoutLogs, userProfile, exercises, imbalanceConfig),
    [workoutLogs, userProfile, exercises, imbalanceConfig]
  );

  const imbalanceConfigIssues = React.useMemo(() => {
    if (!shouldValidateStaticConfig) {
      return [];
    }
    return validateImbalanceConfigExercises(exercises);
  }, [exercises, shouldValidateStaticConfig]);

  React.useEffect(() => {
    if (!shouldValidateStaticConfig) {
      return;
    }
    reportImbalanceConfigValidationIssues(imbalanceConfigIssues);
  }, [imbalanceConfigIssues, shouldValidateStaticConfig]);

  const analysisInput = React.useMemo(() => {
    if (!userProfile) {
      return null;
    }
    return buildStrengthAnalysisInput(userProfile, clientSideFindings, fitnessGoals);
  }, [userProfile, clientSideFindings, fitnessGoals]);

  const hasFindings = React.useMemo(
    () => clientSideFindings.some(finding => !('hasData' in finding)),
    [clientSideFindings]
  );

  return {
    clientSideFindings,
    imbalanceConfigIssues,
    hasFindings,
    analysisInput,
  };
}
