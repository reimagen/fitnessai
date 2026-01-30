
"use server";

import { parseWorkoutScreenshot, type ParseWorkoutScreenshotInput, type ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import {
  addWorkoutLog as serverAddWorkoutLog,
  updateWorkoutLog as serverUpdateWorkoutLog,
  deleteWorkoutLog as serverDeleteWorkoutLog,
  getWorkoutLogs as serverGetWorkoutLogs,
  incrementUsageCounter,
} from "@/lib/firestore-server";
import type { WorkoutLog } from "@/lib/types";
import { checkRateLimit } from "@/app/prs/rate-limiting";

export async function parseWorkoutScreenshotAction(
  userId: string,
  values: ParseWorkoutScreenshotInput
): Promise<{ success: boolean; data?: ParseWorkoutScreenshotOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
    console.error("Missing API Key:", errorMessage);
    return { success: false, error: errorMessage };
  }
  
  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }

  if (!values.photoDataUri || !values.photoDataUri.startsWith("data:image/")) {
    return { success: false, error: "Invalid image data provided." };
  }

  // Bypass limit check in development environment
  if (process.env.NODE_ENV !== 'development') {
    const { allowed, error } = await checkRateLimit(userId, "screenshotParses");
    if (!allowed) {
      return { success: false, error };
    }
  }

  try {
    const parsedData = await parseWorkoutScreenshot(values);
    await incrementUsageCounter(userId, 'screenshotParses');
    return { success: true, data: parsedData };
  } catch (error) {
    console.error("Error parsing workout screenshot:", error);
    let userFriendlyError = "An unknown error occurred while parsing the screenshot. This attempt did not count against your daily limit.";
    if (error instanceof Error) {
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            userFriendlyError = "Parsing failed: The request quota for the AI has been exceeded. Please try again later. This attempt did not count against your daily limit.";
        } else if (error.message.includes('503') || error.message.toLowerCase().includes('overloaded') || error.message.toLowerCase().includes('unavailable')) {
            userFriendlyError = "Parsing failed: The AI model is temporarily unavailable. Please try again in a few moments. This attempt did not count against your daily limit.";
        } else {
            userFriendlyError = `Failed to parse screenshot: ${error.message}. This attempt did not count against your daily limit.`;
        }
    }
    return { success: false, error: userFriendlyError };
  }
}

// --- Server Actions for Workout Logs ---

export async function getWorkoutLogs(userId: string, options?: { startDate?: Date; endDate?: Date; since?: Date }): Promise<WorkoutLog[]> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  return serverGetWorkoutLogs(userId, options);
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
