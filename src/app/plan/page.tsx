
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, AlertTriangle, Info, UserPlus, RefreshCw } from "lucide-react";
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { generateWeeklyWorkoutPlanAction } from "./actions";
import type { UserProfile, WorkoutLog, PersonalRecord, StrengthImbalanceOutput, StoredWeeklyPlan } from "@/lib/types";
import { useUserProfile, useWorkouts, usePersonalRecords, useUpdateUserProfile } from "@/lib/firestore.service";
import { format, subWeeks, nextSunday as getNextSunday, startOfWeek, endOfWeek, isWithinInterval, subDays } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getStrengthLevel, getNormalizedExerciseName } from "@/lib/strength-standards";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAuth } from "@/lib/auth.service";
import Link from "next/link";
import { cn } from "@/lib/utils";

const constructUserProfileContext = (
    userProfile: UserProfile | null, 
    workoutLogs: WorkoutLog[],
    personalRecords: PersonalRecord[],
    strengthAnalysis: StrengthImbalanceOutput | undefined
): string | null => {
    if (!userProfile) return null;

    let context = "User Profile Context for AI Workout Plan Generation:\n";
    context += `User ID: ${userProfile.id}\n`;
    context += `Age: ${userProfile.age || 'Not specified'}\n`;
    context += `Gender: ${userProfile.gender || 'Not specified'}\n`;
    
    if (userProfile.heightValue && userProfile.heightUnit) {
      if (userProfile.heightUnit === 'cm') {
        context += `Height: ${userProfile.heightValue.toFixed(1)} cm\n`;
      } else { // ft/in
        const INCH_TO_CM = 2.54;
        const FT_TO_INCHES = 12;
        const totalInches = userProfile.heightValue / INCH_TO_CM;
        const feet = Math.floor(totalInches / FT_TO_INCHES);
        const inches = Math.round(totalInches % FT_TO_INCHES);
        context += `Height: ${feet} ft ${inches} in\n`;
      }
    } else {
      context += `Height: Not specified'}\n`;
    }

    if (userProfile.weightValue && userProfile.weightUnit) {
      context += `Weight: ${userProfile.weightValue} ${userProfile.weightUnit}\n`;
    } else {
      context += `Weight: Not specified\n`;
    }

    if (userProfile.skeletalMuscleMassValue && userProfile.skeletalMuscleMassUnit) {
      context += `Skeletal Muscle Mass: ${userProfile.skeletalMuscleMassValue} ${userProfile.skeletalMuscleMassUnit}\n`;
    } else {
      context += `Skeletal Muscle Mass: Not specified\n`;
    }

    if (userProfile.bodyFatPercentage) {
        context += `Body Fat Percentage: ${userProfile.bodyFatPercentage.toFixed(1)}%\n`;
    } else {
        context += `Body Fat Percentage: Not specified\n`;
    }

    context += "\nFitness Goals:\n";
    const activeGoals = (userProfile.fitnessGoals || []).filter(g => !g.achieved);
    if (activeGoals.length > 0) {
      const primaryGoal = activeGoals.find(g => g.isPrimary);
      if (primaryGoal) {
        context += `- Primary Goal: ${primaryGoal.description}${primaryGoal.targetDate ? ` (Target: ${format(primaryGoal.targetDate, 'yyyy-MM-dd')})` : ''}\n`;
      }
      activeGoals.filter(g => !g.isPrimary).forEach(goal => {
        context += `- Other Goal: ${goal.description}${goal.targetDate ? ` (Target: ${format(goal.targetDate, 'yyyy-MM-dd')})` : ''}\n`;
      });
    } else {
      context += "- No active goals listed.\n";
    }

    context += "\nWorkout Preferences:\n";
    context += `- Workouts Per Week: ${userProfile.workoutsPerWeek || 'Not specified'}\n`;
    context += `- Preferred Session Time: ${userProfile.sessionTimeMinutes ? `${userProfile.sessionTimeMinutes} minutes` : 'Not specified'}\n`;
    context += `- Experience Level: ${userProfile.experienceLevel || 'Not specified'}\n`;
    if (userProfile.weeklyCardioCalorieGoal) {
      context += `- Weekly Cardio Goal: ${userProfile.weeklyCardioCalorieGoal.toLocaleString()} kcal\n`;
    }
    if (userProfile.aiPreferencesNotes) {
      context += `- Additional Notes for AI: ${userProfile.aiPreferencesNotes}\n`;
    }

    context += "\nWorkout History Summary:\n";
    const today = new Date();
    const fourWeeksAgo = subWeeks(today, 4);
    const recentLogs = workoutLogs.filter(log => log.date >= fourWeeksAgo);
    
    if (recentLogs.length > 0) {
      context += `- Logged ${recentLogs.length} workouts in the last 4 weeks.\n`;
      
      const exerciseCounts: Record<string, number> = {};
      recentLogs.forEach(log => {
        log.exercises.forEach(ex => {
          const normalizedName = getNormalizedExerciseName(ex.name);
          if (normalizedName) {
            exerciseCounts[normalizedName] = (exerciseCounts[normalizedName] || 0) + 1;
          }
        });
      });
      const sortedExercises = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1]);
      if (sortedExercises.length > 0) {
        const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        context += `- Frequency per Exercise: ${sortedExercises.map(([name, count]) => `${toTitleCase(name)} (${count}x)`).join(', ')}\n`;
      } else {
        context += "- No specific exercises found in recent history.\n";
      }
    } else {
      context += "- No workout history logged in the last 4 weeks.\n";
    }

    // Cardio summary
    if (userProfile.weeklyCardioCalorieGoal) {
        context += `\nWeekly Cardio Summary (Last 4 Fully Completed Weeks):\n`;
        context += `- Weekly Goal: ${userProfile.weeklyCardioCalorieGoal.toLocaleString()} kcal\n`;

        let weeklySummaries: { label: string; calories: number }[] = [];
        let totalCaloriesOver4Weeks = 0;
        
        // Find the start of the current week (Sunday)
        const startOfThisWeek = startOfWeek(today, { weekStartsOn: 0 });
        // The most recent completed week ended yesterday (or Saturday if today is Sunday).
        const endOfLastCompletedWeek = subDays(startOfThisWeek, 1);
        
        for (let i = 0; i < 4; i++) {
            // Go back i weeks from the end of the last completed week.
            const weekEndDate = subWeeks(endOfLastCompletedWeek, i);
            const weekStartDate = startOfWeek(weekEndDate, { weekStartsOn: 0 });

            const logsThisWeek = workoutLogs.filter(log => 
                isWithinInterval(log.date, { start: weekStartDate, end: weekEndDate })
            );
            
            const weeklyTotalCalories = logsThisWeek.reduce((sum, log) => {
                return sum + log.exercises
                    .filter(ex => ex.category === 'Cardio' && ex.calories)
                    .reduce((exSum, ex) => exSum + (ex.calories || 0), 0);
            }, 0);
            
            totalCaloriesOver4Weeks += weeklyTotalCalories;
            const weekLabel = i === 0 ? "Week 1 (most recent)" : `Week ${i + 1}`;
            weeklySummaries.push({ label: weekLabel, calories: weeklyTotalCalories });
        }

        if (totalCaloriesOver4Weeks > 0) {
           context += weeklySummaries.map(s => `${s.label}: ${Math.round(s.calories).toLocaleString()} kcal`).join('\n');
        } else {
           context += "No cardio logged in the last 4 completed weeks.";
        }
        context += '\n\n'; // Add the blank line here
    }


    context += "Strength Balance Analysis Summary:\n";
    if (strengthAnalysis) {
        context += `- Overall Summary: ${strengthAnalysis.summary}\n`;
        if (strengthAnalysis.findings.length > 0) {
            strengthAnalysis.findings.forEach(finding => {
                context += `- Finding: ${finding.imbalanceType} (${finding.imbalanceFocus}). Recommendation: ${finding.recommendation}\n`;
            });
        } else {
            context += "- No specific imbalances found. Your strength appears well-balanced.\n";
        }
    } else {
        context += "- No strength analysis has been performed yet.\n";
    }

    context += "\nPersonal Records & Strength Levels:\n";
    if (personalRecords.length > 0) {
        const bestRecordsMap = new Map<string, PersonalRecord>();
        personalRecords.forEach(pr => {
            const key = pr.exerciseName.trim().toLowerCase();
            const existing = bestRecordsMap.get(key);
            const prWeightKg = pr.weightUnit === 'lbs' ? pr.weight * 0.453592 : pr.weight;
            if (!existing) {
                bestRecordsMap.set(key, pr);
            } else {
                const existingWeightKg = existing.weightUnit === 'lbs' ? existing.weight * 0.453592 : pr.weight;
                if (prWeightKg > existingWeightKg) {
                    bestRecordsMap.set(key, pr);
                }
            }
        });
        
        const bestRecords = Array.from(bestRecordsMap.values());

        if (bestRecords.length > 0) {
          bestRecords.forEach(pr => {
              const level = getStrengthLevel(pr, userProfile);
              context += `- ${pr.exerciseName}: ${pr.weight} ${pr.weightUnit} (Level: ${level})\n`;
          });
        } else {
          context += "- No personal records with weight logged yet.\n";
        }
    } else {
        context += "- No personal records logged yet.\n";
    }

    return context;
};

