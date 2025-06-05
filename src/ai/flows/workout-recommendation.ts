
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
    .describe('A personalized workout recommendation. This should start by acknowledging the primary fitness goal (if provided) and explaining how the plan helps achieve it. It should also address how the plan supports any other specified goals. Then, it should detail the full workout routine. Each workout session (e.g., for Sunday, Monday, etc.) MUST include a Warm-up, the Main Workout, and a Cool-down, with days ordered from Sunday to Saturday. The "Warm-up:", "Main Workout:", and "Cool-down:" lines themselves should be bold (e.g., "**Warm-up:**") and should NOT start with a list marker (* or -). Exercises listed under "Main Workout:" SHOULD start with a list marker (* or -).'),
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
5.  **Detailed Workout Session Structure and Formatting**: For *each* individual workout day or session detailed in the plan, you MUST structure it clearly with the following three components in order:
    *   **Warm-up**: Start this section with a line formatted exactly as "**Warm-up:**" (bolded, no preceding list marker like '*' or '-'). Follow this with the specific warm-up routine (e.g., 5-10 minutes of light cardio like jogging in place or jumping jacks, followed by dynamic stretches relevant to the upcoming workout like arm circles, leg swings, torso twists).
    *   **Main Workout**: Start this section with a line formatted exactly as "**Main Workout:**" (bolded, no preceding list marker). Follow this by listing the exercises. Each exercise in this list MUST begin with a list marker, specifically "* " (an asterisk followed by a space). Include sets, reps, rest times, and any other relevant details for that specific session.
    *   **Cool-down**: Start this section with a line formatted exactly as "**Cool-down:**" (bolded, no preceding list marker). Follow this with the specific cool-down routine (e.g., 5-10 minutes of light activity like walking, followed by static stretches for the muscles worked).
    Ensure this Warm-up / Main Workout / Cool-down sequence and formatting is explicitly presented for every distinct workout session in the week.
6.  **Overall Structure**: Ensure the explanations flow naturally into the detailed workout plan and that the entire response is coherent and easy to follow.

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

