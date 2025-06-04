
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
    .describe('A personalized workout recommendation. This should start by acknowledging the primary fitness goal (if provided) and explaining how the plan helps achieve it. It should also address how the plan supports any other specified goals. Then, it should detail the full workout routine.'),
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
4.  **Structure**: Ensure the explanations flow naturally into the detailed workout plan.

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

