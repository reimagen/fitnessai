
'use server';

import { analyzeStrengthImbalances, type StrengthImbalanceInput, type StrengthImbalanceOutput } from "@/ai/flows/strength-imbalance-analyzer";
import { analyzeLiftProgression, type AnalyzeLiftProgressionInput, type AnalyzeLiftProgressionOutput } from "@/ai/flows/lift-progression-analyzer";
import { updateUserProfile } from "@/lib/firestore-server";
import type { StoredStrengthAnalysis, StoredLiftProgressionAnalysis } from "@/lib/types";
import { getNormalizedExerciseName } from "@/lib/strength-standards";


export async function analyzeStrengthAction(
  userId: string,
  values: StrengthImbalanceInput
): Promise<{ success: boolean; data?: StrengthImbalanceOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
    console.error("Missing API Key:", errorMessage);
    return { success: false, error: errorMessage };
  }
  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }

  try {
    const analysisData = await analyzeStrengthImbalances(values);

    const storedAnalysis: StoredStrengthAnalysis = {
      result: analysisData,
      generatedDate: new Date(),
    };

    // After getting analysis, save it to the user's profile in Firestore
    await updateUserProfile(userId, { strengthAnalysis: storedAnalysis });

    return { success: true, data: analysisData };
  } catch (error) {
    console.error("Error analyzing strength imbalances:", error);
    let userFriendlyError = "An unknown error occurred while analyzing your strength balance.";
    if (error instanceof Error) {
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            userFriendlyError = "Analysis failed: The request quota for the AI has been exceeded. Please try again later.";
        } else if (error.message.includes('503') || error.message.toLowerCase().includes('overloaded') || error.message.toLowerCase().includes('unavailable')) {
            userFriendlyError = "Analysis failed: The AI model is temporarily unavailable. Please try again in a few moments.";
        } else {
            userFriendlyError = `Failed to analyze strength: ${error.message}`;
        }
    }
    return { success: false, error: userFriendlyError };
  }
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
    const analysisData = await analyzeLiftProgression(values);

    const storedAnalysis: StoredLiftProgressionAnalysis = {
      result: analysisData,
      generatedDate: new Date(),
    };

    // Save the analysis to the specific exercise key in the user's profile using dot notation
    // This ensures we don't overwrite the entire map of analyses.
    const exerciseKey = getNormalizedExerciseName(values.exerciseName);
    await updateUserProfile(userId, { 
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

    
