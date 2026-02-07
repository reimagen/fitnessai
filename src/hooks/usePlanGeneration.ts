import { useMemo, useState } from "react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { generateWeeklyWorkoutPlanAction } from "@/app/plan/actions";
import { constructUserProfileContext } from "@/app/plan/utils/userProfileContext";
import { useAuth } from "@/lib/auth.service";
import { useSaveWeeklyPlan } from "@/lib/firestore.service";
import type { PersonalRecord, StoredWeeklyPlan, StoredStrengthAnalysis, UserProfile, WorkoutLog } from "@/lib/types";
import { useToast } from "@/hooks/useToast";

export type PlanWeekPreference = "current" | "next";

type UsePlanGenerationArgs = {
  userProfile: UserProfile | null | undefined;
  workoutLogs: WorkoutLog[] | undefined;
  personalRecords: PersonalRecord[] | undefined;
  strengthAnalysis: StoredStrengthAnalysis | null | undefined;
  isLoadingProfile: boolean;
  isLoadingWorkouts: boolean;
  isLoadingPrs: boolean;
};

type UsePlanGenerationResult = {
  planWeekPreference: PlanWeekPreference;
  setPlanWeekPreference: (value: PlanWeekPreference) => void;
  currentWeekStartDate: string;
  hasMinimumProfileForPlan: boolean;
  userProfileContextString: string | null;
  regenerationFeedback: string;
  setRegenerationFeedback: (value: string) => void;
  error: string | null;
  isGenerating: boolean;
  isSavingPlan: boolean;
  handleGeneratePlan: () => Promise<void>;
};

export function usePlanGeneration({
  userProfile,
  workoutLogs,
  personalRecords,
  strengthAnalysis,
  isLoadingProfile,
  isLoadingWorkouts,
  isLoadingPrs,
}: UsePlanGenerationArgs): UsePlanGenerationResult {
  const { toast } = useToast();
  const { user } = useAuth();
  const saveWeeklyPlanMutation = useSaveWeeklyPlan();

  const [planWeekPreference, setPlanWeekPreference] = useState<PlanWeekPreference>("current");
  const currentWeekStartDate = useMemo(() => {
    const baseWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const targetWeekStart = planWeekPreference === "next" ? addWeeks(baseWeekStart, 1) : baseWeekStart;
    return format(targetWeekStart, "yyyy-MM-dd");
  }, [planWeekPreference]);
  const [apiIsLoading, setApiIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerationFeedback, setRegenerationFeedback] = useState("");

  const hasMinimumProfileForPlan =
    !!userProfile &&
    !!userProfile.fitnessGoals &&
    userProfile.fitnessGoals.filter(g => !g.achieved).length > 0 &&
    !!userProfile.experienceLevel;

  const userProfileContextString = useMemo(() => {
    if (isLoadingProfile || isLoadingWorkouts || isLoadingPrs) return null;
    if (!userProfile || !workoutLogs || !personalRecords) return null;
    return constructUserProfileContext(
      userProfile,
      workoutLogs,
      personalRecords,
      strengthAnalysis?.result
    );
  }, [userProfile, workoutLogs, personalRecords, strengthAnalysis, isLoadingProfile, isLoadingWorkouts, isLoadingPrs]);

  const handleGeneratePlan = async () => {
    if (!userProfileContextString || !currentWeekStartDate) {
      toast({
        title: "Missing Data",
        description: "User profile or workout history is not available yet. Please wait or complete your profile.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({ title: "Not Signed In", description: "Please sign in again to generate a plan.", variant: "destructive" });
      return;
    }

    setApiIsLoading(true);
    setError(null);

    try {
      let finalContext = userProfileContextString;
      if (regenerationFeedback.trim()) {
        finalContext += `\n\n**CRITICAL REGENERATION INSTRUCTIONS:** The user has provided feedback on the previous plan. You MUST incorporate the following adjustments: "${regenerationFeedback}"`;
      }

      const result = await generateWeeklyWorkoutPlanAction({
        userId: user.uid,
        userProfileContext: finalContext,
        weekStartDate: currentWeekStartDate,
      });

      if (result.success && result.data?.weeklyPlan) {
        const newPlanData: StoredWeeklyPlan = {
          plan: result.data.weeklyPlan,
          generatedDate: new Date(),
          contextUsed: finalContext,
          userId: user.uid,
          weekStartDate: currentWeekStartDate,
        };

        saveWeeklyPlanMutation.mutate(
          newPlanData,
          {
            onSuccess: () => {
              setRegenerationFeedback("");
              toast({
                title: "Plan Generated!",
                description: "Your new weekly workout plan is ready and saved."
              });
            },
            onError: saveError => {
              setError(`Failed to save the plan: ${saveError.message}`);
              toast({
                title: "Save Failed",
                description: `Could not save plan: ${saveError.message}`,
                variant: "destructive"
              });
            },
          }
        );
      } else {
        const isLimitError = result.error?.toLowerCase().includes("limit");
        const toastTitle = isLimitError ? "Daily Limit Reached" : "Generation Failed";
        setError(result.error || "Failed to generate workout plan. The AI might be busy or an unexpected error occurred.");
        toast({ title: toastTitle, description: result.error || "Could not generate plan.", variant: "destructive" });
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Failed to generate workout plan.";
      setError(message);
      toast({ title: "Generation Failed", description: message, variant: "destructive" });
    } finally {
      setApiIsLoading(false);
    }
  };

  return {
    planWeekPreference,
    setPlanWeekPreference,
    currentWeekStartDate,
    hasMinimumProfileForPlan,
    userProfileContextString,
    regenerationFeedback,
    setRegenerationFeedback,
    error,
    isGenerating: apiIsLoading,
    isSavingPlan: saveWeeklyPlanMutation.isPending,
    handleGeneratePlan,
  };
}
