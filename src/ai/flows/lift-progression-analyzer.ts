
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
import { subWeeks, isAfter, startOfWeek, eachWeekOfInterval, format } from 'date-fns';

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
    
    const weeklyData: Record<string, { e1RMs: number[]; volumes: number[] }> = {};
    const weeks = eachWeekOfInterval(
        { start: sixWeeksAgo, end: new Date() },
        { weekStartsOn: 1 } // Monday
    );

    for (const weekStart of weeks) {
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        weeklyData[weekKey] = { e1RMs: [], volumes: [] };
    }

    recentHistory.forEach(h => {
        const weekStart = startOfWeek(h.date, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (weeklyData[weekKey]) {
            weeklyData[weekKey].e1RMs.push(calculateE1RM(h.weight, h.reps));
            weeklyData[weekKey].volumes.push(h.sets * h.reps * h.weight);
        }
    });

    let precomputedSummary = "Weekly Performance Data:\n";
    const activeWeeksData: { week: string; avgE1RM: number; totalVolume: number }[] = [];

    Object.entries(weeklyData).forEach(([week, data]) => {
        if (data.e1RMs.length > 0) {
            const avgE1RM = data.e1RMs.reduce((a, b) => a + b, 0) / data.e1RMs.length;
            const totalVolume = data.volumes.reduce((a, b) => a + b, 0);
            activeWeeksData.push({ week, avgE1RM, totalVolume });
            precomputedSummary += `- Week of ${week}: Avg e1RM = ${avgE1RM.toFixed(1)}, Total Volume = ${totalVolume.toFixed(0)}\n`;
        }
    });
    
    let overallTrend = "Data insufficient to determine trend.";
    if (activeWeeksData.length >= 2) {
        const firstWeek = activeWeeksData[0];
        const lastWeek = activeWeeksData[activeWeeksData.length - 1];
        
        const e1rmChange = lastWeek.avgE1RM - firstWeek.avgE1RM;
        const e1rmPercentChange = (e1rmChange / firstWeek.avgE1RM) * 100;
        
        // Check for recent stagnation (last 2 weeks)
        let recentStagnation = false;
        if (activeWeeksData.length >= 3) {
            const week_n = activeWeeksData[activeWeeksData.length - 1].avgE1RM;
            const week_n1 = activeWeeksData[activeWeeksData.length - 2].avgE1RM;
            const week_n2 = activeWeeksData[activeWeeksData.length - 3].avgE1RM;
            if (week_n <= week_n1 && week_n1 <= week_n2) {
                recentStagnation = true;
            }
        } else if (activeWeeksData.length === 2) {
            if (lastWeek.avgE1RM <= firstWeek.avgE1RM) {
                recentStagnation = true;
            }
        }

        if (e1rmPercentChange > 5 && !recentStagnation) {
            overallTrend = `Positive (${e1rmPercentChange.toFixed(0)}% increase).`;
        } else if (e1rmPercentChange > 0) {
            overallTrend = `Slightly Positive, but has plateaued in the last 2-3 weeks.`;
        } else if (e1rmPercentChange <= 0 && recentStagnation) {
            overallTrend = `Stagnated or Regressing.`;
        } else {
            overallTrend = `Stagnated.`;
        }
    }
    
    precomputedSummary += `\nOverall e1RM Trend Analysis: ${overallTrend}`;


    // --- AI Prompting Step ---
    const prompt = ai.definePrompt({
        name: 'liftProgressionInsightPrompt',
        output: { schema: AnalyzeLiftProgressionOutputSchema },
        prompt: `You are an expert strength and conditioning coach. Your task is to analyze pre-calculated workout data and provide a qualitative, insightful, and actionable assessment. **DO NOT perform any calculations or invent data.** Base your entire analysis on the weekly summary and trend analysis provided below.

        **User Context:**
        {{{userProfileContext}}}
        
        **Exercise Being Analyzed:** {{{exerciseName}}}

        **Pre-Calculated Data Summary (Last 6 Weeks):**
        {{{precomputedSummary}}}

        **Your Task:**
        Based *only* on the data summary and the final 'Overall e1RM Trend Analysis' line above, provide a JSON response with the following fields:
        1.  **progressionStatus**: Classify the user's progress based on the 'Overall e1RM Trend Analysis'.
            - "Excellent": Trend shows a strong and consistent positive increase.
            - "Good": Trend is generally positive but may have some flat weeks or a recent plateau.
            - "Stagnated": Trend analysis indicates stagnation, a plateau, or slight regression.
            - "Regressing": Trend analysis explicitly shows regression.
        2.  **insight**: A concise (1-2 sentences) explanation of what the trends mean. Reference specific changes in e1RM and volume from the weekly data. **DO NOT invent numbers like "2250 lbs"; refer to the actual data provided.** For example, "Your strength (e1RM) has steadily climbed over the past few weeks, though your volume has varied, indicating you are getting stronger even with different workloads."
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
