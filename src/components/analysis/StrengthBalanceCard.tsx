import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Lightbulb, Scale } from 'lucide-react';
import { format } from 'date-fns/format';
import React from 'react';
import type { PersonalRecord, StrengthFinding, StrengthImbalanceOutput, UserProfile, StrengthLevel, StrengthImbalanceInput, WorkoutLog } from '@/lib/types';
import type { ExerciseDocument } from '@/lib/exercise-types';
import type { ImbalanceType } from '@/analysis/analysis.config';
import { useAnalyzeStrength } from '@/lib/firestore.service';
import { useToast } from '@/hooks/useToast';
import { IMBALANCE_CONFIG, IMBALANCE_TYPES, find6WeekAvgE1RM } from '@/analysis/analysis.config';
import { resolveCanonicalExerciseName } from '@/lib/exercise-normalization';
import { LBS_TO_KG } from '@/lib/constants';
import { toTitleCase } from '@/lib/utils';
import { getStrengthRatioStandards } from '@/lib/strength-standards';
import { focusBadgeProps, strengthLevelRanks, type ImbalanceFocus } from '@/analysis/analysis.utils';

interface StrengthBalanceCardProps {
  isLoading: boolean;
  userProfile: UserProfile | undefined;
  workoutLogs: WorkoutLog[] | undefined;
  strengthAnalysis: { result: StrengthImbalanceOutput; generatedDate: Date } | undefined;
  exercises: ExerciseDocument[];
  fitnessGoals?: import('@/lib/types').FitnessGoal[];
}

type ClientSideFinding = StrengthFinding | { imbalanceType: ImbalanceType; hasData: false };

/**
 * Resolves exercise options to canonical names
 */
const resolveExerciseOptions = (options: string[], exerciseLibrary: ExerciseDocument[]): string[] => {
  return options.map(name => resolveCanonicalExerciseName(name, exerciseLibrary));
};

const getGuidingLevel = (lift1Level: StrengthLevel, lift2Level: StrengthLevel) => {
  const rank1 = strengthLevelRanks[lift1Level];
  const rank2 = strengthLevelRanks[lift2Level];
  const guidingLevelRank = rank1 === -1 || rank2 === -1 ? -1 : Math.min(rank1, rank2);
  return (Object.keys(strengthLevelRanks).find(
    key => strengthLevelRanks[key as StrengthLevel] === guidingLevelRank,
  ) as StrengthLevel) || 'N/A';
};

const getNextStrengthLevel = (currentLevel: StrengthLevel) => {
  if (currentLevel === 'Beginner') return 'Intermediate';
  if (currentLevel === 'Intermediate') return 'Advanced';
  if (currentLevel === 'Advanced') return 'Elite';
  return null;
};

