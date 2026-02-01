"use client";

import { useMemo, useState } from "react";
import type { ActivityLevel, CardioCalculationMethod, UserProfile, WeightGoal } from "@/lib/types";
import { calculateWeeklyCardioTargets } from "@/lib/cardio-target-calculator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, XCircle, Flame } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useIsMobile } from "@/hooks/useMobile";

type WeeklyCardioTargets = Pick<
  UserProfile,
  | "weeklyCardioCalorieGoal"
  | "weeklyCardioStretchCalorieGoal"
  | "cardioCalculationMethod"
  | "activityLevel"
  | "weightGoal"
  | "experienceLevel"
  | "weightValue"
  | "weightUnit"
>;

type WeeklyCardioTargetsCardProps = {
  targets: WeeklyCardioTargets;
  onUpdate: (updatedTargets: Partial<WeeklyCardioTargets>) => void;
};

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

export function WeeklyCardioTargetsCard({ targets, onUpdate }: WeeklyCardioTargetsCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const isMobile = useIsMobile();

  const [editedMethod, setEditedMethod] = useState<CardioCalculationMethod>(
    targets.cardioCalculationMethod || "auto"
  );
  const [editedActivityLevel, setEditedActivityLevel] = useState<ActivityLevel>(
    targets.activityLevel || "moderately_active"
  );
  const [editedWeightGoal, setEditedWeightGoal] = useState<WeightGoal>(
    targets.weightGoal || "maintain"
  );
  const [editedBaseGoal, setEditedBaseGoal] = useState(
    targets.weeklyCardioCalorieGoal?.toString() || ""
  );
  const [editedStretchGoal, setEditedStretchGoal] = useState(
    targets.weeklyCardioStretchCalorieGoal?.toString() || ""
  );
  const autoPreview = useMemo(() => {
    if (editedMethod !== "auto") {
      return null;
    }
    return calculateWeeklyCardioTargets({
      experienceLevel: targets.experienceLevel,
      activityLevel: editedActivityLevel,
      weightGoal: editedWeightGoal,
      weightValue: targets.weightValue,
      weightUnit: targets.weightUnit,
    } as UserProfile);
  }, [
    editedMethod,
    editedActivityLevel,
    editedWeightGoal,
    targets.experienceLevel,
    targets.weightValue,
    targets.weightUnit,
  ]);

  const syncEditFields = () => {
    setEditedMethod(targets.cardioCalculationMethod || "auto");
    setEditedActivityLevel(targets.activityLevel || "moderately_active");
    setEditedWeightGoal(targets.weightGoal || "maintain");
    setEditedBaseGoal(targets.weeklyCardioCalorieGoal?.toString() || "");
    setEditedStretchGoal(targets.weeklyCardioStretchCalorieGoal?.toString() || "");
  };

  const handleEditClick = () => {
    syncEditFields();
    setIsEditing(true);
  };

  const handleCancelClick = () => setIsEditing(false);

  const handleSaveClick = () => {
    if (editedMethod === "auto" && (!editedActivityLevel || !editedWeightGoal)) {
      toast({
        title: "Missing Settings",
        description: "Select activity level and weight goal to enable auto-calculation.",
        variant: "destructive",
      });
      return;
    }

    let baseGoal: number | undefined;
    let stretchGoal: number | undefined;

    if (editedMethod === "auto") {
      const preview = autoPreview || calculateWeeklyCardioTargets({
        experienceLevel: targets.experienceLevel,
        activityLevel: editedActivityLevel,
        weightGoal: editedWeightGoal,
        weightValue: targets.weightValue,
        weightUnit: targets.weightUnit,
      } as UserProfile);
      baseGoal = preview.baseGoal;
      stretchGoal = preview.stretchGoal;
    } else {
      baseGoal = editedBaseGoal ? parseInt(editedBaseGoal, 10) : undefined;
      stretchGoal = editedStretchGoal ? parseInt(editedStretchGoal, 10) : undefined;
    }

    if (baseGoal !== undefined && (isNaN(baseGoal) || baseGoal < 0)) {
      toast({
        title: "Invalid Cardio Goal",
        description: "Weekly cardio goal must be a positive number.",
        variant: "destructive",
      });
      return;
    }
    if (stretchGoal !== undefined && (isNaN(stretchGoal) || stretchGoal < 0)) {
      toast({
        title: "Invalid Stretch Goal",
        description: "Weekly stretch goal must be a positive number.",
        variant: "destructive",
      });
      return;
    }
    if (baseGoal !== undefined && stretchGoal !== undefined && stretchGoal < baseGoal) {
      toast({
        title: "Invalid Goals",
        description: "Stretch goal must be greater than or equal to the base goal.",
        variant: "destructive",
      });
      return;
    }

    onUpdate({
      weeklyCardioCalorieGoal: baseGoal,
      weeklyCardioStretchCalorieGoal: stretchGoal,
      cardioCalculationMethod: editedMethod,
      activityLevel: editedActivityLevel,
      weightGoal: editedWeightGoal,
    });
    setIsEditing(false);
  };

  const renderGoalValue = (value?: number) => (value !== undefined ? `${value.toLocaleString()} kcal` : "Not set");

  const renderAutoTargets = () => {
    if (!targets.experienceLevel || !targets.activityLevel || !targets.weightGoal) {
      return {
        base: "Not set",
        stretch: "Not set",
      };
    }
    const calculated = calculateWeeklyCardioTargets({
      experienceLevel: targets.experienceLevel,
      activityLevel: targets.activityLevel,
      weightGoal: targets.weightGoal,
      weightValue: targets.weightValue,
      weightUnit: targets.weightUnit,
    } as UserProfile);
    return {
      base: renderGoalValue(calculated.baseGoal),
      stretch: renderGoalValue(calculated.stretchGoal),
    };
  };

  const autoDisplay = renderAutoTargets();

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <CardTitle className="font-headline flex items-center gap-2 text-xl">
            <Flame className="h-5 w-5 text-primary" />
            Weekly Cardio Targets
          </CardTitle>
          <CardDescription>Set your weekly cardio calorie goals or let us calculate them for you.</CardDescription>
        </div>
        <div className="flex gap-2">
          {isEditing && !isMobile ? (
            <>
              <Button variant="outline" size="icon" onClick={handleCancelClick} aria-label="Cancel edit">
                <XCircle className="h-5 w-5" />
              </Button>
              <Button size="icon" onClick={handleSaveClick} aria-label="Save cardio targets">
                <Save className="h-5 w-5" />
              </Button>
            </>
          ) : !isEditing ? (
            <Button variant="ghost" size="icon" onClick={handleEditClick} aria-label="Edit cardio targets">
              <Edit2 className="h-5 w-5" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Calculation Method</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={editedMethod === "auto" ? "default" : "outline"}
                size="sm"
                onClick={() => setEditedMethod("auto")}
                className="flex-1"
              >
                ✨ Smart Auto
              </Button>
              <Button
                type="button"
                variant={editedMethod === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setEditedMethod("manual")}
                className="flex-1"
              >
                Manual Entry
              </Button>
            </div>

            {editedMethod === "auto" ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground">Set your activity level and weight goal:</p>
                <details className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                  <summary className="cursor-pointer font-medium text-blue-900 hover:text-blue-800">
                    ℹ️ How to choose your activity level
                  </summary>
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
                    <Label htmlFor="cardio-activity-level" className="text-xs font-normal text-muted-foreground">
                      Activity Level
                    </Label>
                    <Select
                      value={editedActivityLevel}
                      onValueChange={(val) => setEditedActivityLevel(val as ActivityLevel)}
                    >
                      <SelectTrigger id="cardio-activity-level" className="mt-1">
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
                    <Label htmlFor="cardio-weight-goal" className="text-xs font-normal text-muted-foreground">
                      Weight Goal
                    </Label>
                    <Select
                      value={editedWeightGoal}
                      onValueChange={(val) => setEditedWeightGoal(val as WeightGoal)}
                    >
                      <SelectTrigger id="cardio-weight-goal" className="mt-1">
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

                {autoPreview && (
                  <div className="p-2 bg-white rounded border border-amber-200 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Recommended targets:</p>
                    <p className="font-semibold">
                      {autoPreview.baseGoal.toLocaleString()} - {autoPreview.stretchGoal.toLocaleString()} kcal/week
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground">Enter your targets manually:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cardio-manual-base" className="text-xs font-normal text-muted-foreground">
                      Base Target
                    </Label>
                    <Input
                      id="cardio-manual-base"
                      type="number"
                      min="0"
                      value={editedBaseGoal}
                      onChange={(e) => setEditedBaseGoal(e.target.value)}
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
                      value={editedStretchGoal}
                      onChange={(e) => setEditedStretchGoal(e.target.value)}
                      placeholder="e.g., 750"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="space-y-1 text-xs">
              {targets.cardioCalculationMethod === "auto" ? (
                <span className="inline-block px-2 py-1 rounded-md bg-amber-100 text-amber-800 font-medium">
                  ✨ Smart Auto-Calculated
                </span>
              ) : (
                <span className="inline-block px-2 py-1 rounded-md bg-slate-100 text-slate-800">
                  Manual Entry
                </span>
              )}
            </div>

            {targets.cardioCalculationMethod === "auto" && (
              <div className="space-y-1 text-xs">
                <div>
                  <span className="font-medium text-muted-foreground">Activity Level: </span>
                  <span>{ACTIVITY_LEVEL_OPTIONS.find((opt) => opt.value === targets.activityLevel)?.label || "Not set"}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Weight Goal: </span>
                  <span>{WEIGHT_GOAL_OPTIONS.find((opt) => opt.value === targets.weightGoal)?.label || "Not set"}</span>
                </div>
              </div>
            )}

            <div className="space-y-1 text-xs">
              <div>
                <span className="font-medium text-muted-foreground">Base Target: </span>
                <span>
                  {targets.cardioCalculationMethod === "auto"
                    ? autoDisplay.base
                    : renderGoalValue(targets.weeklyCardioCalorieGoal)}
                </span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Stretch Goal: </span>
                <span>
                  {targets.cardioCalculationMethod === "auto"
                    ? autoDisplay.stretch
                    : renderGoalValue(targets.weeklyCardioStretchCalorieGoal)}
                </span>
              </div>
            </div>
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
