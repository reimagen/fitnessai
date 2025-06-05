
// src/ai/flows/workout-recommendation.ts
'use server';

/**
 * @fileOverview A workout recommendation AI agent.
 *
 * - workoutRecommendation - A function that handles the workout recommendation process.
 * - WorkoutRecommendationInput - The input type for the workoutRecommendation function.
 * - WorkoutRecommendationOutput - The return type for the workoutRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const WorkoutRecommendationInputSchema = z.object({
  fitnessGoals: z
    .string()
    .describe('The fitness goals of the user (e.g., "Primary Goal: weight loss. Other goals: muscle gain, improved endurance").'),
  workoutHistory: z
    .string()
    .describe('A summary of the users workout history, including types of exercises, frequency, and duration.'),
  personalStats: z
    .string()
    .describe('The users personal stats, including age, gender, weight, height, and any relevant medical conditions or preferences.'),
});
export type WorkoutRecommendationInput = z.infer<typeof WorkoutRecommendationInputSchema>;

const WorkoutRecommendationOutputSchema = z.object({
  workoutRecommendation: z
    .string()
    .describe('A personalized workout recommendation. This should start by acknowledging the primary fitness goal (if provided) and explaining how the plan helps achieve it. It should also address how the plan supports any other specified goals. Then, it should detail the full workout routine. Each workout day MUST have its own Warm-up, Main Workout, and Cool-down sections. Day headings (e.g., "**Sunday: Focus**") and section headings (e.g., "**Warm-up:**") MUST be bold and NOT start with list markers. Exercises under "Main Workout:" MUST start with list markers. Days should be ordered Sunday to Saturday, with a blank line separating each day.'),
});
export type WorkoutRecommendationOutput = z.infer<typeof WorkoutRecommendationOutputSchema>;

export async function workoutRecommendation(input: WorkoutRecommendationInput): Promise<WorkoutRecommendationOutput> {
  return workoutRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'workoutRecommendationPrompt',
  input: {schema: WorkoutRecommendationInputSchema},
  output: {schema: WorkoutRecommendationOutputSchema},
  prompt: `You are an expert personal trainer. Your task is to provide a personalized workout recommendation based on the user's information.

User Information:
Fitness Goals: {{{fitnessGoals}}}
Workout History: {{{workoutHistory}}}
Personal Stats: {{{personalStats}}}

Instructions for your response:
1.  **Acknowledge and Prioritize Primary Goal**: If a "Primary Goal" is specified in the "Fitness Goals", begin your recommendation by acknowledging it. Clearly explain how the key components or overall strategy of your recommended workout plan will directly help the user achieve this primary goal. Be specific.
2.  **Address Additional Goals**: If other goals are specified (e.g., in "Other goals: ..."), after addressing the primary goal, briefly explain how the workout plan also supports these additional goals.
3.  **Provide Full Workout Plan**: After the explanations for the primary and any additional goals, present the comprehensive workout recommendation. This plan should be well-rounded, actionable, and consider all goals, workout history, and personal stats provided.
4.  **Day Order**: Structure the weekly plan with days listed in order from **Sunday to Saturday**.
5.  **Visual Separation Between Days**: CRITICAL: After all content for one day (including its cool-down description) is complete, you MUST output one single empty blank line BEFORE starting the next day's heading (e.g., \\\`**Monday: ...**\\\`). This means there will be two newline characters between the end of one day's content and the start of the next day's heading.
6.  **Detailed Workout Session Structure and Formatting**: For *each* individual workout day or session detailed in the plan, you MUST structure it clearly with the following components, IN THIS ORDER:

    A.  **Day Heading**:
        The line for the day (e.g., \\\`**Sunday: Upper Body Strength**\\\`) MUST be bold.
        IMPORTANT: This Day Heading line MUST NOT start with an asterisk (\`*\`), hyphen (\`-\`), or any other list marker.

    B.  **Warm-up Section**:
        The line \`**Warm-up:**\` (exactly this text, bolded) MUST be the start of this section.
        IMPORTANT: This \`**Warm-up:**\` line MUST NOT start with an asterisk (\`*\`), hyphen (\`-\`), or any other list marker.
        The warm-up description should follow on subsequent lines as plain text paragraphs.

    C.  **Main Workout Section**:
        The line \`**Main Workout:**\` (exactly this text, bolded) MUST be the start of this section.
        IMPORTANT: This \`**Main Workout:**\` line MUST NOT start with an asterisk (\`*\`), hyphen (\`-\`), or any other list marker.
        Exercises listed under this section MUST be formatted as a list. Each exercise line MUST start with an asterisk followed by a space (\`* \`). For example: \\\`* Bench Press: 3 sets of 8-10 reps\\\`.

    D.  **Cool-down Section**:
        The line \`**Cool-down:**\` (exactly this text, bolded) MUST be the start of this section.
        IMPORTANT: This \`**Cool-down:**\` line MUST NOT start with an asterisk (\`*\`), hyphen (\`-\`), or any other list marker.
        The cool-down description should follow on subsequent lines as plain text paragraphs.

7.  **Overall Structure**: Ensure the explanations flow naturally into the detailed workout plan and that the entire response is coherent and easy to follow.

Workout Recommendation:`,
});

const workoutRecommendationFlow = ai.defineFlow(
  {
    name: 'workoutRecommendationFlow',
    inputSchema: WorkoutRecommendationInputSchema,
    outputSchema: WorkoutRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

