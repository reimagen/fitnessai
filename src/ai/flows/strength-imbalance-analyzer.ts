
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
    date: z.string(),
    category: z.string().optional(),
});

const StrengthImbalanceInputSchema = z.object({
  personalRecords: z.array(PersonalRecordForAnalysisSchema),
});
export type StrengthImbalanceInput = z.infer<typeof StrengthImbalanceInputSchema>;

const ImbalanceFindingSchema = z.object({
    imbalanceType: z.string().describe("The type of strength imbalance, e.g., 'Horizontal Push/Pull', 'Quad to Hamstring Ratio', 'Adductor vs. Abductor'."),
    lift1Name: z.string().describe("The name of the first exercise in the comparison."),
    lift1Weight: z.number().describe("The weight of the first exercise PR."),
    lift1Unit: z.enum(['kg', 'lbs']).describe("The weight unit for the first exercise."),
    lift2Name: z.string().describe("The name of the second, opposing exercise in the comparison."),
    lift2Weight: z.number().describe("The weight of the second exercise PR."),
    lift2Unit: z.enum(['kg', 'lbs']).describe("The weight unit for the second exercise."),
    userRatio: z.string().describe("The user's calculated strength ratio, formatted as 'X : Y'."),
    targetRatio: z.string().describe("The ideal or target strength ratio, formatted as 'X : Y'."),
    severity: z.enum(['Balanced', 'Moderate', 'Severe']).describe("The severity of the imbalance. Must be 'Balanced' for ideal ratios, 'Moderate' for noticeable issues, or 'Severe' for significant imbalances."),
    insight: z.string().describe("A concise explanation of what the imbalance means."),
    recommendation: z.string().describe("A simple, actionable recommendation to address the imbalance."),
});

