
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
type ImbalanceFinding = z.infer<typeof ImbalanceFindingSchema>;

const StrengthImbalanceOutputSchema = z.object({
    summary: z.string().describe("A brief, high-level summary of the user's overall strength balance."),
    findings: z.array(ImbalanceFindingSchema).describe("A list of specific strength imbalances found."),
});
export type StrengthImbalanceOutput = z.infer<typeof StrengthImbalanceOutputSchema>;


// This is the new schema for the AI's intermediate output.
const MatchedPairsOutputSchema = z.object({
  pairs: z.array(z.object({
    comparisonType: z.enum(IMBALANCE_TYPES),
    lift1: z.object({
        exerciseName: z.string(),
        weight: z.number(),
        weightUnit: z.enum(['kg', 'lbs']),
    }),
    lift2: z.object({
        exerciseName: z.string(),
        weight: z.number(),
        weightUnit: z.enum(['kg', 'lbs']),
    }),
  }))
});

// This is the new, simpler prompt for the AI.
const pairingPrompt = ai.definePrompt({
  name: 'strengthImbalancePairingPrompt',
  input: {schema: StrengthImbalanceInputSchema},
  output: {schema: MatchedPairsOutputSchema},
  prompt: `You are an expert kinesiologist. Your task is to analyze a user's personal records and identify pairs of exercises that work opposing muscle groups.

You will be given a list of the user's personal records. Your ONLY job is to find the best matching pairs for comparison. Do NOT calculate ratios or severity.

**CRITICAL INSTRUCTIONS:**
1.  **Find the Best Pairs**: For each comparison type, find the single best pair of lifts from the user's records. For example, for 'Horizontal Push vs. Pull', find the user's strongest horizontal press and their strongest horizontal row.
2.  **Comparison Types and Lifts**: You must match exercises to these exact comparison types.
    *   'Horizontal Push vs. Pull': Lift 1 is a Push (e.g., 'Bench Press', 'Chest Press'). Lift 2 is a Pull (e.g., 'Barbell Row', 'Seated Row').
    *   'Vertical Pull vs. Push': Lift 1 is a Pull (e.g., 'Lat Pulldown', 'Pull-ups'). Lift 2 is a Push (e.g., 'Overhead Press', 'Shoulder Press').
    *   'Quad vs. Hamstring': Lift 1 is a Quad exercise (e.g., 'Leg Extension', 'Squat'). Lift 2 is a Hamstring exercise (e.g., 'Leg Curl').
    *   'Adductor vs. Abductor': Lift 1 is 'Adductor'. Lift 2 is 'Abductor'.
    *   'Reverse Fly vs. Butterfly': Lift 1 is 'Reverse Fly'. Lift 2 is 'Butterfly'.
    *   'Triceps vs. Biceps': Lift 1 is a tricep exercise (e.g., 'Seated Dip', Tricep extension). Lift 2 is a bicep exercise (e.g., bicep curl).
    *   'Back Extension vs. Abdominal Crunch': Lift 1 is 'Back Extension'. Lift 2 is 'Abdominal Crunch'.
    *   'Glute Development': Lift 1 is 'Hip Thrust'. Lift 2 is 'Glutes' (machine).
3.  **Output Format**: Return a list of all the valid pairs you find. For each pair, provide the 'comparisonType', and the full details for 'lift1' and 'lift2'.

Here are the user's personal records:
{{#each personalRecords}}
- {{exerciseName}}: {{weight}} {{weightUnit}}
{{/each}}
`,
});


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


