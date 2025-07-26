
'use server';
/**
 * @fileOverview Analyzes a user's progressive overload for a specific exercise over the last 6 weeks.
 *
 * - analyzeLiftProgression - A function that handles the lift progression analysis.
 * - AnalyzeLiftProgressionInput - The input type for the function.
 * - AnalyzeLiftProgressionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { StrengthLevel } from '@/lib/types';


// --- Zod Schemas and Types ---

const ExerciseHistoryEntrySchema = z.object({
  date: z.string().describe("The date of the workout, in ISO format."),
  weight: z.number().describe("The weight lifted for the exercise."),
  sets: z.number().describe("The number of sets performed."),
  reps: z.number().describe("The number of reps performed per set."),
});

const AnalyzeLiftProgressionInputSchema = z.object({
  exerciseName: z.string().describe("The name of the exercise to be analyzed."),
  exerciseHistory: z.array(ExerciseHistoryEntrySchema).describe("An array of all logged performances for this exercise from the trailing 6 weeks. This is for context only; do not perform calculations on it."),
  userProfileContext: z.string().describe("A summary of the user's experience level and primary fitness goal."),
  currentLevel: z.custom<StrengthLevel>().optional().describe("The user's current strength level for this specific exercise (e.g., 'Beginner', 'Advanced')."),
  trendPercentage: z.number().optional().describe("The calculated e1RM trend percentage over the last 6 weeks, e.g., 15.2 for +15.2%."),
  volumeTrendPercentage: z.number().optional().describe("The calculated total volume trend percentage over the last 6 weeks, e.g., -5.1 for -5.1%."),
});
export type AnalyzeLiftProgressionInput = z.infer<typeof AnalyzeLiftProgressionInputSchema>;

const AnalyzeLiftProgressionOutputSchema = z.object({
  insight: z.string().describe("A concise (1-2 sentence) explanation of the trend, combining e1RM and volume analysis."),
  recommendation: z.string().describe("A single, actionable piece of advice to help the user improve their progression."),
});
export type AnalyzeLiftProgressionOutput = z.infer<typeof AnalyzeLiftProgressionOutputSchema>;


// --- Main Action Function ---

export async function analyzeLiftProgression(input: AnalyzeLiftProgressionInput): Promise<AnalyzeLiftProgressionOutput> {
  // Basic validation: If there's not enough data for a trend, don't call the AI.
  if (input.exerciseHistory.length < 2) {
    return {
        insight: "There isn't enough recent data (at least two sessions in the last 6 weeks) to generate a meaningful progression analysis for this lift.",
        recommendation: "Log this exercise at least one more time in the coming weeks, then check back for your analysis.",
    };
  }
  return analyzeLiftProgressionFlow(input);
}


// --- Genkit Flow Definition ---

const analyzeLiftProgressionFlow = ai.defineFlow(
  {
    name: 'analyzeLiftProgressionFlow',
    inputSchema: AnalyzeLiftProgressionInputSchema,
    outputSchema: AnalyzeLiftProgressionOutputSchema,
  },
  async (input) => {
    
    // --- AI Prompting Step ---
    const prompt = ai.definePrompt({
        name: 'liftProgressionInsightPrompt',
        output: { schema: AnalyzeLiftProgressionOutputSchema },
        prompt: `You are an expert strength and conditioning coach. Your task is to provide a qualitative, insightful, and actionable assessment. **You MUST NOT perform any calculations.** Your entire analysis MUST be based on the pre-calculated data provided below.

        **User Context:**
        {{{userProfileContext}}}
        
        **Exercise Being Analyzed:** {{{exerciseName}}}
        
        **Pre-Calculated Analysis:**
        - **User's Current Strength Level for this Lift:** {{{currentLevel}}}
        {{#if trendPercentage}}
        - **Calculated e1RM Trend Percentage:** {{{trendPercentage}}}%
        {{/if}}
        {{#if volumeTrendPercentage}}
        - **Calculated Volume Trend Percentage:** {{{volumeTrendPercentage}}}%
        {{/if}}

        **Your Task:**
        Your output MUST be a JSON object containing an 'insight' and a 'recommendation'. 
        
        **CRITICAL INSTRUCTIONS FOR YOUR COMMENTARY:**
        1.  **Synthesize Both Trends**: You **MUST** synthesize both the 'e1RM Trend' and the 'Volume Trend' in your 'insight'. Analyze their relationship to explain the user's progress. For example:
            - If e1RM is stagnant (+/- 2%) but Volume is increasing significantly (>+5%), this is a valid form of progressive overload. Frame this positively as building work capacity.
            - If e1RM is increasing but Volume is decreasing, this could indicate a shift to lower-rep, higher-intensity training.
            - If both are decreasing, the recommendation should be more direct about potential overtraining, the need for a deload, or checking form.
        2.  **Incorporate Percentages**: You **MUST** incorporate the specific percentage values into your 'insight' to add quantitative context. For example, mention "a 15% increase in e1RM" or "a 5% decrease in volume". This makes the feedback more personal and impactful.
        3.  **Tailor to Strength Level**: Your commentary MUST be strictly tailored to the user's provided **Current Strength Level**.
            -   **For 'Beginner' or 'Intermediate' Lifts:**
                -   A strong positive trend in either e1RM or volume is great. Encourage consistency.
                -   A flat or negative trend is a signal to act. Your recommendation should focus on clear advice (e.g., progressive overload, form check, deload week).
            -   **For 'Advanced' or 'Elite' Lifts:**
                -   A small positive or flat e1RM trend can be excellent, representing maintenance of high-level strength.
                -   Focus recommendations on variation, recovery, or addressing small dips in performance. A drop in volume might be a planned deload.
        
        **Your Response Fields:**
        1.  **insight**: A concise (1-2 sentences) explanation of what the trends mean, specifically for a lifter at the provided **'Current Strength Level'** and incorporating the specific trend percentages.
        2.  **recommendation**: A single, clear, and actionable piece of advice for the user's next 2-3 weeks, tailored to their level and the combined trends.
        `,
    });

    const { output } = await prompt({
        userProfileContext: input.userProfileContext,
        exerciseName: input.exerciseName,
        currentLevel: input.currentLevel || 'N/A',
        trendPercentage: input.trendPercentage ? input.trendPercentage.toFixed(1) : undefined,
        volumeTrendPercentage: input.volumeTrendPercentage ? input.volumeTrendPercentage.toFixed(1) : undefined,
    });
    
    if (!output) {
      throw new Error("AI failed to generate a response for the lift progression analysis.");
    }
    
    return output;
  }
);
