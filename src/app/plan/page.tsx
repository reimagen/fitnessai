
"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, AlertTriangle, Info, UserPlus } from "lucide-react";
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { generateWeeklyWorkoutPlanAction } from "./actions";
import type { StoredWeeklyPlan } from "@/lib/types";
import { useUserProfile, useWorkouts, usePersonalRecords, useUpdateUserProfile } from "@/lib/firestore.service";
import { addWeeks, format, startOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAuth } from "@/lib/auth.service";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { constructUserProfileContext } from "./utils/userProfileContext";


export default function PlanPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profileResult, isLoading: isLoadingProfile, isError: isErrorProfile } = useUserProfile();
  const userProfile = profileResult?.data;
  const isProfileNotFound = profileResult?.notFound === true;

  const { data: workoutLogs, isLoading: isLoadingWorkouts, isError: isErrorWorkouts } = useWorkouts();
  const { data: personalRecords, isLoading: isLoadingPrs, isError: isErrorPrs } = usePersonalRecords();
  const updateUserMutation = useUpdateUserProfile();

  const [planWeekPreference, setPlanWeekPreference] = useState<"current" | "next">("current");
  const currentWeekStartDate = useMemo(() => {
    const baseWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const targetWeekStart = planWeekPreference === "next" ? addWeeks(baseWeekStart, 1) : baseWeekStart;
    return format(targetWeekStart, "yyyy-MM-dd");
  }, [planWeekPreference]);
  const [apiIsLoading, setApiIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerationFeedback, setRegenerationFeedback] = useState("");

  const userProfileContextString = useMemo(() => {
    if (isLoadingProfile || isLoadingWorkouts || isLoadingPrs) return null;
    if (!userProfile || !workoutLogs || !personalRecords) return null;
    return constructUserProfileContext(userProfile, workoutLogs, personalRecords, userProfile.strengthAnalysis?.result);
  }, [userProfile, workoutLogs, personalRecords, isLoadingProfile, isLoadingWorkouts, isLoadingPrs]);

  const handleGeneratePlan = async () => {
    if (!userProfileContextString || !currentWeekStartDate) {
      toast({ title: "Missing Data", description: "User profile or workout history is not available yet. Please wait or complete your profile.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Not Signed In", description: "Please sign in again to generate a plan.", variant: "destructive" });
      return;
    }

    setApiIsLoading(true);
    setError(null);

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

      updateUserMutation.mutate({ weeklyPlan: newPlanData }, {
        onSuccess: () => {
          setRegenerationFeedback(""); // Clear feedback box on success
          toast({ title: "Plan Generated!", description: "Your new weekly workout plan is ready and saved to your profile." });
        },
        onError: (error) => {
          setError(`Failed to save the plan to your profile: ${error.message}`);
          toast({ title: "Save Failed", description: `Could not save plan: ${error.message}`, variant: "destructive" });
        }
      });
    } else {
      const isLimitError = result.error?.toLowerCase().includes('limit');
      const toastTitle = isLimitError ? "Daily Limit Reached" : "Generation Failed";
      setError(result.error || "Failed to generate workout plan. The AI might be busy or an unexpected error occurred.");
      toast({ title: toastTitle, description: result.error || "Could not generate plan.", variant: "destructive" });
    }
    setApiIsLoading(false);
  };

  const hasMinimumProfileForPlan = userProfile && userProfile.fitnessGoals && userProfile.fitnessGoals.filter(g => !g.achieved).length > 0 && userProfile.experienceLevel;
  const isLoading = isLoadingProfile || isLoadingWorkouts || isLoadingPrs;
  const isError = isErrorProfile || isErrorWorkouts || isErrorPrs;
  const generatedPlan = userProfile?.weeklyPlan;
  const FEEDBACK_CHAR_LIMIT = 300;

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isProfileNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <header className="mb-12">
          <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Get Your AI Plan</h1>
          <p className="mt-2 text-lg text-muted-foreground">Create a profile to generate a personalized workout plan.</p>
        </header>
        <Card className="shadow-lg max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="font-headline">Create Your Profile First</CardTitle>
            <CardDescription>
              Your profile is needed for the AI to create a workout plan tailored to your goals and stats.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profile" passHref>
              <Button className="w-full">
                <UserPlus className="mr-2" />
                Go to Profile Setup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasFeedback = regenerationFeedback.trim().length > 0;
  let buttonText = "Generate My Weekly Plan";
  if (generatedPlan) {
    buttonText = hasFeedback ? "Regenerate with Feedback" : "Generate Plan";
  }


  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Your AI Workout Plan</h1>
        <p className="text-muted-foreground">Get a personalized weekly workout schedule generated by AI.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Zap className="h-6 w-6 text-accent" />
            Generate New Weekly Plan
          </CardTitle>
          <CardDescription>
            Your plan is tailored based on your profile, goals, and recent activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading profile data...</p>
          ) : isError ? (
            <ErrorState message="Could not load the necessary data to generate a plan. Please check your connection and try again." />
          ) : !hasMinimumProfileForPlan ? (
            <div className="flex items-center gap-2 p-4 rounded-md border border-yellow-500 bg-yellow-500/10 text-yellow-700">
              <Info className="h-5 w-5" />
              <div>
                <p className="font-semibold">Complete Your Profile</p>
                <p className="text-sm">Please set at least one fitness goal and specify your experience level on the Profile page to generate a plan.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan-week-preference">Select Plan Week</Label>
                <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                  {`This will generate a plan for the week starting Sunday, ${format(new Date(currentWeekStartDate.replace(/-/g, "/")), "MMMM d, yyyy")}.`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    id="plan-week-preference"
                    type="button"
                    variant={planWeekPreference === "current" ? "default" : "outline"}
                    onClick={() => setPlanWeekPreference("current")}
                    disabled={apiIsLoading || updateUserMutation.isPending}
                  >
                    This week
                  </Button>
                  <Button
                    type="button"
                    variant={planWeekPreference === "next" ? "default" : "outline"}
                    onClick={() => setPlanWeekPreference("next")}
                    disabled={apiIsLoading || updateUserMutation.isPending}
                  >
                    Next week
                  </Button>
                </div>
              </div>
              {generatedPlan && (
                <div className="space-y-2">
                  <Label htmlFor="regeneration-feedback">Not quite right? Tell AI what to change for this week&apos;s plan. Note: long-term preferences should be stored in your profile.</Label>
                  <Textarea
                    id="regeneration-feedback"
                    placeholder="e.g., 'Twisted my ankle last week, need to take it easy' or 'Can you add more cardio this week?'"
                    value={regenerationFeedback}
                    onChange={(e) => setRegenerationFeedback(e.target.value)}
                    className="min-h-[80px]"
                    disabled={apiIsLoading || updateUserMutation.isPending}
                    maxLength={FEEDBACK_CHAR_LIMIT}
                  />
                  <p className={cn(
                    "text-xs text-right",
                    regenerationFeedback.length > FEEDBACK_CHAR_LIMIT ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {regenerationFeedback.length} / {FEEDBACK_CHAR_LIMIT}
                  </p>
                </div>
              )}
              <Button onClick={handleGeneratePlan} disabled={apiIsLoading || isLoading || updateUserMutation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {apiIsLoading || updateUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {buttonText}
              </Button>
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-md border border-destructive bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-semibold">{error.toLowerCase().includes('limit') ? "Daily Limit Reached" : "Generation Error"}</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          {userProfileContextString && process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">View context used for AI plan generation</summary>
              <pre className="mt-2 p-2 border bg-secondary/50 rounded-md whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                {userProfileContextString}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>

      {generatedPlan && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Current Weekly Plan</CardTitle>
            <CardDescription>
              Generated on: {format(generatedPlan.generatedDate, 'MMMM d, yyyy \'at\' h:mm a')} for week starting {format(new Date(generatedPlan.weekStartDate.replace(/-/g, '/')), 'MMMM d, yyyy')}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer text={generatedPlan.plan} />
            </div>
            <div className="mt-6 pt-6 border-t text-sm text-muted-foreground space-y-4">
              <p>
                <strong className="font-semibold text-foreground">A General Safety Reminder:</strong> Always prioritize proper form over lifting heavy weights. If you experience any pain, stop the exercise and consult a healthcare professional.
              </p>
              <p>
                <strong className="font-semibold text-foreground">A Note on Weights:</strong> Suggested weights for exercises with a logged Personal Record (PR) are calculated at 75% of your PR. For other exercises, weights are estimated based on your general profile. Keep your PRs updated for the most accurate recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
