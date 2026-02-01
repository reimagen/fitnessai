
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
  'fitnessGoals' |
  'activityLevel' |
  'weightGoal' |
  'cardioCalculationMethod'
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

const ACTIVITY_LEVEL_OPTIONS: { label: string; value: ActivityLevel }[] = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Lightly Active", value: "lightly_active" },
  { label: "Moderately Active", value: "moderately_active" },
  { label: "Very Active", value: "very_active" },
  { label: "Extremely Active", value: "extremely_active" },
];

const WEIGHT_GOAL_OPTIONS: { label: string; value: WeightGoal }[] = [
  { label: "Lose Weight", value: "lose" },
  { label: "Maintain Weight", value: "maintain" },
  { label: "Gain Weight", value: "gain" },
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
  const [editedActivityLevel, setEditedActivityLevel] = useState<ActivityLevel>(preferences.activityLevel || 'moderately_active');
  const [editedWeightGoal, setEditedWeightGoal] = useState<WeightGoal>(preferences.weightGoal || 'maintain');
  const [editedCardioMethod, setEditedCardioMethod] = useState<CardioCalculationMethod>(preferences.cardioCalculationMethod || 'auto');
  const [simplifiedCalculatedTargets, setSimplifiedCalculatedTargets] = useState<{ baseGoal: number; stretchGoal: number } | null>(null);

  // Auto-calculate cardio targets when dependencies change (legacy complex formula)
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

  // Auto-calculate cardio targets using simplified formula when method/inputs change
  useEffect(() => {
    if (editedCardioMethod === 'auto' && editedActivityLevel && editedWeightGoal) {
      const targets = calculateWeeklyCardioTargets({
        experienceLevel: editedExperienceLevel,
        weightGoal: editedWeightGoal,
        activityLevel: editedActivityLevel,
      } as UserProfile);
      setSimplifiedCalculatedTargets(targets);
    } else if (editedCardioMethod !== 'auto') {
      setSimplifiedCalculatedTargets(null);
    }
  }, [editedActivityLevel, editedWeightGoal, editedExperienceLevel, editedCardioMethod]);

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
    setEditedActivityLevel(preferences.activityLevel || 'moderately_active');
    setEditedWeightGoal(preferences.weightGoal || 'maintain');
    setEditedCardioMethod(preferences.cardioCalculationMethod || 'auto');
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

    // Validate weight is set for legacy auto mode
    if (cardioGoalMode === 'auto' && (!preferences.weightValue || preferences.weightValue <= 0)) {
      toast({
        title: "Weight Required",
        description: "Please set your weight in the profile to enable auto-calculation mode.",
        variant: "destructive",
      });
      return;
    }

    // Validate activity level and weight goal are set for simplified calculation method
    if (editedCardioMethod === 'auto' && (!editedActivityLevel || !editedWeightGoal)) {
      toast({
        title: "Missing Settings",
        description: "Select activity level and weight goal to enable auto-calculation.",
        variant: "destructive",
      });
      return;
    }

    let cardioGoal: number | undefined;
    let cardioStretchGoal: number | undefined;

    // Use simplified calculation if that method is selected
    if (editedCardioMethod === 'auto') {
      // Recalculate if not already calculated
      const targets = simplifiedCalculatedTargets || calculateWeeklyCardioTargets({
        experienceLevel: editedExperienceLevel,
        weightGoal: editedWeightGoal,
        activityLevel: editedActivityLevel,
      } as UserProfile);
      cardioGoal = targets.baseGoal;
      cardioStretchGoal = targets.stretchGoal;
    } else if (cardioGoalMode === 'auto' && !editedCardioMethod) {
      // Fall back to legacy calculation if only legacy mode is set (backwards compatibility)
      cardioGoal = calculatedTargets?.baseTarget;
      cardioStretchGoal = calculatedTargets?.stretchTarget;
    } else {
      // Manual entry
      cardioGoal = editedCardioGoal ? parseInt(editedCardioGoal, 10) : undefined;
      cardioStretchGoal = editedCardioStretchGoal ? parseInt(editedCardioStretchGoal, 10) : undefined;
    }

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
      activityLevel: editedActivityLevel,
      weightGoal: editedWeightGoal,
      cardioCalculationMethod: editedCardioMethod,
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

              {/* Simplified Auto-Calculation Method */}
              <div className="space-y-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                <Label className="text-sm font-medium">Calculation Method</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={editedCardioMethod === 'auto' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditedCardioMethod('auto')}
                    className="flex-1"
                  >
                    ✨ Smart Auto
                  </Button>
                  <Button
                    type="button"
                    variant={editedCardioMethod === 'manual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditedCardioMethod('manual')}
                    className="flex-1"
                  >
                    Manual Entry
                  </Button>
                </div>

                {editedCardioMethod === 'auto' && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-amber-200">
                    <p className="text-xs text-amber-900">Set your activity level and weight goal:</p>

                    {/* Help card for activity level selection */}
                    <details className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                      <summary className="cursor-pointer font-medium text-blue-900 hover:text-blue-800">ℹ️ How to choose your activity level</summary>
                      <div className="mt-3 space-y-2 text-blue-800">
                        <div>
                          <span className="font-semibold">Sedentary:</span> Minimal exercise, mostly desk/indoor work
                        </div>
                        <div>
                          <span className="font-semibold">Lightly Active:</span> 1-3 workouts per week, some daily movement
                        </div>
                        <div>
                          <span className="font-semibold">Moderately Active:</span> 3-5 workouts per week (balanced routine)
                        </div>
                        <div>
                          <span className="font-semibold">Very Active:</span> 5-6 workouts per week or physically demanding job
                        </div>
                        <div>
                          <span className="font-semibold">Extremely Active:</span> Daily intense training or manual labor job
                        </div>
                      </div>
                    </details>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="activity-level-select" className="text-xs font-normal text-muted-foreground">
                          Activity Level
                        </Label>
                        <Select
                          value={editedActivityLevel}
                          onValueChange={(val) => setEditedActivityLevel(val as ActivityLevel)}
                        >
                          <SelectTrigger id="activity-level-select" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="weight-goal-select" className="text-xs font-normal text-muted-foreground">
                          Weight Goal
                        </Label>
                        <Select
                          value={editedWeightGoal}
                          onValueChange={(val) => setEditedWeightGoal(val as WeightGoal)}
                        >
                          <SelectTrigger id="weight-goal-select" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEIGHT_GOAL_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {simplifiedCalculatedTargets && simplifiedCalculatedTargets.baseGoal && simplifiedCalculatedTargets.stretchGoal && (
                      <div className="p-2 bg-white rounded border border-amber-200 text-sm">
                        <p className="text-xs text-muted-foreground mb-1">Recommended targets:</p>
                        <p className="font-semibold">
                          {simplifiedCalculatedTargets.baseGoal.toLocaleString()} - {simplifiedCalculatedTargets.stretchGoal.toLocaleString()} kcal/week
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {editedCardioMethod === 'manual' && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-amber-200">
                    <p className="text-xs text-amber-900">Enter your targets manually:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="cardio-manual-base" className="text-xs font-normal text-muted-foreground">
                          Base Target
                        </Label>
                        <Input
                          id="cardio-manual-base"
                          type="number"
                          min="0"
                          value={editedCardioGoal}
                          onChange={(e) => setEditedCardioGoal(e.target.value)}
                          placeholder="e.g., 600"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cardio-manual-stretch" className="text-xs font-normal text-muted-foreground">
                          Stretch Goal
                        </Label>
                        <Input
                          id="cardio-manual-stretch"
                          type="number"
                          min="0"
                          value={editedCardioStretchGoal}
                          onChange={(e) => setEditedCardioStretchGoal(e.target.value)}
                          placeholder="e.g., 750"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Legacy Complex Auto-Calculation (hidden by default) */}
              <details className="pt-2">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  Advanced: Legacy Auto-Calculate
                </summary>
                <div className="space-y-3 mt-3 p-3 rounded-md bg-blue-50 border border-blue-200">
                  <div className="flex gap-2">
                    <Button
                      variant={cardioGoalMode === 'auto' ? 'default' : 'outline'}
                      onClick={() => setCardioGoalMode('auto')}
                      className="flex-1"
                      size="sm"
                    >
                      Enable
                    </Button>
                    <Button
                      variant={cardioGoalMode === 'manual' ? 'default' : 'outline'}
                      onClick={() => setCardioGoalMode('manual')}
                      className="flex-1"
                      size="sm"
                    >
                      Disable
                    </Button>
                  </div>

                  {cardioGoalMode === 'auto' && (
                    <div className="space-y-3 p-3 rounded-md bg-white border">
                      {preferences.weightValue && preferences.weightValue > 0 ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs font-normal text-muted-foreground">Base Target</Label>
                              <div className="mt-1 p-2 bg-gray-50 border rounded text-sm font-medium">
                                {calculatedTargets?.baseTarget.toLocaleString() || '—'} kcal
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-normal text-muted-foreground">Stretch Goal</Label>
                              <div className="mt-1 p-2 bg-gray-50 border rounded text-sm font-medium">
                                {calculatedTargets?.stretchTarget.toLocaleString() || '—'} kcal
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="stretch-multiplier-input" className="text-xs font-normal text-muted-foreground">
                              Stretch Multiplier (1.0-2.0)
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
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-yellow-700">Set your weight to enable legacy auto-calculation.</div>
                      )}
                    </div>
                  )}
                </div>
              </details>

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

                {/* Method badge */}
                <div className="space-y-1 text-xs mb-2">
                  {preferences.cardioCalculationMethod === 'auto' ? (
                    <span className="inline-block px-2 py-1 rounded-md bg-amber-100 text-amber-800 font-medium">
                      ✨ Smart Auto-Calculated
                    </span>
                  ) : preferences.cardioGoalMode === 'auto' ? (
                    <span className="inline-block px-2 py-1 rounded-md bg-blue-100 text-blue-800">
                      Auto-calculated (Legacy)
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 rounded-md bg-slate-100 text-slate-800">
                      Manual Entry
                    </span>
                  )}
                </div>

                {/* Show activity level and weight goal if using simplified auto */}
                {preferences.cardioCalculationMethod === 'auto' && (
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="font-medium text-muted-foreground">Activity Level: </span>
                      <span>{ACTIVITY_LEVEL_OPTIONS.find(opt => opt.value === preferences.activityLevel)?.label || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Weight Goal: </span>
                      <span>{WEIGHT_GOAL_OPTIONS.find(opt => opt.value === preferences.weightGoal)?.label || 'Not set'}</span>
                    </div>
                  </div>
                )}

                {/* Targets */}
                <div className="space-y-1 text-xs">
                  <div>
                      <span className="font-medium text-muted-foreground">Base Target: </span>
                      <span>
                        {preferences.cardioCalculationMethod === 'auto' && preferences.experienceLevel && preferences.weightGoal && preferences.activityLevel
                          ? `${calculateWeeklyCardioTargets({
                              experienceLevel: preferences.experienceLevel,
                              weightGoal: preferences.weightGoal,
                              activityLevel: preferences.activityLevel,
                            } as UserProfile).baseGoal.toLocaleString()} kcal`
                          : preferences.weeklyCardioCalorieGoal !== undefined ? `${preferences.weeklyCardioCalorieGoal.toLocaleString()} kcal` : "Not set"}
                      </span>
                  </div>
                  <div>
                      <span className="font-medium text-muted-foreground">Stretch Goal: </span>
                      <span>
                        {preferences.cardioCalculationMethod === 'auto' && preferences.experienceLevel && preferences.weightGoal && preferences.activityLevel
                          ? `${calculateWeeklyCardioTargets({
                              experienceLevel: preferences.experienceLevel,
                              weightGoal: preferences.weightGoal,
                              activityLevel: preferences.activityLevel,
                            } as UserProfile).stretchGoal.toLocaleString()} kcal`
                          : preferences.weeklyCardioStretchCalorieGoal !== undefined ? `${preferences.weeklyCardioStretchCalorieGoal.toLocaleString()} kcal` : "Not set"}
                      </span>
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
