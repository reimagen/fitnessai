import { subWeeks, isAfter } from "date-fns";
import { useToast } from "@/hooks/useToast";
import { useAnalyzeLiftProgression } from "@/lib/firestore.service";
import { getNormalizedExerciseName } from "@/lib/strength-standards";
import { resolveCanonicalExerciseName } from "@/lib/exercise-normalization";
import type { AnalyzeLiftProgressionInput, StrengthLevel, UserProfile, WorkoutLog } from "@/lib/types";
import type { ExerciseDocument } from "@/lib/exercise-types";

type UseLiftProgressionAnalysisArgs = {
  userProfile: UserProfile | undefined;
  workoutLogs: WorkoutLog[] | undefined;
  selectedLift: string;
  selectedLiftKey: string;
  currentLiftLevel: StrengthLevel | null;
  trendImprovement: number | null;
  volumeTrend: number | null;
  exercises?: ExerciseDocument[];
};

export function useLiftProgressionAnalysis({
  userProfile,
  workoutLogs,
  selectedLift,
  selectedLiftKey,
  currentLiftLevel,
  trendImprovement,
  volumeTrend,
  exercises = [],
}: UseLiftProgressionAnalysisArgs) {
  const { toast } = useToast();
  const analyzeProgressionMutation = useAnalyzeLiftProgression();

  const handleAnalyzeProgression = () => {
    if (!selectedLift) return;
    if (!userProfile) {
      toast({ title: "Profile Not Loaded", description: "Your user profile is not available. Please try again.", variant: "destructive" });
      return;
    }
    if (!workoutLogs) return;

    const sixWeeksAgo = subWeeks(new Date(), 6);
    const exerciseHistory = workoutLogs
      .filter(log => isAfter(log.date, sixWeeksAgo))
      .flatMap(log =>
        log.exercises
          .filter(ex => {
            const resolvedExerciseName = resolveCanonicalExerciseName(ex.name, exercises);
            return getNormalizedExerciseName(resolvedExerciseName) === selectedLiftKey;
          })
          .map(ex => ({
            date: log.date.toISOString(),
            weight: ex.weight || 0,
            sets: ex.sets || 0,
            reps: ex.reps || 0,
          }))
      );

    const analysisInput: AnalyzeLiftProgressionInput = {
      exerciseName: selectedLift,
      exerciseHistory,
      userProfile: {
        age: userProfile.age,
        gender: userProfile.gender,
        heightValue: userProfile.heightValue,
        heightUnit: userProfile.heightUnit,
        weightValue: userProfile.weightValue,
        weightUnit: userProfile.weightUnit,
        skeletalMuscleMassValue: userProfile.skeletalMuscleMassValue,
        skeletalMuscleMassUnit: userProfile.skeletalMuscleMassUnit,
        fitnessGoals: (userProfile.fitnessGoals || [])
          .filter(g => !g.achieved)
          .map(g => ({
            description: g.description,
            isPrimary: g.isPrimary || false,
          })),
      },
      currentLevel: currentLiftLevel || undefined,
      trendPercentage: trendImprovement ?? undefined,
      volumeTrendPercentage: volumeTrend ?? undefined,
    };

    analyzeProgressionMutation.mutate(analysisInput);
  };

  return {
    handleAnalyzeProgression,
    isPending: analyzeProgressionMutation.isPending,
  };
}
