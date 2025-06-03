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
    .describe('The fitness goals of the user (e.g., weight loss, muscle gain, improved endurance).'),
  workoutHistory: z
    .string()
    .describe('A summary of the users workout history, including types of exercises, frequency, and duration.'),
  personalStats: z
    .string()
    .describe('The users personal stats, including age, gender, weight, height, and any relevant medical conditions.'),
});
export type WorkoutRecommendationInput = z.infer<typeof WorkoutRecommendationInputSchema>;

const WorkoutRecommendationOutputSchema = z.object({
  workoutRecommendation: z
    .string()
    .describe('A personalized workout recommendation based on the users fitness goals, workout history, and personal stats.'),
});
export type WorkoutRecommendationOutput = z.infer<typeof WorkoutRecommendationOutputSchema>;

export async function workoutRecommendation(input: WorkoutRecommendationInput): Promise<WorkoutRecommendationOutput> {
  return workoutRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'workoutRecommendationPrompt',
  input: {schema: WorkoutRecommendationInputSchema},
  output: {schema: WorkoutRecommendationOutputSchema},
  prompt: `You are a personal trainer. You will provide a workout recommendation based on the users fitness goals, workout history, and personal stats.

Fitness Goals: {{{fitnessGoals}}}
Workout History: {{{workoutHistory}}}
Personal Stats: {{{personalStats}}}

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
