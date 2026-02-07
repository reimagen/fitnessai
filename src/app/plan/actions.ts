
"use server";

import { generateWeeklyWorkoutPlan, type WeeklyWorkoutPlanInput, type WeeklyWorkoutPlanOutput } from "@/ai/flows/weekly-workout-planner";
import { incrementUsageCounter, getWeeklyPlan, saveWeeklyPlan } from "@/lib/firestore-server";
import { logger } from "@/lib/logging/logger";
import { createRequestContext } from "@/lib/logging/request-context";
import { withServerActionLogging } from "@/lib/logging/server-action-wrapper";
import { classifyAIError } from "@/lib/logging/error-classifier";
import { checkRateLimit } from "@/app/prs/rate-limiting";
import { z } from "zod";
import type { StoredWeeklyPlan } from "@/lib/types";

const WeeklyPlanActionInputSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  userProfileContext: z.string().min(1, "User profile context is required."),
  weekStartDate: z.string().optional(), // YYYY-MM-DD format
});

export async function generateWeeklyWorkoutPlanAction(
  values: WeeklyWorkoutPlanInput
): Promise<{ success: boolean; data?: WeeklyWorkoutPlanOutput; error?: string }> {
  const context = createRequestContext({
    userId: values.userId,
    route: "plan/generateWeeklyWorkoutPlanAction",
    feature: "planGenerations",
  });

  return withServerActionLogging(context, async () => {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
      await logger.error("Missing API Key", { ...context, error: errorMessage });
      return { success: false, error: errorMessage };
    }

    const validatedFields = WeeklyPlanActionInputSchema.safeParse(values);

    if (!validatedFields.success) {
      return {
        success: false,
        error: JSON.stringify(validatedFields.error.flatten().fieldErrors)
      };
    }
    
    const { userId } = validatedFields.data;

    // Bypass limit check in development environment
    if (process.env.NODE_ENV !== 'development') {
      const { allowed, error } = await checkRateLimit(userId, "planGenerations");
      if (!allowed) {
        return { success: false, error };
      }
    }

    try {
      const planOutput = await generateWeeklyWorkoutPlan(validatedFields.data);
      
      // Increment usage counter on success
      await incrementUsageCounter(userId, 'planGenerations');

      return { success: true, data: planOutput };
    } catch (error) {
      const classified = classifyAIError(error);
      await logger.error("Error generating weekly workout plan", {
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

const SaveWeeklyPlanSchema = z.object({
  plan: z.string().min(1, "Plan content is required"),
  generatedDate: z.union([z.date(), z.string().datetime()]).transform(d => new Date(d)),
  contextUsed: z.string(),
  userId: z.string().min(1, "User ID is required"),
  weekStartDate: z.string().min(1, "Week start date is required"),
});

export async function getWeeklyPlanAction(
  userId: string
): Promise<{ success: boolean; data?: StoredWeeklyPlan; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "plan/getWeeklyPlanAction",
    feature: "weeklyPlans",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    try {
      // Enable lazy backfill during migration period
      const plan = await getWeeklyPlan(userId, { enableLazyBackfill: true });
      return { success: true, data: plan || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch weekly plan"
      };
    }
  });
}

export async function saveWeeklyPlanAction(
  userId: string,
  planData: StoredWeeklyPlan
): Promise<{ success: boolean; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "plan/saveWeeklyPlanAction",
    feature: "weeklyPlans",
  });

  return withServerActionLogging(context, async () => {
    const validatedData = SaveWeeklyPlanSchema.safeParse(planData);
    if (!validatedData.success) {
      return {
        success: false,
        error: `Invalid plan data: ${validatedData.error.message}`
      };
    }

    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    try {
      await saveWeeklyPlan(userId, validatedData.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save weekly plan"
      };
    }
  });
}
