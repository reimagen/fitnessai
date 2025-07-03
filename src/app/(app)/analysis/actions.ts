
'use server';

import { analyzeStrengthImbalances, type StrengthImbalanceOutput } from "@/ai/flows/strength-imbalance-analyzer";
import { z } from "zod";

const PersonalRecordClientSchema = z.object({
  id: z.string(),
  exerciseName: z.string(),
  weight: z.number(),
  weightUnit: z.enum(['kg', 'lbs']),
  date: z.any(), // Keep date as a string/any as it's serialized from the client
  category: z.enum(['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other']).optional(),
});

const AnalyzeImbalancesActionSchema = z.object({
    personalRecords: z.array(PersonalRecordClientSchema),
});

export async function analyzeStrengthImbalancesAction(
  values: z.infer<typeof AnalyzeImbalancesActionSchema>
): Promise<{ success: boolean; data?: StrengthImbalanceOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing. Please add it to your .env.local file.";
    console.error("Missing API Key:", errorMessage);
    return { success: false, error: errorMessage };
  }

  const validatedFields = AnalyzeImbalancesActionSchema.safeParse(values);

  if (!validatedFields.success) {
    // Log the detailed validation error for server-side debugging
    console.error("Server-side validation failed:", validatedFields.error.flatten());
    return {
      success: false,
      error: "Invalid input data provided for analysis."
    };
  }
  
  try {
    const analysisOutput = await analyzeStrengthImbalances(validatedFields.data);
    return { success: true, data: analysisOutput };
  } catch (error) {
    console.error("Error analyzing strength imbalances:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
}
