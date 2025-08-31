
'use server';
/**
 * @fileOverview Generates a personalized weekly workout plan.
 *
 * - generateWeeklyWorkoutPlan - A function that creates a weekly workout plan.
 * - WeeklyWorkoutPlanInput - The input type for the generateWeeklyWorkoutPlan function.
 * - WeeklyWorkoutPlanOutput - The return type for the generateWeeklyWorkoutPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WeeklyWorkoutPlanInputSchema = z.object({
  userId: z.string().describe('The unique identifier for the user.'),
  userProfileContext: z.string().describe('A comprehensive string containing the user\'s fitness goals, workout history, personal statistics (age, gender, height, weight), personal records with strength levels, and strength balance analysis results to be used for the workout plan.'),
  weekStartDate: z.string().optional().describe('The start date of the week for which the plan is being generated, preferably a Sunday, formatted as YYYY-MM-DD. This helps contextualize the plan for a specific week if needed.'),
});
export type WeeklyWorkoutPlanInput = z.infer<typeof WeeklyWorkoutPlanInputSchema>;

const WeeklyWorkoutPlanOutputSchema = z.object({
  weeklyPlan: z.string().describe("The detailed weekly workout plan, formatted as a single string. The plan should cover Sunday through Saturday, with daily breakdowns including exercises, sets, reps, weight, rest periods, warm-up, and cool-down routines. NO lines in the output should begin with markdown list markers like '*' or '-'."),
});
export type WeeklyWorkoutPlanOutput = z.infer<typeof WeeklyWorkoutPlanOutputSchema>;

export async function generateWeeklyWorkoutPlan(input: WeeklyWorkoutPlanInput): Promise<WeeklyWorkoutPlanOutput> {
  return weeklyWorkoutPlannerFlow(input);
}

const weeklyWorkoutPlannerPrompt = ai.definePrompt({
  name: 'weeklyWorkoutPlannerPrompt',
  input: {schema: WeeklyWorkoutPlanInputSchema},
  output: {schema: WeeklyWorkoutPlanOutputSchema},
  prompt: `You are an expert fitness coach. Your task is to generate a comprehensive, personalized, and actionable **full weekly workout plan** for a user, covering Sunday through Saturday.

Use the following user information to tailor the plan:
User ID: {{{userId}}}
User Profile Context: {{{userProfileContext}}}

The plan should start on Sunday{{#if weekStartDate}} (for the week beginning {{weekStartDate}}){{/if}} and continue through Saturday.

**REQUIREMENT: Introductory Analysis**
Before generating the daily breakdown, you MUST start the plan with a brief, motivating introductory paragraph (2-4 sentences). This paragraph MUST:
1.  **Analyze Past Performance & Goal Proximity**: Briefly comment on the user's recent activity ('Workout History Summary') and analyze how their current performance ('Personal Records & Strength Levels') positions them relative to their 'Fitness Goals'. Instead of restating the goal, comment on their progress towards it. For example, if a goal is to "Bench Press 200 lbs" and their PR is 185 lbs, you might say "You're very close to your bench press goal."
2.  **State This Week's Strategic Purpose**: Explain how this specific week's plan is strategically designed to bridge the gap towards their goals and correct any issues from the 'Strength Balance Analysis'. For instance, explain *why* certain exercises are included.
3.  **Formatting**: After this introductory paragraph, you MUST insert one single empty blank line before the first day's heading (e.g., before **Sunday: Focus**).

**CRITICAL INSTRUCTIONS FOR PLAN DESIGN:**
Your primary directive is to create a plan that intelligently addresses the user's specific needs based on their **Strength Balance Analysis** and **Personal Record Strength Levels**.

1.  **Address Imbalances First**:
    *   If the "Strength Balance Analysis Summary" shows any findings (e.g., "Ratio Imbalance" or "Level Imbalance"), your plan **MUST** prioritize correcting these issues.
    *   For a **Ratio Imbalance**, increase the volume (sets/reps) or frequency for the weaker lift in the pair. For example, if a "Horizontal Push vs. Pull" imbalance exists where push is stronger, the plan should include more pulling exercises like rows.
    *   For a **Level Imbalance**, focus on bringing the weaker lift (e.g., 'Beginner') up to the level of the stronger lift (e.g., 'Intermediate'). The workout descriptions should reflect this focus.

2.  **Drive Progression for Balanced Lifts**:
    *   If the user's lifts are balanced, or for pairs of lifts that are already balanced, design the plan to help them progress to the next strength level.
    *   Reference the "Personal Records & Strength Levels" section.
    *   For lifts at the **'Beginner'** level, prescribe moderate weights and emphasize mastering proper form.
    *   For lifts at the **'Intermediate'** level, incorporate principles of progressive overload. Suggest specific, small increases in weight or reps (e.g., "This week, aim to add 5 lbs to your squat").
    *   For lifts at the **'Advanced'** or **'Elite'** level, you can maintain current strength or introduce more complex training variations if it aligns with the user's goals.
    
3.  **Calculate Working Weights from PRs - CRITICAL SAFETY INSTRUCTION**:
    *   For any exercise that has a Personal Record (PR) listed in the user's context, you **MUST NOT** use the PR weight as the recommended working weight. This is unsafe.
    *   Instead, you **MUST** calculate the suggested working weight as exactly **75% of the user's PR weight** for that exercise.
    *   For exercises that do not have a PR, you should estimate an appropriate starting weight based on the user's overall profile, especially their experience level.

4.  **Holistically Address ALL User Goals**: Your plan MUST be structured to make progress on **all** of the user's fitness goals, not just the primary one. The weekly schedule must provide sufficient training volume and frequency to make tangible progress on every goal listed in the context. For example:
    *   If a goal is "run 5 miles per week," the plan must include enough running sessions (e.g., 2-3 times a week) to logically reach that mileage.
    *   If a goal is "increase flexibility," the cool-down sections should be more extensive, or a dedicated mobility day should be included.
    *   You must balance the recommendations from the strength analysis with the requirements of these other goals.

After analyzing and designing the plan based on the above, generate the full weekly plan as described in the "Key Requirements for Formatting" below.

**Key Requirements for Formatting:**

1.  **Structure**: The output MUST be a single string containing the entire week's plan.
2.  **Daily Breakdown**: For each day (Sunday to Saturday), provide a detailed workout session. If a rest day is appropriate, clearly state "Rest Day" for that day's entry, and no further details like warm-up/cool-down are needed for that specific rest day.
3.  **Visual Separation Between Days**: CRITICAL: After all content for one day is complete, you MUST output one single empty blank line BEFORE starting the next day's heading.
4.  **Detailed Workout Session Structure and Formatting**:
    For *each* individual workout day, you MUST structure it clearly with the following components in order.
    CRITICAL: NO lines in the output should begin with markdown list markers such as '*' or '-'.
    *   **Day Heading**: Each day's section MUST start with the day of the week and a brief focus, both bolded. For example: **Sunday: Full Body Strength & Imbalance Correction**.
    *   **Warm-up Section**: Must begin with **Warm-up:**
    *   **Main Workout Section**: Must begin with **Main Workout:**. List exercises, sets/reps, and rest periods on separate lines.
    *   **Cool-down Section**: Must begin with **Cool-down:**
5.  **Safety Reminder**: Include a brief, general safety reminder at the very end of the entire weekly plan. The heading MUST be bolded. For example: **A general safety reminder:**
6.  **Disclaimer on Weights - MANDATORY**: After the safety reminder, you MUST add a final section. It must start with the heading **A Note on Weights:** (bolded) and be followed by this exact text: "Suggested weights for exercises with a logged Personal Record (PR) are calculated at 75% of your PR. For other exercises, weights are estimated based on your general profile. Keep your PRs updated for the most accurate recommendations."

Generate the weekly workout plan string as the 'weeklyPlan' field in the output.
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  },
});

const FALLBACK_MODEL = 'googleai/gemini-1.5-pro-latest';

const weeklyWorkoutPlannerFlow = ai.defineFlow(
  {
    name: 'weeklyWorkoutPlannerFlow',
    inputSchema: WeeklyWorkoutPlanInputSchema,
    outputSchema: WeeklyWorkoutPlanOutputSchema,
  },
  async (input) => {
    let result;
    try {
      // Try with the default flash model first
      result = await weeklyWorkoutPlannerPrompt(input);
    } catch (e: any) {
      // If it fails with a 503-style error, try the pro model as a fallback
      if (e.message?.includes('503') || e.message?.toLowerCase().includes('overloaded') || e.message?.toLowerCase().includes('unavailable')) {
        console.log(`Default model unavailable, trying fallback: ${FALLBACK_MODEL}`);
        result = await weeklyWorkoutPlannerPrompt(input, { model: FALLBACK_MODEL });
      } else {
        // Re-throw other errors
        throw e;
      }
    }
    
    const {output} = result;
    if (!output?.weeklyPlan) {
      throw new Error('AI failed to generate a weekly workout plan string.');
    }
    return output;
  }
);
