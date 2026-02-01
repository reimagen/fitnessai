
"use client";

import { useState, useEffect } from "react";
import type { ExperienceLevel, SessionTime, UserProfile, CardioGoalMode, ActivityLevel, WeightGoal, CardioCalculationMethod } from "@/lib/types";
import { calculateWeeklyCardioTarget, type WeeklyCardioTargets } from "@/lib/calorie-calculator";
import { calculateWeeklyCardioTargets } from "@/lib/cardio-target-calculator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Save, XCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useIsMobile } from "@/hooks/useMobile";

type WorkoutPreferences = Pick<UserProfile,
  'workoutsPerWeek' |
  'sessionTimeMinutes' |
  'experienceLevel' |
  'aiPreferencesNotes' |
  'weeklyCardioCalorieGoal' |
  'weeklyCardioStretchCalorieGoal' |
  'cardioGoalMode' |
  'stretchGoalMultiplier' |
  'weightValue' |
  'weightUnit' |
  'fitnessGoals'
>;

type WorkoutPreferencesCardProps = {
  preferences: WorkoutPreferences;
  onUpdate: (updatedPreferences: WorkoutPreferences) => void;
};

const SESSION_TIME_OPTIONS: { label: string; value: SessionTime }[] = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "60 minutes", value: 60 },
];

const EXPERIENCE_LEVEL_OPTIONS: { label: string; value: ExperienceLevel }[] = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

