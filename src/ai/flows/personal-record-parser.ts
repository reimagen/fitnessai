
'use server';
/**
 * @fileOverview Parses personal records from a screenshot.
 *
 * - parsePersonalRecords - A function that handles the PR parsing process.
 * - ParsePersonalRecordsInput - The input type for the parsePersonalRecords function.
 * - ParsePersonalRecordsOutput - The return type for the parsePersonalRecords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ExerciseCategory } from '@/lib/types';

const CATEGORY_OPTIONS = ['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other'] as const;

const ParsePersonalRecordsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A screenshot of personal records, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ParsePersonalRecordsInput = z.infer<typeof ParsePersonalRecordsInputSchema>;

const PersonalRecordSchema = z.object({
    exerciseName: z.string().describe("The name of the exercise. If the original name starts with 'EGYM ', remove this prefix."),
    weight: z.number().describe("The weight lifted for the record."),
    weightUnit: z.enum(['kg', 'lbs']).describe("The unit for the weight (kg or lbs)."),
    dateString: z.string().describe("The date the record was achieved, formatted as YYYY-MM-DD."),
    category: z.enum(CATEGORY_OPTIONS).describe("The category of the exercise. Infer based on the exercise name. Must be one of: 'Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', or 'Other'.")
});

const ParsePersonalRecordsOutputSchema = z.object({
  records: z.array(PersonalRecordSchema).describe('A list of personal records parsed from the screenshot.'),
});
export type ParsePersonalRecordsOutput = z.infer<typeof ParsePersonalRecordsOutputSchema>;

export async function parsePersonalRecords(input: ParsePersonalRecordsInput): Promise<ParsePersonalRecordsOutput> {
  return parsePersonalRecordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parsePersonalRecordsPrompt',
  input: {schema: ParsePersonalRecordsInputSchema},
  output: {schema: ParsePersonalRecordsOutputSchema},
  prompt: `You are an expert in parsing fitness data, specifically personal records (PRs), from screenshots.
Your goal is to extract each personal record and return it in a structured JSON format.

The most important part of your task is to correctly categorize each exercise.

**CRITICAL INSTRUCTIONS FOR CATEGORIZATION:**
1.  **You MUST assign a category to every exercise.**
2.  The category **MUST** be one of the following exact strings: "Cardio", "Lower Body", "Upper Body", "Full Body", "Core", or "Other".
3.  You **MUST** infer the category from the exercise name based on the examples below.
4.  **DO NOT default to "Other"** for common exercises. It is a failure if you categorize any of the exercises listed in the guide below as "Other".

**MANDATORY CATEGORIZATION GUIDE:**
*   **Upper Body**: Use for exercises like "Chest Press", "Bench Press", "Lat Pulldown", "Seated Dip", "Rowing", "Shoulder Press", "Overhead Press", "Butterfly", "Reverse Flys".
*   **Lower Body**: Use for exercises like "Abductor", "Adductor", "Glutes", "Leg Press", "Leg Extension", "Leg Curl", "Squats", "Hip Thrust".
*   **Core**: Use for exercises like "Abdominal Crunch", "Rotary Torso", "Back Extension". You must categorize "Back Extension" as "Core".
*   **Full Body**: Use for exercises like "Deadlift", "Clean and Jerk".
*   **Cardio**: Use for exercises like "Treadmill", "Cycling", "Running".

**OTHER INSTRUCTIONS:**
*   **Extract Each Record**: The screenshot contains multiple lines, each representing a different personal record. You must parse each one.
*   **Exercise Name**:
    *   Extract the name of the exercise.
    *   If an exercise name begins with "EGYM " (case-insensitive), you must remove this prefix. For example, "EGYM Chest Press" becomes "Chest Press".
*   **Weight and Unit**: Extract the numerical weight value and its unit (kg or lbs).
*   **Date - CRITICAL**:
    *   You must extract the date (year and month and day) associated with each specific record.
    *   Format the final date as YYYY-MM-DD.
    *   **Handling "Today"**: If a record's date is listed as "Today", you MUST look for a general date at the top of the screenshot, such as "Updated on...". Use that date for the record. For example, if the top says "Updated on Jul 4, 2026" and a record says "Today", you MUST use "2026-07-04" as the dateString for that record.
    *   **Example 1:** If a line says "Bench Press 100 kg Jun 26, 2026", the 'dateString' MUST be "2026-06-26".
    *   **Example 2:** If a line says "Squat 120 kg July 1, 2026", the 'dateString' MUST be "2026-07-01".
    *   **Example 3:** If a line says "Leg Press 200 kg May 15 2026", the 'dateString' MUST be "2026-05-15".

Here is the screenshot to parse:
{{media url=photoDataUri}}
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  },
});

const FALLBACK_MODEL = 'googleai/gemini-1.5-pro-latest';

const parsePersonalRecordsFlow = ai.defineFlow(
  {
    name: 'parsePersonalRecordsFlow',
    inputSchema: ParsePersonalRecordsInputSchema,
    outputSchema: ParsePersonalRecordsOutputSchema,
  },
  async input => {
    let output;
    try {
      // Try with the default flash model first. It's cheaper and has higher rate limits.
      const result = await prompt(input);
      output = result.output;
    } catch (e: any) {
      // If Flash fails (due to complexity, overload, or anything else), log it and try Pro.
      console.warn(`Default model failed for parsePersonalRecords. Retrying with ${FALLBACK_MODEL}. Error: ${e.message}`);
      const result = await prompt(input, { model: FALLBACK_MODEL });
      output = result.output;
    }
    
    if (!output) {
      throw new Error("AI failed to generate a response from either model. The model returned no output.");
    }

    // The Zod schema validation on the flow's output will catch any formatting errors.
    return output;
  }
);
