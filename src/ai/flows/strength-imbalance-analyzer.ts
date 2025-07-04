
'use server';
/**
 * @fileOverview Analyzes user's strength balance by combining deterministic calculations with AI-powered insights.
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
    'Vertical Push vs. Pull',
    'Quad vs. Hamstring',
    'Adductor vs. Abductor',
    'Reverse Fly vs. Butterfly',
    'Biceps vs. Triceps',
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
    insight: z.string().describe("A concise, AI-generated explanation of what the imbalance means."),
    recommendation: z.string().describe("A simple, AI-generated, actionable recommendation to address the imbalance."),
});

const StrengthImbalanceOutputSchema = z.object({
    summary: z.string().describe("A brief, high-level summary of the user's overall strength balance."),
    findings: z.array(ImbalanceFindingSchema).describe("A list of specific strength imbalances found."),
});
export type StrengthImbalanceOutput = z.infer<typeof StrengthImbalanceOutputSchema>;

// Configuration for each imbalance type
const IMBALANCE_CONFIG: Record<(typeof IMBALANCE_TYPES)[number], { lift1Options: string[], lift2Options: string[], targetRatioDisplay: string, ratioCalculation: (l1: number, l2: number) => number, severityCheck: (r: number) => 'Balanced' | 'Moderate' | 'Severe', getWeakerLiftDescription: (weakerIsLift1: boolean, l1Name: string, l2Name: string) => string }> = {
    'Horizontal Push vs. Pull': { lift1Options: ['bench press', 'chest press'], lift2Options: ['barbell row', 'seated row'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `The user's horizontal pushing strength (${l1Name}) is weaker than their horizontal pulling strength (${l2Name}).` : `The user's horizontal pulling strength (${l2Name}) is weaker than their horizontal pushing strength (${l1Name}).` },
    'Vertical Push vs. Pull': { lift1Options: ['overhead press', 'shoulder press'], lift2Options: ['lat pulldown', 'pull-ups'], targetRatioDisplay: '0.75:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.60 || r > 0.85) ? 'Severe' : (r < 0.67 || r > 0.77) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `The user's vertical pushing strength (${l1Name}) is weaker than their vertical pulling strength (${l2Name}).` : `The user's vertical pulling strength (${l2Name}) is weaker than their vertical pushing strength (${l1Name}).` },
    'Quad vs. Hamstring': { lift1Options: ['leg extension', 'squat'], lift2Options: ['leg curl'], targetRatioDisplay: '1.5:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 1.2 || r > 2.0) ? 'Severe' : (r < 1.4 || r > 1.7) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `The user's quadriceps strength (${l1Name}) is weaker than their hamstring strength (${l2Name}).` : `The user's hamstring strength (${l2Name}) is weaker than their quadriceps strength (${l1Name}).` },
    'Adductor vs. Abductor': { lift1Options: ['adductor'], lift2Options: ['abductor'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `The user's inner thigh strength (Adductor) is weaker than their outer thigh strength (Abductor).` : `The user's outer thigh strength (Abductor) is weaker than their inner thigh strength (Adductor).` },
    'Reverse Fly vs. Butterfly': { lift1Options: ['reverse fly', 'reverse flys'], lift2Options: ['butterfly'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `The user's rear delt strength (${l1Name}) is weaker than their chest strength (${l2Name}).` : `The user's chest strength (${l2Name}) is weaker than their rear delt strength (${l1Name}).` },
    'Biceps vs. Triceps': { lift1Options: ['bicep curl'], lift2Options: ['tricep extension', 'triceps'], targetRatioDisplay: '0.4:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.25 || r > 0.55) ? 'Severe' : (r < 0.35 || r > 0.45) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `The user's bicep strength (${l1Name}) is weaker than their tricep strength (${l2Name}).` : `The user's tricep strength (${l2Name}) is weaker than their bicep strength (${l1Name}).` },
    'Back Extension vs. Abdominal Crunch': { lift1Options: ['back extension'], lift2Options: ['abdominal crunch'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `The user's lower back strength (${l1Name}) is weaker than their abdominal strength (${l2Name}).` : `The user's abdominal strength (${l2Name}) is weaker than their lower back strength (${l1Name}).` },
    'Glute Development': { lift1Options: ['hip thrust'], lift2Options: ['glutes'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `The user's compound glute strength (${l1Name}) is weaker than their isolation glute strength (${l2Name}).` : `The user's isolation glute strength (${l2Name}) is weaker than their compound glute strength (${l1Name}).` },
};

export async function analyzeStrengthImbalances(input: StrengthImbalanceInput): Promise<StrengthImbalanceOutput> {
  const filteredInput = {
      ...input,
      personalRecords: input.personalRecords.filter(pr => pr.weight > 0),
  };
  if (filteredInput.personalRecords.length < 2) {
      return {
          summary: "Not enough data for AI analysis. Please log at least two opposing personal records with weights.",
          findings: [],
      };
  }
  return strengthImbalanceFlow(filteredInput);
}

// Helper to find the best PR for a given list of exercises
function findBestPr(records: z.infer<typeof PersonalRecordForAnalysisSchema>[], exerciseNames: string[]): z.infer<typeof PersonalRecordForAnalysisSchema> | null {
    const relevantRecords = records.filter(r => exerciseNames.some(name => r.exerciseName.trim().toLowerCase() === name.toLowerCase()));
    if (relevantRecords.length === 0) return null;

    return relevantRecords.reduce((best, current) => {
        const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
        const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
        return currentWeightKg > bestWeightKg ? current : best;
    });
}

// Define the prompt for the AI to generate insights and recommendations
const AIInsightSchema = z.object({
  insight: z.string().describe("A concise, expert insight into the potential risks or consequences of the specific strength imbalance."),
  recommendation: z.string().describe("A simple, clear, and actionable recommendation to help the user address the imbalance."),
});

const insightPrompt = ai.definePrompt({
    name: 'generateStrengthInsight',
    input: {
      schema: z.object({
        imbalanceType: z.string(),
        lift1Name: z.string(),
        lift1Weight: z.number(),
        lift1Unit: z.enum(['kg', 'lbs']),
        lift2Name: z.string(),
        lift2Weight: z.number(),
        lift2Unit: z.enum(['kg', 'lbs']),
        userRatio: z.string(),
        targetRatio: z.string(),
        severity: z.enum(['Moderate', 'Severe']),
        weakerLiftDescription: z.string(),
      }),
    },
    output: { schema: AIInsightSchema },
    prompt: `You are an expert fitness coach providing analysis of a user's strength imbalance.
The user's data is as follows:
- Imbalance Type: {{{imbalanceType}}}
- Lift 1: {{{lift1Name}}} ({{{lift1Weight}}} {{{lift1Unit}}})
- Lift 2: {{{lift2Name}}} ({{{lift2Weight}}} {{{lift2Unit}}})
- User's Ratio: {{{userRatio}}}
- Target Ratio: {{{targetRatio}}}
- Severity: {{{severity}}}

Diagnosis: {{{weakerLiftDescription}}}

Based ONLY on this information, provide a concise expert insight and a simple, actionable recommendation.
The insight should explain the potential negative consequences (e.g., injury risk, poor posture, performance plateau).
The recommendation should give a clear, simple action the user can take to improve the weaker lift or muscle group.
Do not repeat the numbers. Focus on the 'why' and the 'what to do'. Be encouraging but direct.
`,
});

const strengthImbalanceFlow = ai.defineFlow(
  {
    name: 'strengthImbalanceFlow',
    inputSchema: StrengthImbalanceInputSchema,
    outputSchema: StrengthImbalanceOutputSchema,
  },
  async (input) => {
    const findings: z.infer<typeof ImbalanceFindingSchema>[] = [];
    const promises: Promise<void>[] = [];

    for (const type of IMBALANCE_TYPES) {
        const config = IMBALANCE_CONFIG[type];
        const lift1 = findBestPr(input.personalRecords, config.lift1Options);
        const lift2 = findBestPr(input.personalRecords, config.lift2Options);

        if (!lift1 || !lift2) continue;

        const lift1WeightKg = lift1.weightUnit === 'lbs' ? lift1.weight * 0.453592 : lift1.weight;
        const lift2WeightKg = lift2.weightUnit === 'lbs' ? lift2.weight * 0.453592 : lift2.weight;

        if (lift2WeightKg === 0) continue;

        const ratio = config.ratioCalculation(lift1WeightKg, lift2WeightKg);
        const severity = config.severityCheck(ratio);
        
        const [targetRatioNum1, targetRatioNum2] = config.targetRatioDisplay.split(':').map(Number);
        const targetRatioValue = targetRatioNum1 / (targetRatioNum2 === 0 ? 1 : targetRatioNum2);
        
        // This logic determines which lift is "weaker" relative to the target ratio
        const weakerIsLift1 = ratio < targetRatioValue;

        if (severity !== 'Balanced') {
            const promise = (async () => {
                const { output: aiInsight } = await insightPrompt({
                    imbalanceType: type,
                    lift1Name: lift1.exerciseName,
                    lift1Weight: lift1.weight,
                    lift1Unit: lift1.weightUnit,
                    lift2Name: lift2.exerciseName,
                    lift2Weight: lift2.weight,
                    lift2Unit: lift2.weightUnit,
                    userRatio: `${ratio.toFixed(2)}:1`,
                    targetRatio: config.targetRatioDisplay,
                    severity: severity,
                    weakerLiftDescription: config.getWeakerLiftDescription(weakerIsLift1, lift1.exerciseName, lift2.exerciseName)
                });

                if (aiInsight) {
                    findings.push({
                        imbalanceType: type,
                        lift1Name: lift1.exerciseName,
                        lift1Weight: lift1.weight,
                        lift1Unit: lift1.weightUnit,
                        lift2Name: lift2.exerciseName,
                        lift2Weight: lift2.weight,
                        lift2Unit: lift2.weightUnit,
                        userRatio: `${ratio.toFixed(2)}:1`,
                        targetRatio: config.targetRatioDisplay,
                        severity: severity,
                        insight: aiInsight.insight,
                        recommendation: aiInsight.recommendation,
                    });
                }
            })();
            promises.push(promise);
        }
    }

    await Promise.all(promises);
    
    const summary = findings.length > 0
        ? `Based on your Personal Records, we've found ${findings.length} potential strength imbalance(s). Our AI has provided some insights below.`
        : "Great job! Your strength ratios appear to be well-balanced based on your logged personal records.";

    return { summary, findings };
  }
);
