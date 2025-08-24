
'use server';

import { getUserProfile as getUserProfileFromServer, updateUserProfile as updateUserProfileFromServer} from "@/lib/firestore-server";
import { analyzeLiftProgression as analyzeLiftProgressionFlow, type AnalyzeLiftProgressionInput, type AnalyzeLiftProgressionOutput } from "@/ai/flows/lift-progression-analyzer";
import type { UserProfile, StoredLiftProgressionAnalysis } from "@/lib/types";
import { getNormalizedExerciseName } from "@/lib/strength-standards";

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
    await updateUserProfileFromServer(userId, { 
      [`liftProgressionAnalysis.${exerciseKey}`]: storedAnalysis 
    });

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
