
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
3.  **Provide Full Workout Plan**: After the goal explanations, present the comprehensive workout recommendation.
4.  **Day Order**: Structure the weekly plan with days listed in order from **Sunday to Saturday**.
5.  **Visual Separation Between Days**: CRITICAL: After all content for one day (including its cool-down description) is complete, you MUST output one single empty blank line BEFORE starting the next day's heading. For example, if the next day is Monday, its heading would be "**Monday: ...**" and there should be a blank line above it. This means there will be two newline characters between the end of one day's content and the start of the next day's heading.
6.  **Detailed Workout Session Structure and Formatting**: For *each* workout day, you MUST follow this structure precisely:

    **Day Heading Line**: This line should be bold, for example, it should look like "**Sunday: Focus**".
    This line MUST NOT start with \`*\` or \`-\`. It is NOT a list item.

    **Warm-up Section Heading**: This line must be bold and appear exactly as "**Warm-up:**".
    This line MUST NOT start with \`*\` or \`-\`. It is NOT a list item.
    Follow this with a paragraph describing the warm-up.

    **Main Workout Section Heading**: This line must be bold and appear exactly as "**Main Workout:**".
    This line MUST NOT start with \`*\` or \`-\`. It is NOT a list item.
    Follow this with a list of exercises. Each exercise line MUST start with \`* \` (an asterisk and a space). For example, an exercise line should look like "* Bench Press: 3 sets of 8-10 reps".

    **Cool-down Section Heading**: This line must be bold and appear exactly as "**Cool-down:**".
    This line MUST NOT start with \`*\` or \`-\`. It is NOT a list item.
    Follow this with a paragraph describing the cool-down.

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
    if (!output || !output.workoutRecommendation) {
      console.error('AI failed to generate a valid workout recommendation string.');
      throw new Error('AI failed to produce a workout recommendation.');
    }
    return output;
  }
);

