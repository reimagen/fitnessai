
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
      "A screenshot of a workout log, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ParseWorkoutScreenshotInput = z.infer<typeof ParseWorkoutScreenshotInputSchema>;

const ParseWorkoutScreenshotOutputSchema = z.object({
  workoutDate: z.string().optional().describe("The date of the workout extracted from the screenshot, formatted as YYYY-MM-DD. This field is only present if a date was found."),
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

// Common prompt instructions to avoid repetition
const COMMON_INSTRUCTIONS = `
**CRITICAL INSTRUCTIONS - MUST BE FOLLOWED EXACTLY:**

1.  **Data Cleaning and OCR Artifacts**:
    *   When extracting numerical values (like weight, reps, sets, distance, duration, calories) and their units, be very careful to only extract the actual data.
    *   Ignore common OCR (Optical Character Recognition) artifacts. For instance:
        *   If you see "000- 5383 ft", the distance is '5383' and unit is 'ft'. The "000-" prefix is an artifact.
        *   If you see "566 sec0", the duration is '566' and unit is 'sec'. The trailing "0" is an artifact.
        *   Ensure all numerical fields in your output are actual numbers, not strings containing numbers and artifacts.
2.  **Exercise Name**:
    *   Extract the name of the exercise.
    *   If an exercise name begins with "EGYM " (case-insensitive), remove this prefix. For example, "EGYM Leg Press" should become "Leg Press".
3.  **Exercise Category**:
    *   For each exercise, you MUST assign a category. The category MUST be one of the following: "Cardio", "Lower Body", "Upper Body", "Full Body", "Core", or "Other".
    *   You MUST infer the category from the exercise name based on the guide below.
    *   **DO NOT default to "Other"** for common exercises listed in this guide.

    **MANDATORY CATEGORIZATION GUIDE:**
    *   **Upper Body**: Use for exercises like "Chest Press", "Bench Press", "Lat Pulldown", "Seated Dip", "Rowing", "Shoulder Press", "Overhead Press", "Butterfly", "Reverse Flys".
    *   **Lower Body**: Use for exercises like "Abductor", "Adductor", "Glutes", "Leg Press", "Leg Extension", "Leg Curl", "Squats", "Hip Thrust".
    *   **Core**: Use for exercises like "Abdominal Crunch", "Rotary Torso", "Back Extension". You must categorize "Back Extension" as "Core".
    *   **Full Body**: Use for exercises like "Deadlift", "Clean and Jerk".
    *   **Cardio**: Use for exercises like "Treadmill", "Cycling", "Running", "Climbmill".
4.  **Specific Handling for "Cardio" Exercises**:
    *   If an exercise is categorized as "Cardio" (e.g., Treadmill, Running, Cycling, Elliptical, Climbmill):
        *   Prioritize extracting 'distance', 'distanceUnit', 'duration', 'durationUnit', and 'calories'. Ensure calories is a numerical value; if 'kcal' is present with the number, extract only the number. If calories are marked with "-", "N/A", or not visible, output 0.
        *   For these "Cardio" exercises, 'sets', 'reps', and 'weight' should be set to 0, *unless* the screenshot explicitly shows relevant values for these (which is rare for pure cardio). For example, "Climbmill 5m 1s 36 cal" should result in 'sets: 0, reps: 0, weight: 0, distance: 0, duration: 301, durationUnit: 'sec', calories: 36'.
        *   Do not mistake distance values (like "5383 ft") for 'reps'.
5.  **Handling for Non-Cardio Exercises (Upper Body, Lower Body, Full Body, Core, Other)**:
    *   For these categories, prioritize extracting 'sets', 'reps', 'weight', 'weightUnit', and 'calories'. Ensure calories is a numerical value; if 'kcal' is present with the number, extract only the number. If calories are marked with "-", "N/A", or not visible, output 0.
    *   'distance' and 'duration' (and their units) should generally be 0 or omitted for these exercises, unless very clearly and explicitly stated as part of a strength training metric (which is rare).
6.  **Weight Unit**:
    *   Identify the unit of weight (e.g., kg or lbs).
    *   If you see "lbs00" or "kg00" (or "lbs000", "kg000", etc.) in the screenshot, interpret this as "lbs" or "kg" respectively. The trailing zeros are an artifact and not part of the unit.
    *   If the unit is not clearly visible or specified, default to 'kg' if there is a weight value greater than 0. If weight is 0, 'weightUnit' can be omitted or kept as default.
7.  **Duration Parsing**:
    *   If duration is in a format like MM:SS (e.g., "5m 1s" or "0:09:26"), parse it into total seconds (e.g., 9 minutes * 60 + 26 seconds = 566 seconds, so 'duration: 566, durationUnit: 'sec''). If it's simpler (e.g., "30 min"), parse as is ('duration: 30, durationUnit: 'min'').
8.  **Distance Unit**:
    *   Identify the unit of distance (e.g., km, mi, ft). Ensure 'ft' is recognized if present (e.g., "5383 ft" should be 'distance: 5383, distanceUnit: 'ft'').
9.  **Critical: Avoid Duplicating Single Exercise Entries**:
    *   Pay very close attention to how many times an exercise is *actually logged* in the screenshot.
    *   If an exercise like "Treadmill" and its associated stats (e.g., "5383 ft, 566 sec") appear as a *single distinct entry* in the image, you MUST list it *only once* in your output.
    *   Do NOT create multiple identical entries for an exercise if it's just one logged item in the image.
    *   Only if the screenshot clearly shows the *same exercise name* logged *multiple separate times* with potentially different stats (e.g., "Bench Press: 3 sets..." and then later "Bench Press: 4 sets..."), should you list each of those distinct logs.
    *   The items "EGYM Abductor" and "EGYM Adductor" are different exercises and should be listed separately if both appear.
10. **Calories Field (General)**:
    *   Extract 'calories' if available for any exercise. Ensure it is output as a numerical value.
    *   If a value for calories is explicitly shown as '-' or 'N/A' or is not clearly visible in the screenshot for an exercise, output 0 for the 'calories' field for that exercise.
`;

const dateCheckPrompt = ai.definePrompt({
  name: 'workoutDateCheckPrompt',
  input: { schema: ParseWorkoutScreenshotInputSchema },
  output: { schema: z.object({ dateExists: z.enum(['Yes', 'No']) }) },
  prompt: `You are a specialized text analysis model. Your only task is to determine if a workout date (an explicit month and day, like "June 26" or "Jul 4") is clearly written in the provided image.

  **RULES:**
  - A date is only valid if it appears to be part of the workout data itself.
  - Ignore dates in UI elements, like titles saying "Parsing Successful for June 26".
  - If a month and day are present, answer "Yes".
  - If no month and day are clearly visible in the workout log, answer "No".

  Respond with ONLY "Yes" or "No".

  Here is the screenshot:
  {{media url=photoDataUri}}
  `,
});

const mainParserPrompt = ai.definePrompt({
  name: 'parseWorkoutScreenshotPrompt',
  input: {schema: ParseWorkoutScreenshotInputSchema},
  output: {schema: ParseWorkoutScreenshotOutputSchema},
  prompt: `You are an expert in parsing workout data from screenshots.
You will be provided with a screenshot of a workout log. Your goal is to extract the workout date and exercise data from the screenshot and return it in a structured JSON format.

**Workout Date - CRITICAL INSTRUCTION**:
- This is your most important instruction. You will be told whether to extract a date or not.
- **IF THE USER SAYS 'parseDate: true'**: You MUST find the date in the image. A date is only valid if a month and day are clearly and explicitly written in the image AS PART OF THE WORKOUT LOG ITSELF. Text such as "Parsing Successful", "Workout Details", or any other UI element is NOT a date. You must ignore these. If, and only if, you find a valid month and day (e.g., "June 26", "Jul 4") within the log data itself, you MUST use the year '2025' for the output. For example, "June 26, 2023", "June 26, 2024", and "June 26" all result in a 'workoutDate' of "2025-06-26".
- **IF THE USER SAYS 'parseDate: false'**: You MUST NOT include the 'workoutDate' field in your JSON output. Do not guess, infer, or hallucinate a date. Omit the field entirely.

Now, follow all the common instructions provided below.

{{#if parseDate}}
**USER INSTRUCTION: parseDate: true**
{{else}}
**USER INSTRUCTION: parseDate: false**
{{/if}}

${COMMON_INSTRUCTIONS}

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
  async (input) => {
    let output;
    
    // Step 1: Check if a date exists using the simple prompt.
    const { output: dateCheckResult } = await dateCheckPrompt(input);
    const shouldParseDate = dateCheckResult?.dateExists === 'Yes';

    const promptInputWithFlag = { ...input, parseDate: shouldParseDate };

    try {
      // Step 2: Call the main parser, telling it whether to look for a date.
      const result = await mainParserPrompt(promptInputWithFlag);
      output = result.output;
    } catch (e: any) {
      if (e.message?.includes('503') || e.message?.toLowerCase().includes('overloaded') || e.message?.toLowerCase().includes('unavailable')) {
        console.log(`Default model unavailable, trying fallback: ${FALLBACK_MODEL}`);
        const result = await mainParserPrompt(promptInputWithFlag, { model: FALLBACK_MODEL });
        output = result.output;
      } else {
        throw e;
      }
    }

    if (!output) {
      throw new Error("AI failed to generate a response.");
    }

    // Step 3: Post-processing to clean up the AI's output.
    if (output.exercises) {
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
        let finalCalories = ex.calories;
        let finalDistanceUnit = ex.distanceUnit;
        let finalDurationUnit = ex.durationUnit;


        // Apply strict rules based on category. This overrides AI errors.
        if (ex.category === 'Cardio') {
            finalSets = 0; 
            finalReps = 0;
            finalWeight = 0;
            if (finalWeight === 0) {
                correctedWeightUnit = undefined; 
            }
            // If the AI hallucinated miles from a duration (e.g., '5m' -> 5mi), fix it.
            // This is a heuristic: if distance unit is 'mi' and duration is 0, it was likely a mistake.
            if (ex.distanceUnit === 'mi' && (ex.duration === 0 || ex.duration === undefined) && ex.distance) {
                 finalDuration = ex.distance;
                 finalDurationUnit = 'min';
                 finalDistance = 0;
                 finalDistanceUnit = undefined;
            }
        } else if (ex.category && strengthCategories.includes(ex.category)) { 
            // For strength exercises, distance and duration should be zero unless explicitly provided,
            // which is rare. This helps clear out noise.
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
          calories: finalCalories,
        };
      });
      return {
        ...output,
        exercises: modifiedExercises,
      };
    }
    
    return output;
  }
);