const getStrengthLevelFromExerciseLibrary = (
  record: PersonalRecord,
  profile: UserProfile,
  exerciseLibrary: ExerciseDocument[]
): StrengthLevel => {
  const canonicalName = resolveCanonicalExerciseName(record.exerciseName, exerciseLibrary);
  const exercise = exerciseLibrary.find(
    candidate => candidate.normalizedName.toLowerCase() === canonicalName.toLowerCase()
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
    baseValueInKg = profile.weightUnit === 'lbs'
      ? profile.weightValue * LBS_TO_KG
      : profile.weightValue;
  } else {
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

  const standards = exercise.strengthStandards.standards[profile.gender];
  if (!standards) return 'N/A';

  if (ageAdjustedRatio >= standards.elite) return 'Elite';
  if (ageAdjustedRatio >= standards.advanced) return 'Advanced';
  if (ageAdjustedRatio >= standards.intermediate) return 'Intermediate';
  return 'Beginner';
};

const buildClientSideFindings = (workoutLogs: WorkoutLog[] | undefined, userProfile: UserProfile | undefined, exercises: ExerciseDocument[]) => {
  if (!workoutLogs || !userProfile || !userProfile.gender) {
    return [];
  }

  const findings: ClientSideFinding[] = [];

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

    const lift1Level = getStrengthLevelFromExerciseLibrary({
      id: 'synthetic',
      userId: '',
      exerciseName: lift1.exerciseName,
      weight: lift1.weight,
      weightUnit: lift1.weightUnit,
      date: new Date(),
    } as PersonalRecord, userProfile, exercises);

    const lift2Level = getStrengthLevelFromExerciseLibrary({
      id: 'synthetic',
      userId: '',
      exerciseName: lift2.exerciseName,
      weight: lift2.weight,
      weightUnit: lift2.weightUnit,
      date: new Date(),
    } as PersonalRecord, userProfile, exercises);

    const lift1WeightKg = lift1.weightUnit === 'lbs' ? lift1.weight * 0.453592 : lift1.weight;
    const lift2WeightKg = lift2.weightUnit === 'lbs' ? lift2.weight * 0.453592 : lift2.weight;

    if (lift2WeightKg === 0) {
      findings.push({ imbalanceType: type, hasData: false });
      return;
    }

    const ratio = config.ratioCalculation(lift1WeightKg, lift2WeightKg);
    const guidingLevel = getGuidingLevel(lift1Level, lift2Level);
    const ratioStandards = getStrengthRatioStandards(type, userProfile.gender as 'Male' | 'Female', guidingLevel);

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
};

const buildStrengthAnalysisInput = (userProfile: UserProfile, clientSideFindings: ClientSideFinding[], fitnessGoals: import('@/lib/types').FitnessGoal[] = []): StrengthImbalanceInput => {
  const validFindings = clientSideFindings.filter(f => !('hasData' in f)) as StrengthFinding[];

  return {
    clientSideFindings: validFindings.map(f => ({
      ...f,
      targetRatio: f.targetRatio,
    })),
    userProfile: {
      age: userProfile.age,
      gender: userProfile.gender,
      weightValue: userProfile.weightValue,
      weightUnit: userProfile.weightUnit,
      skeletalMuscleMassValue: userProfile.skeletalMuscleMassValue,
      skeletalMuscleMassUnit: userProfile.skeletalMuscleMassUnit,
      fitnessGoals: fitnessGoals
        .filter(g => !g.achieved)
        .map(g => ({
          description: g.description,
          isPrimary: g.isPrimary || false,
        })),
    },
  };
};

const StrengthBalanceFindingCard: React.FC<{
  type: ImbalanceType;
  finding: ClientSideFinding;
  aiFinding: StrengthImbalanceOutput['findings'][number] | undefined;
  isAnalyzing: boolean;
}> = ({ type, finding, aiFinding, isAnalyzing }) => {
  if ('hasData' in finding && !finding.hasData) {
    return (
      <Card className="p-4 bg-secondary/50 flex flex-col transition-all hover:-translate-y-0.5 hover:bg-secondary/70 hover:shadow-xl hover:shadow-primary/15">
        <CardTitle className="text-base flex items-center justify-between">
          {type} <Badge variant="secondary">No Data</Badge>
        </CardTitle>
        <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground my-4">
          <Scale className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-semibold">Log workouts to analyze</p>
          <p className="text-xs text-muted-foreground mt-1">Requires Data from Last 6 Weeks</p>
        </div>
      </Card>
    );
  }

  const dataFinding = finding as StrengthFinding;
  const badgeProps = focusBadgeProps(dataFinding.imbalanceFocus);
  const nextLevel = getNextStrengthLevel(dataFinding.lift1Level);

  return (
    <Card className="p-4 bg-secondary/50 flex flex-col transition-all hover:-translate-y-0.5 hover:bg-secondary/70 hover:shadow-xl hover:shadow-primary/15">
      <CardTitle className="text-base">{dataFinding.imbalanceType}</CardTitle>
      <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 pb-4">
        <p>
          {dataFinding.lift1Name}:{' '}
          <span className="font-bold text-foreground">
            {dataFinding.lift1Weight} {dataFinding.lift1Unit}
          </span>
          {dataFinding.lift1SessionCount && (
            <span className="text-xs text-muted-foreground ml-1">
              ({dataFinding.lift1SessionCount} sessions)
            </span>
          )}
        </p>
        <p>
          {dataFinding.lift2Name}:{' '}
          <span className="font-bold text-foreground">
            {dataFinding.lift2Weight} {dataFinding.lift2Unit}
          </span>
          {dataFinding.lift2SessionCount && (
            <span className="text-xs text-muted-foreground ml-1">
              ({dataFinding.lift2SessionCount} sessions)
            </span>
          )}
        </p>
        <p>Level: <span className="font-medium text-foreground capitalize">{dataFinding.lift1Level !== 'N/A' ? dataFinding.lift1Level : 'N/A'}</span></p>
        <p>Level: <span className="font-medium text-foreground capitalize">{dataFinding.lift2Level !== 'N/A' ? dataFinding.lift2Level : 'N/A'}</span></p>
        <p>Your Ratio: <span className="font-bold text-foreground">{dataFinding.userRatio}</span></p>
        <p>Balanced Range: <span className="font-bold text-foreground">{dataFinding.balancedRange}</span></p>
      </div>

      <div className="pt-4 mt-auto border-t flex flex-col flex-grow">
        <div className="flex-grow">
          {isAnalyzing ? (
            <div className="flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating AI insight...
            </div>
          ) : aiFinding ? (
            <div className="space-y-3">
              <div className="mb-4">
                <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
              </div>
              <div>
                <p className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Insight</p>
                <p className="text-xs text-muted-foreground mt-1">{aiFinding.insight}</p>
              </div>
              <div>
                <p className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-accent" />Recommendation</p>
                <p className="text-xs text-muted-foreground mt-1">{aiFinding.recommendation}</p>
              </div>
            </div>
          ) : dataFinding.imbalanceFocus !== 'Balanced' ? (
            <div>
              <div className="mb-4">
                <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
              </div>
              <p className="text-center text-muted-foreground text-xs">This appears imbalanced. Click &quot;Get AI Insights&quot; for analysis.</p>
            </div>
          ) : dataFinding.lift1Level === 'N/A' || dataFinding.lift1Level === 'Elite' || !nextLevel ? null : (
            <div>
              <div className="mb-4">
                <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
              </div>
              <p className="text-sm font-semibold flex items-center gap-2">Next Focus</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your lifts are well-balanced. Focus on progressive overload to advance both lifts towards the <span className="font-bold text-foreground">{dataFinding.lift1Level}</span> to <span className="font-bold text-foreground">{nextLevel}</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const StrengthBalanceCard: React.FC<StrengthBalanceCardProps> = ({
  isLoading,
  userProfile,
  workoutLogs,
  strengthAnalysis,
  exercises,
  fitnessGoals = [],
}) => {
  const { toast } = useToast();
  const analyzeStrengthMutation = useAnalyzeStrength();

  const clientSideFindings = React.useMemo(
    () => buildClientSideFindings(workoutLogs, userProfile, exercises),
    [workoutLogs, userProfile, exercises],
  );

  const handleAnalyzeStrength = () => {
    if (!userProfile) {
        toast({ title: "Profile Not Loaded", description: "Your user profile is not available. Please try again.", variant: "destructive" });
        return;
    }
    const analysisInput = buildStrengthAnalysisInput(userProfile, clientSideFindings, fitnessGoals);
    analyzeStrengthMutation.mutate(analysisInput);
  };



  const analysisToRender = strengthAnalysis?.result;
  const generatedDate = strengthAnalysis?.generatedDate;

  return (
    <Card className="shadow-lg lg:col-span-6">
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-grow">
            <CardTitle className="font-headline flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />Strength Balance Analysis
            </CardTitle>
            <CardDescription className="mt-2">
              Uses 6-week average e1RM for analysis. Requires consistent workout logging.
              {generatedDate && (
                <span className="block text-xs mt-1 text-muted-foreground/80">
                  Last analyzed on: {format(generatedDate, "MMMM d, yyyy 'at' h:mm a")}
                </span>
              )}
            </CardDescription>
          </div>
          <Button onClick={handleAnalyzeStrength} disabled={analyzeStrengthMutation.isPending || isLoading || clientSideFindings.length === 0} className="flex-shrink-0 w-full md:w-auto">
            {analyzeStrengthMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
            {strengthAnalysis ? "Re-analyze Insights" : "Get AI Insights"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {isLoading ? ( // Use the isLoading prop passed from the parent
            <div className="text-center text-muted-foreground p-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto"/>
            </div>
        ) : (
            <div className="w-full space-y-4">
                {analysisToRender?.summary && analysisToRender.findings.length > 0 && (
                    <p className="text-center text-muted-foreground italic text-sm">{analysisToRender.summary}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {IMBALANCE_TYPES.map((type, index) => {
                        const finding = clientSideFindings.find(f => f.imbalanceType === type);
                        if (!finding) return null;
                        const aiFinding = analysisToRender?.findings.find(f => f.imbalanceType === type);
                        return (
                          <StrengthBalanceFindingCard
                            key={index}
                            type={type}
                            finding={finding}
                            aiFinding={aiFinding}
                            isAnalyzing={analyzeStrengthMutation.isPending}
                          />
                        );
                    })}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StrengthBalanceCard;
