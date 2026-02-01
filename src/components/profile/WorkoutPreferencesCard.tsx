
"use client";

import { useState } from "react";
import type { ExperienceLevel, SessionTime, UserProfile } from "@/lib/types";
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
  'aiPreferencesNotes'
>;

type WorkoutPreferencesCardProps = {
  preferences: WorkoutPreferences;
  onUpdate: (updatedPreferences: Partial<WorkoutPreferences>) => void;
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

  const syncEditFields = () => {
    setEditedWorkoutsPerWeek(preferences.workoutsPerWeek?.toString() || "3");
    setEditedSessionTime(preferences.sessionTimeMinutes || 45);
    setEditedExperienceLevel(preferences.experienceLevel || "intermediate");
    setEditedAiPreferencesNotes(preferences.aiPreferencesNotes || "");
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

    onUpdate({
      workoutsPerWeek: numWorkouts,
      sessionTimeMinutes: editedSessionTime,
      experienceLevel: editedExperienceLevel,
      aiPreferencesNotes: editedAiPreferencesNotes,
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
          <CardTitle className="font-headline flex items-center gap-2 text-2xl">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
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

            {preferences.aiPreferencesNotes && (
              <div className="pt-1">
                <h4 className="font-semibold text-sm text-muted-foreground mt-1">Additional Preferences for AI:</h4>
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
