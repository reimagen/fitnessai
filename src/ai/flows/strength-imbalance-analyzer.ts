
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

const FitnessGoalForAnalysisSchema = z.object({
  description: z.string().describe("A specific fitness goal for the user."),
  isPrimary: z.boolean().optional().describe("Whether this is the user's primary goal."),
});

const UserProfileForAnalysisSchema = z.object({
    age: z.number().optional().describe("The user's age."),
    gender: z.string().optional().describe("The user's gender."),
    heightValue: z.number().optional().describe("The user's height value."),
    heightUnit: z.enum(['cm', 'ft/in']).optional().describe("The user's height unit."),
    weightValue: z.number().optional().describe("The user's weight value."),
    weightUnit: z.enum(['kg', 'lbs']).optional().describe("The user's weight unit."),
    fitnessGoals: z.array(FitnessGoalForAnalysisSchema).optional().describe("The user's active fitness goals."),
});

const PersonalRecordForAnalysisSchema = z.object({
    exerciseName: z.string(),
    weight: z.number(),
    weightUnit: z.enum(['kg', 'lbs']),
    date: z.string(),
    category: z.string().optional(),
});

const StrengthImbalanceInputSchema = z.object({
  personalRecords: z.array(PersonalRecordForAnalysisSchema),
  userProfile: UserProfileForAnalysisSchema.describe("The user's personal statistics and goals."),
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
    'Horizontal Push vs. Pull': { lift1Options: ['bench press', 'chest press'], lift2Options: ['barbell row', 'seated row'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `Your horizontal pushing strength (${l1Name}) is weaker than your horizontal pulling strength (${l2Name}).` : `Your horizontal pulling strength (${l2Name}) is weaker than your horizontal pushing strength (${l1Name}).` },
    'Vertical Push vs. Pull': { lift1Options: ['overhead press', 'shoulder press'], lift2Options: ['lat pulldown', 'pull-ups'], targetRatioDisplay: '0.7:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r > 0.75) ? 'Severe' : (r < 0.6 || r > 0.7) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `Your vertical pushing strength (${l1Name}) is weaker than your vertical pulling strength (${l2Name}).` : `Your vertical pulling strength (${l2Name}) is weaker than your vertical pushing strength (${l1Name}).` },
    'Quad vs. Hamstring': { lift1Options: ['leg extension', 'squat'], lift2Options: ['leg curl'], targetRatioDisplay: '1.33:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => { if (r < 1.1) return 'Severe'; if (r < 1.2 || r > 1.45) return 'Moderate'; return 'Balanced'; }, getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `Your quadriceps strength (${l1Name}) is weaker than your hamstring strength (${l2Name}).` : `Your hamstring strength (${l2Name}) is weaker than your quadriceps strength (${l1Name}).` },
    'Adductor vs. Abductor': { lift1Options: ['adductor'], lift2Options: ['abductor'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `Your inner thigh strength (Adductor) is weaker than your outer thigh strength (Abductor).` : `Your outer thigh strength (Abductor) is weaker than your inner thigh strength (Adductor).` },
    'Reverse Fly vs. Butterfly': { lift1Options: ['reverse fly', 'reverse flys'], lift2Options: ['butterfly'], targetRatioDisplay: '0.9:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `Your rear delt strength (${l1Name}) is weaker than your chest strength (${l2Name}).` : `Your chest strength (${l2Name}) is weaker than your rear delt strength (${l1Name}).` },
    'Biceps vs. Triceps': { lift1Options: ['bicep curl'], lift2Options: ['tricep extension', 'triceps'], targetRatioDisplay: '0.4:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.25 || r > 0.55) ? 'Severe' : (r < 0.35 || r > 0.45) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `Your bicep strength (${l1Name}) is weaker than your tricep strength (${l2Name}).` : `Your tricep strength (${l2Name}) is weaker than your bicep strength (${l1Name}).` },
    'Back Extension vs. Abdominal Crunch': { lift1Options: ['back extension'], lift2Options: ['abdominal crunch'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `Your lower back strength (${l1Name}) is weaker than your abdominal strength (${l2Name}).` : `Your abdominal strength (${l2Name}) is weaker than your lower back strength (${l1Name}).` },
    'Glute Development': { lift1Options: ['hip thrust'], lift2Options: ['glutes'], targetRatioDisplay: '1.43:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 1.1 || r > 1.8) ? 'Severe' : (r < 1.3 || r > 1.6) ? 'Moderate' : 'Balanced', getWeakerLiftDescription: (weakerIsLift1, l1Name, l2Name) => weakerIsLift1 ? `Your compound glute strength (${l1Name}) is weaker than your isolation glute strength (${l2Name}).` : `Your isolation glute strength (${l2Name}) is weaker than your compound glute strength (${l1Name}).` },
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
    const relevantRecords = records.filter(r => exerciseNames.some(name => r.exerciseName.trim().toLowerCase() === name.trim().toLowerCase()));
    if (relevantRecords.length === 0) return null;

    return relevantRecords.reduce((best, current) => {
        const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
        const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
        return currentWeightKg > bestWeightKg ? current : best;
    });
}

// Define the prompt for the AI to generate insights and recommendations
const AIInsightSchema = z.object({
  insight: z.string().describe("A concise, expert insight (max 2 sentences) into the potential risks or consequences of the specific strength imbalance."),
  recommendation: z.string().describe("A simple, clear, and actionable recommendation (max 2 sentences) to help the user address the imbalance. It should start with a direct action verb."),
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
        weakerLiftName: z.string().describe("The name of the weaker lift that needs improvement."),
        goalWeight: z.number().describe("The calculated target weight for the weaker lift to achieve balance."),
        goalUnit: z.enum(['kg', 'lbs']).describe("The unit for the goal weight."),
        userProfile: UserProfileForAnalysisSchema,
      }),
    },
    output: { schema: AIInsightSchema },
    prompt: `You are an expert fitness coach providing a highly concise and varied analysis of a user's strength imbalance.

**User's Data:**
- Imbalance Type: {{{imbalanceType}}}
- Lift 1: {{{lift1Name}}} ({{{lift1Weight}}} {{{lift1Unit}}})
- Lift 2: {{{lift2Name}}} ({{{lift2Weight}}} {{{lift2Unit}}})
- Diagnosis: {{{weakerLiftDescription}}}
- Goal: The user should aim for a target weight of **{{{goalWeight}}}{{{goalUnit}}}** on their **{{{weakerLiftName}}}** to achieve the ideal balance.

**User's Stats & Goals:**
- Age: {{#if userProfile.age}}{{userProfile.age}}{{else}}Not Provided{{/if}}
- Gender: {{#if userProfile.gender}}{{userProfile.gender}}{{else}}Not Provided{{/if}}
- Weight: {{#if userProfile.weightValue}}{{userProfile.weightValue}} {{userProfile.weightUnit}}{{else}}Not Provided{{/if}}
{{#if userProfile.fitnessGoals}}
- Fitness Goals:
  {{#each userProfile.fitnessGoals}}
    - {{#if this.isPrimary}}**Primary:** {{/if}}{{{this.description}}}
  {{/each}}
{{/if}}


**Your Task:**
Based ONLY on all of this information (the imbalance data, the user's stats, AND their fitness goals), provide:
1.  **Insight (1-2 sentences MAX):** A concise, expert insight into the potential risks (e.g., injury, posture, plateaus). If user stats or goals are available, you MUST incorporate them to make the insight more personal (e.g., mention how an imbalance might affect someone of their age or their goal to run a marathon).
2.  **Recommendation (1-2 sentences MAX):** A simple, actionable recommendation to help the user address the imbalance. This recommendation should ideally also connect to their stated goals.

**CRITICAL STYLE GUIDE:**
- **VARY YOUR ANALYSIS:** Your main goal is to provide unique and varied feedback for each type of imbalance. Do not use the same sentence structure or phrasing across different imbalance analyses. Be direct and creative.
- **FOCUS ON ACTION:** The recommendation must start with a direct action verb. Be specific and provide clear instructions.

**Good Example (Varied & Concise):**
- **Insight:** "An over-reliance on chest pressing without balanced back work can lead to shoulder instability. For a lifter of your age, maintaining shoulder health is crucial for longevity."
- **Recommendation:** "Incorporate incline dumbbell presses to target your upper chest. Try adding one extra set of {{{lift2Name}}} to your workouts to help close the gap."
- **Insight:** "Quadriceps dominance to this degree often increases stress on the patellar tendon. For your goal of running a 5k, addressing this is key for long-term knee health."
- **Recommendation:** "Add Romanian Deadlifts to your routine to directly strengthen the hamstrings. Aim for 3 sets of 8-10 reps after your main leg exercises."

**Bad Example (Repetitive & Generic Across Imbalance Types):**
- **Insight:** "A significant horizontal push/pull disparity can lead to injury."
- **Recommendation:** "You should prioritize building chest strength."
- **Insight:** "A significant quad/hamstring disparity can lead to injury."
- **Recommendation:** "You should prioritize building hamstring strength."
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
        const targetRatioValue = targetRatioNum2 === 0 ? 1 : targetRatioNum1 / targetRatioNum2;
        
        // This logic determines which lift is "weaker" relative to the target ratio
        const weakerIsLift1 = ratio < targetRatioValue;

        if (severity !== 'Balanced') {
            const promise = (async () => {
                let goalWeight: number;
                let weakerLiftName: string;
                let goalUnit: 'kg' | 'lbs';

                if (weakerIsLift1) {
                    weakerLiftName = lift1.exerciseName;
                    goalUnit = lift1.weightUnit;
                    const goalWeightKg = lift2WeightKg * targetRatioValue;
                    goalWeight = Math.round(lift1.weightUnit === 'lbs' ? goalWeightKg / 0.453592 : goalWeightKg);
                } else {
                    weakerLiftName = lift2.exerciseName;
                    goalUnit = lift2.weightUnit;
                    const goalWeightKg = lift1WeightKg / targetRatioValue;
                    goalWeight = Math.round(lift2.weightUnit === 'lbs' ? goalWeightKg / 0.453592 : goalWeightKg);
                }
                
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
                    weakerLiftDescription: config.getWeakerLiftDescription(weakerIsLift1, lift1.exerciseName, lift2.exerciseName),
                    weakerLiftName: weakerLiftName,
                    goalWeight: goalWeight,
                    goalUnit: goalUnit,
                    userProfile: input.userProfile,
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
