
'use server';

/**
 * @fileOverview Parses workout data from a screenshot.
 *
 * - parseWorkoutScreenshot - A function that handles the screenshot parsing process.
 * - ParseWorkoutScreenshotInput - The input type for the parseWorkoutScreenshot function.
 * - ParseWorkoutScreenshotOutput - The return type for the parseWorkoutScreenshot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseWorkoutScreenshotInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A screenshot of a workout log, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ParseWorkoutScreenshotInput = z.infer<typeof ParseWorkoutScreenshotInputSchema>;

const ParseWorkoutScreenshotOutputSchema = z.object({
  workoutDate: z.string().optional().describe('The date of the workout extracted from the screenshot, formatted as YYYY-MM-DD. If the year is not visible, assume the current year for the app context (e.g., 2025).'),
  exercises: z.array(
    z.object({
      name: z.string().describe('The name of the exercise. If the original name starts with "EGYM ", remove this prefix.'),
      sets: z.number().describe('The number of sets performed.'),
      reps: z.number().describe('The number of repetitions performed for each set.'),
      weight: z.number().describe('The weight used for each set.'),
      weightUnit: z.enum(['kg', 'lbs']).optional().describe('The unit of weight (kg or lbs). Defaults to kg if not specified.'),
      category: z.enum(['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other']).optional().describe('The category of the exercise. Must be one of: "Cardio", "Lower Body", "Upper Body", "Full Body", "Core", or "Other". Infer based on the exercise name if not explicitly stated.'),
      distance: z.number().optional().describe('The distance covered, if applicable (e.g., for running, cycling).'),
      distanceUnit: z.enum(['mi', 'km']).optional().describe('The unit of distance (mi or km).'),
      duration: z.number().optional().describe('The duration of the exercise, if applicable (e.g., in minutes or seconds).'),
      durationUnit: z.enum(['min', 'hr', 'sec']).optional().describe('The unit of duration (min, hr, or sec).'),
      calories: z.number().optional().describe('The number of calories burned.'),
    })
  ).describe('A list of exercises parsed from the screenshot, with details about sets, reps, weight, weight unit, category, distance, duration, and calories.'),
});
export type ParseWorkoutScreenshotOutput = z.infer<typeof ParseWorkoutScreenshotOutputSchema>;

export async function parseWorkoutScreenshot(input: ParseWorkoutScreenshotInput): Promise<ParseWorkoutScreenshotOutput> {
  return parseWorkoutScreenshotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseWorkoutScreenshotPrompt',
  input: {schema: ParseWorkoutScreenshotInputSchema},
  output: {schema: ParseWorkoutScreenshotOutputSchema},
  prompt: `You are an expert in parsing workout data from screenshots.

You will be provided with a screenshot of a workout log.
Your goal is to extract the workout date and exercise data from the screenshot and return it in a structured JSON format.

Key Instructions:
1.  **Workout Date**:
    *   Extract the date of the workout from the screenshot. If a year is explicitly present in the screenshot (e.g., "June 2, 2024"), use that year.
    *   Format this date as YYYY-MM-DD.
    *   If the year is not explicitly visible in the screenshot (e.g., "Mon, Jun 2"), assume the current year for the app's context is 2025. For example, if the app's context year is 2025 and the image says "Jun 2" without a year, the workoutDate should be "2025-06-02".
2.  **Exercise Name**:
    *   Extract the name of the exercise.
    *   If an exercise name begins with "EGYM " (case-insensitive), remove this prefix. For example, "EGYM Leg Press" should become "Leg Press".
3.  **Exercise Category**:
    *   For each exercise, assign a category. The category MUST be one of the following: "Cardio", "Lower Body", "Upper Body", "Full Body", "Core", or "Other".
    *   Infer the category based on the exercise name. For example, "Bench Press" is "Upper Body", "Squats" is "Lower Body", "Running" is "Cardio", "Plank" is "Core". If it's a compound exercise like "Clean and Jerk", use "Full Body". If unsure or it doesn't fit, use "Other".
4.  **Weight Unit**:
    *   Identify the unit of weight (e.g., kg or lbs). If the unit is not clearly visible or specified, default to 'kg'.
5.  **Other Fields**:
    *   Extract sets, reps, and weight.
    *   Also extract distance, distanceUnit, duration, durationUnit, and calories if available.
    *   If a value for distance, duration, or calories is explicitly shown as '-' or 'N/A' in the screenshot, do not include that field in the output for that exercise.

Here is the screenshot:
{{media url=photoDataUri}}
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const parseWorkoutScreenshotFlow = ai.defineFlow(
  {
    name: 'parseWorkoutScreenshotFlow',
    inputSchema: ParseWorkoutScreenshotInputSchema,
    outputSchema: ParseWorkoutScreenshotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output && output.exercises) {
      output.exercises = output.exercises.map(ex => {
        let name = ex.name;
        if (name.toLowerCase().startsWith('egym ')) {
          name = name.substring(5);
        }
        return {
          ...ex,
          name: name,
          weightUnit: ex.weightUnit || 'kg'
        };
      });
    }
    return output!;
  }
);

