
'use server';

import { getUserProfile as getUserProfileFromServer, updateUserProfile as updateUserProfileFromServer, incrementUsageCounter} from "@/lib/firestore-server";
import { analyzeLiftProgression as analyzeLiftProgressionFlow, type AnalyzeLiftProgressionInput, type AnalyzeLiftProgressionOutput } from "@/ai/flows/lift-progression-analyzer";
import { analyzeFitnessGoals as analyzeFitnessGoalsFlow, type AnalyzeFitnessGoalsInput, type AnalyzeFitnessGoalsOutput } from "@/ai/flows/goal-analyzer";
import type { UserProfile, StoredLiftProgressionAnalysis, StoredGoalAnalysis } from "@/lib/types";
import { getNormalizedExerciseName } from "@/lib/strength-standards";
import { format } from 'date-fns';


// Server Actions must be explicitly defined as async functions in this file.
// They then call the server-only logic from other files.

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!userId) {
        throw new Error("User not authenticated.");
    }
    return getUserProfileFromServer(userId);
}

export async function updateUserProfile(userId: string, data: Partial<Omit<UserProfile, 'id'>>): Promise<void> {
    if (!userId) {
        throw new Error("User not authenticated.");
    }
    await updateUserProfileFromServer(userId, data);
}

export async function analyzeLiftProgressionAction(
  userId: string,
  values: AnalyzeLiftProgressionInput
): Promise<{ success: boolean; data?: AnalyzeLiftProgressionOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
    console.error("Missing API Key:", errorMessage);
    return { success: false, error: errorMessage };
  }
  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }

  try {
    const analysisData = await analyzeLiftProgressionFlow(values);

    const storedAnalysis: StoredLiftProgressionAnalysis = {
      result: analysisData,
      generatedDate: new Date(),
    };

    const exerciseKey = getNormalizedExerciseName(values.exerciseName);

    // This is the corrected part. We create a proper nested object structure
    // instead of using dot notation in the field name, which Firestore
    // interprets as a literal string.
    const updatePayload = {
      liftProgressionAnalysis: {
        [exerciseKey]: storedAnalysis
      }
    };
    
    await updateUserProfileFromServer(userId, updatePayload);

    return { success: true, data: analysisData };
  } catch (error) {
    console.error("Error analyzing lift progression:", error);
    let userFriendlyError = "An unknown error occurred while analyzing your lift progression.";
    if (error instanceof Error) {
        userFriendlyError = `Failed to analyze progression: ${error.message}`;
    }
    return { success: false, error: userFriendlyError };
  }
}


export async function analyzeGoalsAction(
  userId: string,
  values: AnalyzeFitnessGoalsInput
): Promise<{ success: boolean; data?: AnalyzeFitnessGoalsOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
    console.error("Missing API Key:", errorMessage);
    return { success: false, error: errorMessage };
  }
  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }

  // Bypass limit check in development environment
  if (process.env.NODE_ENV !== 'development') {
    const userProfile = await getUserProfileFromServer(userId);
    const today = format(new Date(), 'yyyy-MM-dd');
    const usage = userProfile?.aiUsage?.goalAnalyses;

    if (usage && usage.date === today && usage.count >= 5) {
      return { success: false, error: "You have reached your daily limit of 5 goal analyses." };
    }
  }

  try {
    const analysisData = await analyzeFitnessGoalsFlow(values);

    const storedAnalysis: StoredGoalAnalysis = {
      result: analysisData,
      generatedDate: new Date(),
    };
    
    // Increment usage counter on success (only in production)
    if (process.env.NODE_ENV !== 'development') {
        await incrementUsageCounter(userId, 'goalAnalyses');
    }

    // Save the analysis result to the user's profile
    await updateUserProfileFromServer(userId, { goalAnalysis: storedAnalysis });


    return { success: true, data: analysisData };
  } catch (error) {
    console.error("Error analyzing fitness goals:", error);
    let userFriendlyError = "An unknown error occurred while analyzing your goals. This attempt did not count against your daily limit.";
    if (error instanceof Error) {
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            userFriendlyError = "Analysis failed: The request quota for the AI has been exceeded. Please try again later. This attempt did not count against your daily limit.";
        } else if (error.message.includes('503') || error.message.toLowerCase().includes('overloaded') || error.message.toLowerCase().includes('unavailable')) {
            userFriendlyError = "Analysis failed: The AI model is temporarily unavailable. Please try again in a few moments. This attempt did not count against your daily limit.";
        } else {
            userFriendlyError = `Failed to analyze goals: ${error.message}. This attempt did not count against your daily limit.`;
        }
    }
    return { success: false, error: userFriendlyError };
  }
}
