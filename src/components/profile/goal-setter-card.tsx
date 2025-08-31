
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, Target, Star, Edit2, Save, XCircle, Zap, Loader2, Lightbulb, AlertTriangle, CheckCircle, Check, RefreshCw } from "lucide-react";
import type { FitnessGoal, UserProfile, AnalyzeFitnessGoalsOutput, AnalyzeFitnessGoalsInput, PersonalRecord, WorkoutLog } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import { format as formatDate, isValid, differenceInDays, addDays, differenceInWeeks, subWeeks } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAnalyzeGoals, usePersonalRecords, useWorkouts } from "@/lib/firestore.service";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const goalSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(5, "Goal description must be at least 5 characters."),
  targetDate: z.string().min(1, "Target date is required."),
  dateAchieved: z.string().optional(),
  achieved: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
});

const goalsFormSchema = z.object({
  goals: z.array(goalSchema),
});

type GoalSetterCardProps = {
  initialGoals: FitnessGoal[];
  onGoalsChange: (updatedGoals: FitnessGoal[]) => void;
  userProfile: UserProfile;
};

// Helper to create initial form values from initialGoals prop
const createFormValues = (goalsProp: FitnessGoal[] | undefined) => {
  if (!Array.isArray(goalsProp) || goalsProp.length === 0) return { goals: [] };
  
  const sortedGoals = [...goalsProp].sort((a, b) => {
    // Primary goal always on top
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    // Active goals before achieved goals
    if (!a.achieved && b.achieved) return -1;
    if (a.achieved && !b.achieved) return 1;
    // Fallback to maintain a stable order (e.g., by date) if needed, but 0 is fine
    return 0;
  });

  return {
    goals: sortedGoals.map(g => {
      const toInputDate = (date: Date | undefined) => {
        if (!date) return "";
        const dateObj = date instanceof Date ? date : new Date(date);
        return isValid(dateObj) ? formatDate(dateObj, 'yyyy-MM-dd') : "";
      };
      
      return {
          id: g.id,
          description: g.description,
          targetDate: toInputDate(g.targetDate),
          dateAchieved: toInputDate(g.dateAchieved),
          achieved: g.achieved || false,
          isPrimary: g.isPrimary || false,
      };
    }),
  };
};

// --- Helper functions for generating performance context ---
const GOAL_TO_PR_MAP: Record<string, string[]> = {
  'pull-up': ['lat pulldown'],
  'bench press': ['bench press', 'chest press'],
  'squat': ['squat', 'leg press'],
  'deadlift': ['deadlift'],
  'overhead press': ['overhead press', 'shoulder press'],
  'leg press': ['leg press', 'squat'],
};

const findBestPrForGoal = (goalDesc: string, records: PersonalRecord[]): string | null => {
  const lowerGoal = goalDesc.toLowerCase();
  for (const keyword in GOAL_TO_PR_MAP) {
    if (lowerGoal.includes(keyword)) {
      const relevantPrs = records.filter(pr => GOAL_TO_PR_MAP[keyword].includes(pr.exerciseName.toLowerCase()));
      if (relevantPrs.length > 0) {
        const bestPr = relevantPrs.reduce((best, current) => {
          const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
          const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
          return currentWeightKg > bestWeightKg ? current : best;
        });
        return `User has a relevant PR for ${bestPr.exerciseName} of ${bestPr.weight} ${bestPr.weightUnit}.`;
      }
    }
  }
  return null;
};

const summarizeWorkoutHistoryForGoal = (goalDesc: string, logs: WorkoutLog[]): string | null => {
  const lowerGoal = goalDesc.toLowerCase();
  const fourWeeksAgo = subWeeks(new Date(), 4);
  const recentLogs = logs.filter(log => log.date > fourWeeksAgo);

  if (lowerGoal.includes('run') || lowerGoal.includes('running')) {
    const runs = recentLogs.flatMap(log => log.exercises.filter(ex => ex.category === 'Cardio' && ex.name.toLowerCase().includes('run')));
    if (runs.length > 0) {
      const totalDistance = runs.reduce((sum, run) => {
        let distMi = run.distance || 0;
        if (run.distanceUnit === 'km') distMi *= 0.621371;
        else if (run.distanceUnit === 'ft') distMi *= 0.000189394;
        return sum + distMi;
      }, 0);
      const avgDistance = totalDistance / runs.length;
      const maxDistance = Math.max(...runs.map(run => {
         let distMi = run.distance || 0;
         if (run.distanceUnit === 'km') distMi *= 0.621371;
         else if (run.distanceUnit === 'ft') distMi *= 0.000189394;
         return distMi;
      }));
      return `Recent Running Summary (last 4 weeks): ${runs.length} sessions, average distance ${avgDistance.toFixed(1)} miles, max distance ${maxDistance.toFixed(1)} miles.`;
    }
  }
  // Add more summaries for other activities like 'cycling', etc. here if needed.
  return null;
};


