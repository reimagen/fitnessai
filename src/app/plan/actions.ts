
"use server";

import { generateWeeklyWorkoutPlan, type WeeklyWorkoutPlanInput, type WeeklyWorkoutPlanOutput } from "@/ai/flows/weekly-workout-planner";
import { getUserProfile, incrementUsageCounter } from "@/lib/firestore-server";
import { format } from "date-fns";
import { z } from "zod";

const WeeklyPlanActionInputSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  userProfileContext: z.string().min(1, "User profile context is required."),
  weekStartDate: z.string().optional(), // YYYY-MM-DD format
});

export async function generateWeeklyWorkoutPlanAction(
  values: WeeklyWorkoutPlanInput
): Promise<{ success: boolean; data?: WeeklyWorkoutPlanOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
    console.error("Missing API Key:", errorMessage);
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
    const userProfile = await getUserProfile(userId);
    const today = format(new Date(), 'yyyy-MM-dd');
    const usage = userProfile?.aiUsage?.planGenerations;

    if (usage && usage.date === today && usage.count >= 5) {
      return { success: false, error: "You have reached your daily limit of 5 plan generations." };
    }
  }

  try {
    const planOutput = await generateWeeklyWorkoutPlan(validatedFields.data);
    
    // Increment usage counter on success (only in production)
    if (process.env.NODE_ENV !== 'development') {
        await incrementUsageCounter(userId, 'planGenerations');
    }

    return { success: true, data: planOutput };
  } catch (error) {
    console.error("Error generating weekly workout plan:", error);
    let userFriendlyError = "An unknown error occurred while generating the plan. This attempt did not count against your daily limit.";
    if (error instanceof Error) {
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            userFriendlyError = "Plan generation failed: The request quota for the AI has been exceeded. Please try again later. This attempt did not count against your daily limit.";
        } else if (error.message.includes('503') || error.message.toLowerCase().includes('overloaded') || error.message.toLowerCase().includes('unavailable')) {
            userFriendlyError = "Plan generation failed: The AI model is temporarily unavailable. Please try again in a few moments. This attempt did not count against your daily limit.";
        } else {
            userFriendlyError = `Failed to generate plan: ${error.message}. This attempt did not count against your daily limit.`;
        }
    }
    return { success: false, error: userFriendlyError };
  }
}
