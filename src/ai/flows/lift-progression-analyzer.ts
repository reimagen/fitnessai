
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
import type { StrengthLevel } from '@/lib/types';

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
  currentLevel: z.custom<StrengthLevel>().optional().describe("The user's current strength level for this specific exercise (e.g., 'Beginner', 'Advanced')."),
  trendPercentage: z.number().optional().describe("The calculated trend percentage over the last 6 weeks, e.g., 15.2 for +15.2%."),
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
    
    // --- AI Prompting Step ---
    const prompt = ai.definePrompt({
        name: 'liftProgressionInsightPrompt',
        output: { schema: AnalyzeLiftProgressionOutputSchema },
        prompt: `You are an expert strength and conditioning coach. Your task is to provide a qualitative, insightful, and actionable assessment. **You MUST NOT perform any calculations.** Your entire analysis MUST be based on the pre-calculated data provided below. Your primary task is to determine the 'progressionStatus' based on the user's level and trend percentage.

        **User Context:**
        {{{userProfileContext}}}
        
        **Exercise Being Analyzed:** {{{exerciseName}}}
        
        **Pre-Calculated Analysis:**
        - **User's Current Strength Level for this Lift:** {{{currentLevel}}}
        {{#if trendPercentage}}
        - **Calculated Trend Percentage:** {{{trendPercentage}}}%
        {{/if}}
        - **Weekly Data:**
          {{{precomputedSummary}}}

        **Your Task:**
        Your output MUST be a JSON object containing a 'progressionStatus', an 'insight' and a 'recommendation'. 
        
        **CRITICAL INSTRUCTIONS FOR YOUR COMMENTARY:**
        1.  **Determine Progression Status:** Based on the user's **Current Strength Level** and the **Calculated Trend Percentage**, determine the most appropriate status from ["Excellent", "Good", "Stagnated", "Regressing"]. For an Advanced lifter, a small +2% gain is 'Excellent', whereas for a Beginner, it might only be 'Stagnated'. A -1% trend might be 'Stagnated' for an Elite lifter but 'Regressing' for a Beginner.
        2.  **Incorporate the Trend Percentage:** You **MUST** incorporate the specific 'Calculated Trend Percentage' into your 'insight' to add quantitative context. For example, if the trend is +15.2%, your insight should mention "a 15% increase". This makes the feedback more personal and impactful. Congratulate the user on specific positive gains.
        3.  **Tailor to Strength Level:** Your commentary MUST be strictly tailored to the user's provided **Current Strength Level**. Do not mention any other level.
            -   **For 'Beginner' or 'Intermediate' Lifts:**
                -   A strong positive trend is great; encourage consistency and proper form. Your insight should highlight their specific percentage gain as a major achievement.
                -   A flat or negative trend is a problem. Your recommendation should focus on clear, actionable advice to break the plateau (e.g., progressive overload, form check, deload week).
            -   **For 'Advanced' or 'Elite' Lifts:**
                -   A flat trend (e.g., a trend of +0.5%) is often acceptable for maintenance. Frame your insight and recommendation around maintaining strength, introducing variation, or focusing on recovery, rather than aggressively pushing for more weight.
                -   A negative trend should still be addressed, perhaps suggesting a deload or checking recovery factors (sleep, nutrition).
        
        **Your Response Fields:**
        1.  **progressionStatus**: The status you determined based on the rules above.
        2.  **insight**: A concise (1-2 sentences) explanation of what the trends mean, specifically for a lifter at the provided **'Current Strength Level'** and incorporating the **'Calculated Trend Percentage'**.
        3.  **recommendation**: A single, clear, and actionable piece of advice for the user's next 2-3 weeks, tailored to their level and the trend.
        `,
    });

    const { output } = await prompt({
        userProfileContext: input.userProfileContext,
        exerciseName: input.exerciseName,
        currentLevel: input.currentLevel || 'N/A',
        precomputedSummary,
        trendPercentage: input.trendPercentage ? input.trendPercentage.toFixed(1) : undefined,
    });
    
    if (!output) {
      throw new Error("AI failed to generate a response for the lift progression analysis.");
    }
    
    return output;
  }
);
