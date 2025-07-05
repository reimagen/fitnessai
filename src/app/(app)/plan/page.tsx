"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, AlertTriangle, Info } from "lucide-react";
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { generateWeeklyWorkoutPlanAction } from "./actions";
import type { UserProfile, WorkoutLog } from "@/lib/types";
import { useUserProfile, useWorkouts } from "@/lib/firestore.service";
import { format, differenceInWeeks, nextSunday as getNextSunday } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface StoredWeeklyPlan {
  plan: string;
  generatedDate: string;
  contextUsed: string;
  userId: string;
  weekStartDate: string;
}

const constructUserProfileContext = (userProfile: UserProfile | null, workoutLogs: WorkoutLog[]): string | null => {
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
      context += `Height: Not specified\n`;
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

    context += "\nFitness Goals:\n";
    const primaryGoal = userProfile.fitnessGoals.find(g => g.isPrimary);
    if (primaryGoal) {
      context += `- Primary Goal: ${primaryGoal.description}${primaryGoal.targetDate ? ` (Target: ${format(primaryGoal.targetDate, 'yyyy-MM-dd')})` : ''}\n`;
    }
    userProfile.fitnessGoals.filter(g => !g.isPrimary).forEach(goal => {
      context += `- Other Goal: ${goal.description}${goal.targetDate ? ` (Target: ${format(goal.targetDate, 'yyyy-MM-dd')})` : ''}\n`;
    });
    if (userProfile.fitnessGoals.length === 0) context += "- No specific goals listed.\n";

    context += "\nWorkout Preferences:\n";
    context += `- Workouts Per Week: ${userProfile.workoutsPerWeek || 'Not specified'}\n`;
    context += `- Preferred Session Time: ${userProfile.sessionTimeMinutes ? `${userProfile.sessionTimeMinutes} minutes` : 'Not specified'}\n`;
    context += `- Experience Level: ${userProfile.experienceLevel || 'Not specified'}\n`;
    if (userProfile.aiPreferencesNotes) {
      context += `- Additional Notes for AI: ${userProfile.aiPreferencesNotes}\n`;
    }

    context += "\nWorkout History Summary:\n";
    if (workoutLogs.length > 0) {
      const recentLogs = workoutLogs.filter(log => differenceInWeeks(new Date(), log.date) <= 4);
      context += `- Logged ${recentLogs.length} workouts in the last 4 weeks.\n`;
      const categoryCounts: Record<string, number> = {};
      recentLogs.forEach(log => {
        log.exercises.forEach(ex => {
          if (ex.category) {
            categoryCounts[ex.category] = (categoryCounts[ex.category] || 0) + 1;
          }
        });
      });
      const topCategories = Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]).slice(0,3);
      if (topCategories.length > 0) {
        context += `- Common exercise categories: ${topCategories.map(([cat, count]) => `${cat} (${count}x)`).join(', ')}\n`;
      } else {
        context += "- No specific exercise categories found in recent history.\n";
      }
    } else {
      context += "- No workout history logged.\n";
    }
    return context;
};

export default function PlanPage() {
  const { toast } = useToast();
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile();
  const { data: workoutLogs, isLoading: isLoadingWorkouts } = useWorkouts();
  
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<string>("");
  const [apiIsLoading, setApiIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<StoredWeeklyPlan | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [regenerationFeedback, setRegenerationFeedback] = useState("");

  const AI_WEEKLY_PLAN_KEY = "fitnessAppWeeklyPlan";

  useEffect(() => {
    setIsClient(true);
    const nextSundayDate = getNextSunday(new Date());
    setCurrentWeekStartDate(format(nextSundayDate, 'yyyy-MM-dd'));

    const storedPlanString = localStorage.getItem(AI_WEEKLY_PLAN_KEY);
    if (storedPlanString) {
      try {
        setGeneratedPlan(JSON.parse(storedPlanString));
      } catch (e) {
        console.error("Failed to parse stored plan", e);
      }
    }
  }, []);

  const userProfileContextString = useMemo(() => {
    if (!userProfile || !workoutLogs) return null;
    return constructUserProfileContext(userProfile, workoutLogs);
  }, [userProfile, workoutLogs]);

  const handleGeneratePlan = async () => {
    if (!userProfile || !userProfileContextString || !currentWeekStartDate) {
      toast({ title: "Missing Data", description: "User profile or workout history is not available yet. Please wait or complete your profile.", variant: "destructive"});
      return;
    }

    setApiIsLoading(true);
    setError(null);

    let finalContext = userProfileContextString;
    if (regenerationFeedback.trim()) {
      finalContext += `\n\n**CRITICAL REGENERATION INSTRUCTIONS:** The user has provided feedback on the previous plan. You MUST incorporate the following adjustments: "${regenerationFeedback}"`;
    }

    const result = await generateWeeklyWorkoutPlanAction({
      userId: userProfile.id,
      userProfileContext: finalContext,
      weekStartDate: currentWeekStartDate,
    });

    if (result.success && result.data?.weeklyPlan) {
      const newPlanData: StoredWeeklyPlan = {
        plan: result.data.weeklyPlan,
        generatedDate: new Date().toISOString(),
        contextUsed: finalContext,
        userId: userProfile.id,
        weekStartDate: currentWeekStartDate,
      };
      setGeneratedPlan(newPlanData);
      localStorage.setItem(AI_WEEKLY_PLAN_KEY, JSON.stringify(newPlanData));
      setRegenerationFeedback(""); // Clear feedback box on success
      toast({ title: "Plan Generated!", description: "Your new weekly workout plan is ready." });
    } else {
      setError(result.error || "Failed to generate workout plan. The AI might be busy or an unexpected error occurred.");
      toast({ title: "Generation Failed", description: result.error || "Could not generate plan.", variant: "destructive" });
    }
    setApiIsLoading(false);
  };

  const hasMinimumProfileForPlan = userProfile && userProfile.fitnessGoals.length > 0 && userProfile.experienceLevel;
  const isLoading = isLoadingProfile || isLoadingWorkouts;

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
            {currentWeekStartDate ? `This will generate a plan for the week starting Sunday, ${format(new Date(currentWeekStartDate.replace(/-/g, '/')), 'MMMM d, yyyy')}.` : "Calculating week start date..."}
            Your plan is tailored based on your profile, goals, and recent activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Loading profile data...</p>
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
                  <Label htmlFor="regeneration-feedback">Not quite right? Tell the AI what to change.</Label>
                  <Textarea
                    id="regeneration-feedback"
                    placeholder="e.g., 'Replace squats with lunges due to a knee issue' or 'Can you add more cardio?'"
                    value={regenerationFeedback}
                    onChange={(e) => setRegenerationFeedback(e.target.value)}
                    className="min-h-[80px]"
                    disabled={apiIsLoading}
                  />
                </div>
              )}
              <Button onClick={handleGeneratePlan} disabled={apiIsLoading || isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {apiIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {generatedPlan ? "Regenerate Plan for This Week" : "Generate My Weekly Plan"}
              </Button>
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-md border border-destructive bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5"/>
              <div>
                 <p className="font-semibold">Generation Error</p>
                 <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
           {userProfileContextString && (
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
              Generated on: {format(new Date(generatedPlan.generatedDate), 'MMMM d, yyyy \'at\' h:mm a')} for week starting {format(new Date(generatedPlan.weekStartDate.replace(/-/g, '/')), 'MMMM d, yyyy')}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer text={generatedPlan.plan} />
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
