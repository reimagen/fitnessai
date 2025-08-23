
"use server";

import { parseWorkoutScreenshot, type ParseWorkoutScreenshotInput, type ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import { 
  addWorkoutLog as serverAddWorkoutLog,
  updateWorkoutLog as serverUpdateWorkoutLog,
  deleteWorkoutLog as serverDeleteWorkoutLog,
  getWorkoutLogs as serverGetWorkoutLogs
} from "@/lib/firestore-server";
import type { WorkoutLog } from "@/lib/types";

export async function parseWorkoutScreenshotAction(
  values: ParseWorkoutScreenshotInput
): Promise<{ success: boolean; data?: ParseWorkoutScreenshotOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
    console.error("Missing API Key:", errorMessage);
    return { success: false, error: errorMessage };
  }
  
  // Basic validation for data URI can be added here if needed,
  // though the AI flow itself might handle malformed inputs.
  if (!values.photoDataUri || !values.photoDataUri.startsWith("data:image/")) {
    return { success: false, error: "Invalid image data provided." };
  }

  try {
    const parsedData = await parseWorkoutScreenshot(values);
    return { success: true, data: parsedData };
  } catch (error) {
    console.error("Error parsing workout screenshot:", error);
    let userFriendlyError = "An unknown error occurred while parsing the screenshot.";
    if (error instanceof Error) {
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            userFriendlyError = "Parsing failed: The request quota for the AI has been exceeded. Please try again later.";
        } else if (error.message.includes('503') || error.message.toLowerCase().includes('overloaded') || error.message.toLowerCase().includes('unavailable')) {
            userFriendlyError = "Parsing failed: The AI model is temporarily unavailable. Please try again in a few moments.";
        } else {
            userFriendlyError = `Failed to parse screenshot: ${error.message}`;
        }
    }
    return { success: false, error: userFriendlyError };
  }
}

// --- Server Actions for Workout Logs ---

export async function getWorkoutLogs(userId: string, forMonth?: Date): Promise<WorkoutLog[]> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  return serverGetWorkoutLogs(userId, forMonth);
}

export async function addWorkoutLog(userId: string, log: Omit<WorkoutLog, 'id' | 'userId'>): Promise<{ id: string }> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  const result = await serverAddWorkoutLog(userId, log);
  return result;
}

export async function updateWorkoutLog(userId: string, id: string, log: Partial<Omit<WorkoutLog, 'id' | 'userId'>>): Promise<void> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  await serverUpdateWorkoutLog(userId, id, log);
}

export async function deleteWorkoutLog(userId: string, id: string): Promise<void> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  await serverDeleteWorkoutLog(userId, id);
}
