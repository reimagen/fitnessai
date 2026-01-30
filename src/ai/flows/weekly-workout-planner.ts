
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
import { executePromptWithFallback } from '@/ai/utils';
import { DEFAULT_SAFETY_SETTINGS } from '@/ai/config';

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
1.  **Analyze Consistency First**: Your primary analytical task is to look at the 'Frequency per Exercise' and 'Weekly Cardio Summary' in the user's 'Workout History Summary'. Compare these frequencies and calorie burns to their 'Fitness Goals' and 'Weekly Cardio Goal' to evaluate their training consistency.
    *   For strength goals like "Build Muscle", check if they are training major compound lifts at least 8 times over the last 4 weeks (indicating a consistent 2x/week frequency).
    *   For cardio goals, check if their weekly calorie burn from the 'Weekly Cardio Summary' is consistently meeting or missing their 'Weekly Cardio Goal'.
2.  **Comment on Consistency**: In your introduction, you MUST comment on this analysis. If their frequency/cardio burn is aligned with their goals, provide encouragement. If it's too low, gently highlight this and explain how this new plan will help them achieve the necessary consistency.
3.  **Analyze Goal Proximity**: Briefly comment on how their current performance ('Personal Records & Strength Levels') positions them relative to their 'Fitness Goals'. Instead of restating the goal, comment on their progress towards it. For example, if a goal is to "Bench Press 200 lbs" and their PR is 185 lbs, you might say "You're very close to your bench press goal."
4.  **State This Week's Strategic Purpose**: Explain how this specific week's plan is strategically designed to bridge the gap towards their goals, correct any issues from the 'Strength Balance Analysis', and improve the consistency you analyzed.
5.  **Formatting**: After this introductory paragraph, you MUST insert one single empty blank line before the first day's heading (e.g., before **Sunday: Focus**).

**CRITICAL INSTRUCTIONS FOR PLAN DESIGN:**
Your primary directive is to create a plan that intelligently addresses the user's specific needs based on their **Strength Balance Analysis**, **Personal Record Strength Levels**, and **Workout History**.

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
    
3.  **Calculate Working Weights and Formatting - CRITICAL INSTRUCTION**:
    *   For any exercise that has a Personal Record (PR) listed in the user's context, you **MUST** calculate the suggested working weight as exactly **75% of the user's PR weight**. You **MUST NOT** use the PR weight as the working weight.
    *   You **MUST** round the final calculated weight to the nearest whole number.
    *   **CRITICAL FORMATTING**: Your final output for the weight **MUST** be in the format \`(XX lbs)\` or \`(XX kg)\`. DO NOT include the calculation details in the final plan.
        *   **CORRECT Example**: eGym Chest Press: 3 sets of 8-12 reps (88 lbs)
        *   **INCORRECT Example**: eGym Chest Press: 3 sets of 8-12 reps (75% of your PR, rounded to nearest whole number: 88 lbs)
    *   For exercises that do not have a PR, you must estimate an appropriate starting weight based on the user's overall profile, especially their experience level.
    
4.  **Incorporate User Preferences & Equipment - CRITICAL**: You **MUST** read the 'Additional Notes for AI' section of the user's profile context. If the user specifies particular equipment, injuries, or preferences (e.g., 'I use eGym machines', 'I have a knee injury', 'I only have dumbbells'), you **MUST** reflect this in your exercise selection and plan design.
    *   **Example**: If the user's notes mention 'eGym', you **MUST** prescribe exercises like 'eGym Chest Press', 'eGym Leg Press', etc., instead of their free-weight equivalents.
    *   **Example**: If the user mentions a 'knee injury', you must avoid high-impact leg exercises and suggest alternatives like swimming or stationary cycling.

5.  **Holistically Address ALL User Goals**: Your plan MUST be structured to make progress on **all** of the user's fitness goals, not just the primary one. The weekly schedule must provide sufficient training volume and frequency to make tangible progress on every goal listed in the context. For example:
    *   **Cardio Progression**: Analyze the 'Weekly Cardio Summary'. If the user has been consistently missing their goal, create a plan that gradually increases their cardio to meet it. If they have been consistently exceeding it, the plan can maintain or slightly increase the intensity to push towards their stretch goal.
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

Generate the weekly workout plan string as the 'weeklyPlan' field in the output.
`,
  config: {
    safetySettings: DEFAULT_SAFETY_SETTINGS,
  },
});

const weeklyWorkoutPlannerFlow = ai.defineFlow(
  {
    name: 'weeklyWorkoutPlannerFlow',
    inputSchema: WeeklyWorkoutPlanInputSchema,
    outputSchema: WeeklyWorkoutPlanOutputSchema,
  },
  async (input) => {
    const output = await executePromptWithFallback(
      weeklyWorkoutPlannerPrompt,
      input,
      { flowName: 'weeklyWorkoutPlanner' }
    );

    if (!output?.weeklyPlan) {
      throw new Error('AI failed to generate a weekly workout plan string.');
    }
    return output;
  }
);