export function WorkoutPreferencesCard({ preferences, onUpdate }: WorkoutPreferencesCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const isMobile = useIsMobile();

  const [editedWorkoutsPerWeek, setEditedWorkoutsPerWeek] = useState(preferences.workoutsPerWeek?.toString() || "3");
  const [editedSessionTime, setEditedSessionTime] = useState<SessionTime>(preferences.sessionTimeMinutes || 45);
  const [editedExperienceLevel, setEditedExperienceLevel] = useState<ExperienceLevel>(preferences.experienceLevel || "intermediate");
  const [editedAiPreferencesNotes, setEditedAiPreferencesNotes] = useState(preferences.aiPreferencesNotes || "");
  const [editedCardioGoal, setEditedCardioGoal] = useState(preferences.weeklyCardioCalorieGoal?.toString() || "");
  const [editedCardioStretchGoal, setEditedCardioStretchGoal] = useState(preferences.weeklyCardioStretchCalorieGoal?.toString() || "");
  const [cardioGoalMode, setCardioGoalMode] = useState<CardioGoalMode>(preferences.cardioGoalMode || 'auto');
  const [stretchMultiplier, setStretchMultiplier] = useState(preferences.stretchGoalMultiplier || 1.2);
  const [calculatedTargets, setCalculatedTargets] = useState<WeeklyCardioTargets | null>(null);

  // Auto-calculate cardio targets when dependencies change
  useEffect(() => {
    if (cardioGoalMode === 'auto') {
      const targets = calculateWeeklyCardioTarget(preferences as UserProfile);
      setCalculatedTargets(targets);
      // Update the displayed values to match calculated targets
      if (targets) {
        setEditedCardioGoal(targets.baseTarget.toString());
        setEditedCardioStretchGoal(targets.stretchTarget.toString());
      }
    }
  }, [
    cardioGoalMode,
    preferences.weightValue,
    preferences.weightUnit,
    preferences.experienceLevel,
    preferences.fitnessGoals,
    preferences.workoutsPerWeek,
    stretchMultiplier,
  ]);

  // Backwards compatibility migration: if user has manual goals but no mode set, default to manual
  useEffect(() => {
    if (preferences.weeklyCardioCalorieGoal && !preferences.cardioGoalMode) {
      setCardioGoalMode('manual');
    }
  }, [preferences.weeklyCardioCalorieGoal, preferences.cardioGoalMode]);

  const syncEditFields = () => {
    setEditedWorkoutsPerWeek(preferences.workoutsPerWeek?.toString() || "3");
    setEditedSessionTime(preferences.sessionTimeMinutes || 45);
    setEditedExperienceLevel(preferences.experienceLevel || "intermediate");
    setEditedAiPreferencesNotes(preferences.aiPreferencesNotes || "");
    setEditedCardioGoal(preferences.weeklyCardioCalorieGoal?.toString() || "");
    setEditedCardioStretchGoal(preferences.weeklyCardioStretchCalorieGoal?.toString() || "");
    setCardioGoalMode(preferences.cardioGoalMode || 'auto');
    setStretchMultiplier(preferences.stretchGoalMultiplier || 1.2);
  };

  const handleEditClick = () => {
    syncEditFields();
    setIsEditing(true);
  };
  const handleCancelClick = () => setIsEditing(false);

  const handleSaveClick = () => {
    const numWorkouts = parseInt(editedWorkoutsPerWeek, 10);
    if (isNaN(numWorkouts) || numWorkouts < 0 || numWorkouts > 7) {
      toast({
        title: "Invalid Input",
        description: "Workouts per week must be a number between 0 and 7.",
        variant: "destructive",
      });
      return;
    }

    // Validate stretch multiplier
    if (cardioGoalMode === 'auto') {
      if (isNaN(stretchMultiplier) || stretchMultiplier < 1.0 || stretchMultiplier > 2.0) {
        toast({
          title: "Invalid Stretch Multiplier",
          description: "Stretch multiplier must be between 1.0 and 2.0.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate weight is set for auto mode
    if (cardioGoalMode === 'auto' && (!preferences.weightValue || preferences.weightValue <= 0)) {
      toast({
        title: "Weight Required",
        description: "Please set your weight in the profile to enable auto-calculation mode.",
        variant: "destructive",
      });
      return;
    }

    const cardioGoal = cardioGoalMode === 'auto' ? calculatedTargets?.baseTarget : (editedCardioGoal ? parseInt(editedCardioGoal, 10) : undefined);
    const cardioStretchGoal = cardioGoalMode === 'auto' ? calculatedTargets?.stretchTarget : (editedCardioStretchGoal ? parseInt(editedCardioStretchGoal, 10) : undefined);

    if (cardioGoal !== undefined && (isNaN(cardioGoal) || cardioGoal < 0)) {
        toast({ title: "Invalid Cardio Goal", description: "Weekly cardio goal must be a positive number.", variant: "destructive" });
        return;
    }
    if (cardioStretchGoal !== undefined && (isNaN(cardioStretchGoal) || cardioStretchGoal < 0)) {
        toast({ title: "Invalid Stretch Goal", description: "Weekly stretch goal must be a positive number.", variant: "destructive" });
        return;
    }
    if (cardioGoal !== undefined && cardioStretchGoal !== undefined && cardioStretchGoal < cardioGoal) {
        toast({ title: "Invalid Goals", description: "Stretch goal must be greater than or equal to the base goal.", variant: "destructive" });
        return;
    }

    onUpdate({
      workoutsPerWeek: numWorkouts,
      sessionTimeMinutes: editedSessionTime,
      experienceLevel: editedExperienceLevel,
      aiPreferencesNotes: editedAiPreferencesNotes,
      weeklyCardioCalorieGoal: cardioGoal,
      weeklyCardioStretchCalorieGoal: cardioStretchGoal,
      cardioGoalMode: cardioGoalMode,
      stretchGoalMultiplier: cardioGoalMode === 'auto' ? stretchMultiplier : undefined,
      weightValue: preferences.weightValue,
      weightUnit: preferences.weightUnit,
      fitnessGoals: preferences.fitnessGoals,
    });
    setIsEditing(false);
  };

  const formatSessionTime = (minutes?: SessionTime) => {
    if (minutes === undefined) return "Not set";
    const option = SESSION_TIME_OPTIONS.find(opt => opt.value === minutes);
    return option ? option.label : `${minutes} minutes`;
  };
  
  const formatExperienceLevel = (level?: ExperienceLevel) => {
    if (level === undefined) return "Not set";
    const option = EXPERIENCE_LEVEL_OPTIONS.find(opt => opt.value === level);
    return option ? option.label : level;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <CardTitle className="font-headline flex items-center gap-2 text-xl">
            <Zap className="h-5 w-5 text-primary" />
            Workout Preferences
          </CardTitle>
          <CardDescription>Specify your training preferences and any other considerations for AI.</CardDescription>
        </div>
        <div className="flex gap-2">
            {isEditing && !isMobile ? (
              <>
                <Button variant="outline" size="icon" onClick={handleCancelClick} aria-label="Cancel edit">
                  <XCircle className="h-5 w-5" />
                </Button>
                <Button size="icon" onClick={handleSaveClick} aria-label="Save preferences">
                  <Save className="h-5 w-5" />
                </Button>
              </>
            ) : !isEditing ? (
              <Button variant="ghost" size="icon" onClick={handleEditClick} aria-label="Edit workout preferences">
                <Edit2 className="h-5 w-5" />
              </Button>
            ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="workouts-per-week-input" className="text-sm font-medium">
                  Workouts Per Week
                </Label>
                <Input
                  id="workouts-per-week-input"
                  type="number"
                  min="0"
                  max="7"
                  value={editedWorkoutsPerWeek}
                  onChange={(e) => setEditedWorkoutsPerWeek(e.target.value)}
                  placeholder="e.g., 3"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="session-time-select" className="text-sm font-medium">
                  Time Per Session
                </Label>
                <Select
                  value={editedSessionTime.toString()}
                  onValueChange={(val) => setEditedSessionTime(parseInt(val, 10) as SessionTime)}
                >
                  <SelectTrigger id="session-time-select" className="mt-1">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="experience-level-select" className="text-sm font-medium">
                  Experience Level
                </Label>
                <Select
                  value={editedExperienceLevel}
                  onValueChange={(val) => setEditedExperienceLevel(val as ExperienceLevel)}
                >
                  <SelectTrigger id="experience-level-select" className="mt-1">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-medium">Weekly Cardio Calories</Label>
              <div className="flex gap-2 mb-3">
                <Button
                  variant={cardioGoalMode === 'auto' ? 'default' : 'outline'}
                  onClick={() => setCardioGoalMode('auto')}
                  className="flex-1"
                >
                  Auto Calculate
                </Button>
                <Button
                  variant={cardioGoalMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setCardioGoalMode('manual')}
                  className="flex-1"
                >
                  Manual Override
                </Button>
              </div>

              {cardioGoalMode === 'auto' ? (
                <div className="space-y-3 p-3 rounded-md bg-blue-50 border border-blue-200">
                  {preferences.weightValue && preferences.weightValue > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-normal text-muted-foreground">Base Target (calculated)</Label>
                          <div className="mt-1 p-2 bg-white border rounded text-sm font-medium">
                            {calculatedTargets?.baseTarget.toLocaleString() || '—'} kcal
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-normal text-muted-foreground">Stretch Goal (calculated)</Label>
                          <div className="mt-1 p-2 bg-white border rounded text-sm font-medium">
                            {calculatedTargets?.stretchTarget.toLocaleString() || '—'} kcal
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="stretch-multiplier-input" className="text-xs font-normal text-muted-foreground">
                          Stretch Goal Multiplier (1.0-2.0)
                        </Label>
                        <Input
                          id="stretch-multiplier-input"
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="2.0"
                          value={stretchMultiplier}
                          onChange={(e) => setStretchMultiplier(parseFloat(e.target.value) || 1.2)}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {stretchMultiplier}x of base target = {calculatedTargets ? Math.round(calculatedTargets.baseTarget * stretchMultiplier).toLocaleString() : '—'} kcal
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground italic pt-1">
                        Based on CDC guidelines (150 min/week moderate cardio) adjusted for your experience level, fitness goals, and workout frequency.
                      </p>
                    </>
                  ) : (
                    <div className="text-sm text-yellow-700 p-2">
                      Set your weight in the profile to enable auto-calculation.
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cardio-goal-input" className="text-xs font-normal text-muted-foreground">Base Target</Label>
                    <Input
                      id="cardio-goal-input"
                      type="number"
                      min="0"
                      value={editedCardioGoal}
                      onChange={(e) => setEditedCardioGoal(e.target.value)}
                      placeholder="e.g., 1000 kcal"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardio-stretch-goal-input" className="text-xs font-normal text-muted-foreground">Stretch Goal</Label>
                    <Input
                      id="cardio-stretch-goal-input"
                      type="number"
                      min="0"
                      value={editedCardioStretchGoal}
                      onChange={(e) => setEditedCardioStretchGoal(e.target.value)}
                      placeholder="e.g., 1200 kcal"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="ai-preferences-notes" className="text-sm font-medium">
                Additional Concerns or Preferences for AI
              </Label>
              <Textarea
                id="ai-preferences-notes"
                value={editedAiPreferencesNotes}
                onChange={(e) => setEditedAiPreferencesNotes(e.target.value)}
                placeholder="enter any equipment or exercise preferences, injuries to note, and anything else you want AI to consider for your custom workout plan"
                className="mt-1 min-h-[100px]"
              />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="space-y-3">
                 <div>
                    <span className="font-medium text-muted-foreground">Workouts/Week: </span>
                    <span>{preferences.workoutsPerWeek !== undefined ? preferences.workoutsPerWeek : "Not set"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Session Time: </span>
                    <span>{formatSessionTime(preferences.sessionTimeMinutes)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Experience: </span>
                    <span>{formatExperienceLevel(preferences.experienceLevel)}</span>
                  </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-muted-foreground">Weekly Cardio Calories</h4>
                <div className="space-y-1 text-xs mb-2">
                  <span className="inline-block px-2 py-1 rounded-md bg-blue-100 text-blue-800">
                    {preferences.cardioGoalMode === 'auto' ? 'Auto-calculated' : 'Custom'}
                  </span>
                </div>
                 <div className="space-y-3">
                    <div>
                        <span className="font-medium text-muted-foreground">Base Target: </span>
                        <span>{preferences.weeklyCardioCalorieGoal !== undefined ? `${preferences.weeklyCardioCalorieGoal.toLocaleString()} kcal` : "Not set"}</span>
                    </div>
                    <div>
                        <span className="font-medium text-muted-foreground">Stretch Goal: </span>
                        <span>{preferences.weeklyCardioStretchCalorieGoal !== undefined ? `${preferences.weeklyCardioStretchCalorieGoal.toLocaleString()} kcal` : "Not set"}</span>
                    </div>
                </div>
              </div>
            </div>

            {preferences.aiPreferencesNotes && (
              <div className="pt-2">
                <h4 className="font-semibold text-sm text-muted-foreground mt-2">Additional Preferences for AI:</h4>
                <p className="text-sm whitespace-pre-wrap">{preferences.aiPreferencesNotes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
       {isEditing && isMobile && (
        <CardFooter className="sticky bottom-0 bg-background/95 p-4 border-t backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={handleCancelClick} className="w-full">
              Cancel
            </Button>
            <Button onClick={handleSaveClick} className="w-full">
              Save
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