const strengthImbalanceFlow = ai.defineFlow(
  {
    name: 'strengthImbalanceFlow',
    inputSchema: StrengthImbalanceInputSchema,
    outputSchema: StrengthImbalanceOutputSchema,
  },
  async (input) => {
    // 1. Call the AI to get the matched pairs.
    const {output: matchedPairsOutput} = await pairingPrompt(input);
    if (!matchedPairsOutput || !matchedPairsOutput.pairs) {
        return { summary: "Could not analyze strength. The AI failed to find opposing lift pairs.", findings: [] };
    }

    const findings: ImbalanceFinding[] = [];
    
    // 2. Process these pairs with deterministic TypeScript logic.
    for (const pair of matchedPairsOutput.pairs) {
        const lift1WeightKg = pair.lift1.weightUnit === 'lbs' ? pair.lift1.weight * 0.453592 : pair.lift1.weight;
        const lift2WeightKg = pair.lift2.weightUnit === 'lbs' ? pair.lift2.weight * 0.453592 : pair.lift2.weight;

        if (lift2WeightKg === 0) continue; // Avoid division by zero

        const ratio = lift1WeightKg / lift2WeightKg;

        let severity: 'Balanced' | 'Moderate' | 'Severe' | null = null;
        let targetRatio: string = '';
        let insight: string = '';
        let recommendation: string = '';

        switch (pair.comparisonType) {
            case 'Horizontal Push vs. Pull':
                targetRatio = '1.00 : 1';
                if (ratio < 0.75 || ratio > 1.25) severity = 'Severe';
                else if (ratio < 0.9 || ratio > 1.1) severity = 'Moderate';
                else severity = 'Balanced';
                insight = "Your pressing strength is imbalanced with your pulling strength. This can increase risk of shoulder injury and poor posture.";
                recommendation = "Focus on strengthening your back and rear deltoids with rowing exercises.";
                break;
            
            case 'Vertical Pull vs. Push':
                targetRatio = '1.30 - 1.50 : 1';
                if (ratio < 1.1 || ratio > 1.8) severity = 'Severe';
                else if (ratio < 1.2 || ratio > 1.6) severity = 'Moderate';
                else severity = 'Balanced';
                insight = "An imbalance between your overhead pulling and pressing can affect shoulder health and stability.";
                recommendation = "Ensure you are training both vertical pulling (like lat pulldowns) and vertical pressing (like overhead press) with appropriate intensity.";
                break;

            case 'Quad vs. Hamstring':
                targetRatio = '1.50 : 1';
                if (ratio < 1.2 || ratio > 2.0) severity = 'Severe';
                else if (ratio < 1.4 || ratio > 1.7) severity = 'Moderate';
                else severity = 'Balanced';
                insight = "A significant difference between quadriceps and hamstring strength is a major risk factor for knee injuries and ACL tears.";
                recommendation = "Incorporate more hamstring-focused exercises like leg curls, glute-ham raises, or Romanian deadlifts.";
                break;

            case 'Adductor vs. Abductor':
            case 'Reverse Fly vs. Butterfly':
            case 'Back Extension vs. Abdominal Crunch':
            case 'Glute Development':
                targetRatio = '1.00 : 1';
                if (ratio < 0.75 || ratio > 1.25) severity = 'Severe';
                else if (ratio < 0.9 || ratio > 1.1) severity = 'Moderate';
                else severity = 'Balanced';
                insight = "This imbalance can affect joint stability and lead to compensatory movement patterns.";
                recommendation = "Isolate and strengthen the lagging muscle group to create better muscular balance around the joint.";
                break;

            case 'Triceps vs. Biceps':
                targetRatio = '1.50 : 1';
                if (ratio < 1.1 || ratio > 2.0) severity = 'Severe';
                else if (ratio < 1.3 || ratio > 1.7) severity = 'Moderate';
                else severity = 'Balanced';
                insight = "Imbalance between biceps and triceps can affect elbow stability and overall pressing and pulling performance.";
                recommendation = "Ensure you are dedicating sufficient volume to both bicep curls and tricep extension movements.";
                break;
        }

        if (severity && severity !== 'Balanced') {
            findings.push({
                imbalanceType: pair.comparisonType,
                lift1Name: pair.lift1.exerciseName,
                lift1Weight: pair.lift1.weight,
                lift1Unit: pair.lift1.weightUnit,
                lift2Name: pair.lift2.exerciseName,
                lift2Weight: pair.lift2.weight,
                lift2Unit: pair.lift2.weightUnit,
                userRatio: `${ratio.toFixed(2)} : 1`,
                targetRatio: targetRatio,
                severity: severity,
                insight: insight,
                recommendation: recommendation,
            });
        }
    }

    const summary = findings.length > 0
        ? `We found ${findings.length} potential strength imbalance(s). See below for details and recommendations.`
        : "Great job! Your strength ratios appear to be well-balanced based on your logged personal records.";

    return { summary, findings };
  }
);
