
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
import type { StrengthLevel, UserProfile } from '@/lib/types';


// --- Zod Schemas and Types ---

const ExerciseHistoryEntrySchema = z.object({
  date: z.string().describe("The date of the workout, in ISO format."),
  weight: z.number().describe("The weight lifted for the exercise."),
  sets: z.number().describe("The number of sets performed."),
  reps: z.number().describe("The number of reps performed per set."),
});

// Define a schema for the user profile data that will be passed to the AI.
// This ensures we're only passing the necessary fields.
const UserProfileForAnalysisSchema = z.object({
    age: z.number().optional(),
    gender: z.string().optional(),
    heightValue: z.number().optional(),
    heightUnit: z.enum(['cm', 'ft/in']).optional(),
    weightValue: z.number().optional(),
    weightUnit: z.enum(['kg', 'lbs']).optional(),
    skeletalMuscleMassValue: z.number().optional(),
    skeletalMuscleMassUnit: z.enum(['kg', 'lbs']).optional(),
    fitnessGoals: z.array(z.object({
        description: z.string(),
        isPrimary: z.boolean().optional(),
    })).optional(),
});


const AnalyzeLiftProgressionInputSchema = z.object({
  exerciseName: z.string().describe("The name of the exercise to be analyzed."),
  exerciseHistory: z.array(ExerciseHistoryEntrySchema).describe("An array of all logged performances for this exercise from the trailing 6 weeks. This is for context only; do not perform calculations on it."),
  userProfile: UserProfileForAnalysisSchema.describe("The user's personal statistics and goals."),
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
        prompt: `You are an expert strength and conditioning coach. Your task is to provide a qualitative, insightful, and actionable assessment. **You MUST NOT perform any calculations.** Your entire analysis MUST be based on the pre-calculated data and workout history provided below.

        **User Context:**
        - Gender: {{{userProfile.gender}}}
        - Age: {{{userProfile.age}}}
        - Weight: {{{userProfile.weightValue}}} {{{userProfile.weightUnit}}}
        - Height: {{{userProfile.heightValue}}} {{{userProfile.heightUnit}}}
        {{#if userProfile.fitnessGoals}}
        - Primary Goal: {{#each userProfile.fitnessGoals}}{{#if this.isPrimary}}{{{this.description}}}{{/if}}{{/each}}
        {{/if}}
        
        **Exercise Being Analyzed:** {{{exerciseName}}}
        
        **Pre-Calculated Analysis:**
        - **User's Current Strength Level for this Lift:** {{{currentLevel}}}
        {{#if trendPercentage}}
        - **Calculated e1RM Trend Percentage:** {{{trendPercentage}}}%
        {{/if}}
        {{#if volumeTrendPercentage}}
        - **Calculated Volume Trend Percentage:** {{{volumeTrendPercentage}}}%
        {{/if}}
        
        **Workout History (Last 6 Weeks):**
        {{#each exerciseHistory}}
        - Date: {{this.date}}, Weight: {{this.weight}}, Sets: {{this.sets}}, Reps: {{this.reps}}
        {{/each}}

        **Your Task:**
        Your output MUST be a JSON object containing an 'insight' and a 'recommendation'. 
        
        **CRITICAL INSTRUCTIONS FOR YOUR COMMENTARY:**
        1.  **Analyze Session History First**: Your primary task is to analyze the session-by-session workout history to identify patterns. Look for things like a consistent increase followed by a decrease (which indicates a deload), a period of higher reps, or a switch to heavier, lower-rep sets. Your 'insight' must start by acknowledging these specific patterns from the history.
        2.  **Acknowledge Diverse Training Styles**: Do not automatically label fluctuating weights and reps as 'inconsistent' or 'a lack of focus'. Recognize that this can be a deliberate strategy (like undulating periodization). Especially for female lifters, frame these fluctuations as a potentially smart way to manage energy levels and recovery throughout a cycle.
        3.  **Synthesize Both Trends**: After analyzing the history, you **MUST** synthesize both the 'e1RM Trend' and the 'Volume Trend' in your 'insight'. Use their relationship to explain the user's progress. For example:
            - If e1RM is stagnant (+/- 2%) but Volume is increasing significantly (>+5%), this is a valid form of progressive overload. Frame this positively as building work capacity.
            - If e1RM is increasing but Volume is decreasing, this could indicate a shift to lower-rep, higher-intensity training, which you should confirm by looking at the session history.
            - If both are decreasing, and the history shows a recent drop-off, identify it as a potential deload and frame your recommendation accordingly.
        4.  **Incorporate Percentages**: You **MUST** incorporate the specific percentage values into your 'insight' to add quantitative context. For example, mention "a 15% increase in e1RM" or "a 5% decrease in volume".
        5.  **Tailor to Strength Level & User Profile**: Your commentary MUST be strictly tailored to the user's provided **Current Strength Level** and their **User Profile** (gender, age, goals).
            -   **For 'Beginner' or 'Intermediate' Lifts:** Focus recommendations on consistency, progressive overload, or form checks.
            -   **For 'Advanced' or 'Elite' Lifts:** A drop in volume might be a planned deload. Your recommendations can be more nuanced, focusing on variation, recovery, or post-deload strategy.
        6.  **Calibrate Your Tone to the Strength Level - CRITICAL**: Your interpretation of the trend percentages MUST be relative to the user's \`currentLevel\`.
            -   **For 'Beginner' or 'Intermediate' lifters:** Any significant e1RM or Volume increase (e.g., >10%) is **EXCELLENT progress**. YOU MUST use strong, positive, and enthusiastic language. A 20-30% increase is a HUGE improvement. It is a failure to call this 'slight' or 'modest'.
            -   **For 'Advanced' or 'Elite' lifters:** A smaller, steady increase (e.g., 2-5%) is a significant achievement. You can use more reserved but positive language, acknowledging the difficulty of making gains at a high level.
        7.  **Conditionally Incorporate Goals based on Relevance:** You may reference a user's fitness goal in your recommendation, but **ONLY** if that goal is **directly and biomechanically related** to the \`{{{exerciseName}}}\` currently being analyzed.
            -   **GOOD Example of Relevance:** If analyzing the 'Lat Pulldown' and the user's goal is to 'achieve 10 pull-ups', you SHOULD mention how improving their pulldown will help achieve that goal.
            -   **BAD Example of Relevance:** If analyzing the 'Adductor' and the user's goal is to 'achieve 10 pull-ups', you MUST NOT mention the pull-up goal. The two are not directly related.
            -   If none of the user's goals are directly relevant, your recommendation must focus exclusively on improving the \`{{{exerciseName}}}\` itself.

        **Your Response Fields:**
        1.  **insight**: A concise (1-2 sentences) explanation of what the trends and history mean, specifically for a lifter with the provided profile and at the provided **'Current Strength Level'**, incorporating the specific trend percentages.
        2.  **recommendation**: A single, clear, and actionable piece of advice for the user's next 2-3 weeks, tailored to their level, the combined trends, and any patterns (like a recent deload) identified from the history.
        `,
    });

    const { output } = await prompt({
        ...input,
        currentLevel: input.currentLevel || 'N/A',
        trendPercentage: input.trendPercentage ? input.trendPercentage.toFixed(1) : undefined,
        volumeTrendPercentage: input.volumeTrendPercentage ? input.volumeTrendPercentage.toFixed(1) : undefined,
        exerciseHistory: input.exerciseHistory.map(h => ({ ...h, date: new Date(h.date).toLocaleDateString() }))
    });
    
    if (!output) {
      throw new Error("AI failed to generate a response for the lift progression analysis.");
    }
    
    return output;
  }
);