export default function PlanPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profileResult, isLoading: isLoadingProfile, isError: isErrorProfile } = useUserProfile();
  const userProfile = profileResult?.data;
  const isProfileNotFound = profileResult?.notFound === true;

  const { data: workoutLogs, isLoading: isLoadingWorkouts, isError: isErrorWorkouts } = useWorkouts();
  const { data: personalRecords, isLoading: isLoadingPrs, isError: isErrorPrs } = usePersonalRecords();
  const updateUserMutation = useUpdateUserProfile();
  
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<string>("");
  const [apiIsLoading, setApiIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [regenerationFeedback, setRegenerationFeedback] = useState("");


  useEffect(() => {
    setIsClient(true);
    const nextSundayDate = getNextSunday(new Date());
    setCurrentWeekStartDate(format(nextSundayDate, 'yyyy-MM-dd'));
  }, []);

  const userProfileContextString = useMemo(() => {
    if (isLoadingProfile || isLoadingWorkouts || isLoadingPrs) return null;
    if (!userProfile || !workoutLogs || !personalRecords) return null;
    return constructUserProfileContext(userProfile, workoutLogs, personalRecords, userProfile.strengthAnalysis?.result);
  }, [userProfile, workoutLogs, personalRecords, isLoadingProfile, isLoadingWorkouts, isLoadingPrs]);

  const handleGeneratePlan = async () => {
    if (!userProfileContextString || !currentWeekStartDate) {
      toast({ title: "Missing Data", description: "User profile or workout history is not available yet. Please wait or complete your profile.", variant: "destructive"});
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
    buttonText = hasFeedback ? "Regenerate with Feedback" : "Regenerate Plan";
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
            {currentWeekStartDate ? `This will generate a plan for the week starting Sunday, ${format(new Date(currentWeekStartDate.replace(/-/g, '/')), 'MMMM d, yyyy')}. ` : "Calculating week start date..."}
            Your plan is tailored based on your profile, goals, and recent activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Loading profile data...</p>
          ) : isError ? (
            <ErrorState message="Could not load the necessary data to generate a plan. Please check your connection and try again." />
          ) : !hasMinimumProfileForPlan ? (
            <div className="flex items-center gap-2 p-4 rounded-md border border-yellow-500 bg-yellow-500/10 text-yellow-700">
              <Info className="h-5 w-5"/> 
              <div>
                <p className="font-semibold">Complete Your Profile</p>
                <p className="text-sm">Please set at least one fitness goal and specify your experience level on the Profile page to generate a plan.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
              <AlertTriangle className="h-5 w-5 mt-0.5"/>
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

      {isClient && generatedPlan && (
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
