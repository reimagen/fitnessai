"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit2, Save, Target, XCircle } from "lucide-react";
import type { AnalyzeFitnessGoalsInput, FitnessGoal, UserProfile } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { addDays, format as formatDate, subWeeks } from "date-fns";
import { useToast } from "@/hooks/useToast";
import { useAnalyzeGoals, usePersonalRecords, useWorkouts, useGoalAnalysis } from "@/lib/firestore.service";
import { useIsMobile } from "@/hooks/useMobile";
import { GoalAnalysisSection } from "@/components/profile/GoalAnalysisSection";
import { GoalFormSection, type AchieveGoalState } from "@/components/profile/GoalFormSection";
import { constructUserProfileContext, createFormValues, goalsFormSchema, type GoalsFormValues } from "@/components/profile/goal-helpers";

type GoalSetterCardProps = {
  initialGoals: FitnessGoal[];
  onGoalsChange: (updatedGoals: FitnessGoal[]) => void;
  userProfile: UserProfile;
};

export function GoalSetterCard({ initialGoals, onGoalsChange, userProfile }: GoalSetterCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<string[]>([]);
  const [achieveGoalState, setAchieveGoalState] = useState<AchieveGoalState | null>(null);
  const analyzeGoalsMutation = useAnalyzeGoals();
  const { data: goalAnalysisData } = useGoalAnalysis();
  const { data: personalRecords } = usePersonalRecords();

  // Fetch only the last 4 weeks of workout logs for AI context
  const fourWeeksAgo = useMemo(() => subWeeks(new Date(), 4), []);
  const { data: recentWorkoutLogs } = useWorkouts(fourWeeksAgo, true);

  const isMobile = useIsMobile();

  const form = useForm<GoalsFormValues>({
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
    return initialGoals.filter(g => !g.achieved);
  }, [initialGoals]);

  const handleSetPrimary = (selectedIndex: number) => {
    const currentGoals = form.getValues("goals");
    currentGoals.forEach((_goal, index) => {
      form.setValue(`goals.${index}.isPrimary`, index === selectedIndex, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    });
    form.trigger("goals");
  };

  function onSubmit(values: GoalsFormValues) {
    const updatedGoals: FitnessGoal[] = values.goals.map((g) => {
      const originalGoal = initialGoals?.find((og) => og.id === g.id);
      const fromInputDate = (dateStr: string | undefined) => {
        if (!dateStr || dateStr.trim() === "") return undefined;
        // Handle YYYY-MM-DD by replacing dashes to avoid timezone issues
        const date = new Date(dateStr.replace(/-/g, "/"));
        return isNaN(date.getTime()) ? undefined : date;
      };

      return {
        id: originalGoal?.id || g.id || `new-${Date.now()}`,
        description: g.description,
        targetDate: fromInputDate(g.targetDate)!,
        dateAchieved: g.achieved ? (fromInputDate(g.dateAchieved) || new Date()) : undefined,
        achieved: g.achieved,
        isPrimary: g.isPrimary,
      };
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

  const handleConfirmAchievement = () => {
    if (achieveGoalState === null) return;

    const { index, date } = achieveGoalState;

    if (!date || isNaN(new Date(date.replace(/-/g, "/")).getTime())) {
      toast({ title: "Invalid Date", description: "Please select a valid date of achievement.", variant: "destructive" });
      return;
    }

    form.setValue(`goals.${index}.achieved`, true);
    form.setValue(`goals.${index}.dateAchieved`, date, { shouldDirty: true });

    // Immediately submit the form to save the change
    form.handleSubmit(onSubmit)();

    setAchieveGoalState(null); // Close the dialog
  };

  const handleUnachieve = (index: number) => {
    form.setValue(`goals.${index}.achieved`, false);
    form.setValue(`goals.${index}.dateAchieved`, "", { shouldDirty: true });
    toast({
      title: "Goal Reactivated",
      description: "This goal has been moved back to your active list.",
    });
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

    setAcceptedSuggestions([]); // Clear accepted suggestions on new analysis

    const contextString = constructUserProfileContext(userProfile, recentWorkoutLogs || [], personalRecords || []);

    const analysisInput: AnalyzeFitnessGoalsInput = {
      userProfileContext: contextString,
    };

    analyzeGoalsMutation.mutate(analysisInput);
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

  const analysisToRender = goalAnalysisData?.result;
  const analysisGeneratedDate = goalAnalysisData?.generatedDate;

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="space-y-1.5">
          <CardTitle className="font-headline flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Your Fitness Goals
          </CardTitle>
          <CardDescription>Define what you want to achieve: set up to 3 active goals.</CardDescription>
        </div>
        {isEditing && !isMobile ? (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleCancel} aria-label="Cancel edit">
              <XCircle className="h-5 w-5" />
            </Button>
            <Button size="icon" onClick={form.handleSubmit(onSubmit)} aria-label="Save goals">
              <Save className="h-5 w-5" />
            </Button>
          </div>
        ) : !isEditing ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            aria-label="Edit goals"
            className="hover:bg-primary hover:text-primary-foreground"
          >
            <Edit2 className="h-5 w-5" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <GoalFormSection
          form={form}
          fields={fields}
          isEditing={isEditing}
          isMobile={isMobile}
          onSubmit={onSubmit}
          onAddNewGoal={handleAddNewGoal}
          onCancel={handleCancel}
          onSetPrimary={handleSetPrimary}
          onRemove={remove}
          onStartAchieve={(index) => setAchieveGoalState({ index, date: formatDate(new Date(), "yyyy-MM-dd") })}
          achieveGoalState={achieveGoalState}
          onAchieveDateChange={(date) => setAchieveGoalState((prev) => (prev ? { ...prev, date } : null))}
          onConfirmAchievement={handleConfirmAchievement}
          onCloseAchieveDialog={() => setAchieveGoalState(null)}
          onUnachieve={handleUnachieve}
        />
        <GoalAnalysisSection
          analysis={analysisToRender}
          generatedDate={analysisGeneratedDate}
          activeGoalsForAnalysis={activeGoalsForAnalysis}
          acceptedSuggestions={acceptedSuggestions}
          isAnalyzing={analyzeGoalsMutation.isPending}
          onAnalyze={handleAnalyzeGoals}
          onAcceptSuggestion={handleAcceptSuggestion}
        />
      </CardContent>
    </Card>
  );
}
