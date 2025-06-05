
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { RecommendationForm } from "@/components/plan/recommendation-form";
import { getWorkoutRecommendationAction } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserProfile, FitnessGoal, ExperienceLevel, SessionTime } from "@/lib/types"; // Ensure all necessary types are imported

// Define a type for the form data structure the RecommendationForm expects
type FormDataForPlan = {
  fitnessGoals: string;
  workoutHistory: string;
  personalStats: string;
};

// Define a fallback profile structure for cases where localStorage is empty or parsing fails
const fallbackUserProfile: UserProfile = {
  id: "fallbackUser",
  name: "User",
  email: "",
  joinedDate: new Date(),
  fitnessGoals: [],
  age: undefined,
  gender: undefined,
  heightValue: undefined,
  heightUnit: undefined,
  workoutsPerWeek: 3,
  sessionTimeMinutes: 45,
  experienceLevel: 'intermediate',
  aiPreferencesNotes: "",
};

// Helper function to get display height
const getDisplayHeight = (heightValue?: number, heightUnit?: 'cm' | 'ft/in'): string => {
  if (heightValue === undefined || heightUnit === undefined) return "Not set";
  if (heightUnit === 'cm') {
    // Height value is stored in cm in UserProfile if set
    return `${heightValue.toFixed(1)} cm`;
  }
  // If ft/in, it means heightValue is in cm and needs conversion for display
  const totalInches = heightValue / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet} ft ${inches} in`;
};


const synthesizeFormData = (profile: UserProfile | null): FormDataForPlan => {
  if (!profile) {
    return { fitnessGoals: "Please set your fitness goals in your profile.", workoutHistory: "Please set your workout preferences in your profile.", personalStats: "Please set your personal stats in your profile." };
  }

  // Fitness Goals
  let fitnessGoalsString = "No fitness goals set in profile.";
  if (profile.fitnessGoals && profile.fitnessGoals.length > 0) {
    const primaryGoal = profile.fitnessGoals.find(g => g.isPrimary === true);
    const otherGoals = profile.fitnessGoals.filter(g => g.isPrimary !== true && g.description);

    let parts: string[] = [];
    if (primaryGoal && primaryGoal.description) {
      parts.push(`Primary Goal: ${primaryGoal.description}.`);
    }
    if (otherGoals.length > 0) {
      parts.push(`Other goals: ${otherGoals.map(g => g.description).join(', ')}.`);
    }
    if (parts.length > 0) {
      fitnessGoalsString = parts.join(" ");
    }
  }

  // Workout History
  let workoutHistoryParts: string[] = [];
  if (profile.experienceLevel) {
    workoutHistoryParts.push(`Experience: ${profile.experienceLevel.charAt(0).toUpperCase() + profile.experienceLevel.slice(1)}.`);
  }
  if (profile.workoutsPerWeek !== undefined) {
    workoutHistoryParts.push(`${profile.workoutsPerWeek} workouts/week.`);
  }
  if (profile.sessionTimeMinutes) {
    workoutHistoryParts.push(`${profile.sessionTimeMinutes} mins/session.`);
  }
  // Consider adding relevant parts of aiPreferencesNotes if they describe history/routine
  const workoutHistoryString = workoutHistoryParts.length > 0 ? workoutHistoryParts.join(" ") : "No specific workout history details in profile.";

  // Personal Stats
  let personalStatsParts: string[] = [];
  if (profile.age) {
    personalStatsParts.push(`${profile.age} y/o.`);
  }
  if (profile.gender) {
    personalStatsParts.push(`${profile.gender}.`);
  }
  if (profile.heightValue && profile.heightUnit) {
    personalStatsParts.push(`Height: ${getDisplayHeight(profile.heightValue, profile.heightUnit)}.`);
  }
  // Append aiPreferencesNotes here as a general catch-all for other important info for the AI
  if (profile.aiPreferencesNotes) {
    personalStatsParts.push(`Other notes/preferences for AI: ${profile.aiPreferencesNotes}`);
  }
  const personalStatsString = personalStatsParts.length > 0 ? personalStatsParts.join(" ") : "No specific personal stats in profile.";

  return {
    fitnessGoals: fitnessGoalsString,
    workoutHistory: workoutHistoryString,
    personalStats: personalStatsString,
  };
};


export default function PlanPage() {
  const [isClient, setIsClient] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedProfileString = localStorage.getItem("fitnessAppUserProfile");
      if (savedProfileString) {
        try {
          const parsed = JSON.parse(savedProfileString);
          // Robust hydration of the profile data
          const hydratedProfile: UserProfile = {
            ...fallbackUserProfile, // Start with defaults to ensure all keys exist
            ...parsed, // Override with parsed values
            // Explicitly hydrate nested structures and ensure types
            joinedDate: parsed.joinedDate ? new Date(parsed.joinedDate) : fallbackUserProfile.joinedDate,
            fitnessGoals: Array.isArray(parsed.fitnessGoals) ? parsed.fitnessGoals.map((goal: any): FitnessGoal => ({
              id: goal.id || `goal-${Math.random().toString(36).substring(2, 9)}`,
              description: goal.description || "",
              targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
              achieved: typeof goal.achieved === 'boolean' ? goal.achieved : false,
              isPrimary: typeof goal.isPrimary === 'boolean' ? goal.isPrimary : false, // Ensure boolean
            })) : [], // Default to empty array if not an array
            age: parsed.age ? parseInt(parsed.age, 10) : undefined,
            heightValue: parsed.heightValue ? parseFloat(parsed.heightValue) : undefined,
            workoutsPerWeek: parsed.workoutsPerWeek ? parseInt(parsed.workoutsPerWeek, 10) : fallbackUserProfile.workoutsPerWeek,
            sessionTimeMinutes: parsed.sessionTimeMinutes ? parseInt(parsed.sessionTimeMinutes, 10) as SessionTime : fallbackUserProfile.sessionTimeMinutes,
          };
          setUserProfile(hydratedProfile);
        } catch (error) {
          console.error("Error parsing user profile for Plan page:", error);
          setUserProfile(fallbackUserProfile); // Fallback to default if parsing fails
        }
      } else {
        setUserProfile(fallbackUserProfile); // Fallback if no profile in localStorage
      }
    }
  }, [isClient]);

  const synthesizedFormData = useMemo(() => {
    return synthesizeFormData(userProfile);
  }, [userProfile]);

  return (
    <div>
      New Plan Page UI Starts Here
    </div>
  );
}
