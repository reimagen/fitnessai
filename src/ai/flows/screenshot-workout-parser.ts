
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
  exercises: z.array(
    z.object({
      name: z.string().describe('The name of the exercise.'),
      sets: z.number().describe('The number of sets performed.'),
      reps: z.number().describe('The number of repetitions performed for each set.'),
      weight: z.number().describe('The weight used for each set.'),
      weightUnit: z.enum(['kg', 'lbs']).optional().describe('The unit of weight (kg or lbs). Defaults to kg if not specified.'),
    })
  ).describe('A list of exercises parsed from the screenshot, with details about sets, reps, weight, and weight unit.'),
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
Your goal is to extract the exercise data from the screenshot and return it in a structured JSON format.

Here is the screenshot:
{{media url=photoDataUri}}

Return the exercises with name, sets, reps, weight, and the unit of weight (e.g., kg or lbs). If the unit is not clearly visible or specified, default to 'kg'.
`,config: {
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
    // Post-process to ensure weightUnit defaults to 'kg' if undefined by the model
    if (output && output.exercises) {
      output.exercises = output.exercises.map(ex => ({
        ...ex,
        weightUnit: ex.weightUnit || 'kg'
      }));
    }
    return output!;
  }
);