const constructUserProfileContext = (
    userProfile: UserProfile, 
    workoutLogs: WorkoutLog[],
    personalRecords: PersonalRecord[]
): string => {
    let context = "User Profile Context for AI Goal Analysis:\n";
    context += `Age: ${userProfile.age || 'Not Provided'}\n`;
    context += `Gender: ${userProfile.gender || 'Not Provided'}\n`;
    context += `Weight: ${userProfile.weightValue || 'Not Provided'} ${userProfile.weightUnit || ''}\n`.trim() + '\n';
    context += `Experience Level: ${userProfile.experienceLevel || 'Not Provided'}\n`;
    if (userProfile.bodyFatPercentage) {
        context += `Body Fat: ${userProfile.bodyFatPercentage.toFixed(1)}%\n`;
    }

    context += "\n--- User's Goals & Performance Data ---\n";
    const activeGoals = (userProfile.fitnessGoals || []).filter(g => !g.achieved);
    if (activeGoals.length > 0) {
      activeGoals.forEach(goal => {
        context += `Goal: ${goal.isPrimary ? '**Primary** ' : ''}${goal.description}\n`;
        const relevantPr = findBestPrForGoal(goal.description, personalRecords);
        if (relevantPr) {
          context += `  - Performance Context: ${relevantPr}\n`;
        }
        const historySummary = summarizeWorkoutHistoryForGoal(goal.description, workoutLogs);
        if (historySummary) {
          context += `  - Performance Context: ${historySummary}\n`;
        }
      });
    } else {
      context += "- No active goals listed.\n";
    }

    return context;
};


