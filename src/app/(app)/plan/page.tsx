
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, AlertTriangle, Info } from "lucide-react";
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { generateWeeklyWorkoutPlanAction } from "./actions";
import type { UserProfile, WorkoutLog, FitnessGoal, Exercise } from "@/lib/types";
import { format, parseISO, differenceInWeeks, addDays, nextSunday as getNextSunday } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

const USER_PROFILE_KEY = "fitnessAppUserProfile";
const WORKOUT_LOGS_KEY = "fitnessAppWorkoutLogs";
const AI_WEEKLY_PLAN_KEY = "fitnessAppWeeklyPlan";

interface StoredWeeklyPlan {
  plan: string;
  generatedDate: string;
  contextUsed: string;
  userId: string;
  weekStartDate: string;
}

export default function PlanPage() {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  
  const [userProfileContextString, setUserProfileContextString] = useState<string | null>(null);
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<StoredWeeklyPlan | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadDataFromLocalStorage = useCallback(() => {
    const profileString = localStorage.getItem(USER_PROFILE_KEY);
    if (profileString) {
      try {
        const parsedProfile = JSON.parse(profileString);
        parsedProfile.fitnessGoals = parsedProfile.fitnessGoals.map((goal: FitnessGoal) => ({
          ...goal,
          targetDate: goal.targetDate ? parseISO(goal.targetDate) : undefined,
        }));
        parsedProfile.joinedDate = parsedProfile.joinedDate ? parseISO(parsedProfile.joinedDate) : new Date();
        setUserProfile(parsedProfile);
      } catch (e) {
        console.error("Failed to parse user profile from localStorage", e);
        toast({ title: "Error", description: "Could not load your profile data.", variant: "destructive" });
      }
    }

    const logsString = localStorage.getItem(WORKOUT_LOGS_KEY);
    if (logsString) {
      try {
        const parsedLogs = JSON.parse(logsString).map((log: any) => ({
          ...log,
          date: parseISO(log.date),
          exercises: log.exercises.map((ex: any) => ({
            ...ex,
            id: ex.id || Math.random().toString(36).substring(2,9)
          }))
        }));
        setWorkoutLogs(parsedLogs);
      } catch (e) {
        console.error("Failed to parse workout logs from localStorage", e);
      }
    }

    const storedPlanString = localStorage.getItem(AI_WEEKLY_PLAN_KEY);
    if (storedPlanString) {
      try {
        const planData = JSON.parse(storedPlanString) as StoredWeeklyPlan;
        setGeneratedPlan(planData);
      } catch (e) {
        console.error("Failed to parse stored weekly plan", e);
      }
    }
  }, [toast]);

  useEffect(() => {
    if (isClient) {
      loadDataFromLocalStorage();
      const nextSundayDate = getNextSunday(new Date());
      setCurrentWeekStartDate(format(nextSundayDate, 'yyyy-MM-dd'));
    }
  }, [isClient, loadDataFromLocalStorage]);

  const constructUserProfileContext = useCallback(() => {
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
  }, [userProfile, workoutLogs]);

  useEffect(() => {
    if (userProfile) {
      setUserProfileContextString(constructUserProfileContext());
    }
  }, [userProfile, workoutLogs, constructUserProfileContext]);


  const handleGeneratePlan = async () => {
    if (!userProfile || !userProfileContextString || !currentWeekStartDate) {
      toast({ title: "Missing Data", description: "User profile or context is not available. Please complete your profile.", variant: "destructive"});
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await generateWeeklyWorkoutPlanAction({
      userId: userProfile.id,
      userProfileContext: userProfileContextString,
      weekStartDate: currentWeekStartDate,
    });

    if (result.success && result.data?.weeklyPlan) {
      const newPlanData: StoredWeeklyPlan = {
        plan: result.data.weeklyPlan,
        generatedDate: new Date().toISOString(),
        contextUsed: userProfileContextString,
        userId: userProfile.id,
        weekStartDate: currentWeekStartDate,
      };
      setGeneratedPlan(newPlanData);
      localStorage.setItem(AI_WEEKLY_PLAN_KEY, JSON.stringify(newPlanData));
      toast({ title: "Plan Generated!", description: "Your new weekly workout plan is ready." });
    } else {
      setError(result.error || "Failed to generate workout plan. The AI might be busy or an unexpected error occurred.");
      toast({ title: "Generation Failed", description: result.error || "Could not generate plan.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const hasMinimumProfileForPlan = userProfile && userProfile.fitnessGoals.length > 0 && userProfile.experienceLevel;

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
            {currentWeekStartDate ? `This will generate a plan for the week starting Sunday, ${format(parseISO(currentWeekStartDate), 'MMMM d, yyyy')}.` : "Calculating week start date..."}
            Your plan is tailored based on your profile, goals, and recent activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isClient ? (
             <p className="text-muted-foreground">Loading profile data...</p>
          ) : !hasMinimumProfileForPlan ? (
            <div className="flex items-center gap-2 p-4 rounded-md border border-yellow-500 bg-yellow-500/10 text-yellow-700">
              <Info className="h-5 w-5"/> 
              <div>
                <p className="font-semibold">Complete Your Profile</p>
                <p className="text-sm">Please set at least one fitness goal and specify your experience level on the Profile page to generate a plan.</p>
              </div>
            </div>
          ) : (
            <Button onClick={handleGeneratePlan} disabled={isLoading || !userProfileContextString} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {generatedPlan ? "Regenerate Plan for This Week" : "Generate My Weekly Plan"}
            </Button>
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
        </CardContent>
      </Card>

      {isClient && generatedPlan && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Current Weekly Plan</CardTitle>
            <CardDescription>
              Generated on: {format(parseISO(generatedPlan.generatedDate), 'MMMM d, yyyy \'at\' h:mm a')} for week starting {format(parseISO(generatedPlan.weekStartDate), 'MMMM d, yyyy')}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer text={generatedPlan.plan} />
            </div>
          </CardContent>
        </Card>
      )}

      {isClient && userProfileContextString && (
        <details className="mt-6 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">View context used for AI plan generation</summary>
            <pre className="mt-2 p-2 border bg-secondary/50 rounded-md whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                {userProfileContextString}
            </pre>
        </details>
      )}
    </div>
  );
}
