
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
    dateString: z.string().describe("The date the record was achieved, formatted as YYYY-MM-DD. If the year is not specified, default to 2025. If the year 2024 is visible, it must be changed to 2025.")
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

You will be provided with a screenshot of a list of strength achievements.
Your goal is to extract each personal record and return it in a structured JSON format.

Key Instructions:
1.  **Extract Each Record**: The screenshot contains multiple lines, each representing a different personal record. You must parse each one.
2.  **Exercise Name**:
    *   Extract the name of the exercise.
    *   If an exercise name begins with "EGYM " (case-insensitive), remove this prefix. For example, "EGYM Chest Press" should become "Chest Press".
3.  **Weight and Unit**:
    *   Extract the numerical weight value and its unit (kg or lbs).
4.  **Date - CRITICAL**:
    *   Each record has its own date. You must extract the date associated with each specific record.
    *   Format the date as YYYY-MM-DD.
    *   **Rule 1: If the year \`2024\` is visible for a record, you MUST IGNORE it and use the year \`2025\` in your output for that record.** For example, if a line says "Bench Press 100 kg Jun 26, 2024", the \`dateString\` MUST be "2025-06-26".
    *   **Rule 2: If NO year is visible for a record**, you MUST use the year **2025**. For example, "Squat 120 kg Jul 1", the \`dateString\` MUST be "2025-07-01".
    *   **Rule 3: For any other explicit year** (like 2023, 2022, etc.), you should use that year.

Here is the screenshot to parse:
{{media url=photoDataUri}}
`,
});

const parsePersonalRecordsFlow = ai.defineFlow(
  {
    name: 'parsePersonalRecordsFlow',
    inputSchema: ParsePersonalRecordsInputSchema,
    outputSchema: ParsePersonalRecordsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output && output.records) {
        // Post-processing to clean up names if needed, similar to workout parser
        const cleanedRecords = output.records.map(record => ({
            ...record,
            exerciseName: record.exerciseName.toLowerCase().startsWith('egym ') 
                ? record.exerciseName.substring(5) 
                : record.exerciseName,
        }));
        return { records: cleanedRecords };
    }
    return output!;
  }
);
