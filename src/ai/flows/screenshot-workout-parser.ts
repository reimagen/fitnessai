
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
  workoutDate: z.string().optional().describe('The date of the workout extracted from the screenshot, formatted as YYYY-MM-DD. If the year is not visible, infer the year based on the current date at the time of processing.'),
  exercises: z.array(
    z.object({
      name: z.string().describe('The name of the exercise. If the original name starts with "EGYM ", remove this prefix.'),
      sets: z.number().describe('The number of sets performed. For Cardio exercises, this should typically be 0 unless explicitly stated otherwise.'),
      reps: z.number().describe('The number of repetitions performed for each set. For Cardio exercises, this should typically be 0 unless explicitly stated otherwise.'),
      weight: z.number().describe('The weight used for each set. For Cardio exercises, this should typically be 0 unless explicitly stated otherwise.'),
      weightUnit: z.enum(['kg', 'lbs']).optional().describe('The unit of weight (kg or lbs). Defaults to kg if not specified and weight > 0.'),
      category: z.enum(['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other']).optional().describe('The category of the exercise. Must be one of: "Cardio", "Lower Body", "Upper Body", "Full Body", "Core", or "Other". Infer based on the exercise name if not explicitly stated.'),
      distance: z.number().optional().describe('The distance covered, if applicable (e.g., for running, cycling). For non-cardio exercises, this should be 0 unless explicitly stated.'),
      distanceUnit: z.enum(['mi', 'km', 'ft']).optional().describe('The unit of distance (mi, km, or ft).'),
      duration: z.number().optional().describe('The duration of the exercise, if applicable (e.g., in minutes or seconds). For non-cardio exercises, this should be 0 unless explicitly stated.'),
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
    *   If the year is not explicitly visible in the screenshot (e.g., "Mon, Jun 2"), infer the year based on the current date at the time of this processing. For example, if this processing occurs in 2024 and the image shows "Jun 2" without a year, the \\\`workoutDate\\\` should be "2024-06-02". If this processing occurs in 2025 and the image shows "Jun 2", it should be "2025-06-02".
2.  **Exercise Name**:
    *   Extract the name of the exercise.
    *   If an exercise name begins with "EGYM " (case-insensitive), remove this prefix. For example, "EGYM Leg Press" should become "Leg Press".
3.  **Exercise Category**:
    *   For each exercise, assign a category. The category MUST be one of the following: "Cardio", "Lower Body", "Upper Body", "Full Body", "Core", or "Other".
    *   Infer the category based on the exercise name. For example, "Bench Press" is "Upper Body", "Squats" is "Lower Body", "Running" is "Cardio", "Plank" is "Core". If it's a compound exercise like "Clean and Jerk", use "Full Body". If unsure or it doesn't fit (or a tag like "Endurance" is present for a cardio activity), use "Other" or infer "Cardio" as appropriate.
4.  **Specific Handling for "Cardio" Exercises**:
    *   If an exercise is categorized as "Cardio" (e.g., Treadmill, Running, Cycling, Elliptical):
        *   Prioritize extracting \\\`distance\\\`, \\\`distanceUnit\\\`, \\\`duration\\\`, \\\`durationUnit\\\`, and \\\`calories\\\`.
        *   For these "Cardio" exercises, \\\`sets\\\`, \\\`reps\\\`, and \\\`weight\\\` should be set to 0, *unless* the screenshot explicitly shows relevant values for these (which is rare for pure cardio). For example, "Treadmill 0:09:26 • 5383 ft • 96 cal" should result in: \\\`sets: 0, reps: 0, weight: 0, distance: 5383, distanceUnit: 'ft', duration: 566, durationUnit: 'sec', calories: 96\\\`.
        *   Do not mistake distance values (like "5383 ft") for \\\`reps\\\`.
5.  **Handling for Non-Cardio Exercises (Upper Body, Lower Body, Full Body, Core, Other)**:
    *   For these categories, prioritize extracting \\\`sets\\\`, \\\`reps\\\`, \\\`weight\\\`, \\\`weightUnit\\\`, and \\\`calories\\\`.
    *   \\\`distance\\\` and \\\`duration\\\` (and their units) should generally be 0 or omitted for these exercises, unless very clearly and explicitly stated as part of a strength training metric (which is rare).
6.  **Weight Unit**:
    *   Identify the unit of weight (e.g., kg or lbs).
    *   If you see "lbs00" or "kg00" in the screenshot, interpret this as "lbs" or "kg" respectively. The "00" is an artifact and not part of the unit.
    *   If the unit is not clearly visible or specified, default to 'kg' if there is a weight value greater than 0. If weight is 0, \\\`weightUnit\\\` can be omitted or kept as default.
7.  **Duration Parsing**:
    *   If duration is in a format like MM:SS (e.g., "0:09:26" for Treadmill), parse it into total seconds (e.g., 9 minutes * 60 + 26 seconds = 566 seconds, so \\\`duration: 566, durationUnit: 'sec'\\\`). If it's simpler (e.g., "30 min"), parse as is (\\\`duration: 30, durationUnit: 'min'\\\`).
8.  **Distance Unit**:
    *   Identify the unit of distance (e.g., km, mi, ft). Ensure 'ft' is recognized if present (e.g., "5383 ft" should be \\\`distance: 5383, distanceUnit: 'ft'\\\`).
9.  **Duplicate Exercises in Screenshot**:
    *   If an exercise (e.g., "Treadmill") appears *only once* in the screenshot, it MUST be listed *only once* in the output.
    *   If the exact same exercise (same name and all details like duration, distance, etc.) appears multiple times *within the same screenshot*, then list each instance as a separate exercise entry in the output. Do not attempt to aggregate them. (e.g. "EGYM Abductor" and "EGYM Adductor" are different exercises and should be listed separately if both appear).
10. **Other Fields (for non-Cardio exercises primarily)**:
    *   Extract \\\`sets\\\`, \\\`reps\\\`, and \\\`weight\\\`.
    *   Also extract \\\`calories\\\` if available.
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
      const modifiedExercises = output.exercises.map(ex => {
        let name = ex.name;
        if (name.toLowerCase().startsWith('egym ')) {
          name = name.substring(5);
        }
        
        let correctedWeightUnit: 'kg' | 'lbs' | undefined;

        if (typeof ex.weightUnit === 'string') {
            const rawUnit = ex.weightUnit.trim().toLowerCase();
            if (rawUnit === 'lbs00') {
                correctedWeightUnit = 'lbs';
            } else if (rawUnit === 'kg00') {
                correctedWeightUnit = 'kg';
            } else if (rawUnit === 'lbs' || rawUnit === 'kg') {
                correctedWeightUnit = rawUnit as 'kg' | 'lbs';
            } else {
                correctedWeightUnit = undefined; 
            }
        } else {
             correctedWeightUnit = undefined;
        }

        if (correctedWeightUnit === undefined) {
            if (ex.weight !== undefined && ex.weight > 0) {
                correctedWeightUnit = 'kg';
            }
        }


        let finalSets = ex.sets ?? 0;
        let finalReps = ex.reps ?? 0;
        let finalWeight = ex.weight ?? 0;
        let finalDistance = ex.distance ?? 0;
        let finalDuration = ex.duration ?? 0;
        let finalDistanceUnit = ex.distanceUnit;
        let finalDurationUnit = ex.durationUnit;

        if (ex.category === 'Cardio') {
            finalSets = 0; 
            finalReps = 0;
            finalWeight = 0;
            correctedWeightUnit = undefined; 
        } else { 
            finalDistance = 0; 
            finalDuration = 0;
            finalDistanceUnit = undefined; 
            finalDurationUnit = undefined; 
        }

        return {
          ...ex,
          name: name,
          weightUnit: correctedWeightUnit,
          sets: finalSets,
          reps: finalReps,
          weight: finalWeight,
          distance: finalDistance,
          distanceUnit: finalDistanceUnit,
          duration: finalDuration,
          durationUnit: finalDurationUnit,
        };
      });
      return {
        ...output,
        exercises: modifiedExercises,
      };
    }
    return output!;
  }
);

