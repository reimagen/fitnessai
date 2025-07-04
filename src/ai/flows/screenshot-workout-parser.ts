
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
  workoutDate: z.string().optional().describe("The date of the workout extracted from the screenshot, formatted as YYYY-MM-DD. You MUST use the year 2025. If no date (month and day) is found, omit this field."),
  exercises: z.array(
    z.object({
      name: z.string().describe('The name of the exercise. If the original name starts with "EGYM ", remove this prefix.'),
      sets: z.number().describe('The number of sets performed. For Cardio exercises, this should typically be 0 unless explicitly stated otherwise.'),
      reps: z.number().describe('The number of repetitions performed for each set. For Cardio exercises, this should typically be 0 unless explicitly stated otherwise.'),
      weight: z.number().describe('The weight used for each set. For Cardio exercises, this should typically be 0 unless explicitly stated otherwise.'),
      weightUnit: z.enum(['kg', 'lbs']).optional().describe('The unit of weight (kg or lbs). Defaults to kg if not specified and weight > 0.'),
      category: z.enum(['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other'])
                .describe('The category of the exercise. Must be one of: "Cardio", "Lower Body", "Upper Body", "Full Body", "Core", or "Other". Infer based on the exercise name. If truly unsure or it doesn\'t fit standard categories, default to "Other".'),
      distance: z.number().optional().describe('The distance covered, if applicable (e.g., for running, cycling). For non-cardio exercises, this should be 0 unless explicitly stated.'),
      distanceUnit: z.enum(['mi', 'km', 'ft']).optional().describe('The unit of distance (mi, km, or ft).'),
      duration: z.number().optional().describe('The duration of the exercise, if applicable (e.g., in minutes or seconds). For non-cardio exercises, this should be 0 unless explicitly stated.'),
      durationUnit: z.enum(['min', 'hr', 'sec']).optional().describe('The unit of duration (min, hr, or sec).'),
      calories: z.number().describe('The number of calories burned. If a dash ("-"), "N/A", or no value is clearly visible for calories, output 0.'),
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
1.  **Workout Date - CRITICAL**:
    *   Your primary goal is to find a date in the image. A valid date **must contain at least a month and a day** (e.g., "June 26", "Jul 4").
    *   **Step 1: Find Month and Day.** First, look for a month and a day. If you cannot find a clear month-day combination, you **MUST** omit the 'workoutDate' field entirely. Do not guess a date.
    *   **Step 2: Set the Year.** If, and only if, you found a valid month and day, you **MUST** use the year '2025' for the output. This rule applies regardless of any year that might be visible in the screenshot (e.g., 2023, 2024). For example, "June 26, 2023", "June 26, 2024", and "June 26" should all result in a 'workoutDate' of "2025-06-26".
    *   **Step 3: Format the Date.** If you have a valid month, day, and year (which must be 2025), format it as YYYY-MM-DD.
    *   **Final Rule:** If a month and day cannot be confidently extracted, the 'workoutDate' field must be omitted from the output.
2.  **Data Cleaning and OCR Artifacts**:
    *   When extracting numerical values (like weight, reps, sets, distance, duration, calories) and their units, be very careful to only extract the actual data.
    *   Ignore common OCR (Optical Character Recognition) artifacts. For instance:
        *   If you see "000- 5383 ft", the distance is '5383' and unit is 'ft'. The "000-" prefix is an artifact.
        *   If you see "566 sec0", the duration is '566' and unit is 'sec'. The trailing "0" is an artifact.
        *   Ensure all numerical fields in your output are actual numbers, not strings containing numbers and artifacts.
3.  **Exercise Name**:
    *   Extract the name of the exercise.
    *   If an exercise name begins with "EGYM " (case-insensitive), remove this prefix. For example, "EGYM Leg Press" should become "Leg Press".
4.  **Exercise Category**:
    *   For each exercise, you MUST assign a category. The category MUST be one of the following: "Cardio", "Lower Body", "Upper Body", "Full Body", "Core", or "Other".
    *   You MUST infer the category from the exercise name based on the guide below.
    *   **DO NOT default to "Other"** for common exercises listed in this guide.

    **MANDATORY CATEGORIZATION GUIDE:**
    *   **Upper Body**: Use for exercises like "Chest Press", "Bench Press", "Lat Pulldown", "Seated Dip", "Rowing", "Shoulder Press", "Overhead Press", "Butterfly", "Reverse Flys".
    *   **Lower Body**: Use for exercises like "Abductor", "Adductor", "Glutes", "Leg Press", "Leg Extension", "Leg Curl", "Squats", "Hip Thrust".
    *   **Core**: Use for exercises like "Abdominal Crunch", "Rotary Torso", "Back Extension". You must categorize "Back Extension" as "Core".
    *   **Full Body**: Use for exercises like "Deadlift", "Clean and Jerk".
    *   **Cardio**: Use for exercises like "Treadmill", "Cycling", "Running".
5.  **Specific Handling for "Cardio" Exercises**:
    *   If an exercise is categorized as "Cardio" (e.g., Treadmill, Running, Cycling, Elliptical):
        *   Prioritize extracting 'distance', 'distanceUnit', 'duration', 'durationUnit', and 'calories'. Ensure calories is a numerical value; if 'kcal' is present with the number, extract only the number. If calories are marked with "-", "N/A", or not visible, output 0.
        *   For these "Cardio" exercises, 'sets', 'reps', and 'weight' should be set to 0, *unless* the screenshot explicitly shows relevant values for these (which is rare for pure cardio). For example, "Treadmill 0:09:26 • 5383 ft • 96 cal" should result in: 'sets: 0, reps: 0, weight: 0, distance: 5383, distanceUnit: 'ft', duration: 566, durationUnit: 'sec', calories: 96'.
        *   Do not mistake distance values (like "5383 ft") for 'reps'.
6.  **Handling for Non-Cardio Exercises (Upper Body, Lower Body, Full Body, Core, Other)**:
    *   For these categories, prioritize extracting 'sets', 'reps', 'weight', 'weightUnit', and 'calories'. Ensure calories is a numerical value; if 'kcal' is present with the number, extract only the number. If calories are marked with "-", "N/A", or not visible, output 0.
    *   'distance' and 'duration' (and their units) should generally be 0 or omitted for these exercises, unless very clearly and explicitly stated as part of a strength training metric (which is rare).
7.  **Weight Unit**:
    *   Identify the unit of weight (e.g., kg or lbs).
    *   If you see "lbs00" or "kg00" (or "lbs000", "kg000", etc.) in the screenshot, interpret this as "lbs" or "kg" respectively. The trailing zeros are an artifact and not part of the unit.
    *   If the unit is not clearly visible or specified, default to 'kg' if there is a weight value greater than 0. If weight is 0, 'weightUnit' can be omitted or kept as default.
8.  **Duration Parsing**:
    *   If duration is in a format like MM:SS (e.g., "0:09:26" for Treadmill), parse it into total seconds (e.g., 9 minutes * 60 + 26 seconds = 566 seconds, so 'duration: 566, durationUnit: 'sec''). If it's simpler (e.g., "30 min"), parse as is ('duration: 30, durationUnit: 'min'').
9.  **Distance Unit**:
    *   Identify the unit of distance (e.g., km, mi, ft). Ensure 'ft' is recognized if present (e.g., "5383 ft" should be 'distance: 5383, distanceUnit: 'ft'').
10. **Critical: Avoid Duplicating Single Exercise Entries**:
    *   Pay very close attention to how many times an exercise is *actually logged* in the screenshot.
    *   If an exercise like "Treadmill" and its associated stats (e.g., "5383 ft, 566 sec") appear as a *single distinct entry* in the image, you MUST list it *only once* in your output.
    *   Do NOT create multiple identical entries for an exercise if it's just one logged item in the image.
    *   Only if the screenshot clearly shows the *same exercise name* logged *multiple separate times* with potentially different stats (e.g., "Bench Press: 3 sets..." and then later "Bench Press: 4 sets..."), should you list each of those distinct logs.
    *   The items "EGYM Abductor" and "EGYM Adductor" are different exercises and should be listed separately if both appear.
11. **Calories Field (General)**:
    *   Extract 'calories' if available for any exercise. Ensure it is output as a numerical value.
    *   If a value for calories is explicitly shown as '-' or 'N/A' or is not clearly visible in the screenshot for an exercise, output 0 for the 'calories' field for that exercise.

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

const FALLBACK_MODEL = 'googleai/gemini-1.5-pro-latest';

const parseWorkoutScreenshotFlow = ai.defineFlow(
  {
    name: 'parseWorkoutScreenshotFlow',
    inputSchema: ParseWorkoutScreenshotInputSchema,
    outputSchema: ParseWorkoutScreenshotOutputSchema,
  },
  async input => {
    let result;
    try {
      // Try with the default flash model first
      result = await prompt(input);
    } catch (e: any) {
      // If it fails with a 503-style error, try the pro model as a fallback
      if (e.message?.includes('503') || e.message?.toLowerCase().includes('overloaded') || e.message?.toLowerCase().includes('unavailable')) {
        console.log(`Default model unavailable, trying fallback: ${FALLBACK_MODEL}`);
        result = await prompt(input, { model: FALLBACK_MODEL });
      } else {
        // Re-throw other errors
        throw e;
      }
    }
    const {output} = result;

    if (output && output.exercises) {
      const strengthCategories = ['Lower Body', 'Upper Body', 'Full Body', 'Core'];
      const modifiedExercises = output.exercises.map(ex => {
        let name = ex.name;
        if (name.toLowerCase().startsWith('egym ')) {
          name = name.substring(5);
        }
        
        let correctedWeightUnit: 'kg' | 'lbs' | undefined;

        if (typeof ex.weightUnit === 'string') {
            const rawUnit = ex.weightUnit.trim().toLowerCase();
            if (/^lbs0+$/.test(rawUnit)) {
                correctedWeightUnit = 'lbs';
            } else if (/^kg0+$/.test(rawUnit)) {
                correctedWeightUnit = 'kg';
            } else if (rawUnit === 'lbs' || rawUnit === 'kg') {
                correctedWeightUnit = rawUnit as 'kg' | 'lbs';
            } else {
                // If it's an unrecognized string for weightUnit, treat as undefined initially
                // so the default 'kg' can be applied if weight > 0
                correctedWeightUnit = undefined; 
            }
        } else {
             correctedWeightUnit = undefined;
        }

        if (correctedWeightUnit === undefined) {
            if (ex.weight !== undefined && ex.weight > 0) {
                correctedWeightUnit = 'kg'; // Default to kg if weight is present and unit is unknown/missing
            }
        }

        // Initialize final values with AI's parsed values (or default to 0 if undefined by AI, Zod now requires calories)
        let finalSets = ex.sets ?? 0;
        let finalReps = ex.reps ?? 0;
        let finalWeight = ex.weight ?? 0;
        let finalDistance = ex.distance ?? 0;
        let finalDuration = ex.duration ?? 0;
        let finalCalories = ex.calories; // Zod schema now requires calories, so ex.calories should be a number.
        let finalDistanceUnit = ex.distanceUnit;
        let finalDurationUnit = ex.durationUnit;


        if (ex.category === 'Cardio') {
            finalSets = 0; 
            finalReps = 0;
            finalWeight = 0;
            if (finalWeight === 0) {
                correctedWeightUnit = undefined; 
            }
        } else if (ex.category && strengthCategories.includes(ex.category)) { 
            finalDistance = 0; 
            finalDuration = 0;
            finalDistanceUnit = undefined; 
            finalDurationUnit = undefined; 
        }
        
        return {
          name: name, 
          sets: finalSets,
          reps: finalReps,
          weight: finalWeight,
          weightUnit: correctedWeightUnit,
          category: ex.category, 
          distance: finalDistance,
          distanceUnit: finalDistanceUnit,
          duration: finalDuration,
          durationUnit: finalDurationUnit,
          calories: finalCalories, // Ensure calories is passed through
        };
      });
      return {
        ...output,
        exercises: modifiedExercises,
      };
    }
    if (!output) {
      throw new Error("AI failed to generate a response.");
    }
    return output;
  }
);
