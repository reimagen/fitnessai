import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Scale, Zap } from 'lucide-react';
import { format } from 'date-fns/format';
import React from 'react';
import type { UserProfile, StrengthImbalanceOutput, WorkoutLog } from '@/lib/types';
import type { ExerciseDocument } from '@/lib/exercise-types';
import { useAnalyzeStrength } from '@/lib/firestore.service';
import { useToast } from '@/hooks/useToast';
import { IMBALANCE_TYPES } from '@/analysis/analysis.config';
import { useStrengthBalanceData } from '@/hooks/useStrengthBalanceData';
import { StrengthBalanceFindingCard } from '@/components/analysis/StrengthBalanceFindingCard';
import type { ImbalanceConfigLoadResult } from '@/lib/imbalance-config-types';

interface StrengthBalanceCardProps {
  isLoading: boolean;
  userProfile: UserProfile | undefined;
  workoutLogs: WorkoutLog[] | undefined;
  strengthAnalysis: { result: StrengthImbalanceOutput; generatedDate: Date } | undefined;
  exercises: ExerciseDocument[];
  fitnessGoals?: import('@/lib/types').FitnessGoal[];
  imbalanceConfig?: ImbalanceConfigLoadResult;
}

const StrengthBalanceCard: React.FC<StrengthBalanceCardProps> = ({
  isLoading,
  userProfile,
  workoutLogs,
  strengthAnalysis,
  exercises,
  fitnessGoals = [],
  imbalanceConfig,
}) => {
  const { toast } = useToast();
  const analyzeStrengthMutation = useAnalyzeStrength();

  const {
    clientSideFindings,
    imbalanceConfigIssues,
    hasFindings,
    analysisInput,
  } = useStrengthBalanceData({
    workoutLogs,
    userProfile,
    exercises,
    fitnessGoals,
    imbalanceConfig,
  });

  const handleAnalyzeStrength = () => {
    if (!analysisInput) {
      toast({
        title: 'Profile Not Loaded',
        description: 'Your user profile is not available. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    analyzeStrengthMutation.mutate(analysisInput);
  };

  const analysisToRender = strengthAnalysis?.result;
  const generatedDate = strengthAnalysis?.generatedDate;
  const hasConfigWarning =
    Boolean(imbalanceConfig) &&
    (imbalanceConfig?.source === 'fallback' ||
      (imbalanceConfig?.validationIssueCount ?? 0) > 0 ||
      imbalanceConfigIssues.length > 0);

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
          <Button
            onClick={handleAnalyzeStrength}
            disabled={analyzeStrengthMutation.isPending || isLoading || !hasFindings}
            className="flex-shrink-0 w-full md:w-auto"
          >
            {analyzeStrengthMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            {strengthAnalysis ? 'Re-analyze Insights' : 'Get AI Insights'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground p-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="w-full space-y-4">
            {hasConfigWarning && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                Strength analysis configuration is out of sync with the exercise library. Findings may
                be incomplete until configuration is fixed.
              </div>
            )}
            {analysisToRender?.summary && analysisToRender.findings.length > 0 && (
              <p className="text-center text-muted-foreground italic text-sm">{analysisToRender.summary}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {IMBALANCE_TYPES.map(type => {
                const finding = clientSideFindings.find(item => item.imbalanceType === type);
                if (!finding) return null;

                const aiFinding = analysisToRender?.findings.find(item => item.imbalanceType === type);

                return (
                  <StrengthBalanceFindingCard
                    key={type}
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
