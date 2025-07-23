
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
    
    // --- Trend Analysis using Linear Regression ---
    let trendDescription = "Data insufficient to determine trend.";
    let progressionStatus: AnalyzeLiftProgressionOutput['progressionStatus'] = "Stagnated";

    if (activeWeeksData.length >= 2) {
        const points = activeWeeksData.map((d, i) => ({ x: i, y: d.avgE1RM }));
        const n = points.length;
        const xSum = points.reduce((acc, p) => acc + p.x, 0);
        const ySum = points.reduce((acc, p) => acc + p.y, 0);
        const xySum = points.reduce((acc, p) => acc + p.x * p.y, 0);
        const x2Sum = points.reduce((acc, p) => acc + p.x * p.x, 0);
        
        const denominator = n * x2Sum - xSum * xSum;
        const slope = denominator !== 0 ? (n * xySum - xSum * ySum) / denominator : 0;
        
        const firstE1RM = points[0].y;
        const normalizedSlope = firstE1RM > 0 ? (slope / firstE1RM) * 100 : 0; // Slope as a % of starting strength

        if (normalizedSlope > 5) {
            progressionStatus = "Excellent";
            trendDescription = "Strong positive trend, indicating rapid strength gains.";
        } else if (normalizedSlope > 1) {
            progressionStatus = "Good";
            trendDescription = "Positive trend, indicating steady strength gains.";
        } else if (normalizedSlope < -2) {
            progressionStatus = "Regressing";
            trendDescription = "Negative trend, indicating a decline in strength.";
        } else {
            progressionStatus = "Stagnated";
            trendDescription = "Flat trend, indicating a plateau in strength.";
        }
    }
    
    precomputedSummary += `\nOverall Trend Analysis: ${trendDescription}`;

    // --- AI Prompting Step ---
    const prompt = ai.definePrompt({
        name: 'liftProgressionInsightPrompt',
        output: { schema: AnalyzeLiftProgressionOutputSchema },
        prompt: `You are an expert strength and conditioning coach. Your task is to analyze pre-calculated workout data and provide a qualitative, insightful, and actionable assessment. **DO NOT perform any calculations or change the pre-determined progressionStatus.** Base your entire analysis on the data provided below.

        **User Context:**
        {{{userProfileContext}}}
        
        **Exercise Being Analyzed:** {{{exerciseName}}}
        **User's Current Strength Level for this Lift:** {{{currentLevel}}}
        
        **Pre-Calculated Analysis:**
        - **Progression Status:** {{{progressionStatus}}}
        - **Trend Description:** {{{trendDescription}}}
        - **Weekly Data:**
          {{{precomputedSummary}}}

        **Your Task:**
        Your output MUST be a JSON object. You will generate an 'insight' and a 'recommendation'. **You MUST use the provided 'Progression Status' as the final status in your output.**
        
        **CRITICAL INSTRUCTIONS FOR YOUR COMMENTARY:**
        You MUST tailor your advice based on the user's **Current Strength Level**.
        1.  **For 'Beginner' or 'Intermediate' Lifts:**
            - A "Good" or "Excellent" status is great; encourage consistency.
            - A "Stagnated" or "Regressing" status is a problem. Your recommendation should focus on clear, actionable advice to break the plateau (e.g., progressive overload, form check, deload week).
        2.  **For 'Advanced' or 'Elite' Lifts:**
            - A "Stagnated" status can be perfectly acceptable for maintenance. Frame your insight and recommendation around maintaining strength, introducing variation, or focusing on other goals, rather than aggressively pushing for more weight.
            - A "Regressing" status should still be addressed, perhaps suggesting a deload or checking recovery factors (sleep, nutrition).
        
        **Your Response Fields:**
        1.  **progressionStatus**: You MUST return the exact string provided in the "Progression Status" field above. Do not change it.
        2.  **insight**: A concise (1-2 sentences) explanation of what the trends mean, considering their strength level.
        3.  **recommendation**: A single, clear, and actionable piece of advice for the user's next 2-3 weeks, tailored to their level and the trend.
        `,
    });

    const { output } = await prompt({
        userProfileContext: input.userProfileContext,
        exerciseName: input.exerciseName,
        currentLevel: input.currentLevel || 'N/A',
        progressionStatus,
        trendDescription,
        precomputedSummary,
    });
    
    if (!output) {
      throw new Error("AI failed to generate a response for the lift progression analysis.");
    }
    
    return output;
  }
);
