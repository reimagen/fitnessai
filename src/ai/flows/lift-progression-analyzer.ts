
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
import { subWeeks, isAfter } from 'date-fns';

// --- Helper Functions for Trend Calculation ---

/**
 * Calculates the estimated 1-Rep Max (e1RM) using the Epley formula.
 * @param weight The weight lifted.
 * @param reps The number of repetitions.
 * @returns The calculated e1RM.
 */
function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps === 0) return 0;
  return weight * (1 + reps / 30);
}

/**
 * Performs a simple linear regression on a series of data points over time.
 * @param data An array of objects with a 'value' and 'time' (in milliseconds).
 * @returns 'Positive', 'Negative', or 'Stagnated' trend.
 */
function calculateTrend(data: { value: number; time: number }[]): 'Positive' | 'Negative' | 'Stagnated' {
  if (data.length < 2) {
    return 'Stagnated';
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = data.length;

  for (const point of data) {
    sumX += point.time;
    sumY += point.value;
    sumXY += point.time * point.value;
    sumXX += point.time * point.time;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // A very small slope is effectively flat. We'll consider a change of less than 0.1% of the average value as stagnated.
  const avgValue = sumY / n;
  const tolerance = Math.abs(avgValue * 0.001);

  if (Math.abs(slope) < tolerance) return 'Stagnated';
  return slope > 0 ? 'Positive' : 'Negative';
}


// --- Zod Schemas and Types ---

const ExerciseHistoryEntrySchema = z.object({
  date: z.string().describe("The date of the workout, in ISO format."),
  weight: z.number().describe("The weight lifted for the exercise."),
  sets: z.number().describe("The number of sets performed."),
  reps: z.number().describe("The number of reps performed per set."),
});

const AnalyzeLiftProgressionInputSchema = z.object({
  exerciseName: z.string().describe("The name of the exercise to be analyzed."),
  exerciseHistory: z.array(ExerciseHistoryEntrySchema).describe("An array of all logged performances for this exercise from the trailing 6 weeks."),
  userProfileContext: z.string().describe("A summary of the user's experience level and primary fitness goal."),
});
export type AnalyzeLiftProgressionInput = z.infer<typeof AnalyzeLiftProgressionInputSchema>;

const AnalyzeLiftProgressionOutputSchema = z.object({
  progressionStatus: z.enum(["Excellent", "Good", "Stagnated", "Regressing"]).describe("The overall status of the user's progression for this lift."),
  insight: z.string().describe("A concise (1-2 sentence) explanation of the trend, combining e1RM and volume analysis."),
  recommendation: z.string().describe("A single, actionable piece of advice to help the user improve their progression."),
});
export type AnalyzeLiftProgressionOutput = z.infer<typeof AnalyzeLiftProgressionOutputSchema>;


// --- Main Action Function ---

export async function analyzeLiftProgression(input: AnalyzeLiftProgressionInput): Promise<AnalyzeLiftProgressionOutput> {
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
    // --- Pre-computation Step ---
    const sixWeeksAgo = subWeeks(new Date(), 6);
    const recentHistory = input.exerciseHistory
      .map(h => ({ ...h, date: new Date(h.date) }))
      .filter(h => isAfter(h.date, sixWeeksAgo));
    
    if (recentHistory.length < 2) {
        throw new Error("Not enough data within the last 6 weeks to perform a meaningful trend analysis.");
    }
    
    const e1rmData = recentHistory.map(h => ({
        value: calculateE1RM(h.weight, h.reps),
        time: h.date.getTime(),
    }));

    const volumeData = recentHistory.map(h => ({
        value: h.sets * h.reps * h.weight,
        time: h.date.getTime(),
    }));

    const e1rmTrend = calculateTrend(e1rmData);
    const volumeTrend = calculateTrend(volumeData);

    const latestE1RM = e1rmData[e1rmData.length - 1].value.toFixed(1);
    const latestVolume = volumeData[volumeData.length - 1].value.toFixed(0);

    const precomputedSummary = `
      - e1RM Trend: ${e1rmTrend}
      - Volume Trend: ${volumeTrend}
      - Most Recent Estimated 1-Rep Max: ${latestE1RM}
      - Most Recent Session Volume: ${latestVolume}
    `;

    // --- AI Prompting Step ---
    const prompt = ai.definePrompt({
        name: 'liftProgressionInsightPrompt',
        output: { schema: AnalyzeLiftProgressionOutputSchema },
        prompt: `You are an expert strength and conditioning coach. Your task is to analyze pre-calculated workout data and provide a qualitative, insightful, and actionable assessment. **DO NOT perform any calculations.** Base your entire analysis on the summary provided.

        **User Context:**
        {{{userProfileContext}}}
        
        **Exercise Being Analyzed:** {{{exerciseName}}}

        **Pre-Calculated Data Summary (Last 6 Weeks):**
        {{{precomputedSummary}}}

        **Your Task:**
        Based *only* on the data above, provide a JSON response with the following fields:
        1.  **progressionStatus**: Classify the user's progress.
            - "Excellent": Both e1RM and Volume have a strong Positive trend.
            - "Good": e1RM is Positive, but Volume may be Stagnated. Or, Volume is positive but e1RM is Stagnated. This is solid progress but can be optimized.
            - "Stagnated": Both trends are Stagnated, or one is Positive and the other is Negative (indicating inefficient training).
            - "Regressing": e1RM trend is Negative, regardless of volume.
        2.  **insight**: A concise (1-2 sentences) explanation of what the trends mean in relation to the user's goal. Combine the e1RM and volume trends into a single narrative.
        3.  **recommendation**: A single, clear, and actionable piece of advice for the user's next 2-3 weeks of training for this specific lift. It must be a direct suggestion to improve upon the insight.
        `,
    });

    const { output } = await prompt({
        userProfileContext: input.userProfileContext,
        exerciseName: input.exerciseName,
        precomputedSummary,
    });
    
    if (!output) {
      throw new Error("AI failed to generate a response for the lift progression analysis.");
    }
    
    return output;
  }
);