export function GoalSetterCard({ initialGoals, onGoalsChange, userProfile }: GoalSetterCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<string[]>([]);
  const analyzeGoalsMutation = useAnalyzeGoals();
  const { data: personalRecords } = usePersonalRecords();
  const { data: workoutLogs } = useWorkouts();
  
  const form = useForm<z.infer<typeof goalsFormSchema>>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: createFormValues(initialGoals), 
  });

  useEffect(() => {
      form.reset(createFormValues(initialGoals));
  }, [initialGoals, form]); 

  const { fields, append, remove, insert } = useFieldArray({
    control: form.control,
    name: "goals",
  });
  
  const activeGoalsForAnalysis = useMemo(() => {
    return (userProfile.fitnessGoals || []).filter(g => !g.achieved);
  }, [userProfile.fitnessGoals]);

  const handleSetPrimary = (selectedIndex: number) => {
    const currentGoals = form.getValues("goals");
    currentGoals.forEach((goal, index) => {
      form.setValue(`goals.${index}.isPrimary`, index === selectedIndex, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    });
    form.trigger("goals"); 
  };

  function onSubmit(values: z.infer<typeof goalsFormSchema>) {
    const updatedGoals: FitnessGoal[] = values.goals.map((g) => {
        const originalGoal = initialGoals?.find((og) => og.id === g.id);
        const fromInputDate = (dateStr: string | undefined) => {
           if (!dateStr || dateStr.trim() === "") return undefined;
           // Handle YYYY-MM-DD by replacing dashes to avoid timezone issues
           const date = new Date(dateStr.replace(/-/g, '\/'));
           return isValid(date) ? date : undefined;
        }

        return {
            id: originalGoal?.id || g.id || `new-${Date.now()}`,
            description: g.description,
            targetDate: fromInputDate(g.targetDate)!,
            dateAchieved: g.achieved ? (fromInputDate(g.dateAchieved) || new Date()) : undefined,
            achieved: g.achieved,
            isPrimary: g.isPrimary,
        }
    });
    onGoalsChange(updatedGoals);
    setIsEditing(false);
  }

  const handleAddNewGoal = () => {
    const currentGoals = form.getValues("goals");
    const activeGoals = currentGoals.filter(goal => !goal.achieved);

    if (activeGoals.length >= 3) {
      toast({
        title: "Active Goal Limit Reached",
        description: "You can only have up to 3 active goals. Complete or remove one to add another.",
        variant: "destructive",
      });
      return;
    }

    const newGoal = { id: `new-${Date.now()}`, description: "", achieved: false, targetDate: "", dateAchieved: "", isPrimary: false };
    
    // Find the index of the first achieved goal.
    const firstAchievedIndex = fields.findIndex(field => field.achieved);

    if (firstAchievedIndex !== -1) {
      // If there's an achieved goal, insert the new goal before it.
      insert(firstAchievedIndex, newGoal);
    } else {
      // Otherwise, just append to the end.
      append(newGoal);
    }

    // Automatically switch to edit mode
    setIsEditing(true);
  };

  const handleCancel = () => {
    form.reset(createFormValues(initialGoals));
    setIsEditing(false);
  };

  const handleAnalyzeGoals = () => {
    if (activeGoalsForAnalysis.length === 0) {
      toast({ title: "No Active Goals", description: "Add at least one goal to get an analysis.", variant: "default" });
      return;
    }
    
    setAnalysisError(null); // Clear previous errors
    setAcceptedSuggestions([]); // Clear accepted suggestions on new analysis
    
    const contextString = constructUserProfileContext(userProfile, workoutLogs || [], personalRecords || []);
    
    const analysisInput: AnalyzeFitnessGoalsInput = {
      userProfileContext: contextString,
    };

    analyzeGoalsMutation.mutate(analysisInput, {
      onError: (error) => {
        // The toast is handled by the useAnalyzeGoals hook.
        // We set the state here only if we need to display it in the card.
        // Per user request, we are removing the in-card display.
        // setAnalysisError(error.message);
      }
    });
  };

  const handleAcceptSuggestion = (originalDescription: string, suggestedGoal: string, timelineInDays?: number) => {
    const updatedGoals: FitnessGoal[] = initialGoals.map(goal => {
      if (goal.description === originalDescription) {
        const newGoal = { ...goal, description: suggestedGoal };
        if (timelineInDays && timelineInDays > 0) {
          newGoal.targetDate = addDays(new Date(), timelineInDays);
        }
        return newGoal;
      }
      return goal;
    });

    onGoalsChange(updatedGoals);
    setAcceptedSuggestions(prev => [...prev, originalDescription]);

    toast({
      title: "Goal Updated!",
      description: "Your goal has been updated with the AI's suggestion.",
    });
  };

  const activeFields = fields.map((field, index) => ({ field, index })).filter(({ field }) => !field.achieved);
  const achievedFields = fields.map((field, index) => ({ field, index })).filter(({ field }) => field.achieved);
  const analysisToRender = userProfile?.goalAnalysis?.result;
  const analysisGeneratedDate = userProfile?.goalAnalysis?.generatedDate;
  
  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="space-y-1.5">
            <CardTitle className="font-headline flex items-center gap-2">
                <Target className="h-6 w-6 text-primary"/>
                Your Fitness Goals
            </CardTitle>
            <CardDescription>Define what you want to achieve: set up to 3 active goals.</CardDescription>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleCancel} aria-label="Cancel edit">
              <XCircle className="h-5 w-5" />
            </Button>
            <Button size="icon" onClick={form.handleSubmit(onSubmit)} aria-label="Save goals">
              <Save className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} aria-label="Edit goals">
            <Edit2 className="h-5 w-5" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Active Goals */}
            {activeFields.length > 0 ? activeFields.map(({ field, index }) => {
              const isCurrentGoalPrimary = form.watch(`goals.${index}.isPrimary`);
              const isAchieved = form.watch(`goals.${index}.achieved`);
              return (
                <Card key={field.id} className="p-4 border rounded-md shadow-sm bg-secondary/30">
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`goals.${index}.description`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Goal Description</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Build muscle, Lose 5 lbs, Run 5km" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`goals.${index}.targetDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {isAchieved && (
                           <FormField
                              control={form.control}
                              name={`goals.${index}.dateAchieved`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Date Achieved</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between mt-4 gap-4">
                        <div className="flex items-center gap-4">
                           <Button
                              type="button"
                              variant={isCurrentGoalPrimary ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleSetPrimary(index)}
                              disabled={isCurrentGoalPrimary}
                              className={cn( "whitespace-nowrap", isCurrentGoalPrimary && "disabled:opacity-100" )}
                          >
                              {isCurrentGoalPrimary ? ( <><Star className="mr-2 h-4 w-4 fill-current" /> Primary Goal</> ) : ( "Set as Primary" )}
                          </Button>
                          <FormField
                            control={form.control}
                            name={`goals.${index}.achieved`}
                            render={({ field: checkboxField }) => ( 
                                <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                    <Checkbox
                                    checked={checkboxField.value}
                                    onCheckedChange={checkboxField.onChange}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal !mt-0">Achieved</FormLabel>
                                </FormItem>
                            )}
                            />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Remove Goal
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm">
                      <div className="flex justify-between items-start">
                         <p className="font-semibold text-primary">{field.isPrimary && <Star className="inline-block h-4 w-4 mr-2 fill-yellow-400 text-yellow-500" />} {field.description}</p>
                      </div>
                      <p className="text-muted-foreground mt-1">Target: {field.targetDate ? formatDate(new Date(field.targetDate.replace(/-/g, '/')), 'MMMM d, yyyy') : 'Not set'}</p>
                    </div>
                  )}
                </Card>
              );
            }) : (
                 <p className="text-sm text-center text-muted-foreground py-4">No active goals set. Add a new goal to get started!</p>
            )}

            {/* Achieved Goals Accordion */}
            {achievedFields.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="achieved-goals" className="border rounded-md px-4 bg-secondary/30">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                       <CheckCircle className="h-5 w-5 text-green-600" />
                       <span className="font-semibold">View {achievedFields.length} Completed Goal{achievedFields.length > 1 ? 's' : ''}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="space-y-3">
                    {achievedFields.map(({ field }) => (
                      <div key={field.id} className="flex items-center justify-between p-3 rounded-md bg-background/50 border">
                        <div className="flex flex-col">
                          <p className="font-medium text-foreground">{field.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Target: {field.targetDate ? formatDate(new Date(field.targetDate.replace(/-/g, '/')), 'MMM d, yyyy') : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Achieved on: {field.dateAchieved ? formatDate(new Date(field.dateAchieved.replace(/-/g, '/')), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            
            <div className="pt-4 flex justify-start items-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNewGoal}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
              </Button>
            </div>
          </form>
        </Form>
        <div className="pt-6 mt-6 border-t">
          <h4 className="font-headline flex items-center gap-2 text-lg mb-2 text-primary">
            <Zap className="h-5 w-5" />
            AI Goal Analysis
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Get AI-powered help refining your goals to make them specific and time-bound, based on your profile stats.
          </p>
          
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="inline-block"> 
                  <Button onClick={handleAnalyzeGoals} disabled={analyzeGoalsMutation.isPending || activeGoalsForAnalysis.length === 0} className="w-full sm:w-auto">
                    {analyzeGoalsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
                    Analyze My Goals
                  </Button>
                </div>
              </TooltipTrigger>
              {activeGoalsForAnalysis.length === 0 && (
                <TooltipContent>
                  <p>Please add at least one active goal before analyzing.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {analysisToRender && (
             <Card className="mt-6 bg-secondary/30">
                <CardHeader>
                  <CardDescription>
                    {analysisGeneratedDate ? `Generated on: ${formatDate(analysisGeneratedDate, "MMMM d, yyyy")}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm italic text-muted-foreground">{analysisToRender.overallSummary}</p>
                    <div className="space-y-4">
                        {analysisToRender.goalInsights.map((insight, index) => {
                          const isPrimary = insight.relationshipToPrimary === 'Primary';
                          const canApplySuggestion = activeGoalsForAnalysis.some(g => g.description === insight.originalGoalDescription && g.description !== insight.suggestedGoal);
                          const wasSuggestionAccepted = acceptedSuggestions.includes(insight.originalGoalDescription);

                          return (
                            <div key={index} className="p-3 border rounded-md bg-background/50">
                                <div className="relative">
                                  <div className="md:pr-36">
                                     <p className="text-sm font-semibold text-muted-foreground">
                                        {isPrimary && <Star className="inline-block h-4 w-4 mr-2 fill-yellow-400 text-yellow-500" />}
                                        Original Goal: "{insight.originalGoalDescription}"
                                    </p>
                                  </div>
                                  <div className="absolute top-0 right-0 hidden md:block">
                                      {wasSuggestionAccepted ? (
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="h-auto px-2 py-1 text-xs"
                                            onClick={handleAnalyzeGoals}
                                          >
                                            <RefreshCw className="mr-1.5 h-3 w-3"/>
                                            Refresh Analysis
                                          </Button>
                                      ) : canApplySuggestion ? (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="h-auto px-2 py-1 text-xs"
                                          onClick={() => handleAcceptSuggestion(insight.originalGoalDescription, insight.suggestedGoal, insight.suggestedTimelineInDays)}
                                        >
                                          <Check className="mr-1.5 h-3 w-3"/>
                                          Use AI Suggestion
                                        </Button>
                                      ) : null}
                                    </div>
                                </div>

                                <div className="mt-3 space-y-3">
                                    {insight.isConflicting && (
                                        <div className="flex items-start gap-2 text-sm text-destructive">
                                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0"/>
                                            <p><span className="font-semibold">Conflict:</span> This goal may conflict with others.</p>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-2 text-sm text-primary">
                                        <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0"/>
                                        <p><span className="font-semibold">Suggestion:</span> {insight.suggestedGoal}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-6">{insight.analysis}</p>
                                </div>

                                <div className="mt-4 md:hidden">
                                    {wasSuggestionAccepted ? (
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="w-full"
                                            onClick={handleAnalyzeGoals}
                                        >
                                            <RefreshCw className="mr-2 h-4 w-4"/>
                                            Refresh Analysis
                                        </Button>
                                    ) : canApplySuggestion ? (
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => handleAcceptSuggestion(insight.originalGoalDescription, insight.suggestedGoal, insight.suggestedTimelineInDays)}
                                        >
                                            <Check className="mr-2 h-4 w-4"/>
                                            Use AI Suggestion
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                          );
                        })}
                    </div>
                </CardContent>
             </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
