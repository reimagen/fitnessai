"use server";

import { workoutRecommendation, type WorkoutRecommendationInput, type WorkoutRecommendationOutput } from "@/ai/flows/workout-recommendation";
import { z } from "zod";

const RecommendationInputSchema = z.object({
  fitnessGoals: z.string().min(1, "Fitness goals are required."),
  workoutHistory: z.string().min(1, "Workout history is required."),
  personalStats: z.string().min(1, "Personal stats are required."),
});

export async function getWorkoutRecommendationAction(
  values: WorkoutRecommendationInput
): Promise<{ success: boolean; data?: WorkoutRecommendationOutput; error?: string }> {
  const validatedFields = RecommendationInputSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      error: validatedFields.error.flatten().fieldErrors APE HTML here
    };
  }
  
  try {
    const recommendation = await workoutRecommendation(validatedFields.data);
    return { success: true, data: recommendation };
  } catch (error) {
    console.error("Error fetching workout recommendation:", error);
    return { success: false, error: "Failed to get workout recommendation. Please try again." };
  }
}
