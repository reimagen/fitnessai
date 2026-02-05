
"use server";

import { parseWorkoutScreenshot, type ParseWorkoutScreenshotInput, type ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import {
  addWorkoutLog as serverAddWorkoutLog,
  updateWorkoutLog as serverUpdateWorkoutLog,
  deleteWorkoutLog as serverDeleteWorkoutLog,
  getWorkoutLogs as serverGetWorkoutLogs,
  incrementUsageCounter,
} from "@/lib/firestore-server";
import { logger } from "@/lib/logging/logger";
import { createRequestContext } from "@/lib/logging/request-context";
import { withServerActionLogging } from "@/lib/logging/server-action-wrapper";
import { classifyAIError } from "@/lib/logging/error-classifier";
import type { WorkoutLog } from "@/lib/types";
import { checkRateLimit } from "@/app/prs/rate-limiting";

export async function parseWorkoutScreenshotAction(
  userId: string,
  values: ParseWorkoutScreenshotInput
): Promise<{ success: boolean; data?: ParseWorkoutScreenshotOutput; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "history/parseWorkoutScreenshotAction",
    feature: "screenshotParses",
  });

  return withServerActionLogging(context, async () => {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
      await logger.error("Missing API Key", { ...context, error: errorMessage });
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
      const classified = classifyAIError(error);
      await logger.error("Error parsing workout screenshot", {
        ...context,
        errorType: classified.category,
        statusCode: classified.statusCode,
      });

      // Don't count against limit if it's a service error
      if (!classified.shouldCountAgainstLimit) {
        await logger.info("Skipping usage counter increment due to service error", {
          ...context,
          errorType: classified.category,
        });
      }

      return { success: false, error: classified.userMessage };
    }
  });
}

// --- Server Actions for Workout Logs ---

export async function getWorkoutLogs(userId: string, options?: { startDate?: Date; endDate?: Date; since?: Date }): Promise<WorkoutLog[]> {
  const context = createRequestContext({
    userId,
    route: "history/getWorkoutLogs",
    feature: "workoutLogs",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    return serverGetWorkoutLogs(userId, options);
  });
}

export async function addWorkoutLog(userId: string, log: Omit<WorkoutLog, 'id' | 'userId'>): Promise<{ id: string }> {
  const context = createRequestContext({
    userId,
    route: "history/addWorkoutLog",
    feature: "workoutLogs",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    const result = await serverAddWorkoutLog(userId, log);
    return result;
  });
}

export async function updateWorkoutLog(userId: string, id: string, log: Partial<Omit<WorkoutLog, 'id' | 'userId'>>): Promise<void> {
  const context = createRequestContext({
    userId,
    route: "history/updateWorkoutLog",
    feature: "workoutLogs",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    await serverUpdateWorkoutLog(userId, id, log);
  });
}

export async function deleteWorkoutLog(userId: string, id: string): Promise<void> {
  const context = createRequestContext({
    userId,
    route: "history/deleteWorkoutLog",
    feature: "workoutLogs",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    await serverDeleteWorkoutLog(userId, id);
  });
}
