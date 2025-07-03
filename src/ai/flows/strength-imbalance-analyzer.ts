'use server';
/**
 * @fileOverview Analyzes user's strength balance based on personal records.
 *
 * - analyzeStrengthImbalances - A function that handles the strength imbalance analysis.
 * - StrengthImbalanceInput - The input type for the function.
 * - StrengthImbalanceOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalRecordForAnalysisSchema = z.object({
    exerciseName: z.string(),
    weight: z.number(),
    weightUnit: z.enum(['kg', 'lbs']),
    date: z.date(),
    category: z.string().optional(),
});

export const StrengthImbalanceInputSchema = z.object({
  personalRecords: z.array(PersonalRecordForAnalysisSchema).describe("An array of the user's best personal records for various exercises."),
});
export type StrengthImbalanceInput = z.infer<typeof StrengthImbalanceInputSchema>;

const ImbalanceFindingSchema = z.object({
    imbalanceType: z.string().describe("The type of strength imbalance, e.g., 'Horizontal Push/Pull', 'Quad to Hamstring Ratio'."),
    lift1Name: z.string().describe("The name of the first exercise in the comparison."),
    lift1Weight: z.number().describe("The weight of the first exercise PR."),
    lift1Unit: z.enum(['kg', 'lbs']).describe("The weight unit for the first exercise."),
    lift2Name: z.string().describe("The name of the second, opposing exercise in the comparison."),
    lift2Weight: z.number().describe("The weight of the second exercise PR."),
    lift2Unit: z.enum(['kg', 'lbs']).describe("The weight unit for the second exercise."),
    userRatio: z.string().describe("The user's calculated strength ratio, formatted as 'X : Y'."),
    targetRatio: z.string().describe("The ideal or target strength ratio, formatted as 'X : Y'."),
    severity: z.enum(['Low', 'Moderate', 'High']).describe("The severity of the imbalance."),
    insight: z.string().describe("A concise explanation of what the imbalance means."),
    recommendation: z.string().describe("A simple, actionable recommendation to address the imbalance."),
});

export const StrengthImbalanceOutputSchema = z.object({
    summary: z.string().describe("A brief, high-level summary of the user's overall strength balance."),
    findings: z.array(ImbalanceFindingSchema).describe("A list of specific strength imbalances found."),
});
export type StrengthImbalanceOutput = z.infer<typeof StrengthImbalanceOutputSchema>;

export async function analyzeStrengthImbalances(input: StrengthImbalanceInput): Promise<StrengthImbalanceOutput> {
  // Filter out records with 0 weight as they can't be used for ratio analysis
  const filteredInput = {
      ...input,
      personalRecords: input.personalRecords.filter(pr => pr.weight > 0),
  };
  if (filteredInput.personalRecords.length < 2) {
      return {
          summary: "Not enough data to perform a strength analysis. Please log more personal records for opposing muscle groups.",
          findings: [],
      };
  }
  return strengthImbalanceFlow(filteredInput);
}

const prompt = ai.definePrompt({
  name: 'strengthImbalancePrompt',
  input: {schema: StrengthImbalanceInputSchema},
  output: {schema: StrengthImbalanceOutputSchema},
  prompt: `You are an expert kinesiologist and strength and conditioning coach. Your task is to analyze a user's personal records (1-rep max equivalents) to identify potential strength imbalances between opposing muscle groups.

You will be given a list of the user's personal records. Use this data to perform the analysis.

**CRITICAL INSTRUCTIONS:**

1.  **Identify Opposing Lift Pairs**: Scan the records to find pairs of exercises that work opposing muscle groups. The primary pairs to look for are:
    *   **Horizontal Push vs. Pull**: Compare a primary horizontal press (e.g., 'Bench Press', 'Chest Press') with a primary horizontal row (e.g., 'Barbell Row', 'Seated Row', 'Cable Row').
    *   **Vertical Push vs. Pull**: Compare a primary vertical press (e.g., 'Overhead Press', 'Shoulder Press') with a primary vertical pull (e.g., 'Lat Pulldown', 'Pull-ups', 'Chin-ups').
    *   **Quad vs. Hamstring Dominance**: Compare a primary quad exercise (e.g., 'Leg Extension', 'Squat') with a primary hamstring exercise (e.g., 'Leg Curl', 'Romanian Deadlift').

2.  **Handle Weight Units**: If the units for a pair of lifts are different (kg vs. lbs), you MUST convert them to a common unit before calculating the ratio. Use the conversion: 1 kg = 2.20462 lbs.

3.  **Calculate Ratios**: For each identified pair, calculate the strength ratio. Express this as a simplified string, e.g., "1.25 : 1". The first number should correspond to the first lift type in the pair (e.g., the "Push" lift in Push/Pull).

4.  **Compare to Ideal Ratios & Assess Severity**:
    *   **Horizontal Push/Pull**: Ideal ratio is **1 : 1**.
        *   Severity 'Low' if ratio is between 0.9-1.1.
        *   Severity 'Moderate' if ratio is between 0.75-0.9 or 1.1-1.25.
        *   Severity 'High' if ratio is below 0.75 or above 1.25.
    *   **Vertical Push/Pull**: Ideal ratio for Press:Pull is **1 : 1.3 to 1 : 1.5** (pulling should be stronger).
        *   Severity 'Low' if pull is 1.2-1.6x press.
        *   Severity 'Moderate' if pull is 1.1-1.2x or 1.6-1.8x press.
        *   Severity 'High' if pull is less than 1.1x or more than 1.8x press.
    *   **Quad/Hamstring**: Ideal ratio for Quad:Hamstring is **3 : 2** (or 1.5 : 1).
        *   Severity 'Low' if ratio is 1.4-1.7.
        *   Severity 'Moderate' if ratio is 1.2-1.4 or 1.7-2.0.
        *   Severity 'High' if ratio is below 1.2 or above 2.0.

5.  **Generate Output**:
    *   Create a concise, encouraging `summary` of the overall findings.
    *   For each imbalance identified, create a `finding` object with:
        *   `imbalanceType`: The name of the comparison (e.g., "Horizontal Push vs. Pull").
        *   The names, weights, and units of the two lifts being compared.
        *   `userRatio` and `targetRatio`.
        *   The calculated `severity`.
        *   A clear `insight` explaining the implication of the imbalance (e.g., "Your pressing strength is significantly greater than your pulling strength, which can increase risk of shoulder injury.").
        *   A simple, `recommendation` (e.g., "Prioritize increasing strength in your rowing exercises.").

6.  **No Data/No Imbalances**:
    *   If you cannot find any clear opposing lift pairs, state that in the summary and return an empty `findings` array.
    *   If all found ratios are within the 'Low' severity or ideal range, congratulate the user on their balanced strength in the summary and return an empty `findings` array.

Here are the user's personal records:
{{#each personalRecords}}
- {{exerciseName}}: {{weight}} {{weightUnit}}
{{/each}}
`,
});

const strengthImbalanceFlow = ai.defineFlow(
  {
    name: 'strengthImbalanceFlow',
    inputSchema: StrengthImbalanceInputSchema,
    outputSchema: StrengthImbalanceOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
