"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info, Loader2, Zap } from "lucide-react";
import type { PersonalRecord, UserProfile, WorkoutLog, StoredWeeklyPlan, StoredStrengthAnalysis } from "@/lib/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { usePlanGeneration } from "@/hooks/usePlanGeneration";
import { WeekPreferenceToggle } from "@/components/plan/WeekPreferenceToggle";
import { PlanFeedbackSection } from "@/components/plan/PlanFeedbackSection";

type PlanGeneratorSectionProps = {
  userProfile: UserProfile | null | undefined;
  workoutLogs: WorkoutLog[] | undefined;
  personalRecords: PersonalRecord[] | undefined;
  generatedPlan: StoredWeeklyPlan | null | undefined;
  strengthAnalysis: StoredStrengthAnalysis | null | undefined;
  isLoadingProfile: boolean;
  isLoadingWorkouts: boolean;
  isLoadingPrs: boolean;
  isErrorProfile: boolean;
  isErrorWorkouts: boolean;
  isErrorPrs: boolean;
};

const FEEDBACK_CHAR_LIMIT = 300;

export function PlanGeneratorSection({
  userProfile,
  workoutLogs,
  personalRecords,
  generatedPlan,
  strengthAnalysis,
  isLoadingProfile,
  isLoadingWorkouts,
  isLoadingPrs,
  isErrorProfile,
  isErrorWorkouts,
  isErrorPrs,
}: PlanGeneratorSectionProps) {
  const {
    planWeekPreference,
    setPlanWeekPreference,
    currentWeekStartDate,
    hasMinimumProfileForPlan,
    userProfileContextString,
    regenerationFeedback,
    setRegenerationFeedback,
    error,
    isGenerating,
    isSavingPlan,
    handleGeneratePlan,
  } = usePlanGeneration({
    userProfile,
    workoutLogs,
    personalRecords,
    strengthAnalysis,
    isLoadingProfile,
    isLoadingWorkouts,
    isLoadingPrs,
  });

  const isLoading = isLoadingProfile || isLoadingWorkouts || isLoadingPrs;
  const isError = isErrorProfile || isErrorWorkouts || isErrorPrs;

  const hasFeedback = regenerationFeedback.trim().length > 0;
  let buttonText = "Generate My Weekly Plan";
  if (generatedPlan) {
    buttonText = hasFeedback ? "Regenerate with Feedback" : "Generate Plan";
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          Generate New Weekly Plan
        </CardTitle>
        <CardDescription>Your plan is tailored to your profile, goals, and recent activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading profile data...
          </p>
        ) : isError ? (
          <ErrorState message="Could not load the necessary data to generate a plan. Please check your connection and try again." />
        ) : !hasMinimumProfileForPlan ? (
          <div className="flex items-center gap-2 p-4 rounded-md border border-amber-500 bg-amber-500/10 text-amber-700">
            <Info className="h-5 w-5" />
            <div>
              <p className="font-semibold">Complete Your Profile</p>
              <p className="text-sm">
                Please set at least one fitness goal and specify your experience level on the Profile page to generate a plan.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <WeekPreferenceToggle
              planWeekPreference={planWeekPreference}
              onChange={setPlanWeekPreference}
              currentWeekStartDate={currentWeekStartDate}
              disabled={isGenerating || isSavingPlan}
            />
            {generatedPlan && (
              <PlanFeedbackSection
                value={regenerationFeedback}
                onChange={setRegenerationFeedback}
                charLimit={FEEDBACK_CHAR_LIMIT}
                disabled={isGenerating || isSavingPlan}
              />
            )}
            <Button
              onClick={handleGeneratePlan}
              disabled={isGenerating || isLoading || isSavingPlan}
              className="w-full"
            >
              {isGenerating || isSavingPlan ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {buttonText}
            </Button>
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-md border border-destructive bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-semibold">{error.toLowerCase().includes("limit") ? "Daily Limit Reached" : "Generation Error"}</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        {userProfileContextString && process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">View context used for AI plan generation</summary>
            <pre className="mt-2 p-2 border bg-secondary/50 rounded-md whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
              {userProfileContextString}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
