
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
  userProfileContext: z.string().describe('A comprehensive string containing the user\'s fitness goals, workout history, personal statistics (age, gender, height, weight), and any specific preferences or constraints for the workout plan.'),
  weekStartDate: z.string().optional().describe('The start date of the week for which the plan is being generated, preferably a Sunday, formatted as YYYY-MM-DD. This helps contextualize the plan for a specific week if needed.'),
});
export type WeeklyWorkoutPlanInput = z.infer<typeof WeeklyWorkoutPlanInputSchema>;

const WeeklyWorkoutPlanOutputSchema = z.object({
  weeklyPlan: z.string().describe("The detailed weekly workout plan, formatted as a single string. The plan should cover Sunday through Saturday, with daily breakdowns including exercises, sets, reps, rest periods, warm-up, and cool-down routines. NO lines in the output should begin with markdown list markers like '*' or '-'."),
});
export type WeeklyWorkoutPlanOutput = z.infer<typeof WeeklyWorkoutPlanOutputSchema>;

export async function generateWeeklyWorkoutPlan(input: WeeklyWorkoutPlanInput): Promise<WeeklyWorkoutPlanOutput> {
  return weeklyWorkoutPlannerFlow(input);
}

const weeklyWorkoutPlannerPrompt = ai.definePrompt({
  name: 'weeklyWorkoutPlannerPrompt',
  input: {schema: WeeklyWorkoutPlanInputSchema},
  output: {schema: WeeklyWorkoutPlanOutputSchema},
  prompt: `You are an expert fitness coach and AI assistant. Your task is to generate a comprehensive, personalized, and actionable **full weekly workout plan** for a user, covering Sunday through Saturday.

Use the following user information to tailor the plan:
User ID: {{{userId}}}
User Profile Context: {{{userProfileContext}}}

The plan should start on Sunday{{#if weekStartDate}} (for the week beginning {{weekStartDate}}){{/if}} and continue through Saturday.

**NEW REQUIREMENT: Introductory Analysis**
Before generating the daily breakdown, you MUST start the plan with a brief introductory paragraph (2-4 sentences). This paragraph MUST:
1.  **Analyze Past Performance**: Briefly comment on the user's recent activity based on their 'Workout History Summary' in the provided context. For example, mention their consistency or focus areas.
2.  **State This Week's Purpose**: Explicitly connect this week's plan to the user's primary 'Fitness Goal'. Explain how the upcoming workouts will help them progress towards that goal.
3.  **Formatting**: After this introductory paragraph, you MUST insert one single empty blank line before the first day's heading (e.g., before **Sunday: Focus**).

After writing the introduction, proceed with generating the full weekly workout plan as described in the "Key Requirements" below.

**Key Requirements for the Weekly Plan:**

1.  **Structure**: The output MUST be a single string containing the entire week's plan.
2.  **Daily Breakdown**: For each day (Sunday to Saturday), provide a detailed workout session. If a rest day is appropriate, clearly state "Rest Day" for that day's entry, and no further details like warm-up/cool-down are needed for that specific rest day.
3.  **Visual Separation Between Days**: CRITICAL: After all content for one day (including its cool-down description, or "Rest Day" note) is complete, you MUST output one single empty blank line BEFORE starting the next day's heading (e.g., before **Monday: Focus**). This means there will be two newline characters between the end of one day's content and the start of the next day's heading.
4.  **Detailed Workout Session Structure and Formatting**:
    For *each* individual workout day or session detailed in the plan (not rest days), you MUST structure it clearly with the following components in order.
    CRITICAL: NO lines in the output should begin with markdown list markers such as '*' or '-'. Each piece of information (exercise name, sets/reps, rest periods, etc.) should be on its own line.
    *   **Day Heading**: Each day's section MUST start with the day of the week and a brief focus, both bolded. For example: **Sunday: Full Body Strength**. This line MUST NOT begin with any list marker.
    *   **Warm-up Section**:
        *   This section MUST begin with the exact bolded heading: **Warm-up:**
        *   This heading line itself (i.e., "**Warm-up:**") MUST NOT begin with any list marker.
        *   List 2-3 dynamic warm-up exercises under this heading. Each exercise description should be on its own line and MUST NOT begin with any list marker.
    *   **Main Workout Section**:
        *   This section MUST begin with the exact bolded heading: **Main Workout:**
        *   This heading line itself (i.e., "**Main Workout:**") MUST NOT begin with any list marker.
        *   List the exercises for the main workout. Each exercise, its sets/reps, and any rest periods should be on separate lines. For example:
            Squats
            3 sets of 8-12 reps
            Rest: 60-90 seconds between sets
        *   NO lines in this section (exercise names, sets/reps, rest details) should begin with any list marker.
    *   **Cool-down Section**:
        *   This section MUST begin with the exact bolded heading: **Cool-down:**
        *   This heading line itself (i.e., "**Cool-down:**") MUST NOT begin with any list marker.
        *   List 2-3 static stretches under this heading. Each stretch description should be on its own line and MUST NOT begin with any list marker.
5.  **Exercise Variety**: Include a mix of exercises targeting different muscle groups throughout the week, aligned with the user's goals and preferences from their profile context.
6.  **Progressive Overload**: Where appropriate, include notes or suggestions for progressive overload (e.g., "Aim to increase weight or reps next week if this felt manageable"). This can be a general note at the end of the plan or integrated into specific days/exercises. It should NOT start with a list marker.
7.  **Clarity and Actionability**: The plan should be easy to understand and follow. Use clear, concise language.
8.  **Safety**: Optionally, include a brief, general safety reminder at the very end of the entire weekly plan, such as "Remember to listen to your body, maintain proper form, and consult a healthcare professional if you have any concerns." This line should NOT start with a list marker.

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

const weeklyWorkoutPlannerFlow = ai.defineFlow(
  {
    name: 'weeklyWorkoutPlannerFlow',
    inputSchema: WeeklyWorkoutPlanInputSchema,
    outputSchema: WeeklyWorkoutPlanOutputSchema,
  },
  async (input) => {
    const {output} = await weeklyWorkoutPlannerPrompt(input);
    if (!output?.weeklyPlan) {
      throw new Error('AI failed to generate a weekly workout plan string.');
    }
    return output;
  }
);
