
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

const IMBALANCE_TYPES = [
    'Horizontal Push vs. Pull',
    'Vertical Pull vs. Push',
    'Quad vs. Hamstring',
    'Adductor vs. Abductor',
    'Reverse Fly vs. Butterfly',
    'Triceps vs. Biceps',
    'Back Extension vs. Abdominal Crunch',
    'Glute Development',
] as const;

const ImbalanceFindingSchema = z.object({
    imbalanceType: z.enum(IMBALANCE_TYPES).describe("The type of strength imbalance. Must be one of the predefined types."),
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
    *   **Horizontal Push vs. Pull**: Compare a primary horizontal press (e.g., 'Bench Press', 'Chest Press') with a primary horizontal row (e.g., 'Barbell Row', 'Seated Row', 'Cable Row'). The Push exercise is Lift 1.
    *   **Vertical Pull vs. Push**: Compare a primary vertical pull (e.g., 'Lat Pulldown', 'Pull-ups', 'Chin-ups') with a primary vertical press (e.g., 'Overhead Press', 'Shoulder Press'). **The Pull exercise is Lift 1.**
    *   **Quad vs. Hamstring**: Compare a primary quad exercise (e.g., 'Leg Extension', 'Squat') with a primary hamstring exercise (e.g., 'Leg Curl', 'Romanian Deadlift'). The Quad exercise is Lift 1.
    *   **Adductor vs. Abductor**: Compare an inner thigh exercise (e.g., 'Adductor') with an outer thigh exercise (e.g., 'Abductor'). The Adductor exercise is Lift 1.
    *   **Reverse Fly vs. Butterfly**: Compare 'Reverse Fly' with 'Butterfly'. **Reverse Fly is Lift 1.**
    *   **Triceps vs. Biceps**: Compare a primary tricep extension/press exercise with a primary bicep curl exercise. **The Tricep exercise is Lift 1.**
    *   **Back Extension vs. Abdominal Crunch**: Compare 'Back Extension' with 'Abdominal Crunch'. **Back Extension is Lift 1.**
    *   **Glute Development**: Compare 'Hip Thrust' with 'Glutes' (glute machine). The Hip Thrust exercise is Lift 1.

2.  **Handle Weight Units**: If the units for a pair of lifts are different (kg vs. lbs), you MUST convert them to a common unit before calculating the ratio. Use the conversion: 1 kg = 2.20462 lbs.

3.  **Calculate and Format Ratios (CRITICAL):**
    *   **Universal Rule:** For ALL comparisons, the ratio MUST be calculated as \`(Lift 1 Weight / Lift 2 Weight)\`. "Lift 1" is always the first exercise in the comparison name as defined in step 1 (e.g., for "Horizontal Push vs. Pull", the Push exercise is Lift 1).
    *   **Universal Formatting:** The \`userRatio\` string MUST ALWAYS be formatted as \`CALCULATED_VALUE : 1\`. The value should be rounded to two decimal places. For example, if Lift 1 is 80kg and Lift 2 is 100kg, the calculated value is 0.8, and the formatted \`userRatio\` is \`0.80 : 1\`.

4.  **Compare to Ideal Ratios & Assess Severity**:

    *   **Horizontal Push vs. Pull** (Push:Pull): Ideal ratio is **1:1**.
        *   `targetRatio` MUST be `1.00 : 1`.
        *   `Severity 'Balanced'` if ratio is between 0.90 and 1.10.
        *   `Severity 'Moderate'` if ratio is between 0.75 and 0.89, or 1.11 and 1.25.
        *   `Severity 'Severe'` if ratio is **less than 0.75** or **greater than 1.25**.

    *   **Vertical Pull vs. Push** (Pull:Push): Ideal is for pull to be 1.3x-1.5x stronger than push.
        *   `targetRatio` MUST be `1.30 - 1.50 : 1`.
        *   `Severity 'Balanced'` if ratio is between 1.20 and 1.60.
        *   `Severity 'Moderate'` if ratio is between 1.10 and 1.19, or 1.61 and 1.80.
        *   `Severity 'Severe'` if ratio is **less than 1.10** or **greater than 1.80**. For example, a Pull:Push ratio of 1.88 MUST be 'Severe'.

    *   **Quad vs. Hamstring** (Quad:Hamstring): Ideal ratio is **1.5:1**.
        *   `targetRatio` MUST be `1.50 : 1`.
        *   `Severity 'Balanced'` if the ratio is between 1.40 and 1.70.
        *   `Severity 'Moderate'` if the ratio is between 1.20 and 1.39, OR between 1.71 and 2.00.
        *   `Severity 'Severe'` if the ratio is **less than 1.20** or **greater than 2.00**. For example, a ratio of 2.02 MUST be 'Severe'.

    *   **Adductor vs. Abductor** (Adductor:Abductor): Ideal ratio is **1:1**.
        *   `targetRatio` MUST be `1.00 : 1`.
        *   `Severity 'Balanced'` if ratio is between 0.90 and 1.10.
        *   `Severity 'Moderate'` if ratio is between 0.75 and 0.89, or 1.11 and 1.25.
        *   `Severity 'Severe'` if ratio is **less than 0.75** or **greater than 1.25**.

    *   **Reverse Fly vs. Butterfly** (Reverse Fly:Butterfly): Ideal ratio is **1:1**.
        *   `targetRatio` MUST be `1.00 : 1`.
        *   `Severity 'Balanced'` if ratio is between 0.90 and 1.10.
        *   `Severity 'Moderate'` if ratio is between 0.75 and 0.89, or 1.11 and 1.25.
        *   `Severity 'Severe'` if ratio is **less than 0.75** or **greater than 1.25**.

    *   **Triceps vs. Biceps** (Tricep:Bicep): Ideal is for triceps to be ~1.5x stronger.
        *   `targetRatio` MUST be `1.50 : 1`.
        *   `Severity 'Balanced'` if ratio is between 1.30 and 1.70.
        *   `Severity 'Moderate'` if ratio is between 1.10 and 1.29 or 1.71 and 2.00.
        *   `Severity 'Severe'` if ratio is **less than 1.10** or **greater than 2.00**. For example, a Tricep:Bicep ratio of 4.33 MUST be 'Severe'.

    *   **Back Extension vs. Abdominal Crunch** (Extension:Crunch): Ideal ratio is **1:1**.
        *   `targetRatio` MUST be `1.00 : 1`.
        *   `Severity 'Balanced'` if ratio is between 0.90 and 1.10.
        *   `Severity 'Moderate'` if ratio is between 0.75 and 0.89, or 1.11 and 1.25.
        *   `Severity 'Severe'` if ratio is **less than 0.75** or **greater than 1.25**.

    *   **Glute Development** (Hip Thrust:Glutes): Ideal ratio is **1:1**.
        *   `targetRatio` MUST be `1.00 : 1`.
        *   `Severity 'Balanced'` if ratio is between 0.90 and 1.10.
        *   `Severity 'Moderate'` if ratio is between 0.75 and 0.89, or 1.11 and 1.25.
        *   `Severity 'Severe'` if ratio is **less than 0.75** or **greater than 1.25**.

5.  **Generate Output**:
    *   Create a concise, encouraging 'summary' of the overall findings.
    *   For each imbalance identified, create a 'finding' object with:
        *   'imbalanceType': The name of the comparison (e.g., 'Horizontal Push vs. Pull').
        *   The names, weights, and units of the two lifts being compared.
        *   'userRatio' and 'targetRatio' formatted exactly as specified.
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
    if (!output) {
      throw new Error('The AI failed to generate a valid analysis. The model may be overloaded or the request was malformed. Please try again.');
    }
    return output;
  }
);