const StrengthImbalanceOutputSchema = z.object({
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
    *   **Adductor vs. Abductor**: Compare an inner thigh exercise (e.g., 'Adductor') with an outer thigh exercise (e.g., 'Abductor').
    *   **Chest Fly vs. Rear Delts**: Compare 'Butterfly' with 'Reverse Fly'.
    *   **Biceps vs. Triceps**: Compare a primary bicep curl exercise with a primary tricep extension/press exercise.
    *   **Anterior vs. Posterior Core**: Compare 'Abdominal Crunch' with 'Back Extension'.
    *   **Glute Development**: Compare 'Hip Thrust' with 'Glutes' (glute machine). Note that this is not an opposing muscle group, but a comparison of different glute exercises.

2.  **Handle Weight Units**: If the units for a pair of lifts are different (kg vs. lbs), you MUST convert them to a common unit before calculating the ratio. Use the conversion: 1 kg = 2.20462 lbs.

3.  **Calculate and Format Ratios (CRITICAL):**
    *   **For 1:1 Ratios (Horizontal Push/Pull, Adductor/Abductor, Butterfly/Reverse Fly, Ab Crunch/Back Extension, Hip Thrust/Glutes):**
        *   Calculate the ratio as \`(Lift 1 Weight / Lift 2 Weight)\`.
        *   Format the \`userRatio\` string as \`CALCULATED_VALUE : 1\`. For example, if Lift 1 is 120 and Lift 2 is 100, the ratio is \`1.2 : 1\`. If Lift 1 is 80 and Lift 2 is 100, the ratio is \`0.8 : 1\`.
        *   The \`targetRatio\` for these will always be \`1 : 1\`.
    *   **For Vertical Push vs. Pull:**
        *   The ratio MUST compare Press to Pull.
        *   Calculate the ratio as \`(Pull Weight / Press Weight)\`.
        *   Format the \`userRatio\` string as \`1 : CALCULATED_VALUE\`. For example, if Press is 100 and Pull is 140, the ratio is \`1 : 1.4\`.
        *   The \`targetRatio\` string MUST be \`1 : 1.3 to 1.5\`.
    *   **For Biceps vs. Triceps:**
        *   The ratio MUST compare Biceps to Triceps.
        *   Calculate the ratio as \`(Triceps Weight / Biceps Weight)\`.
        *   Format the \`userRatio\` string as \`1 : CALCULATED_VALUE\`. For example, if Bicep is 50 and Tricep is 75, the ratio is \`1 : 1.5\`.
        *   The \`targetRatio\` string MUST be \`1 : 1.5\`.
    *   **For Quad vs. Hamstring:**
        *   The ratio MUST compare Quads to Hamstrings.
        *   Calculate the ratio as \`(Quad Weight / Hamstring Weight)\`.
        *   Format the \`userRatio\` string as \`CALCULATED_VALUE : 1\`. For example, if Quad is 150 and Hamstring is 100, the ratio is \`1.5 : 1\`.
        *   The \`targetRatio\` string MUST be \`1.5 : 1\`.

4.  **Compare to Ideal Ratios & Assess Severity**:
    *   **Horizontal Push/Pull**: Ideal ratio is **1 : 1**.
        *   Severity 'Balanced' if ratio is between 0.9 and 1.1.
        *   Severity 'Moderate' if ratio is between 0.75 and 0.89, or between 1.11 and 1.25.
        *   Severity 'Severe' if ratio is **less than 0.75** or **greater than 1.25**. For example, a ratio of 0.74 MUST be categorized as 'Severe'.
    *   **Vertical Push/Pull**: Ideal ratio for Press:Pull is **1 : 1.3 to 1 : 1.5** (pulling should be stronger).
        *   Severity 'Balanced' if pull is 1.2x to 1.6x the press.
        *   Severity 'Moderate' if pull is 1.1x to 1.19x or 1.61x to 1.8x the press.
        *   Severity 'Severe' if pull is **less than 1.1x** or **more than 1.8x** the press. For example, a pull that is 1.09x the press MUST be 'Severe'.
    *   **Quad/Hamstring**: Ideal ratio for Quad:Hamstring is **1.5 : 1**.
        *   Severity 'Balanced' if the quad-to-hamstring ratio is between 1.4 and 1.7.
        *   Severity 'Moderate' if the ratio is between 1.2 and 1.39, OR between 1.71 and 2.0.
        *   Severity 'Severe' if the ratio is **less than 1.2** or **greater than 2.0**. For example, a ratio of 2.02 MUST be categorized as 'Severe'.
    *   **Adductor/Abductor**: Ideal ratio is **1 : 1**.
        *   Severity 'Balanced' if ratio is between 0.9 and 1.1.
        *   Severity 'Moderate' if ratio is between 0.75 and 0.89, or between 1.11 and 1.25.
        *   Severity 'Severe' if ratio is **less than 0.75** or **greater than 1.25**. For example, a ratio of 0.74 MUST be 'Severe'.
    *   **Chest Fly/Rear Delt (Butterfly/Reverse Fly)**: Ideal ratio is **1 : 1**.
        *   Severity 'Balanced' if ratio is between 0.9 and 1.1.
        *   Severity 'Moderate' if ratio is between 0.75 and 0.89, or between 1.11 and 1.25.
        *   Severity 'Severe' if ratio is **less than 0.75** or **greater than 1.25**. For example, a ratio of 0.74 MUST be 'Severe'.
    *   **Biceps/Triceps**: Ideal ratio for Bicep:Tricep is **1 : 1.5**.
        *   Severity 'Balanced' if triceps are 1.3x to 1.7x stronger than biceps.
        *   Severity 'Moderate' if triceps are 1.1x to 1.29x or 1.71x to 2.0x stronger.
        *   Severity 'Severe' if triceps are **less than 1.1x** or **more than 2.0x** stronger. For example, if triceps are only 1.05x stronger, it MUST be 'Severe'.
    *   **Anterior/Posterior Core (Ab Crunch/Back Extension)**: Ideal ratio is **1 : 1**.
        *   Severity 'Balanced' if ratio is between 0.9 and 1.1.
        *   Severity 'Moderate' if ratio is between 0.75 and 0.89, or between 1.11 and 1.25.
        *   Severity 'Severe' if ratio is **less than 0.75** or **greater than 1.25**. For example, a ratio of 0.74 MUST be 'Severe'.
    *   **Glute Development (Hip Thrust/Glutes machine)**: Ideal ratio is **1 : 1**. Treat this as a measure of balanced development rather than opposing muscles.
        *   Severity 'Balanced' if ratio is between 0.9 and 1.1.
        *   Severity 'Moderate' if ratio is between 0.75 and 0.89, or between 1.11 and 1.25.
        *   Severity 'Severe' if ratio is **less than 0.75** or **greater than 1.25**. For example, a ratio of 0.74 MUST be 'Severe'.

5.  **Generate Output**:
    *   Create a concise, encouraging 'summary' of the overall findings.
    *   For each imbalance identified, create a 'finding' object with:
        *   'imbalanceType': The name of the comparison (e.g., 'Horizontal Push vs. Pull').
        *   The names, weights, and units of the two lifts being compared.
        *   'userRatio' and 'targetRatio' formatted exactly as specified in the ratio formatting step.
        *   The calculated 'severity'.
        *   A clear 'insight' explaining the implication of the imbalance (e.g., 'Your pressing strength is significantly greater than your pulling strength, which can increase risk of shoulder injury.').
        *   A simple, 'recommendation' (e.g., 'Prioritize increasing strength in your rowing exercises.').

6.  **No Data/No Imbalances**:
    *   If you cannot find any clear opposing lift pairs, state that in the summary and return an empty 'findings' array.
    *   If all found ratios are within the 'Balanced' severity or ideal range, congratulate the user on their balanced strength in the summary and return an empty 'findings' array.

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
