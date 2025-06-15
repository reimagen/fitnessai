
"use server";

import { generateWeeklyWorkoutPlan, type WeeklyWorkoutPlanInput, type WeeklyWorkoutPlanOutput } from "@/ai/flows/weekly-workout-planner";
import { z } from "zod";

const WeeklyPlanActionInputSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  userProfileContext: z.string().min(1, "User profile context is required."),
  weekStartDate: z.string().optional(), // YYYY-MM-DD format
});

export async function generateWeeklyWorkoutPlanAction(
  values: WeeklyWorkoutPlanInput
): Promise<{ success: boolean; data?: WeeklyWorkoutPlanOutput; error?: string }> {
  const validatedFields = WeeklyPlanActionInputSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      error: JSON.stringify(validatedFields.error.flatten().fieldErrors)
    };
  }
  
  try {
    const planOutput = await generateWeeklyWorkoutPlan(validatedFields.data);
    return { success: true, data: planOutput };
  } catch (error) {
    console.error("Error generating weekly workout plan:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while generating the plan.";
    return { success: false, error: errorMessage };
  }
}

