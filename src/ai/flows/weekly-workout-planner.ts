
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
  weeklyPlan: z.string().describe('The detailed weekly workout plan, formatted as a single string. The plan should cover Sunday through Saturday, with daily breakdowns including exercises, sets, reps, rest periods, warm-up, and cool-down routines.'),
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

**Key Requirements for the Weekly Plan:**

1.  **Structure**: The output MUST be a single string containing the entire week's plan.
2.  **Daily Breakdown**: For each day (Sunday to Saturday), provide a detailed workout session. If a rest day is appropriate, clearly state "Rest Day" for that day's entry, and no further details like warm-up/cool-down are needed for that specific rest day.
3.  **Visual Separation Between Days**: CRITICAL: After all content for one day (including its cool-down description, or "Rest Day" note) is complete, you MUST output one single empty blank line BEFORE starting the next day's heading (e.g., before **Monday: Focus**). This means there will be two newline characters between the end of one day's content and the start of the next day's heading.
4.  **Detailed Workout Session Structure and Formatting**:
    For *each* individual workout day or session detailed in the plan (not rest days), you MUST structure it clearly with the following components in order. The main section headings (Day Heading, Warm-up, Main Workout, Cool-down) MUST NOT start with markdown list markers (\`*\` or \`-\`).
    *   **Day Heading**: Each day's section MUST start with the day of the week and a brief focus, both bolded. For example: **Sunday: Full Body Strength**. This line MUST NOT begin with \`*\` or \`-\`.
    *   **Warm-up Section**:
        *   This section MUST begin with the exact bolded heading: **Warm-up:**
        *   This heading line itself (i.e., "**Warm-up:**") MUST NOT begin with \`*\` or \`-\`.
        *   List 2-3 dynamic warm-up exercises under this heading. Each individual warm-up exercise in this list SHOULD start with \`* \` (an asterisk followed by a space).
    *   **Main Workout Section**:
        *   This section MUST begin with the exact bolded heading: **Main Workout:**
        *   This heading line itself (i.e., "**Main Workout:**") MUST NOT begin with \`*\` or \`-\`.
        *   List the exercises for the main workout. Each individual exercise in this list MUST start with \`* \` (an asterisk followed by a space).
        *   For each exercise, specify sets, reps (or duration for cardio/timed exercises), and recommended weight/intensity if applicable (e.g., * Squats: 3 sets of 8-12 reps).
        *   Include rest periods between sets or exercises where appropriate, also as a list item starting with \`* \` (e.g., * Rest: 60-90 seconds between sets).
    *   **Cool-down Section**:
        *   This section MUST begin with the exact bolded heading: **Cool-down:**
        *   This heading line itself (i.e., "**Cool-down:**") MUST NOT begin with \`*\` or \`-\`.
        *   List 2-3 static stretches under this heading. Each individual cool-down stretch in this list SHOULD start with \`* \` (an asterisk followed by a space).
5.  **Exercise Variety**: Include a mix of exercises targeting different muscle groups throughout the week, aligned with the user's goals and preferences from their profile context.
6.  **Progressive Overload**: Where appropriate, include notes or suggestions for progressive overload (e.g., "Aim to increase weight or reps next week if this felt manageable"). This can be a general note at the end of the plan or integrated into specific days/exercises.
7.  **Clarity and Actionability**: The plan should be easy to understand and follow. Use clear, concise language.
8.  **Safety**: Optionally, include a brief, general safety reminder at the very end of the entire weekly plan, such as "Remember to listen to your body, maintain proper form, and consult a healthcare professional if you have any concerns."

Generate the weekly workout plan string as the 'weeklyPlan' field in the output.
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' }, // Adjusted this line
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

